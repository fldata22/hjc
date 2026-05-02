# Awareness Survey API Wiring — Design Spec

**Date:** 2026-05-02
**Status:** Approved, ready for implementation plan
**Roadmap chunk:** Chunk 3 of 11

## Goal

Replace the localStorage-backed Awareness Survey form with direct reads/writes to the existing Laravel `/awareness-surveys` endpoints. Reshape the form from per-respondent capture (incompatible with backend) to a one-wave-across-all-zones matrix that matches the aggregate `awareness_surveys` table. Proves the localStorage→API swap pattern on one form before Chunk 4 generalizes it.

## Background: the structural mismatch

The previous form and the backend stored fundamentally different shapes.

**Old form** captured per-respondent records: `respondentName, ageRange, gender, zone, religion, heardOfHJC, heardOfCrusade, channels[], planToAttend, bringOthers, concerns, surveyorNotes`. Stored to `localStorage` via `submitQueue`.

**Backend** (`awareness_surveys` table) stores per-zone aggregate counts:

```sql
crusade_id, zone_id, survey_number (1, 2, 3…),
surveyed_count, attending_yes_count, taken_on
UNIQUE(crusade_id, zone_id, survey_number)
```

One row = "in zone X, on survey wave N, we asked S people, A said yes."

The Mission Control "awareness %" stat and the trajectory chart both read from the aggregate table — they don't care about demographics, channels, or names. The rich per-respondent fields the old form captured were speculative; nothing in the app reads them.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Reconcile the form/backend mismatch | **A.** Reshape the form to match the backend aggregate schema. Drop demographic/channel fields entirely. Smallest change; matches the data the dashboard actually reads. |
| 2 | How does the director enter a wave? | **A2.** One wave across all zones in a single matrix form. Director picks the wave number once, then enters surveyed/attending counts for every zone in a grid. Submits as N records (one per zone with data). Matches the real-world workflow (go survey, come back, log everything once). |
| 3 | What does the screen show before the form opens? | **B1.** Past waves table. One row per wave: `Wave N · X zones · YY% · MMM DD`. Tap a row to expand the per-zone breakdown. Matches the "log of work done" pattern on other form pages. |

## Architecture

### Backend (no changes)

Already-existing endpoints used as-is:
- `GET /zones` → list of crusade's zones (10 seeded as Z01–Z10)
- `GET /awareness-surveys` → flat list of all aggregate rows (filterable by `crusade_id`, `zone_id`, `survey_number` — we use unfiltered)
- `POST /awareness-surveys` → create one row; validates `attending_yes_count <= surveyed_count` and `unique(crusade_id, zone_id, survey_number)`
- `GET /awareness-surveys/trajectory` → already wired to dashboard; we don't add a new endpoint
- `GET /crusade` → for `crusade_id`

### New React Query hooks

Add to `web/src/api/hooks.ts`:

```ts
export interface Zone { id: number; crusade_id: number; code: string; name: string;
                       population: number | null; pap: number | null; }

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: () => apiFetch<{ data: Zone[] }>('/zones').then((r) => r.data),
  });
}

export interface AwarenessSurveyRow {
  id: number; crusade_id: number; zone_id: number;
  survey_number: number; surveyed_count: number; attending_yes_count: number;
  taken_on: string; created_at: string; updated_at: string;
}

export function useAwarenessSurveys() {
  return useQuery({
    queryKey: ['awareness-surveys'],
    queryFn: () => apiFetch<{ data: AwarenessSurveyRow[] }>('/awareness-surveys').then((r) => r.data),
  });
}

export function useCreateAwarenessSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number; zone_id: number; survey_number: number;
      surveyed_count: number; attending_yes_count: number; taken_on: string;
    }) => apiFetch<{ data: AwarenessSurveyRow }>('/awareness-surveys',
      { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awareness-surveys'] });
      qc.invalidateQueries({ queryKey: ['awareness-trajectory'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}
```

### Form rewrite

`web/src/screens/forms/AwarenessSurveyForm.tsx` — full rewrite. Drop:
- `SurveyResponse` per-respondent type
- `SEED` mock data
- Hardcoded `ZONES` and `CHANNELS` constants
- `submitQueue` import (`enqueue`, `getRecords`, `subscribe`)
- `awarenessSummary` helper
- The entire inline form (Respondent / Awareness / Engagement / Worker observations sections)

