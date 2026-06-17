import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type TownProfile,
  type Zone,
  useCreateTownProfile,
  useTownProfiles,
  useUpdateTownProfile,
  useZones,
} from '@/api/hooks';
import { Button, NumberField, TextField, TextareaField } from '@/components/ui/fields';
import { FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type Draft = {
  language_primary: string;
  language_secondary: string;
  religion_primary: string;
  religion_mix_notes: string;
  prior_crusade_year: number | '';
  prior_crusade_notes: string;
  key_contacts: string;
  notes: string;
};

const draftFromProfile = (p: TownProfile | null): Draft => ({
  language_primary: p?.language_primary ?? '',
  language_secondary: p?.language_secondary ?? '',
  religion_primary: p?.religion_primary ?? '',
  religion_mix_notes: p?.religion_mix_notes ?? '',
  prior_crusade_year: p?.prior_crusade_year ?? '',
  prior_crusade_notes: p?.prior_crusade_notes ?? '',
  key_contacts: p?.key_contacts ?? '',
  notes: p?.notes ?? '',
});

export function TownProfileScreen() {
  const { data: zones, isLoading: zonesLoading } = useZones();
  const { data: profiles, isLoading: profilesLoading } = useTownProfiles();
  const createProfile = useCreateTownProfile();
  const updateProfile = useUpdateTownProfile();

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [draft, setDraft] = useState<Draft>(draftFromProfile(null));

  const zoneList = useMemo(() => zones ?? [], [zones]);
  const profileByZone = useMemo(
    () => new Map((profiles ?? []).map((p) => [p.zone_id, p] as const)),
    [profiles],
  );
  const profiledCount = (profiles ?? []).length;
  const isSaving = createProfile.isPending || updateProfile.isPending;
  const isLoading = zonesLoading || profilesLoading;

  const openEditor = (zone: Zone) => {
    setEditingZone(zone);
    setDraft(draftFromProfile(profileByZone.get(zone.id) ?? null));
  };
  const closeEditor = () => { setEditingZone(null); setDraft(draftFromProfile(null)); };

  const save = async () => {
    if (!editingZone || isSaving) return;
    const payload = {
      language_primary: draft.language_primary.trim() || null,
      language_secondary: draft.language_secondary.trim() || null,
      religion_primary: draft.religion_primary.trim() || null,
      religion_mix_notes: draft.religion_mix_notes.trim() || null,
      prior_crusade_year: draft.prior_crusade_year === '' ? null : Number(draft.prior_crusade_year),
      prior_crusade_notes: draft.prior_crusade_notes.trim() || null,
      key_contacts: draft.key_contacts.trim() || null,
      notes: draft.notes.trim() || null,
    };
    const existing = profileByZone.get(editingZone.id) ?? null;
    if (existing) {
      await updateProfile.mutateAsync({ id: existing.id, body: payload });
    } else {
      await createProfile.mutateAsync({ zone_id: editingZone.id, ...payload });
    }
    closeEditor();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Town Profile" pillar="A·all" statNum={profiledCount} statLabel={`of ${zoneList.length} zones profiled`} />
        <Text style={styles.hint}>Tap a zone to add or edit its profile</Text>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : zoneList.length === 0 ? (
            <Text style={styles.empty}>No zones yet.</Text>
          ) : (
            zoneList.map((z, i) => {
              const existing = profileByZone.get(z.id);
              const sc = statusColors[existing ? 'confirmed' : 'pending'];
              return (
                <Pressable key={z.id} style={[styles.row, i > 0 && styles.divider]} onPress={() => openEditor(z)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{z.name ?? z.code}</Text>
                    <Text style={styles.sub}>
                      {existing
                        ? `${existing.language_primary ?? '—'} · ${existing.religion_primary ?? '—'}`
                        : 'No profile yet'}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={{ color: sc.fg, fontWeight: '700', fontSize: 11 }}>
                      {existing ? 'Profiled' : 'Pending'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <Sheet open={editingZone !== null} onClose={closeEditor} title={editingZone ? (editingZone.name ?? editingZone.code) : undefined}>
        <TextField label="Primary language" placeholder="e.g. Wala" value={draft.language_primary} onChange={(v) => setDraft({ ...draft, language_primary: v })} />
        <TextField label="Secondary language" placeholder="optional" value={draft.language_secondary} onChange={(v) => setDraft({ ...draft, language_secondary: v })} />
        <TextField label="Primary religion" placeholder="e.g. Christian / Muslim / Mixed" value={draft.religion_primary} onChange={(v) => setDraft({ ...draft, religion_primary: v })} />
        <TextareaField label="Religion mix notes" value={draft.religion_mix_notes} onChange={(v) => setDraft({ ...draft, religion_mix_notes: v })} />
        <NumberField label="Prior crusade year" value={draft.prior_crusade_year} onChange={(v) => setDraft({ ...draft, prior_crusade_year: v })} />
        <TextareaField label="Prior crusade notes" value={draft.prior_crusade_notes} onChange={(v) => setDraft({ ...draft, prior_crusade_notes: v })} />
        <TextareaField label="Key contacts" value={draft.key_contacts} onChange={(v) => setDraft({ ...draft, key_contacts: v })} />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={closeEditor} />
          <Button label={isSaving ? 'Saving…' : 'Save profile'} onPress={save} disabled={isSaving} />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  hint: { fontSize: 12, color: sand.ink3, marginTop: space.md },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
