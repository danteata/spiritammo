import React, { useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Clipboard,
  ScrollView,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Scripture, Collection } from '@/types/scripture';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import CollectionSelector from '@/components/CollectionSelector';
import { generateBattleIntel } from '@/services/battleIntelligence';
import VoicePlaybackService from '@/services/voicePlayback';

interface SelectionHUDProps {
  selectedVerses: Scripture[];
  onClear: () => void;
  onAddToCollection: (verses: Scripture[]) => void;
  onDrillNow: (verses: Scripture[]) => void;
  theme: any;
  isDark: boolean;
  userSettings: any;
}

const SelectionHUD = memo(({
  selectedVerses,
  onClear,
  onAddToCollection,
  onDrillNow,
  theme,
  isDark,
  userSettings,
}: SelectionHUDProps) => {
  const slideAnim = useRef(new Animated.Value(120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const countScaleAnim = useRef(new Animated.Value(1)).current;
  const isVisible = selectedVerses.length > 0;
  const prevCount = useRef(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: isVisible ? 0 : 120,
        tension: 200,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible]);

  // Bounce the count badge when a new verse is added
  useEffect(() => {
    if (selectedVerses.length !== prevCount.current) {
      Animated.sequence([
        Animated.spring(countScaleAnim, { toValue: 1.35, tension: 400, friction: 10, useNativeDriver: true }),
        Animated.spring(countScaleAnim, { toValue: 1, tension: 300, friction: 12, useNativeDriver: true }),
      ]).start();
      prevCount.current = selectedVerses.length;
    }
  }, [selectedVerses.length]);

  const handleListen = useCallback(async () => {
    if (selectedVerses.length === 0) return;
    const text = selectedVerses
      .map(v => `${v.reference}. ${v.text}`)
      .join(' ');
    try {
      await VoicePlaybackService.playTextToSpeech(text, {
        rate: userSettings?.voiceRate || 0.9,
        pitch: userSettings?.voicePitch || 1.0,
        language: userSettings?.language || 'en-US',
      });
    } catch (e) {
      console.error('HUD listen error:', e);
    }
  }, [selectedVerses, userSettings]);

  const handleGetIntel = useCallback(async () => {
    if (selectedVerses.length === 0) return;
    const verse = selectedVerses[0];
    try {
      const intel = await generateBattleIntel({
        reference: verse.reference,
        text: verse.text,
      });
      Alert.alert(
        `🧠 BATTLE INTEL: ${verse.reference}`,
        `${intel.battlePlan}\n\n${intel.tacticalNotes}`,
        [{ text: 'COPY', onPress: () => Clipboard.setString(intel.battlePlan) }, { text: 'DISMISS' }]
      );
    } catch (e) {
      Alert.alert('Intel Error', 'Could not generate intel at this time.');
    }
  }, [selectedVerses]);

  const handleCopy = useCallback(() => {
    const text = selectedVerses
      .map(v => `"${v.text}" — ${v.reference}`)
      .join('\n\n');
    Clipboard.setString(text);
    Alert.alert('Copied', `${selectedVerses.length} verse${selectedVerses.length > 1 ? 's' : ''} copied to clipboard.`);
  }, [selectedVerses]);

  const count = selectedVerses.length;
  const countLabel = count === 1
    ? '1 TARGET ACQUIRED'
    : `${count} TARGETS ACQUIRED`;

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopColor: theme.accent,
          shadowColor: theme.shadow,
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      {/* Top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: theme.accent }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClear} style={styles.clearButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <Animated.View style={[styles.countBadge, { backgroundColor: theme.accent, transform: [{ scale: countScaleAnim }] }]}>
          <Text style={[styles.countText, { color: theme.accentContrastText }]}>{count}</Text>
        </Animated.View>

        <Text style={[styles.headerTitle, MILITARY_TYPOGRAPHY.caption, { color: theme.text }]}>
          {countLabel}
        </Text>
      </View>

      {/* Primary action: LOG ROUNDS */}
      <TouchableOpacity
        style={[styles.primaryAction, { backgroundColor: theme.accent }]}
        onPress={() => onAddToCollection(selectedVerses)}
        activeOpacity={0.85}
      >
        <Ionicons name="rocket" size={20} color={theme.accentContrastText} />
        <Text style={[styles.primaryActionText, MILITARY_TYPOGRAPHY.button, { color: theme.accentContrastText }]}>
          LOG ROUNDS TO ARSENAL
        </Text>
      </TouchableOpacity>

      {/* Secondary actions */}
      <View style={styles.secondaryActions}>
        <TouchableOpacity
          style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => onDrillNow(selectedVerses)}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={18} color={theme.warning} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>DRILL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
          onPress={handleListen}
          activeOpacity={0.8}
        >
          <Ionicons name="volume-high" size={18} color={theme.info} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>LISTEN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
          onPress={handleGetIntel}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="brain" size={16} color={theme.success} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>INTEL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <Ionicons name="copy" size={17} color={theme.textSecondary} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>COPY</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

SelectionHUD.displayName = 'SelectionHUD';
export default SelectionHUD;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
    borderTopWidth: 2,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  accentBar: {
    height: 2,
    width: '100%',
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  clearButton: {
    padding: 4,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  headerTitle: {
    flex: 1,
    letterSpacing: 1.2,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionText: {
    letterSpacing: 1.0,
  },
  secondaryActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  secBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  secBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
});
