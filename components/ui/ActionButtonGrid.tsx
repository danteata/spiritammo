import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { MILITARY_TYPOGRAPHY, text } from '@/constants/colors';

interface ActionButtonProps {
    icon: string;
    iconType: 'fontawesome' | 'fontawesome5' | 'material' | 'ionicons';
    title: string;
    onPress: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    buttonStyle?: any;
    textStyle?: any;
}

interface ActionButtonGridProps {
    buttons: ActionButtonProps[];
    gridSize?: '2x2' | '1x4';
}

export const ActionButtonGrid: React.FC<ActionButtonGridProps> = ({
    buttons,
    gridSize = '2x2'
}) => {
    const renderIcon = (icon: string, iconType: string) => {
        switch (iconType) {
            case 'fontawesome':
                return <FontAwesome name={icon as any} size={20} color={text.text} />;
            case 'fontawesome5':
                return <FontAwesome5 name={icon as any} size={20} color={text.text} />;
            case 'material':
                return <MaterialCommunityIcons name={icon as any} size={20} color={text.text} />;
            case 'ionicons':
                return <Ionicons name={icon as any} size={20} color={text.text} />;
            default:
                return null;
        }
    };

    const getGridLayout = () => {
        if (gridSize === '1x4') {
            return {
                container: styles.grid1x4,
                row: styles.row1x4
            };
        }
        return {
            container: styles.grid2x2,
            row: styles.row2x2
        };
    };

    const { container, row } = getGridLayout();

    return (
        <View style={container}>
            {buttons.length > 0 && (
                <View style={row}>
                    {buttons.slice(0, 2).map((button, index) => (
                        <ActionButton key={index} {...button} />
                    ))}
                </View>
            )}
            {buttons.length > 2 && (
                <View style={row}>
                    {buttons.slice(2, 4).map((button, index) => (
                        <ActionButton key={index} {...button} />
                    ))}
                </View>
            )}
        </View>
    );
};

const ActionButton: React.FC<ActionButtonProps> = ({
    icon,
    iconType,
    title,
    onPress,
    disabled = false,
    isLoading = false,
    buttonStyle = {},
    textStyle = {}
}) => {
    return (
        <TouchableOpacity
            style={[styles.actionButton, buttonStyle]}
            onPress={onPress}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={text.text} />
            ) : (
                <>
                    {renderIcon(icon, iconType)}
                    <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    grid2x2: {
        gap: 12,
    },
    row2x2: {
        flexDirection: 'row',
        gap: 12,
    },
    grid1x4: {
        flexDirection: 'row',
        gap: 12,
    },
    row1x4: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 8,
    },
    buttonText: {
        color: text.text,
    },
});
