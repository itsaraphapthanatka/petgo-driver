import { Tabs } from 'expo-router';
import { Home, TrendingUp, User, ClipboardList } from 'lucide-react-native';
import { COLORS } from '../../../utils/theme';

export default function DriverTabs() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: { height: 120, paddingBottom: 10, paddingTop: 10 },
                tabBarLabelStyle: { fontSize: 12, fontWeight: 'medium' }
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'หน้าแรก',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'ประวัติรับงาน',
                    tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="earnings"
                options={{
                    title: 'รายได้',
                    tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'โปรไฟล์',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />
                }}
            />
        </Tabs>
    );
}
