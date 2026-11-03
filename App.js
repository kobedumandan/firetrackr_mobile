import React from 'react';
// Must load before anything else: defines the background location task so the
// OS can run it even when the app was relaunched headless.
import './tasks/locationTask';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';

import LoginScreen    from './screens/LoginScreen';
import HomeScreen     from './screens/HomeScreen';
import RouteScreen    from './screens/RouteScreen';
import SettingsScreen from './screens/SettingsScreen';
import ReportScreen   from './screens/ReportScreen';
import AlertsScreen   from './screens/AlertsScreen';
import TrucksScreen   from './screens/TrucksScreen';
import BottomNav      from './components/BottomNav';
import Colors         from './constants/colors';
import { AuthProvider, useAuth } from './context/AuthContext';
import { navigationRef } from './utils/navigation';
import { AppPreferencesProvider, useAppPreferences } from './context/AppPreferencesContext';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Route"    component={RouteScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { colors: Colors } = useAppPreferences();
  const { isAuthenticated, restoring } = useAuth();
  if (restoring) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgBase, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accentFire} size="large" />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Report"
            component={ReportScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Alerts"
            component={AlertsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Trucks"
            component={TrucksScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

function AppNavigation() {
  const { colors, isDark } = useAppPreferences();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors, primary: colors.accentFire, background: colors.bgBase,
      card: colors.bgPanel, text: colors.textPrimary, border: colors.border,
    },
  };
  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_900Black,
    ShareTechMono_400Regular,

    // Each key loads the weight it is named after.
    AxiformaRegular: require('./components/fonts/Axiforma/Axiforma-Regular.otf'),
    AxiformaMedium: require('./components/fonts/Axiforma/Axiforma-Medium.otf'),
    AxiformaBlack: require('./components/fonts/Axiforma/Axiforma-Black.otf'),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgBase, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accentFire} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <AuthProvider>
          <AppNavigation />
        </AuthProvider>
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}
