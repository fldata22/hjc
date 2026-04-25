# HJC Frontend — Mobile Companion (DM.1-DM.8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add the 8-screen mobile companion to the existing Vite app. Mobile lives at `/m/*`. Phone users auto-redirect from `/`. Same auth, same backend, same hooks pattern.

**Source of truth:** `~/Projects/hjc/docs/superpowers/reference-mobile-hifi/` (5 files: shell.jsx, screens-1.jsx with DM.1-DM.5, screens-2.jsx with DM.6-DM.8, styles.css, ios-frame.jsx — ignore the iOS frame file, that's just for the design preview gallery).

**Spec:** `docs/superpowers/specs/2026-04-25-frontend-mobile-companion-design.md`

**Conventions:**
- Each screen file uses `// @ts-nocheck` (loose typing — same as desktop).
- Brand mark in TopBar = `'H'` (template ships as `'P'`; switch on port).
- Mobile CSS classes use `mw-` prefix (mobile web).
- Reuse existing `apiFetch` + auth + TanStack Query.

---

## Task 1: Mobile foundation — CSS + Shell + routes + auto-redirect

**Files:**
- Create: `web/src/mobile.css` (copy of `docs/superpowers/reference-mobile-hifi/styles.css`)
- Create: `web/src/components/MobileShell.tsx` (port shell.jsx — Icon, TopBar, TabBar, Phone)
- Create: `web/src/components/MaybeMobileRedirect.tsx`
- Modify: `web/src/main.tsx` (also import mobile.css)
- Modify: `web/src/App.tsx` (add `/m/*` routes + redirect on `/`)

- [ ] **Step 1: Copy mobile CSS**

```bash
cp ~/Projects/hjc/docs/superpowers/reference-mobile-hifi/styles.css ~/Projects/hjc/web/src/mobile.css
```

- [ ] **Step 2: Update `web/src/main.tsx`** — add `import './mobile.css';` after the existing `import './styles.css';`

- [ ] **Step 3: Port the shell** — read `~/Projects/hjc/docs/superpowers/reference-mobile-hifi/shell.jsx` to see Icon, TopBar, TabBar, Phone definitions. Create `web/src/components/MobileShell.tsx`:

```tsx
// @ts-nocheck
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// === Icons === (port the entire `paths` object from shell.jsx::Icon verbatim)
const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const paths: Record<string, React.ReactNode> = {
    // PASTE from reference shell.jsx Icon paths object verbatim
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// === Top bar ===
const TopBar = ({ eyebrow, title, back, right, transparent }: any) => {
  const nav = useNavigate();
  return (
    <div className="mw-topbar" style={transparent ? { background: 'transparent', borderBottom: 'none' } : undefined}>
      <div className="mw-topbar-l">
        {back ? (
          <button className="mw-iconbtn" aria-label="Back" onClick={() => nav(-1)}><Icon name="chevronL" size={20} /></button>
        ) : (
          <button className="mw-iconbtn">
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--text-info)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>H</div>
          </button>
        )}
      </div>
      <div className="mw-topbar-title">
        {eyebrow && <div className="mw-topbar-eyebrow">{eyebrow}</div>}
        <div>{title}</div>
      </div>
      <div className="mw-topbar-r">
        {right || (
          <>
            <button className="mw-iconbtn"><Icon name="search" size={19} /></button>
            <button className="mw-iconbtn"><Icon name="bell" size={19} /><span className="dot" /></button>
          </>
        )}
      </div>
    </div>
  );
};

// === Bottom tab bar ===
const TabBar = ({ active }: { active: string }) => {
  const nav = useNavigate();
  const tabs = [
    { key: 'home', label: 'Home', icon: 'home', to: '/m/' },
    { key: 'powers', label: 'Powers', icon: 'powers', to: '/m/powers' },
    { key: 'log', label: 'Log', icon: 'plus', center: true, to: '/m/log' },
    { key: 'pastors', label: 'Pastors', icon: 'pastors', to: '/m/pastors' },
    { key: 'more', label: 'More', icon: 'more', to: '/m/more' },
  ];
  return (
    <div className="mw-tabbar">
      {tabs.map((t) => {
        if (t.center) {
          return (
            <div key={t.key} className="mw-tabitem" style={{ justifyContent: 'flex-start', paddingTop: 2 }} onClick={() => nav(t.to)}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--text-info)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(12,68,124,0.28)' }}>
                <Icon name="plus" size={22} />
              </div>
              <div style={{ marginTop: 2, fontSize: 9, color: 'var(--text-tertiary)' }}>Quick log</div>
            </div>
          );
        }
        return (
          <div key={t.key} className={`mw-tabitem ${active === t.key ? 'active' : ''}`} onClick={() => nav(t.to)}>
            <div className="ic"><Icon name={t.icon} size={20} /></div>
            <div>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
};

export const Phone = ({ active, children, top, fab, noPad, gray }: any) => (
  <div className="mw" style={gray ? { background: 'var(--bg-secondary)' } : undefined}>
    {top}
    <div className={`mw-content ${noPad ? 'flush' : ''}`}>{children}</div>
    {fab}
    <TabBar active={active} />
  </div>
);

export { Icon as MobileIcon, TopBar };
```

When pasting the Icon `paths` object, copy verbatim from `docs/superpowers/reference-mobile-hifi/shell.jsx` — all 23 icons (home, powers, pastors, log, more, bell, plus, chevron, chevronL, search, filter, phone, mail, cal, check, edit, download, share, star, spark, money, cards, flag, mic).

- [ ] **Step 4: Create `web/src/components/MaybeMobileRedirect.tsx`**

```tsx
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';

export function MaybeMobileRedirect({ children }: { children: React.ReactNode }) {
  const [shouldRedirect] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  if (shouldRedirect) return <Navigate to="/m/" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 5: Update `web/src/App.tsx`** — wrap `MissionControl` with `MaybeMobileRedirect` and add 8 mobile routes:

Replace the `<Route path="/" ...>` line with:

```tsx
      <Route path="/" element={<RequireAuth><MaybeMobileRedirect><MissionControl /></MaybeMobileRedirect></RequireAuth>} />
```

Add these routes BEFORE the `*` catch-all, importing the mobile screens at the top:

```tsx
import { MissionControlMobile } from './screens/mobile/MissionControlMobile';
import { PowersListMobile } from './screens/mobile/PowersListMobile';
import { PowerDetailMobile } from './screens/mobile/PowerDetailMobile';
import { PastorsDirectoryMobile } from './screens/mobile/PastorsDirectoryMobile';
import { PastorProfileMobile } from './screens/mobile/PastorProfileMobile';
import { QuickLogMobile } from './screens/mobile/QuickLogMobile';
import { WeeklyAssessmentMobile } from './screens/mobile/WeeklyAssessmentMobile';
import { ActivityLogMobile } from './screens/mobile/ActivityLogMobile';
import { MaybeMobileRedirect } from './components/MaybeMobileRedirect';
```

```tsx
      {/* Mobile companion */}
      <Route path="/m/" element={<RequireAuth><MissionControlMobile /></RequireAuth>} />
      <Route path="/m/powers" element={<RequireAuth><PowersListMobile /></RequireAuth>} />
      <Route path="/m/powers/:code" element={<RequireAuth><PowerDetailMobile /></RequireAuth>} />
      <Route path="/m/pastors" element={<RequireAuth><PastorsDirectoryMobile /></RequireAuth>} />
      <Route path="/m/pastors/:id" element={<RequireAuth><PastorProfileMobile /></RequireAuth>} />
      <Route path="/m/log" element={<RequireAuth><QuickLogMobile /></RequireAuth>} />
      <Route path="/m/assessment" element={<RequireAuth><WeeklyAssessmentMobile /></RequireAuth>} />
      <Route path="/m/activity" element={<RequireAuth><ActivityLogMobile /></RequireAuth>} />
      <Route path="/m/more" element={<RequireAuth><div style={{ padding: 40 }}>More — coming soon</div></RequireAuth>} />
```

- [ ] **Step 6: Stub the 8 mobile screens** so the imports compile. Create each file at `web/src/screens/mobile/<Name>.tsx` with placeholder:

```tsx
// @ts-nocheck
import React from 'react';
import { Phone, TopBar } from '../../components/MobileShell';
export function NAME() {
  return <Phone active="ACTIVE" top={<TopBar title="TITLE" />}>Coming soon.</Phone>;
}
```

Where `NAME` / `ACTIVE` / `TITLE` correspond:
| File | NAME | ACTIVE | TITLE |
|---|---|---|---|
| MissionControlMobile.tsx | MissionControlMobile | home | Mission control |
| PowersListMobile.tsx | PowersListMobile | powers | PAVEDDD powers |
| PowerDetailMobile.tsx | PowerDetailMobile | powers | Power |
| PastorsDirectoryMobile.tsx | PastorsDirectoryMobile | pastors | Pastors |
| PastorProfileMobile.tsx | PastorProfileMobile | pastors | Pastor |
| QuickLogMobile.tsx | QuickLogMobile | log | Quick log |
| WeeklyAssessmentMobile.tsx | WeeklyAssessmentMobile | home | Weekly assessment |
| ActivityLogMobile.tsx | ActivityLogMobile | home | Activity log |

- [ ] **Step 7: Verify build**

```bash
cd ~/Projects/hjc/web
npm run build 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): mobile foundation — shell + routes + auto-redirect at /"
```

---

## Task 2: API hooks for mobile screens

**Files:**
- Modify: `web/src/api/hooks.ts` (add 7 new hooks)

Add these hooks to `web/src/api/hooks.ts` after the existing `useMissionControl`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

// === Powers ===
export interface Power { id: number; code: string; name: string; order_index: number; description: string | null; }

export function usePowers() {
  return useQuery({
    queryKey: ['powers'],
    queryFn: () => apiFetch<{ data: Power[] }>('/powers').then((r) => r.data),
  });
}

// === Pastors ===
export interface Pastor {
  id: number; crusade_id: number; full_name: string; church_id: number | null; zone_id: number | null;
  phone: string | null; email: string | null; address: string | null;
  pastor_since: number | null;
  pipeline_stage: 'identified' | 'engaged' | 'committed' | 'active' | 'champion';
  last_contact_at: string | null;
}

export interface PastorsResponse {
  data: Pastor[];
  meta: { current_page: number; total: number; per_page: number; last_page: number };
}

export function usePastors(filters: { q?: string; pipeline_stage?: string; per_page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.pipeline_stage) params.set('pipeline_stage', filters.pipeline_stage);
  params.set('per_page', String(filters.per_page ?? 25));
  return useQuery({
    queryKey: ['pastors', filters],
    queryFn: () => apiFetch<PastorsResponse>(`/pastors?${params.toString()}`),
  });
}

export function usePastor(id: string | number | undefined) {
  return useQuery({
    queryKey: ['pastor', id],
    queryFn: () => apiFetch<{ data: Pastor & { identifications: any[]; pledge_totals: Record<string, string> } }>(`/pastors/${id}`).then((r) => r.data),
    enabled: id != null,
  });
}

// === Pastor stage counts (for DM.4) ===
export interface PastorStageCounts {
  identified: number; engaged: number; committed: number; active: number; champion: number; total: number;
}

export function usePastorStageCounts() {
  return useQuery({
    queryKey: ['pastor-stage-counts'],
    queryFn: () => apiFetch<{ data: PastorStageCounts }>('/pastors/stage-counts').then((r) => r.data),
  });
}

// === Awareness trajectory ===
export interface AwarenessTrajectoryRow { survey_number: number; surveyed_total: number; attending_yes_total: number; pct: string; }

export function useAwarenessTrajectory() {
  return useQuery({
    queryKey: ['awareness-trajectory'],
    queryFn: () => apiFetch<{ data: AwarenessTrajectoryRow[] }>('/awareness-surveys/trajectory').then((r) => r.data),
  });
}

// === Activity entries ===
export interface ActivityEntry {
  id: number; crusade_id: number; user_id: number; occurred_at: string;
  description: string; status: 'done' | 'running';
  power: { id: number; code: string; name: string };
}

export interface ActivityEntriesResponse {
  data: ActivityEntry[];
  meta: { current_page: number; total: number; per_page: number; last_page: number };
}

export function useActivityEntries(filters: { date?: string; power?: string; per_page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.power) params.set('power', filters.power);
  params.set('per_page', String(filters.per_page ?? 25));
  return useQuery({
    queryKey: ['activity-entries', filters],
    queryFn: () => apiFetch<ActivityEntriesResponse>(`/activity-entries?${params.toString()}`),
  });
}

export function useCreateActivityEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { crusade_id: number; occurred_at: string; description: string; power_id?: number; power_code?: string; status?: 'done' | 'running' }) =>
      apiFetch<{ data: ActivityEntry }>('/activity-entries', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-entries'] }),
  });
}

// === Weekly assessment ===
export interface WeeklyAssessment {
  id: number; crusade_id: number; week_number: number; prompted_at: string;
  self_score: number | null; notes: string | null; decisions_needed: string | null; submitted_at: string | null;
  readings?: Array<{ id: number; power_id: number; value_pct: number; power: { id: number; code: string; name: string } }>;
  risks?: Array<{ id: number; ordering: number; severity: 'critical' | 'high' | 'medium'; text: string }>;
}

export function useWeeklyLatest() {
  return useQuery({
    queryKey: ['weekly-latest'],
    queryFn: () => apiFetch<{ data: WeeklyAssessment }>('/weekly-assessments/latest').then((r) => r.data),
    retry: false, // 404 is meaningful (no assessment yet)
  });
}

export function useReplaceReadings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, readings }: { id: number; readings: Array<{ power_id: number; value_pct: number }> }) =>
      apiFetch(`/weekly-assessments/${id}/readings`, { method: 'PUT', body: JSON.stringify({ readings }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-latest'] }),
  });
}

export function useReplaceRisks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, risks }: { id: number; risks: Array<{ ordering: number; severity: string; text: string }> }) =>
      apiFetch(`/weekly-assessments/${id}/risks`, { method: 'PUT', body: JSON.stringify({ risks }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-latest'] }),
  });
}

// === Crusade (singleton) ===
export interface Crusade {
  id: number; name: string; city: string; opens_at: string; closes_at: string;
  budget_total: string; pastors_target: number; awareness_target_pct: number;
  population: number | null; pap: number | null; convoy_target: number; makarios_target: number;
}

export function useCrusade() {
  return useQuery({
    queryKey: ['crusade'],
    queryFn: () => apiFetch<{ data: Crusade }>('/crusade').then((r) => r.data),
  });
}
```

