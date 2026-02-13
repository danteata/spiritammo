import React, { useState } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Text,
    Alert,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import SoldierAvatar from '@/components/SoldierAvatar'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

export default function AvatarScreen() {
    const {
        isDark,
        theme,
        avatarInventory,
        userSettings,
        saveUserSettings,
    } = useAppStore()

    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('avatar')

    const valorPoints = avatarInventory?.valorPoints || 0

    const handleCustomizeOption = (option: string) => {
        trackEvent(AnalyticsEventType.SETTING_CHANGED, {
            setting_name: `avatar_${option}`,
            screen: 'avatar'
        })

        // Show coming soon for now
        Alert.alert(
            'Coming Soon',
            `${option} customization will be available in a future update. Stay tuned!`,
            [{ text: 'Got it!' }]
        )
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="THE BARRACKS"
                subtitle="AVATAR CUSTOMIZATION"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar Preview */}
                <View style={[styles.avatarCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                    <View style={styles.avatarContainer}>
                        <SoldierAvatar size="large" showStats={true} />
                    </View>

                    {/* Soldier Name */}
                    {userSettings?.soldierName && (
                        <View style={styles.nameBadge}>
                            <FontAwesome5 name="user" size={14} color={theme.accent} />
                            <ThemedText variant="body" style={styles.soldierName}>
                                {userSettings.soldierName}
                            </ThemedText>
                        </View>
                    )}

                    {/* Valor Points */}
                    <View style={styles.vpDisplay}>
                        <FontAwesome5 name="coins" size={20} color="#FFD700" />
                        <ThemedText variant="heading" style={styles.vpAmount}>{valorPoints}</ThemedText>
                        <ThemedText variant="caption" style={styles.vpLabel}>Valor Points</ThemedText>
                    </View>
                </View>

                {/* Customization Options */}
                <View style={styles.sectionHeader}>
                    <FontAwesome5 name="palette" size={14} color={theme.accent} />
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        CUSTOMIZE YOUR SOLDIER
                    </ThemedText>
                </View>

                <View style={styles.optionsGrid}>
                    {/* Head Gear */}
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                        onPress={() => handleCustomizeOption('Head Gear')}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                            <FontAwesome5 name="helmet-safety" size={24} color="#3B82F6" />
                        </View>
                        <ThemedText variant="body" style={styles.optionTitle}>Head Gear</ThemedText>
                        <ThemedText variant="caption" style={styles.optionSubtitle}>Helmets & Hats</ThemedText>
                    </TouchableOpacity>

                    {/* Uniform */}
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                        onPress={() => handleCustomizeOption('Uniform')}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                            <FontAwesome5 name="tshirt" size={24} color="#22C55E" />
                        </View>
                        <ThemedText variant="body" style={styles.optionTitle}>Uniform</ThemedText>
                        <ThemedText variant="caption" style={styles.optionSubtitle}>Vests & Jackets</ThemedText>
                    </TouchableOpacity>

                    {/* Equipment */}
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                        onPress={() => handleCustomizeOption('Equipment')}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                            <FontAwesome5 name="toolbox" size={24} color="#A855F7" />
                        </View>
                        <ThemedText variant="body" style={styles.optionTitle}>Equipment</ThemedText>
                        <ThemedText variant="caption" style={styles.optionSubtitle}>Gear & Tools</ThemedText>
                    </TouchableOpacity>

                    {/* Weapons */}
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                        onPress={() => handleCustomizeOption('Weapons')}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                            <FontAwesome5 name="crosshairs" size={24} color="#EF4444" />
                        </View>
                        <ThemedText variant="body" style={styles.optionTitle}>Weapons</ThemedText>
                        <ThemedText variant="caption" style={styles.optionSubtitle}>Primary & Sidearms</ThemedText>
                    </TouchableOpacity>

                    {/* Backgrounds */}
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                        onPress={() => handleCustomizeOption('Background')}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                            <FontAwesome5 name="image" size={24} color="#FBBF24" />
                        </View>
                        <ThemedText variant="body" style={styles.optionTitle}>Background</ThemedText>
                        <ThemedText variant="caption" style={styles.optionSubtitle}>Scenes & Themes</ThemedText>
                    </TouchableOpacity>

                    {/* Call Sign */}
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                        onPress={() => router.push('/settings')}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                            <FontAwesome5 name="id-badge" size={24} color="#FFD700" />
                        </View>
                        <ThemedText variant="body" style={styles.optionTitle}>Call Sign</ThemedText>
                        <ThemedText variant="caption" style={styles.optionSubtitle}>Edit Your Name</ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Shop Section */}
                <View style={styles.sectionHeader}>
                    <FontAwesome5 name="store" size={14} color={theme.accent} />
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        SUPPLY DEPOT
                    </ThemedText>
                </View>

                <ThemedCard variant="glass" style={styles.shopCard}>
                    <View style={styles.shopContent}>
                        <FontAwesome5 name="lock" size={32} color={theme.textSecondary} />
                        <ThemedText variant="body" style={styles.shopText}>
                            Unlock new gear with Valor Points earned from battles and training!
                        </ThemedText>
                        <TouchableOpacity
                            style={[styles.shopButton, { backgroundColor: theme.accent }]}
                            onPress={() => {
                                Alert.alert(
                                    'Coming Soon',
                                    'The Supply Depot will open soon with exclusive gear!',
                                    [{ text: 'Got it!' }]
                                )
                            }}
                        >
                            <ThemedText variant="body" style={styles.shopButtonText}>
                                Visit Supply Depot
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </ThemedCard>
            </ScrollView>
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
        padding: 16,
        paddingBottom: 100,
    },
    avatarCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    nameBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        marginBottom: 12,
    },
    soldierName: {
        fontWeight: '600',
    },
    vpDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    vpAmount: {
        fontSize: 24,
        color: '#FFD700',
    },
    vpLabel: {
        opacity: 0.7,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        letterSpacing: 1.5,
        opacity: 0.7,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    optionCard: {
        width: '47%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    optionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    optionTitle: {
        fontWeight: '600',
        marginBottom: 4,
    },
    optionSubtitle: {
        opacity: 0.6,
        fontSize: 11,
    },
    shopCard: {
        padding: 24,
        alignItems: 'center',
    },
    shopContent: {
        alignItems: 'center',
    },
    shopText: {
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
        opacity: 0.8,
    },
    shopButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    shopButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
})