Add:
- React Query loading/error handling (`useCrusade`, `useZones`, `useAwarenessSurveys`, `useCreateAwarenessSurvey`)
- Past-waves table (read affordance)
- Wave-entry matrix form (write affordance)
- Stat strip recomputed from real data

### Screen layout

```
┌─────────────────────────────────────────┐
│ Awareness Survey                  [Done]│
├─────────────────────────────────────────┤
│ Wave 3                  34% aware       │
│ 4 zones logged          (wave 3)        │
├─────────────────────────────────────────┤
│ PAST WAVES                              │
│ Wave 2 · 8 zones · 34% · Apr 18      ›  │
│ Wave 1 · 7 zones · 27% · Apr 04      ›  │
│                                         │
│ [+ Log new wave]                        │
└─────────────────────────────────────────┘
```

When a past-waves row is tapped, it expands inline to show per-zone breakdown:

```
Wave 2 · 8 zones · 34% · Apr 18      ⌃
  Zone 1     12/40   30%
  Zone 2      8/35   23%
  Zone 3     21/55   38%
  Zone 4     16/42   38%
  …
```

Tapping again collapses. Only one row expanded at a time (clicking a different row collapses the previous and expands the new one).

### Wave-entry matrix

When the user taps "+ Log new wave":

```
LOG WAVE
Wave number  [ 3 ]      Taken on  [2026-05-02]
─────────────────────────────────────────────
Zone 1     surveyed [  ]   attending [  ]
Zone 2     surveyed [  ]   attending [  ]
Zone 3     surveyed [  ]   attending [  ]
Zone 4     surveyed [  ]   attending [  ]
Zone 5     surveyed [  ]   attending [  ]
Zone 6     surveyed [  ]   attending [  ]
Zone 7     surveyed [  ]   attending [  ]
Zone 8     surveyed [  ]   attending [  ]
Zone 9     surveyed [  ]   attending [  ]
Zone 10    surveyed [  ]   attending [  ]
─────────────────────────────────────────────
                  [Cancel]   [Submit wave]
```

### Wave number defaulting

`defaultWave = max(survey_number across all rows)`, falling back to `1` if the table is empty. Computed from `useAwarenessSurveys` data — no extra request. Editable so the director can bump to the next wave when starting fresh, or backfill an old wave.

Rationale for default-to-max (vs. max+1): the director typically logs a wave across multiple sessions ("did 4 zones today, finishing the rest tomorrow"). Defaulting to the in-progress wave avoids accidentally creating a new wave on the second sit-down. The director bumps the number manually when actually starting a new wave, which is the rarer event.

### Taken-on defaulting

