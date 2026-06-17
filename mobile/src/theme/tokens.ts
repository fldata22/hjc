// HJC "Evolved Sand" design system — warm editorial palette (chosen direction A).
import { type ViewStyle } from 'react-native';

export const sand = {
  bg: '#F2ECE1',
  surface: '#FFFFFF',
  surface2: '#FBF6EE',
  chipBg: '#F6F1E7',
  ink: '#211C16',
  ink2: '#5C554B',
  ink3: '#9C9286',
  line: '#E7DECF',
  line2: '#D8CDB9',
  accent: '#B45309',
  accentBg: '#F6EAD9',
  // Warmer, editorial status colours (olive / muted gold / terracotta) — more premium than bright RGB.
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

// Soft elevation for cards (the "evolved" depth).
export const elevation: ViewStyle = {
  shadowColor: '#8A7A5E',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
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
