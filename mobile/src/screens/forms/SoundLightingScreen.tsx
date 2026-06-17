import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type SoundLightingPlan,
  useCrusade,
  useSoundLightingPlan,
  useUpsertSoundLightingPlan,
} from '@/api/hooks';
import { Button, NumberField, SegmentedField, TextField, TextareaField } from '@/components/ui/fields';
import { cardSurface, radius, sand, space } from '@/theme/tokens';

type Draft = {
  sound_provider: string;
  sound_capacity_notes: string;
  lighting_provider: string;
  lighting_setup_notes: string;
  generator_provider: string;
  generator_kva: number | '';
  has_backup_power: boolean;
  power_notes: string;
  equipment_notes: string;
};

const draftFromPlan = (p: SoundLightingPlan | null): Draft => ({
  sound_provider: p?.sound_provider ?? '',
  sound_capacity_notes: p?.sound_capacity_notes ?? '',
  lighting_provider: p?.lighting_provider ?? '',
  lighting_setup_notes: p?.lighting_setup_notes ?? '',
  generator_provider: p?.generator_provider ?? '',
  generator_kva: p?.generator_kva ?? '',
  has_backup_power: p?.has_backup_power ?? false,
  power_notes: p?.power_notes ?? '',
  equipment_notes: p?.equipment_notes ?? '',
});

export function SoundLightingScreen() {
  const router = useRouter();
  useCrusade();
  const { data: plan, isLoading } = useSoundLightingPlan();
  const upsert = useUpsertSoundLightingPlan();

  const [draft, setDraft] = useState<Draft>(draftFromPlan(null));
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    if (isLoading || hasHydrated) return;
    setDraft(draftFromPlan(plan ?? null));
    setHasHydrated(true);
  }, [plan, isLoading, hasHydrated]);

  const save = async () => {
    if (upsert.isPending) return;
    setSaveOk(false);
    await upsert.mutateAsync({
      sound_provider: draft.sound_provider.trim() || null,
      sound_capacity_notes: draft.sound_capacity_notes.trim() || null,
      lighting_provider: draft.lighting_provider.trim() || null,
      lighting_setup_notes: draft.lighting_setup_notes.trim() || null,
      generator_provider: draft.generator_provider.trim() || null,
      generator_kva: draft.generator_kva === '' ? null : Number(draft.generator_kva),
      has_backup_power: draft.has_backup_power,
      power_notes: draft.power_notes.trim() || null,
      equipment_notes: draft.equipment_notes.trim() || null,
    });
    setSaveOk(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹ Back to forms</Text></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Sound & Lighting</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>V12</Text></View>
        </View>

        {isLoading || !hasHydrated ? (
          <ActivityIndicator style={{ marginTop: space.xxl }} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.section}>Sound</Text>
              <TextField label="Sound provider" placeholder="e.g. Acme Sound Co" value={draft.sound_provider} onChange={(v) => setDraft({ ...draft, sound_provider: v })} />
              <TextareaField label="Capacity notes" placeholder="e.g. 30kW main system, coverage 200m radius" value={draft.sound_capacity_notes} onChange={(v) => setDraft({ ...draft, sound_capacity_notes: v })} />
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>Lighting</Text>
              <TextField label="Lighting provider" placeholder="optional" value={draft.lighting_provider} onChange={(v) => setDraft({ ...draft, lighting_provider: v })} />
              <TextareaField label="Setup notes" value={draft.lighting_setup_notes} onChange={(v) => setDraft({ ...draft, lighting_setup_notes: v })} />
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>Power</Text>
              <TextField label="Generator provider" value={draft.generator_provider} onChange={(v) => setDraft({ ...draft, generator_provider: v })} />
              <NumberField label="Generator kVA" suffix="kVA" value={draft.generator_kva} onChange={(v) => setDraft({ ...draft, generator_kva: v })} />
              <SegmentedField
                label="Backup power"
                options={[
                  { value: 'no', label: 'None' },
                  { value: 'yes', label: 'Backup ready' },
                ]}
                value={draft.has_backup_power ? 'yes' : 'no'}
                onChange={(v) => setDraft({ ...draft, has_backup_power: v === 'yes' })}
              />
              <TextareaField label="Power notes" value={draft.power_notes} onChange={(v) => setDraft({ ...draft, power_notes: v })} />
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>Equipment</Text>
              <TextareaField label="Equipment notes" placeholder="Free-form list: mics, mixers, monitors, cables, stands…" value={draft.equipment_notes} onChange={(v) => setDraft({ ...draft, equipment_notes: v })} />
            </View>

            {saveOk ? <Text style={styles.saveOk}>Saved.</Text> : null}

            <View style={styles.saveRow}>
              <Button label={upsert.isPending ? 'Saving…' : 'Save plan'} onPress={save} disabled={upsert.isPending} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  back: { fontSize: 14, color: sand.ink2, marginBottom: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: sand.ink },
  pillarBadge: { backgroundColor: sand.accentBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillarText: { fontSize: 11, fontWeight: '800', color: sand.accent },
  card: { ...cardSurface, paddingHorizontal: space.lg, paddingVertical: space.sm, marginTop: space.lg },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: sand.ink3, paddingTop: space.md, paddingBottom: 2 },
  saveOk: { fontSize: 12, color: sand.ok, marginTop: space.lg, textAlign: 'center' },
  saveRow: { flexDirection: 'row', marginTop: space.lg },
});
