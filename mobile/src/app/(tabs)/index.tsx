import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActivityEntries, useCrusade, useMissionControl } from '@/api/hooks';
import { useAuth } from '@/lib/auth';
import { cardSurface, sand, space } from '@/theme/tokens';

function dayLabel(crusade: { opens_at: string; closes_at: string } | undefined): string {
  if (!crusade) return '…';
  const today = Date.now();
  const opens = new Date(crusade.opens_at).getTime();
  const closes = new Date(crusade.closes_at).getTime();
  const totalDays = Math.max(1, Math.round((closes - opens) / 86_400_000));
  const daysIn = Math.max(0, Math.round((today - opens) / 86_400_000));
  return `Day ${daysIn} / ${totalDays}`;
}

function relativeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function barColor(pct: number): string {
  if (pct < 50) return sand.risk;
  if (pct < 75) return sand.warn;
  return sand.ok;
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { data: crusade } = useCrusade();
  const { data: mc, isLoading: mcLoading, isError: mcError } = useMissionControl();
  const { data: activity, isLoading: actLoading } = useActivityEntries({ per_page: 4 });

  const composite = useMemo(() => {
    if (!mc) return null;
    const valid = mc.powers.filter((p) => p.value_pct != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, p) => s + (p.value_pct ?? 0), 0) / valid.length);
  }, [mc]);

  const onTrackCount = useMemo(
    () => (mc ? mc.powers.filter((p) => (p.value_pct ?? 0) >= 75).length : 0),
    [mc],
  );

  const atRisk = useMemo(() => {
    if (!mc) return [];
    return [...mc.powers]
      .filter((p) => (p.value_pct ?? 0) < 50)
      .sort((a, b) => (a.value_pct ?? 0) - (b.value_pct ?? 0))
      .slice(0, 4);
  }, [mc]);

  const acts = activity?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>HJC MISSION CONTROL</Text>
            <Text style={styles.city}>{crusade?.city ?? 'HJC'}</Text>
            <Text style={styles.day}>{dayLabel(crusade)}</Text>
          </View>
          <Pressable onPress={logout} hitSlop={8}>
            <Text style={styles.signout}>Sign out</Text>
          </Pressable>
        </View>

        {/* Readiness */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>OVERALL READINESS</Text>
          {mcLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : mcError ? (
            <Text style={styles.errorText}>Couldn’t load mission control.</Text>
          ) : (
            <>
              <View style={styles.readingRow}>
                <Text style={styles.readingNum}>{composite ?? '—'}</Text>
                <Text style={styles.readingUnit}>%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${composite ?? 0}%`, backgroundColor: barColor(composite ?? 0) },
                  ]}
                />
              </View>
              <Text style={styles.readingSub}>
                {onTrackCount} of {mc?.powers.length ?? 0} pillars on track (≥75%)
              </Text>
            </>
          )}
        </View>

        {/* At-risk pillars */}
        <View style={styles.secLabelRow}>
          <Text style={styles.secLabel}>NEEDS ATTENTION</Text>
          <Text style={styles.secCount}>{atRisk.length} below 50%</Text>
        </View>
        <View style={styles.card}>
          {mcLoading ? (
            <ActivityIndicator />
          ) : atRisk.length === 0 ? (
            <Text style={styles.empty}>No pillars below 50%. 💪</Text>
          ) : (
            atRisk.map((p, i) => (
              <View key={p.code} style={[styles.pillarRow, i > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pillarName}>{p.name}</Text>
                  <View style={styles.miniTrack}>
                    <View
                      style={[
                        styles.miniFill,
                        {
                          width: `${p.value_pct ?? 0}%`,
                          backgroundColor: barColor(p.value_pct ?? 0),
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.pillarPct}>{p.value_pct ?? 0}%</Text>
              </View>
            ))
          )}
        </View>

        {/* Recent activity */}
        <View style={styles.secLabelRow}>
          <Text style={styles.secLabel}>RECENT ACTIVITY</Text>
        </View>
        <View style={styles.card}>
          {actLoading ? (
            <ActivityIndicator />
          ) : acts.length === 0 ? (
            <Text style={styles.empty}>No activity yet.</Text>
          ) : (
            acts.map((e, i) => (
              <View key={e.id} style={[styles.actRow, i > 0 && styles.divider]}>
                <Text style={styles.actWhen}>{relativeAgo(e.occurred_at)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actWhat}>{e.description}</Text>
                  <Text style={styles.actTag}>
                    {e.power.code} · {e.power.name}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: sand.accent },
  city: { fontSize: 32, fontWeight: '800', color: sand.ink, marginTop: 3 },
  day: { fontSize: 13, color: sand.ink3, marginTop: 2 },
  signout: { fontSize: 13, fontWeight: '600', color: sand.ink2, marginTop: 6 },

  card: {
    ...cardSurface,
    padding: space.xl,
    marginTop: space.lg,
  },
  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: sand.ink3 },
  errorText: { color: sand.risk, fontSize: 13, marginTop: 10 },

  readingRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  readingNum: { fontSize: 56, fontWeight: '800', color: sand.ink, lineHeight: 58 },
  readingUnit: { fontSize: 24, fontWeight: '800', color: sand.accent, marginBottom: 9, marginLeft: 3 },
  track: { height: 10, borderRadius: 6, backgroundColor: sand.line, marginTop: 14, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 6 },
  readingSub: { fontSize: 13, color: sand.ink2, marginTop: 10 },

  secLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xxl,
  },
  secLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: sand.ink3 },
  secCount: { fontSize: 11, fontWeight: '600', color: sand.ink3 },

  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  pillarName: { fontSize: 14, color: sand.ink, marginBottom: 6 },
  miniTrack: { height: 6, borderRadius: 3, backgroundColor: sand.line, overflow: 'hidden' },
  miniFill: { height: 6, borderRadius: 3 },
  pillarPct: { fontSize: 14, fontWeight: '700', color: sand.ink2, width: 44, textAlign: 'right' },

  actRow: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  actWhen: { fontSize: 11, color: sand.ink3, width: 60 },
  actWhat: { fontSize: 14, color: sand.ink },
  actTag: { fontSize: 11, color: sand.accent, marginTop: 2 },

  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.md },
});
