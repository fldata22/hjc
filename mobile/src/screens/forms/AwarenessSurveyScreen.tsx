import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type AwarenessSurveyRow,
  type Zone,
  useAwarenessSurveys,
  useCreateAwarenessSurvey,
  useCrusade,
  useZones,
} from '@/api/hooks';
import { Button, DateField, NumberField } from '@/components/ui/fields';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, sand, space } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

type RowDraft = { zone_id: number; surveyed: number | ''; attending: number | '' };
const emptyRows = (zones: Zone[]): RowDraft[] => zones.map((z) => ({ zone_id: z.id, surveyed: '', attending: '' }));

const formatTakenOn = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

type WaveSummary = {
  survey_number: number;
  zones_count: number;
  pct: number;
  taken_on: string;
  rows: AwarenessSurveyRow[];
};

function summarizeWaves(rows: AwarenessSurveyRow[]): WaveSummary[] {
  const byWave = new Map<number, AwarenessSurveyRow[]>();
  for (const r of rows) {
    const list = byWave.get(r.survey_number) ?? [];
    list.push(r);
    byWave.set(r.survey_number, list);
  }
  return Array.from(byWave.entries())
    .map(([survey_number, rs]) => {
      const surveyed = rs.reduce((s, r) => s + r.surveyed_count, 0);
      const attending = rs.reduce((s, r) => s + r.attending_yes_count, 0);
      const taken_on = rs.map((r) => r.taken_on).sort().slice(-1)[0] ?? '';
      return {
        survey_number,
        zones_count: rs.length,
        pct: surveyed > 0 ? Math.round((attending / surveyed) * 100) : 0,
        taken_on,
        rows: rs,
      };
    })
    .sort((a, b) => b.survey_number - a.survey_number);
}