- [ ] **Verify compiles** (`npx tsc --noEmit`), **commit**: `feat(web): add API hooks for mobile screens`.

---

## Task 3: DM.1 Mission Control mobile

**Files:** Replace `web/src/screens/mobile/MissionControlMobile.tsx`.

Read source: `~/Projects/hjc/docs/superpowers/reference-mobile-hifi/screens-1.jsx` — find the `DM1` component. It uses `Phone`, `TopBar`, hardcoded data.

Port DM1 to TSX. Replace inline data with `useMissionControl()`:
- Hi-fi text "Lusaka 2026 · 7 days to go" → `crusade.name + days_to_go` from API
- Stat cards for days/financial/pastors/awareness → from `top_stats`
- PAVEDDD readiness mini → from `powers` (use the `PaveDonut` component already at `web/src/components/PaveDonut.tsx`)
- Top risks list → from `top_risks`

Use `Phone` shell with `active="home"`, `top={<TopBar eyebrow="Crusade director" title="Mission control" />}`.

Loading state: `<Phone active="home" top={<TopBar title="Mission control" />}><div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading…</div></Phone>`.

Verify compile + commit: `feat(web): mobile DM.1 Mission Control with live data`.

---

## Task 4: DM.2 14 PAVEDDD powers list

**Files:** Replace `web/src/screens/mobile/PowersListMobile.tsx`.

