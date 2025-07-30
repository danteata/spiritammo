import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { X, Book } from 'lucide-react-native'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Scripture } from '@/types/scripture'

interface BookScripturesModalProps {
  isVisible: boolean
  onClose: () => void
  scriptures: Scripture[]
  bookName: string
}

export default function BookScripturesModal({
  isVisible,
  onClose,
  scriptures,
  bookName,
}: BookScripturesModalProps) {
  const renderScriptureItem = ({ item }: { item: Scripture }) => (
    <View style={styles.scriptureItem}>
      <Text style={[styles.reference, MILITARY_TYPOGRAPHY.body]}>
        {item.reference}
      </Text>
      <Text
        style={[styles.scriptureText, MILITARY_TYPOGRAPHY.caption]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.text}
      </Text>
    </View>
  )

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a2f0a', '#2D5016', '#0f1a05']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Book size={24} color={TACTICAL_THEME.accent} />
              <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
                {bookName} References
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={TACTICAL_THEME.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, MILITARY_TYPOGRAPHY.body]}>
            {scriptures.length} rounds available in {bookName}
          </Text>
        </View>

        {/* Scripture References List */}
        <FlatList
          data={scriptures}
          renderItem={renderScriptureItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: TACTICAL_THEME.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  title: {
    color: TACTICAL_THEME.text,
    flex: 1,
  },
  subtitle: {
    color: TACTICAL_THEME.textSecondary,
  },
  closeButton: {
    padding: 8,
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  scriptureItem: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: TACTICAL_THEME.accent,
  },
  reference: {
    color: TACTICAL_THEME.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  scriptureText: {
    color: TACTICAL_THEME.textSecondary,
    lineHeight: 18,
  },
})
