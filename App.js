import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MapScreen from './screens/MapScreen';
import DealsScreen from './screens/DealsScreen';
import EventsScreen from './screens/EventsScreen';
import RankingScreen from './screens/RankingScreen';
import ProfileScreen from './screens/ProfileScreen';
import AhorroScreen from './screens/AhorroScreen';
import { useEffect, useState } from 'react';
import { apiGet } from './utils';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused, color, badge }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={focused ? name : `${name}-outline`} size={21} color={color} />
      {badge > 0 && (
        <View style={{
          position: 'absolute', top: -3, right: -7,
          backgroundColor: '#DC2626', borderRadius: 99,
          minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff',
        }}>
          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

function AppNavigator() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  if (authLoading) return (
    <View style={{ flex: 1, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Text style={{ fontSize: 52 }}>🗺️</Text>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>PreciMap</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>La app de ahorro de España</Text>
      <ActivityIndicator color="rgba(255,255,255,0.8)" style={{ marginTop: 16 }} />
      <View style={{ position: 'absolute', bottom: 40, alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>🟢 G95 desde 1.199€/L · ⛽ 12.000+ gasolineras</Text>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>v3.2.1</Text>
      </View>
    </View>
  );

  useEffect(() => {
    if (!isLoggedIn) { setUnreadCount(0); return; }
    const check = async () => {
      try {
        const me = await apiGet('/api/users/me');
        setUnreadCount((me?.notifications || []).filter(n => !n.is_read).length);
      } catch {}
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [isLoggedIn]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 0.5,
          height: 54,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 9.5, fontWeight: '600', marginTop: 0 },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tab.Screen name="Mapa" component={MapScreen}
        options={{ tabBarIcon: p => <TabIcon name="map" {...p} /> }} />
      <Tab.Screen name="Chollos" component={DealsScreen}
        options={{ tabBarIcon: p => <TabIcon name="flame" {...p} /> }} />
      <Tab.Screen name="Ahorro" component={AhorroScreen}
        options={{ tabBarIcon: p => <TabIcon name="wallet" {...p} /> }} />
      <Tab.Screen name="Eventos" component={EventsScreen}
        options={{ tabBarIcon: p => <TabIcon name="calendar" {...p} /> }} />
      <Tab.Screen name="Ranking" component={RankingScreen}
        options={{ tabBarIcon: p => <TabIcon name="trophy" {...p} /> }} />
      <Tab.Screen name="Perfil" component={ProfileScreen}
        options={{ tabBarIcon: p => <TabIcon name="person" {...p} badge={unreadCount} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const scheme = useColorScheme();
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
