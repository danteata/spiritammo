import React from 'react';
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
    variant?: 'default' | 'outlined' | 'flat';
    testID?: string;
    accessibilityRole?: 'button' | 'link' | 'image' | 'text' | 'none';
    accessibilityLabel?: string;
};

export type ThemedButtonProps = ThemeProps & TouchableOpacityProps & {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    icon?: React.ReactNode;
};

// --- Helper Hook ---
function useThemeColor(
    props: { light?: string; dark?: string },
    colorName: keyof typeof TACTICAL_THEME
) {
    const { isDark } = useAppStore();
    const theme = isDark ? TACTICAL_THEME : GARRISON_THEME;
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
    const { isDark } = useAppStore();
    const backgroundColor = useThemeColor(
        { light: lightColor, dark: darkColor },
        'background'
    );

    if (useGradient) {
        const gradientColors = isDark
            ? GRADIENTS.primary.dark
            : (GRADIENTS.primary.light as readonly [string, string, ...string[]]);

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
    const { isDark } = useAppStore();
    const theme = isDark ? TACTICAL_THEME : GARRISON_THEME;

    const backgroundColor = useThemeColor(
        { light: lightColor, dark: darkColor },
        'surface'
    );

    const cardStyles = [
        styles.card,
        { backgroundColor },
        variant === 'default' && {
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 5,
        },
        variant === 'outlined' && {
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: 'transparent',
        },
        variant === 'flat' && {
            backgroundColor: theme.surfaceHighlight,
        },
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity
                style={cardStyles}
                onPress={onPress}
                activeOpacity={0.7}
                testID={testID}
                accessibilityRole={accessibilityRole as any}
                accessibilityLabel={accessibilityLabel}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyles} testID={testID}>{children}</View>;
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
    const { isDark } = useAppStore();
    const theme = isDark ? TACTICAL_THEME : GARRISON_THEME;

    let backgroundColor = theme.primary;
    let textColor = '#FFFFFF';
    let borderColor = 'transparent';
    let borderWidth = 0;

    switch (variant) {
        case 'secondary':
            backgroundColor = theme.secondary;
            break;
        case 'outline':
            backgroundColor = 'transparent';
            textColor = theme.primary;
            borderColor = theme.primary;
            borderWidth = 1;
            break;
        case 'ghost':
            backgroundColor = 'transparent';
            textColor = theme.textSecondary;
            break;
    }

    if (disabled) {
        backgroundColor = isDark ? '#333' : '#ccc';
        textColor = '#888';
        borderColor = 'transparent';
    }

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
            {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
            <Text style={[MILITARY_TYPOGRAPHY.button, { color: textColor, fontSize: 14 }]}>
                {title}
            </Text>
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
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
});
