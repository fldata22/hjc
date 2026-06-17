import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type ActivityEntry,
  useActivityEntries,
  useCreateActivityEntry,
  useCrusade,
  usePowers,
} from '@/api/hooks';
import { ApiError } from '@/api/client';
import { Button, SegmentedField, SelectField, TextareaField } from '@/components/ui/fields';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type Status = 'done' | 'running';
type Draft = { description: string; power_id: number | ''; status: Status };
const emptyDraft: Draft = { description: '', power_id: '', status: 'done' };

function extractApiMessage(e: unknown, fallback = 'Failed'): string {
  if (e instanceof ApiError) {
    const body = e.body;
    if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
      return (body as { message: string }).message;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function ActivityQuickLogScreen() {
  const router = useRouter();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: powers } = usePowers();
  const { data: recent } = useActivityEntries({ per_page: 10 });
  const createMutation = useCreateActivityEntry();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const powerOptions = useMemo(
    () => (powers ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` })),
    [powers],
  );

  const recentList = useMemo(() => recent?.data?.slice(0, 5) ?? [], [recent]);

  const handleSubmit = async () => {
    if (!crusade || draft.description.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    setSaveOk(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        occurred_at: new Date().toISOString(),
        description: draft.description.trim(),
        power_id: typeof draft.power_id === 'number' ? draft.power_id : undefined,
        status: draft.status,
      });
      setDraft(emptyDraft);
      setSaveOk('Logged.');
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const clear = () => { setDraft(emptyDraft); setSaveError(null); setSaveOk(null); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹ Back to forms</Text></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Activity Quick-Log</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>D19</Text></View>
        </View>

        {crusadeError ? (
          <View style={styles.card}><Text style={styles.errorText}>Couldn’t load crusade.</Text></View>
        ) : crusadeLoading || !crusade ? (
          <View style={styles.card}><ActivityIndicator style={{ margin: space.lg }} /></View>
        ) : (
          <>
            <Text style={styles.intro}>Drop a one-line note about something you just did. Examples:</Text>
            <View style={styles.exampleList}>
              <Text style={styles.example}>• “Met with 4 PCM pastors at Wa Central; 2 confirmed”</Text>
              <Text style={styles.example}>• “Convoy team finished Wa-North radio drops”</Text>
              <Text style={styles.example}>• “Permits desk at city council closed early”</Text>
            </View>

            <View style={styles.card}>
              <TextareaField
                label="What happened?"
                required
                placeholder="One or two sentences."
                value={draft.description}
                onChange={(v) => setDraft({ ...draft, description: v })}
              />
              <SelectField
                label="Power tag"
                options={powerOptions}
                value={draft.power_id === '' ? '' : String(draft.power_id)}
                onChange={(v) => setDraft({ ...draft, power_id: v === '' ? '' : Number(v) })}
                placeholder="Optional · which pillar?"
              />
              <SegmentedField
                label="Status"
                options={[
                  { value: 'done', label: 'Done' },
                  { value: 'running', label: 'In progress' },
                ]}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as Status })}
              />

              {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
              {saveOk ? <Text style={styles.saveOk}>{saveOk}</Text> : null}

              <View style={styles.actions}>
                <Button label="Clear" variant="ghost" onPress={clear} />
                <Button
                  label={createMutation.isPending ? 'Logging…' : 'Log it'}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || draft.description.trim() === ''}
                />
              </View>
            </View>

            {recentList.length > 0 && (
              <>
                <View style={styles.secLabelRow}><Text style={styles.secLabel}>RECENT · LAST 5</Text></View>
                <View style={styles.card}>
                  {recentList.map((e: ActivityEntry, i) => {
                    const tone = statusColors[e.status === 'done' ? 'confirmed' : 'pending'];
                    return (
                      <View key={e.id} style={[styles.row, i > 0 && styles.divider]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{e.description}</Text>
                          <Text style={styles.sub}>{e.power.code} · {whenLabel(e.occurred_at)}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.statusText, { color: tone.fg }]}>
                            {e.status === 'done' ? 'Done' : 'Running'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
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

  intro: { fontSize: 13, color: sand.ink3, lineHeight: 19, marginTop: space.lg },
  exampleList: { marginTop: space.sm, gap: 4 },
  example: { fontSize: 12, color: sand.ink3, lineHeight: 17 },

  card: { ...cardSurface, paddingHorizontal: space.lg, paddingVertical: space.sm, marginTop: space.lg },
  errorText: { color: sand.risk, fontSize: 13, textAlign: 'center', paddingVertical: space.lg },

  saveError: { fontSize: 12, color: sand.risk, marginTop: space.sm },
  saveOk: { fontSize: 12, color: sand.ok, marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.lg, marginBottom: space.sm },

  secLabelRow: { marginTop: space.xxl },
  secLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: sand.ink3 },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 13, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
