import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Contact,
  type Worker,
  type WorkerGroup,
  useChurches,
  useCreateWorker,
  useCrusade,
  useDeleteWorker,
  useUpdateWorker,
  useWorkers,
  useZones,
} from '@/api/hooks';
import { Button, TextField, TextareaField } from '@/components/ui/fields';
import { ContactPicker } from '@/components/ui/ContactPicker';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space } from '@/theme/tokens';

const GROUPS: { value: WorkerGroup; label: string }[] = [
  { value: 'choir', label: 'Choir' },
  { value: 'ushers', label: 'Ushers' },
  { value: 'security', label: 'Security' },
  { value: 'counsellors', label: 'Counsellors' },
  { value: 'prayer_warriors', label: 'Prayer warriors' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'technical', label: 'Technical' },
  { value: 'medical', label: 'Medical' },
  { value: 'womens', label: "Women's" },
  { value: 'general', label: 'General' },
];

type Draft = { contact: Contact | null; role: string; notes: string };
const empty: Draft = { contact: null, role: '', notes: '' };

export function WorkersScreen() {
  const { data: crusade } = useCrusade();
  const { data: zones } = useZones();
  const { data: churches } = useChurches();
  const [group, setGroup] = useState<WorkerGroup>('choir');
  const { data: workers, isLoading } = useWorkers({ group_type: group });
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const deleteWorker = useDeleteWorker();

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const list = useMemo(() => workers ?? [], [workers]);
  const activeCount = list.filter((w) => w.status === 'active').length;
  const groupLabel = GROUPS.find((g) => g.value === group)?.label ?? group;
  const zoneById = useMemo(() => new Map((zones ?? []).map((z) => [z.id, z] as const)), [zones]);
  const churchById = useMemo(() => new Map((churches ?? []).map((c) => [c.id, c] as const)), [churches]);

  const subLine = (w: Worker) => {
    const parts: string[] = [];
    if (w.role) parts.push(w.role);
    const zone = w.zone_id != null ? zoneById.get(w.zone_id) : null;
    if (zone) parts.push(zone.name ?? zone.code);
    if (w.church_id != null && churchById.get(w.church_id)) parts.push(churchById.get(w.church_id)!.name);
    if (w.phone) parts.push(w.phone);
    return parts.join(' · ') || '—';
  };

  const close = () => {
    setShowAdd(false);
    setDraft(empty);
  };

  const add = async () => {
    if (!crusade || !draft.contact || createWorker.isPending) return;
    const c = draft.contact;
    await createWorker.mutateAsync({
      crusade_id: crusade.id,
      contact_id: c.id,
      zone_id: c.zone_id,
      church_id: c.church_id,
      group_type: group,
      name: c.full_name,
      role: draft.role.trim() || c.title || null,
      phone: c.phone,
      email: c.email,
      notes: draft.notes.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Worker Groups" pillar="P6" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ gap: space.sm }}>
          {GROUPS.map((g) => {
            const on = g.value === group;
            return (
              <Pressable key={g.value} style={[styles.tab, on && styles.tabOn]} onPress={() => setGroup(g.value)}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{g.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{activeCount}</Text>
          <Text style={styles.statLabel}>of {list.length} {groupLabel.toLowerCase()} active</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No {groupLabel.toLowerCase()} added yet.</Text>
          ) : (
            list.map((w, i) => (
              <View key={w.id} style={[styles.row, i > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, w.status === 'inactive' && { color: sand.ink3 }]}>{w.name}</Text>
                  <Text style={styles.sub}>{subLine(w)}</Text>
                </View>
                <Pressable
                  onPress={() => updateWorker.mutate({ id: w.id, body: { status: w.status === 'active' ? 'inactive' : 'active' } })}
                  style={[styles.statusPill, w.status === 'active' ? styles.statusOn : styles.statusOff]}
                >
                  <Text style={[styles.statusText, { color: w.status === 'active' ? sand.ok : sand.warn }]}>
                    {w.status === 'active' ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => deleteWorker.mutate(w.id)} hitSlop={8} style={{ paddingLeft: 6 }}>
                  <Text style={styles.remove}>×</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <AddButton label={`Add to ${groupLabel}`} onPress={() => setShowAdd(true)} />
      </ScrollView>

      <Sheet open={showAdd} onClose={close} title={`Add to ${groupLabel}`}>
        <ContactPicker label="Person" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })} />
        <TextField label="Role in group" placeholder="optional — e.g. Lead" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button
            label={createWorker.isPending ? 'Saving…' : `Add to ${groupLabel}`}
            onPress={add}
            disabled={!draft.contact || createWorker.isPending}
          />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },

  tabs: { marginTop: space.lg },
  tab: { borderWidth: 1, borderColor: sand.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, height: 32 },
  tabOn: { backgroundColor: sand.ink, borderColor: sand.ink },
  tabText: { fontSize: 12, fontWeight: '500', color: sand.ink3 },
  tabTextOn: { color: sand.surface },

  statStrip: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  statNum: { fontSize: 30, fontWeight: '800', color: sand.ink },
  statLabel: { fontSize: 13, color: sand.ink3 },

  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusOn: { backgroundColor: sand.okBg },
  statusOff: { backgroundColor: sand.warnBg },
  statusText: { fontSize: 11, fontWeight: '700' },
  remove: { fontSize: 18, color: sand.ink3 },

  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
