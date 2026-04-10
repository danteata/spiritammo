import { useMemo, useState } from 'react'
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ThemedText } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection } from '@/types/scripture'

type Props = {
  isVisible: boolean
  scriptureId: string | null
  onClose: () => void
  suggestedCollectionName?: string
}

export default function QuickAddCollectionModal({
  isVisible,
  scriptureId,
  onClose,
  suggestedCollectionName = 'Struggling Verses',
}: Props) {
  const { collections, addCollection, addScripturesToCollection, theme, scriptures } = useAppStore()
  const [query, setQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState(suggestedCollectionName)

  const targetScripture = useMemo(() => {
    if (!scriptureId) return null
    return scriptures.find(s => s.id === scriptureId) || null
  }, [scriptureId, scriptures])

  const filteredCollections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return collections
    return collections.filter(c => c.name.toLowerCase().includes(q))
  }, [collections, query])

  const closeAndReset = () => {
    setQuery('')
    setIsCreating(false)
    setNewName(suggestedCollectionName)
    onClose()
  }

  const addTo = async (collection: Collection) => {
    if (!scriptureId) return
    const ok = await addScripturesToCollection(collection.id, [scriptureId])
    if (!ok) {
      Alert.alert('Add Failed', 'Unable to add verse to collection. Please try again.')
      return
    }
    closeAndReset()
  }

  const createAndAdd = async () => {
    if (!scriptureId) return
    const name = newName.trim()
    if (!name) return

    const newCollection: Collection = {
      id: `quick_${Date.now()}`,
      name,
      scriptures: [],
      createdAt: new Date().toISOString(),
      tags: ['quick-add'],
    }
    await addCollection(newCollection)
    await addTo(newCollection)
  }

  return (
    <Modal
      visible={isVisible && !!scriptureId}
      transparent
      animationType="slide"
      onRequestClose={closeAndReset}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="subheading">Add to Collection</ThemedText>
              {targetScripture && (
                <ThemedText variant="caption" style={{ opacity: 0.7, marginTop: 2 }}>
                  {targetScripture.reference}
                </ThemedText>
              )}
            </View>
            <TouchableOpacity onPress={closeAndReset}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {isCreating ? (
            <View style={{ gap: 10 }}>
              <ThemedText variant="caption" style={{ opacity: 0.7 }}>
                Create a new collection and add this verse.
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                ]}
                placeholder="Collection name"
                placeholderTextColor={theme.textSecondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.border }]}
                  onPress={() => setIsCreating(false)}
                >
                  <ThemedText variant="body">Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: theme.accent, borderColor: theme.accent, flex: 1 },
                  ]}
                  onPress={createAndAdd}
                  disabled={!newName.trim()}
                >
                  <ThemedText variant="body" style={{ color: theme.accentContrastText, fontWeight: '700' }}>
                    Create & Add
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                ]}
                placeholder="Search collections…"
                placeholderTextColor={theme.textSecondary}
                value={query}
                onChangeText={setQuery}
              />

              <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingVertical: 8 }}>
                {filteredCollections.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.collectionRow, { borderColor: theme.border }]}
                    onPress={() => addTo(c)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
                    <ThemedText variant="body" style={{ flex: 1 }}>
                      {c.name}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ opacity: 0.65 }}>
                      {c.scriptures?.length || 0}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.createRow, { borderColor: theme.border }]}
                onPress={() => setIsCreating(true)}
              >
                <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
                <ThemedText variant="body" style={{ flex: 1 }}>
                  Create New Collection
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