Read source: `screens-1.jsx::DM2`. Hardcoded list of 14 powers with status colors and percentages.

Port. Wire to `usePowers()` + `useWeeklyLatest()`:
- Get the 14 powers from `usePowers()` (ordered by `order_index`)
- Get the latest assessment readings via `useWeeklyLatest()`. Build a `Map<power_id, value_pct>` from `latest.readings`.
- For each power, look up its reading. Status: `>=60` success, `>=30` warning, `<30` danger, `null` muted (matches Mission Control colors).
- Each row links to `/m/powers/${code}` — use `<Link>` from react-router-dom.

Top: `<TopBar eyebrow="14 powers" title="PAVEDDD" />`.

Verify + commit: `feat(web): mobile DM.2 14 powers list`.

---

## Task 5: DM.3 Power detail (Awareness drilldown template)

**Files:** Replace `web/src/screens/mobile/PowerDetailMobile.tsx`.

Read source: `screens-1.jsx::DM3`. Shows Awareness trajectory bars (S1-S6 with %) and a per-zone breakdown matrix.

Use route param `:code` (via `useParams<{ code: string }>()`). For Phase 1 of this task, **only Awareness has data** — for any other code, show a "Drilldown coming soon" placeholder.

When code is `awareness`:
- Wire to `useAwarenessTrajectory()` for the bar chart values
- (Per-zone matrix is from `/awareness-surveys?crusade_id=X` — for the POC, skip the matrix and just show the trajectory chart from the live data)

