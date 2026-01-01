import { Tabs } from 'expo-router';
import { Home, ClipboardList, Wallet, User } from 'lucide-react-native';
import { COLORS } from '../../../utils/theme';

export default function CustomerTabs() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: { height: 100, paddingBottom: 10, paddingTop: 10 },
                tabBarLabelStyle: { fontSize: 12, fontWeight: 'medium' }
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: 'Wallet',
                    tabBarIcon: ({ color }) => <Wallet size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />
                }}
            />
        </Tabs>
    );
}
