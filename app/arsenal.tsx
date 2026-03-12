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
import { VoiceLibrary } from '@/components/VoiceLibrary'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import AddVersesModal from '@/components/AddVersesModal'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

const { width } = Dimensions.get('window')

type ArsenalSection = 'collections' | 'voice'

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
                                color={activeSection === section.key ? (theme.accentContrastText || '#FFFFFF') : theme.textSecondary}
                            />
                            <ThemedText
                                variant="caption"
                                style={[
                                    styles.tabText,
                                    activeSection === section.key && { color: theme.accentContrastText || '#FFFFFF' }
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
                            {customCollections.length === 0 ? (
                                <View style={[styles.emptyState, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
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
                                            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                                            <Text style={styles.emptyButtonText}>Add Verse</Text>
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
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginVertical: 8,
    },
    emptyIconBg: {
        width: 72,
        height: 72,
        borderRadius: 24,
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
        color: '#FFFFFF',
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
