import * as React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    StyleProp,
    TouchableOpacity,
    TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppStore } from '@/hooks/useAppStore';
import {
    TACTICAL_THEME,
    GARRISON_THEME,
    GRADIENTS,
    MILITARY_TYPOGRAPHY,
} from '@/constants/colors';

// --- Types ---

type ThemeProps = {
    lightColor?: string;
    darkColor?: string;
};

export type ThemedContainerProps = ThemeProps & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    useGradient?: boolean;
};

export type ThemedTextProps = ThemeProps & Text['props'] & {
    variant?: keyof typeof MILITARY_TYPOGRAPHY;
    color?: string; // Explicit color override
};

export type ThemedCardProps = ThemeProps & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    variant?: 'default' | 'outlined' | 'flat' | 'glass';
    testID?: string;
    accessibilityRole?: 'button' | 'link' | 'image' | 'text' | 'none';
    accessibilityLabel?: string;
};

export type ThemedButtonProps = ThemeProps & TouchableOpacityProps & {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
    icon?: React.ReactNode;
};

// --- Helper Hook ---
function useThemeColor(
    props: { light?: string; dark?: string },
    colorName: keyof typeof TACTICAL_THEME
) {
    const { isDark, theme } = useAppStore(); // Use dynamic theme
    const colorFromProps = isDark ? props.dark : props.light;

    if (colorFromProps) {
        return colorFromProps;
    } else {
        return theme[colorName];
    }
}

// --- Components ---

export function ThemedContainer({
    children,
    style,
    lightColor,
    darkColor,
    useGradient = true,
}: ThemedContainerProps) {
    const { isDark, gradients } = useAppStore();
    const backgroundColor = useThemeColor(
        { light: lightColor, dark: darkColor },
        'background'
    );

    if (useGradient) {
        const primaryGradient = gradients?.primary || ['#333', '#000'];
        const gradientColors = primaryGradient as readonly [string, string, ...string[]];

        return (
            <LinearGradient
                colors={gradientColors}
                style={[styles.container, style]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {children}
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor }, style]}>
            {children}
        </View>
    );
}

export function ThemedText({
    style,
    lightColor,
    darkColor,
    variant = 'body',
    color,
    ...otherProps
}: ThemedTextProps) {
    const themeColor = useThemeColor(
        { light: lightColor, dark: darkColor },
        'text'
    );

    // If variant is caption/code, default to textSecondary unless overridden
    const defaultColor = (variant === 'caption' || variant === 'code')
        ? useThemeColor({ light: lightColor, dark: darkColor }, 'textSecondary')
        : themeColor;

    const finalColor = color || defaultColor;

    return (
        <Text
            style={[
                MILITARY_TYPOGRAPHY[variant],
                { color: finalColor },
                style,
            ]}
            {...otherProps}
        />
    );
}

export function ThemedCard({
    children,
    style,
    lightColor,
    darkColor,
    onPress,
    variant = 'default',
    testID,
    accessibilityRole,
    accessibilityLabel,
}: ThemedCardProps) {
    const { isDark, theme } = useAppStore();

    const backgroundColor = useThemeColor(
        { light: lightColor, dark: darkColor },
        'surface'
    );

    const cardStyles: StyleProp<ViewStyle> = [
        styles.card,
        { backgroundColor },
        variant === 'default' && {
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.1,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent'
        },
        variant === 'outlined' && {
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: 'transparent',
        },
        variant === 'flat' && {
            backgroundColor: theme.surfaceHighlight,
        },
        variant === 'glass' && {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.5)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
            borderWidth: 1,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
        },
        style,
    ];

    const Content = (
        <>
            {variant === 'glass' && (
                <BlurView
                    intensity={isDark ? 30 : 50}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {children}
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity
                style={[cardStyles, { overflow: 'hidden' }]}
                onPress={onPress}
                activeOpacity={0.7}
                testID={testID}
                accessibilityRole={accessibilityRole as any}
                accessibilityLabel={accessibilityLabel}
            >
                {Content}
            </TouchableOpacity>
        );
    }

    return <View style={[cardStyles, { overflow: 'hidden' }]} testID={testID}>{Content}</View>;
}

export function ThemedButton({
    title,
    onPress,
    variant = 'primary',
    style,
    icon,
    disabled,
    ...props
}: ThemedButtonProps) {
    const { isDark, theme, gradients } = useAppStore();

    // Default styles
    let backgroundColor = 'transparent';
    let textColor = '#FFFFFF';
    let borderColor = 'transparent';
    let borderWidth = 0;
    let gradientColors: readonly [string, string, ...string[]] | undefined;

    switch (variant) {
        case 'primary':
            if (isDark) {
                const tactical = gradients?.tactical;
                gradientColors = tactical
                    ? ((tactical as any).accent || tactical)
                    : (gradients?.primary || ['#333', '#000']);
            } else {
                gradientColors = [theme.accent, '#EA580C'];
            }
            textColor = '#FFFFFF';
            break;
        case 'secondary':
            backgroundColor = theme.secondary;
            break;
        case 'outline':
            backgroundColor = 'transparent';
            textColor = theme.primary; // Using primary color for text in outline
            borderColor = theme.border;
            borderWidth = 1;
            break;
        case 'ghost':
            backgroundColor = 'transparent';
            textColor = theme.textSecondary;
            break;
        case 'glass':
            // Glass button
            backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)';
            borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.4)';
            borderWidth: 1;
            textColor = theme.text;
            break;
    }

    if (disabled) {
        gradientColors = undefined;
        backgroundColor = isDark ? '#333' : '#ccc';
        textColor = '#888';
        borderColor = 'transparent';
    }

    const buttonContent = (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
            <Text style={[MILITARY_TYPOGRAPHY.button, { color: textColor, fontSize: 16, letterSpacing: 0.5 }]}>
                {title}
            </Text>
        </View>
    );

    if (gradientColors && !disabled) {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                disabled={disabled}
                style={[styles.buttonContainer, style]}
                {...props}
            >
                <LinearGradient
                    colors={gradientColors}
                    style={styles.button}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    {buttonContent}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    // Non-gradient buttons
    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor, borderColor, borderWidth },
                style,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            {...props}
        >
            {variant === 'glass' && (
                <BlurView
                    intensity={20}
                    tint={isDark ? 'light' : 'dark'}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {buttonContent}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    buttonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14, // Slightly taller
        paddingHorizontal: 24,
        borderRadius: 12,
        minHeight: 56, // Accessible touch target
    },
});
