import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type MediaKind,
  type MediaMention,
  type MediaSentiment,
  useCreateMediaMention,
  useCrusade,
  useDeleteMediaMention,
  useMediaMentions,
} from '@/api/hooks';
import { Button, DateField, SegmentedField, SelectField, TextField, TextareaField } from '@/components/ui/fields';
import { AddButton, FormHeader } from '@/components/ui/FormHeader';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

const KINDS: { value: MediaKind; label: string }[] = [
  { value: 'newspaper', label: 'Newspaper' },
  { value: 'radio', label: 'Radio' },
  { value: 'tv', label: 'TV' },
  { value: 'online', label: 'Online' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const SENTIMENTS: { value: MediaSentiment; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const SENTIMENT_CLASS: Record<MediaSentiment, string> = {
  positive: 'confirmed',
  neutral: 'pending',
  negative: 'declined',
};

type Draft = {
  mentioned_on: string;
  kind: MediaKind | '';
  outlet: string;
  headline: string;
  url: string;
  sentiment: MediaSentiment | '';
  summary: string;
};

const empty = (): Draft => ({
  mentioned_on: today(),
  kind: '',
  outlet: '',
  headline: '',
  url: '',
  sentiment: '',
  summary: '',
});

export function MediaCoverageScreen() {
  const { data: crusade } = useCrusade();
  const { data: mentions, isLoading } = useMediaMentions();
  const createMention = useCreateMediaMention();
  const deleteMention = useDeleteMediaMention();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const list = useMemo(() => mentions ?? [], [mentions]);
  const positiveCount = list.filter((m) => m.sentiment === 'positive').length;
  const canSave =
    draft.kind !== '' && draft.outlet.trim() !== '' && draft.headline.trim() !== '' && !createMention.isPending;

  const close = () => { setShowForm(false); setDraft(empty()); };

  const add = async () => {
    if (!crusade || draft.kind === '' || createMention.isPending) return;
    await createMention.mutateAsync({
      crusade_id: crusade.id,
      mentioned_on: draft.mentioned_on,
      kind: draft.kind,
      outlet: draft.outlet.trim(),
      headline: draft.headline.trim(),
      url: draft.url.trim() || null,
      sentiment: draft.sentiment === '' ? null : draft.sentiment,
      summary: draft.summary.trim() || null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader
          title="Media Coverage"
          pillar="A·all"
          statNum={list.length}
          statLabel={`total mentions · ${positiveCount} positive`}
        />

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No media mentions logged yet.</Text>
          ) : (
            list.map((m: MediaMention, i) => {
              const kindLabel = KINDS.find((k) => k.value === m.kind)?.label ?? m.kind;
              const sc = m.sentiment ? statusColors[SENTIMENT_CLASS[m.sentiment]] ?? statusColors.pending : null;
              return (
                <View key={m.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{m.headline}</Text>
                    <Text style={styles.sub}>{m.outlet} · {kindLabel} · {m.mentioned_on}</Text>
                    {m.url ? (
                      <Pressable onPress={() => Linking.openURL(m.url!)} hitSlop={6}>
                        <Text style={styles.link}>link ↗</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {m.sentiment && sc ? (
                    <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.pillText, { color: sc.fg }]}>
                        {SENTIMENTS.find((s) => s.value === m.sentiment)?.label}
                      </Text>
                    </View>
                  ) : null}
                  <Pressable onPress={() => deleteMention.mutate(m.id)} hitSlop={8}>
                    <Text style={styles.remove}>×</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <AddButton label="Log mention" onPress={() => setShowForm(true)} />
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Log mention">
        <DateField label="Mentioned on" required value={draft.mentioned_on} onChange={(v) => setDraft({ ...draft, mentioned_on: v })} />
        <SelectField
          label="Kind"
          required
          options={KINDS}
          value={draft.kind}
          onChange={(v) => setDraft({ ...draft, kind: v as MediaKind | '' })}
          placeholder="Select…"
        />
        <TextField label="Outlet" required placeholder="e.g. Daily Graphic" value={draft.outlet} onChange={(v) => setDraft({ ...draft, outlet: v })} />
        <TextField label="Headline" required placeholder="The lead line" value={draft.headline} onChange={(v) => setDraft({ ...draft, headline: v })} />
        <TextField label="URL" placeholder="optional · https://…" value={draft.url} onChange={(v) => setDraft({ ...draft, url: v })} autoCapitalize="none" />
        <SegmentedField
          label="Sentiment"
          options={[...SENTIMENTS, { value: '', label: 'Skip' }]}
          value={draft.sentiment}
          onChange={(v) => setDraft({ ...draft, sentiment: v as MediaSentiment | '' })}
        />
        <TextareaField label="Summary" value={draft.summary} onChange={(v) => setDraft({ ...draft, summary: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createMention.isPending ? 'Saving…' : 'Log mention'} onPress={add} disabled={!canSave} />
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
  link: { fontSize: 12, color: sand.accent, marginTop: 4 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },
  remove: { fontSize: 18, color: sand.ink3, paddingLeft: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
