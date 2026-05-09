# PCM Wiring (/pastors + /pastors/{id}/identifications) — Design Spec

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan
**Roadmap chunk:** Chunk 7 of the revised 7-chunk roadmap (`docs/superpowers/specs/2026-05-02-form-wiring-triage.md`)

## Goal

Replace the localStorage-backed PCM form (4-step wizard with vetting/references/characteristics) with a 2-step form that creates a `Pastor` record and assigns a `PastorIdentification(category='PCM')` to it. Drop fields nothing reads. Update `PCMListScreen` to consume the API instead of localStorage, and replace the `backgroundCheck` UX with `pipeline_stage`.

No backend changes — both endpoints already exist (`/pastors` apiResource + `POST /pastors/{pastor}/identifications`).

## Why two calls, not one

The data lives in two tables: the pastor record (identity + contact + zone) and the pastor_identification record (which committee/role they're assigned to). The existing endpoints model that separation. We POST `/pastors` to create the pastor with `pipeline_stage='identified'`, then POST `/pastors/{id}/identifications` with `category='PCM'` and `sub_role=<role>`. Folding both into a single backend transaction would require a new endpoint we don't have time-budget for in this chunk — and the existing two-call shape is honest about the data model.

The risk is that step 2 fails after step 1 succeeds: the pastor exists without a PCM identification. We handle that as a user-visible partial-failure state (not auto-rollback) so the director can decide what to do.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | One backend call or two? | **Two.** Existing endpoints; no backend work in this chunk. |
| 2 | Step-2 failure mode | **Surface partial failure.** Pastor stays created. Form shows an inline error with a "Retry assignment" button that re-runs step 2 only. Director can also dismiss and resolve manually later. No automatic rollback. |
| 3 | Wizard shape | **Collapse 4 steps → 2.** Step 1 = Pastor basics (name, role, zone, phone, email, address, years in ministry). Step 2 = Review + Submit. Drop the dedicated Vetting and Contact-as-separate-step screens; merge contact into Step 1. Drop the Review-as-step pattern in favor of a single Review screen visible after Continue. |
| 4 | Drop fields | denomination, whatsapp, backgroundCheck, reference1Name/Phone, reference2Name/Phone, characteristicsMet[], vettingNotes, attestation, churchName-as-freetext. |
| 5 | `yearsInMinistry` mapping | Convert at submit time: `pastor_since = current_year - yearsInMinistry` (or `null` if blank). |
| 6 | `zone` mapping | Reshape from string enum (`wa-central`, etc.) to `zone_id` FK lookup via `useZones`. SelectField options are `{ value: zone.id, label: zone.name ?? zone.code }`. |
| 7 | `role` mapping | `role` is a free-text input that becomes `pastor_identifications.sub_role`. Pastor record itself has no role column. |
| 8 | Edit existing pastor | **Out of scope.** Backend supports PATCH; no UI hook in this chunk. |
| 9 | List-screen status field | Replace `backgroundCheck` (`pending`/`cleared`/`flagged`) with `pipeline_stage` (`identified`/`engaged`/`committed`/`active`/`champion`). Map to existing status pill classes (see Architecture). |
| 10 | Filter list to PCM-only | **Show all pastors.** The PCM screen shows the pastor roster — pastors created via PCM all start at `pipeline_stage='identified'` and progress; filtering by "has PCM identification" would need a backend filter we don't have. Acceptable scope: PCM is currently the only entry point for pastor records, so "all pastors" = "all PCM-identified pastors" in practice. Revisit if other identification entry points are added. |
| 11 | Draft persistence | **Keep `draftStorage` for in-progress wizard.** It's local-only state for the multi-step form; not the same as `submitQueue` (which is what we're removing). Auto-save survives navigation; clears on successful submit or explicit cancel. |

## Architecture

### Backend

**No changes.** Endpoints already exist:
- `apiResource('pastors', ...)` — full CRUD
- `POST /pastors/{pastor}/identifications` — create identification record

### Frontend

#### New hooks (`web/src/api/hooks.ts`)

