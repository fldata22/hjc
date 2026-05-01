# Mission Control API Wiring (read-only) — Design Spec

**Date:** 2026-05-01
**Status:** Approved, ready for implementation plan

## Goal

Wire the three read-only director screens (Home, Pillars, Activity) to the existing Laravel API hooks instead of hardcoded mock data. Director sees real numbers from the actual crusade. Weekly screen stays mocked — its read+write semantics get their own chunk later.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Scope | **A.** Read-only screens only (Home, Pillars, Activity). Weekly stays mocked, becomes its own chunk. |
| 2 | API gaps strategy | **A.** Compute client-side where possible, drop UI elements where not. Forms-due card removed. Source-tab name removed. "+pts" activity tags removed. Composite hero = avg of non-null powers value_pct. Week-over-week delta = current value_pct − last week's reading. |
| 3 | Loading + error UX | **A.** Per-query partial degradation. Skeleton placeholders for hero numbers, "Loading…" inline for lists. Inline error banner with Retry button per failed query — partial data still renders. |

## Architecture

### Hooks consumed (all already exist in `web/src/api/hooks.ts`)

- `useMissionControl()` — `top_stats`, `powers` (13 with code, name, value_pct, status), `top_risks`, `crusade`
- `useWeeklyLatest()` — latest weekly assessment with `readings` array per power for week-over-week delta
- `useActivityEntries({ per_page, power? })` — paginated activity log with `power.code` and `power.name`
- `useAuth().user` — already in scope; provides `{ name }` for the greeting

No new hooks. No new API endpoints.

### Computed values (client-side derivations)

These are not directly in the API and get computed in each screen's component:

- **Composite readiness %** = `Math.round(avg(powers.filter(p => p.value_pct != null).map(p => p.value_pct)))`. Returns `null` (rendered as "—") if all powers are null.
- **On-track count** for "5 of 13 on track" subtitle = `powers.filter(p => (p.value_pct ?? 0) >= 75).length`.
- **At-risk count** for filter chip = `powers.filter(p => (p.value_pct ?? 0) < 50).length`. **Holding count** = `50 ≤ value_pct < 75`. **On-track count** = `≥ 75`.
- **Pillar week-over-week delta** = for each power, find `weekly?.readings.find(r => r.power.code === p.code)` and compute `(p.value_pct ?? 0) - (matched?.value_pct ?? null)`. Skip the line if no matched reading.
- **Day countdown** = compute days remaining and current day from `mc.crusade.opens_at`. Days from `crusade.opens_at` and total from `crusade.closes_at - crusade.opens_at`.
- **Activity day grouping** = `groupBy(entries, e => e.occurred_at.slice(0, 10))`.
- **Activity relative day label** = "Today" if `date === today`, "Yesterday" if `date === yesterday`, otherwise `formatDayLabel(date)` from `lib/dateHelpers.ts`.
- **Activity entry time** = `occurred_at` parsed and formatted as `HH:MM`.
- **Activity entry "ago" label** (Home recent activity) = "Xh AGO" / "YEST" / "Xd" based on `Date.now() - new Date(occurred_at).getTime()`.

### Removed UI elements

| Element | Where | Reason |
|---|---|---|
| "Due this week · 3 forms" card | Home | No backend for forms-due dates |
| Pillar source-tab name ("PCM tab") | Pillars rows | Not on the powers payload |
| "+4 PTS" activity tag | Home recent activity + Activity rows | No points field on activity entries |
| "Weekly" filter chip | Activity | No clean filter for weekly assessment entries via the activity power filter |

### Refetch strategy

React Query defaults: `refetchOnWindowFocus: true`. No `staleTime` change. No interval polling for v1.

`apiFetch` already exists in `web/src/api/client.ts` and handles auth via `Authorization: Bearer <token>` from localStorage.

### File touch list

