# Mission Control API Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Home, Pillars, and Activity screens to the existing Laravel API hooks so the director sees real numbers instead of hardcoded mocks. Weekly stays mocked (separate chunk).

**Architecture:** Each screen swaps its hardcoded data for `useMissionControl()` / `useWeeklyLatest()` / `useActivityEntries()` hooks (already in `web/src/api/hooks.ts`). Composite % and pillar week-over-week deltas are computed client-side. UI elements with no API source (forms-due card, source-tab name, "+pts" tags) are removed. Per-query partial degradation: skeleton placeholders for hero numbers, "Loading…" for lists, inline error banners with retry per failed query.

**Tech Stack:** React 19, TypeScript, Vite 8, React Query (already wired). No new dependencies. No test framework — verification is `tsc --noEmit` + `npm run build` + manual viewport check at 393px / 820px / 1280px.

**Spec:** `docs/superpowers/specs/2026-05-01-mission-control-wiring-design.md`

**Conventions:**
- All paths relative to `/Users/adebimpegodwin/Projects/hjc`.
- All `npm`/`npx` commands from `web/`.
- Each task ends with a defensive-staged commit (`hjc.code-workspace` is the only expected leftover untracked file).

---

## Task 1: Add `relativeAgo` helper to `dateHelpers.ts`

Tiny pure helper. Renders "Xh AGO" / "YEST" / "Xd" for the Home recent-activity column.

**Files:**
- Modify: `web/src/lib/dateHelpers.ts`

- [ ] **Step 1: Append the helper to `dateHelpers.ts`**

Open `/Users/adebimpegodwin/Projects/hjc/web/src/lib/dateHelpers.ts`. Append this function at the end of the file:

```ts
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
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 3: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/lib/dateHelpers.ts
git diff --cached --stat
# Expected: ONLY dateHelpers.ts
```

If `git diff --cached --stat` shows ANY other file, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): add relativeAgo helper to dateHelpers

Returns "Xh AGO" / "YEST" / "Xd" for an ISO timestamp. Used by the
Home screen's recent-activity column to format ActivityEntry
occurred_at into the design's compact "when" column.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 1 of a 5-task plan wiring the read-only director screens (Home/Pillars/Activity) to the existing Laravel API. Tasks 2-4 wire each screen; Task 5 is the manual sweep.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main` (user has consented to commit directly).

**Existing state:** `dateHelpers.ts` already exports `todayISO`, `nowHHMM`, `last14Days`, `formatDayLabel`. `relativeAgo` is the new addition; nothing imports it yet (HomeScreen will in Task 4).

## Self-Review

- Did `git diff --cached --stat` show ONLY dateHelpers.ts?
- Does typecheck pass?
- Does build succeed?
- Does relativeAgo handle "future" timestamps gracefully (the `Math.max(0, ...)` clamp)?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA (`git log -1 --format=%H`)
- Confirmation `git show --stat HEAD` shows only dateHelpers.ts
- Self-review findings if any

---

## Task 2: Wire `ActivityScreen` to `useActivityEntries`

Replace the hardcoded entries with API data, group by day, map filter chips to power codes.

**Files:**
- Modify: `web/src/screens/app/ActivityScreen.tsx` — full rewrite

- [ ] **Step 1: Replace `ActivityScreen.tsx` entirely**

Replace the contents of `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/ActivityScreen.tsx` with this EXACT content:

```tsx
import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import { useActivityEntries, type ActivityEntry } from '../../api/hooks';
import { todayISO, formatDayLabel } from '../../lib/dateHelpers';
import './app.css';

const POWER_CHIP_MAP: Record<string, string | undefined> = {
  all: undefined,
  pcm: 'P1',
  workers: 'P6',
  govt: 'P5',
  awareness: 'A9',
};

const CHIPS: Array<{ k: string; l: string }> = [
  { k: 'all', l: 'All' },
  { k: 'pcm', l: 'PCM' },
  { k: 'workers', l: 'Workers' },
  { k: 'govt', l: 'Govt' },
  { k: 'awareness', l: 'Awareness' },
];

function dayLabel(iso: string): string {
  const today = todayISO();
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  if (iso === yest) return 'Yesterday';
  const { dow, dnum } = formatDayLabel(iso);
  const month = new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} · ${dnum} ${month}`;
}

function relativeDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Wed · 30 Apr'; // placeholder — never shown for today path
  const days = Math.round(
    (new Date(today + 'T00:00:00').getTime() - new Date(iso + 'T00:00:00').getTime()) / 86_400_000,
  );
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function entryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function ActivityScreen() {
  const [drawer, setDrawer] = useState(false);
  const [chip, setChip] = useState<string>('all');

  const { data: resp, isLoading, isError, refetch } = useActivityEntries({
    per_page: 50,
    power: POWER_CHIP_MAP[chip],
  });

  const grouped = useMemo(() => {
    const out = new Map<string, ActivityEntry[]>();
    for (const e of resp?.data ?? []) {
      const day = e.occurred_at.slice(0, 10);
      if (!out.has(day)) out.set(day, []);
      out.get(day)!.push(e);
    }
    return Array.from(out.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [resp]);

  return (
    <ResponsiveShell active="activity">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="activity-hero" style={{ padding: '20px 20px 24px' }}>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            All submissions · 30-day window
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Activity<br/><em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>log.</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>
            Every form submission feeding Mission Control, in chronological order.
          </p>
        </div>

        <div className="chips activity-chips" style={{ paddingBottom: 12 }}>
          {CHIPS.map((c) => (
            <div
              key={c.k}
              className={'chip' + (chip === c.k ? ' on' : '')}
              onClick={() => setChip(c.k)}
            >
              {c.l}
            </div>
          ))}
        </div>

        <div className="activity-log">
          {isError ? (
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
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load activity log.</div>
              <button
                type="button"
                onClick={() => refetch()}
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
          ) : isLoading ? (
            <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              Loading activity…
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              No activity entries.
            </div>
          ) : (
            grouped.map(([day, entries]) => (
              <div key={day}>
                <div className="day-head">
                  <b>{dayLabel(day)}</b>
                  {day !== todayISO() && <span>{relativeDayLabel(day)}</span>}
                </div>
                {entries.map((e) => (
                  <div className="act-row" key={e.id}>
                    <div className="time">{entryTime(e.occurred_at)}</div>
                    <div className="body">
                      <div className="what">{e.description}</div>
                      <div className="meta"><span>{e.power.name}</span></div>
                      <div className="impact">{e.power.code} · {e.power.name.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="bot-pad"/>
      </div>
      <TabBar active="activity"/>
      {drawer && <Drawer active="activity" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0. If 'ActivityEntry' type isn't exported from hooks.ts, the import will fail — STOP and report.
npm run build
# Expected: build succeeds
```

- [ ] **Step 3: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/app/ActivityScreen.tsx
git diff --cached --stat
# Expected: ONLY ActivityScreen.tsx
```

If any other file is staged, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): wire Activity screen to useActivityEntries

Replaces hardcoded activity entries with API data via
useActivityEntries({ per_page: 50, power? }). Groups entries
client-side by occurred_at date. Filter chips map to power codes
(All/PCM/Workers/Govt/Awareness — the "Weekly" chip is dropped
because activity entries don't have a clean weekly-assessment
filter on the API).

Per-query partial degradation: shows "Loading activity…", an
inline error banner with Retry, or "No activity entries." based
on the query state. Drops the +pts tags (no source on the API).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 2 of the 5-task mission-control wiring plan. Task 1 added the `relativeAgo` helper.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Existing state:**
- `web/src/api/hooks.ts` exports `useActivityEntries({ date?, power?, per_page? })` and the `ActivityEntry` type with shape `{ id, crusade_id, user_id, occurred_at, description, status, power: { id, code, name } }`.
- `web/src/lib/dateHelpers.ts` exports `todayISO`, `nowHHMM`, `last14Days`, `formatDayLabel`, and the new `relativeAgo`.
- `app.css` has `.day-head`, `.act-row`, `.time`, `.body`, `.what`, `.meta`, `.impact`, `.activity-log` and friends — all keep being used.

**Backend reality:** The `/api/activity-entries` endpoint backs `useActivityEntries`. Per-power filtering is server-side via the `power` query param (matches `power.code`).

## Self-Review

- Did `git diff --cached --stat` show ONLY ActivityScreen.tsx?
- Does typecheck pass?
- Does build succeed?
- Does the file import `ActivityEntry` as a `type` from hooks.ts (not as a value)?
- Does the day-grouping correctly sort dates descending so "Today" is at the top?
- Does the loading/error/empty branch render BEFORE the grouped list so we never show "0 entries" while still loading?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only ActivityScreen.tsx
- Self-review findings if any

---

## Task 3: Wire `PillarsScreen` to `useMissionControl + useWeeklyLatest`

Replace the local `PILLARS` import with API hooks. Compute filter counts and per-pillar week-over-week deltas.

**Files:**
- Modify: `web/src/screens/app/PillarsScreen.tsx` — full rewrite

- [ ] **Step 1: Replace `PillarsScreen.tsx` entirely**

Replace the contents of `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/PillarsScreen.tsx` with this EXACT content:

```tsx
import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import { useMissionControl, useWeeklyLatest } from '../../api/hooks';
import './app.css';

type Filter = 'all' | 'risk' | 'hold' | 'track';

export function PillarsScreen() {
  const [drawer, setDrawer] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const { data: mc, isLoading, isError, refetch } = useMissionControl();
  const { data: weekly } = useWeeklyLatest();

  const allPowers = useMemo(() => mc?.powers ?? [], [mc]);

  const composite = useMemo(() => {
    const valid = allPowers.filter((p) => p.value_pct != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, p) => s + (p.value_pct ?? 0), 0) / valid.length);
  }, [allPowers]);

  const riskCount = useMemo(() => allPowers.filter((p) => (p.value_pct ?? 0) < 50).length, [allPowers]);
  const holdCount = useMemo(() => allPowers.filter((p) => {
    const v = p.value_pct ?? 0;
    return v >= 50 && v < 75;
  }).length, [allPowers]);
  const trackCount = useMemo(() => allPowers.filter((p) => (p.value_pct ?? 0) >= 75).length, [allPowers]);

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

  return (
    <ResponsiveShell active="pillars">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="pillars-hero" style={{ padding: '20px 20px 0' }}>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            13 pillars · weighted composite {composite ?? '—'}%
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Readiness<br/>by <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>pillar.</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>
            Tap any pillar to see its source forms, week-over-week trend, and gaps.
          </p>
        </div>

        <div className="chips pillars-chips">
          <div className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>All<span className="n">{allPowers.length}</span></div>
          <div className={'chip' + (filter === 'risk' ? ' on' : '')} onClick={() => setFilter('risk')}>At risk<span className="n">{riskCount}</span></div>
          <div className={'chip' + (filter === 'hold' ? ' on' : '')} onClick={() => setFilter('hold')}>Holding<span className="n">{holdCount}</span></div>
          <div className={'chip' + (filter === 'track' ? ' on' : '')} onClick={() => setFilter('track')}>On track<span className="n">{trackCount}</span></div>
        </div>

        <div
          style={{
            padding: '18px 20px 6px',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Sorted: lowest first</span>
          <span style={{ color: 'var(--ink)' }}>↕</span>
        </div>

        {isError ? (
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
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load pillars.</div>
            <button
              type="button"
              onClick={() => refetch()}
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
        ) : isLoading ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
            Loading pillars…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
            No pillar data yet.
          </div>
        ) : (
          <div className="pillars-grid">
            {filtered.map((p) => {
              const reading = weekly?.readings?.find((r) => r.power.code === p.code);
              const dir = (p.value_pct != null && reading != null) ? p.value_pct - reading.value_pct : null;
              const v = p.value_pct ?? 0;
              return (
                <div className="pillar-row" key={p.code}>
                  <div className="L serif">{p.code[0]}</div>
                  <div>
                    <div className="nm">{p.name}</div>
                    <div className="bar">
                      <i className={v < 50 ? 'acc' : ''} style={{ width: v + '%' }}/>
                    </div>
                    {dir !== null && (
                      <div className="pillar-meta" style={{ marginTop: 8 }}>
                        <span className={dir >= 0 ? 'delta-up' : 'delta-down'}>
                          {dir >= 0 ? '▲' : '▼'} {Math.abs(dir)} pts wk
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={'pct' + (v < 50 ? ' acc' : '')}>
                    {p.value_pct != null ? <>{p.value_pct}<small>%</small></> : <>—</>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="bot-pad"/>
      </div>
      <TabBar active="pillars"/>
      {drawer && <Drawer active="pillars" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 3: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/app/PillarsScreen.tsx
git diff --cached --stat
# Expected: ONLY PillarsScreen.tsx
```

If any other file is staged, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): wire Pillars screen to useMissionControl + useWeeklyLatest

Replaces local PILLARS import with API hooks. Composite % computed
client-side as average of non-null powers value_pct. Filter chip
counts (At risk <50, Holding 50-74, On track >=75) computed from
the same array. Per-pillar week-over-week delta computed by matching
the latest weekly assessment's reading for each power code; omitted
when no last-week reading exists.

Drops the source-tab name (e.g. "PCM tab") — not on the API payload.

Per-query partial degradation: "Loading pillars…", inline error
banner with Retry, or "No pillar data yet." based on state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 3 of the 5-task plan. Tasks 1 (relativeAgo) and 2 (Activity) done.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Existing state:**
- `web/src/api/hooks.ts` exports `useMissionControl()` returning `{ powers: [{ code, name, order_index, value_pct, status }], crusade, top_stats, top_risks, context }` and `useWeeklyLatest()` returning `{ readings?: [{ power_id, value_pct, power: { id, code, name } }], ... }`.
- `web/src/screens/app/Shell.tsx` still exports `PILLARS` — Weekly screen still imports it. Don't remove the export.
- `app.css` has `.pillar-row`, `.bar`, `.pct`, `.pillar-meta`, `.delta-up`, `.delta-down` — all keep being used.

## Self-Review

- Did `git diff --cached --stat` show ONLY PillarsScreen.tsx?
- Does typecheck pass?
- Does build succeed?
- Is the local `PILLARS` import REMOVED from PillarsScreen.tsx (replaced by hooks)?
- Does the composite % handle the all-null edge case (returns `null`, rendered as `—`)?
- Does the delta line OMIT correctly when no matching reading exists?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only PillarsScreen.tsx
- Self-review findings if any

---

## Task 4: Wire `HomeScreen` + drop forms-due card + adjust home-grid CSS

The most complex screen — three hooks, drops a card, computes composite + onTrack, formats day-counter from crusade dates.

**Files:**
- Modify: `web/src/screens/app/HomeScreen.tsx` — full rewrite
- Modify: `web/src/screens/app/app.css` — change `.app-root .home-grid` `grid-template-columns` from `repeat(3, 1fr)` to `repeat(2, 1fr)`

- [ ] **Step 1: Replace `HomeScreen.tsx` entirely**

Replace the contents of `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/HomeScreen.tsx` with this EXACT content:

```tsx
import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import { useMissionControl, useActivityEntries } from '../../api/hooks';
import { useAuth } from '../../auth/useAuth';
import { relativeAgo } from '../../lib/dateHelpers';
import './app.css';

function dayCounterLabel(crusade: { opens_at: string; closes_at: string } | undefined): string {
  if (!crusade) return '…';
  const today = new Date();
  const opens = new Date(crusade.opens_at);
  const closes = new Date(crusade.closes_at);
  const totalDays = Math.max(1, Math.round((closes.getTime() - opens.getTime()) / 86_400_000));
  const daysIn = Math.max(0, Math.round((today.getTime() - opens.getTime()) / 86_400_000));
  const dow = today.toLocaleDateString('en-GB', { weekday: 'short' });
  const dom = today.getDate();
  const month = today.toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} · ${dom} ${month} · Day ${daysIn} / ${totalDays}`;
}

const ErrorBanner = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
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
);

export function HomeScreen() {
  const [drawer, setDrawer] = useState(false);
  const { user } = useAuth();
  const { data: mc, isLoading: mcLoading, isError: mcError, refetch: refetchMc } = useMissionControl();
  const { data: activity, isLoading: actLoading, isError: actError, refetch: refetchAct } = useActivityEntries({ per_page: 4 });

  const composite = useMemo(() => {
    if (!mc) return null;
    const valid = mc.powers.filter((p) => p.value_pct != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, p) => s + (p.value_pct ?? 0), 0) / valid.length);
  }, [mc]);

  const onTrackCount = useMemo(() => {
    if (!mc) return 0;
    return mc.powers.filter((p) => (p.value_pct ?? 0) >= 75).length;
  }, [mc]);

  const atRisk = useMemo(() => {
    if (!mc) return [];
    return [...mc.powers]
      .filter((p) => (p.value_pct ?? 0) < 50)
      .sort((a, b) => (a.value_pct ?? 0) - (b.value_pct ?? 0))
      .slice(0, 4);
  }, [mc]);

  return (
    <ResponsiveShell active="home">
      <AppBar onMenu={() => setDrawer(true)}/>

      <div className="scroll">
        <div className="home-hero">
          <div className="home-hero-l">
            <div className="greet">
              <div className="eyebrow">{dayCounterLabel(mc?.crusade)}</div>
              <h1 className="serif">Good morning,<br/><em>{user?.name ?? 'Director'}.</em></h1>
              <p className="summary">
                Composite readiness {composite !== null ? <>at <b>{composite}%</b></> : <>loading…</>}.
                {' '}{onTrackCount} of {mc?.powers.length ?? 13} on track.
              </p>
            </div>

            <div className="composite">
              <div className="label">Composite readiness</div>
              <div className="row">
                {mcError ? (
                  <div className="num serif" style={{ fontSize: 32, color: 'var(--accent)' }}>—</div>
                ) : mcLoading ? (
                  <div className="num serif" style={{ background: 'var(--bg-2)', color: 'var(--bg-2)', borderRadius: 4 }}>00<small>%</small></div>
                ) : (
                  <div className="num serif">
                    {composite !== null ? <>{composite}<small>%</small></> : <>—</>}
                  </div>
                )}
                <div className="delta">
                  <b>{onTrackCount} / {mc?.powers.length ?? 13}</b>
                  on track<br/>
                  composite avg
                </div>
              </div>
              <div className="track"><i style={{ width: `${composite ?? 0}%` }}/></div>
            </div>
          </div>

          <div className="home-hero-r">
            <div className="pillar-strip">
              <div className="lab">
                <span>13 pillars · readiness</span>
                <span>P · A · V · E · D · D</span>
              </div>
              <div className="grid">
                {(mcLoading ? Array(13).fill(null) : (mc?.powers ?? [])).map((p, i) => (
                  <div
                    key={p?.code ?? i}
                    className={'chip' + (p && (p.value_pct ?? 0) < 50 ? ' acc' : '')}
                    style={{ ['--f' as never]: p ? (p.value_pct ?? 0) / 100 : 0 } as React.CSSProperties}
                  >
                    <span>{p?.code[0] ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="home-grid">
          <section className="home-card">
            <div className="sec">
              <h2 className="serif">Pillars <em>at risk</em></h2>
              <span className="more">{atRisk.length} below 50%</span>
            </div>
            {mcError ? (
              <ErrorBanner what="pillars" onRetry={refetchMc}/>
            ) : mcLoading ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
            ) : atRisk.length === 0 ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>No pillars below 50%.</div>
            ) : (
              <div className="at-risk">
                {atRisk.map((p) => (
                  <div className="at-risk-row" key={p.code}>
                    <span className="L serif">{p.code[0]}</span>
                    <span className="nm">{p.name}</span>
                    <span className="pct">{p.value_pct}<small>%</small></span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="home-card">
            <div className="sec">
              <h2 className="serif">Recent <em>activity</em></h2>
              <span className="more">View all</span>
            </div>
            {actError ? (
              <ErrorBanner what="recent activity" onRetry={refetchAct}/>
            ) : actLoading ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
            ) : (activity?.data.length ?? 0) === 0 ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>No activity yet.</div>
            ) : (
              <div className="activity">
                {activity!.data.slice(0, 4).map((e) => (
                  <div className="activity-item" key={e.id}>
                    <div className="when">{relativeAgo(e.occurred_at)}</div>
                    <div className="what">
                      {e.description}
                      <div className="tag">{e.power.code} · {e.power.name.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="bot-pad"/>
      </div>

      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Update `.app-root .home-grid` CSS**

In `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/app.css`, find the `.app-root .home-grid` rule (it's inside the `@media (min-width: 1024px)` HOME desktop reflow block). The current rule has `grid-template-columns: repeat(3, 1fr);`. Change it to `repeat(2, 1fr);`.

The block currently looks like:

```css
.app-root .home-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  padding: 32px 48px 48px;
}
```

Update to:

```css
.app-root .home-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  padding: 32px 48px 48px;
}
```

(Only the `grid-template-columns` line changes. Everything else in the rule stays.)

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 4: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/app/HomeScreen.tsx web/src/screens/app/app.css
git diff --cached --stat
# Expected: ONLY HomeScreen.tsx and app.css
```

If any other file is staged, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): wire Home screen to mission control + activity APIs

Replaces hardcoded greeting/composite/pillar-strip/at-risk/recent-
activity with API data via useMissionControl + useActivityEntries +
useAuth().user. Composite % computed client-side as average of
non-null powers value_pct. Day counter computed from crusade.opens_at
and crusade.closes_at.

Drops the "Due this week" forms card entirely (no backend for forms-
due dates) — home-grid CSS goes from 3 columns to 2 to compensate.
Drops the "+pts" tag on activity rows (no API source).

Per-query partial degradation: skeleton placeholder for the composite
hero (renders the same layout but invisible against bg-2), inline
error banners with Retry per failed query, "Loading…" / empty-state
text for the cards.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 4 of the 5-task plan. Tasks 1-3 done.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Existing state:**
- `web/src/api/hooks.ts` exports `useMissionControl`, `useActivityEntries`.
- `web/src/auth/useAuth.ts` exports `useAuth()` returning `{ user: { id, name, email } | null, ... }`. The `name` field is what we want for the greeting.
- `web/src/lib/dateHelpers.ts` exports `relativeAgo` (Task 1).
- The `PILLARS` import on the previous HomeScreen is REMOVED — Home no longer uses it. (Weekly still uses it via Shell.tsx export.)

**The `home-grid` CSS edit** is bundled with this task because removing the third card (forms-due) requires updating the grid from 3 to 2 columns; otherwise the desktop layout looks broken with two cards in a 3-col grid (third cell empty).

## Self-Review

- Did `git diff --cached --stat` show ONLY HomeScreen.tsx + app.css?
- Does typecheck pass?
- Does build succeed?
- Is the `PILLARS` import REMOVED from HomeScreen.tsx?
- Is the "Due this week" `<section>` REMOVED entirely (not commented out)?
- Does the home-grid CSS rule say `repeat(2, 1fr)` (not 3)?
- Does the composite skeleton render the same SIZE as the loaded number (so layout doesn't shift)?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only the 2 files
- Self-review findings if any

---

## Task 5: Final manual sweep

No code changes. Verify all 3 wired screens at three viewport widths plus loading + error states. No commit unless an issue surfaces.

- [ ] **Step 1: Verify build is clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npm run build
# Expected: success
```

- [ ] **Step 2: All 3 screens load real data**

Open each at `http://localhost:5173/`:
- `/` → Home shows greeting with the actual logged-in user's name. Composite hero shows a real number (not 64). Pillar strip shows 13 letters with real fill heights. Pillars-at-risk card lists pillars with `value_pct < 50` from the API. Recent activity shows the 4 most recent entries from the backend.
- `/pillars` → 13 rows sorted lowest first. Composite % in the eyebrow matches Home's composite. Filter chip counts (At risk, Holding, On track) match the rows visible per filter. Per-row delta line shows when a weekly reading exists.
- `/activity` → entries grouped by day, today at top. Filter chips (All / PCM / Workers / Govt / Awareness) re-fetch with the right `power` query param.

- [ ] **Step 3: Loading state**

DevTools → Network → throttle to "Slow 3G". Hard-refresh `/`. Should briefly see:
- Composite hero as a grey block (skeleton)
- Pillar strip as 13 grey chips with no letters
- "Loading…" in pillars-at-risk and recent-activity cards
Then real data arrives.

- [ ] **Step 4: Error state**

DevTools → Network → "Offline". Hard-refresh `/`. Should see:
- Inline error banner per failed query (composite hero + pillars-at-risk + recent-activity all show their banner)
- Each banner has a Retry button. Click Retry → query attempts again (still fails offline).
- Restore network → click Retry → data loads correctly.

Repeat the offline test on `/pillars` and `/activity` — same pattern.

- [ ] **Step 5: Empty state**

If you have access to the Laravel backend's seed data, you may not be able to easily test the empty states. If you can clear the activity_entries table (or run the app against a fresh DB), `/activity` should show "No activity entries." `/pillars` and `/` (composite hero) should handle empty `mc.powers` arrays correctly.

If you can't easily test against an empty backend, it's enough to manually verify by adding a temporary `if (true) return [];` after the relevant `useMemo` (or `data?.data?.slice(0,0)`) in the screen file, refresh, observe the empty state, then revert.

- [ ] **Step 6: Three-viewport check**

DevTools device toolbar → swap between iPhone 14 (393×852), iPad (820×1180), and laptop (1280×800):
- All three screens render correctly at each viewport.
- Home grid shows 2 cards side-by-side at desktop (was 3); single column on phone.
- Pillars list is single-column on phone, 2-col grid at desktop.
- Activity day groupings render correctly at all widths.

- [ ] **Step 7: Weekly screen unchanged**

Visit `/weekly`. Should still show its hardcoded mock data (Bishop Lovell, Week 8, fixed 0-10 ratings). This screen was NOT wired in Chunk 2 — that's expected.

- [ ] **Step 8: If anything breaks**

Reference the spec at `/Users/adebimpegodwin/Projects/hjc/docs/superpowers/specs/2026-05-01-mission-control-wiring-design.md` and file a follow-up commit.

---

## Self-Review Notes

**Spec coverage:**
- relativeAgo helper → Task 1
- ActivityScreen wiring (hook + grouping + chip→power-code map + loading/error/empty) → Task 2
- PillarsScreen wiring (composite, filter counts, delta from weekly readings, loading/error/empty) → Task 3
- HomeScreen wiring (greeting, composite skeleton, pillar strip, at-risk card, recent activity, drop forms-due, home-grid CSS) → Task 4
- Manual sweep across all 3 wired screens + Weekly unchanged check → Task 5

**Type consistency:**
- `useMissionControl().powers` shape `{ code, name, order_index, value_pct, status }` — used in HomeScreen + PillarsScreen identically.
- `useWeeklyLatest().readings` shape `{ power_id, value_pct, power: { id, code, name } }` — matched by `power.code` in PillarsScreen.
- `useActivityEntries().data` shape `{ id, occurred_at, description, status, power: { id, code, name } }` — used in HomeScreen + ActivityScreen identically.
- `useAuth().user.name` — typed via `AuthContextValue` already in `AuthProvider.tsx`.
- `relativeAgo(iso: string)` signature matches the call site in HomeScreen.

**Known minors (acknowledged in spec):**
- `PILLARS` const stays in `Shell.tsx` (Weekly still imports it).
- Activity chip counts are not shown (no per-power aggregation endpoint).
- "Weekly" filter chip dropped from Activity (no clean filter for weekly assessment entries).
- Home loading skeleton uses inline styles rather than a CSS class (smaller scope, no extracted component).
- The 4 pre-existing lint errors stay; only address ones introduced by this work.