```ts
export interface PastorIdentificationRow {
  id: number;
  pastor_id: number;
  category: string;
  sub_role: string | null;
  assigned_at: string;
  assigned_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export function useCreatePastor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      full_name: string;
      zone_id: number | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      pastor_since: number | null;
      pipeline_stage?: 'identified' | 'engaged' | 'committed' | 'active' | 'champion';
    }) =>
      apiFetch<{ data: Pastor }>('/pastors', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pastors'] });
      qc.invalidateQueries({ queryKey: ['pastor-stage-counts'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}

export function useCreatePastorIdentification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pastorId, body }: {
      pastorId: number;
      body: { category: string; sub_role: string | null; assigned_at: string };
    }) =>
      apiFetch<{ data: PastorIdentificationRow }>(
        `/pastors/${pastorId}/identifications`,
        { method: 'POST', body: JSON.stringify(body) },
      ).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['pastor', vars.pastorId] });
      qc.invalidateQueries({ queryKey: ['pastors'] });
    },
  });
}
```

#### Form rewrite (`web/src/screens/forms/PCMForm.tsx`)

**Drop:**
- `enqueue` from submitQueue (the localStorage write path)
- `DENOMINATIONS` constant
- `ZONES` hardcoded array
- `CHARACTERISTICS` constant + `MIN_CHARACTERISTICS`
- `validateStep('vetting')` and `validateStep('review')` blocks
- The `vetting` and dedicated `review` *steps* (review becomes a render mode after step 1, not a separate state)
- All references-related fields (reference1*, reference2*)
- backgroundCheck SegmentedField + state
- ChecklistField for characteristics
- vettingNotes
- attestation SegmentedField + state
- The `Photo` and `GPS coordinates` placeholder buttons (already disabled — drop the dead UI)

**Keep:**
- `draftStorage` (saveDraft / loadDraft / clearDraft)
- `useDebouncedCallback` for autosave
- `FormShell` + `useNavigate`
- The 2-step pattern (basics → review)
- The `sessionStorage` active-draft id

**Step 1 — Pastor basics** (single screen, no inner stepper between contact + identification):
- `full_name` (TextField, required)
- `role` (TextField, required, placeholder "e.g. Senior Pastor") — becomes `sub_role`
- `years_in_ministry` (NumberField, optional)
- `phone` (PhoneField, required)
- `email` (TextField type="email", optional)
- `address` (TextareaField, optional)
- `zone_id` (SelectField populated from `useZones()`, required)

Validation: full_name, role, phone, zone_id required.

**Step 2 — Review:**
Read-only summary with Edit links, plus a single Submit button. No attestation gate.

**Submission flow:**
```ts
const pastor = await createPastor.mutateAsync({
  crusade_id: crusade.id,
  full_name: data.fullName,
  zone_id: Number(data.zoneId),
  phone: data.phone,
  email: data.email || null,
  address: data.address || null,
  pastor_since: data.yearsInMinistry === ''
    ? null
    : new Date().getFullYear() - data.yearsInMinistry,
  pipeline_stage: 'identified',
});

try {
  await createIdentification.mutateAsync({
    pastorId: pastor.id,
    body: {
      category: 'PCM',
      sub_role: data.role,
      assigned_at: new Date().toISOString().slice(0, 10),
    },
  });
  // Full success: clear draft, navigate to /forms/pcm.
} catch (err) {
  // Partial-failure state: pastor exists, identification didn't land.
  setPartialFailure({ pastorId: pastor.id, message: extractApiMessage(err) });
}
```

**Partial-failure UX:**
A persistent inline error block above the Submit button:
```
Pastor "<full_name>" was saved (id #123), but the PCM assignment failed.
<actual server error message>
[Retry assignment]   [Skip — I'll handle it later]
```
- **Retry assignment** re-runs `createIdentification.mutateAsync` with the saved `pastorId`.
- **Skip** clears the draft, removes the active-draft sessionStorage key, and navigates to `/forms/pcm`. The pastor will appear in the list at `pipeline_stage='identified'` with no identifications yet — visible enough for the director to spot.

If step 1 itself fails: surface the error inline (`extractApiMessage(err)`); user retries the whole submit. No partial state to clean up.

**Error helper** (extracted into `lib/apiErrors.ts` if not already there):
```ts
export function extractApiMessage(e: unknown, fallback = 'Failed'): string {
  if (e instanceof ApiError) {
    const body = e.body;
    if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
      return (body as { message: string }).message;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}
```
(If `lib/apiErrors.ts` doesn't exist yet, create it; if the same logic is already inlined in DailyExpensesForm or BOTForm, opportunistically extract during this chunk. Otherwise keep inline. Don't block on the refactor.)

