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
                colors={isDark ? ['transparent', 'rgba(0,0,0,0.8)'] : ['transparent', 'rgba(0,0,0,0.05)']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="shield-account" size={64} color={TACTICAL_THEME.accent} />
                    </View>
                    <ThemedText variant="heading" style={[styles.title, { color: TACTICAL_THEME.accent }]}>
                        SECURE YOUR LEGACY
                    </ThemedText>
                    <ThemedText variant="body" style={[styles.subtitle, { color: subTextColor }]}>
                        Sync valid combat records.
                        Authorize device transfer.
                        Preserve operation streaks.
                    </ThemedText>
                </View>

                {/* Benefits List - Tactical Style */}
                <View style={styles.benefitsContainer}>
                    <BenefitItem
                        icon="cloud-upload"
                        text="CLOUD SYNC PROTOCOL"
                        desc="Backup combat statistics"
                        color={TACTICAL_THEME.success}
                        textColor={textColor}
                        subTextColor={subTextColor}
                    />
                    <BenefitItem
                        icon="phone-portrait"
                        text="MULTI-DEVICE ACCESS"
                        desc="Deploy on any terminal"
                        color={TACTICAL_THEME.warning}
                        textColor={textColor}
                        subTextColor={subTextColor}
                    />
                    <BenefitItem
                        icon="trophy"
                        text="RANK PRESERVATION"
                        desc="Maintain global standing"
                        color={TACTICAL_THEME.accent}
                        textColor={textColor}
                        subTextColor={subTextColor}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={[styles.authButton, { backgroundColor: '#000000', marginBottom: 12, borderColor: '#333', borderWidth: 1 }]}
                            onPress={handleSignInWithApple}
                        >
                            <AntDesign name="apple1" size={20} color="#FFF" style={styles.authIcon} />
                            <Text style={styles.authButtonText}>AUTHENTICATE WITH APPLE</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.authButton, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD' }]}
                        onPress={handleSignInWithGoogle}
                    >
                        <AntDesign name="google" size={20} color="#DB4437" style={styles.authIcon} />
                        <Text style={[styles.authButtonText, { color: '#000' }]}>AUTHENTICATE WITH GOOGLE</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={[styles.skipText, { color: subTextColor }]}>PROCEED AS GUEST (OFFLINE)</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ThemedContainer>
    )
}

const BenefitItem = ({ icon, text, desc, color, textColor, subTextColor }: any) => (
    <View style={styles.benefitItem}>
        <View style={[styles.benefitIconBox, { borderColor: color }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <View>
            <Text style={[styles.benefitText, { color: textColor }]}>{text}</Text>
            <Text style={[styles.benefitDesc, { color: subTextColor }]}>{desc}</Text>
        </View>
    </View>
)

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        marginBottom: 20,
        padding: 20,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 22,
        paddingHorizontal: 20,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    benefitsContainer: {
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 16,
    },
    benefitIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    benefitText: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    benefitDesc: {
        fontSize: 12,
    },
    actionsContainer: {
        width: '100%',
    },
    authButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 8, // More tactical boxy look
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    authIcon: {
        marginRight: 10,
    },
    authButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 8,
    },
    skipText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
})