Top: `<TopBar back title={power.name ?? 'Power'} eyebrow="PAVEDDD" />`. Use `useNavigate(-1)` on back.

Verify + commit: `feat(web): mobile DM.3 power detail (Awareness trajectory)`.

---

## Task 6: DM.4 Pastors directory

**Files:** Replace `web/src/screens/mobile/PastorsDirectoryMobile.tsx`.

Read source: `screens-1.jsx::DM4`. Shows search bar, filter pills, alphabetical pastor list with status indicator.

Wire to `usePastors({ q, pipeline_stage })`. Track local state for `q` (search input) and `pipeline_stage` (active filter pill).

Each pastor row links to `/m/pastors/${pastor.id}`. Use `<Link>`.

Show stage counts at the top via `usePastorStageCounts()` — 5 mini cards or a horizontal scroll bar.

Top: `<TopBar eyebrow="Crusade" title="Pastors" />`.

Verify + commit: `feat(web): mobile DM.4 pastors directory with search + filters`.

---

## Task 7: DM.5 Pastor profile

**Files:** Replace `web/src/screens/mobile/PastorProfileMobile.tsx`.

Read source: `screens-1.jsx::DM5`. Hero (avatar/name/church), pipeline pills, contact info, pledge totals, identifications, activity-log preview.

