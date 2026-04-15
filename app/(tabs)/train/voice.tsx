import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    StyleSheet, View, TouchableOpacity, Animated,
    ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BlurredTextOverlay from '@/components/ui/BlurredTextOverlay';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '@/hooks/useAppStore';
import { ThemedContainer, ThemedText } from '@/components/Themed';
import ScreenHeader from '@/components/ScreenHeader';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import VoicePlaybackService from '@/services/voicePlayback';
import { evaluateRecitation } from '@/utils/similarity';
import { Scripture } from '@/types/scripture';
import { useScriptureScope } from '@/hooks/useScriptureScope';
import { usePracticeCompletion } from '@/hooks/usePracticeCompletion';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const speakAndWait = (
    text: string,
    options?: { rate?: number; pitch?: number; language?: string },
): Promise<void> =>
    new Promise((resolve) => {
        Speech.speak(text, {
            rate: options?.rate ?? 0.9,
            pitch: options?.pitch ?? 1.0,
            language: options?.language || 'en-US',
            onDone: resolve,
            onStopped: resolve,
            onError: () => resolve(),
        });
    });

const SILENCE_TIMEOUT_MS = 3000;
const RADIO_SILENCE_MS = 6000;
const POST_RESULT_DELAY_MS = 1500;
const MAX_LISTEN_MS = 45000;
const TTS_DRAIN_MS = 400;

type VoicePhase = 'idle' | 'briefing' | 'listening' | 'evaluating' | 'debrief' | 'skipping';

