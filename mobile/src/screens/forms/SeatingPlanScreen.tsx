import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type SeatingPlan,
  useCrusade,
  useSeatingPlan,
  useUpsertSeatingPlan,
} from '@/api/hooks';
import { Button, NumberField, TextField, TextareaField } from '@/components/ui/fields';
import { FormHeader } from '@/components/ui/FormHeader';
import { cardSurface, sand, space } from '@/theme/tokens';

type Draft = {
  estimated_capacity: number | '';
  vip_seating_count: number | '';
  general_seating_count: number | '';
  counsellor_area_count: number | '';
  chair_source: string;
  layout_notes: string;
};

const draftFromPlan = (p: SeatingPlan | null): Draft => ({
  estimated_capacity: p?.estimated_capacity ?? '',
  vip_seating_count: p?.vip_seating_count ?? '',
  general_seating_count: p?.general_seating_count ?? '',
  counsellor_area_count: p?.counsellor_area_count ?? '',
  chair_source: p?.chair_source ?? '',
  layout_notes: p?.layout_notes ?? '',
});

const n = (v: number | '') => (typeof v === 'number' ? v : 0);

export function SeatingPlanScreen() {
  useCrusade();
  const { data: plan, isLoading } = useSeatingPlan();
  const upsert = useUpsertSeatingPlan();

  const [draft, setDraft] = useState<Draft>(draftFromPlan(null));
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    if (isLoading || hasHydrated) return;
    setDraft(draftFromPlan(plan ?? null));
    setHasHydrated(true);
  }, [plan, isLoading, hasHydrated]);

  const totalAllocated = n(draft.vip_seating_count) + n(draft.general_seating_count) + n(draft.counsellor_area_count);
  const target = n(draft.estimated_capacity);
  const variance = target > 0 ? totalAllocated - target : 0;

  const save = async () => {
    if (upsert.isPending) return;
    setSaveOk(false);
    await upsert.mutateAsync({
      estimated_capacity: draft.estimated_capacity === '' ? null : Number(draft.estimated_capacity),
      vip_seating_count: draft.vip_seating_count === '' ? null : Number(draft.vip_seating_count),
      general_seating_count: draft.general_seating_count === '' ? null : Number(draft.general_seating_count),
      counsellor_area_count: draft.counsellor_area_count === '' ? null : Number(draft.counsellor_area_count),
      chair_source: draft.chair_source.trim() || null,
      layout_notes: draft.layout_notes.trim() || null,
    });
    setSaveOk(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader
          title="Seating & Capacity"
          pillar="V13"
          statNum={totalAllocated.toLocaleString()}
          statLabel={`seats allocated · ${target.toLocaleString()} capacity target${target > 0 ? ` · ${variance === 0 ? 'on target' : variance < 0 ? `${Math.abs(variance).toLocaleString()} short` : `${variance.toLocaleString()} over`}` : ''}`}
        />

        {isLoading || !hasHydrated ? (
          <ActivityIndicator style={{ margin: space.xl }} />
        ) : (
          <>
            <View style={styles.card}>
              <NumberField label="Estimated capacity" suffix="seats" value={draft.estimated_capacity} onChange={(v) => setDraft({ ...draft, estimated_capacity: v })} />
              <NumberField label="VIP seating" suffix="seats" value={draft.vip_seating_count} onChange={(v) => setDraft({ ...draft, vip_seating_count: v })} />
              <NumberField label="General seating" suffix="seats" value={draft.general_seating_count} onChange={(v) => setDraft({ ...draft, general_seating_count: v })} />
              <NumberField label="Counsellor area" suffix="seats" value={draft.counsellor_area_count} onChange={(v) => setDraft({ ...draft, counsellor_area_count: v })} />
              <TextField label="Chair source" placeholder="e.g. Wa Hotel Rentals" value={draft.chair_source} onChange={(v) => setDraft({ ...draft, chair_source: v })} />
              <TextareaField label="Layout notes" placeholder="Stage at north end, VIP front-right, counsellors back-left, two main aisles…" value={draft.layout_notes} onChange={(v) => setDraft({ ...draft, layout_notes: v })} />
            </View>

            {saveOk ? <Text style={styles.savedNote}>Saved.</Text> : null}

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
  card: { ...cardSurface, paddingHorizontal: space.lg, paddingVertical: space.sm, marginTop: space.lg },
  savedNote: { fontSize: 12, color: sand.ok, marginTop: space.md },
  saveRow: { flexDirection: 'row', marginTop: space.lg },
});
