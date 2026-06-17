import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Power,
  useCreateWeeklyAssessment,
  useCrusade,
  usePowers,
  useReplaceReadings,
  useSubmitWeeklyAssessment,
  useUpdateWeeklyAssessment,
  useWeeklyLatest,
} from '@/api/hooks';
import { Button, TextareaField } from '@/components/ui/fields';
import { FormHeader } from '@/components/ui/FormHeader';
import { cardSurface, sand, space } from '@/theme/tokens';

type RatingMap = Record<number, number>;

export function WeeklyScreen() {
  const { data: crusade } = useCrusade();
  const { data: powers } = usePowers();
  const { data: weekly, isLoading } = useWeeklyLatest();

  const createA = useCreateWeeklyAssessment();
  const replaceReadings = useReplaceReadings();
  const updateA = useUpdateWeeklyAssessment();
  const submitA = useSubmitWeeklyAssessment();

  const [ratings, setRatings] = useState<RatingMap>({});
  const [touched, setTouched] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!weekly) return;
    const initial: RatingMap = {};
    const seen = new Set<number>();
    weekly.readings?.forEach((r) => { initial[r.power_id] = Math.round(r.value_pct / 10); seen.add(r.power_id); });
    setRatings(initial);
    setTouched(seen);
    setNotes(weekly.notes ?? '');
    setDecisions(weekly.decisions_needed ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekly?.id]);

  const sortedPowers = useMemo(() => (powers ?? []).slice().sort((a, b) => a.order_index - b.order_index), [powers]);
  const total = sortedPowers.length;
  const completed = touched.size;
  const submitted = !!weekly?.submitted_at;
  const weekLabel = weekly?.week_number ?? 1;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isPending = replaceReadings.isPending || updateA.isPending || createA.isPending || submitA.isPending;

  const setRating = (powerId: number, n: number) => {
    setRatings((prev) => ({ ...prev, [powerId]: n }));
    setTouched((prev) => (prev.has(powerId) ? prev : new Set(prev).add(powerId)));
  };

  const ensureAssessment = async () => {
    if (weekly) return weekly;
    if (!crusade) throw new Error('No crusade loaded');
    return createA.mutateAsync({ crusade_id: crusade.id, week_number: 1, prompted_at: new Date().toISOString() });
  };

  const persist = async (): Promise<number | null> => {
    try {
      const a = await ensureAssessment();
      const readings = Object.entries(ratings).map(([pid, n]) => ({ power_id: Number(pid), value_pct: n * 10 }));
      if (readings.length > 0) await replaceReadings.mutateAsync({ id: a.id, readings });
      await updateA.mutateAsync({ id: a.id, body: { notes: notes || null, decisions_needed: decisions || null } });
      return a.id;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      return null;
    }
  };

  const handleSave = async () => {
    setMessage(null);
    const id = await persist();
    if (id !== null) setMessage('Saved.');
  };

  const handleSubmit = async () => {
    setMessage(null);
    const id = await persist();
    if (id === null) return;
    try {
      await submitA.mutateAsync(id);
      setMessage(`Week ${weekLabel} submitted.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Submit failed');
    }
  };

  const startNextWeek = async () => {
    if (!crusade || !weekly) return;
    try {
      await createA.mutateAsync({ crusade_id: crusade.id, week_number: weekly.week_number + 1, prompted_at: new Date().toISOString() });
      setRatings({}); setTouched(new Set()); setNotes(''); setDecisions(''); setMessage(`Started week ${weekly.week_number + 1}.`);
    } catch {
      setMessage('Could not start a new week');
    }
  };

  const saveStatus = isPending
    ? 'Saving…'
    : message ?? (submitted ? 'Submitted' : weekly ? 'Not yet saved' : 'Start a new week');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title={`Week ${weekLabel}`} />
        <View style={styles.progressRow}>
          <Text style={styles.progress}>{completed}/{total} · {pct}%</Text>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>

        <Text style={styles.desc}>
          Rate each pillar 0–10. Ops-derived pillars auto-update from form data — your rating is the manual fallback and primary signal for the qualitative pillars.
        </Text>

        {isLoading ? <ActivityIndicator style={{ marginTop: space.lg }} /> : null}

        <View style={styles.card}>
          {sortedPowers.map((p: Power, i) => {
            const r = ratings[p.id];
            return (
              <View key={p.id} style={[styles.ratingRow, i > 0 && styles.divider]}>
                <View style={styles.ratingHead}>
                  <Text style={styles.ratingName}>{p.name}</Text>
                  {r !== undefined ? <Text style={styles.ratingVal}>{r}/10 · {r * 10}%</Text> : null}
                </View>
                <View style={styles.pips}>
                  {Array.from({ length: 11 }, (_, n) => {
                    const on = n === r;
                    return (
                      <Pressable key={n} style={[styles.pip, on && styles.pipOn]} onPress={() => setRating(p.id, n)} disabled={submitted}>
                        <Text style={[styles.pipText, on && styles.pipTextOn]}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <TextareaField label="This week's notes" placeholder="What moved? What's stuck? Wins, blockers." value={notes} onChange={setNotes} />
        <TextareaField label="Decisions needed from central office" placeholder="What do you need from us?" value={decisions} onChange={setDecisions} />

        {submitted ? (
          <View style={{ marginTop: space.lg }}>
            <Button label={createA.isPending ? 'Starting…' : `Start week ${weekLabel + 1} →`} onPress={startNextWeek} disabled={createA.isPending} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actionBar}>
        <Text style={styles.status} numberOfLines={1}>{saveStatus}</Text>
        <View style={styles.actionBtns}>
          <Button label="Save" variant="ghost" onPress={handleSave} disabled={isPending || submitted} />
          <Button label={submitted ? `W${weekLabel} done` : 'Submit →'} onPress={handleSubmit} disabled={isPending || submitted} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  progressRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: space.lg },
  progress: { fontSize: 13, fontWeight: '600', color: sand.ink3 },
  track: { height: 8, borderRadius: 4, backgroundColor: sand.line, marginTop: space.sm, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: sand.accent },
  desc: { fontSize: 13, color: sand.ink3, marginTop: space.md, lineHeight: 19 },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  ratingRow: { paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  ratingHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.sm },
  ratingName: { fontSize: 15, fontWeight: '600', color: sand.ink, flex: 1 },
  ratingVal: { fontSize: 11, color: sand.ink3 },
  pips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  pip: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: sand.line2, alignItems: 'center', justifyContent: 'center' },
  pipOn: { backgroundColor: sand.ink, borderColor: sand.ink },
  pipText: { fontSize: 12, fontWeight: '600', color: sand.ink2 },
  pipTextOn: { color: sand.surface },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: sand.line, backgroundColor: sand.surface },
  status: { flex: 1, fontSize: 12, color: sand.ink3 },
  actionBtns: { flexDirection: 'row', gap: space.sm, flex: 1.4 },
});
