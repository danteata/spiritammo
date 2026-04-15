import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScriptureText from '@/components/ScriptureText';
import { BibleVerse } from '@/services/bibleApi';
import { Scripture } from '@/types/scripture';

interface VerseRowProps {
  verse: BibleVerse;
  isSelected: boolean;
  isHighlighted: boolean; // deep-link highlight
  highlightColor?: string | null; // personal highlight
  hasNote?: boolean;
  isActivelyReading?: boolean;
  arsenalData: Scripture | null; // null = not in arsenal
  onPress: (verse: BibleVerse) => void;
  onLongPress: (verse: BibleVerse) => void;
  theme: any;
  isDark: boolean;
  userSettings: any;
}

const VerseRow = memo(({
  verse,
  isSelected,
  isHighlighted,
  highlightColor,
  hasNote,
  isActivelyReading,
  arsenalData,
  onPress,
  onLongPress,
  theme,
  isDark,
  userSettings,
}: VerseRowProps) => {
  const highlightAnim = useRef(new Animated.Value(isHighlighted ? 1 : 0)).current;
  const selectAnim = useRef(new Animated.Value(0)).current;
  const prevSelected = useRef(isSelected);

  // Animate deep-link highlight: pulse gold on arrival
  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.delay(1800),
        Animated.timing(highlightAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]).start();
    }
  }, [isHighlighted]);

  // Animate selection background
  useEffect(() => {
    if (isSelected !== prevSelected.current) {
      Animated.spring(selectAnim, {
        toValue: isSelected ? 1 : 0,
        tension: 300,
        friction: 20,
        useNativeDriver: false,
      }).start();
      prevSelected.current = isSelected;
    }
  }, [isSelected]);

  const hasArsenal = arsenalData !== null;
  const accuracy = arsenalData?.accuracy || 0;
  const practiceCount = arsenalData?.practiceCount || 0;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return '#10B981'; // emerald
    if (acc >= 80) return '#F59E0B'; // amber
    if (acc >= 60) return '#F97316'; // orange
    return '#EF4444'; // red
  };

  const getMasteryLabel = (acc: number, count: number) => {
    if (count === 0) return 'LOADED';
    if (acc >= 95) return 'MASTERED';
    if (acc >= 80) return 'TRAINED';
    if (acc >= 60) return 'IN DRILL';
    return 'ROOKIE';
  };

  const selectedBg = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', isDark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.10)'],
  });

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.15)'],
  });

  const finalHighlightBg = isActivelyReading
    ? (isDark ? `${theme.info}44` : `${theme.info}22`)
    : highlightColor 
      ? (isDark ? `${highlightColor}33` : `${highlightColor}44`)
      : highlightBg;

  const leftBorderColor = isActivelyReading
    ? theme.info
    : isSelected
      ? theme.accent
      : hasArsenal
        ? getAccuracyColor(accuracy)
        : 'transparent';

  const fontSize = userSettings?.bibleFontSize || 17;
  const lineHeight = fontSize * (userSettings?.bibleLineHeight || 1.6);
  const fontFamily = userSettings?.bibleFontFamily === 'serif' 
    ? 'serif' 
    : userSettings?.bibleFontFamily === 'mono' 
      ? 'monospace' 
      : 'System';

  return (
    <Animated.View style={{ backgroundColor: isSelected ? selectedBg : finalHighlightBg }}>
      <Pressable
        onPress={() => onPress(verse)}
        onLongPress={() => onLongPress(verse)}
        delayLongPress={350}
        android_ripple={{ color: `${theme.accent}20` }}
        style={[
          styles.row,
          {
            borderLeftWidth: hasArsenal || isSelected || isActivelyReading ? 3 : 0,
            borderLeftColor: leftBorderColor,
          }
        ]}
      >
        {/* Verse number */}
        <View style={styles.verseNumCol}>
          {isActivelyReading ? (
             <Ionicons name="volume-high" size={14} color={theme.info} style={{ marginBottom: 4 }} />
          ) : (
            <Text style={[
              styles.verseNumber,
              { color: isSelected ? theme.accent : theme.textSecondary }
            ]}>
              {verse.verse}
            </Text>
          )}
          {hasNote && (
            <View style={{ marginTop: 4 }}>
              <Ionicons name="document-text" size={10} color={theme.accent} />
            </View>
          )}
        </View>

        {/* Verse text */}
        <View style={styles.textCol}>
          {highlightColor && !isSelected && !isActivelyReading && (
            <View style={[styles.highlightDot, { backgroundColor: highlightColor }]} />
          )}

          <ScriptureText
            text={verse.text}
            isJesusWords={verse.isJesusWords}
            style={{
              ...styles.verseText,
              fontSize,
              lineHeight,
              fontFamily,
              color: isSelected ? theme.text : (isDark ? theme.text : '#1A202C'),
            }}
          />

          {/* Arsenal badge row */}
          {hasArsenal && (
            <View style={styles.arsenalBadge}>
              <Ionicons
                name={practiceCount > 0 ? "shield-checkmark" : "shield"}
                size={11}
                color={getAccuracyColor(accuracy)}
              />
              <Text style={[styles.arsenalText, { color: getAccuracyColor(accuracy) }]}>
                {getMasteryLabel(accuracy, practiceCount)}
                {practiceCount > 0 ? ` · ${accuracy.toFixed(0)}%` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Selection indicator */}
        {isSelected && (
          <View style={styles.selectedCheck}>
            <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

VerseRow.displayName = 'VerseRow';
export default VerseRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingRight: 16,
    paddingLeft: 12,
    alignItems: 'flex-start',
    minHeight: 48,
  },
  verseNumCol: {
    width: 32,
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingTop: 2,
  },
  verseNumber: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  verseText: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  arsenalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  arsenalText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  selectedCheck: {
    paddingLeft: 8,
    paddingTop: 2,
    alignSelf: 'flex-start',
  },
});
