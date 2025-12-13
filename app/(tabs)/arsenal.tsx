import React, { useState } from 'react'
import {
    StyleSheet,
    View,
    Alert,
    Text,
    TouchableOpacity,
} from 'react-native'
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { EquipmentSlot } from '@/types/avatar'
import {
    GARRISON_THEME,
} from '@/constants/colors'
import { ThemedContainer } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import BookScripturesModal from '@/components/BookScripturesModal'
import AddVersesModal from '@/components/AddVersesModal'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { errorHandler } from '@/services/errorHandler'
import { getItemById } from '@/constants/avatarItems'

import { CollectionChapterService } from '@/services/collectionChapters'

// Sub-section types
import { ArsenalTabSelector } from '@/components/arsenal/ArsenalTabSelector'
import { ArsenalEquipment } from '@/components/arsenal/ArsenalEquipment'
import { ArsenalAmmunition } from '@/components/arsenal/ArsenalAmmunition'
import { AccessDeniedModal } from '@/components/AccessDeniedModal'
import { VoiceLibrary } from '@/components/VoiceLibrary'

type ArsenalTab = 'ammunition' | 'equipment' | 'voice'

export default function ArsenalScreen() {
    const {
        isDark,
        avatarInventory,
        purchaseItem,
        equipItem,
        collections,
        books,
        scriptures,
        getScripturesByCollection,
        addCollection,
        addScriptures,
        addScripturesToCollection,
        theme,
    } = useAppStore()
    const styles = getStyles(theme)
    const router = useRouter()

    // Main tab state
    const [activeTab, setActiveTab] = useState<ArsenalTab>('equipment')

    // Equipment-specific state
    const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // Ammunition-specific state
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [showFileUploader, setShowFileUploader] = useState(false)
    const [showCollectionDetail, setShowCollectionDetail] = useState(false)
    const [filterTab, setFilterTab] = useState<'books' | 'chapters'>('books')
    const [showBookScriptures, setShowBookScriptures] = useState(false)
    const [bookScriptures, setBookScriptures] = useState<Scripture[]>([])
    const [selectedBookName, setSelectedBookName] = useState<string>('')
    const [showAddVerses, setShowAddVerses] = useState(false)

    // Access Denied Modal State
    const [deniedModal, setDeniedModal] = useState({
        visible: false,
        type: 'rank' as 'rank' | 'funds',
        requiredRank: '',
        cost: 0,
        itemName: ''
    })
    const [isImporting, setIsImporting] = useState(false)

    // Equipment helpers
    const getRankValue = (rankName: string): number => {
        const rankHierarchy = { 'RECRUIT': 1, 'PRIVATE': 2, 'CORPORAL': 3, 'SERGEANT': 4, 'SARGEANT': 4 }
        return rankHierarchy[rankName as keyof typeof rankHierarchy] || 0
    }

    const getUserRankValue = () => getRankValue('PRIVATE')
    const canUnlockItem = (itemReqRank: string) => getRankValue(itemReqRank) <= getUserRankValue()
    const isItemOwned = (itemId: string) => avatarInventory?.ownedItems.includes(itemId) || false
    const isItemEquipped = (itemId: string) => selectedSlot ? avatarInventory.equippedItems[selectedSlot] === itemId : false

    // Equipment handlers
    const handleItemPress = async (itemId: string) => {
        const item = getItemById(itemId)
        if (!item) return

        setIsProcessing(true)
        try {
            if (!canUnlockItem(item.reqRank)) {
                setDeniedModal({
                    visible: true,
                    type: 'rank',
                    requiredRank: (item.reqRank as any).toString().replace('_', ' '), // Simple format
                    cost: 0,
                    itemName: item.name
                })
                return
            }

            if (!isItemOwned(itemId)) {
                const purchased = await purchaseItem(itemId)
                if (!purchased) {
                    setDeniedModal({
                        visible: true,
                        type: 'funds',
                        requiredRank: '',
                        cost: item.cost,
                        itemName: item.name
                    })
                }
            } else if (selectedSlot && !isItemEquipped(itemId)) {
                await equipItem(selectedSlot, itemId)
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    // Ammunition handlers (copied from armory.tsx)
    const handleSelectCollection = (collection: Collection | null) => {
        console.log('Selecting collection:', collection?.name || 'back to collections')
        setSelectedCollection(collection)
        if (collection) {
            setFilterTab('books')
        }
    }

    const handleShowCollectionDetail = (collection: Collection) => {
        setSelectedCollection(collection)
        setShowCollectionDetail(true)
    }

    const handleBookDistributionTap = (bookName: string) => {
        if (!selectedCollection) return

        const scriptures = getScripturesByCollection(selectedCollection.id)
        const bookScriptures = scriptures.filter((s) => s.book === bookName)

        if (bookScriptures.length > 0) {
            setBookScriptures(bookScriptures)
            setSelectedBookName(bookName)
            setShowBookScriptures(true)
        }
    }

    const handleChapterDistributionTap = (chapterName: string) => {
        if (!selectedCollection) return

        const chapter = selectedCollection.chapters?.find(
            (c) => c.name === chapterName
        )
        if (chapter) {
            const chapterScriptures = scriptures.filter((s) =>
                chapter.scriptures.includes(s.id)
            )

            if (chapterScriptures.length > 0) {
                setBookScriptures(chapterScriptures)
                setSelectedBookName(chapterName)
                setShowBookScriptures(true)
            }
        }
    }

    const handleDefaultBookTap = (bookName: string) => {
        const bookScriptures = scriptures.filter((s) => s.book === bookName)

        if (bookScriptures.length > 0) {
            setBookScriptures(bookScriptures)
            setSelectedBookName(bookName)
            setShowBookScriptures(true)
        }
    }

    const handleVersesExtracted = async (extractedVerses: Scripture[], targetCollectionId?: string) => {
        if (extractedVerses.length === 0) {
            Alert.alert('No Ammunition', 'No rounds were extracted from the file.')
            return
        }

        try {
            setIsImporting(true)

            await addScriptures(extractedVerses)

            if (targetCollectionId) {
                await addScripturesToCollection(targetCollectionId, extractedVerses.map(v => v.id))
                errorHandler.showSuccess(
                    `Deployed ${extractedVerses.length} rounds to arsenal successfully!`,
                    'Ammunition Loaded'
                )
                return
            }

            const analysis = CollectionChapterService.analyzeScripturesForChapters(extractedVerses)

            let newCollection: Collection = {
                id: `imported_${Date.now()} `,
                name: analysis.sourceBook
                    ? `${analysis.sourceBook} Collection`
                    : `Imported Collection ${new Date().toLocaleDateString()} `,
                description: `${extractedVerses.length} verses imported from file`,
                scriptures: extractedVerses.map((v) => v.id),
                createdAt: new Date().toISOString(),
                tags: ['imported', 'file-upload'],
            }

            if (analysis.canBeChapterBased) {
                Alert.alert(
                    'Chapter Organization Available',
                    `This collection can be organized by chapters(${analysis.stats.totalChapters
                    } chapters from ${analysis.stats.totalBooks} book${analysis.stats.totalBooks > 1 ? 's' : ''
                    }).Would you like to enable chapter - based organization ? `,
                    [
                        {
                            text: 'Simple Collection',
                            onPress: async () => {
                                await addCollection(newCollection)
                                errorHandler.showSuccess(
                                    `Arsenal "${newCollection.name}" established with ${extractedVerses.length} rounds.`,
                                    'Arsenal Created'
                                )
                            },
                        },
                        {
                            text: 'Chapter-Based',
                            onPress: async () => {
                                try {
                                    const chapterBasedCollection =
                                        await CollectionChapterService.convertToChapterBased(
                                            newCollection,
                                            extractedVerses
                                        )
                                    await addCollection(chapterBasedCollection)
                                    errorHandler.showSuccess(
                                        `Chapter - based arsenal "${chapterBasedCollection.name}" established with ${analysis.stats.totalChapters} chapters.`,
                                        'Arsenal Created'
                                    )
                                } catch (error) {
                                    console.error(
                                        'Failed to create chapter-based collection:',
                                        error
                                    )
                                    await addCollection(newCollection)
                                    errorHandler.showSuccess(
                                        `Arsenal "${newCollection.name}" established with ${extractedVerses.length} rounds.`,
                                        'Arsenal Created'
                                    )
                                }
                            },
                        },
                    ]
                )
            } else {
                await addCollection(newCollection)
                errorHandler.showSuccess(
                    `Arsenal "${newCollection.name}" established with ${extractedVerses.length} rounds.`,
                    'Arsenal Created'
                )
            }
        } catch (error) {
            errorHandler.handleError(error, 'Extraction Failed')
        } finally {
            setIsImporting(false)
            setShowFileUploader(false)
            setShowAddVerses(false)
        }
    }




    return (
        <ThemedContainer style={styles.container}>
            {/* Global Arsenal Header */}
            <ScreenHeader
                title="ARSENAL"
                subtitle={activeTab === 'equipment' ? 'EQUIPMENT BAY' : activeTab === 'voice' ? 'VOICE LIBRARY' : 'AMMUNITION BANK'}
                rightAction={
                    activeTab === 'ammunition' ? (
                        <View style={styles.headerButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                ]}
                                onPress={() => setShowAddVerses(true)}
                                testID="add-verses-button"
                                accessibilityRole="button"
                                accessibilityLabel="Add Verses"
                            >
                                <FontAwesome name="plus" size={14} color={isDark ? "white" : "black"} />
                                <Text style={[styles.actionButtonText, { color: isDark ? "white" : "black" }]}>ADD</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                ]}
                                onPress={() => setShowFileUploader(true)}
                                testID="upload-file-button"
                                accessibilityRole="button"
                                accessibilityLabel="Import File"
                            >
                                <FontAwesome name="download" size={14} color={isDark ? "white" : "black"} />
                                <Text style={[styles.actionButtonText, { color: isDark ? "white" : "black" }]}>IMPORT</Text>
                            </TouchableOpacity>
                        </View>
                    ) : activeTab === 'voice' ? null : (
                        <View style={styles.equipmentHeaderActions}>
                            <View style={styles.vpChip}>
                                <FontAwesome5 name="coins" size={14} color="#FFD700" />
                                <Text style={[styles.vpText, { color: 'white' }]}>
                                    {avatarInventory?.valorPoints || 0} VP
                                </Text>
                            </View>
                        </View>
                    )
                }
            />

            {/* Tab Selector */}
            <ArsenalTabSelector
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Content based on active tab */}
            <View style={styles.mainContent}>
                {activeTab === 'equipment' ? (
                    <ArsenalEquipment
                        selectedSlot={selectedSlot}
                        onSlotPress={setSelectedSlot}
                        onItemPress={handleItemPress}
                        avatarInventory={avatarInventory}
                        isDark={isDark}
                        theme={theme}
                    />
                ) : activeTab === 'voice' ? (
                    <VoiceLibrary isDark={isDark} theme={theme} />
                ) : (
                    <ArsenalAmmunition
                        filterTab={filterTab}
                        setFilterTab={setFilterTab}
                        collections={collections}
                        books={books.map(b => b.name)}
                        scriptures={scriptures}
                        selectedCollection={selectedCollection}
                        onSelectCollection={handleSelectCollection}
                        onShowCollectionDetail={handleShowCollectionDetail}
                        onBookDistributionTap={handleBookDistributionTap}
                        onChapterDistributionTap={handleChapterDistributionTap}
                        onDefaultBookTap={handleDefaultBookTap}
                        onAddCollection={() => setShowAddVerses(true)}
                        isDark={isDark}
                        theme={theme}
                    />
                )}
            </View>

            {/* Modals */}
            {/* New Access Denied Modal */}
            <AccessDeniedModal
                visible={deniedModal.visible}
                onClose={() => setDeniedModal(prev => ({ ...prev, visible: false }))}
                type={deniedModal.type}
                requiredRank={deniedModal.requiredRank}
                cost={deniedModal.cost}
                itemName={deniedModal.itemName}
                isDark={isDark}
                theme={theme}
            />

            {/* Existing File Uploader Modal */}
            <FileUploader
                isVisible={showFileUploader}
                onClose={() => setShowFileUploader(false)}
                onVersesExtracted={handleVersesExtracted}
            />
            {
                selectedCollection && (
                    <CollectionDetailModal
                        collection={selectedCollection}
                        isVisible={showCollectionDetail}
                        onClose={() => setShowCollectionDetail(false)}
                    />
                )
            }
            <BookScripturesModal
                isVisible={showBookScriptures}
                onClose={() => setShowBookScriptures(false)}
                scriptures={bookScriptures}
                bookName={selectedBookName}
            />
            <AddVersesModal
                isVisible={showAddVerses}
                onClose={() => setShowAddVerses(false)}
                onVersesAdded={(collectionId, verses) => {
                    console.log(`Added ${verses.length} verses`);
                }}
            />

            {/* Loading Overlays */}
            <LoadingOverlay visible={isProcessing} message="Processing..." />
            <LoadingOverlay visible={isImporting} message="Deploying ammunition to arsenal..." />
        </ThemedContainer>
    )
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#073B3A',
    },
    tabSelector: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 0, // Remove gap for seamless look
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        gap: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeMainTab: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)', // Tinted background instead of solid gold
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 0,
    },
    tabButtonText: {
        fontSize: 12, // Slightly smaller, more tech
        fontWeight: '800',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    mainContent: {
        flex: 1,
    },

    // Equipment styles (from barracks)
    equipmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 0,
    },
    equipmentHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    equipmentTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    vpChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    vpText: {
        fontSize: 14,
        fontWeight: '600',
    },
    slotButton: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    selectedSlot: {
        // Handled by inner elements
    },
    glowRing: {
        position: 'absolute',
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        borderColor: '#FFD700',
        opacity: 0.5,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        top: -5,
        left: -5,
    },
    slotButtonInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0f172a', // Dark Navy
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
    },
    slotLabel: {
        position: 'absolute',
        top: 50,
        backgroundColor: 'rgba(15,23,42,0.95)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        minWidth: 65,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headSlotLabel: {
        top: -30, // Position above instead of below for head slot
    },
    selectedSlotLabel: {
        backgroundColor: 'rgba(255,215,0,0.15)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,215,0,0.4)',
    },
    slotLabelText: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    itemsSection: {
        flex: 0.75,
        marginTop: 22,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    itemsScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'space-between',
    },
    itemCard: {
        width: '47%',
        aspectRatio: 1,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        gap: 10,
        position: 'relative',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    equippedCard: {
        borderWidth: 2,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    itemImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginTop: 4,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    placeholderIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    lockBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#666',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 35,
        alignItems: 'center',
    },
    lockText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    priceBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    priceText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Ammunition styles (from armory)
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    headerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    collectionsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    list: {
        flex: 1,
    },
    collectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 2,
        marginBottom: 4, // Reduced from 6
        minHeight: 56,   // Reduced from 72
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    collectionMainArea: {
        flex: 1,
        paddingHorizontal: 12, // Reduced from 16
        paddingVertical: 6,    // Reduced from 10
    },
    collectionInfo: {
        flex: 1,
        gap: 0,
    },
    collectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0, // Removed margin
    },
    collectionName: {
        fontSize: 16, // Reduced from 18
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        flex: 1,
    },
    collectionDescription: {
        fontSize: 10,
        marginBottom: 2, // Reduced from 4
        opacity: 0.7,
    },
    chapterBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    chapterBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    collectionMeta: {
        flexDirection: 'row',
        gap: 12,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    collectionArrow: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.05)',
    },
    arrowCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    bookIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bookInfo: {
        flex: 1,
    },
    bookName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    progressBarContainer: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1.5,
        width: '60%',
    },
    progressBar: {
        height: '100%',
        borderRadius: 1.5,
    },
    bookStat: {
        alignItems: 'flex-end',
    },
    bookCount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    bookLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#888',
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 200,
    },
    listGradient: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    filterTabs: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        gap: 8,
    },
    activeFilterTab: {
        backgroundColor: theme.accent,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    distributionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    distributionBook: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    distributionCount: {
        alignItems: 'flex-end',
    },
    countText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    countLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        fontStyle: 'italic',
    },
    emptyStateContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptySubtext: {
        textAlign: 'center',
        marginTop: 8,
        fontSize: 12,
    },
    avatarSection: {
        flex: 0.25,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        marginTop: 40,
    },
    avatarContainer: {
        position: 'relative',
        width: 280,
        height: 320,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarRing: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        top: 20,
    },
    avatarRingInner: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)',
        borderStyle: 'dashed',
        top: 50,
    },
    avatarGrid: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.1,
    },
})
