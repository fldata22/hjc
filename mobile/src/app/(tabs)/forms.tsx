import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useAwarenessSurveys,
  useBudgetSummary,
  useCommitteeMembers,
  usePastorStageCounts,
  useWeeklyLatest,
} from '@/api/hooks';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

type DueClass = 'ok' | 'warn' | 'urgent';
type FormRow = { n: string; p: string; meta: string; due: string; dueClass: DueClass; slug: string };
type GroupedRow = FormRow & { group: string };

export default function FormsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: pastorCounts } = usePastorStageCounts();
  const { data: bot } = useCommitteeMembers('bot');
  const { data: cpc } = useCommitteeMembers('cpc');
  const { data: surveys } = useAwarenessSurveys();
  const { data: weekly } = useWeeklyLatest();
  const { data: budget } = useBudgetSummary();

  const pcmMeta = useMemo(() => {
    if (!pastorCounts) return '…';
    const confirmed = pastorCounts.committed + pastorCounts.active + pastorCounts.champion;
    return `${confirmed} of ${pastorCounts.total} confirmed`;
  }, [pastorCounts]);
  const botMeta = useMemo(() => {
    if (!bot) return '…';
    return `${bot.filter((m) => m.status === 'confirmed').length} of ${bot.length} confirmed`;
  }, [bot]);
  const cpcMeta = useMemo(() => {
    if (!cpc) return '…';
    return `${cpc.filter((m) => m.status === 'active').length} of ${cpc.length} active`;
  }, [cpc]);
  const awarenessMeta = useMemo(() => {
    if (!surveys) return '…';
    if (surveys.length === 0) return 'No waves logged yet';
    const lastWave = Math.max(...surveys.map((s) => s.survey_number));
    const waves = new Set(surveys.map((s) => s.survey_number)).size;
    return `${waves} wave${waves === 1 ? '' : 's'} · last W${lastWave}`;
  }, [surveys]);
  const weeklyMeta = useMemo(() => {
    if (!weekly) return 'No assessment yet';
    return weekly.submitted_at ? `W${weekly.week_number} submitted` : `W${weekly.week_number} awaiting`;
  }, [weekly]);
  const expensesMeta = useMemo(() => {
    if (!budget) return '…';
    const fmt = (n: number) => '₵' + (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString());
    return `${fmt(Number(budget.spent))} of ${fmt(Number(budget.total_budget))}`;
  }, [budget]);

  const groups = useMemo<{ title: string; key: string; rows: FormRow[] }[]>(
    () => [
      {
        title: 'P · Participation',
        key: 'P',
        rows: [
          { n: 'PCM (Primary Committee Members)', p: 'P1', meta: pcmMeta, due: 'OK', dueClass: 'ok', slug: 'pcm' },
          { n: 'Fathers of the Land', p: 'P2', meta: 'Elders + chiefs', due: 'OK', dueClass: 'ok', slug: 'fathers' },
          { n: 'BOT (Board of Trustees)', p: 'P3', meta: botMeta, due: 'OK', dueClass: 'ok', slug: 'bot' },
          { n: 'CPC (Central Planning)', p: 'P4', meta: cpcMeta, due: 'OK', dueClass: 'ok', slug: 'cpc' },
          { n: 'Governmental Participation', p: 'P5', meta: 'Govt officials & agencies', due: 'OK', dueClass: 'ok', slug: 'stakeholders' },
          { n: 'Worker Groups', p: 'P6', meta: 'Choir, ushers, security…', due: 'OK', dueClass: 'ok', slug: 'workers' },
          { n: 'Pledges', p: 'P7', meta: 'Schedule + record pledges', due: 'OK', dueClass: 'ok', slug: 'pledge-meetings' },
        ],
      },
      {
        title: 'A · Awareness',
        key: 'A',
        rows: [
          { n: 'Awareness Survey', p: 'A9', meta: awarenessMeta, due: 'OK', dueClass: 'ok', slug: 'awareness-survey' },
          { n: 'Town Profile', p: 'A·all', meta: 'Per-zone baseline', due: 'OK', dueClass: 'ok', slug: 'town-profile' },
          { n: 'Publicity & Video', p: 'D13', meta: 'Campaign asset log', due: 'OK', dueClass: 'ok', slug: 'publicity' },
          { n: 'Door-to-Door Outreach', p: 'A·all', meta: 'Per-zone sweep log', due: 'OK', dueClass: 'ok', slug: 'door-to-door' },
          { n: 'Convoy Outreach', p: 'A·all', meta: 'Mobile evangelism runs', due: 'OK', dueClass: 'ok', slug: 'convoy' },
          { n: 'Media Coverage', p: 'A·all', meta: 'Newspaper, radio, TV', due: 'OK', dueClass: 'ok', slug: 'media-coverage' },
        ],
      },
      {
        title: 'V · Venue',
        key: 'V',
        rows: [
          { n: 'Venue Inspection', p: 'V10', meta: 'Per-visit checklist', due: 'OK', dueClass: 'ok', slug: 'venue-inspection' },
          { n: 'Must-Do Checklist', p: 'V10', meta: 'Pre-crusade items', due: 'OK', dueClass: 'ok', slug: 'must-do' },
          { n: 'Permits Tracker', p: 'V11', meta: 'Police, fire, city, health', due: 'OK', dueClass: 'ok', slug: 'permits' },
          { n: 'Sound & Lighting', p: 'V12', meta: 'Providers + power plan', due: 'OK', dueClass: 'ok', slug: 'sound-lighting' },
          { n: 'Seating Plan', p: 'V13', meta: 'VIP / general / counsellor', due: 'OK', dueClass: 'ok', slug: 'seating-plan' },
        ],
      },
      {
        title: 'D · Daily ops',
        key: 'D',
        rows: [
          { n: 'Weekly Assessment', p: 'All', meta: weeklyMeta, due: 'WEEKLY', dueClass: 'warn', slug: 'weekly' },
          { n: 'Daily Expenses', p: 'Budget', meta: expensesMeta, due: 'DAILY', dueClass: 'ok', slug: 'daily-expenses' },
          { n: 'Daily Attendance', p: 'D14', meta: 'Per-night headcount', due: 'DAILY', dueClass: 'ok', slug: 'daily-attendance' },
          { n: 'Daily Decisions', p: 'D15', meta: 'Salvations, healings…', due: 'DAILY', dueClass: 'ok', slug: 'daily-decisions' },
          { n: 'Daily Program', p: 'D16', meta: 'Speaker, topic, notes', due: 'DAILY', dueClass: 'ok', slug: 'daily-program' },
          { n: 'Security Incident', p: 'D17', meta: 'Crowd / safety log', due: 'AS NEEDED', dueClass: 'ok', slug: 'daily-security' },
          { n: 'Medical Incident', p: 'D18', meta: 'First aid / hospital', due: 'AS NEEDED', dueClass: 'ok', slug: 'daily-medical' },
          { n: 'Activity Quick-Log', p: 'D19', meta: 'One-line micro-log', due: 'ANYTIME', dueClass: 'ok', slug: 'activity-quick-log' },
        ],
      },
    ],
    [pcmMeta, botMeta, cpcMeta, awarenessMeta, weeklyMeta, expensesMeta],
  );

  const allRows = useMemo<GroupedRow[]>(
    () => groups.flatMap((g) => g.rows.map((r) => ({ ...r, group: g.key }))),
    [groups],
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      !q
        ? []
        : allRows.filter(
            (r) =>
              r.n.toLowerCase().includes(q) ||
              r.p.toLowerCase().includes(q) ||
              r.meta.toLowerCase().includes(q) ||
              r.slug.toLowerCase().includes(q),
          ),
    [allRows, q],
  );

  const open = (slug: string) => router.push(`/forms/${slug}` as never);

  const Row = ({ r }: { r: FormRow }) => {
    const sc = statusColors[r.dueClass] ?? statusColors.ok;
    return (
      <Pressable style={styles.row} onPress={() => open(r.slug)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{r.n}</Text>
          <Text style={styles.rowMeta}>
            {r.p} · {r.meta}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: sc.bg }]}>
          <Text style={[styles.pillText, { color: sc.fg }]}>{r.due}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Forms</Text>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search forms…"
          placeholderTextColor={sand.ink3}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {q ? (
          <>
            <View style={styles.secRow}>
              <Text style={styles.secLabel}>RESULTS</Text>
              <Text style={styles.secCount}>{filtered.length}</Text>
            </View>
            <View style={styles.card}>
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No forms match.</Text>
              ) : (
                filtered.map((r, i) => (
                  <View key={r.slug} style={i > 0 && styles.divider}>
                    <Row r={r} />
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          groups.map((g) => (
            <View key={g.key}>
              <View style={styles.secRow}>
                <Text style={styles.secLabel}>{g.title}</Text>
                <Text style={styles.secCount}>{g.rows.length}</Text>
              </View>
              <View style={styles.card}>
                {g.rows.map((r, i) => (
                  <View key={r.slug} style={i > 0 && styles.divider}>
                    <Row r={r} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  title: { fontSize: 28, fontWeight: '700', color: sand.ink, marginBottom: space.md },
  search: {
    backgroundColor: sand.surface,
    borderWidth: 1,
    borderColor: sand.line2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: sand.ink,
  },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  secLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: sand.ink3 },
  secCount: { fontSize: 11, fontWeight: '600', color: sand.ink3 },
  card: { ...cardSurface, paddingHorizontal: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 14 },
  rowName: { fontSize: 15, fontWeight: '600', color: sand.ink },
  rowMeta: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
  chevron: { fontSize: 18, color: sand.ink3, marginLeft: 2 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
});
