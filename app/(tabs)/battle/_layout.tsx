import { Stack } from 'expo-router';

export default function BattleLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="campaign" />
            <Stack.Screen name="collection" />
            <Stack.Screen name="quick" />
        </Stack>
    );
}
