import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type DailyDecision,
  useCreateDailyDecision,
  useCrusade,
  useDailyDecisions,
  useDeleteDailyDecision,
} from '@/api/hooks';
import { Button, DateField, NumberField, TextareaField } from '@/components/ui/fields';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);
type Draft = { decided_on: string; salvations: number | ''; rededications: number | ''; healings: number | ''; counselled: number | ''; notes: string };
const empty = (): Draft => ({ decided_on: today(), salvations: '', rededications: '', healings: '', counselled: '', notes: '' });
const n = (v: number | '') => (typeof v === 'number' ? v : 0);

export function DailyDecisionsScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: records, isLoading } = useDailyDecisions();
  const createRec = useCreateDailyDecision();
  const deleteRec = useDeleteDailyDecision();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => records ?? [], [records]);
  const totalSalvations = list.reduce((s, r) => s + r.salvations, 0);
  const totalCounselled = list.reduce((s, r) => s + r.counselled, 0);

  const close = () => { setShowForm(false); setDraft(empty()); };
  const add = async () => {
    if (!crusade || draft.decided_on === '' || createRec.isPending) return;
    await createRec.mutateAsync({
      crusade_id: crusade.id, decided_on: draft.decided_on,
      salvations: n(draft.salvations), rededications: n(draft.rededications),
      healings: n(draft.healings), counselled: n(draft.counselled),
      notes: draft.notes.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹ Back to forms</Text></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Daily Decisions</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>D15</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{totalSalvations.toLocaleString()}</Text>
          <Text style={styles.statLabel}>total salvations · {totalCounselled.toLocaleString()} counselled</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No nights logged yet.</Text>
          ) : (
            list.map((r: DailyDecision, i) => {
              const total = r.salvations + r.rededications + r.healings + r.counselled;
              return (
                <View key={r.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{r.decided_on}</Text>
                    <Text style={styles.sub}>{r.salvations} sal · {r.rededications} red · {r.healings} heal · {r.counselled} couns</Text>
                  </View>
                  <Text style={styles.total}>{total.toLocaleString()}</Text>
                  <Pressable onPress={() => deleteRec.mutate(r.id)} hitSlop={8}><Text style={styles.remove}>×</Text></Pressable>
                </View>
              );
            })
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowForm(true)}><Text style={styles.addToggleText}>Log decisions</Text></Pressable>
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Log decisions">
        <DateField label="Decisions on" required value={draft.decided_on} onChange={(v) => setDraft({ ...draft, decided_on: v })} />
        <NumberField label="Salvations" suffix="people" value={draft.salvations} onChange={(v) => setDraft({ ...draft, salvations: v })} />
        <NumberField label="Rededications" suffix="people" value={draft.rededications} onChange={(v) => setDraft({ ...draft, rededications: v })} />
        <NumberField label="Healings" suffix="people" value={draft.healings} onChange={(v) => setDraft({ ...draft, healings: v })} />
        <NumberField label="Counselled" suffix="people" value={draft.counselled} onChange={(v) => setDraft({ ...draft, counselled: v })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createRec.isPending ? 'Saving…' : 'Save decisions'} onPress={add} disabled={createRec.isPending || draft.decided_on === ''} />
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