Use `useParams<{ id: string }>()` + `usePastor(id)`. Top: `<TopBar back title={pastor.full_name} eyebrow="Pastor" />`.

Map fields from API:
- `pastor.full_name`, `pastor.pipeline_stage`, `pastor.phone`, `pastor.email`, `pastor.address`
- `pastor.identifications[]` — list of `{category, sub_role, assigned_at}`
- `pastor.pledge_totals` — `{choir, ushers, ...}` map

Verify + commit: `feat(web): mobile DM.5 pastor profile`.

---

## Task 8: DM.6 Quick log

**Files:** Replace `web/src/screens/mobile/QuickLogMobile.tsx`.

Read source: `screens-2.jsx::DM6`. A fast-capture form: textarea for description, power picker (chips), submit button. The center FAB on the TabBar lands here.

Wire to `useCreateActivityEntry()`. Need `useCrusade()` for `crusade_id`. Need `usePowers()` for the chip list.

Form state: `description` (text), `power_code` (selected). On submit:
```ts
mutate({ crusade_id, occurred_at: new Date().toISOString(), description, power_code, status: 'done' })
```

On success: navigate back (`useNavigate(-1)`).

Top: `<TopBar back title="Quick log" />`.

Verify + commit: `feat(web): mobile DM.6 quick log capture flow`.

