import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type DailyProgram,
  useCreateDailyProgram,
  useCrusade,
  useDailyPrograms,
  useDeleteDailyProgram,
} from '@/api/hooks';
import { Button, DateField, NumberField, TextField, TextareaField } from '@/components/ui/fields';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);
type Draft = { occurred_on: string; speaker: string; topic: string; duration_minutes: number | ''; key_moments: string; narrative: string };
const empty = (): Draft => ({ occurred_on: today(), speaker: '', topic: '', duration_minutes: '', key_moments: '', narrative: '' });

export function DailyProgramScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: records, isLoading } = useDailyPrograms();
  const createRec = useCreateDailyProgram();
  const deleteRec = useDeleteDailyProgram();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => records ?? [], [records]);

  const close = () => { setShowForm(false); setDraft(empty()); };
  const add = async () => {
    if (!crusade || draft.occurred_on === '' || createRec.isPending) return;
    await createRec.mutateAsync({
      crusade_id: crusade.id,
      occurred_on: draft.occurred_on,
      speaker: draft.speaker.trim() || null,
      topic: draft.topic.trim() || null,
      duration_minutes: draft.duration_minutes === '' ? null : Number(draft.duration_minutes),
      key_moments: draft.key_moments.trim() || null,
      narrative: draft.narrative.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹ Back to forms</Text></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Daily Program</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>D16</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{list.length.toLocaleString()}</Text>
          <Text style={styles.statLabel}>{list.length === 1 ? 'night logged' : 'nights logged'}</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No nights logged yet.</Text>
          ) : (
            list.map((r: DailyProgram, i) => (
              <View key={r.id} style={[styles.row, i > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.occurred_on}{r.topic ? ` · ${r.topic}` : ''}</Text>
                  <Text style={styles.sub}>{r.speaker ?? '—'}{r.duration_minutes != null ? ` · ${r.duration_minutes} min` : ''}</Text>
                </View>
                <Pressable onPress={() => deleteRec.mutate(r.id)} hitSlop={8}><Text style={styles.remove}>×</Text></Pressable>
              </View>
            ))
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowForm(true)}><Text style={styles.addToggleText}>Log a night</Text></Pressable>
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Log a night">
        <DateField label="Occurred on" required value={draft.occurred_on} onChange={(v) => setDraft({ ...draft, occurred_on: v })} />
        <TextField label="Speaker" placeholder="e.g. Bishop Lovell" value={draft.speaker} onChange={(v) => setDraft({ ...draft, speaker: v })} />
        <TextField label="Topic / sermon" placeholder="optional" value={draft.topic} onChange={(v) => setDraft({ ...draft, topic: v })} />
        <NumberField label="Duration" suffix="min" value={draft.duration_minutes} onChange={(v) => setDraft({ ...draft, duration_minutes: v })} />
        <TextareaField label="Key moments" placeholder="e.g. Healing service erupted at 9pm; technician swap during worship…" value={draft.key_moments} onChange={(v) => setDraft({ ...draft, key_moments: v })} />
        <TextareaField label="Narrative" placeholder="Free-form notes about the night" value={draft.narrative} onChange={(v) => setDraft({ ...draft, narrative: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createRec.isPending ? 'Saving…' : 'Save log'} onPress={add} disabled={createRec.isPending || draft.occurred_on === ''} />
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
  remove: { fontSize: 18, color: sand.ink3, paddingLeft: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
  addToggle: { marginTop: space.lg, borderWidth: 1.5, borderColor: sand.ink, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  addToggleText: { fontSize: 14, fontWeight: '600', color: sand.ink },
});
