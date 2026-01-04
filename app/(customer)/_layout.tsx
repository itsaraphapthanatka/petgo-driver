import { Stack } from 'expo-router';

export default function CustomerHeaderLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="booking" />
            <Stack.Screen name="chat/[orderId]" />
        </Stack>
    );
}
