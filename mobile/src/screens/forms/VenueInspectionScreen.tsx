import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type VenueInspection,
  useCreateVenueInspection,
  useCrusade,
  useVenueInspections,
} from '@/api/hooks';
import { Button, DateField, SegmentedField, TextField, TextareaField } from '@/components/ui/fields';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

type CheckKey = 'capacity_verified' | 'exits_clear' | 'power_tested' | 'sound_tested';
type Draft = {
  inspected_at: string;
  inspector_name: string;
  capacity_verified: boolean;
  exits_clear: boolean;
  power_tested: boolean;
  sound_tested: boolean;
  permits_status: string;
  notes: string;
};
const empty = (): Draft => ({
  inspected_at: today(),
  inspector_name: '',
  capacity_verified: false,
  exits_clear: false,
  power_tested: false,
  sound_tested: false,
  permits_status: '',
  notes: '',
});

const CHECKS: Array<{ key: CheckKey; label: string }> = [
  { key: 'capacity_verified', label: 'Capacity verified' },
  { key: 'exits_clear', label: 'Exits clear' },
  { key: 'power_tested', label: 'Power tested' },
  { key: 'sound_tested', label: 'Sound tested' },
];

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function VenueInspectionScreen() {
  const { data: crusade } = useCrusade();
  const { data: inspections, isLoading } = useVenueInspections();
  const createRec = useCreateVenueInspection();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => inspections ?? [], [inspections]);

  const canSave =
    !!crusade && draft.inspector_name.trim() !== '' && draft.inspected_at !== '' && !createRec.isPending;

  const close = () => { setShowForm(false); setDraft(empty()); };
  const add = async () => {
    if (!canSave || !crusade) return;
    await createRec.mutateAsync({
      crusade_id: crusade.id,
      inspected_at: draft.inspected_at,
      inspector_name: draft.inspector_name.trim(),
      capacity_verified: draft.capacity_verified,
      exits_clear: draft.exits_clear,
      power_tested: draft.power_tested,
      sound_tested: draft.sound_tested,
      permits_status: draft.permits_status.trim() || null,
      notes: draft.notes.trim() || null,
      photo: null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Venue Inspection" pillar="V10" statNum={list.length.toLocaleString()} statLabel="inspections logged" />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No inspections logged yet.</Text>
          ) : (
            list.map((i: VenueInspection, idx) => {
              const checks = [i.capacity_verified, i.exits_clear, i.power_tested, i.sound_tested].filter(Boolean);
              const total = 4;
              const allClear = checks.length === total;
              const sc = allClear ? statusColors.confirmed : statusColors.pending;
              return (
                <View key={i.id} style={[styles.row, idx > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{i.inspected_at}</Text>
                    <Text style={styles.sub}>
                      {i.inspector_name} · {checks.length}/{total} checks{i.photo_url ? ' · 📷' : ''}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.pillText, { color: sc.fg }]}>{allClear ? 'All clear' : 'Partial'}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <AddButton label="Add inspection" onPress={() => setShowForm(true)} />
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Add inspection">
        <DateField label="Inspected on" required value={draft.inspected_at} onChange={(v) => setDraft({ ...draft, inspected_at: v })} />
        <TextField label="Inspector name" placeholder="e.g. Director Adebimpe" required value={draft.inspector_name} onChange={(v) => setDraft({ ...draft, inspector_name: v })} />
        {CHECKS.map((c) => (
          <SegmentedField
            key={c.key}
            label={c.label}
            options={YES_NO}
            value={draft[c.key] ? 'yes' : 'no'}
            onChange={(v) => setDraft({ ...draft, [c.key]: v === 'yes' })}
          />
        ))}
        <TextareaField label="Permits status" placeholder="e.g. Police: approved, Fire: pending, City: approved" value={draft.permits_status} onChange={(v) => setDraft({ ...draft, permits_status: v })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createRec.isPending ? 'Saving…' : 'Save inspection'} onPress={add} disabled={!canSave} />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