**Modify:**
- `web/src/screens/app/HomeScreen.tsx` — replace hardcoded data with hook calls, drop forms-due card, add loading + error states
- `web/src/screens/app/PillarsScreen.tsx` — replace local `PILLARS` import with `useMissionControl + useWeeklyLatest`, derive filter counts + delta, add loading + error states
- `web/src/screens/app/ActivityScreen.tsx` — replace hardcoded entries with `useActivityEntries`, group by day, map chips to power codes, add loading + error states
- `web/src/screens/app/app.css` — change `.app-root .home-grid` `grid-template-columns` from `repeat(3, 1fr)` to `repeat(2, 1fr)` (forms-due card removed; grid drops one column)
- `web/src/lib/dateHelpers.ts` — add `relativeAgo(iso)` helper

**No file create / delete.** No new components, no API hook additions.

The `PILLARS` constant in `web/src/screens/app/Shell.tsx` STAYS — Weekly still imports it. Removed in the future Weekly-wiring chunk.

## Per-screen detail

### `HomeScreen`

**Imports added:**
```tsx
import { useAuth } from '../../auth/useAuth';
import { useMissionControl, useActivityEntries } from '../../api/hooks';
```

**State / hooks at top of component (replaces local PILLARS usage):**
```tsx
const { user } = useAuth();
const { data: mc, isLoading: mcLoading, isError: mcError, refetch: refetchMc } = useMissionControl();
const { data: activity, isLoading: actLoading, isError: actError, refetch: refetchAct } = useActivityEntries({ per_page: 4 });
```

**Greeting:** `Good morning,<br/><em>{user?.name ?? 'Director'}.</em>` (drops the hardcoded "Bishop Lovell").

**Eyebrow:** Compute day-counter from `mc?.crusade.opens_at`. If `mc` not loaded, fall back to a faded "…" placeholder.

```tsx
function dayLabel(crusade: { opens_at: string; closes_at: string } | undefined): string {
  if (!crusade) return '…';
  const today = new Date();
  const opens = new Date(crusade.opens_at);
  const closes = new Date(crusade.closes_at);
  const totalDays = Math.round((closes.getTime() - opens.getTime()) / 86_400_000);
  const daysIn = Math.round((today.getTime() - opens.getTime()) / 86_400_000);
  const dow = today.toLocaleDateString('en-GB', { weekday: 'short' });
  const dom = today.getDate();
  const month = today.toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} · ${dom} ${month} · Day ${Math.max(0, daysIn)} / ${totalDays}`;
}
```

**Composite hero:** Replace the hardcoded `<div className="num serif">64<small>%</small></div>` with:

```tsx
const composite = useMemo(() => {
  if (!mc) return null;
  const valid = mc.powers.filter(p => p.value_pct != null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, p) => s + (p.value_pct ?? 0), 0) / valid.length);
}, [mc]);

