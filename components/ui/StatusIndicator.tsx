import * as React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppStore } from '@/hooks/useAppStore';
import { COLORS } from '@/constants/colors';

interface StatusIndicatorProps {
    isActive?: boolean;
    isLoading?: boolean;
    isError?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    isActive = false,
    isLoading = false,
    isError = false,
    size = 'medium'
}) => {
    const { isDark } = useAppStore();

    if (isLoading) {
        return <ActivityIndicator size={size === 'large' ? 'large' : size === 'medium' ? 'small' : 'small'} color={isDark ? COLORS.text.dark : COLORS.text.light} />;
    }

    const getSize = () => {
        switch (size) {
            case 'small': return 6;
            case 'large': return 12;
            default: return 8;
        }
    };

    return (
        <View style={[
            styles.indicator,
            {
                width: getSize(),
                height: getSize(),
                borderRadius: getSize() / 2,
                backgroundColor: isError ? COLORS.error :
                    isActive ? COLORS.error :
                        COLORS.success
            }
        ]} />
    );
};

const styles = StyleSheet.create({
    indicator: {
        marginRight: 8,
    }
});
