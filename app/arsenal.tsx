import React, { useState } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Text,
    Alert,
} from 'react-native'
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import AddVersesModal from '@/components/AddVersesModal'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import SoldierAvatar from '@/components/SoldierAvatar'

type ArsenalSection = 'collections' | 'add' | 'voice' | 'avatar'

export default function ArsenalScreen() {
    const {
        isDark,
        collections,
        scriptures,
        getScripturesByCollection,
        theme,
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
    const [showAvatar, setShowAvatar] = useState(false)

    // Handle deep link for import
    React.useEffect(() => {
        if (action === 'import') {
            setActiveSection('add')
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

    const systemCollections = collections?.filter(c => c.isSystem) || []
    const customCollections = collections?.filter(c => !c.isSystem) || []
    const totalVerses = scriptures?.length || 0

    const styles = getStyles(theme, isDark)

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
                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="book" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{totalVerses}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Total Verses</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome name="folder" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{collections?.length || 0}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Collections</ThemedText>
                    </View>
                </View>

                {/* Section Tabs */}
                <View style={styles.sectionTabs}>
                    <TouchableOpacity
                        style={[styles.sectionTab, activeSection === 'collections' && styles.activeTab]}
                        onPress={() => setActiveSection('collections')}
                    >
                        <Ionicons
                            name="folder"
                            size={18}
                            color={activeSection === 'collections' ? theme.accent : theme.textSecondary}
                        />
                        <ThemedText variant="caption" style={[styles.tabText, activeSection === 'collections' && styles.activeTabText]}>
                            Collections
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sectionTab, activeSection === 'add' && styles.activeTab]}
                        onPress={() => setActiveSection('add')}
                    >
                        <Ionicons
                            name="add-circle"
                            size={18}
                            color={activeSection === 'add' ? theme.accent : theme.textSecondary}
                        />
                        <ThemedText variant="caption" style={[styles.tabText, activeSection === 'add' && styles.activeTabText]}>
                            Add Content
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sectionTab, activeSection === 'voice' && styles.activeTab]}
                        onPress={() => setActiveSection('voice')}
                    >
                        <Ionicons
                            name="mic"
                            size={18}
                            color={activeSection === 'voice' ? theme.accent : theme.textSecondary}
                        />
                        <ThemedText variant="caption" style={[styles.tabText, activeSection === 'voice' && styles.activeTabText]}>
                            Voice
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sectionTab, activeSection === 'avatar' && styles.activeTab]}
                        onPress={() => setActiveSection('avatar')}
                    >
                        <Ionicons
                            name="person"
                            size={18}
                            color={activeSection === 'avatar' ? theme.accent : theme.textSecondary}
                        />
                        <ThemedText variant="caption" style={[styles.tabText, activeSection === 'avatar' && styles.activeTabText]}>
                            Avatar
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Collections Section */}
                {activeSection === 'collections' && (
                    <View style={styles.sectionContent}>
                        {/* System Collections */}
                        {systemCollections.length > 0 && (
                            <View style={styles.collectionGroup}>
                                <ThemedText variant="caption" style={styles.groupTitle}>
                                    SYSTEM COLLECTIONS
                                </ThemedText>
                                {systemCollections.map(collection => (
                                    <TouchableOpacity
                                        key={collection.id}
                                        style={styles.collectionCard}
                                        onPress={() => handleSelectCollection(collection)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.collectionIcon, { backgroundColor: theme.accent + '20' }]}>
                                            <FontAwesome name="star" size={20} color={theme.accent} />
                                        </View>
                                        <View style={styles.collectionInfo}>
                                            <ThemedText variant="body" style={styles.collectionName}>{collection.name}</ThemedText>
                                            <ThemedText variant="caption" style={styles.collectionCount}>
                                                {collection.scriptures?.length || 0} verses
                                            </ThemedText>
                                        </View>
                                        <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Custom Collections */}
                        <View style={styles.collectionGroup}>
                            <ThemedText variant="caption" style={styles.groupTitle}>
                                MY COLLECTIONS
                            </ThemedText>
                            {customCollections.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="folder-outline" size={40} color={theme.textSecondary} />
                                    <ThemedText variant="body" style={styles.emptyText}>
                                        No custom collections yet
                                    </ThemedText>
                                    <TouchableOpacity
                                        style={[styles.emptyButton, { backgroundColor: theme.accent + '20' }]}
                                        onPress={() => setActiveSection('add')}
                                    >
                                        <ThemedText variant="caption" style={[styles.emptyButtonText, { color: theme.accent }]}>
                                            Add Your First Verse
                                        </ThemedText>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                customCollections.map(collection => (
                                    <TouchableOpacity
                                        key={collection.id}
                                        style={styles.collectionCard}
                                        onPress={() => handleSelectCollection(collection)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.collectionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                            <FontAwesome name="folder" size={20} color={theme.textSecondary} />
                                        </View>
                                        <View style={styles.collectionInfo}>
                                            <ThemedText variant="body" style={styles.collectionName}>{collection.name}</ThemedText>
                                            <ThemedText variant="caption" style={styles.collectionCount}>
                                                {collection.scriptures?.length || 0} verses
                                            </ThemedText>
                                        </View>
                                        <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                )}

                {/* Add Content Section */}
                {activeSection === 'add' && (
                    <View style={styles.sectionContent}>
                        <TouchableOpacity
                            style={styles.addCard}
                            onPress={() => handleAddContent('pdf')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.addIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)' }]}>
                                <Ionicons name="document-text" size={28} color="#FF6B35" />
                            </View>
                            <View style={styles.addInfo}>
                                <ThemedText variant="body" style={styles.addTitle}>Import from PDF</ThemedText>
                                <ThemedText variant="caption" style={styles.addSubtitle}>
                                    Extract verses from PDF or EPUB files
                                </ThemedText>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addCard}
                            onPress={() => handleAddContent('verse')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.addIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                                <Ionicons name="add-circle" size={28} color="#22C55E" />
                            </View>
                            <View style={styles.addInfo}>
                                <ThemedText variant="body" style={styles.addTitle}>Add Single Verse</ThemedText>
                                <ThemedText variant="caption" style={styles.addSubtitle}>
                                    Manually add a verse to your collection
                                </ThemedText>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addCard}
                            onPress={() => handleAddContent('browse')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.addIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                <Ionicons name="book" size={28} color="#3B82F6" />
                            </View>
                            <View style={styles.addInfo}>
                                <ThemedText variant="body" style={styles.addTitle}>Browse by Book</ThemedText>
                                <ThemedText variant="caption" style={styles.addSubtitle}>
                                    Explore verses by book and chapter
                                </ThemedText>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Voice Section */}
                {activeSection === 'voice' && (
                    <View style={styles.sectionContent}>
                        <View style={styles.comingSoonCard}>
                            <Ionicons name="mic-circle" size={48} color={theme.textSecondary} />
                            <ThemedText variant="heading" style={styles.comingSoonTitle}>Voice Library</ThemedText>
                            <ThemedText variant="body" style={styles.comingSoonText}>
                                Your voice recordings will appear here. Record verses during practice to build your audio library.
                            </ThemedText>
                        </View>
                    </View>
                )}

                {/* Avatar Section */}
                {activeSection === 'avatar' && (
                    <View style={styles.sectionContent}>
                        <View style={styles.avatarContainer}>
                            <SoldierAvatar size="large" showStats={true} />
                        </View>
                        <TouchableOpacity
                            style={[styles.avatarButton, { backgroundColor: theme.accent + '20' }]}
                            onPress={() => router.push('/(tabs)/settings' as any)}
                        >
                            <Ionicons name="settings-outline" size={20} color={theme.accent} />
                            <ThemedText variant="body" style={[styles.avatarButtonText, { color: theme.accent }]}>
                                Customize Avatar
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Modals */}
            {selectedCollection && (
                <CollectionDetailModal
                    isVisible={showCollectionDetail}
                    collection={selectedCollection}
                    onClose={() => {
                        setShowCollectionDetail(false)
                        setSelectedCollection(null)
                    }}
                />
            )}

            <FileUploader
                isVisible={showFileUploader}
                onClose={() => setShowFileUploader(false)}
                onVersesExtracted={(verses, targetCollectionId) => {
                    console.log('Extracted verses:', verses.length, 'for collection:', targetCollectionId)
                    setShowFileUploader(false)
                }}
            />

            <AddVersesModal
                isVisible={showAddVerses}
                onClose={() => setShowAddVerses(false)}
                onVersesAdded={(collectionId, verses) => {
                    console.log('Added verses:', verses.length, 'to collection:', collectionId)
                    setShowAddVerses(false)
                }}
            />

            <LoadingOverlay visible={false} message="Loading..." />
        </ThemedContainer>
    )
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
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
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    statNumber: {
        fontSize: 22,
        marginTop: 8,
    },
    statLabel: {
        marginTop: 4,
        opacity: 0.7,
    },
    sectionTabs: {
        flexDirection: 'row',
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    sectionTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 4,
    },
    activeTab: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    tabText: {
        opacity: 0.7,
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
    groupTitle: {
        marginBottom: 12,
        opacity: 0.6,
        letterSpacing: 1,
    },
    collectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    collectionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    collectionInfo: {
        flex: 1,
    },
    collectionName: {
        fontWeight: '500',
    },
    collectionCount: {
        marginTop: 2,
        opacity: 0.6,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        backgroundColor: theme.surface,
        borderRadius: 12,
    },
    emptyText: {
        marginTop: 12,
        opacity: 0.6,
    },
    emptyButton: {
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    emptyButtonText: {
        fontWeight: '500',
    },
    addCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    addIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    addInfo: {
        flex: 1,
    },
    addTitle: {
        fontWeight: '500',
    },
    addSubtitle: {
        marginTop: 2,
        opacity: 0.6,
    },
    comingSoonCard: {
        alignItems: 'center',
        backgroundColor: theme.surface,
        padding: 32,
        borderRadius: 16,
    },
    comingSoonTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    comingSoonText: {
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 22,
    },
    avatarContainer: {
        alignItems: 'center',
        padding: 20,
    },
    avatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    avatarButtonText: {
        fontWeight: '500',
    },
})
