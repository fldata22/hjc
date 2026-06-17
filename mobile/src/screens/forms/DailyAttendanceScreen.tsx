import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type DailyAttendance,
  useCreateDailyAttendance,
  useCrusade,
  useDailyAttendance,
  useDeleteDailyAttendance,
} from '@/api/hooks';
import { Button, DateField, NumberField, SelectField, TextareaField } from '@/components/ui/fields';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);
const METHODS = [
  { value: 'head_count', label: 'Head count' },
  { value: 'aerial_estimate', label: 'Aerial estimate' },
  { value: 'turnstile', label: 'Turnstile / gate' },
  { value: 'usher_tally', label: 'Usher tally' },
  { value: 'photo_estimate', label: 'Photo estimate' },
  { value: 'other', label: 'Other' },
];
const methodLabel = (v: string | null) => METHODS.find((m) => m.value === v)?.label ?? v ?? '—';

type Draft = { counted_on: string; count: number | ''; estimation_method: string; notes: string };
const empty = (): Draft => ({ counted_on: today(), count: '', estimation_method: '', notes: '' });

export function DailyAttendanceScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: records, isLoading } = useDailyAttendance();
  const createRec = useCreateDailyAttendance();
  const deleteRec = useDeleteDailyAttendance();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => records ?? [], [records]);
  const peak = list.reduce((m, r) => Math.max(m, r.count), 0);

  const close = () => { setShowForm(false); setDraft(empty()); };
  const canSave = draft.counted_on !== '' && typeof draft.count === 'number' && draft.count >= 0 && !createRec.isPending;
  const add = async () => {
    if (!crusade || !canSave) return;
    await createRec.mutateAsync({
      crusade_id: crusade.id, counted_on: draft.counted_on, count: Number(draft.count),
      estimation_method: draft.estimation_method || null, notes: draft.notes.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹ Back to forms</Text></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Daily Attendance</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>D14</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{peak.toLocaleString()}</Text>
          <Text style={styles.statLabel}>peak night · {list.length} {list.length === 1 ? 'night' : 'nights'} logged</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No counts logged yet.</Text>
          ) : (
            list.map((r: DailyAttendance, i) => (
              <View key={r.id} style={[styles.row, i > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.counted_on}</Text>
                  <Text style={styles.sub}>{methodLabel(r.estimation_method)}</Text>
                </View>
                <Text style={styles.total}>{r.count.toLocaleString()}</Text>
                <Pressable onPress={() => deleteRec.mutate(r.id)} hitSlop={8}><Text style={styles.remove}>×</Text></Pressable>
              </View>
            ))
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowForm(true)}><Text style={styles.addToggleText}>Log a count</Text></Pressable>
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Log attendance">
        <DateField label="Counted on" required value={draft.counted_on} onChange={(v) => setDraft({ ...draft, counted_on: v })} />
        <NumberField label="Count" required suffix="people" value={draft.count} onChange={(v) => setDraft({ ...draft, count: v })} />
        <SelectField label="Method" options={METHODS} value={draft.estimation_method} onChange={(v) => setDraft({ ...draft, estimation_method: v })} placeholder="How counted…" />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createRec.isPending ? 'Saving…' : 'Save count'} onPress={add} disabled={!canSave} />
        </SheetActions>
      </Sheet>
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
  statStrip: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap' },
  statNum: { fontSize: 30, fontWeight: '800', color: sand.ink },
  statLabel: { fontSize: 13, color: sand.ink3 },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  total: { fontSize: 14, fontWeight: '700', color: sand.ink2, fontVariant: ['tabular-nums'] },
  remove: { fontSize: 18, color: sand.ink3, paddingLeft: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
  addToggle: { marginTop: space.lg, borderWidth: 1.5, borderColor: sand.ink, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  addToggleText: { fontSize: 14, fontWeight: '600', color: sand.ink },
});