const onTrackCount = useMemo(() => {
  if (!mc) return 0;
  return mc.powers.filter(p => (p.value_pct ?? 0) >= 75).length;
}, [mc]);
```

Hero rendering:
```tsx
{mcError ? (
  <ErrorBanner what="composite readiness" onRetry={refetchMc}/>
) : mcLoading ? (
  <div className="num serif" style={{ background: 'var(--bg-2)', color: 'var(--bg-2)', borderRadius: 4 }}>
    00<small>%</small>
  </div>
) : (
  <div className="num serif">
    {composite !== null ? <>{composite}<small>%</small></> : <>—</>}
  </div>
)}
```

(The skeleton trick: render the same JSX as final but with `background: var(--bg-2); color: var(--bg-2)` so the digits are invisible against the placeholder. Layout doesn't shift when data arrives.)

**Pillar strip 13 chips:** Replace `PILLARS.map(...)` with `mc.powers.map(...)`. Each chip:

```tsx
{(mcLoading ? Array(13).fill(null) : mc?.powers ?? []).map((p, i) => (
  <div
    key={p?.code ?? i}
    className={'chip' + (p && (p.value_pct ?? 0) < 50 ? ' acc' : '')}
    style={{ ['--f' as never]: p ? (p.value_pct ?? 0) / 100 : 0 } as React.CSSProperties}
  >
    <span>{p?.code[0] ?? ''}</span>
  </div>
))}
```

(Loading state: render 13 grey chips with empty letters. When data arrives, letters appear.)

**Forms-due card:** **DELETE the entire `<section className="home-card">` for "Due this week"** and the corresponding `<div className="hr full"/>` if any. Home grid goes from 3 cards to 2. Update CSS if needed (but `.home-grid { grid-template-columns: repeat(3, 1fr) }` may need to become `repeat(2, 1fr)` if the third card was load-bearing for visual balance — verify in browser).

Actually — the home-grid CSS uses `repeat(3, 1fr)`. Two options:
1. Change to `repeat(2, 1fr)` and let the cards be wider
2. Keep `repeat(3, 1fr)` and let one cell be empty (visually breaks)

Pick (1). Update `web/src/screens/app/app.css` `.app-root .home-grid { grid-template-columns: repeat(2, 1fr); }`. This is a small CSS edit bundled with HomeScreen.tsx.

Wait — that's now 2 file changes per task. Let me adjust the file touch list to include `app.css`.

**Pillars at risk card:** Replace the existing `[...PILLARS].sort(...).slice(0, 4).map(...)` with:

```tsx
{[...(mc?.powers ?? [])]
  .filter(p => (p.value_pct ?? 0) < 50)
  .sort((a, b) => (a.value_pct ?? 0) - (b.value_pct ?? 0))
  .slice(0, 4)
  .map((p) => (
    <div className="at-risk-row" key={p.code}>
      <span className="L serif">{p.code[0]}</span>
      <span className="nm">{p.name}</span>
      <span className="pct">{p.value_pct}<small>%</small></span>
    </div>
  ))}
```

Subtitle "{n} below 50%" computed from same filter.

**Recent activity card:** Replace 4 hardcoded `<div className="activity-item">` blocks with mapped activity entries:

```tsx
{actError ? (
  <ErrorBanner what="recent activity" onRetry={refetchAct}/>
) : actLoading ? (
  <div className="loading">Loading…</div>
) : (activity?.data.length ?? 0) === 0 ? (
  <div className="empty">No activity yet.</div>
) : (
  activity!.data.slice(0, 4).map((e) => (
    <div className="activity-item" key={e.id}>
      <div className="when">{relativeAgo(e.occurred_at)}</div>
      <div className="what">
        {e.description}
        <div className="tag">{e.power.code} · {e.power.name.toUpperCase()}</div>
      </div>
    </div>
  ))
)}
```

`relativeAgo(iso)` is a small helper in `lib/dateHelpers.ts` (extends the existing helpers). Returns "Xh AGO" / "YEST" / "Xd" based on time elapsed.

### `PillarsScreen`

**Imports added:**
```tsx
import { useMissionControl, useWeeklyLatest } from '../../api/hooks';
```

**Imports REMOVED:**
- The `PILLARS` import from `./Shell` (no longer used here; still exported for Weekly).

**Hooks at top:**
```tsx
const { data: mc, isLoading, isError, refetch } = useMissionControl();
const { data: weekly } = useWeeklyLatest();
```

**Filter type:**
```tsx
type Filter = 'all' | 'risk' | 'hold' | 'track';
```

**Computed sets:**
```tsx
const allPowers = mc?.powers ?? [];
const composite = /* same formula as Home */;

const filtered = useMemo(() => {
  return allPowers
    .filter((p) => {
      const v = p.value_pct ?? 0;
      if (filter === 'risk') return v < 50;
      if (filter === 'hold') return v >= 50 && v < 75;
      if (filter === 'track') return v >= 75;
      return true;
    })
    .sort((a, b) => (a.value_pct ?? 0) - (b.value_pct ?? 0));
}, [allPowers, filter]);

