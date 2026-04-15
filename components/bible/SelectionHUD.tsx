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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Scripture } from '@/types/scripture';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { generateBattleIntel } from '@/services/battleIntelligence';

interface SelectionHUDProps {
  selectedVerses: Scripture[];
  onClear: () => void;
  onAddToCollection: (verses: Scripture[]) => void;
  onDrillNow: (verses: Scripture[]) => void;
  onHighlight: (color: string | null) => void;
  onAddNote: () => void;
  onShare: () => void;
  onListen: () => void;
  theme: any;
  isDark: boolean;
  userSettings: any;
}

const SelectionHUD = memo(({
  selectedVerses,
  onClear,
  onAddToCollection,
  onDrillNow,
  onHighlight,
  onAddNote,
  onShare,
  onListen,
  theme,
  isDark,
  userSettings,
}: SelectionHUDProps) => {
  const slideAnim = useRef(new Animated.Value(140)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const countScaleAnim = useRef(new Animated.Value(1)).current;
  const isVisible = selectedVerses.length > 0;
  const prevCount = useRef(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: isVisible ? 0 : 140,
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

  useEffect(() => {
    if (selectedVerses.length !== prevCount.current) {
      Animated.sequence([
        Animated.spring(countScaleAnim, { toValue: 1.35, tension: 400, friction: 10, useNativeDriver: true }),
        Animated.spring(countScaleAnim, { toValue: 1, tension: 300, friction: 12, useNativeDriver: true }),
      ]).start();
      prevCount.current = selectedVerses.length;
    }
  }, [selectedVerses.length]);

  const handleGetIntel = useCallback(async () => {
    if (selectedVerses.length === 0) return;
    const verse = selectedVerses[0];
    try {
      const intel = await generateBattleIntel({ reference: verse.reference, text: verse.text });
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
    const text = selectedVerses.map(v => `"${v.text}" — ${v.reference}`).join('\n\n');
    Clipboard.setString(text);
    Alert.alert('Copied', `${selectedVerses.length} verse${selectedVerses.length > 1 ? 's' : ''} copied to clipboard.`);
  }, [selectedVerses]);

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
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: theme.accent }]} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onClear} style={styles.clearButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <Animated.View style={[styles.countBadge, { backgroundColor: theme.accent, transform: [{ scale: countScaleAnim }] }]}>
          <Text style={[styles.countText, { color: theme.accentContrastText }]}>{selectedVerses.length}</Text>
        </Animated.View>

        <Text style={[styles.headerTitle, MILITARY_TYPOGRAPHY.caption, { color: theme.text }]}>
          {selectedVerses.length === 1 ? '1 TARGET ACQUIRED' : `${selectedVerses.length} TARGETS ACQUIRED`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryAction, { backgroundColor: theme.accent }]}
        onPress={() => onAddToCollection(selectedVerses)}
      >
        <Ionicons name="rocket" size={20} color={theme.accentContrastText} />
        <Text style={[styles.primaryActionText, MILITARY_TYPOGRAPHY.button, { color: theme.accentContrastText }]}>
          LOG ROUNDS TO ARSENAL
        </Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollActions}>
        <TouchableOpacity style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} onPress={() => onDrillNow(selectedVerses)}>
          <Ionicons name="flash" size={18} color={theme.warning} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>DRILL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} onPress={onListen}>
          <Ionicons name="volume-high" size={18} color={theme.info} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>LISTEN</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} 
          onPress={() => onHighlight('#FDE047')}
        >
          <Ionicons name="brush" size={16} color="#F59E0B" />
          <Text style={[styles.secBtnText, { color: theme.text }]}>HIGHLIGHT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} onPress={onAddNote}>
          <Ionicons name="document-text" size={17} color={theme.accent} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>NOTE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} onPress={handleGetIntel}>
          <FontAwesome5 name="brain" size={15} color={theme.success} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>INTEL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} onPress={onShare}>
          <Ionicons name="share-social" size={17} color={theme.text} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>SHARE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} onPress={handleCopy}>
          <Ionicons name="copy" size={17} color={theme.textSecondary} />
          <Text style={[styles.secBtnText, { color: theme.text }]}>COPY</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 28,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  accentBar: {
    height: 2,
    width: '100%',
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
    marginBottom: 14,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
  },
  primaryActionText: {
    letterSpacing: 1.0,
  },
  scrollActions: {
    paddingHorizontal: 16,
    gap: 8,
  },
  secBtn: {
    width: 72,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 2,
  },
  secBtnText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
});
