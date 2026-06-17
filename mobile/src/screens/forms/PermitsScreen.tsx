import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Permit,
  type PermitStatus,
  useCreatePermit,
  useCrusade,
  useDeletePermit,
  usePermits,
  useUpdatePermit,
} from '@/api/hooks';
import { Button, DateField, TextField, TextareaField } from '@/components/ui/fields';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL: Record<PermitStatus, string> = {
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_CLASS: Record<PermitStatus, string> = {
  in_review: 'pending',
  approved: 'confirmed',
  rejected: 'declined',
};

const cycleStatus = (s: PermitStatus): PermitStatus =>
  s === 'in_review' ? 'approved' : s === 'approved' ? 'rejected' : 'in_review';

type Draft = { name: string; agency: string; due_on: string };
const empty: Draft = { name: '', agency: '', due_on: '' };

export function PermitsScreen() {
  const { data: crusade } = useCrusade();
  const { data: permitsResp, isLoading } = usePermits();
  const createPermit = useCreatePermit();
  const updatePermit = useUpdatePermit();
  const deletePermit = useDeletePermit();

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const list = useMemo(() => permitsResp?.data ?? [], [permitsResp]);
  const counts = permitsResp?.meta.status_counts;
  const canSave = draft.name.trim() !== '' && draft.agency.trim() !== '' && !createPermit.isPending;

  const close = () => {
    setShowAdd(false);
    setDraft(empty);
  };

  const add = async () => {
    if (!crusade || draft.name.trim() === '' || draft.agency.trim() === '' || createPermit.isPending) return;
    await createPermit.mutateAsync({
      crusade_id: crusade.id,
      name: draft.name.trim(),
      agency: draft.agency.trim(),
      due_on: draft.due_on || null,
    });
    close();
  };

  const handleStatus = (p: Permit) => {
    if (updatePermit.isPending) return;
    const next = cycleStatus(p.status);
    const body: Parameters<typeof updatePermit.mutate>[0]['body'] = { status: next };
    if (next === 'approved' && !p.signed_on) body.signed_on = today();
    updatePermit.mutate({ id: p.id, body });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader
          title="Permits Tracker"
          pillar="V10"
          statNum={counts?.approved ?? 0}
          statLabel={`of ${list.length} approved · ${counts?.in_review ?? 0} in review${counts?.rejected ? ` · ${counts.rejected} rejected` : ''}`}
        />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No permits tracked yet.</Text>
          ) : (
            list.map((p, i) => {
              const sc = statusColors[STATUS_CLASS[p.status]] ?? statusColors.pending;
              return (
                <View key={p.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Text style={styles.sub}>
                      {p.agency}
                      {p.due_on ? ` · due ${p.due_on}` : ''}
                      {p.signed_on ? ` · signed ${p.signed_on}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleStatus(p)} hitSlop={6} style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.pillText, { color: sc.fg }]}>{STATUS_LABEL[p.status]}</Text>
                  </Pressable>
                  <Pressable onPress={() => deletePermit.mutate(p.id)} hitSlop={8}><Text style={styles.remove}>×</Text></Pressable>
                </View>
              );
            })
          )}
        </View>

        <AddButton label="Add permit" onPress={() => setShowAdd(true)} />
      </ScrollView>

      <Sheet open={showAdd} onClose={close} title="Add permit">
        <TextField label="Permit name" required placeholder="e.g. Crusade ground assembly permit" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
        <TextField label="Agency" required placeholder="e.g. Wa Municipal Assembly" value={draft.agency} onChange={(v) => setDraft({ ...draft, agency: v })} />
        <DateField label="Due on" value={draft.due_on} onChange={(v) => setDraft({ ...draft, due_on: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createPermit.isPending ? 'Saving…' : 'Add permit'} onPress={add} disabled={!canSave} />
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
  remove: { fontSize: 18, color: sand.ink3, paddingLeft: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