const riskCount = allPowers.filter(p => (p.value_pct ?? 0) < 50).length;
const holdCount = allPowers.filter(p => { const v = p.value_pct ?? 0; return v >= 50 && v < 75; }).length;
const trackCount = allPowers.filter(p => (p.value_pct ?? 0) >= 75).length;
```

**Eyebrow:** "13 pillars · weighted composite {composite ?? '—'}%".
**Filter chips:** counts come from the computed numbers above.
**Sort label:** stays "Sorted: lowest first".
**List rows:** replace `sorted.map((p, i) => ...)` with `filtered.map((p) => ...)`. For each:
- Letter: `p.code[0]` (Playfair serif)
- Name: `p.name`
- Bar: width `${p.value_pct ?? 0}%`, accent class if `< 50`
- Pct number: `{p.value_pct ?? '—'}%`
- Delta line (replaces source-tab name + delta):
  ```tsx
  {(() => {
    const reading = weekly?.readings?.find(r => r.power.code === p.code);
    if (!reading || p.value_pct == null) return null;
    const dir = p.value_pct - reading.value_pct;
    return (
      <div className="pillar-meta" style={{ marginTop: 8 }}>
        <span className={dir >= 0 ? 'delta-up' : 'delta-down'}>
          {dir >= 0 ? '▲' : '▼'} {Math.abs(dir)} pts wk
        </span>
      </div>
    );
  })()}
  ```

**Loading/error/empty:** error banner replaces the list area. Loading → "Loading pillars…" centered. Empty → "No pillar data yet." centered.

### `ActivityScreen`

**Imports added:**
```tsx
import { useActivityEntries } from '../../api/hooks';
import { todayISO, formatDayLabel } from '../../lib/dateHelpers';
```

**Power code map for chips:**
```tsx
const POWER_CHIP_MAP: Record<string, string | undefined> = {
  all: undefined,
  pcm: 'P1',
  workers: 'P6',
  govt: 'P5',
  awareness: 'A9',
};
```

(The "weekly" chip from the original mock is dropped — no clean power filter for it.)

**Hooks at top:**
```tsx
const [chip, setChip] = useState<string>('all');
const { data: resp, isLoading, isError, refetch } = useActivityEntries({
  per_page: 50,
  power: POWER_CHIP_MAP[chip],
});
```

**Stat-strip eyebrow:** "All submissions · 30-day window". Drop the chip-specific copy ("PCM submissions" etc.) for v1; keep generic.

**Chips:** All / PCM / Workers / Govt / Awareness. Each chip has a count — but the API doesn't give per-chip counts upfront. Two options:
1. Show count on chip when chip is active (request returns `meta.total`)
2. Don't show count

Pick **(2) don't show count**. Activity API doesn't return per-power totals in a single request, and making 5 requests to populate chip counts is wasteful. Counts can come back as a separate aggregation endpoint later. For v1, chips show just the label.

**Day grouping + rendering:**

```tsx
const grouped = useMemo(() => {
  const out = new Map<string, ActivityEntry[]>();
  for (const e of (resp?.data ?? [])) {
    const day = e.occurred_at.slice(0, 10);
    if (!out.has(day)) out.set(day, []);
    out.get(day)!.push(e);
  }
  return Array.from(out.entries()).sort(([a], [b]) => b.localeCompare(a));
}, [resp]);

function dayLabel(iso: string): string {
  const today = todayISO();
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  if (iso === yest) return 'Yesterday';
  const { dow, dnum } = formatDayLabel(iso);
  const month = new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} · ${dnum} ${month}`;
}
```

**List rendering:**

```tsx
{isError ? (
  <ErrorBanner what="activity log" onRetry={refetch}/>
) : isLoading ? (
  <div className="loading">Loading activity…</div>
) : grouped.length === 0 ? (
  <div className="empty">No activity entries.</div>
) : (
  grouped.map(([day, entries]) => (
    <div key={day}>
      <div className="day-head">
        <b>{dayLabel(day)}</b>
        <span>{relativeDayLabel(day)}</span>
      </div>
      {entries.map((e) => {
        const time = new Date(e.occurred_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        return (
          <div className="act-row" key={e.id}>
            <div className="time">{time}</div>
            <div className="body">
              <div className="what">{e.description}</div>
              <div className="meta">
                <span>{e.power.name}</span>
              </div>
              <div className="impact">{e.power.code} · {e.power.name.toUpperCase()}</div>
            </div>
          </div>
        );
      })}
    </div>
  ))
)}
```