export function AwarenessSurveyScreen() {
  const { data: crusade } = useCrusade();
  const { data: zones } = useZones();
  const { data: surveys, isLoading } = useAwarenessSurveys();
  const createMutation = useCreateAwarenessSurvey();

  const defaultWave = useMemo(() => {
    if (!surveys || surveys.length === 0) return 1;
    return Math.max(...surveys.map((r) => r.survey_number));
  }, [surveys]);

  const wavesSummary = useMemo(() => summarizeWaves(surveys ?? []), [surveys]);

  const currentWaveStats = useMemo(() => {
    if (!surveys) return { zones_logged: 0, pct: null as number | null };
    const inWave = surveys.filter((r) => r.survey_number === defaultWave);
    const surveyed = inWave.reduce((s, r) => s + r.surveyed_count, 0);
    const attending = inWave.reduce((s, r) => s + r.attending_yes_count, 0);
    return {
      zones_logged: inWave.length,
      pct: surveyed > 0 ? Math.round((attending / surveyed) * 100) : null,
    };
  }, [surveys, defaultWave]);

  const zoneById = useMemo(() => new Map((zones ?? []).map((z) => [z.id, z] as const)), [zones]);

  const [showForm, setShowForm] = useState(false);
  const [waveNumber, setWaveNumber] = useState<number | ''>('');
  const [takenOn, setTakenOn] = useState<string>(today());
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [submittedZoneIds, setSubmittedZoneIds] = useState<Set<number>>(new Set());
  const [expandedWave, setExpandedWave] = useState<number | null>(null);

  const openForm = () => {
    if (!zones) return;
    setWaveNumber(defaultWave);
    setTakenOn(today());
    setRows(emptyRows(zones));
    setSubmittedZoneIds(new Set());
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const updateRow = (zone_id: number, patch: Partial<RowDraft>) => {
    setRows((rs) => rs.map((r) => (r.zone_id === zone_id ? { ...r, ...patch } : r)));
  };

  const rowHasMismatch = (r: RowDraft): boolean => {
    const a = typeof r.attending === 'number' ? r.attending : 0;
    const s = typeof r.surveyed === 'number' ? r.surveyed : 0;
    return a > s;
  };

  const validRows = rows.filter(
    (r) => typeof r.surveyed === 'number' && r.surveyed > 0 && !submittedZoneIds.has(r.zone_id),
  );
  const anyMismatch = rows.some(rowHasMismatch);
  const canSubmit =
    typeof waveNumber === 'number' &&
    waveNumber > 0 &&
    !!takenOn &&
    validRows.length > 0 &&
    !anyMismatch &&
    !createMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !crusade) return;
    const results = await Promise.allSettled(
      validRows.map((r) =>
        createMutation.mutateAsync({
          crusade_id: crusade.id,
          zone_id: r.zone_id,
          survey_number: waveNumber as number,
          surveyed_count: r.surveyed as number,
          attending_yes_count: typeof r.attending === 'number' ? r.attending : 0,
          taken_on: takenOn,
        }),
      ),
    );
    const succeededZoneIds = results
      .map((res, i) => ({ res, row: validRows[i] }))
      .filter(({ res }) => res.status === 'fulfilled')
      .map(({ row }) => row.zone_id);
    if (succeededZoneIds.length > 0) {
      setSubmittedZoneIds((prev) => {
        const next = new Set(prev);
        succeededZoneIds.forEach((id) => next.add(id));
        return next;
      });
    }
    const failures = results.filter((res) => res.status === 'rejected');
    if (failures.length === 0) closeForm();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader
          title="Awareness Survey"
          pillar="A9"
          statNum={`Wave ${defaultWave}`}
          statLabel={`${currentWaveStats.zones_logged} zone${currentWaveStats.zones_logged === 1 ? '' : 's'} logged · ${currentWaveStats.pct === null ? '—' : `${currentWaveStats.pct}%`} aware`}
        />

        <Text style={styles.catHead}>Past waves</Text>
        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : wavesSummary.length === 0 ? (
            <Text style={styles.empty}>No surveys logged yet.</Text>
          ) : (
            wavesSummary.map((w, i) => {
              const open = expandedWave === w.survey_number;
              return (
                <View key={w.survey_number} style={i > 0 && styles.divider}>
                  <Pressable
                    style={styles.row}
                    onPress={() => setExpandedWave(open ? null : w.survey_number)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>Wave {w.survey_number}</Text>
                      <Text style={styles.sub}>
                        {w.zones_count} zone{w.zones_count === 1 ? '' : 's'} · {w.pct}% · {formatTakenOn(w.taken_on)}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{open ? '⌃' : '›'}</Text>
                  </Pressable>
                  {open ? (
                    <View style={styles.expand}>
                      {w.rows.map((r) => {
                        const zone = zoneById.get(r.zone_id);
                        const pct = r.surveyed_count > 0 ? Math.round((r.attending_yes_count / r.surveyed_count) * 100) : 0;
                        return (
                          <View key={r.id} style={styles.expandRow}>
                            <Text style={styles.expandText}>{zone?.name ?? `Zone #${r.zone_id}`}</Text>
                            <Text style={styles.expandText}>{r.attending_yes_count}/{r.surveyed_count} · {pct}%</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <AddButton label="Log new wave" onPress={openForm} />
      </ScrollView>

      <Sheet open={showForm} onClose={closeForm} title="Log wave">
        <NumberField label="Wave number" required value={waveNumber} onChange={setWaveNumber} />
        <DateField label="Taken on" required value={takenOn} onChange={setTakenOn} />

        <Text style={styles.zonesHead}>Zones</Text>
        {rows.map((r) => {
          const zone = zoneById.get(r.zone_id);
          const mismatch = rowHasMismatch(r);
          const done = submittedZoneIds.has(r.zone_id);
          return (
            <View key={r.zone_id} style={styles.zoneRow}>
              <View style={styles.zoneRowTop}>
                <Text style={[styles.zoneName, done && { color: sand.ink3 }]}>{zone?.name ?? `Zone #${r.zone_id}`}</Text>
                <View style={styles.zoneInputs}>
                  <TextInput
                    style={styles.zoneInput}
                    placeholder="surveyed"
                    placeholderTextColor={sand.ink3}
                    keyboardType="number-pad"
                    editable={!done}
                    value={r.surveyed === '' ? '' : String(r.surveyed)}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^0-9]/g, '');
                      updateRow(r.zone_id, { surveyed: clean === '' ? '' : Number(clean) });
                    }}
                  />
                  <TextInput
                    style={styles.zoneInput}
                    placeholder="attending"
                    placeholderTextColor={sand.ink3}
                    keyboardType="number-pad"
                    editable={!done}
                    value={r.attending === '' ? '' : String(r.attending)}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^0-9]/g, '');
                      updateRow(r.zone_id, { attending: clean === '' ? '' : Number(clean) });
                    }}
                  />
                </View>
              </View>
              {mismatch ? <Text style={styles.fieldError}>can&apos;t exceed surveyed</Text> : null}
              {done ? <Text style={styles.fieldDone}>logged ✓</Text> : null}
            </View>
          );
        })}

        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={closeForm} />
          <Button
            label={createMutation.isPending ? 'Submitting…' : 'Submit wave'}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  catHead: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: sand.ink3, marginTop: space.xl, marginBottom: space.sm, textTransform: 'uppercase' },
  card: { ...cardSurface, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  chevron: { fontSize: 16, color: sand.ink3, paddingLeft: 4 },
  expand: { paddingBottom: 12, paddingLeft: space.md },
  expandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  expandText: { fontSize: 12, color: sand.ink2, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },

  zonesHead: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: sand.ink3, marginTop: space.lg, marginBottom: space.xs, textTransform: 'uppercase' },
  zoneRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: sand.line },
  zoneRowTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  zoneName: { flex: 0, width: 96, fontSize: 13, color: sand.ink2 },
  zoneInputs: { flex: 1, flexDirection: 'row', gap: space.sm },
  zoneInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: sand.line2, paddingVertical: 6, fontSize: 14, color: sand.ink },
  fieldError: { fontSize: 11, color: sand.risk, marginTop: 4 },
  fieldDone: { fontSize: 11, color: sand.ok, marginTop: 4 },
});
