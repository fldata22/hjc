# Awareness Survey API Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the localStorage-backed Awareness Survey form with direct reads/writes to the existing Laravel `/awareness-surveys` endpoints, reshaped from per-respondent capture to a one-wave-across-all-zones matrix that matches the aggregate backend schema.

**Architecture:** Three new React Query hooks (`useZones`, `useAwarenessSurveys`, `useCreateAwarenessSurvey`) call existing `/zones` and `/awareness-surveys` endpoints. The form is fully rewritten to drop the per-respondent shape, drop the localStorage `submitQueue` path, and render a 10-zone matrix (one row per crusade zone) with a single wave number and date. Submission fires N parallel POSTs (one per zone with non-empty data) via `Promise.allSettled` and surfaces per-row errors. A past-waves table at the top renders aggregated rows (one per `survey_number`) with tap-to-expand per-zone breakdown.

**Tech Stack:** React 19, TypeScript strict, @tanstack/react-query v5, react-router-dom v7, Vite. Backend is Laravel with `auth:sanctum` (already wired via `apiFetch` in `web/src/api/client.ts`). No automated test framework in the web project — verification uses `tsc -b`, `eslint`, and a manual browser sweep at three viewport widths.

**Spec:** `docs/superpowers/specs/2026-05-02-awareness-survey-wiring-design.md`

---

## File map

**Modify:**
- `web/src/api/hooks.ts` — append `Zone` type, `AwarenessSurveyRow` type, and three hooks (`useZones`, `useAwarenessSurveys`, `useCreateAwarenessSurvey`)
- `web/src/screens/forms/AwarenessSurveyForm.tsx` — full rewrite

**Create:** none.
**Delete:** none. (The submitQueue path stays for the other forms; Chunk 4 will sweep it.)

---

## Task 1: Add `useZones` hook

**Files:**
- Modify: `web/src/api/hooks.ts` — append after the `useCrusade` hook (currently the last export, around the bottom of the file)

- [ ] **Step 1: Add the `Zone` interface and `useZones` hook**

Append this block to the end of `web/src/api/hooks.ts`:

```ts
// === Zones ===
export interface Zone {
  id: number;
  crusade_id: number;
  code: string;
  name: string;
  population: number | null;
  pap: number | null;
}

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: () => apiFetch<{ data: Zone[] }>('/zones').then((r) => r.data),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `/Users/adebimpegodwin/Projects/hjc/web`:

```bash
npx tsc -b
```

Expected: exit code 0, no output.

- [ ] **Step 3: Verify ESLint passes**

Run from `/Users/adebimpegodwin/Projects/hjc/web`:

```bash
npm run lint
```

Expected: exit code 0, no errors.

- [ ] **Step 4: Manually verify the hook returns data**

Start the dev server if it isn't running:

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run dev
```

Open the browser DevTools network tab on any logged-in screen. (No UI consumes `useZones` yet — that comes in Task 4. Confirmation comes from the form working in Task 4.)

Skip this step if you'd rather verify in Task 4. Just don't commit until at least the build and lint pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web/.. && git add web/src/api/hooks.ts && git commit -m "$(cat <<'EOF'
feat(web): useZones hook for /zones endpoint

Used by upcoming Awareness Survey matrix form to render one row per
crusade zone.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `useAwarenessSurveys` hook

**Files:**
- Modify: `web/src/api/hooks.ts` — append after the `useZones` block

- [ ] **Step 1: Add the `AwarenessSurveyRow` interface and `useAwarenessSurveys` hook**

Append this block to the end of `web/src/api/hooks.ts` (after the `useZones` hook from Task 1):