export default function VoiceOpsScreen() {
    const { scriptures: allScriptures, collections, theme, isDark, userSettings } = useAppStore();
    const params = useLocalSearchParams();
    const router = useRouter();

    const { handleComplete: handlePracticeComplete } = usePracticeCompletion({
        practiceType: 'voice_ops',
        isTraining: true,
        awardVP: false,
        saveLog: true,
        updateProfile: true,
        updateSRS: true,
        afterActionBriefing: false,
    })

    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null);
    const [phase, setPhase] = useState<VoicePhase>('idle');
    const [accuracy, setAccuracy] = useState<number>(0);
    const [lastTranscript, setLastTranscript] = useState('');
    const [localTranscript, setLocalTranscript] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [versesAttempted, setVersesAttempted] = useState(0);
    const [versesHit, setVersesHit] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);
    const [showVerseText, setShowVerseText] = useState(false);
    const [sessionLength, setSessionLength] = useState<number>(0);
    const [verseProgress, setVerseProgress] = useState(0);

    const [pulseAnim] = useState(new Animated.Value(1));
    const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

    const isMountedRef = useRef(true);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const radioSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const maxListenTimerRef = useRef<NodeJS.Timeout | null>(null);
    const phaseRef = useRef<VoicePhase>('idle');
    const isRunningRef = useRef(false);
    const isCycleRunningRef = useRef(false);
    const currentScriptureRef = useRef<Scripture | null>(null);

    const accumulatedRef = useRef('');
    const hasReceivedSpeechRef = useRef(false);
    const latestTranscriptRef = useRef('');
    const keepListeningRef = useRef(false);
    const manualStopRef = useRef(false);
    const nativeTranscriptRef = useRef('');

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
    useEffect(() => { currentScriptureRef.current = currentScripture; }, [currentScripture]);

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
        requestPermissions,
    } = useSpeechRecognition({
        lang: userSettings.language || 'en-US',
        interimResults: true,
        continuous: true,
        onResult: (text: string, isFinal: boolean) => {
            hasReceivedSpeechRef.current = true;

            if (isFinal && text.trim()) {
                const combined = [nativeTranscriptRef.current, text.trim()].filter(Boolean).join(' ');
                nativeTranscriptRef.current = combined;
                setLocalTranscript(combined);
            } else if (text.trim()) {
                const combined = [nativeTranscriptRef.current, text.trim()].filter(Boolean).join(' ');
                setLocalTranscript(combined);
            }

            latestTranscriptRef.current = nativeTranscriptRef.current;
            accumulatedRef.current = nativeTranscriptRef.current;

            if (radioSilenceTimerRef.current) {
                clearTimeout(radioSilenceTimerRef.current);
                radioSilenceTimerRef.current = null;
            }

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                if (isMountedRef.current && phaseRef.current === 'listening' && hasReceivedSpeechRef.current) {
                    finalizeListening();
                }
            }, SILENCE_TIMEOUT_MS);
        },
        onEnd: () => {
            if (!isMountedRef.current || phaseRef.current !== 'listening') return;
            if (manualStopRef.current || !keepListeningRef.current) return;

            setTimeout(async () => {
                if (manualStopRef.current || !keepListeningRef.current) return;
                if (phaseRef.current !== 'listening') return;
                try {
                    const ok = await startSTT();
                    if (!ok) {
                        keepListeningRef.current = false;
                        finalizeListening();
                    }
                } catch (e) {
                    keepListeningRef.current = false;
                    finalizeListening();
                }
            }, 800);
        },
        onError: (err: string) => {
            console.warn('[VoiceOps] STT error:', err);
        },
    });

    const finalizeListening = useCallback(() => {
        clearAllTimers();
        keepListeningRef.current = false;
        manualStopRef.current = true;
        stopSTT();
        if (isMountedRef.current) setPhase('evaluating');
    }, [stopSTT]);

    const clearAllTimers = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (radioSilenceTimerRef.current) { clearTimeout(radioSilenceTimerRef.current); radioSilenceTimerRef.current = null; }
        if (maxListenTimerRef.current) { clearTimeout(maxListenTimerRef.current); maxListenTimerRef.current = null; }
    };

    const initialChapterIds = useMemo(() => {
        const raw = params.chapterIds;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.flatMap((id) => id.split(',')).filter(Boolean);
        return raw.split(',').filter(Boolean);
    }, [params.chapterIds]);

    const selectedCollection = useMemo(() => {
        const id = params.collectionId as string;
        if (!id || !collections) return null;
        return collections.find((c) => c.id === id) || null;
    }, [params.collectionId, collections]);

    const targetScriptures = useScriptureScope(
        allScriptures,
        selectedCollection,
        initialChapterIds,
    );

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            clearAllTimers();
            VoicePlaybackService.stopPlayback();
        };
    }, []);

    useEffect(() => {
        pulseRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
            ]),
        );
        pulseRef.current.start();
        return () => { pulseRef.current?.stop(); };
    }, [pulseAnim]);

    const pickNextScripture = useCallback((): Scripture | null => {
        if (!targetScriptures || targetScriptures.length === 0) return null;
        return targetScriptures[Math.floor(Math.random() * targetScriptures.length)];
    }, [targetScriptures]);

    // ─── Skip: show verse + read aloud then advance ─────────────
    const handleSkipWithReadback = useCallback(async (scripture: Scripture) => {
        if (!isMountedRef.current) return;

        // Show the verse text so user can read along
        setShowVerseText(true);
        phaseRef.current = 'skipping';
        setPhase('skipping');

        await speakAndWait(`Skipping. The verse reads: ${scripture.text}`, {
            rate: userSettings.voiceRate || 0.9,
            pitch: userSettings.voicePitch || 1.0,
            language: userSettings.language || 'en-US',
        });

        await new Promise((r) => setTimeout(r, POST_RESULT_DELAY_MS));
        if (!isMountedRef.current || !isRunningRef.current) return;

        advanceToNext();
    }, [userSettings]);

    // ─────────────────────────────────────────────────────────────
    // beginVerseCycle
    // ─────────────────────────────────────────────────────────────
    const beginVerseCycle = useCallback(async (scripture: Scripture) => {
        if (isCycleRunningRef.current) return;
        isCycleRunningRef.current = true;

        try {
            if (!isMountedRef.current) return;

            clearAllTimers();
            setCurrentScripture(scripture);
            currentScriptureRef.current = scripture;
            setAccuracy(0);
            setLastTranscript('');
            setLocalTranscript('');
            setShowVerseText(false);
            accumulatedRef.current = '';
            nativeTranscriptRef.current = '';
            hasReceivedSpeechRef.current = false;
            latestTranscriptRef.current = '';
            keepListeningRef.current = false;
            manualStopRef.current = false;

            phaseRef.current = 'briefing';
            setPhase('briefing');

            await speakAndWait(`Deploy: ${scripture.reference}`, {
                rate: userSettings.voiceRate || 0.9,
                pitch: userSettings.voicePitch || 1.0,
                language: userSettings.language || 'en-US',
            });
            if (!isMountedRef.current) return;

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            await speakAndWait('Go', { rate: 1.2, pitch: 1.3, language: userSettings.language || 'en-US' });

            // ── Stop TTS and drain ──────────────────────────────
            await Speech.stop();
            await new Promise((r) => setTimeout(r, TTS_DRAIN_MS));
            resetTranscript();
            nativeTranscriptRef.current = '';

            // ── Start STT immediately — no extra delay ─────────
            phaseRef.current = 'listening';
            setPhase('listening');
            keepListeningRef.current = true;
            manualStopRef.current = false;

            const started = await startSTT();
            if (!started) {
                console.warn('[VoiceOps] STT failed to start — skipping');
                isCycleRunningRef.current = false;
                setSkippedCount((p) => p + 1);
                await handleSkipWithReadback(scripture);
                return;
            }

            // ── Timers — fully hands-free ───────────────────────
            radioSilenceTimerRef.current = setTimeout(() => {
                if (
                    isMountedRef.current &&
                    phaseRef.current === 'listening' &&
                    !hasReceivedSpeechRef.current
                ) {
                    clearAllTimers();
                    keepListeningRef.current = false;
                    manualStopRef.current = true;
                    stopSTT();
                    setSkippedCount((p) => p + 1);
                    isCycleRunningRef.current = false;
                    handleSkipWithReadback(scripture);
                }
            }, RADIO_SILENCE_MS);

            maxListenTimerRef.current = setTimeout(() => {
                if (isMountedRef.current && phaseRef.current === 'listening') {
                    finalizeListening();
                }
            }, MAX_LISTEN_MS);

        } catch (err) {
            console.error('[VoiceOps] beginVerseCycle error:', err);
            isCycleRunningRef.current = false;
        }
    }, [userSettings, startSTT, stopSTT, resetTranscript, finalizeListening, handleSkipWithReadback]);

    // ─── STEP 3: Evaluate ───────────────────────────────────────
    useEffect(() => {
        if (phase !== 'evaluating' || !currentScripture) return;

        const captured = latestTranscriptRef.current || nativeTranscriptRef.current || transcript;
        setLastTranscript(captured);

        if (!captured || captured.trim().length === 0) {
            setSkippedCount((p) => p + 1);
            isCycleRunningRef.current = false;
            handleSkipWithReadback(currentScripture);
            return;
        }

        const score = evaluateRecitation(captured, currentScripture.text);
        setAccuracy(score);
        setVersesAttempted((p) => p + 1);
        if (score >= 80) setVersesHit((p) => p + 1);

        if (currentScripture) {
            handlePracticeComplete(currentScripture, score, captured)
        }

        const msg =
            score >= 80
                ? `Target Hit. ${Math.round(score)} percent.`
                : `Target Missed. ${Math.round(score)} percent.`;

        announceAndAdvance(msg, true);
    }, [phase, currentScripture]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── STEP 4: Announce result → debrief → advance ─────────────
    const announceAndAdvance = useCallback(async (message: string, showDebrief: boolean) => {
        if (!isMountedRef.current) return;
        if (showDebrief) setPhase('debrief');

        await speakAndWait(message, {
            rate: userSettings.voiceRate || 0.9,
            pitch: userSettings.voicePitch || 1.0,
            language: userSettings.language || 'en-US',
        });

        await new Promise((r) => setTimeout(r, POST_RESULT_DELAY_MS));
        if (!isMountedRef.current || !isRunningRef.current) return;

        advanceToNext();
    }, [userSettings]);

    // ─── STEP 5: Auto-advance ────────────────────────────────────
    const advanceToNext = useCallback(() => {
        if (!isMountedRef.current) return;
        isCycleRunningRef.current = false;

        if (sessionLength > 0 && versesAttempted >= sessionLength) {
            setPhase('idle');
            setIsRunning(false);
            return;
        }

        const next = pickNextScripture();
        if (next) {
            beginVerseCycle(next);
        } else {
            setPhase('idle');
            setIsRunning(false);
        }
    }, [pickNextScripture, beginVerseCycle, sessionLength, versesAttempted]);

    // ─── Start Mission ───────────────────────────────────────────
    const handleStartMission = async () => {
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
        setVerseProgress(0);

        const first = pickNextScripture();
        if (first) beginVerseCycle(first);
    };

    // ─── Abort Mission ───────────────────────────────────────────
    const handleAbortMission = () => {
        isCycleRunningRef.current = false;
        keepListeningRef.current = false;
        manualStopRef.current = true;
        setIsRunning(false);
        clearAllTimers();
        stopSTT();
        Speech.stop();
        VoicePlaybackService.stopPlayback();
        setPhase('idle');
    };

    const accentColor = theme.info || '#4dabf7';

    return (
        <ThemedContainer style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Mission Stats — compact */}
                {isRunning && (
                    <View style={[styles.statsBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        {[
                            { label: 'ATTEMPTED', val: versesAttempted, color: accentColor },
                            { label: 'HITS', val: versesHit, color: theme.success },
                            { label: 'SKIPPED', val: skippedCount, color: theme.textSecondary },
                        ].map((s) => (
                            <View key={s.label} style={styles.statItem}>
                                <ThemedText variant="caption" style={styles.statLabel}>{s.label}</ThemedText>
                                <ThemedText variant="heading" style={[styles.statValue, { color: s.color }]}>{s.val}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}

                {/* Progress bar */}
                {isRunning && sessionLength > 0 && (
                    <View style={styles.progressSection}>
                        <ThemedText variant="caption" style={styles.progressLabel}>
                            Verse {versesAttempted} of {sessionLength}
                        </ThemedText>
                        <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                            <View
                                style={[styles.progressBarFill, {
                                    width: `${Math.min((versesAttempted / sessionLength) * 100, 100)}%`,
                                    backgroundColor: accentColor,
                                }]}
                            />
                        </View>
                    </View>
                )}

                {/* Current target — reference + blurred verse text during briefing/listening */}
                {currentScripture && isRunning && (phase === 'listening' || phase === 'briefing') && !showVerseText && (
                    <View style={styles.targetCard}>
                        <ThemedText variant="caption" style={styles.label}>CURRENT TARGET</ThemedText>
                        <ThemedText variant="heading" style={[styles.reference, { color: accentColor }]}>
                            {currentScripture.reference}
                        </ThemedText>
                        <BlurredTextOverlay containerStyle={styles.hiddenTextWrapper}>
                            <ThemedText variant="body" style={styles.blurredVerseText}>
                                {currentScripture.text}
                            </ThemedText>
                        </BlurredTextOverlay>
                    </View>
                )}

                {/* Skip — show verse text so user can read along */}
                {currentScripture && isRunning && showVerseText && (
                    <View style={styles.targetCard}>
                        <ThemedText variant="caption" style={styles.label}>VERSE</ThemedText>
                        <ThemedText variant="heading" style={[styles.reference, { color: accentColor }]}>
                            {currentScripture.reference}
                        </ThemedText>
                        <ThemedText variant="body" style={styles.verseText}>
                            {currentScripture.text}
                        </ThemedText>
                    </View>
                )}

                {/* Center Stage */}
                <View style={styles.centerStage}>

                    {/* IDLE */}
                    {phase === 'idle' && !isRunning && (
                        <View style={styles.startContainer}>
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

                            <View style={styles.sessionLengthSection}>
                                <ThemedText variant="caption" style={styles.sessionLengthLabel}>
                                    VERSES PER SESSION
                                </ThemedText>
                                <View style={styles.sessionLengthOptions}>
                                    {[
                                        { label: '5', value: 5 },
                                        { label: '10', value: 10 },
                                        { label: 'Unlimited', value: 0 },
                                    ].map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[
                                                styles.sessionOption,
                                                {
                                                    backgroundColor: sessionLength === opt.value ? accentColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                                    borderColor: sessionLength === opt.value ? accentColor : 'transparent',
                                                },
                                            ]}
                                            onPress={() => setSessionLength(opt.value)}
                                        >
                                            <ThemedText
                                                variant="caption"
                                                style={{
                                                    fontWeight: '700',
                                                    color: sessionLength === opt.value ? theme.background : theme.text,
                                                }}
                                            >
                                                {opt.label}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* BRIEFING */}
                    {phase === 'briefing' && (
                        <View style={styles.stageContent}>
                            <Ionicons name="volume-medium" size={48} color={theme.textSecondary} />
                            <ThemedText variant="body" style={styles.instruction}>Broadcasting Target...</ThemedText>
                        </View>
                    )}

                    {/* LISTENING */}
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
                            {isRecognizing && (
                                <View style={styles.timerRow}>
                                    <View style={styles.recordingDot} />
                                    <ThemedText variant="body" style={styles.timerText}>
                                        Listening...
                                    </ThemedText>
                                </View>
                            )}
                            {localTranscript ? (
                                <ThemedText variant="body" style={styles.interimText}>
                                    {localTranscript}
                                </ThemedText>
                            ) : (
                                <ThemedText variant="caption" style={styles.tapHint}>
                                    Speak now — silence will auto-finish
                                </ThemedText>
                            )}
                        </View>
                    )}

                    {/* SKIPPING */}
                    {phase === 'skipping' && (
                        <View style={styles.stageContent}>
                            <Ionicons name="volume-medium" size={48} color={theme.textSecondary} />
                            <ThemedText variant="body" style={styles.instruction}>Reading verse aloud...</ThemedText>
                        </View>
                    )}

                    {/* EVALUATING */}
                    {phase === 'evaluating' && (
                        <View style={styles.stageContent}>
                            <ActivityIndicator size="large" color={accentColor} />
                            <ThemedText variant="body" style={styles.instruction}>Analyzing Transmission...</ThemedText>
                        </View>
                    )}

                    {/* DEBRIEF */}
                    {phase === 'debrief' && (
                        <View style={styles.debriefContainer}>
                            <ThemedText variant="heading" style={[styles.accuracyText, { color: accuracy >= 80 ? theme.success : theme.error }]}>
                                {accuracy.toFixed(0)}%
                            </ThemedText>
                            <ThemedText variant="caption" style={[styles.accuracyLabel, { color: accuracy >= 80 ? theme.success : theme.error }]}>
                                {accuracy >= 80 ? '● TARGET HIT' : '✕ TARGET MISSED'}
                            </ThemedText>

                            {currentScripture && (
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

                            <ThemedText variant="caption" style={styles.advancingHint}>
                                Advancing to next target...
                            </ThemedText>
                        </View>
                    )}
                </View>

                {/* Abort — always visible when running */}
                {isRunning && (
                    <TouchableOpacity
                        style={[styles.abortButton, { borderColor: theme.error }]}
                        onPress={handleAbortMission}
                    >
                        <Ionicons name="close-circle" size={18} color={theme.error} />
                        <ThemedText variant="caption" style={[styles.abortText, { color: theme.error }]}>
                            END SESSION
                        </ThemedText>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ThemedContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 32 },
    statsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderRadius: 8, marginBottom: 12 },
    statItem: { alignItems: 'center', gap: 2 },
    statLabel: { letterSpacing: 1.5, opacity: 0.6, fontSize: 9 },
    statValue: { fontSize: 20, fontWeight: '800' },
    targetCard: { alignItems: 'center', marginBottom: 12 },
    label: { letterSpacing: 2, opacity: 0.6, marginBottom: 4, fontSize: 10 },
    reference: { fontSize: 24, fontWeight: '800', letterSpacing: 1 },
    verseText: { textAlign: 'center', marginTop: 6, opacity: 0.7, fontStyle: 'italic', lineHeight: 20, paddingHorizontal: 8 },
    hiddenTextWrapper: { marginTop: 6, width: '100%' },
    blurredVerseText: { textAlign: 'center', fontStyle: 'italic', lineHeight: 20, paddingHorizontal: 8 },
    centerStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    stageContent: { alignItems: 'center', gap: 12 },
    instruction: { opacity: 0.7, letterSpacing: 1 },
    startButton: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
    startLabel: { marginTop: 8, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
    startHint: { marginTop: 4, fontSize: 10, opacity: 0.8, textAlign: 'center', paddingHorizontal: 16 },
    listeningContainer: { alignItems: 'center', width: '100%' },
    radarCenter: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 3, opacity: 0.4 },
    pulseRingOuter: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 2, opacity: 0.2 },
    micCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    listeningLabel: { marginTop: 12, fontWeight: '700', letterSpacing: 2, fontSize: 12 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3b30' },
    timerText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] as any },
    interimText: { marginTop: 12, textAlign: 'center', fontStyle: 'italic', opacity: 0.8, paddingHorizontal: 12, minHeight: 40 },
    tapHint: { marginTop: 12, opacity: 0.5, fontStyle: 'italic', fontSize: 12 },
    debriefContainer: { alignItems: 'center', width: '100%', paddingVertical: 4 },
    accuracyText: { fontSize: 44, fontWeight: '800', lineHeight: 52 },
    accuracyLabel: { letterSpacing: 2, marginTop: 2, fontWeight: '700', fontSize: 13 },
    advancingHint: { marginTop: 8, opacity: 0.5, fontStyle: 'italic', fontSize: 11 },
    transcriptCard: { padding: 12, borderRadius: 8, marginTop: 12, width: '100%', maxHeight: 200 },
    transcriptVal: { fontStyle: 'italic', lineHeight: 20 },
    divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 10 },
    expectedVal: { lineHeight: 20, opacity: 0.8 },
    abortButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, gap: 6, marginTop: 12 },
    abortText: { fontWeight: '700', letterSpacing: 1.5, fontSize: 12 },
    startContainer: { alignItems: 'center' },
    sessionLengthSection: { marginTop: 24, alignItems: 'center' },
    sessionLengthLabel: { letterSpacing: 1.5, opacity: 0.6, marginBottom: 12, fontSize: 10 },
    sessionLengthOptions: { flexDirection: 'row', gap: 10 },
    sessionOption: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
    progressSection: { marginBottom: 8 },
    progressLabel: { letterSpacing: 1, opacity: 0.6, marginBottom: 6, textAlign: 'center' },
    progressBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 2 },
});
