import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '@/hooks/useAppStore';
import { ThemedContainer, ThemedText } from '@/components/Themed';
import ScreenHeader from '@/components/ScreenHeader';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import VoicePlaybackService from '@/services/voicePlayback';
import { evaluateRecitation } from '@/utils/similarity';
import { Scripture } from '@/types/scripture';
import { practiceLogService } from '@/services/practiceLogService';
import { militaryRankingService } from '@/services/militaryRanking';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

/**
 * Speech.speak() resolves immediately — it does NOT wait for speech to finish.
 * This helper wraps it in a proper Promise that only resolves when the TTS finishes.
 */
const speakAndWait = (text: string, options?: { rate?: number; pitch?: number; language?: string }): Promise<void> => {
    return new Promise((resolve) => {
        Speech.speak(text, {
            rate: options?.rate ?? 0.9,
            pitch: options?.pitch ?? 1.0,
            language: options?.language ?? 'en-US',
            onDone: () => resolve(),
            onStopped: () => resolve(),
            onError: () => resolve(),
        });
    });
};

// ─── Timing Constants ───
const SILENCE_TIMEOUT_MS = 3000;     // 3s of silence after speech → finalize
const RADIO_SILENCE_MS = 7000;       // 7s of total silence AFTER "Go" (no speech at all) → skip
const POST_RESULT_DELAY_MS = 1500;   // 1.5s after TTS result before auto-advance
const MAX_LISTEN_MS = 45000;         // 45s max listening time as a safety net
const POST_GO_DELAY_MS = 1200;       // 1200ms gap after "Go" TTS to let speaker silence before mic starts
const STT_RETRY_DELAY_MS = 1500;     // Wait 1.5s before retrying STT start
const STT_MAX_RETRIES = 2;           // Max retries if STT fails to start

type VoicePhase = 'idle' | 'briefing' | 'listening' | 'evaluating' | 'debrief';

