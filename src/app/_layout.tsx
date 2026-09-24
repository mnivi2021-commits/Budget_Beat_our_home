import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '@/lib/store';
import { Fonts, alpha, useColors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Duolingo-style tab icon: outlined, coloured tile when selected. */
function TabIcon({ name, tint, muted, focused }: { name: IconName; tint: string; muted: string; focused: boolean }) {
  return (
    <View
      style={{
        width: 48,
        height: 36,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: focused ? alpha(tint, 0.6) : 'transparent',
        backgroundColor: focused ? alpha(tint, 0.15) : 'transparent',
      }}>
      <Ionicons name={name} size={24} color={focused ? tint : muted} />
    </View>
  );
}

function AppTabs() {
  const c = useColors();
  const { ready } = useStore();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, borderTopWidth: 2, height: 72 + insets.bottom, paddingTop: 8, paddingBottom: insets.bottom + 6 },
        tabBarLabelStyle: { fontFamily: Fonts.heavy, fontSize: 11, letterSpacing: 0.5, marginTop: 2 },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon name="home" tint={c.primary} muted={c.muted} focused={focused} />, tabBarActiveTintColor: c.primary }}
      />
      <Tabs.Screen
        name="beat"
        options={{ title: 'Beat', tabBarIcon: ({ focused }) => <TabIcon name="heart" tint={c.beat} muted={c.muted} focused={focused} />, tabBarActiveTintColor: c.beat }}
      />
      <Tabs.Screen
        name="budget"
        options={{ title: 'Budget', tabBarIcon: ({ focused }) => <TabIcon name="wallet" tint={c.blue} muted={c.muted} focused={focused} />, tabBarActiveTintColor: c.blue }}
      />
      <Tabs.Screen
        name="grocery"
        options={{ title: 'Grocery', tabBarIcon: ({ focused }) => <TabIcon name="cart" tint={c.orange} muted={c.muted} focused={focused} />, tabBarActiveTintColor: c.orange }}
      />
      {/* Leftover screen from the Expo starter template; hidden from the tab bar. */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="auto" />
        <AppTabs />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
