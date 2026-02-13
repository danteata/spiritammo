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

const { width } = Dimensions.get('window')

type ArsenalSection = 'collections' | 'voice' | 'avatar'

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

    const systemCollections = collections?.filter(c => c.isSystem) || []
    const customCollections = collections?.filter(c => !c.isSystem) || []
    const totalVerses = scriptures?.length || 0

    const sections: { key: ArsenalSection; label: string; icon: string }[] = [
        { key: 'collections', label: 'Collections', icon: 'folder' },
        { key: 'voice', label: 'Voice', icon: 'mic' },
        { key: 'avatar', label: 'Avatar', icon: 'person' },
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
                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <View style={[styles.statIconBg, { backgroundColor: theme.accent + '15' }]}>
                            <FontAwesome5 name="book" size={18} color={theme.accent} />
                        </View>
                        <View>
                            <ThemedText variant="heading" style={styles.statNumber}>{totalVerses}</ThemedText>
                            <ThemedText variant="caption" style={styles.statLabel}>Total Verses</ThemedText>
                        </View>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <View style={[styles.statIconBg, { backgroundColor: '#22C55E' + '15' }]}>
                            <FontAwesome name="folder" size={18} color="#22C55E" />
                        </View>
                        <View>
                            <ThemedText variant="heading" style={styles.statNumber}>{collections?.length || 0}</ThemedText>
                            <ThemedText variant="caption" style={styles.statLabel}>Collections</ThemedText>
                        </View>
                    </View>
                </View>

                {/* Section Tabs - Pill Style */}
                <View style={[styles.sectionTabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    {sections.map((section) => (
                        <TouchableOpacity
                            key={section.key}
                            style={[
                                styles.sectionTab,
                                activeSection === section.key && styles.activeTab,
                                activeSection === section.key && { backgroundColor: theme.accent }
                            ]}
                            onPress={() => setActiveSection(section.key)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={section.icon as any}
                                size={16}
                                color={activeSection === section.key ? '#FFFFFF' : theme.textSecondary}
                            />
                            <ThemedText
                                variant="caption"
                                style={[
                                    styles.tabText,
                                    activeSection === section.key && styles.activeTabText
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
                        {/* System Collections */}
                        {systemCollections.length > 0 && (
                            <View style={styles.collectionGroup}>
                                <ThemedText variant="caption" style={styles.groupTitle}>
                                    SYSTEM COLLECTIONS
                                </ThemedText>
                                {systemCollections.map(collection => (
                                    <TouchableOpacity
                                        key={collection.id}
                                        style={[styles.collectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
                                        onPress={() => handleSelectCollection(collection)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.collectionIcon, { backgroundColor: theme.accent + '15' }]}>
                                            <FontAwesome name="star" size={18} color={theme.accent} />
                                        </View>
                                        <View style={styles.collectionInfo}>
                                            <ThemedText variant="body" style={styles.collectionName}>{collection.name}</ThemedText>
                                            <ThemedText variant="caption" style={styles.collectionCount}>
                                                {collection.scriptures?.length || 0} verses
                                            </ThemedText>
                                        </View>
                                        <View style={[styles.chevronIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                            <FontAwesome5 name="chevron-right" size={12} color={theme.textSecondary} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Custom Collections */}
                        <View style={styles.collectionGroup}>
                            <View style={styles.groupHeader}>
                                <ThemedText variant="caption" style={styles.groupTitle}>
                                    MY COLLECTIONS
                                </ThemedText>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: theme.accent + '15' }]}
                                    onPress={() => setShowFileUploader(true)}
                                >
                                    <Ionicons name="add" size={16} color={theme.accent} />
                                    <ThemedText variant="caption" style={{ color: theme.accent, fontWeight: '600' }}>Add</ThemedText>
                                </TouchableOpacity>
                            </View>
                            {customCollections.length === 0 ? (
                                <View style={[styles.emptyState, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                                    <View style={[styles.emptyIconBg, { backgroundColor: theme.accent + '10' }]}>
                                        <Ionicons name="folder-outline" size={32} color={theme.accent} />
                                    </View>
                                    <ThemedText variant="body" style={styles.emptyText}>
                                        No custom collections yet
                                    </ThemedText>
                                    <ThemedText variant="caption" style={styles.emptySubtext}>
                                        Start building your personal scripture library
                                    </ThemedText>
                                    <TouchableOpacity
                                        style={[styles.emptyButton, { backgroundColor: theme.accent }]}
                                        onPress={() => setShowFileUploader(true)}
                                    >
                                        <Ionicons name="add" size={18} color="#FFFFFF" />
                                        <Text style={styles.emptyButtonText}>Add Your First Verse</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                customCollections.map(collection => (
                                    <TouchableOpacity
                                        key={collection.id}
                                        style={[styles.collectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
                                        onPress={() => handleSelectCollection(collection)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.collectionIcon, { backgroundColor: '#22C55E' + '15' }]}>
                                            <FontAwesome name="folder" size={18} color="#22C55E" />
                                        </View>
                                        <View style={styles.collectionInfo}>
                                            <ThemedText variant="body" style={styles.collectionName}>{collection.name}</ThemedText>
                                            <ThemedText variant="caption" style={styles.collectionCount}>
                                                {collection.scriptures?.length || 0} verses
                                            </ThemedText>
                                        </View>
                                        <View style={[styles.chevronIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
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
                        <View style={[styles.comingSoonCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                            <View style={[styles.comingSoonIcon, { backgroundColor: theme.accent + '15' }]}>
                                <Ionicons name="mic-circle" size={40} color={theme.accent} />
                            </View>
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
                        <View style={[styles.avatarCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                            <View style={styles.avatarContainer}>
                                <SoldierAvatar size="large" showStats={true} />
                            </View>
                            <TouchableOpacity
                                style={[styles.avatarButton, { backgroundColor: theme.accent }]}
                                onPress={() => router.push('/settings' as any)}
                            >
                                <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.avatarButtonText}>Customize Avatar</Text>
                            </TouchableOpacity>
                        </View>
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
        borderRadius: 16,
        gap: 12,
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
        borderRadius: 14,
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
        color: '#FFFFFF',
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
    collectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
    },
    collectionIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    collectionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    collectionName: {
        fontWeight: '600',
        fontSize: 15,
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
        alignItems: 'center',
        padding: 28,
        borderRadius: 16,
    },
    emptyIconBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontWeight: '600',
        marginBottom: 4,
    },
    emptySubtext: {
        opacity: 0.5,
        marginBottom: 20,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
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
    avatarCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 16,
    },
    avatarContainer: {
        marginBottom: 20,
    },
    avatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    avatarButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
})