```ts
// === Awareness surveys (aggregate rows) ===
export interface AwarenessSurveyRow {
  id: number;
  crusade_id: number;
  zone_id: number;
  survey_number: number;
  surveyed_count: number;
  attending_yes_count: number;
  taken_on: string;
  created_at: string;
  updated_at: string;
}

export function useAwarenessSurveys() {
  return useQuery({
    queryKey: ['awareness-surveys'],
    queryFn: () => apiFetch<{ data: AwarenessSurveyRow[] }>('/awareness-surveys').then((r) => r.data),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: exit code 0.

- [ ] **Step 3: Verify ESLint passes**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web/.. && git add web/src/api/hooks.ts && git commit -m "$(cat <<'EOF'
feat(web): useAwarenessSurveys hook for past-waves list

Returns the flat list of all aggregate awareness survey rows. Form will
group by survey_number to render the past-waves table and compute the
default wave number client-side (no extra endpoint).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `useCreateAwarenessSurvey` mutation

**Files:**
- Modify: `web/src/api/hooks.ts` — append after the `useAwarenessSurveys` block

- [ ] **Step 1: Add the `useCreateAwarenessSurvey` mutation hook**

Append this block to the end of `web/src/api/hooks.ts` (after `useAwarenessSurveys` from Task 2):

```ts
export function useCreateAwarenessSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      zone_id: number;
      survey_number: number;
      surveyed_count: number;
      attending_yes_count: number;
      taken_on: string;
    }) =>
      apiFetch<{ data: AwarenessSurveyRow }>('/awareness-surveys', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awareness-surveys'] });
      qc.invalidateQueries({ queryKey: ['awareness-trajectory'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: exit code 0.

- [ ] **Step 3: Verify ESLint passes**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web/.. && git add web/src/api/hooks.ts && git commit -m "$(cat <<'EOF'
feat(web): useCreateAwarenessSurvey mutation

POST /awareness-surveys, invalidating awareness-surveys, trajectory, and
mission-control on success so the dashboard "% aware" stat refreshes
immediately after a wave is logged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rewrite `AwarenessSurveyForm` (matrix + past-waves + wiring)

**Files:**
- Modify: `web/src/screens/forms/AwarenessSurveyForm.tsx` — full rewrite (replace entire file contents)

This is one big task because the file is a coherent unit and the rewrite is substantially smaller than the original (drops more than it adds). Splitting it would force an intermediate broken state.

- [ ] **Step 1: Replace the file contents**

Overwrite `web/src/screens/forms/AwarenessSurveyForm.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { DateField, NumberField } from './fields';
import {
  useCrusade,
  useZones,
  useAwarenessSurveys,
  useCreateAwarenessSurvey,
  type Zone,
  type AwarenessSurveyRow,
} from '../../api/hooks';
import { todayISO } from '../../lib/dateHelpers';
import './forms.css';

type RowDraft = {
  zone_id: number;
  surveyed: number | '';
  attending: number | '';
};

const emptyRows = (zones: Zone[]): RowDraft[] =>
  zones.map((z) => ({ zone_id: z.id, surveyed: '', attending: '' }));

const formatTakenOn = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

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

type WaveSummary = {
  survey_number: number;
  zones_count: number;
  pct: number;
  taken_on: string;
  rows: AwarenessSurveyRow[];
};

function summarizeWaves(rows: AwarenessSurveyRow[]): WaveSummary[] {
  const byWave = new Map<number, AwarenessSurveyRow[]>();
  for (const r of rows) {
    const list = byWave.get(r.survey_number) ?? [];
    list.push(r);
    byWave.set(r.survey_number, list);
  }
  return Array.from(byWave.entries())
    .map(([survey_number, rs]) => {
      const surveyed = rs.reduce((s, r) => s + r.surveyed_count, 0);
      const attending = rs.reduce((s, r) => s + r.attending_yes_count, 0);
      // Use the latest taken_on within the wave for the display date.
      const taken_on = rs.map((r) => r.taken_on).sort().slice(-1)[0] ?? '';
      return {
        survey_number,
        zones_count: rs.length,
        pct: surveyed > 0 ? Math.round((attending / surveyed) * 100) : 0,
        taken_on,
        rows: rs,
      };
    })
    .sort((a, b) => b.survey_number - a.survey_number);
}

export function AwarenessSurveyForm() {
  const navigate = useNavigate();

  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: zones, isLoading: zonesLoading, isError: zonesError, refetch: refetchZones } = useZones();
  const { data: surveys, isLoading: surveysLoading, isError: surveysError, refetch: refetchSurveys } = useAwarenessSurveys();
  const createMutation = useCreateAwarenessSurvey();

  const defaultWave = useMemo(() => {
    if (!surveys || surveys.length === 0) return 1;
    return Math.max(...surveys.map((r) => r.survey_number));
  }, [surveys]);

  const wavesSummary = useMemo(() => summarizeWaves(surveys ?? []), [surveys]);

  const currentWaveStats = useMemo(() => {
    if (!surveys) return { zones_logged: 0, pct: null as number | null };
    const inWave = surveys.filter((r) => r.survey_number === defaultWave);
    const surveyed = inWave.reduce((s, r) => s + r.surveyed_count, 0);
    const attending = inWave.reduce((s, r) => s + r.attending_yes_count, 0);
    return {
      zones_logged: inWave.length,
      pct: surveyed > 0 ? Math.round((attending / surveyed) * 100) : null,
    };
  }, [surveys, defaultWave]);

  const [showForm, setShowForm] = useState(false);
  const [waveNumber, setWaveNumber] = useState<number | ''>('');
  const [takenOn, setTakenOn] = useState<string>(todayISO());
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [expandedWave, setExpandedWave] = useState<number | null>(null);

  const openForm = () => {
    if (!zones) return;
    setWaveNumber(defaultWave);
    setTakenOn(todayISO());
    setRows(emptyRows(zones));
    setRowErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setRowErrors({});
  };

  const updateRow = (zone_id: number, patch: Partial<RowDraft>) => {
    setRows((rs) => rs.map((r) => (r.zone_id === zone_id ? { ...r, ...patch } : r)));
  };

  const rowHasMismatch = (r: RowDraft): boolean => {
    const a = typeof r.attending === 'number' ? r.attending : 0;
    const s = typeof r.surveyed === 'number' ? r.surveyed : 0;
    return a > s;
  };

  const validRows = rows.filter((r) => typeof r.surveyed === 'number' && r.surveyed > 0);
  const anyMismatch = rows.some(rowHasMismatch);
  const canSubmit =
    typeof waveNumber === 'number' &&
    waveNumber > 0 &&
    !!takenOn &&
    validRows.length > 0 &&
    !anyMismatch &&
    !createMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !crusade) return;
    setRowErrors({});
    const results = await Promise.allSettled(
      validRows.map((r) =>
        createMutation.mutateAsync({
          crusade_id: crusade.id,
          zone_id: r.zone_id,
          survey_number: waveNumber as number,
          surveyed_count: r.surveyed as number,
          attending_yes_count: typeof r.attending === 'number' ? r.attending : 0,
          taken_on: takenOn,
        })
      )
    );
    const failures = results
      .map((res, i) => ({ res, row: validRows[i] }))
      .filter(({ res }) => res.status === 'rejected');
    if (failures.length === 0) {
      alert(`Wave ${waveNumber} logged · ${validRows.length} zone${validRows.length === 1 ? '' : 's'}`);
      closeForm();
      return;
    }
    const errs: Record<number, string> = {};
    failures.forEach(({ res, row }) => {
      const reason = (res as PromiseRejectedResult).reason;
      const message =
        (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string')
          ? reason.message
          : 'Failed';
      errs[row.zone_id] = message;
    });
    setRowErrors(errs);
  };

  // Bootstrap: full-screen skeleton/error if crusade or zones is unavailable.
  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Awareness <em>Survey</em></>} pillar="A9" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <ErrorBanner what="crusade" onRetry={refetchCrusade}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (zonesError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Awareness <em>Survey</em></>} pillar="A9" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <ErrorBanner what="zones" onRetry={refetchZones}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (crusadeLoading || zonesLoading || !crusade || !zones) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Awareness <em>Survey</em></>} pillar="A9" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const zoneById = new Map(zones.map((z) => [z.id, z] as const));

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Awareness <em>Survey</em></>}
        pillar="A9"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">Wave {defaultWave}</div>
            <div className="lbl">{currentWaveStats.zones_logged} zone{currentWaveStats.zones_logged === 1 ? '' : 's'} logged</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{currentWaveStats.pct === null ? '—' : `${currentWaveStats.pct}%`}</b> aware</div>
            <div className="lbl" style={{ fontSize: 10 }}>(wave {defaultWave})</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <div className="cat-head" style={{ padding: '8px 0', marginBottom: 4 }}>
            <span>Past waves</span>
          </div>
          {surveysError ? (
            <ErrorBanner what="past waves" onRetry={refetchSurveys}/>
          ) : surveysLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : wavesSummary.length === 0 ? (
            <div className="empty">No surveys logged yet.</div>
          ) : (
            wavesSummary.map((w) => (
              <div key={w.survey_number}>
                <button
                  type="button"
                  className="form-list-row"
                  onClick={() => setExpandedWave(expandedWave === w.survey_number ? null : w.survey_number)}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, fontFamily: 'inherit', cursor: 'pointer', padding: '10px 0' }}
                >
                  <div>
                    <div className="name">Wave {w.survey_number}</div>
                    <div className="sub">{w.zones_count} zone{w.zones_count === 1 ? '' : 's'} · {w.pct}% · {formatTakenOn(w.taken_on)}</div>
                  </div>
                  <div className="right" aria-hidden="true">
                    <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{expandedWave === w.survey_number ? '⌃' : '›'}</span>
                  </div>
                </button>
                {expandedWave === w.survey_number && (
                  <div style={{ padding: '4px 0 12px 16px' }}>
                    {w.rows.map((r) => {
                      const zone = zoneById.get(r.zone_id);
                      const pct = r.surveyed_count > 0 ? Math.round((r.attending_yes_count / r.surveyed_count) * 100) : 0;
                      return (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-2)' }}>
                          <span>{zone?.name ?? `Zone #${r.zone_id}`}</span>
                          <span>{r.attending_yes_count}/{r.surveyed_count} · {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <button type="button" className="add-toggle" onClick={showForm ? closeForm : openForm}>
          {showForm ? 'Cancel' : '+ Log new wave'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="cat-head" style={{ padding: '8px 0', marginBottom: 4 }}>
              <span>Log wave</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <NumberField
                label="Wave number"
                value={waveNumber}
                onChange={(v) => setWaveNumber(v)}
                required
              />
              <DateField
                label="Taken on"
                value={takenOn}
                onChange={(v) => setTakenOn(v)}
                required
              />
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Zones</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              {rows.map((r) => {
                const zone = zoneById.get(r.zone_id);
                const mismatch = rowHasMismatch(r);
                const apiError = rowErrors[r.zone_id];
                return (
                  <div key={r.zone_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: '0 0 96px', fontSize: 13, color: 'var(--ink-2)' }}>{zone?.name ?? `Zone #${r.zone_id}`}</div>
                      <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                        <input
                          type="number"
                          className="input"
                          placeholder="surveyed"
                          value={r.surveyed}
                          onChange={(e) => updateRow(r.zone_id, { surveyed: e.target.value === '' ? '' : Number(e.target.value) })}
                          style={{ width: '50%' }}
                        />
                        <input
                          type="number"
                          className="input"
                          placeholder="attending"
                          value={r.attending}
                          onChange={(e) => updateRow(r.zone_id, { attending: e.target.value === '' ? '' : Number(e.target.value) })}
                          style={{ width: '50%' }}
                        />
                      </div>
                    </div>
                    {mismatch && (
                      <div className="field-error" style={{ marginTop: 4 }}>can't exceed surveyed</div>
                    )}
                    {apiError && (
                      <div className="field-error" style={{ marginTop: 4 }}>{apiError}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="row">
              <button type="button" className="btn" onClick={closeForm}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSubmit} disabled={!canSubmit}>
                {createMutation.isPending ? 'Submitting…' : 'Submit wave'}
              </button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: exit code 0, no output.

If you get a `TS2305` ("no exported member") for `Zone` or `AwarenessSurveyRow`, Tasks 1–3 weren't completed correctly — verify those exports exist in `web/src/api/hooks.ts`.

- [ ] **Step 3: Verify ESLint passes**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit code 0.

If lint complains about an unused import, remove only the unused symbol — do NOT remove anything that's actually used by the JSX.

- [ ] **Step 4: Manually verify the form in the browser**

Start the dev server if it isn't running:

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run dev
```

Navigate to `/forms/awareness-survey`. Verify the following at three viewport widths (393px phone, 820px tablet, 1280px desktop — use DevTools device toolbar):

**Read affordance:**
- Stat strip shows `Wave N` on the left and `XX% aware (wave N)` on the right (or `—` if no data).
- "Past waves" section lists existing waves (newest first), each row showing `Wave N · X zones · YY% · MMM DD`.
- Tap a past-waves row → it expands inline showing per-zone breakdown (`Zone X    Y/Z · YY%`). Tap again → collapses. Tapping a different row collapses the previous and expands the new one.
- If the database is empty, "No surveys logged yet." renders in the past-waves area.

**Write affordance:**
- "+ Log new wave" button opens the inline form.
- Wave number defaults to the highest existing `survey_number` (or `1` if empty), is editable.
- Taken on defaults to today's date.
- 10 zone rows render (or however many `/zones` returns), each with two number inputs (surveyed / attending).
- Entering `attending > surveyed` shows the red "can't exceed surveyed" error under that row and disables Submit.
- Clearing the mismatch re-enables Submit.
- Submit is disabled when no row has `surveyed > 0`.
- Submit is disabled while a request is in flight (button shows "Submitting…").

**Submission:**
- Fill in 2–3 zones with valid numbers (e.g., surveyed=20, attending=8). Click Submit wave.
- Network tab: 2–3 POSTs to `/api/awareness-surveys` fire in parallel.
- On all-success: an `alert()` shows `Wave N logged · X zones`, the form closes, and the past-waves table updates with the new wave (the dashboard's `/mission-control` and `/awareness-surveys/trajectory` queries should also refetch — check the network tab).
- Submit a wave that already exists for one of the zones (re-open the form, pick the same wave number, fill in the same zone). Verify the failed row shows a per-row error message in red and the form stays open.

**Loading/error states:**
- In DevTools network tab, throttle to "Slow 3G". Reload. Verify the page shows "Loading…" briefly while bootstrap queries run, then renders.
- Block `/api/zones` (right-click in network tab → Block request URL). Reload. Verify the full-screen `ErrorBanner` "Couldn't load zones." with Retry. Click Retry — the banner disappears and the form renders.
- Same with `/api/crusade`.
- Block `/api/awareness-surveys`. Verify the past-waves area shows the inline ErrorBanner for "past waves" but the "+ Log new wave" button is still usable.

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web/.. && git add web/src/screens/forms/AwarenessSurveyForm.tsx && git commit -m "$(cat <<'EOF'
feat(web): wire Awareness Survey form to /awareness-surveys

Drop the per-respondent shape (which had no backend) and rewrite as a
one-wave-across-all-zones matrix matching the aggregate
awareness_surveys table. Past-waves table at top (tap to expand per-zone
breakdown), matrix below with one row per crusade zone. Submit fires
parallel POSTs and surfaces per-row errors. localStorage/submitQueue
path removed for this form (Chunk 4 sweeps it for the rest).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

After all four tasks land:

- [ ] **Full-app build clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run build
```

Expected: exit code 0. Bundle output in `dist/`.

- [ ] **Lint clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit code 0.

- [ ] **End-to-end manual smoke**

1. Log in to the app.
2. Open `/forms/awareness-survey`. Confirm seeded data renders in the past-waves table (the seeder creates 8 zones × 6 surveys, so you should see 6 wave rows).
3. Tap each past-waves row to expand/collapse — confirm only one expanded at a time.
4. Open `/` (Home). Note the current "% aware" stat in the Mission Control header.
5. Return to `/forms/awareness-survey`. Log a new wave for at least 2 zones with surveyed=10, attending=10 (so awareness for that wave is 100%).
6. Confirm the alert and the past-waves table updates.
7. Return to `/`. Confirm the "% aware" stat has refetched (may be slightly different depending on whether your new wave is now the latest — confirm the network tab shows `/mission-control` was re-requested).

---

## Self-review notes

**Spec coverage check:**
- Decision 1 (reshape form to match backend) — Task 4 step 1 (full rewrite drops `SurveyResponse`, `SEED`, `submitQueue`, `awarenessSummary`).
- Decision 2 (matrix form) — Task 4 step 1 (`rows`, `emptyRows`, single `waveNumber`, single `takenOn`, parallel POSTs in `handleSubmit`).
- Decision 3 (past-waves table) — Task 4 step 1 (`summarizeWaves`, `wavesSummary` rendering, `expandedWave` state).
- New hooks (`useZones`, `useAwarenessSurveys`, `useCreateAwarenessSurvey`) — Tasks 1, 2, 3.
- Wave number defaulting (`max(survey_number)` fallback `1`) — Task 4 step 1, `defaultWave` `useMemo`.
- Validation (per-row mismatch, form-level disable) — Task 4 step 1, `rowHasMismatch` + `canSubmit`.
- Submission flow (`Promise.allSettled`, per-row errors) — Task 4 step 1, `handleSubmit`.
- Stat strip (current wave) — Task 4 step 1, `currentWaveStats`.
- Loading/error states (skeleton + ErrorBanner pattern) — Task 4 step 1, bootstrap branches and inline `surveysError` branch.
- Mutation invalidation (`awareness-surveys`, `awareness-trajectory`, `mission-control`) — Task 3.

**Placeholder scan:** All steps contain runnable code or runnable commands. No "TBD", "TODO", "implement later", "add error handling".

**Type consistency:** `Zone` defined in Task 1 used in Tasks 2, 4. `AwarenessSurveyRow` defined in Task 2 used in Tasks 3, 4. `useCreateAwarenessSurvey` mutation body shape (Task 3) matches the `mutateAsync` call shape in Task 4 (`crusade_id`, `zone_id`, `survey_number`, `surveyed_count`, `attending_yes_count`, `taken_on`). `defaultWave` consistently means `max(survey_number)` with fallback `1` everywhere.
