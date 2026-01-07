import { Stack } from 'expo-router';

export default function DriverLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="job/[id]" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen name="chat/[orderId]" options={{ title: 'Chat', headerShown: true }} />
            <Stack.Screen name="notifications" options={{ title: 'การแจ้งเตือน', headerShown: true }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="wallet" options={{ headerShown: false }} />
        </Stack>
    );
}
