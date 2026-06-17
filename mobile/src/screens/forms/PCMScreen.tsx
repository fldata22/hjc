import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Contact,
  type Pastor,
  useCreatePastor,
  useCreatePastorIdentification,
  useCrusade,
  usePastors,
  useUpdatePastor,
  useZones,
} from '@/api/hooks';
import { Button, DateField, SegmentedField, SelectField, TextField, TextareaField } from '@/components/ui/fields';
import { ContactPicker } from '@/components/ui/ContactPicker';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type Stage = Pastor['pipeline_stage'];
const STAGES: { value: Stage; label: string }[] = [
  { value: 'identified', label: 'Identified' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'committed', label: 'Committed' },
  { value: 'active', label: 'Active' },
  { value: 'champion', label: 'Champion' },
];
const STAGE_LABEL: Record<Stage, string> = {
  identified: 'Identified', engaged: 'Engaged', committed: 'Committed', active: 'Active', champion: 'Champion',
};
const STAGE_CLASS: Record<Stage, string> = {
  identified: 'pending', engaged: 'pending', committed: 'confirmed', active: 'confirmed', champion: 'confirmed',
};
const CONFIRMED: Stage[] = ['committed', 'active', 'champion'];
const advance = (s: Stage): Stage =>
  s === 'identified' ? 'engaged' : s === 'engaged' ? 'committed' : s === 'committed' ? 'active' : 'champion';

type EditDraft = { pipeline_stage: Stage; zone_id: number | ''; last_contact_at: string; notes: string };
type AddDraft = { contact: Contact | null; role: string };

