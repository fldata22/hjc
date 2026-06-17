import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityQuickLogScreen } from '@/screens/forms/ActivityQuickLogScreen';
import { BOTScreen } from '@/screens/forms/BOTScreen';
import { CPCScreen } from '@/screens/forms/CPCScreen';
import { DailyAttendanceScreen } from '@/screens/forms/DailyAttendanceScreen';
import { DailyDecisionsScreen } from '@/screens/forms/DailyDecisionsScreen';
import { DailyExpensesScreen } from '@/screens/forms/DailyExpensesScreen';
import { DailyProgramScreen } from '@/screens/forms/DailyProgramScreen';
import { MediaCoverageScreen } from '@/screens/forms/MediaCoverageScreen';
import { MedicalIncidentsScreen, SecurityIncidentsScreen } from '@/screens/forms/IncidentsScreen';
import { ConvoyOutreachScreen, DoorToDoorScreen } from '@/screens/forms/OutreachScreen';
import { LandEldersScreen } from '@/screens/forms/LandEldersScreen';
import { PCMScreen } from '@/screens/forms/PCMScreen';
import { PermitsScreen } from '@/screens/forms/PermitsScreen';
import { PledgeMeetingsScreen } from '@/screens/forms/PledgeMeetingsScreen';
import { StakeholdersScreen } from '@/screens/forms/StakeholdersScreen';
import { WorkersScreen } from '@/screens/forms/WorkersScreen';
import { AwarenessSurveyScreen } from '@/screens/forms/AwarenessSurveyScreen';
import { TownProfileScreen } from '@/screens/forms/TownProfileScreen';
import { PublicityAssetsScreen } from '@/screens/forms/PublicityAssetsScreen';
import { VenueInspectionScreen } from '@/screens/forms/VenueInspectionScreen';
import { MustDoChecklistScreen } from '@/screens/forms/MustDoChecklistScreen';
import { SoundLightingScreen } from '@/screens/forms/SoundLightingScreen';
import { SeatingPlanScreen } from '@/screens/forms/SeatingPlanScreen';
import { WeeklyScreen } from '@/screens/forms/WeeklyScreen';
import { sand, space } from '@/theme/tokens';

// Native form screens, keyed by slug. Slugs not listed fall back to the placeholder
// (those forms are still being ported).
const REGISTRY: Record<string, ComponentType> = {
  workers: WorkersScreen,
  bot: BOTScreen,
  cpc: CPCScreen,
  stakeholders: StakeholdersScreen,
  fathers: LandEldersScreen,
  pcm: PCMScreen,
  'daily-decisions': DailyDecisionsScreen,
  'daily-attendance': DailyAttendanceScreen,
  'daily-expenses': DailyExpensesScreen,
  'daily-program': DailyProgramScreen,
  'daily-security': SecurityIncidentsScreen,
  'daily-medical': MedicalIncidentsScreen,
  'media-coverage': MediaCoverageScreen,
  'activity-quick-log': ActivityQuickLogScreen,
  permits: PermitsScreen,
  'pledge-meetings': PledgeMeetingsScreen,
  'door-to-door': DoorToDoorScreen,
  convoy: ConvoyOutreachScreen,
  'awareness-survey': AwarenessSurveyScreen,
  'town-profile': TownProfileScreen,
  publicity: PublicityAssetsScreen,
  'venue-inspection': VenueInspectionScreen,
  'must-do': MustDoChecklistScreen,
  'sound-lighting': SoundLightingScreen,
  'seating-plan': SeatingPlanScreen,
  weekly: WeeklyScreen,
};

const TITLES: Record<string, string> = {};

export default function FormRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const Screen = REGISTRY[slug ?? ''];
  if (Screen) return <Screen />;

  const title = TITLES[slug ?? ''] ?? 'Form';
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back to forms</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>
          This screen is being ported to native. The data and API are already wired — the native
          UI for this form is on the way.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  container: { flex: 1, padding: space.xl },
  back: { fontSize: 14, color: sand.ink2, marginBottom: space.lg },
  title: { fontSize: 24, fontWeight: '700', color: sand.ink },
  note: { fontSize: 14, color: sand.ink3, marginTop: space.md, lineHeight: 20 },
});
