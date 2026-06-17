// HJC "Bold Sand" design system — warm sand palette (like the original) carried by the
// new bold structure: filled header bands, filled fields, solid buttons, high contrast.
// (Export name `sand` kept so the whole app re-skins from here without import churn.)
import { type ViewStyle } from 'react-native';

export const sand = {
  bg: '#F2ECE1',        // warm sand base (original)
  surface: '#FFFFFF',
  surface2: '#FBF6EE',
  chipBg: '#F3EAD8',    // warm cream — filled fields / chips
  ink: '#211C16',       // warm near-black, high contrast
  ink2: '#5C554B',      // muted body text
  ink3: '#9C9286',      // placeholder / faint
  line: '#E7DECF',
  line2: '#D8CDB9',
  accent: '#B4530A',    // terracotta / burnt orange — the warm brand (filled boldly)
  accentInk: '#8A3D06', // deeper terracotta — pressed / band shadow
  accentBg: '#F6EAD9',  // soft warm wash
  onAccent: '#FFFFFF',  // text/icon on the brand color
  // Warm, editorial status colours (olive / gold / terracotta).
  ok: '#5C7A1E',
  okBg: '#EAF0DC',
  warn: '#B6852A',
  warnBg: '#F6EBD2',
  risk: '#C0492B',
  riskBg: '#F4DED6',
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const font = {
  kicker: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1.4 },
  label: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  sub: { fontSize: 13, fontWeight: '400' as const },
};

// Warm soft elevation for cards.
export const elevation: ViewStyle = {
  shadowColor: '#7A6443',
  shadowOpacity: 0.14,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

// Bold colored header band (brand-filled) — spread by form screens for a vibrant top.
export const headerBand: ViewStyle = {
  backgroundColor: sand.accent,
  borderRadius: radius.xl,
  shadowColor: sand.accent,
  shadowOpacity: 0.32,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

// Shared elevated surface — screens spread this so the look stays centralised.
export const cardSurface: ViewStyle = {
  backgroundColor: sand.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: sand.line,
  ...elevation,
};

// Status pill colours by semantic class (mirrors web .status / .flr-status variants).
export const statusColors: Record<string, { bg: string; fg: string }> = {
  ok: { bg: sand.okBg, fg: sand.ok },
  confirmed: { bg: sand.okBg, fg: sand.ok },
  warn: { bg: sand.warnBg, fg: sand.warn },
  pending: { bg: sand.warnBg, fg: sand.warn },
  urgent: { bg: sand.riskBg, fg: sand.risk },
  declined: { bg: sand.riskBg, fg: sand.risk },
};
