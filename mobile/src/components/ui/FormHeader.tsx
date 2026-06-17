import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { elevation, headerBand, radius, sand, space } from '@/theme/tokens';

/**
 * Bold form header — a back link plus a terracotta-filled band carrying the title,
 * an optional priority pillar pill, and an optional headline stat. Shared so every
 * form screen looks identical and the whole treatment re-skins from one place.
 */
export function FormHeader({
  title,
  pillar,
  statNum,
  statLabel,
  backLabel = '‹ Back to forms',
}: {
  title: string;
  pillar?: string;
  statNum?: string | number;
  statLabel?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  return (
    <>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={styles.back}>{backLabel}</Text>
      </Pressable>
      <View style={styles.band}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {pillar ? (
            <View style={styles.pillar}>
              <Text style={styles.pillarText}>{pillar}</Text>
            </View>
          ) : null}
        </View>
        {statNum !== undefined ? (
          <View style={styles.statStrip}>
            <Text style={styles.statNum}>{statNum}</Text>
            {statLabel ? <Text style={styles.statLabel}>{statLabel}</Text> : null}
          </View>
        ) : null}
      </View>
    </>
  );
}

/** Solid terracotta call-to-action (e.g. "Add trustee") used below a list. */
export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.cta} onPress={onPress}>
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14, fontWeight: '600', color: sand.ink2, marginBottom: space.md },
  band: { ...headerBand, padding: space.xl, marginTop: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: sand.onAccent, flex: 1 },
  pillar: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginLeft: space.sm,
  },
  pillarText: { fontSize: 11, fontWeight: '800', color: sand.onAccent, letterSpacing: 0.5 },
  statStrip: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  statNum: { fontSize: 34, fontWeight: '800', color: sand.onAccent },
  statLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  cta: {
    marginTop: space.lg,
    backgroundColor: sand.accent,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    ...elevation,
    shadowColor: sand.accent,
    shadowOpacity: 0.4,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: sand.onAccent },
});
