import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/lib/auth';
import { registerAndUploadPushToken } from '@/lib/push';
import { QueryProvider } from '@/lib/query';

// Auth gate: redirect between the app and the login screen based on session status.
function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === 'login';
    if (status === 'guest' && !inAuthGroup) {
      router.replace('/login');
    } else if (status === 'authed' && inAuthGroup) {
      router.replace('/');
    }
  }, [status, segments, router]);

  // Register this device for push once signed in (no-op on simulators / before EAS link).
  useEffect(() => {
    if (status === 'authed') registerAndUploadPushToken();
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootNavigator />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
