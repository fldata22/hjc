export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function last14Days(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function formatDayLabel(iso: string): { dow: string; dnum: string } {
  const d = new Date(iso + 'T00:00:00');
  return {
    dow: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    dnum: String(d.getDate()),
  };
}

export function relativeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const ms = Math.max(0, now - then);
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(ms / 86_400_000);
  if (days === 1) return 'YEST';
  return `${days}D`;
}

/**
 * Compact crusade-progress label for sidebars/drawers.
 * Pre-crusade: "Day N of 84 · K days out" (planning runway = 12 weeks before opens_at).
 * During run: "Day N of M · live". After closes_at: "Closed".
 */
export function crusadeProgressLabel(opens_at: string | undefined, closes_at: string | undefined): string {
  if (!opens_at || !closes_at) return '';
  const today = Date.now();
  const opens = new Date(opens_at).getTime();
  const closes = new Date(closes_at).getTime();
  const planningDays = 84;
  const planningStart = opens - planningDays * 86_400_000;

  if (today < opens) {
    const dayN = Math.max(1, Math.round((today - planningStart) / 86_400_000));
    const daysOut = Math.max(0, Math.round((opens - today) / 86_400_000));
    return `Day ${Math.min(dayN, planningDays)} of ${planningDays} · ${daysOut} days out`;
  }
  if (today <= closes) {
    const totalRunDays = Math.max(1, Math.round((closes - opens) / 86_400_000) + 1);
    const dayN = Math.max(1, Math.round((today - opens) / 86_400_000) + 1);
    return `Day ${dayN} of ${totalRunDays} · live`;
  }
  return 'Closed';
}
