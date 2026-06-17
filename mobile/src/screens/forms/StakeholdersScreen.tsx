import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Contact,
  type StakeholderStatus,
  useCreateStakeholder,
  useCrusade,
  useStakeholders,
} from '@/api/hooks';
import { Button, SegmentedField, TextField, TextareaField } from '@/components/ui/fields';
import { ContactPicker } from '@/components/ui/ContactPicker';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type Draft = { contact: Contact | null; org: string; role: string; status: StakeholderStatus; notes: string };
const empty: Draft = { contact: null, org: '', role: '', status: 'identified', notes: '' };

const STATUS_OPTS: { value: StakeholderStatus; label: string }[] = [
  { value: 'identified', label: 'Identified' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'committed', label: 'Committed' },
  { value: 'won', label: 'Won' },
];
const STATUS_CLASS: Record<StakeholderStatus, string> = {
  identified: 'pending',
  engaged: 'pending',
  committed: 'confirmed',
  won: 'confirmed',
};

export function StakeholdersScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: stakeholders, isLoading } = useStakeholders();
  const createStakeholder = useCreateStakeholder();

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const list = useMemo(() => stakeholders ?? [], [stakeholders]);
  const won = list.filter((s) => s.status_label === 'won' || s.status_label === 'committed').length;
  const canSave = !!draft.contact && draft.org.trim() !== '' && draft.role.trim() !== '' && !createStakeholder.isPending;

  const close = () => {
    setShowAdd(false);
    setDraft(empty);
  };

  const add = async () => {
    if (!crusade || !draft.contact || createStakeholder.isPending) return;
    const c = draft.contact;
    await createStakeholder.mutateAsync({
      crusade_id: crusade.id,
      contact_id: c.id,
      name: c.full_name,
      org: draft.org.trim(),
      role: draft.role.trim() || c.title || '',
      status_label: draft.status,
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
          <Text style={styles.title}>Governmental Participation</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>P5</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{won}</Text>
          <Text style={styles.statLabel}>of {list.length} committed+</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No stakeholders yet.</Text>
          ) : (
            list.map((s, i) => {
              const sc = statusColors[STATUS_CLASS[s.status_label]] ?? statusColors.pending;
              return (
                <View key={s.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{s.name}</Text>
                    <Text style={styles.sub}>{s.role}{s.org ? ` · ${s.org}` : ''}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.pillText, { color: sc.fg }]}>{s.status_label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowAdd(true)}>
          <Text style={styles.addToggleText}>Add stakeholder</Text>
        </Pressable>
      </ScrollView>

      <Sheet open={showAdd} onClose={close} title="Add stakeholder">
        <ContactPicker label="Person" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })} />
        <TextField label="Organisation" required placeholder="e.g. Wa Municipal Assembly" value={draft.org} onChange={(v) => setDraft({ ...draft, org: v })} />
        <TextField label="Role / title" required placeholder="e.g. Mayor" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} />
        <SegmentedField label="Funnel stage" required options={STATUS_OPTS} value={draft.status} onChange={(v) => setDraft({ ...draft, status: v as StakeholderStatus })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createStakeholder.isPending ? 'Saving…' : 'Add stakeholder'} onPress={add} disabled={!canSave} />
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
  title: { fontSize: 22, fontWeight: '700', color: sand.ink, flex: 1 },
  pillarBadge: { backgroundColor: sand.accentBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginLeft: space.sm },
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