---

## Task 9: DM.7 Weekly assessment

**Files:** Replace `web/src/screens/mobile/WeeklyAssessmentMobile.tsx`.

Read source: `screens-2.jsx::DM7`. Shows latest week, sliders/inputs for each of the 14 powers, self-score 1-10, top-3 risks list.

Wire to `useWeeklyLatest()` + `usePowers()`. Mutations: `useReplaceReadings()` + `useReplaceRisks()`.

Local state for in-flight edits (don't push every keystroke). On "Save" buttons per section, call the bulk-replace mutation.

If `useWeeklyLatest()` returns 404 (no assessment yet for this crusade), show "Create week N assessment" CTA — that's `useMutation` against `POST /weekly-assessments`. For POC, you can skip this CTA and just rely on the seeded latest.

Top: `<TopBar back title={\`Week ${latest.week_number}\`} eyebrow="Weekly assessment" />`.

Verify + commit: `feat(web): mobile DM.7 weekly assessment editor`.

---

## Task 10: DM.8 Activity log

**Files:** Replace `web/src/screens/mobile/ActivityLogMobile.tsx`.

Read source: `screens-2.jsx::DM8`. Today's entries grouped by time, badge per power, link to add new (FAB shortcut to /m/log).

Wire to `useActivityEntries({ date: today })` where `today = new Date().toISOString().slice(0, 10)`.

Add a small date picker / "Today / Yesterday / This week" tabs that change the `date` filter — for POC, just show today.

Top: `<TopBar back title="Activity log" />` or no-back if shown via TabBar (use shell active="home").

Verify + commit: `feat(web): mobile DM.8 activity log view`.

---

## Final verification

- [ ] **Step 1: Full TS check + build**

```bash
cd ~/Projects/hjc/web
npx tsc --noEmit
npm run build 2>&1 | tail -10
```

- [ ] **Step 2: Manual smoke at mobile viewport**

Start backend + frontend (the user will do this):
```bash
cd ~/Projects/hjc && php artisan serve --port=8001 &
cd ~/Projects/hjc/web && npm run dev &
```

Open Chrome DevTools → Device Mode → iPhone 14 (390×844). Visit:
- `http://localhost:5173/` → should auto-redirect to `/m/`
- Walk through each tab: Home → Powers → (tap one) → back → Pastors → (tap one) → back → Quick log → cancel → More
- Verify data renders, navigation works, no console errors

- [ ] **Step 3: Push**

```bash
cd ~/Projects/hjc
git push origin main
```

---

## Out of scope (parked)

- Push/pop animations
- Pull-to-refresh
- Toast notifications (use plain inline messages)
- Service worker / PWA install
- Per-zone awareness matrix on DM.3 (just the trajectory chart for now)
- "Create assessment" CTA on DM.7 when no latest exists
- Advanced filter UI on DM.4 / DM.8 (basic only)
- Tests
