import * as React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { useAppStore } from '@/hooks/useAppStore';

interface ProtocolCardProps {
    title: string;
    subtitle: string;
    icon: string;
    iconType: 'material' | 'ionicons';
    onPress: () => void;
    isActive?: boolean;
    isDark?: boolean;
}

export const ProtocolCard: React.FC<ProtocolCardProps> = ({
    title,
    subtitle,
    icon,
    iconType,
    onPress,
    isActive = false,
    isDark = false
}) => {
    const { theme } = useAppStore();

    return (
        <TouchableOpacity
            style={[styles.protocolCard, { borderColor: isActive ? theme.accent : theme.border }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={isDark ? ['#7c2d12', '#431407'] : ['#ffedd5', '#fed7aa']}
                style={styles.protocolGradient}
            >
                <View style={[styles.iconBox, { backgroundColor: isActive ? theme.accent : theme.primary }]}>
                    {iconType === 'material' ? (
                        <MaterialCommunityIcons name={icon as any} size={28} color="#FFF" />
                    ) : (
                        <Ionicons name={icon as any} size={28} color="#FFF" />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <ThemedText variant="button" style={{ fontSize: 18, color: isDark ? 'white' : '#7c2d12' }}>{title}</ThemedText>
                    <ThemedText variant="caption" style={{ opacity: 0.8, color: isDark ? 'rgba(255,255,255,0.7)' : '#7c2d12' }}>{subtitle}</ThemedText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={isDark ? 'white' : '#7c2d12'} />
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    protocolCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderBottomWidth: 4, // Tactile feel
    },
    protocolGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
