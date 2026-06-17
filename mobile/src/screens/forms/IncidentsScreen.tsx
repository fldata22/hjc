import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Incident,
  type IncidentKind,
  type IncidentSeverity,
  useCreateIncident,
  useCrusade,
  useDeleteIncident,
  useIncidents,
} from '@/api/hooks';
import { Button, DateField, SegmentedField, TextField, TextareaField } from '@/components/ui/fields';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);
const SEVERITIES: { value: IncidentSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
const SEVERITY_CLASS: Record<IncidentSeverity, string> = { low: 'pending', medium: 'pending', high: 'declined' };

type Draft = {
  occurred_on: string; occurred_at_time: string; severity: IncidentSeverity; location: string;
  description: string; response_taken: string; transported_to: string; resolution: string;
};
const empty = (): Draft => ({
  occurred_on: today(), occurred_at_time: '', severity: 'low', location: '',
  description: '', response_taken: '', transported_to: '', resolution: '',
});

function IncidentsScreen({ kind, pillar, title }: { kind: IncidentKind; pillar: string; title: string }) {
  const { data: crusade } = useCrusade();
  const { data: records, isLoading } = useIncidents({ kind });
  const createRec = useCreateIncident();
  const deleteRec = useDeleteIncident();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => records ?? [], [records]);
  const high = list.filter((i) => i.severity === 'high').length;
  const canSave = draft.occurred_on !== '' && draft.description.trim() !== '' && !createRec.isPending;

  const close = () => { setShowForm(false); setDraft(empty()); };
  const add = async () => {
    if (!crusade || !canSave) return;
    await createRec.mutateAsync({
      crusade_id: crusade.id, kind, occurred_on: draft.occurred_on,
      occurred_at_time: draft.occurred_at_time || null, severity: draft.severity,
      location: draft.location.trim() || null, description: draft.description.trim(),
      response_taken: draft.response_taken.trim() || null,
      transported_to: kind === 'medical' ? (draft.transported_to.trim() || null) : null,
      resolution: draft.resolution.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title={title} pillar={pillar} statNum={list.length} statLabel={`total ${kind} · ${high} high severity`} />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No {kind} incidents logged yet.</Text>
          ) : (
            list.map((i: Incident, idx) => {
              const sc = statusColors[SEVERITY_CLASS[i.severity]] ?? statusColors.pending;
              return (
                <View key={i.id} style={[styles.row, idx > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{i.description}</Text>
                    <Text style={styles.sub}>
                      {i.occurred_on}{i.occurred_at_time ? ` · ${i.occurred_at_time.slice(0, 5)}` : ''}{i.location ? ` · ${i.location}` : ''}
                      {kind === 'medical' && i.transported_to ? ` · → ${i.transported_to}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={{ color: sc.fg, fontWeight: '700', fontSize: 11 }}>{SEVERITIES.find((s) => s.value === i.severity)?.label}</Text>
                  </View>
                  <Pressable onPress={() => deleteRec.mutate(i.id)} hitSlop={8}><Text style={styles.remove}>×</Text></Pressable>
                </View>
              );
            })
          )}
        </View>

        <AddButton label={`Log ${kind} incident`} onPress={() => setShowForm(true)} />
      </ScrollView>

      <Sheet open={showForm} onClose={close} title={`Log ${kind} incident`}>
        <DateField label="Occurred on" required value={draft.occurred_on} onChange={(v) => setDraft({ ...draft, occurred_on: v })} />
        <TextField label="Time (HH:MM)" placeholder="optional" value={draft.occurred_at_time} onChange={(v) => setDraft({ ...draft, occurred_at_time: v })} />
        <SegmentedField label="Severity" required options={SEVERITIES} value={draft.severity} onChange={(v) => setDraft({ ...draft, severity: v as IncidentSeverity })} />
        <TextField label="Location" placeholder={kind === 'security' ? 'e.g. Front rail' : 'e.g. Counsellor area'} value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })} />
        <TextareaField label="Description" required placeholder={kind === 'security' ? 'What happened?' : 'Symptoms / condition'} value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
        <TextareaField label="Response taken" placeholder={kind === 'security' ? 'How was it handled?' : 'First aid given'} value={draft.response_taken} onChange={(v) => setDraft({ ...draft, response_taken: v })} />
        {kind === 'medical' ? (
          <TextField label="Transported to" placeholder="Hospital / clinic, if any" value={draft.transported_to} onChange={(v) => setDraft({ ...draft, transported_to: v })} />
        ) : null}
        <TextareaField label="Resolution" placeholder="Outcome / follow-up" value={draft.resolution} onChange={(v) => setDraft({ ...draft, resolution: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createRec.isPending ? 'Saving…' : 'Log incident'} onPress={add} disabled={!canSave} />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

export function SecurityIncidentsScreen() {
  return <IncidentsScreen kind="security" pillar="D17" title="Security Incidents" />;
}
export function MedicalIncidentsScreen() {
  return <IncidentsScreen kind="medical" pillar="D18" title="Medical Incidents" />;
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
  remove: { fontSize: 18, color: sand.ink3, paddingLeft: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
