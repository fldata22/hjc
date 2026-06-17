import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { sand } from '@/theme/tokens';

const glyph =
  (g: string) =>
  ({ color }: { color: ColorValue }) =>
    <Text style={{ color, fontSize: 18 }}>{g}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: sand.ink,
        tabBarInactiveTintColor: sand.ink3,
        tabBarStyle: {
          backgroundColor: sand.surface,
          borderTopColor: sand.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: glyph('⌂') }} />
      <Tabs.Screen name="forms" options={{ title: 'Forms', tabBarIcon: glyph('≡') }} />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: glyph('◉') }} />
    </Tabs>
  );
}
