import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type MustDoArea,
  type MustDoItem,
  type MustDoStatus,
  useCreateMustDoItem,
  useCrusade,
  useDeleteMustDoItem,
  useMustDoItems,
  useUpdateMustDoItem,
} from '@/api/hooks';
import { Button, DateField, SelectField, TextField, TextareaField } from '@/components/ui/fields';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

const AREAS: { value: MustDoArea; label: string }[] = [
  { value: 'venue', label: 'Venue' },
  { value: 'publicity', label: 'Publicity' },
  { value: 'permits', label: 'Permits' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'other', label: 'Other' },
];

const STATUS_LABEL: Record<MustDoStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
};

const STATUS_CLASS: Record<MustDoStatus, string> = {
  pending: 'pending',
  in_progress: 'pending',
  done: 'confirmed',
};

const cycleStatus = (current: MustDoStatus): MustDoStatus =>
  current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'done' : 'pending';

type Draft = { area: MustDoArea | ''; title: string; owner_name: string; due_date: string; notes: string };
const empty: Draft = { area: '', title: '', owner_name: '', due_date: '', notes: '' };

export function MustDoChecklistScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: items, isLoading } = useMustDoItems();
  const createItem = useCreateMustDoItem();
  const updateItem = useUpdateMustDoItem();
  const deleteItem = useDeleteMustDoItem();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const list = useMemo(() => items ?? [], [items]);
  const doneCount = list.filter((i) => i.status === 'done').length;
  const pct = list.length === 0 ? 0 : Math.round((doneCount / list.length) * 100);

  const grouped = useMemo(() => {
    const map = new Map<MustDoArea, MustDoItem[]>();
    for (const a of AREAS) map.set(a.value, []);
    for (const item of list) {
      const arr = map.get(item.area) ?? [];
      arr.push(item);
      map.set(item.area, arr);
    }
    return map;
  }, [list]);

  const close = () => { setShowForm(false); setDraft(empty); };
  const add = async () => {
    if (!crusade || draft.area === '' || draft.title.trim() === '' || createItem.isPending) return;
    await createItem.mutateAsync({
      crusade_id: crusade.id,
      area: draft.area,
      title: draft.title.trim(),
      owner_name: draft.owner_name.trim() || null,
      due_date: draft.due_date || null,
      notes: draft.notes.trim() || null,
    });
    close();
  };

  const onToggle = (item: MustDoItem) => {
    if (updateItem.isPending) return;
    updateItem.mutate({ id: item.id, body: { status: cycleStatus(item.status) } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹ Back to forms</Text></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Must-Do Checklist</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>V10</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{pct}%</Text>
          <Text style={styles.statLabel}>{doneCount} of {list.length} done</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No items yet. Tap "Add item" to get started.</Text>
          ) : (
            AREAS.map((area) => {
              const areaItems = grouped.get(area.value) ?? [];
              if (areaItems.length === 0) return null;
              const areaDone = areaItems.filter((i) => i.status === 'done').length;
              return (
                <View key={area.value} style={styles.group}>
                  <Text style={styles.groupHead}>
                    {area.label.toUpperCase()} · {areaDone}/{areaItems.length}
                  </Text>
                  {areaItems.map((item, i) => {
                    const done = item.status === 'done';
                    const sc = statusColors[STATUS_CLASS[item.status]];
                    return (
                      <View key={item.id} style={[styles.row, i > 0 && styles.divider]}>
                        <Pressable onPress={() => onToggle(item)} hitSlop={6} style={[styles.checkbox, done && styles.checkboxOn]}>
                          {done ? <Text style={styles.checkmark}>✓</Text> : null}
                        </Pressable>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.name, done && styles.nameDone]}>{item.title}</Text>
                          <Text style={styles.sub}>
                            {item.owner_name ?? '—'}{item.due_date ? ` · due ${item.due_date}` : ''}
                          </Text>
                        </View>
                        <Pressable onPress={() => onToggle(item)} style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.statusText, { color: sc.fg }]}>{STATUS_LABEL[item.status]}</Text>
                        </Pressable>
                        <Pressable onPress={() => deleteItem.mutate(item.id)} hitSlop={8} style={{ paddingLeft: 6 }}>
                          <Text style={styles.remove}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowForm(true)}><Text style={styles.addToggleText}>Add item</Text></Pressable>
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Add item">
        <SelectField
          label="Area"
          required
          options={AREAS}
          value={draft.area}
          onChange={(v) => setDraft({ ...draft, area: v as MustDoArea | '' })}
          placeholder="Select…"
        />
        <TextField label="Title" required placeholder="e.g. Confirm sound provider" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
        <TextField label="Owner" placeholder="optional" value={draft.owner_name} onChange={(v) => setDraft({ ...draft, owner_name: v })} />
        <DateField label="Due date" value={draft.due_date} onChange={(v) => setDraft({ ...draft, due_date: v })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button
            label={createItem.isPending ? 'Saving…' : 'Add item'}
            onPress={add}
            disabled={createItem.isPending || draft.area === '' || draft.title.trim() === ''}
          />
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
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg, paddingBottom: space.sm },
  group: { marginTop: space.md },
  groupHead: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: sand.ink3, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: sand.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: sand.line2, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: sand.ink, borderColor: sand.ink },
  checkmark: { color: sand.surface, fontSize: 13, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  nameDone: { color: sand.ink3, textDecorationLine: 'line-through' },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  remove: { fontSize: 18, color: sand.ink3 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
  addToggle: { marginTop: space.lg, borderWidth: 1.5, borderColor: sand.ink, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  addToggleText: { fontSize: 14, fontWeight: '600', color: sand.ink },
});
