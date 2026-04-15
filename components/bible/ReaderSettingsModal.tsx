import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface ReaderSettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ReaderSettingsModal({
  isVisible,
  onClose,
}: ReaderSettingsModalProps) {
  const { theme, isDark, userSettings, saveUserSettings } = useAppStore();

  const updateSetting = useCallback((key: string, value: any) => {
    saveUserSettings({
      ...userSettings,
      [key]: value,
    });
  }, [userSettings, saveUserSettings]);

  const fontSizes = [14, 16, 17, 18, 20, 24, 28];
  const lineHeights = [1.2, 1.4, 1.6, 1.8, 2.0];
  const fonts = [
    { label: 'SANS', value: 'sans' },
    { label: 'SERIF', value: 'serif' },
    { label: 'MONO', value: 'mono' },
  ];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]}>
              DISPLAY CALIBRATION
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Font Family */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TYPOGRAPHY TYPE</Text>
              <View style={styles.buttonRow}>
                {fonts.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[
                      styles.optionButton,
                      { borderColor: theme.border },
                      userSettings.bibleFontFamily === f.value && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => updateSetting('bibleFontFamily', f.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: userSettings.bibleFontFamily === f.value ? theme.accentContrastText : theme.text }
                    ]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Font Size */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MAGNIFICATION LEVEL</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
                {fontSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeButton,
                      { borderColor: theme.border },
                      userSettings.bibleFontSize === size && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => updateSetting('bibleFontSize', size)}
                  >
                    <Text style={[
                      styles.sizeText,
                      { color: userSettings.bibleFontSize === size ? theme.accentContrastText : theme.text }
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Line Height */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>VERTICAL SPACING</Text>
              <View style={styles.buttonRow}>
                {lineHeights.map((lh) => (
                  <TouchableOpacity
                    key={lh}
                    style={[
                      styles.optionButton,
                      { borderColor: theme.border },
                      userSettings.bibleLineHeight === lh && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => updateSetting('bibleLineHeight', lh)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: userSettings.bibleLineHeight === lh ? theme.accentContrastText : theme.text }
                    ]}>
                      {lh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={[styles.previewArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: theme.border }]}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 8 }]}>PREVIEW</Text>
              <Text style={[
                {
                  fontSize: userSettings.bibleFontSize || 17,
                  lineHeight: (userSettings.bibleFontSize || 17) * (userSettings.bibleLineHeight || 1.6),
                  fontFamily: userSettings.bibleFontFamily === 'serif' ? 'serif' : userSettings.bibleFontFamily === 'mono' ? 'monospace' : 'System',
                  color: theme.text,
                }
              ]}>
                For God so loved the world, that he gave his only begotten Son...
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  scrollRow: {
    gap: 8,
    paddingRight: 20,
  },
  optionButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sizeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  previewArea: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