#### List rewrite (`web/src/screens/forms/PCMListScreen.tsx`)

**Drop:**
- `getRecords`/`subscribe` imports
- `SEED` array
- `useState(getRecords...)` initializer + the `useEffect(subscribe, ...)` block
- `STATUS_LABEL` / `STATUS_CLASS` keyed by `backgroundCheck`

**Add:**
- `usePastors()` (existing hook) — fetches paginated pastor list
- `useZones()` — for zone label resolution

**New status mapping (by `pipeline_stage`):**
```ts
const STAGE_LABEL: Record<Pastor['pipeline_stage'], string> = {
  identified: 'Identified',
  engaged: 'Engaged',
  committed: 'Committed',
  active: 'Active',
  champion: 'Champion',
};

const STAGE_CLASS: Record<Pastor['pipeline_stage'], string> = {
  identified: 'pending',     // gray pill (most-still-being-worked)
  engaged: 'pending',
  committed: 'confirmed',    // green pill
  active: 'confirmed',
  champion: 'confirmed',
};
```

**Stat strip:**
- "X of Y confirmed" → "X confirmed" where confirmed = `pipeline_stage` ∈ {committed, active, champion}
- "Y in vetting" → "Y in funnel" where in funnel = `pipeline_stage` ∈ {identified, engaged}

**Row rendering:**
- `name` → `pastor.full_name`
- `sub` line: zone name (lookup via `useZones`) + ` · ` + the most recent PCM identification's `sub_role` (if any). Since `usePastors` doesn't include identifications, we'll render `<zone name>` only. (Open follow-up: backend could include the latest identification on the index endpoint; deferred.)
- right column: status pill (from STAGE_LABEL/STAGE_CLASS) + phone

**Loading/empty/error:**
- Loading: full-screen "Loading…" inside FormShell
- Error: ErrorBanner with retry
- Empty (no pastors): empty state with "Add new PCM" CTA centered

### Form description composition

PCM doesn't fold fields into a description — `full_name`, `role`, etc. all go to typed columns. No composition needed.

### Auth context

`PastorIdentificationController::store` reads `$request->user()->id` for `assigned_by_user_id`. The frontend doesn't need to send it — the auth middleware injects from `Bearer` token. No frontend changes needed for that.

### File touch list

**Frontend modify:**
- `web/src/api/hooks.ts` — append 1 type + 2 hooks (`useCreatePastor`, `useCreatePastorIdentification`)
- `web/src/screens/forms/PCMForm.tsx` — full rewrite
- `web/src/screens/forms/PCMListScreen.tsx` — full rewrite

**Frontend create (optional, opportunistic):**
- `web/src/lib/apiErrors.ts` — `extractApiMessage` helper. Create only if appetite for the refactor; otherwise inline in the form.

**Backend:** none.

**Delete:** none. (`PCMRecord` type can stay or be inlined — the type was the localStorage shape; if no other file imports it after the rewrite, drop it. Quick grep at implementation time.)

## Out of scope (explicitly)

- Editing existing pastors (PATCH endpoint exists; no UI hook)
- Adding identifications to a pastor outside the PCM-create flow (e.g. promoting a pastor to BOT) — separate UX concern
- Backend filter for "pastors with identification category=X"
- Showing the latest identification's sub_role on the list-row sub line (would require backend `index` to eager-load identifications)
- Photo upload (the existing "+ Add photo (coming soon)" button stays disabled or gets removed; let's just remove it)
- GPS coordinate capture
- Bulk import
- Search/filter within the PCM list (different chunk)
- Pagination UI past page 1 (`per_page=50` default; revisit if rosters grow)
- Soft-delete UX (backend uses SoftDeletes; no UI hook)

## Open follow-ups

- Backend: extend `PastorController::index` to accept `?identification_category=PCM` filter (supports a future "PCM-only" view if other identification entry points appear)
- Backend: eager-load latest `PastorIdentification` on `index` so the list-row sub line can show sub_role
- Frontend: `extractApiMessage` extracted to `lib/apiErrors.ts` and adopted across BOTForm/CPCForm/AwarenessSurveyForm/DailyExpensesForm in a follow-up cleanup chunk
- Pastor edit screen (route + form) — likely Chunk 11 polish or a dedicated chunk
- Promote-to-BOT/CPC affordance from a pastor's row — adds an identification with `category='BOT'` or `'CPC'`; needs the inverse of this form
