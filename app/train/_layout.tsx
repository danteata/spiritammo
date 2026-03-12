import { Stack } from 'expo-router';

export default function TrainLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="campaign" />
            <Stack.Screen name="collection" />
            <Stack.Screen name="listen" />
        </Stack>
    );
}
