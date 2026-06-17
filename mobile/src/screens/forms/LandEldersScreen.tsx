import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Contact,
  type LandElderStatus,
  useCreateLandElder,
  useCrusade,
  useLandElders,
} from '@/api/hooks';
import { Button, SegmentedField, TextField, TextareaField } from '@/components/ui/fields';
import { ContactPicker } from '@/components/ui/ContactPicker';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type Draft = { contact: Contact | null; title: string; region: string; status: LandElderStatus; notes: string };
const empty: Draft = { contact: null, title: '', region: '', status: 'identified', notes: '' };

const STATUS_OPTS: { value: LandElderStatus; label: string }[] = [
  { value: 'identified', label: 'Identified' },
  { value: 'courted', label: 'Courted' },
  { value: 'blessed', label: 'Blessed' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'opposed', label: 'Opposed' },
];
const STATUS_CLASS: Record<LandElderStatus, string> = {
  identified: 'pending',
  courted: 'pending',
  blessed: 'confirmed',
  neutral: 'pending',
  opposed: 'declined',
};

export function LandEldersScreen() {
  const { data: crusade } = useCrusade();
  const { data: elders, isLoading } = useLandElders();
  const createElder = useCreateLandElder();

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const list = useMemo(() => elders ?? [], [elders]);
  const blessed = list.filter((e) => e.status === 'blessed').length;
  const canSave = !!draft.contact && !createElder.isPending;

  const close = () => {
    setShowAdd(false);
    setDraft(empty);
  };

  const add = async () => {
    if (!crusade || !draft.contact || createElder.isPending) return;
    const c = draft.contact;
    await createElder.mutateAsync({
      crusade_id: crusade.id,
      contact_id: c.id,
      name: c.full_name,
      title: draft.title.trim() || c.title || null,
      region: draft.region.trim() || null,
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
        <FormHeader title="Fathers of the Land" pillar="P2" statNum={blessed} statLabel={`of ${list.length} blessed`} />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No elders yet.</Text>
          ) : (
            list.map((e, i) => {
              const sc = statusColors[STATUS_CLASS[e.status]] ?? statusColors.pending;
              return (
                <View key={e.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{e.title ? `${e.title} ` : ''}{e.name}</Text>
                    <Text style={styles.sub}>{e.region ?? '—'}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.pillText, { color: sc.fg }]}>{e.status}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <AddButton label="Add elder" onPress={() => setShowAdd(true)} />
      </ScrollView>

      <Sheet open={showAdd} onClose={close} title="Add elder">
        <ContactPicker label="Elder" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })} />
        <TextField label="Title" placeholder="e.g. Naa, Chief, Tindana" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
        <TextField label="Region / area" placeholder="e.g. Wa Central" value={draft.region} onChange={(v) => setDraft({ ...draft, region: v })} />
        <SegmentedField label="Status" required options={STATUS_OPTS} value={draft.status} onChange={(v) => setDraft({ ...draft, status: v as LandElderStatus })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createElder.isPending ? 'Saving…' : 'Add elder'} onPress={add} disabled={!canSave} />
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
