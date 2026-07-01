import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Text, ActivityIndicator, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CollectionProvider } from './contexts/CollectionContext'
import { COLORS } from './config/constants'

// Auth screens
import WelcomeScreen from './screens/auth/WelcomeScreen'
import RegisterScreen from './screens/auth/RegisterScreen'
import LoginScreen from './screens/auth/LoginScreen'

// Main screens
import CollectionScreen from './screens/collection/CollectionScreen'
import ExperienceDetailScreen from './screens/collection/ExperienceDetailScreen'
import FeedScreen from './screens/feed/FeedScreen'
import ExploreMapScreen from './screens/map/ExploreMapScreen'
import ProfileScreen from './screens/profile/ProfileScreen'
import BusinessScreen from './screens/business/BusinessScreen'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()
const AuthStack = createStackNavigator()
const CollectionStack = createStackNavigator()
const ProfileStack = createStackNavigator()

const NAV_THEME = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.bg,
    card: COLORS.bgCard,
    text: COLORS.textPrimary,
    border: COLORS.border,
    notification: COLORS.primary,
  },
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  )
}

function CollectionNavigator() {
  return (
    <CollectionStack.Navigator screenOptions={{ headerShown: false }}>
      <CollectionStack.Screen name="CollectionHome" component={CollectionScreen} />
      <CollectionStack.Screen name="ExperienceDetail" component={ExperienceDetailScreen} />
    </CollectionStack.Navigator>
  )
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="Business" component={BusinessScreen} />
    </ProfileStack.Navigator>
  )
}

function MainTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 0.5,
          height: 56 + (insets.bottom || 0),
          paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 10 : 6),
          paddingTop: 8,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
      <Tab.Screen
        name="Collection"
        component={CollectionNavigator}
        options={{
          tabBarLabel: 'Colección',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'albums' : 'albums-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreMapScreen}
        options={{
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

function RootNavigator() {
  const { loading, isLoggedIn } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -1 }}>
            ✦ VIVID
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Colecciona tu vida</Text>
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
        </View>
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="AuthStack" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <CollectionProvider>
          <SafeAreaProvider>
            <NavigationContainer theme={NAV_THEME}>
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </CollectionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
