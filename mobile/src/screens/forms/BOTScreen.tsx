import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Contact, useCommitteeMembers, useCreateCommitteeMember, useCrusade } from '@/api/hooks';
import { Button, SegmentedField, TextField, TextareaField } from '@/components/ui/fields';
import { ContactPicker } from '@/components/ui/ContactPicker';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type Status = 'confirmed' | 'pending' | 'declined' | '';
type Draft = { contact: Contact | null; role: string; organization: string; status: Status; notes: string };
const empty: Draft = { contact: null, role: '', organization: '', status: '', notes: '' };

const STATUS_OPTS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'declined', label: 'Declined' },
];

export function BOTScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: trustees, isLoading } = useCommitteeMembers('bot');
  const createMember = useCreateCommitteeMember();

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const list = useMemo(() => trustees ?? [], [trustees]);
  const confirmed = list.filter((t) => t.status === 'confirmed').length;
  const canSave = !!draft.contact && draft.role.trim() !== '' && draft.status !== '' && !createMember.isPending;

  const close = () => {
    setShowAdd(false);
    setDraft(empty);
  };

  const add = async () => {
    if (!crusade || !draft.contact || draft.status === '' || createMember.isPending) return;
    const c = draft.contact;
    await createMember.mutateAsync({
      crusade_id: crusade.id,
      contact_id: c.id,
      kind: 'bot',
      name: c.full_name,
      role: draft.role.trim(),
      org: draft.organization.trim() || null,
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
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back to forms</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Board of Trustees</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>P3</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{confirmed}</Text>
          <Text style={styles.statLabel}>of {list.length} confirmed</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No trustees yet.</Text>
          ) : (
            list.map((t, i) => {
              const sc = statusColors[t.status] ?? statusColors.pending;
              return (
                <View key={t.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{t.name}</Text>
                    <Text style={styles.sub}>{t.role}{t.org ? ` · ${t.org}` : ''}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.pillText, { color: sc.fg }]}>{t.status}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowAdd(true)}>
          <Text style={styles.addToggleText}>Add trustee</Text>
        </Pressable>
      </ScrollView>

      <Sheet open={showAdd} onClose={close} title="Add trustee">
        <ContactPicker label="Trustee" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })} />
        <TextField label="Role" placeholder="e.g. Treasurer" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required />
        <TextField label="Organization" value={draft.organization} onChange={(v) => setDraft({ ...draft, organization: v })} />
        <SegmentedField label="Status" required options={STATUS_OPTS} value={draft.status} onChange={(v) => setDraft({ ...draft, status: v as Status })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createMember.isPending ? 'Saving…' : 'Save trustee'} onPress={add} disabled={!canSave} />
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
  title: { fontSize: 24, fontWeight: '700', color: sand.ink },
  pillarBadge: { backgroundColor: sand.accentBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillarText: { fontSize: 11, fontWeight: '700', color: sand.accent },
  statStrip: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  statNum: { fontSize: 30, fontWeight: '800', color: sand.ink },
  statLabel: { fontSize: 13, color: sand.ink3 },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
  addToggle: { marginTop: space.lg, borderWidth: 1.5, borderColor: sand.ink, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  addToggleText: { fontSize: 14, fontWeight: '600', color: sand.ink },
});
