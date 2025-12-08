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
import { FontAwesome } from '@expo/vector-icons';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Scripture } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'
import ScriptureText from './ScriptureText'

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
  const { theme, gradients } = useAppStore()
  const styles = getStyles(theme)

  const ExpandableScriptureItem = ({ item }: { item: Scripture }) => {
    const [expanded, setExpanded] = React.useState(false)

    return (
      <TouchableOpacity
        style={styles.scriptureItem}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.reference, MILITARY_TYPOGRAPHY.body]}>
          {item.reference}
        </Text>
        <ScriptureText
          text={item.text}
          isJesusWords={item.isJesusWords}
          style={[styles.scriptureText, MILITARY_TYPOGRAPHY.caption]}
          numberOfLines={expanded ? undefined : 2}
          ellipsizeMode="tail"
        />
      </TouchableOpacity>
    )
  }

  const renderScriptureItem = ({ item }: { item: Scripture }) => (
    <ExpandableScriptureItem item={item} />
  )

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={gradients.tactical.background}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <FontAwesome name="book" size={24} color={theme.accent} />
              <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
                {bookName} References
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close modal">
              <FontAwesome name="close" size={24} color={theme.text} />
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
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome name="book" size={48} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Text style={[styles.emptyText, MILITARY_TYPOGRAPHY.body]}>
                No rounds found in this book.
              </Text>
            </View>
          }
        />
      </LinearGradient>
    </Modal>
  )
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
    color: theme.text,
    flex: 1,
  },
  subtitle: {
    color: theme.textSecondary,
  },
  closeButton: {
    padding: 8,
    backgroundColor: theme.border,
    borderRadius: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  scriptureItem: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.accent,
  },
  reference: {
    color: theme.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  scriptureText: {
    color: theme.textSecondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    color: theme.textSecondary,
    textAlign: 'center',
    fontSize: 16,
  },
})
