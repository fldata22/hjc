import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type OutreachActivity,
  type OutreachKind,
  useCreateOutreachActivity,
  useCrusade,
  useDeleteOutreachActivity,
  useOutreachActivities,
  useZones,
} from '@/api/hooks';
import { Button, DateField, NumberField, SelectField, TextField, TextareaField } from '@/components/ui/fields';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, sand, space } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);
type Draft = {
  occurred_on: string; zone_id: number | ''; team_lead_name: string;
  households_reached: number | ''; conversations_count: number | ''; pamphlets_distributed: number | '';
  route_summary: string; notes: string;
};
const empty = (): Draft => ({
  occurred_on: today(), zone_id: '', team_lead_name: '',
  households_reached: '', conversations_count: '', pamphlets_distributed: '', route_summary: '', notes: '',
});

function OutreachScreen({ kind, pillar, title, ctaLabel }: { kind: OutreachKind; pillar: string; title: string; ctaLabel: string }) {
  const { data: crusade } = useCrusade();
  const { data: zones } = useZones();
  const { data: activities, isLoading } = useOutreachActivities({ kind });
  const createRec = useCreateOutreachActivity();
  const deleteRec = useDeleteOutreachActivity();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => activities ?? [], [activities]);
  const totalReached = list.reduce((s, a) => s + (a.households_reached ?? 0), 0);
  const zoneOptions = useMemo(() => (zones ?? []).map((z) => ({ value: String(z.id), label: z.name ?? z.code })), [zones]);
  const zoneById = useMemo(() => new Map((zones ?? []).map((z) => [z.id, z] as const)), [zones]);

  const close = () => { setShowForm(false); setDraft(empty()); };
  const add = async () => {
    if (!crusade || draft.occurred_on === '' || createRec.isPending) return;
    await createRec.mutateAsync({
      crusade_id: crusade.id, kind, occurred_on: draft.occurred_on,
      zone_id: typeof draft.zone_id === 'number' ? draft.zone_id : null,
      team_lead_name: draft.team_lead_name.trim() || null,
      households_reached: draft.households_reached === '' ? null : Number(draft.households_reached),
      conversations_count: draft.conversations_count === '' ? null : Number(draft.conversations_count),
      pamphlets_distributed: draft.pamphlets_distributed === '' ? null : Number(draft.pamphlets_distributed),
      route_summary: draft.route_summary.trim() || null, notes: draft.notes.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader
          title={title}
          pillar={pillar}
          statNum={totalReached.toLocaleString()}
          statLabel={`households reached · ${list.length} ${list.length === 1 ? 'entry' : 'entries'}`}
        />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No {kind === 'door_to_door' ? 'door-to-door' : 'convoy'} entries yet.</Text>
          ) : (
            list.map((a: OutreachActivity, i) => {
              const zone = a.zone_id != null ? zoneById.get(a.zone_id) : null;
              const zoneLabel = zone?.name ?? zone?.code ?? null;
              return (
                <View key={a.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{a.occurred_on}{zoneLabel ? ` · ${zoneLabel}` : ''}</Text>
                    <Text style={styles.sub}>
                      {a.team_lead_name ?? '—'}
                      {a.households_reached != null ? ` · ${a.households_reached.toLocaleString()} reached` : ''}
                      {kind === 'door_to_door' && a.conversations_count != null ? ` · ${a.conversations_count} convos` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteRec.mutate(a.id)} hitSlop={8}><Text style={styles.remove}>×</Text></Pressable>
                </View>
              );
            })
          )}
        </View>

        <AddButton label={ctaLabel} onPress={() => setShowForm(true)} />
      </ScrollView>

      <Sheet open={showForm} onClose={close} title={ctaLabel}>
        <DateField label="Occurred on" required value={draft.occurred_on} onChange={(v) => setDraft({ ...draft, occurred_on: v })} />
        <SelectField label="Zone" options={zoneOptions} value={draft.zone_id === '' ? '' : String(draft.zone_id)} onChange={(v) => setDraft({ ...draft, zone_id: v === '' ? '' : Number(v) })} placeholder="Optional" />
        <TextField label="Team lead" placeholder="optional" value={draft.team_lead_name} onChange={(v) => setDraft({ ...draft, team_lead_name: v })} />
        <NumberField label="Households reached" value={draft.households_reached} onChange={(v) => setDraft({ ...draft, households_reached: v })} />
        {kind === 'door_to_door' ? (
          <>
            <NumberField label="Conversations" value={draft.conversations_count} onChange={(v) => setDraft({ ...draft, conversations_count: v })} />
            <NumberField label="Pamphlets distributed" value={draft.pamphlets_distributed} onChange={(v) => setDraft({ ...draft, pamphlets_distributed: v })} />
          </>
        ) : null}
        {kind === 'convoy' ? (
          <TextareaField label="Route summary" placeholder="e.g. Wa-Central → Wa-North radio drops" value={draft.route_summary} onChange={(v) => setDraft({ ...draft, route_summary: v })} />
        ) : null}
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createRec.isPending ? 'Saving…' : 'Save entry'} onPress={add} disabled={createRec.isPending || draft.occurred_on === ''} />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

export function DoorToDoorScreen() {
  return <OutreachScreen kind="door_to_door" pillar="A·all" title="Door-to-Door Outreach" ctaLabel="Log a sweep" />;
}
export function ConvoyOutreachScreen() {
  return <OutreachScreen kind="convoy" pillar="A·all" title="Convoy Outreach" ctaLabel="Log convoy run" />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  remove: { fontSize: 18, color: sand.ink3, paddingLeft: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
