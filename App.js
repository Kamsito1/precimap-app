import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MapScreen from './screens/MapScreen';
import DealsScreen from './screens/DealsScreen';
import EventsScreen from './screens/EventsScreen';
import RankingScreen from './screens/RankingScreen';
import ProfileScreen from './screens/ProfileScreen';
import AhorroScreen from './screens/AhorroScreen';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from './utils';
import { APP_VERSION } from './utils';
import OnboardingSlider from './components/OnboardingSlider';

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
  const [splashG95, setSplashG95] = useState(null);
  const [splashStats, setSplashStats] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(null); // null=checking, true/false
  const insets = useSafeAreaInsets();

  // Check if onboarding has been shown — skip for existing users upgrading
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('onboarding_done'),
      AsyncStorage.getItem('precimap_token'), // existing user = skip onboarding
    ]).then(([done, token]) => {
      setShowOnboarding(!done && !token);
    }).catch(() => setShowOnboarding(false));
  }, []);

  // Fetch real data for splash screen — MUST be before any conditional return
  useEffect(() => {
    // Use /api/stats which includes gas_stats (always available, no delay)
    apiGet('/api/stats').then(d => {
      setSplashStats(d);
      const min = d?.gas_stats?.g95?.min;
      if (min) setSplashG95(Number(min).toFixed(3));
    }).catch(() => {});
  }, []);

  // Notification polling — MUST be before any conditional return
  useEffect(() => {
    if (!isLoggedIn) { setUnreadCount(0); return; }
    const check = async () => {
      try {
        const me = await apiGet('/api/users/me');
        setUnreadCount((me?.notifications || []).filter(n => !n.is_read).length);
      } catch(_) {}
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [isLoggedIn]);

  if (showOnboarding === null || authLoading) return (
    <View style={{ flex: 1, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Ionicons name="wallet" size={52} color="rgba(255,255,255,0.95)"/>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>Mapa Tacaño</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>La app de ahorro de España</Text>
      <ActivityIndicator color="rgba(255,255,255,0.8)" style={{ marginTop: 16 }} />
      <View style={{ position: 'absolute', bottom: 40, alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {splashG95
            ? `G95 desde ${splashG95}€/L · ${splashStats?.deals||50} chollos · ${splashStats?.events||30} eventos`
            : 'Gasolineras · Chollos · Supermercados · Bancos'}
        </Text>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>v{APP_VERSION} · Mapa Tacaño</Text>
      </View>
    </View>
  );

  if (showOnboarding) return (
    <OnboardingSlider onFinish={() => setShowOnboarding(false)} />
  );

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
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 10 : 4),
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
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
        options={{ tabBarLabel: 'Eventos', tabBarIcon: p => <TabIcon name="calendar" {...p} /> }} />
      <Tab.Screen name="Ranking" component={RankingScreen}
        options={{ tabBarLabel: 'Top', tabBarIcon: p => <TabIcon name="trophy" {...p} /> }} />
      <Tab.Screen name="Perfil" component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: p => <TabIcon name="person" {...p} badge={unreadCount} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  // Initialize CarPlay — only on iOS production builds
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    try {
      const Constants = require('expo-constants').default;
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) return;
      const { initCarPlay } = require('./carplay/CarPlaySetup');
      initCarPlay();
    } catch(_) { /* CarPlay not available */ }
  }, []);
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