export function PCMScreen() {
  const router = useRouter();
  const { data: page, isLoading } = usePastors({ per_page: 50 });
  const { data: zones } = useZones();
  const { data: crusade } = useCrusade();
  const updatePastor = useUpdatePastor();
  const createPastor = useCreatePastor();
  const createIdent = useCreatePastorIdentification();

  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<AddDraft>({ contact: null, role: '' });

  const pastors = useMemo(() => page?.data ?? [], [page]);
  const zoneById = useMemo(() => new Map((zones ?? []).map((z) => [z.id, z] as const)), [zones]);
  const zoneOptions = useMemo(() => (zones ?? []).map((z) => ({ value: String(z.id), label: z.name ?? z.code })), [zones]);
  const confirmed = pastors.filter((p) => CONFIRMED.includes(p.pipeline_stage)).length;
  const editing = pastors.find((p) => p.id === editId) ?? null;

  const openEdit = (p: Pastor) => {
    setEditId(p.id);
    setEditDraft({
      pipeline_stage: p.pipeline_stage,
      zone_id: p.zone_id ?? '',
      last_contact_at: p.last_contact_at ? p.last_contact_at.slice(0, 10) : '',
      notes: '',
    });
  };
  const closeEdit = () => { setEditId(null); setEditDraft(null); };
  const closeAdd = () => { setShowAdd(false); setAddDraft({ contact: null, role: '' }); };

  const saveEdit = async () => {
    if (editId == null || !editDraft || updatePastor.isPending) return;
    await updatePastor.mutateAsync({
      id: editId,
      body: {
        pipeline_stage: editDraft.pipeline_stage,
        zone_id: typeof editDraft.zone_id === 'number' ? editDraft.zone_id : null,
        last_contact_at: editDraft.last_contact_at || null,
      },
    });
    closeEdit();
  };

  const bumpStage = async (p: Pastor) => {
    if (updatePastor.isPending) return;
    const next = advance(p.pipeline_stage);
    if (next === p.pipeline_stage) return;
    await updatePastor.mutateAsync({ id: p.id, body: { pipeline_stage: next, last_contact_at: new Date().toISOString().slice(0, 10) } });
  };

  const addPcm = async () => {
    if (!crusade || !addDraft.contact || createPastor.isPending) return;
    const c = addDraft.contact;
    const pastor = await createPastor.mutateAsync({
      crusade_id: crusade.id, contact_id: c.id, full_name: c.full_name, zone_id: c.zone_id,
      phone: c.phone, email: c.email, address: null, pastor_since: null, pipeline_stage: 'identified',
    });
    await createIdent.mutateAsync({
      pastorId: pastor.id,
      body: { category: 'PCM', sub_role: addDraft.role.trim() || c.title || 'Pastor', assigned_at: new Date().toISOString().slice(0, 10) },
    });
    closeAdd();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back to forms</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Primary Committee</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>P1</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{confirmed}</Text>
          <Text style={styles.statLabel}>of {pastors.length} confirmed</Text>
        </View>
        <Text style={styles.hint}>Tap a pastor to edit · tap the stage pill to advance</Text>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : pastors.length === 0 ? (
            <Text style={styles.empty}>No pastors identified yet.</Text>
          ) : (
            pastors.map((p, i) => {
              const sc = statusColors[STAGE_CLASS[p.pipeline_stage]] ?? statusColors.pending;
              const zone = p.zone_id != null ? zoneById.get(p.zone_id) : null;
              return (
                <Pressable key={p.id} style={[styles.row, i > 0 && styles.divider]} onPress={() => openEdit(p)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.full_name}</Text>
                    <Text style={styles.sub}>
                      {(zone?.name ?? zone?.code) ?? '—'}{p.last_contact_at ? ` · ${p.last_contact_at.slice(0, 10)}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => bumpStage(p)} style={[styles.stagePill, { backgroundColor: sc.bg }]}>
                    <Text style={{ color: sc.fg, fontWeight: '700', fontSize: 11 }}>{STAGE_LABEL[p.pipeline_stage]}</Text>
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowAdd(true)}>
          <Text style={styles.addToggleText}>Add new PCM</Text>
        </Pressable>
      </ScrollView>

      {/* Edit */}
      <Sheet open={editId !== null} onClose={closeEdit} title={editing?.full_name}>
        {editDraft ? (
          <>
            <SegmentedField label="Stage" options={STAGES} value={editDraft.pipeline_stage} onChange={(v) => setEditDraft({ ...editDraft, pipeline_stage: v as Stage })} />
            <SelectField label="Zone" options={zoneOptions} value={editDraft.zone_id === '' ? '' : String(editDraft.zone_id)} onChange={(v) => setEditDraft({ ...editDraft, zone_id: v === '' ? '' : Number(v) })} placeholder="Optional" />
            <DateField label="Last contact" value={editDraft.last_contact_at} onChange={(v) => setEditDraft({ ...editDraft, last_contact_at: v })} />
            <TextareaField label="Notes" value={editDraft.notes} onChange={(v) => setEditDraft({ ...editDraft, notes: v })} />
            <SheetActions>
              <Button label="Cancel" variant="ghost" onPress={closeEdit} />
              <Button label={updatePastor.isPending ? 'Saving…' : 'Save'} onPress={saveEdit} disabled={updatePastor.isPending} />
            </SheetActions>
          </>
        ) : null}
      </Sheet>

      {/* Add */}
      <Sheet open={showAdd} onClose={closeAdd} title="Add new PCM">
        <ContactPicker label="Pastor" required value={addDraft.contact} onChange={(c) => setAddDraft({ ...addDraft, contact: c })} />
        <TextField label="Role / title" placeholder="optional — e.g. Senior Pastor" value={addDraft.role} onChange={(v) => setAddDraft({ ...addDraft, role: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={closeAdd} />
          <Button label={createPastor.isPending ? 'Saving…' : 'Add PCM'} onPress={addPcm} disabled={!addDraft.contact || createPastor.isPending} />
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
  title: { fontSize: 24, fontWeight: '800', color: sand.ink },
  pillarBadge: { backgroundColor: sand.accentBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillarText: { fontSize: 11, fontWeight: '800', color: sand.accent },
  statStrip: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  statNum: { fontSize: 30, fontWeight: '800', color: sand.ink },
  statLabel: { fontSize: 13, color: sand.ink3 },
  hint: { fontSize: 12, color: sand.ink3, marginTop: 6 },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  stagePill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
  addToggle: { marginTop: space.lg, borderWidth: 1.5, borderColor: sand.ink, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  addToggleText: { fontSize: 14, fontWeight: '600', color: sand.ink },
});
