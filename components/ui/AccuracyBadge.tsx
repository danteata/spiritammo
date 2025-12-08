import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

interface AccuracyBadgeProps {
    accuracy: number;
}

export const AccuracyBadge: React.FC<AccuracyBadgeProps> = ({ accuracy }) => {
    const getAccuracyColor = () => {
        if (accuracy >= 80) return COLORS.success;
        if (accuracy >= 60) return COLORS.warning;
        return COLORS.error;
    };

    return (
        <View style={[
            styles.accuracyBadge,
            { backgroundColor: getAccuracyColor() }
        ]}>
            <Text style={styles.accuracyText}>{accuracy}% ACCURACY</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    accuracyBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    accuracyText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
});