`relativeDayLabel(iso)` returns the "Wed · 30 Apr" / "Tue · 29 Apr" / "2 days ago" / "3 days ago" suffix based on the day's distance from today.

### Loading/error/empty UX (shared patterns)

**Skeleton block** (used inline where size matters):
```tsx
<div style={{ background: 'var(--bg-2)', color: 'var(--bg-2)', borderRadius: 4 }}>{placeholderContent}</div>
```

**Loading text** (for list areas):
```tsx
<div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading {what}…</div>
```

**Error banner** (small inline component, defined per-screen — not extracted):
```tsx
<div style={{
  padding: '14px 16px',
  margin: '12px 20px',
  background: 'var(--accent-bg)',
  border: '1px solid var(--accent-soft)',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}}>
  <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load {what}.</div>
  <button
    type="button"
    onClick={onRetry}
    style={{
      padding: '6px 12px',
      fontSize: 12,
      fontWeight: 500,
      borderRadius: 999,
      border: '1px solid var(--accent)',
      background: 'transparent',
      color: 'var(--accent)',
      fontFamily: 'inherit',
      cursor: 'pointer',
    }}
  >
    Retry
  </button>
</div>
```

If a 4th consumer needs error banner, lift to a shared component then. For v1, repeating the JSX in 3 files is acceptable.

**Empty state** (for "data succeeded but empty"):
```tsx
<div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>{message}</div>
```

### `relativeAgo` helper

Add to `web/src/lib/dateHelpers.ts`:

```ts
export function relativeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const ms = now - then;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(ms / 86_400_000);
  if (days === 1) return 'YEST';
  return `${days}D`;
}
```

## Implementation order (suggested)

1. Add `relativeAgo` to `dateHelpers.ts`. Verify typecheck.
2. Wire `ActivityScreen` (simplest — single hook, no derivations). Manual smoke at `/activity`.
3. Wire `PillarsScreen` (medium — two hooks, computed delta). Manual smoke at `/pillars`.
4. Wire `HomeScreen` (most complex — three hooks, drops a card, CSS update for grid). Manual smoke at `/`.
5. Manual sweep at phone (393), tablet (820), desktop (1280) on all three screens. Verify loading + error states by toggling network throttle in DevTools.

## Non-goals (explicitly out of scope)

- **Weekly screen wiring** — its own chunk, includes write semantics (`useReplaceReadings`, `useReplaceRisks`, optimistic updates, dirty-state warnings).
- **Forms-due card on Home** — removed entirely. Returns when a backend exists for form due-dates.
- **Activity per-chip count badges** — chip labels only, no counts. Future work could add an aggregation endpoint.
- **"Weekly" filter chip on Activity** — dropped. No clean power-code filter for weekly assessment entries.
- **Source-tab name on Pillars** — dropped. Not on the API payload.
- **"+pts" tags on activity rows** — dropped. Not on the API payload.
- **Real-time refresh / polling** — React Query default (refetch on focus) only. No setInterval.
- **Optimistic updates** — none. All reads are server-truth.
- **Error toasts** — inline banners only. A toast component is a separate cleanup chunk.
- **Auth changes** — assumes `useAuth().user.name` is available. No new auth work.
- **PILLARS const removal** — stays in Shell.tsx since Weekly still uses it.
- **CSS additions** — only one CSS edit (home-grid columns 3 → 2). All other styling is inline in JSX.

## Open follow-ups (post-implementation)

- **Weekly screen wiring** (read + write).
- **Forms hub data** — currently hardcoded rows. Each row's status/due could come from its own backend table if/when forms tables exist.
- **Forms-due card returns to Home** once forms have due-dates.
- **Activity per-chip counts** via aggregation endpoint.
- **Real-time refresh** for the screens the director keeps open.
- **Toast component** for non-critical errors (instead of inline banner).
- **Optimistic updates** when write screens land.