export default function VoiceOpsScreen() {
    const { scriptures: allScriptures, collections, theme, isDark, userSettings } = useAppStore();
    const params = useLocalSearchParams();
    const router = useRouter();

    // ─── Core State ───
    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null);
    const [phase, setPhase] = useState<VoicePhase>('idle');
    const [accuracy, setAccuracy] = useState<number>(0);
    const [lastTranscript, setLastTranscript] = useState('');
    const [localTranscript, setLocalTranscript] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [versesAttempted, setVersesAttempted] = useState(0);
    const [versesHit, setVersesHit] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);

    // ─── Animations ───
    const [pulseAnim] = useState(new Animated.Value(1));
    const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

    // ─── Refs for timers / mounted tracking ───
    const accumulatedRef = useRef('');
    const isMountedRef = useRef(true);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const radioSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const debriefTimerRef = useRef<NodeJS.Timeout | null>(null);
    const maxListenTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sttRestartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasReceivedSpeechRef = useRef(false);
    const latestTranscriptRef = useRef('');
    const phaseRef = useRef<VoicePhase>('idle');
    const isRunningRef = useRef(false);
    const sttRetryCountRef = useRef(0);

    // Keep refs in sync
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

    const {
        isRecognizing,
        transcript,
        interimTranscript,
        error: speechError,
        isAvailable,
        hasPermission,
        start: startSTT,
        stop: stopSTT,
        resetTranscript,
        requestPermissions
    } = useSpeechRecognition({
        lang: userSettings.language || 'en-US',
        interimResults: true,
        continuous: false,
        onResult: (text: string, isFinal: boolean) => {
            hasReceivedSpeechRef.current = true;
            
            let currentText = accumulatedRef.current;
            const spacer = currentText && !currentText.endsWith(' ') ? ' ' : '';
            
            if (isFinal && text.trim()) {
                currentText += spacer + text.trim();
                accumulatedRef.current = currentText;
            } else if (text.trim()) {
                currentText += spacer + text.trim();
            }

            latestTranscriptRef.current = currentText;
            setLocalTranscript(currentText);

            // Clear radio silence (user spoke)
            if (radioSilenceTimerRef.current) {
                clearTimeout(radioSilenceTimerRef.current);
                radioSilenceTimerRef.current = null;
            }

            // Reset the silence timer every time new speech arrives
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
                // User has gone silent for SILENCE_TIMEOUT_MS after speaking
                if (isMountedRef.current && phaseRef.current === 'listening') {
                    finalizeListening();
                }
            }, SILENCE_TIMEOUT_MS);
        },
        onEnd: () => {
            // STT Engine organically stops when using continuous: false and the user pauses
            if (isMountedRef.current && phaseRef.current === 'listening') {
                if (sttRestartTimeoutRef.current) clearTimeout(sttRestartTimeoutRef.current);
                
                // Emulate 'continuous: true' without the native Android crashes by manual restart
                sttRestartTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current && phaseRef.current === 'listening') {
                        startSTT({ continuous: false, interimResults: true }).catch(() => {});
                    }
                }, 300);
            }
        },
        onError: (err: string) => {
            console.warn('Voice Ops STT error:', err);
            if (isMountedRef.current && phaseRef.current === 'listening') {
                if (sttRestartTimeoutRef.current) clearTimeout(sttRestartTimeoutRef.current);
                sttRestartTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current && phaseRef.current === 'listening') {
                        startSTT({ continuous: false, interimResults: true }).catch(() => {});
                    }
                }, 800);
            }
        }
    });

    // ─── Collection / Scripture Resolution ───
    const initialChapterIds = useMemo(() => {
        const raw = params.chapterIds;
        if (!raw) return [];
        if (Array.isArray(raw)) {
            return raw.flatMap((id) => id.split(',')).filter(Boolean);
        }
        return raw.split(',').filter(Boolean);
    }, [params.chapterIds]);

    const selectedCollection = useMemo(() => {
        const collectionId = params.collectionId as string;
        if (!collectionId || !collections) return null;
        return collections.find(c => c.id === collectionId) || null;
    }, [params.collectionId, collections]);

    const targetScriptures = useMemo(() => {
        if (!selectedCollection) return allScriptures;
        const mappedScriptures = selectedCollection.scriptures
            .map(id => allScriptures.find(s => s.id === id))
            .filter((s): s is Scripture => s !== undefined);

        if (selectedCollection.isChapterBased && selectedCollection.chapters && initialChapterIds.length > 0) {
            const selectedIds = new Set(
                selectedCollection.chapters
                    .filter((ch) => initialChapterIds.includes(ch.id))
                    .flatMap((ch) => ch.scriptures)
            );
            const filtered = mappedScriptures.filter(s => selectedIds.has(s.id));
            return filtered.length > 0 ? filtered : mappedScriptures;
        }

        return mappedScriptures.length > 0 ? mappedScriptures : allScriptures;
    }, [allScriptures, selectedCollection, initialChapterIds]);

    // ─── Cleanup ───
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            clearAllTimers();
            VoicePlaybackService.stopPlayback();
        };
    }, []);

    const clearAllTimers = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (radioSilenceTimerRef.current) { clearTimeout(radioSilenceTimerRef.current); radioSilenceTimerRef.current = null; }
        if (debriefTimerRef.current) { clearTimeout(debriefTimerRef.current); debriefTimerRef.current = null; }
        if (maxListenTimerRef.current) { clearTimeout(maxListenTimerRef.current); maxListenTimerRef.current = null; }
        if (sttRestartTimeoutRef.current) { clearTimeout(sttRestartTimeoutRef.current); sttRestartTimeoutRef.current = null; }
    };

    // ─── Pulse Animation ───
    useEffect(() => {
        pulseRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true })
            ])
        );
        pulseRef.current.start();
        return () => { pulseRef.current?.stop(); };
    }, [pulseAnim]);

    // ─── Pick a random scripture ───
    const pickNextScripture = useCallback((): Scripture | null => {
        if (!targetScriptures || targetScriptures.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * targetScriptures.length);
        return targetScriptures[randomIndex];
    }, [targetScriptures]);

    // ─── Finalize listening → evaluate ───
    const finalizeListening = useCallback(() => {
        clearAllTimers();
        stopSTT();
        if (isMountedRef.current) {
            setPhase('evaluating');
        }
    }, [stopSTT]);

    // ─── AUTO-ADVANCE: Briefing → Listening → Evaluate → Debrief → Next ───

    // STEP 1: Begin a verse cycle
    const beginVerseCycle = useCallback(async (scripture: Scripture) => {
        if (!isMountedRef.current) return;

        clearAllTimers();

        setCurrentScripture(scripture);
        setAccuracy(0);
        setLastTranscript('');
        setLocalTranscript('');
        accumulatedRef.current = '';
        setPhase('briefing');

        // Announce the target via TTS — speakAndWait blocks until speech finishes
        await speakAndWait(
            `Deploy: ${scripture.reference}`,
            {
                rate: userSettings.voiceRate || 0.9,
                pitch: userSettings.voicePitch || 1.0,
                language: userSettings.language || 'en-US',
            }
        );

        if (!isMountedRef.current) return;

        // Audible "Go" start signal + haptic
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            // Haptics not available on simulator, no-op
        }
        await speakAndWait('Go', {
            rate: 1.2,
            pitch: 1.3,
            language: userSettings.language || 'en-US',
        });

        // Explicitly force TTS engine to kill any lingering buffers
        await Speech.stop();

        // Wait for speaker to fully silence before activating mic
        // This prevents the mic from picking up "Go" or "Deploy..." TTS bleed
        await new Promise(resolve => setTimeout(resolve, POST_GO_DELAY_MS));
        if (!isMountedRef.current) return;

        // STEP 2: Start listening — reset everything fresh
        hasReceivedSpeechRef.current = false;
        latestTranscriptRef.current = '';
        sttRetryCountRef.current = 0;
        resetTranscript();
        setPhase('listening');

        // Try starting STT without overriding continuous, letting manual looping handle it
        let started = false;
        while (!started && sttRetryCountRef.current <= STT_MAX_RETRIES) {
            started = await startSTT({ continuous: false, interimResults: true });
            if (!started) {
                sttRetryCountRef.current++;
                if (sttRetryCountRef.current <= STT_MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, STT_RETRY_DELAY_MS));
                }
            }
        }

        if (!started) {
            // All retries exhausted — skip this verse with readback
            console.warn('STT failed after all retries, skipping verse');
            if (isMountedRef.current) handleSkipWithReadback(scripture);
            return;
        }

        // Clear transcript again after STT engine spins up (discard any TTS bleed)
        await new Promise(resolve => setTimeout(resolve, 200));
        latestTranscriptRef.current = '';
        hasReceivedSpeechRef.current = false;
        resetTranscript();

        // Start radio silence timer: 5s after "Go" with no speech at all → skip + read verse
        radioSilenceTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && phaseRef.current === 'listening' && !hasReceivedSpeechRef.current) {
                clearAllTimers();
                stopSTT();
                setSkippedCount(prev => prev + 1);
                handleSkipWithReadback(scripture);
            }
        }, RADIO_SILENCE_MS);

        // Safety net: max listening time to prevent hanging forever
        maxListenTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && phaseRef.current === 'listening') {
                finalizeListening();
            }
        }, MAX_LISTEN_MS);

    }, [userSettings, startSTT, stopSTT, resetTranscript]);

    // Handle skip: read the verse aloud to refresh user's memory, then advance
    const handleSkipWithReadback = useCallback(async (scripture: Scripture) => {
        if (!isMountedRef.current) return;

        // Read the verse aloud — speakAndWait blocks until reading finishes
        await speakAndWait(
            `Skipping. The verse reads: ${scripture.text}`,
            {
                rate: userSettings.voiceRate || 0.9,
                pitch: userSettings.voicePitch || 1.0,
                language: userSettings.language || 'en-US',
            }
        );

        await new Promise(resolve => setTimeout(resolve, POST_RESULT_DELAY_MS));
        if (!isMountedRef.current || !isRunningRef.current) return;

        advanceToNext();
    }, [userSettings]);

    // STEP 3: Evaluate (triggered by phase change)
    useEffect(() => {
        if (phase !== 'evaluating' || !currentScripture) return;

        const capturedTranscript = latestTranscriptRef.current || transcript;
        setLastTranscript(capturedTranscript);

        if (!capturedTranscript || capturedTranscript.trim().length === 0) {
            // No transcript captured — read the verse aloud to refresh memory
            setSkippedCount(prev => prev + 1);
            handleSkipWithReadback(currentScripture);
            return;
        }

        const score = evaluateRecitation(capturedTranscript, currentScripture.text);
        setAccuracy(score);
        setVersesAttempted(prev => prev + 1);
        if (score >= 80) setVersesHit(prev => prev + 1);

        // Log
        practiceLogService.saveLog({
            scriptureId: currentScripture.id,
            accuracy: score,
            transcription: capturedTranscript,
        }).then(() => {
            militaryRankingService.updateProfile({
                versesMemorized: 0,
                averageAccuracy: 0,
                consecutiveDays: 0,
                lastSessionAccuracy: score,
                lastSessionWordCount: currentScripture.text.split(' ').length
            });
        });

        const resultMsg = score >= 80
            ? `Target Hit. ${Math.round(score)} percent.`
            : `Target Missed. ${Math.round(score)} percent.`;

        announceAndAdvance(resultMsg, true);

    }, [phase, currentScripture, transcript]);

    // STEP 4: Announce result via TTS, show debrief briefly, then advance
    const announceAndAdvance = useCallback(async (message: string, showDebrief: boolean) => {
        if (!isMountedRef.current) return;

        if (showDebrief) setPhase('debrief');

        // Announce result — speakAndWait blocks until spoken
        await speakAndWait(message, {
            rate: userSettings.voiceRate || 0.9,
            pitch: userSettings.voicePitch || 1.0,
            language: userSettings.language || 'en-US',
        });

        // Wait a beat after the spoken result
        await new Promise(resolve => setTimeout(resolve, POST_RESULT_DELAY_MS));
        if (!isMountedRef.current || !isRunningRef.current) return;

        advanceToNext();
    }, [userSettings]);

    // STEP 5: Auto-advance
    const advanceToNext = useCallback(() => {
        if (!isMountedRef.current) return;
        const next = pickNextScripture();
        if (next) {
            beginVerseCycle(next);
        } else {
            setPhase('idle');
            setIsRunning(false);
        }
    }, [pickNextScripture, beginVerseCycle]);

    // ─── Start / Stop Mission ───
    const handleStartMission = async () => {
        // Check permissions first
        if (!isAvailable) {
            Alert.alert('Unavailable', 'Speech recognition is not available on this device.');
            return;
        }
        if (!hasPermission) {
            const granted = await requestPermissions();
            if (!granted) {
                Alert.alert('Permission Needed', 'Microphone access is required for Voice Ops.');
                return;
            }
        }

        setIsRunning(true);
        setVersesAttempted(0);
        setVersesHit(0);
        setSkippedCount(0);

        const first = pickNextScripture();
        if (first) {
            beginVerseCycle(first);
        }
    };

    const handleAbortMission = () => {
        setIsRunning(false);
        clearAllTimers();
        stopSTT();
        VoicePlaybackService.stopPlayback();
        setPhase('idle');
    };

    // ─── Render ───
    const accentColor = theme.info || '#4dabf7';

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="VOICE OPS"
                subtitle="FULLY HANDS-FREE ENGAGEMENT"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Mission Stats Bar ─── */}
                {isRunning && (
                    <View style={[styles.statsBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <View style={styles.statItem}>
                            <ThemedText variant="caption" style={styles.statLabel}>ATTEMPTED</ThemedText>
                            <ThemedText variant="heading" style={[styles.statValue, { color: accentColor }]}>{versesAttempted}</ThemedText>
                        </View>
                        <View style={styles.statItem}>
                            <ThemedText variant="caption" style={styles.statLabel}>HITS</ThemedText>
                            <ThemedText variant="heading" style={[styles.statValue, { color: theme.success }]}>{versesHit}</ThemedText>
                        </View>
                        <View style={styles.statItem}>
                            <ThemedText variant="caption" style={styles.statLabel}>SKIPPED</ThemedText>
                            <ThemedText variant="heading" style={[styles.statValue, { color: theme.textSecondary }]}>{skippedCount}</ThemedText>
                        </View>
                    </View>
                )}

                {/* ─── Target Display ─── */}
                {currentScripture && isRunning && (
                    <View style={styles.targetCard}>
                        <ThemedText variant="caption" style={styles.label}>CURRENT TARGET</ThemedText>
                        <ThemedText variant="heading" style={[styles.reference, { color: accentColor }]}>
                            {currentScripture.reference}
                        </ThemedText>
                    </View>
                )}

                {/* ─── Center Stage ─── */}
                <View style={styles.centerStage}>
                    {/* IDLE — Start Button */}
                    {phase === 'idle' && !isRunning && (
                        <TouchableOpacity
                            style={[styles.startButton, { backgroundColor: accentColor }]}
                            onPress={handleStartMission}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="mic" size={56} color={theme.background} />
                            <ThemedText variant="heading" style={[styles.startLabel, { color: theme.background }]}>
                                START MISSION
                            </ThemedText>
                            <ThemedText variant="caption" style={[styles.startHint, { color: theme.background }]}>
                                Fully hands-free. Just listen and speak.
                            </ThemedText>
                        </TouchableOpacity>
                    )}

                    {/* BRIEFING — TTS speaking the reference */}
                    {phase === 'briefing' && (
                        <View style={styles.stageContent}>
                            <Ionicons name="volume-medium" size={56} color={theme.textSecondary} />
                            <ThemedText variant="body" style={styles.instruction}>Broadcasting Target...</ThemedText>
                        </View>
                    )}

                    {/* LISTENING — Pulsing radar ring */}
                    {phase === 'listening' && (
                        <View style={styles.listeningContainer}>
                            <View style={styles.radarCenter}>
                                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], borderColor: accentColor }]} />
                                <Animated.View style={[styles.pulseRingOuter, { transform: [{ scale: Animated.multiply(pulseAnim, 1.15) }], borderColor: accentColor }]} />
                                <View style={[styles.micCircle, { backgroundColor: accentColor }]}>
                                    <Ionicons name="mic" size={40} color={theme.background} />
                                </View>
                            </View>
                            <ThemedText variant="body" style={[styles.listeningLabel, { color: accentColor }]}>
                                RECEIVING TRANSMISSION
                            </ThemedText>
                            <ThemedText variant="body" style={styles.interimText}>
                                {interimTranscript || localTranscript || '...'}
                            </ThemedText>
                        </View>
                    )}

                    {/* EVALUATING */}
                    {phase === 'evaluating' && (
                        <View style={styles.stageContent}>
                            <ActivityIndicator size="large" color={accentColor} />
                            <ThemedText variant="body" style={styles.instruction}>Analyzing Transmission...</ThemedText>
                        </View>
                    )}

                    {/* DEBRIEF — Result display */}
                    {phase === 'debrief' && (
                        <View style={styles.debriefContainer}>
                            <ThemedText variant="heading" style={[styles.accuracyText, { color: accuracy >= 80 ? theme.success : theme.error }]}>
                                {accuracy.toFixed(0)}%
                            </ThemedText>
                            <ThemedText variant="caption" style={[styles.accuracyLabel, { color: accuracy >= 80 ? theme.success : theme.error }]}>
                                {accuracy >= 80 ? '● TARGET HIT' : '✕ TARGET MISSED'}
                            </ThemedText>
                            <ThemedText variant="body" style={styles.advancingHint}>
                                Advancing to next target...
                            </ThemedText>
                        </View>
                    )}
                </View>

                {/* ─── Transcript vs Expected (debrief) ─── */}
                {phase === 'debrief' && currentScripture && (
                    <View style={[styles.transcriptCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                        <ThemedText variant="caption" style={styles.label}>YOUR TRANSMISSION</ThemedText>
                        <ThemedText variant="body" style={styles.transcriptVal}>
                            {lastTranscript || '[Radio Silence]'}
                        </ThemedText>

                        <View style={styles.divider} />

                        <ThemedText variant="caption" style={styles.label}>EXPECTED DATA</ThemedText>
                        <ThemedText variant="body" style={styles.expectedVal}>
                            {currentScripture.text}
                        </ThemedText>
                    </View>
                )}

                {/* ─── Abort Button ─── */}
                {isRunning && (
                    <TouchableOpacity
                        style={[styles.abortButton, { borderColor: theme.error }]}
                        onPress={handleAbortMission}
                    >
                        <Ionicons name="close-circle" size={20} color={theme.error} />
                        <ThemedText variant="caption" style={[styles.abortText, { color: theme.error }]}>
                            ABORT MISSION
                        </ThemedText>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ThemedContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 100,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        letterSpacing: 1.5,
        opacity: 0.6,
        fontSize: 10,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    targetCard: {
        alignItems: 'center',
        marginBottom: 32,
    },
    label: {
        letterSpacing: 2,
        opacity: 0.6,
        marginBottom: 8,
    },
    reference: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 1,
    },
    centerStage: {
        minHeight: 320,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    stageContent: {
        alignItems: 'center',
        gap: 16,
    },
    instruction: {
        opacity: 0.7,
        letterSpacing: 1,
    },
    startButton: {
        width: 200,
        height: 200,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
    },
    startLabel: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    startHint: {
        marginTop: 4,
        fontSize: 10,
        opacity: 0.8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    listeningContainer: {
        alignItems: 'center',
        width: '100%',
    },
    radarCenter: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 3,
        opacity: 0.4,
    },
    pulseRingOuter: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        opacity: 0.2,
    },
    micCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listeningLabel: {
        marginTop: 16,
        fontWeight: '700',
        letterSpacing: 2,
        fontSize: 12,
    },
    interimText: {
        marginTop: 16,
        textAlign: 'center',
        fontStyle: 'italic',
        opacity: 0.7,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    debriefContainer: {
        alignItems: 'center',
        width: '100%',
        paddingVertical: 16,
    },
    accuracyText: {
        fontSize: 56,
        fontWeight: '800',
        lineHeight: 64,
    },
    accuracyLabel: {
        letterSpacing: 2,
        marginTop: 8,
        fontWeight: '700',
        fontSize: 14,
    },
    advancingHint: {
        marginTop: 20,
        opacity: 0.5,
        fontStyle: 'italic',
    },
    transcriptCard: {
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
    },
    transcriptVal: {
        fontStyle: 'italic',
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(150, 150, 150, 0.2)',
        marginVertical: 16,
    },
    expectedVal: {
        lineHeight: 22,
        opacity: 0.8,
    },
    abortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
        marginTop: 16,
    },
    abortText: {
        fontWeight: '700',
        letterSpacing: 1.5,
    },
});