Defaults to `todayISO()`. Date picker. One date applies to all rows in the wave (since they're submitted together).

### Validation

- **Per row:** if `attending > surveyed`, show inline red caption `"can't exceed surveyed"` under the attending field. That row blocks submit.
- **Per row:** any row where both fields are blank or `0` is treated as "zone wasn't surveyed this wave" — silently skipped on submit. No validation error.
- **Form-level:** Submit is disabled unless at least one row has `surveyed > 0` AND no row violates `attending > surveyed`.
- **Backend:** `unique(crusade_id, zone_id, survey_number)` is enforced server-side. If the user picks a wave number that collides for any zone (e.g., trying to log wave 2 for Zone 3 when wave 2/Zone 3 already exists), the POST returns 422. We surface that as a per-row error message.

### Submission flow

```ts
const handleSubmit = async () => {
  setSubmitting(true);
  setRowErrors({});
  const validRows = rows.filter((r) => r.surveyed && r.surveyed > 0);
  const results = await Promise.allSettled(
    validRows.map((r) =>
      createMutation.mutateAsync({
        crusade_id: crusade.id,
        zone_id: r.zone_id,
        survey_number: waveNumber,
        surveyed_count: r.surveyed!,
        attending_yes_count: r.attending || 0,
        taken_on: takenOn,
      })
    )
  );
  setSubmitting(false);
  const failures = results
    .map((res, i) => ({ res, row: validRows[i] }))
    .filter(({ res }) => res.status === 'rejected');
  if (failures.length === 0) {
    alert(`Wave ${waveNumber} logged · ${validRows.length} zones`);
    setShowForm(false);
    setRows(emptyRows(zones));
  } else {
    const errs: Record<number, string> = {};
    failures.forEach(({ res, row }) => {
      const message = (res as PromiseRejectedResult).reason?.message ?? 'Failed';
      errs[row.zone_id] = message;
    });
    setRowErrors(errs);
    // Form stays open. Successful rows have already been written; user fixes failed rows and resubmits.
  }
};
```

### Stat strip computation

Both stats are computed client-side from `useAwarenessSurveys` data — no new endpoint:

- **Wave N (left):** `defaultWave` from the defaulting logic above (the wave the director is currently working on, or about to start).
- **X zones logged (left subtext):** count of rows where `survey_number === defaultWave` (how many zones already have data for the in-progress wave; climbs from 0 to 10 as the wave fills out).
- **YY% aware overall (right):** sum of `attending_yes_count` / sum of `surveyed_count` for rows where `survey_number === defaultWave`. Format as `—` if no data, otherwise `XX%`.
- **(wave N) (right subtext):** `defaultWave` (same number as the left), so the right-side stat is unambiguously labeled.

(Definition: `defaultWave = max(survey_number)` across all rows, falling back to `1` if no rows.)

Both halves of the strip describe the *current* wave. The previous wave's % can be inferred from the past-waves list right below.

### Loading / error / empty states

Following the per-query partial degradation pattern from Chunk 2:

- While `useCrusade` OR `useZones` is loading: show full-screen skeleton (the form is unusable without either).
- If `useCrusade` errors: full-screen `ErrorBanner` with retry. (Without `crusade_id` we can't POST.)
- If `useZones` errors: full-screen `ErrorBanner` with retry. (Without zones we can't render the matrix.)
- If `useAwarenessSurveys` is loading: show stat strip with `—` placeholders and "PAST WAVES" section with a single skeleton row.
- If `useAwarenessSurveys` errors: stat strip shows `—`, past-waves area shows inline `ErrorBanner` with retry. The "Log new wave" button is still usable (we have crusade + zones; we just can't auto-suggest the next wave number — falls back to `1`).
- Empty state for past waves (200 OK, empty list): `<div className="empty">No surveys logged yet.</div>` (existing utility class).

### Mutation status UX

- Submit button text:
  - Idle: `Submit wave`
  - Pending: `Submitting…` (disabled)
- Per-row error messages render in red below the failed row.

### Files touched

**Modify:**
- `web/src/api/hooks.ts` — add `Zone`, `AwarenessSurveyRow` types and `useZones`, `useAwarenessSurveys`, `useCreateAwarenessSurvey` hooks
- `web/src/screens/forms/AwarenessSurveyForm.tsx` — full rewrite (described above)

**Delete:** none. (The submitQueue/localStorage path stays in place for the other forms; Chunk 4 will sweep it.)

**Create:** none.

## Out of scope (explicitly)

- **Editing past waves.** Backend has `PATCH /awareness-surveys/{id}`, but no UI for it in this chunk. Add later if a real edit need surfaces.
- **Demographic/channel data capture.** All per-respondent fields dropped. Could come back as a separate "rich survey" feature if a real demographic-cut requirement emerges; would need a new backend table.
- **Trajectory chart on this screen.** Already on Home / Mission Control via `useAwarenessTrajectory`. No need to duplicate.
- **submitQueue/localStorage retention path.** The Awareness Survey form drops it entirely. Chunk 4 builds the generic offline queue + API swap layer for the remaining forms (PCM/BOT/CPC/Hunt Daily/Daily Expenses).
- **Optimistic updates.** On success we just invalidate the relevant queries. The director is logging-and-waiting, not in a high-throughput loop.
- **Toast/snackbar component.** Sticking with `alert()` for the success message (matches existing forms). Chunk 11 introduces a real toast component.
- **Rich error UI for backend validation.** We surface the raw error message text in the per-row error caption. No mapping to friendly copy.

## Open follow-ups (post-implementation)

- Chunk 4: generic submitQueue → API swap layer for the other forms.
- "Log wave for one zone" path (if doing all zones at once becomes friction).
- Edit/delete past waves.
- Trajectory mini-chart on the Awareness Survey screen itself (currently only on dashboard).
- Pagination on past waves if the list gets long (currently we render all of them).
