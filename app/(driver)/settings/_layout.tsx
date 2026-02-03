import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'การตั้งค่า' }} />
            <Stack.Screen name="radius" options={{ title: 'ขอบเขตการรับงาน' }} />
            <Stack.Screen name="bank" options={{ title: 'ข้อมูลธนาคาร' }} />
        </Stack>
    );
}
