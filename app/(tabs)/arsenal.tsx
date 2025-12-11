// Combined Arsenal Screen - Equipment & Ammunition Management

import React, { useState } from 'react'
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
    Pressable,
} from 'react-native'
import { FontAwesome, Feather, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { EquipmentSlot } from '@/types/avatar'
import {
    COLORS,
    GRADIENTS,
    MILITARY_TYPOGRAPHY,
    GARRISON_THEME,
} from '@/constants/colors'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import BookScripturesModal from '@/components/BookScripturesModal'
import AddVersesModal from '@/components/AddVersesModal'
import ScreenHeader from '@/components/ScreenHeader'
import SoldierAvatar from '@/components/SoldierAvatar'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { errorHandler } from '@/services/errorHandler'
import { getItemsBySlot, getItemById } from '@/constants/avatarItems'

import { CollectionChapterService } from '@/services/collectionChapters'

// Sub-section types
type ArsenalTab = 'ammunition' | 'equipment'

type SlotButtonProps = {
    slot: { id: string; icon: string; label: string }
    position: { top: number; left: number }
    isSelected: boolean
    onPress: () => void
    labelPosition: 'above' | 'below'
}

// Dedicated SlotButton component with configurable label positioning
const SlotButton: React.FC<SlotButtonProps> = ({
    slot,
    position,
    isSelected,
    onPress,
    labelPosition
}) => {
    const { theme } = useAppStore()
    const styles = getStyles(theme)

    return (
        <TouchableOpacity
            style={[
                styles.slotButton,
                position,
                isSelected && styles.selectedSlot,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Outer glow ring for selected state */}
            {isSelected && <View style={styles.glowRing} />}

            {/* Button content */}
            <View style={[
                styles.slotButtonInner,
                isSelected && {
                    backgroundColor: 'rgba(255,215,0,0.25)',
                    borderColor: '#FFD700',
                    borderWidth: 3,
                    shadowColor: '#FFD700',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    elevation: 10,
                }
            ]}>
                <FontAwesome5
                    name={slot.icon as any}
                    size={18}
                    color={isSelected ? '#FFD700' : 'rgba(255,255,255,0.8)'}
                />
            </View>

            {/* Label positioned based on prop */}
            <View style={[
                styles.slotLabel,
                isSelected && styles.selectedSlotLabel,
                labelPosition === 'above' && styles.headSlotLabel
            ]}>
                <Text style={[
                    styles.slotLabelText,
                    { color: isSelected ? '#FFD700' : 'rgba(255,255,255,0.6)' }
                ]}>
                    {slot.label}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

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

    // Equipment slot positioning
    const SLOT_DATA = [
        { id: 'head', icon: 'hard-hat', label: 'HEAD' },
        { id: 'body', icon: 'shield-alt', label: 'BODY' },
        { id: 'legs', icon: 'shoe-prints', label: 'LEGS' },
        { id: 'primary', icon: 'archway', label: 'WEAPON' },
        { id: 'background', icon: 'map-marked-alt', label: 'SCENE' }
    ] as const

    const getSlotPosition = (slotId: EquipmentSlot) => {
        const centerX = 140; // Center relative to container
        const centerY = 140;
        const radius = 105; // Distance from center to buttons

        switch (slotId) {
            case 'head':
                // Top center (12 o'clock)
                return {
                    top: centerY - radius,
                    left: centerX - 22.5,
                }
            case 'body':
                // Left center (9 o'clock)
                return {
                    top: centerY - 22.5,
                    left: centerX - radius - 22.5,
                }
            case 'primary':
                // Right center (3 o'clock) - labeled as WEAPON GEAR
                return {
                    top: centerY - 22.5,
                    left: centerX + radius - 22.5,
                }
            case 'legs':
                // Bottom center (6 o'clock)
                return {
                    top: centerY + radius - 22.5,
                    left: centerX - 22.5,
                }
            case 'background':
                // Top right (1:30 o'clock position) - labeled as SCENE
                return {
                    top: centerY - radius * 0.85,
                    left: centerX + radius * 0.5 - 22.5,
                }
            default:
                return { top: 10, left: 10 }
        }
    }

    // Equipment handlers
    const handleItemPress = async (itemId: string) => {
        const item = getItemById(itemId)
        if (!item) return

        setIsProcessing(true)
        try {
            if (!canUnlockItem(item.reqRank)) {
                Alert.alert('Rank Required', `Reach ${item.reqRank} rank to unlock this item.`)
                return
            }

            if (!isItemOwned(itemId)) {
                const purchased = await purchaseItem(itemId)
                if (!purchased) {
                    Alert.alert('Insufficient Funds', `Need ${item.cost} VP for ${item.name}`)
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
    const handleSelectCollection = (collection: Collection) => {
        console.log('Selecting collection:', collection.name, collection.id)
        setSelectedCollection(collection)
        setFilterTab('books')
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
                id: `imported_${Date.now()}`,
                name: analysis.sourceBook
                    ? `${analysis.sourceBook} Collection`
                    : `Imported Collection ${new Date().toLocaleDateString()}`,
                description: `${extractedVerses.length} verses imported from file`,
                scriptures: extractedVerses.map((v) => v.id),
                createdAt: new Date().toISOString(),
                tags: ['imported', 'file-upload'],
            }

            if (analysis.canBeChapterBased) {
                Alert.alert(
                    'Chapter Organization Available',
                    `This collection can be organized by chapters (${analysis.stats.totalChapters
                    } chapters from ${analysis.stats.totalBooks} book${analysis.stats.totalBooks > 1 ? 's' : ''
                    }). Would you like to enable chapter-based organization?`,
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
                                        `Chapter-based arsenal "${chapterBasedCollection.name}" established with ${analysis.stats.totalChapters} chapters.`,
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
            await errorHandler.handleError(
                error,
                'Import Verses',
                {
                    customMessage: 'Failed to import ammunition from file. Please retry operation.',
                    retry: () => handleVersesExtracted(extractedVerses, targetCollectionId)
                }
            )
        } finally {
            setIsImporting(false)
        }
    }

    const renderEquipmentSection = () => {
        const availableItems = selectedSlot ? getItemsBySlot(selectedSlot) : []

        return (
            <View style={styles.contentContainer}>
                {/* Avatar Preview Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        {/* Decorative ring behind avatar */}
                        <View style={styles.avatarRing} />

                        {/* Avatar */}
                        <SoldierAvatar size="large" showStats={false} />

                        {/* Floating Slot Buttons with improved styling */}
                        {SLOT_DATA.map((slot) => {
                            const isSelected = selectedSlot === slot.id
                            const positionStyle = getSlotPosition(slot.id)

                            return (
                                <SlotButton
                                    key={slot.id}
                                    slot={slot}
                                    position={positionStyle}
                                    isSelected={isSelected}
                                    onPress={() => setSelectedSlot(slot.id)}
                                    labelPosition={slot.id === 'head' ? 'above' : 'below'}
                                />
                            )
                        })}
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.itemsSection}>
                    <ScrollView contentContainerStyle={styles.itemsScrollContent}>
                        {selectedSlot && (
                            <>
                                <Text style={[styles.categoryTitle, { color: theme.text }]}>
                                    {SLOT_DATA.find(s => s.id === selectedSlot)?.label} GEAR
                                </Text>

                                <View style={styles.itemsGrid}>
                                    {availableItems.map((item) => {
                                        const equipped = isItemEquipped(item.id)
                                        const owned = isItemOwned(item.id)
                                        const unlocked = canUnlockItem(item.reqRank)

                                        return (
                                            <Pressable
                                                key={item.id}
                                                style={[
                                                    styles.itemCard,
                                                    equipped && [styles.equippedCard, { borderColor: theme.accent }],
                                                    { backgroundColor: theme.surface }
                                                ]}
                                                onPress={() => handleItemPress(item.id)}
                                                disabled={isProcessing}
                                            >
                                                <View style={styles.itemImageContainer}>
                                                    {item.assetSource?.uri ? (
                                                        <Image
                                                            source={
                                                                typeof item.assetSource.uri === 'string'
                                                                    ? { uri: item.assetSource.uri }
                                                                    : item.assetSource.uri
                                                            }
                                                            style={styles.itemImage}
                                                            resizeMode="contain"
                                                        />
                                                    ) : (
                                                        <View style={[styles.placeholderIcon, { backgroundColor: '#666' }]}>
                                                            <FontAwesome5
                                                                name={SLOT_DATA.find(s => s.id === selectedSlot)?.icon as any}
                                                                size={20}
                                                                color="white"
                                                            />
                                                        </View>
                                                    )}
                                                </View>

                                                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                                                    {item.name}
                                                </Text>

                                                {!unlocked && (
                                                    <View style={styles.lockBadge}>
                                                        <Text style={styles.lockText}>{item.reqRank}</Text>
                                                    </View>
                                                )}

                                                {owned && equipped && (
                                                    <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                                                        <Text style={styles.statusText}>EQUIPPED</Text>
                                                    </View>
                                                )}

                                                {owned && !equipped && (
                                                    <View style={[styles.statusBadge, { backgroundColor: theme.accent }]}>
                                                        <Text style={styles.statusText}>OWNED</Text>
                                                    </View>
                                                )}

                                                {!owned && (
                                                    <View style={[styles.priceBadge, { backgroundColor: '#7C3AED' }]}>
                                                        <FontAwesome5 name="coins" size={10} color="white" />
                                                        <Text style={styles.priceText}>{item.cost}</Text>
                                                    </View>
                                                )}
                                            </Pressable>
                                        )
                                    })}
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        )
    }

    const renderAmmunitionSection = () => {
        // Get scripture distribution by book for selected collection
        const getScriptureDistribution = () => {
            if (!selectedCollection) return []

            const scriptures = getScripturesByCollection(selectedCollection.id)
            const distribution = new Map<string, number>()

            scriptures.forEach((scripture) => {
                const book = scripture.book || 'Unknown'
                distribution.set(book, (distribution.get(book) || 0) + 1)
            })

            return Array.from(distribution.entries())
                .map(([book, count]) => ({ book, count }))
                .sort((a, b) => b.count - a.count)
        }

        // Get scripture distribution by chapter for selected collection
        const getChapterDistribution = () => {
            if (
                !selectedCollection ||
                !selectedCollection.isChapterBased ||
                !selectedCollection.chapters
            ) {
                return []
            }

            return selectedCollection.chapters
                .map((chapter) => ({
                    chapter: chapter.name || `Chapter ${chapter.chapterNumber}`,
                    count: chapter.scriptures.length,
                }))
                .sort((a, b) => a.chapter.localeCompare(b.chapter))
        }

        const renderCollectionItem = ({ item }: { item: Collection }) => (
            <ThemedCard
                style={[
                    styles.collectionItem,
                    selectedCollection?.id === item.id
                        ? { backgroundColor: 'transparent', borderColor: theme.accent, borderWidth: 1 }
                        : { backgroundColor: isDark ? theme.surface : GARRISON_THEME.surface }
                ]}
                lightColor={GARRISON_THEME.surface}
                darkColor={theme.surface}
                variant="outlined"
            >
                <TouchableOpacity
                    style={styles.collectionMainArea}
                    onPress={() => handleSelectCollection(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select collection ${item.name}`}
                >
                    <View style={styles.collectionInfo}>
                        <View style={styles.collectionHeaderRow}>
                            <ThemedText variant="heading" style={styles.collectionName}>
                                {item.abbreviation || item.name}
                            </ThemedText>
                            {item.isChapterBased && (
                                <View style={styles.chapterBadgeContainer}>
                                    <Feather name="layers" size={10} color={theme.accent} />
                                    <Text style={[styles.chapterBadgeText, { color: theme.accent }]}>
                                        CHAPTERS
                                    </Text>
                                </View>
                            )}
                        </View>

                        <ThemedText variant="body" style={styles.collectionDescription} numberOfLines={1}>
                            {item.name}
                        </ThemedText>

                        <View style={styles.collectionMeta}>
                            <View style={styles.statBadge}>
                                <FontAwesome name="crosshairs" size={10} color={isDark ? '#888' : '#666'} />
                                <ThemedText variant="caption" style={styles.statText}>
                                    {item.scriptures.length} ROUNDS
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.collectionArrow}
                    onPress={() => handleShowCollectionDetail(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${item.name}`}
                >
                    <View style={styles.arrowCircle}>
                        <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
            </ThemedCard>
        )

        const renderBookItem = ({ item }: { item: any }) => {
            const bookScriptureCount = scriptures.filter(
                (s) => s.book === item.name
            ).length

            return (
                <ThemedCard
                    style={styles.bookItem}
                    onPress={() => handleDefaultBookTap(item.name)}
                    testID={`book-${item.id}`}
                    variant="flat"
                    accessibilityRole="button"
                    accessibilityLabel={`View scriptures in ${item.name}`}
                >
                    <View style={styles.bookIconContainer}>
                        <FontAwesome name="book" size={18} color={theme.accent} />
                    </View>

                    <View style={styles.bookInfo}>
                        <ThemedText style={styles.bookName}>
                            {item.name}
                        </ThemedText>
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${Math.min(bookScriptureCount * 2, 100)}%`, backgroundColor: theme.accent }]} />
                        </View>
                    </View>

                    <View style={styles.bookStat}>
                        <Text style={[styles.bookCount, { color: theme.accent }]}>
                            {bookScriptureCount}
                        </Text>
                        <ThemedText variant="caption" style={styles.bookLabel}>
                            RNDS
                        </ThemedText>
                    </View>
                    <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
                </ThemedCard>
            )
        }

        const renderBookDistribution = ({
            item,
        }: {
            item: { book: string; count: number }
        }) => (
            <ThemedCard
                style={styles.distributionItem}
                onPress={() => handleBookDistributionTap(item.book)}
                variant="flat"
            >
                <FontAwesome name="book" size={16} color={theme.accent} />
                <ThemedText style={styles.distributionBook}>
                    {item.book}
                </ThemedText>
                <View style={styles.distributionCount}>
                    <Text style={[styles.countText, { color: theme.accent }]}>
                        {item.count}
                    </Text>
                    <ThemedText variant="caption" style={styles.countLabel}>
                        rounds
                    </ThemedText>
                </View>
                <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
            </ThemedCard>
        )

        const renderChapterDistribution = ({
            item,
        }: {
            item: { chapter: string; count: number }
        }) => (
            <ThemedCard
                style={styles.distributionItem}
                onPress={() => handleChapterDistributionTap(item.chapter)}
                variant="flat"
            >
                <Feather name="layers" size={16} color={theme.accent} />
                <ThemedText style={styles.distributionBook}>
                    {item.chapter}
                </ThemedText>
                <View style={styles.distributionCount}>
                    <Text style={[styles.countText, { color: theme.accent }]}>
                        {item.count}
                    </Text>
                    <ThemedText variant="caption" style={styles.countLabel}>
                        rounds
                    </ThemedText>
                </View>
                <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
            </ThemedCard>
        )

        return (
            <View style={styles.contentContainer}>

                <View style={styles.sectionHeaderRow}>
                    <ThemedText variant="caption" style={styles.collectionsTitle}>
                        AMMUNITION
                    </ThemedText>
                    <View style={[styles.headerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                </View>

                <View style={{ maxHeight: '45%', flexGrow: 0 }}>
                    <FlatList
                        data={collections}
                        extraData={selectedCollection}
                        renderItem={renderCollectionItem}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Feather name="box" size={32} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
                                </View>
                                <ThemedText style={styles.emptyTitle}>Arsenal Empty</ThemedText>
                                <ThemedText variant="caption" style={styles.emptySubtitle}>Import a file or add verses to stock your arsenal.</ThemedText>
                            </View>
                        }
                    />
                </View>

                <View style={styles.sectionHeaderRow}>
                    <ThemedText variant="caption" style={[styles.collectionsTitle, { marginTop: 10 }]}>
                        {selectedCollection ? 'CONTENTS' : 'ALL BOOKS'}
                    </ThemedText>
                    <View style={[styles.headerLine, { marginTop: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                    {selectedCollection && (
                        <TouchableOpacity onPress={() => setSelectedCollection(null)} style={{ marginTop: 10 }}>
                            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: 'bold' }}>CLEAR FILTER</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {selectedCollection ? (
                    <View style={{ flex: 1, paddingBottom: 104 }}>
                        <View style={styles.filterTabs}>
                            <TouchableOpacity
                                style={[
                                    styles.filterTab,
                                    filterTab === 'books' && styles.activeFilterTab,
                                ]}
                                onPress={() => setFilterTab('books')}
                            >
                                <FontAwesome
                                    name="book"
                                    size={16}
                                    color={
                                        filterTab === 'books'
                                            ? theme.accentContrastText
                                            : theme.textSecondary
                                    }
                                />
                                <Text
                                    style={[
                                        styles.filterTabText,
                                        {
                                            color:
                                                filterTab === 'books'
                                                    ? theme.accentContrastText
                                                    : theme.textSecondary,
                                        },
                                    ]}
                                >
                                    BOOKS
                                </Text>
                            </TouchableOpacity>

                            {selectedCollection.isChapterBased &&
                                selectedCollection.chapters &&
                                selectedCollection.chapters.length > 0 && (
                                    <TouchableOpacity
                                        style={[
                                            styles.filterTab,
                                            filterTab === 'chapters' && styles.activeFilterTab,
                                        ]}
                                        onPress={() => setFilterTab('chapters')}
                                    >
                                        <Feather
                                            name="layers"
                                            size={16}
                                            color={
                                                filterTab === 'chapters'
                                                    ? theme.accentContrastText
                                                    : theme.textSecondary
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.filterTabText,
                                                {
                                                    color:
                                                        filterTab === 'chapters'
                                                            ? theme.accentContrastText
                                                            : theme.textSecondary,
                                                },
                                            ]}
                                        >
                                            CHAPTERS
                                        </Text>
                                    </TouchableOpacity>
                                )}
                        </View>

                        {filterTab === 'books' ? (
                            <FlatList
                                data={getScriptureDistribution()}
                                renderItem={renderBookDistribution}
                                keyExtractor={(item) => item.book}
                                style={styles.list}
                                contentContainerStyle={{ paddingBottom: 0 }}
                                ListEmptyComponent={
                                    <ThemedText variant="caption" style={styles.emptyText}>
                                        No books found in this arsenal
                                    </ThemedText>
                                }
                            />
                        ) : selectedCollection.isChapterBased &&
                            selectedCollection.chapters &&
                            selectedCollection.chapters.length > 0 ? (
                            <FlatList
                                data={getChapterDistribution()}
                                renderItem={renderChapterDistribution}
                                keyExtractor={(item) => item.chapter}
                                style={styles.list}
                                contentContainerStyle={{ paddingBottom: 0 }}
                                ListEmptyComponent={
                                    <ThemedText variant="caption" style={styles.emptyText}>
                                        No chapters found in this arsenal
                                    </ThemedText>
                                }
                            />
                        ) : (
                            <View style={styles.emptyStateContainer}>
                                <ThemedText variant="caption" style={styles.emptyText}>
                                    This arsenal is not organized by chapters
                                </ThemedText>
                                <ThemedText variant="caption" style={styles.emptySubtext}>
                                    Use the Books tab to see scripture distribution
                                </ThemedText>
                            </View>
                        )}
                    </View>
                ) : (
                    <ThemedContainer
                        useGradient={true}
                        style={[styles.listGradient, { paddingBottom: 104 }]}
                    >
                        <FlatList
                            data={books}
                            renderItem={renderBookItem}
                            keyExtractor={(item) => item.id}
                            style={styles.list}
                            contentContainerStyle={{ paddingBottom: 16 }}
                        />
                    </ThemedContainer>
                )}
            </View>
        )
    }

    return (
        <ThemedContainer style={styles.container}>
            {/* Global Arsenal Header */}
            <ScreenHeader
                title="ARSENAL"
                subtitle={activeTab === 'equipment' ? 'EQUIPMENT BAY' : 'AMMUNITION BANK'}
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
                    ) : (
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
            <View style={[
                styles.tabSelector,
                { marginBottom: activeTab === 'equipment' ? 95 : 20 } // More space for character section, less for ammunition content
            ]}>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'equipment' && styles.activeMainTab,
                        activeTab === 'equipment' && { backgroundColor: '#FFD700', borderColor: '#FFD700' },
                    ]}
                    onPress={() => setActiveTab('equipment')}
                >
                    <FontAwesome5 name="shield-alt" size={20} color={activeTab === 'equipment' ? '#000' : 'rgba(255,255,255,0.7)'} />
                    <Text style={[
                        styles.tabButtonText,
                        { color: activeTab === 'equipment' ? '#000' : 'rgba(255,255,255,0.7)' }
                    ]}>
                        ARMORY
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'ammunition' && styles.activeMainTab,
                        activeTab === 'ammunition' && { backgroundColor: '#FFD700', borderColor: '#FFD700' },
                    ]}
                    onPress={() => setActiveTab('ammunition')}
                >
                    <FontAwesome name="book" size={20} color={activeTab === 'ammunition' ? '#000' : 'rgba(255,255,255,0.7)'} />
                    <Text style={[
                        styles.tabButtonText,
                        { color: activeTab === 'ammunition' ? '#000' : 'rgba(255,255,255,0.7)' }
                    ]}>
                        AMMUNITION
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content based on active tab */}
            <View style={styles.mainContent}>
                {activeTab === 'equipment' ? renderEquipmentSection() : renderAmmunitionSection()}
            </View>

            {/* Modals */}
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
        margin: 20,
        marginBottom: 135,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 16,
        padding: 4,
        gap: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeMainTab: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    tabButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.5,
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
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        zIndex: 10, // Ensure buttons are above all other content
        elevation: 10, // For Android
    },
    selectedSlot: {
        // backgroundColor: 'rgba(255,215,0,0.3)',
        // borderColor: '#FFD700',
        // borderWidth: 3,
        // shadowOffset: { width: 0, height: 0 },
        // shadowOpacity: 1,
        // shadowRadius: 10,
        // elevation: 20, // Higher elevation for selected state
        // zIndex: 20, // Higher z-index for selected state
    },
    glowRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,215,0,0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255,215,0,0.3)',
        top: -7.5,
        left: -7.5,
    },
    slotButtonInner: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: 'rgba(15,23,42,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
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
        marginTop: 122,
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
        borderRadius: 12,
        marginBottom: 2,
        minHeight: 80,
    },
    collectionMainArea: {
        flex: 1,
        padding: 10,
    },
    collectionInfo: {
        flex: 1,
    },
    collectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    collectionName: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    collectionDescription: {
        fontSize: 12,
        marginBottom: 4,
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
        width: 210,
        height: 210,
        borderRadius: 105,
        borderWidth: 1.5,
        borderColor: 'rgba(255,215,0,0.15)',
        borderStyle: 'dashed',
        top: 55,
    },
})
