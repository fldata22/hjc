import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Contact, useCommitteeMembers, useCreateCommitteeMember, useCrusade } from '@/api/hooks';
import { Button, SegmentedField, SelectField, TextField, TextareaField } from '@/components/ui/fields';
import { ContactPicker } from '@/components/ui/ContactPicker';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type Status = 'active' | 'on-leave' | 'stepped-down' | '';
type Draft = { contact: Contact | null; role: string; zone: string; status: Status; notes: string };
const empty: Draft = { contact: null, role: '', zone: '', status: '', notes: '' };

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];
const STATUS_OPTS = [
  { value: 'active', label: 'Active' },
  { value: 'on-leave', label: 'On leave' },
  { value: 'stepped-down', label: 'Stepped down' },
];
const STATUS_CLASS: Record<string, string> = { active: 'confirmed', 'on-leave': 'pending', 'stepped-down': 'declined' };

export function CPCScreen() {
  const { data: crusade } = useCrusade();
  const { data: members, isLoading } = useCommitteeMembers('cpc');
  const createMember = useCreateCommitteeMember();

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const list = useMemo(() => members ?? [], [members]);
  const active = list.filter((m) => m.status === 'active').length;
  const canSave = !!draft.contact && draft.role.trim() !== '' && draft.zone !== '' && draft.status !== '' && !createMember.isPending;

  const close = () => {
    setShowAdd(false);
    setDraft(empty);
  };

  const add = async () => {
    if (!crusade || !draft.contact || draft.status === '' || createMember.isPending) return;
    const c = draft.contact;
    const zoneLabel = ZONES.find((z) => z.value === draft.zone)?.label ?? draft.zone;
    await createMember.mutateAsync({
      crusade_id: crusade.id,
      contact_id: c.id,
      kind: 'cpc',
      name: c.full_name,
      role: draft.role.trim(),
      org: zoneLabel,
      phone: c.phone,
      email: c.email,
      status: draft.status,
      notes: draft.notes.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Central Planning" pillar="P4" statNum={active} statLabel={`of ${list.length} active`} />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No members yet.</Text>
          ) : (
            list.map((m, i) => {
              const sc = statusColors[STATUS_CLASS[m.status] ?? 'pending'] ?? statusColors.pending;
              return (
                <View key={m.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{m.name}</Text>
                    <Text style={styles.sub}>{m.role}{m.org ? ` · ${m.org}` : ''}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.pillText, { color: sc.fg }]}>{m.status.replace('-', ' ')}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <AddButton label="Add CPC member" onPress={() => setShowAdd(true)} />
      </ScrollView>

      <Sheet open={showAdd} onClose={close} title="Add CPC member">
        <ContactPicker label="Member" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })} />
        <TextField label="Role" placeholder="e.g. Zone Coordinator" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required />
        <SelectField label="Zone" required options={ZONES} value={draft.zone} onChange={(v) => setDraft({ ...draft, zone: v })} placeholder="Select zone…" />
        <SegmentedField label="Status" required options={STATUS_OPTS} value={draft.status} onChange={(v) => setDraft({ ...draft, status: v as Status })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createMember.isPending ? 'Saving…' : 'Save member'} onPress={add} disabled={!canSave} />
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
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
