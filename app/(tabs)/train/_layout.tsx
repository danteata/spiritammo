import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TrainLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="voice" />
            <Stack.Screen name="drill" />
            <Stack.Screen name="quiz" />
            <Stack.Screen name="campaign" />
        </Stack>
    );
}
