import * as React from 'react'
import { useState } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Text,
    Alert,
    Dimensions,
} from 'react-native'
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons'
import ContextualTooltip from '@/components/ui/ContextualTooltip'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { VoiceLibrary } from '@/components/VoiceLibrary'
import { useAppStore } from '@/hooks/useAppStore'
import { useZustandStore } from '@/hooks/zustandStore'
import { Collection, Scripture } from '@/types/scripture'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { SkeletonCollectionList } from '@/components/ui/Skeleton'
import { Toast } from '@/components/ui/Toast'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import AddVersesModal from '@/components/AddVersesModal'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { CollectionChapterService } from '@/services/collectionChapters'

const { width } = Dimensions.get('window')

type ArsenalSection = 'collections' | 'voice'

export default function ArsenalScreen() {
    const {
        isDark,
        collections,
        scriptures,
        getScripturesByCollection,
        addScriptures,
        addScripturesToCollection,
        updateCollection,
        theme,
        isLoading,
    } = useAppStore()
    const router = useRouter()
    const { action } = useLocalSearchParams()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('arsenal')

    const [activeSection, setActiveSection] = useState<ArsenalSection>('collections')
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [showCollectionDetail, setShowCollectionDetail] = useState(false)
    const [showFileUploader, setShowFileUploader] = useState(false)
    const [showAddVerses, setShowAddVerses] = useState(false)

    // Handle deep link for import
    React.useEffect(() => {
        if (action === 'import') {
            setTimeout(() => {
                setShowFileUploader(true)
            }, 500)
        }
    }, [action])

    const handleSelectCollection = (collection: Collection) => {
        setSelectedCollection(collection)
        setShowCollectionDetail(true)
        trackEvent(AnalyticsEventType.COLLECTION_SELECTED, {
            collection_id: collection.id,
            collection_name: collection.name,
        })
    }

    const handleAddContent = (type: 'pdf' | 'verse' | 'browse') => {
        trackEvent(AnalyticsEventType.FILE_UPLOADED, {
            content_type: type,
        })

        switch (type) {
            case 'pdf':
                setShowFileUploader(true)
                break
            case 'verse':
                setShowAddVerses(true)
                break
            case 'browse':
                // Navigate to browse books
                break
        }
    }

    const totalVerses = scriptures?.length || 0

    const sections: { key: ArsenalSection; label: string; icon: string }[] = [
        { key: 'collections', label: 'Collections', icon: 'folder' },
        { key: 'voice', label: 'Voice', icon: 'mic' },
    ]

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="ARSENAL"
                subtitle="YOUR SCRIPTURE LIBRARY"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ContextualTooltip
                    id="arsenal"
                    title="Your Verse Library"
                    message="Manage your verse collections here. Add verses manually, import from a PDF, or use the starter collection."
                />

                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.surface, borderColor: theme.border, borderWidth: isDark ? 0 : 1.5 }]}>
                        <View style={[styles.statsAccentBar, { backgroundColor: theme.accent }]} />
                        <View style={[styles.statIconBg, { backgroundColor: theme.accent + '15' }]}>
                            <FontAwesome5 name="book" size={18} color={theme.accent} />
                        </View>
                        <View>
                            <ThemedText variant="heading" style={[styles.statNumber, { color: theme.text }]}>{totalVerses}</ThemedText>
                            <ThemedText variant="caption" style={[styles.statLabel, { color: theme.textSecondary }]}>Total Verses</ThemedText>
                        </View>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.surface, borderColor: theme.border, borderWidth: isDark ? 0 : 1.5 }]}>
                        <View style={[styles.statsAccentBar, { backgroundColor: theme.success }]} />
                        <View style={[styles.statIconBg, { backgroundColor: theme.success + '15' }]}>
                            <FontAwesome name="folder" size={18} color={theme.success} />
                        </View>
                        <View>
                            <ThemedText variant="heading" style={[styles.statNumber, { color: theme.text }]}>{collections?.length || 0}</ThemedText>
                            <ThemedText variant="caption" style={[styles.statLabel, { color: theme.textSecondary }]}>Collections</ThemedText>
                        </View>
                    </View>
                </View>

                {/* Section Tabs - Pill Style */}
                <View style={[styles.sectionTabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.surface, borderColor: theme.border, borderWidth: isDark ? 0 : 1.5 }]}>
                    {sections.map((section) => (
                        <TouchableOpacity
                            key={section.key}
                            style={[
                                styles.sectionTab,
                                activeSection === section.key && styles.activeTab,
                                activeSection === section.key && { backgroundColor: isDark ? theme.accent : '#E2E8F0' }
                            ]}
                            onPress={() => setActiveSection(section.key)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={section.icon as any}
                                size={16}
                                color={activeSection === section.key ? (isDark ? theme.accentContrastText : '#1E293B') : (isDark ? '#94A3B8' : '#475569')}
                            />
                            <ThemedText
                                variant="caption"
                                style={[
                                    styles.tabText,
                                    activeSection === section.key && styles.activeTabText,
                                    { color: activeSection === section.key ? (isDark ? theme.accentContrastText : '#1E293B') : (isDark ? '#94A3B8' : '#475569') }
                                ]}
                            >
                                {section.label}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Collections Section */}
                {activeSection === 'collections' && (
                    <View style={styles.sectionContent}>
                        <View style={styles.collectionGroup}>
                            <View style={styles.groupHeader}>
                                <ThemedText variant="caption" style={styles.groupTitle}>
                                    COLLECTIONS
                                </ThemedText>
                                <View style={styles.addButtonGroup}>
                                    <TouchableOpacity
                                        style={[styles.addButton, { backgroundColor: theme.accent + '15' }]}
                                        onPress={() => setShowAddVerses(true)}
                                    >
                                        <Ionicons name="create-outline" size={16} color={theme.accent} />
                                        <ThemedText variant="caption" style={{ color: theme.accent, fontWeight: '600' }}>Manual</ThemedText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.addButton, { backgroundColor: theme.accent + '15' }]}
                                        onPress={() => setShowFileUploader(true)}
                                    >
                                        <Ionicons name="cloud-upload-outline" size={16} color={theme.accent} />
                                        <ThemedText variant="caption" style={{ color: theme.accent, fontWeight: '600' }}>Upload</ThemedText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {isLoading ? (
                                <SkeletonCollectionList />
                            ) : (collections?.length || 0) === 0 ? (
                                <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                                    <View style={[styles.emptyIconBg, { backgroundColor: theme.accent + '15' }]}>
                                        <Ionicons name="library-outline" size={32} color={theme.accent} />
                                    </View>
                                    <ThemedText variant="heading" style={styles.emptyTitle}>
                                        Start Your Collection
                                    </ThemedText>
                                    <ThemedText variant="body" style={styles.emptyText}>
                                        Build your personal scripture library by adding your first verse.
                                    </ThemedText>
                                    <View style={styles.emptyButtonGroup}>
                                        <TouchableOpacity
                                            style={[styles.emptyButton, { backgroundColor: theme.accent }]}
                                            onPress={() => setShowAddVerses(true)}
                                        >
                                            <Ionicons name="create-outline" size={16} color={theme.accentContrastText} />
                                            <Text style={[styles.emptyButtonText, { color: theme.accentContrastText }]}>Add Verse</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.emptyButtonSecondary, { borderColor: theme.accent }]}
                                            onPress={() => setShowFileUploader(true)}
                                        >
                                            <Ionicons name="document-text-outline" size={16} color={theme.accent} />
                                            <Text style={[styles.emptyButtonTextSecondary, { color: theme.accent }]}>Import PDF</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                (collections || []).map(collection => (
                                    <TouchableOpacity
                                        key={collection.id}
                                        style={[styles.collectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: isDark ? 0 : 1 }]}
                                        onPress={() => handleSelectCollection(collection)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.collectionIcon, { backgroundColor: `${theme.accent}15` }]}>
                                            <FontAwesome name={collection.isSystem ? 'star' : 'folder'} size={18} color={theme.accent} />
                                        </View>
                                        <View style={styles.collectionInfo}>
                                            <View style={styles.collectionNameRow}>
                                                <ThemedText variant="body" style={styles.collectionName}>{collection.name}</ThemedText>
                                                {collection.isSystem && (
                                                    <View style={[styles.systemBadge, { backgroundColor: theme.accent + '20' }]}>
                                                        <ThemedText variant="caption" style={[styles.systemBadgeText, { color: theme.accent }]}>SYSTEM</ThemedText>
                                                    </View>
                                                )}
                                            </View>
                                            <ThemedText variant="caption" style={styles.collectionCount}>
                                                {collection.isChapterBased && collection.chapters
                                                    ? `${collection.chapters.length} chapters · ${collection.scriptures?.length || 0} verses`
                                                    : `${collection.scriptures?.length || 0} verses`}
                                            </ThemedText>
                                        </View>
                                        <View style={[styles.chevronIcon, { backgroundColor: theme.accent + '10' }]}>
                                            <FontAwesome5 name="chevron-right" size={12} color={theme.textSecondary} />
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                )}

                {/* Voice Section */}
                {activeSection === 'voice' && (
                    <View style={styles.sectionContent}>
                        <VoiceLibrary isDark={isDark} theme={theme} />
                    </View>
                )}
            </ScrollView>

            {/* Modals */}
            {selectedCollection && (
                <CollectionDetailModal
                    isVisible={showCollectionDetail}
                    collection={selectedCollection}
                    onClose={() => {
                        console.log('🟡 [Arsenal] onClose called, clearing collection')
                        setShowCollectionDetail(false)
                        setSelectedCollection(null)
                    }}
                    onChapterNavigate={(collectionId, chapterId) => {
                        console.log('🟡 [Arsenal] onChapterNavigate called:', collectionId, chapterId)
                        setShowCollectionDetail(false)
                        useZustandStore.getState().startTraining('single', collectionId, chapterId)
                        router.push('/(tabs)/train')
                    }}
                />
            )}

                <FileUploader
                    isVisible={showFileUploader}
                    onClose={() => setShowFileUploader(false)}
                    onVersesExtracted={async (verses, targetCollectionId) => {
                        console.log('Extracted verses:', verses.length, 'for collection:', targetCollectionId)
                        if (verses.length > 0) {
                            try {
                                // 1. Add scriptures to global store
                                const addSuccess = await addScriptures(verses)
                                if (addSuccess && targetCollectionId) {
                                    // 2. Link them to the selected collection
                                    await addScripturesToCollection(targetCollectionId, verses.map(v => v.id))
                                }
                                Toast.missionSuccess(`${verses.length} verse${verses.length !== 1 ? 's' : ''} imported to arsenal`)
                            } catch (error) {
                                console.error('❌ Failed to persist extracted verses:', error)
                                Toast.missionFailed('Failed to save extracted verses to your arsenal')
                            }
                        }
                        setShowFileUploader(false)
                    }}
                />

            <AddVersesModal
                isVisible={showAddVerses}
                onClose={() => setShowAddVerses(false)}
                onVersesAdded={async (collectionId, verses) => {
                    console.log('Added verses:', verses.length, 'to collection:', collectionId)
                    // Note: AddVersesModal internally calls addScriptures and addScripturesToCollection
                    // However, we ensure the UI is updated by potentially refreshing data if needed
                    // For now, since it's using the same store, it should be automatic.
                    setShowAddVerses(false)
                }}
            />

            <LoadingOverlay visible={false} message="Loading..." />
        </ThemedContainer>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        gap: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    statsAccentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNumber: {
        fontSize: 20,
    },
    statLabel: {
        fontSize: 11,
        opacity: 0.6,
        marginTop: 2,
    },
    sectionTabs: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
        marginBottom: 20,
    },
    sectionTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    activeTab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.6,
    },
    activeTabText: {
        opacity: 1,
    },
    sectionContent: {
        marginBottom: 20,
    },
    collectionGroup: {
        marginBottom: 20,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    groupTitle: {
        fontSize: 11,
        letterSpacing: 1.2,
        opacity: 0.5,
        marginBottom: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    addButtonGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    collectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        marginBottom: 8,
    },
    collectionIcon: {
        width: 42,
        height: 42,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    collectionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    collectionNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    collectionName: {
        fontWeight: '600',
        fontSize: 15,
        flexShrink: 1,
    },
    systemBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    systemBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    collectionCount: {
        marginTop: 2,
        opacity: 0.5,
        fontSize: 12,
    },
    chevronIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        padding: 24,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 8,
    },
    emptyIconBg: {
        width: 72,
        height: 72,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyText: {
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    emptyButtonGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    emptyButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
    },
    emptyButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyButtonTextSecondary: {
        fontSize: 13,
        fontWeight: '600',
    },
    addCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
    },
    addIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addInfo: {
        flex: 1,
        marginLeft: 14,
    },
    addTitle: {
        fontWeight: '600',
        fontSize: 15,
    },
    addSubtitle: {
        marginTop: 2,
        opacity: 0.5,
        fontSize: 12,
    },
    comingSoonCard: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 16,
    },
    comingSoonIcon: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    comingSoonTitle: {
        marginBottom: 8,
        fontSize: 18,
    },
    comingSoonText: {
        textAlign: 'center',
        opacity: 0.6,
        lineHeight: 22,
    },
})
