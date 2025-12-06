import React, { useEffect } from 'react'
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
    Platform,
    Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { useOAuth } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { LinearGradient } from 'expo-linear-gradient'

import { TACTICAL_THEME, GARRISON_THEME, GRADIENTS } from '@/constants/colors'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'

const { width } = Dimensions.get('window')

export const useWarmUpBrowser = () => {
    useEffect(() => {
        void WebBrowser.warmUpAsync()
        return () => {
            void WebBrowser.coolDownAsync()
        }
    }, [])
}

WebBrowser.maybeCompleteAuthSession()

export default function AuthScreen() {
    const router = useRouter()
    const { isDark } = useAppStore()
    useWarmUpBrowser()

    const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' })
    const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' })

    const theme = isDark ? TACTICAL_THEME : GARRISON_THEME
    const textColor = isDark ? theme.text : theme.text
    const subTextColor = isDark ? theme.textSecondary : theme.textSecondary

    const handleSignInWithGoogle = async () => {
        try {
            const { createdSessionId, signIn, signUp, setActive } = await startGoogleFlow({
                redirectUrl: Linking.createURL('/'), // Redirect to root
            })

            if (createdSessionId && setActive) {
                setActive({ session: createdSessionId })
                router.replace('/(tabs)/squad')
            }
        } catch (err) {
            console.error('OAuth error', err)
        }
    }

    const handleSignInWithApple = async () => {
        try {
            const { createdSessionId, setActive } = await startAppleFlow({
                redirectUrl: Linking.createURL('/'),
            })

            if (createdSessionId && setActive) {
                setActive({ session: createdSessionId })
                router.replace('/(tabs)/squad')
            }
        } catch (err) {
            console.error('OAuth error', err)
        }
    }

    const handleSkip = () => {
        router.replace('/(tabs)/campaign')
    }

    return (
        <ThemedContainer style={styles.container}>
            <LinearGradient
                colors={isDark ? ['transparent', 'rgba(0,0,0,0.8)'] : ['transparent', 'rgba(255,255,255,0.8)']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="shield-account" size={64} color={TACTICAL_THEME.accent} />
                        <View style={styles.iconGlow} />
                    </View>
                    <ThemedText variant="heading" style={[styles.title, { color: TACTICAL_THEME.accent }]}>
                        SECURE YOUR LEGACY
                    </ThemedText>
                    <ThemedText variant="body" style={[styles.subtitle, { color: subTextColor }]}>
                        Sync combat records. Authorize device transfer. Preserve operation streaks.
                    </ThemedText>
                </View>

                {/* Benefits List - Tactical Style */}
                <View style={styles.benefitsContainer}>
                    <BenefitItem
                        icon="cloud-upload"
                        text="CLOUD SYNC PROTOCOL"
                        desc="Backup combat statistics"
                        color={TACTICAL_THEME.success}
                        theme={theme}
                    />
                    <BenefitItem
                        icon="phone-portrait"
                        text="MULTI-DEVICE ACCESS"
                        desc="Deploy on any terminal"
                        color={TACTICAL_THEME.warning}
                        theme={theme}
                    />
                    <BenefitItem
                        icon="trophy"
                        text="RANK PRESERVATION"
                        desc="Maintain global standing"
                        color={TACTICAL_THEME.accent}
                        theme={theme}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={styles.appleButton}
                            onPress={handleSignInWithApple}
                            activeOpacity={0.8}
                        >
                            <AntDesign name="apple1" size={24} color="#FFF" style={styles.authIcon} />
                            <Text style={styles.appleButtonText}>CONTINUE WITH APPLE</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleSignInWithGoogle}
                        activeOpacity={0.8}
                    >
                        <AntDesign name="google" size={24} color="#DB4437" style={styles.authIcon} />
                        <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <ThemedText variant="caption" style={{ letterSpacing: 2, opacity: 0.5 }}>PROCEED AS GUEST (OFFLINE)</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </ThemedContainer>
    )
}

const BenefitItem = ({ icon, text, desc, color, theme }: any) => (
    <View style={[styles.benefitItem, { borderLeftColor: color }]}>
        <View style={[styles.benefitIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <View>
            <ThemedText variant="body" style={{ fontSize: 13, color: theme.text, fontWeight: 'bold' }}>{text}</ThemedText>
            <ThemedText variant="caption" style={{ opacity: 0.6 }}>{desc}</ThemedText>
        </View>
    </View>
)

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 32,
        justifyContent: 'space-between',
        paddingTop: 80,
    },
    header: {
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 24,
        padding: 24,
        borderRadius: 60,
        backgroundColor: 'rgba(30, 41, 59, 0.5)', // Slate 800ish
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGlow: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: 60,
        backgroundColor: TACTICAL_THEME.accent,
        opacity: 0.15,
        transform: [{ scale: 1.2 }],
    },
    title: {
        fontSize: 28,
        letterSpacing: 2,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 22,
        maxWidth: 280,
        opacity: 0.7,
    },
    benefitsContainer: {
        gap: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        borderRightColor: 'rgba(255,255,255,0.05)',
        borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 16,
    },
    benefitIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionsContainer: {
        gap: 16,
        marginBottom: 20,
    },
    appleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        backgroundColor: '#000000',
        borderWidth: 1,
        borderColor: '#333',
    },
    appleButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        elevation: 1,
    },
    googleButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    authIcon: {
        marginRight: 12,
    },
    skipButton: {
        alignItems: 'center',
        padding: 12,
    },
})
