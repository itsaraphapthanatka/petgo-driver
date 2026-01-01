import { Tabs } from 'expo-router';
import { Home, List, DollarSign, User } from 'lucide-react-native';
import { COLORS } from '../../../utils/theme';

export default function DriverTabs() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: { height: 100, paddingBottom: 10, paddingTop: 10 },
            }}
        >
            <Tabs.Screen
                name="home"
                options={
                    {
                        title: 'Job Feed',
                        tabBarIcon: ({ color }) => <List size={24} color={color} />
                    }
                }
            />
            <Tabs.Screen
                name="earnings"
                options={{
                    title: 'Earnings',
                    tabBarIcon: ({ color }) => <DollarSign size={24} color={color} />
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
