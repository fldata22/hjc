import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type PublicityAsset,
  type PublicityKind,
  type PublicityStatus,
  useCreatePublicityAsset,
  useCrusade,
  useDeletePublicityAsset,
  usePublicityAssets,
  useUpdatePublicityAsset,
} from '@/api/hooks';
import { Button, NumberField, SelectField, TextField, TextareaField } from '@/components/ui/fields';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

const KINDS: { value: PublicityKind; label: string }[] = [
  { value: 'radio_spot', label: 'Radio spot' },
  { value: 'poster', label: 'Poster' },
  { value: 'billboard', label: 'Billboard' },
  { value: 'social_post', label: 'Social post' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'banner', label: 'Banner' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
];

const STATUSES: { value: PublicityStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_production', label: 'In production' },
  { value: 'produced', label: 'Produced' },
  { value: 'deployed', label: 'Deployed' },
];

const STATUS_CLASS: Record<PublicityStatus, string> = {
  planned: 'pending',
  in_production: 'pending',
  produced: 'pending',
  deployed: 'confirmed',
};

const advanceStatus = (s: PublicityStatus): PublicityStatus =>
  s === 'planned' ? 'in_production' :
  s === 'in_production' ? 'produced' :
  s === 'produced' ? 'deployed' : 'planned';

type Draft = {
  kind: PublicityKind | '';
  title: string;
  quantity: number | '';
  notes: string;
};

const empty = (): Draft => ({ kind: '', title: '', quantity: '', notes: '' });

export function PublicityAssetsScreen() {
  const { data: crusade } = useCrusade();
  const { data: assets, isLoading } = usePublicityAssets();
  const createAsset = useCreatePublicityAsset();
  const updateAsset = useUpdatePublicityAsset();
  const deleteAsset = useDeletePublicityAsset();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => assets ?? [], [assets]);
  const deployedCount = list.filter((a) => a.status === 'deployed').length;
  const canSave = draft.kind !== '' && draft.title.trim() !== '' && !createAsset.isPending;

  const close = () => { setShowForm(false); setDraft(empty()); };

  const add = async () => {
    if (!crusade || draft.kind === '' || draft.title.trim() === '' || createAsset.isPending) return;
    await createAsset.mutateAsync({
      crusade_id: crusade.id,
      kind: draft.kind,
      title: draft.title.trim(),
      quantity: draft.quantity === '' ? null : Number(draft.quantity),
      notes: draft.notes.trim() || null,
    });
    close();
  };

  const advance = (a: PublicityAsset) => {
    if (updateAsset.isPending) return;
    const next = advanceStatus(a.status);
    const body: Parameters<typeof updateAsset.mutate>[0]['body'] = { status: next };
    if (next === 'produced' && !a.produced_on) body.produced_on = today();
    if (next === 'deployed' && !a.deployed_on) body.deployed_on = today();
    updateAsset.mutate({ id: a.id, body });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Publicity & Video" pillar="A·all" statNum={deployedCount} statLabel={`of ${list.length} deployed`} />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No campaign assets yet.</Text>
          ) : (
            list.map((a: PublicityAsset, i) => {
              const kindLabel = KINDS.find((k) => k.value === a.kind)?.label ?? a.kind;
              const statusLabel = STATUSES.find((s) => s.value === a.status)?.label;
              const sc = statusColors[STATUS_CLASS[a.status]] ?? statusColors.pending;
              return (
                <View key={a.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{a.title}</Text>
                    <Text style={styles.sub}>
                      {kindLabel}{a.quantity != null ? ` · qty ${a.quantity.toLocaleString()}` : ''}
                      {a.deployed_on ? ` · deployed ${a.deployed_on}` : a.produced_on ? ` · produced ${a.produced_on}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => advance(a)} style={[styles.pill, { backgroundColor: sc.bg }]} hitSlop={6}>
                    <Text style={[styles.pillText, { color: sc.fg }]}>{statusLabel}</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteAsset.mutate(a.id)} hitSlop={8}>
                    <Text style={styles.remove}>×</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <AddButton label="Add asset" onPress={() => setShowForm(true)} />
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Add asset">
        <SelectField
          label="Kind"
          required
          options={KINDS}
          value={draft.kind}
          onChange={(v) => setDraft({ ...draft, kind: v as PublicityKind | '' })}
          placeholder="Select…"
        />
        <TextField label="Title" required placeholder="e.g. Crusade Wa-Central A2 poster" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
        <NumberField label="Quantity" suffix="units" value={draft.quantity} onChange={(v) => setDraft({ ...draft, quantity: v })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createAsset.isPending ? 'Saving…' : 'Add asset'} onPress={add} disabled={!canSave} />
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
