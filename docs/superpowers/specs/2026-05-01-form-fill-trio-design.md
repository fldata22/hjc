# Form-Fill Trio (PCM / BOT / PCM Hunt Daily) — Design Spec

**Date:** 2026-05-01
**Status:** Approved, ready for implementation plan

## Goal

Ship the first three working form-fill detail screens for the HJC director's tool — covering the three distinct interaction shapes (multi-step wizard, single-screen append-to-list, daily append-mode log) — plus a shared `FormShell` scaffold and offline-first persistence. Forms 4 onwards plug into the same scaffold without re-architecting.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Scope of this phase | **A.** Council's stress-test trio: FormShell + PCM Intake (wizard) + BOT Roster (single-screen) + PCM Hunt Daily (append-log). The other 33 forms in the Forms hub remain `Placeholder`. |
| 2 | Data persistence | **No real API endpoints in scope.** Drafts and submissions live in `localStorage`. Submission simulates a 1s round-trip. Real Laravel endpoints are a follow-up phase; the swap point is the `submitQueue` module. |
| 3 | Wizard pattern (PCM) | Multi-screen stepper, 4 steps. Inline validation on Continue. "Save draft" available at any time, no validation gate. |
| 4 | Single-screen pattern (BOT) | Inline-add form (no modal) below the existing roster list. Save submits one row, list refreshes, form collapses. |
| 5 | Daily-log pattern (Hunt Daily) | Per-day view. Each entry submitted independently as appended. 14-day horizontal date selector at top. |
| 6 | Offline strategy | Drafts autosave to `localStorage` (debounced 500ms). Submissions enqueue to a `submitQueue` that retries on `online` event. UI shows "Saved Xs ago" / "Pending sync" / "Synced ✓". |

## Breakpoints / responsive

All three forms inherit the responsive shell built in the prior phase: phone chrome (status bar + app bar + tab bar) below 1024px, persistent sidebar at desktop. Form layouts are single-column phone-first; at desktop they cap at the same content widths the rest of the app uses (1200px for hub-style content, narrower for focused forms — see per-form CSS).

## Architecture

### Components

**`<FormShell>`** — wraps a single form. Anatomy top-to-bottom:

- **Top bar (inside `.scroll`):** Back arrow → returns to `/forms`. Form title in Playfair italic accent. Pillar badge (e.g. `P1`). Auto-save status mono ("Saved 3s ago" / "Pending sync" / "Synced ✓").
- **Stepper (optional):** Horizontal `.stepper` rendered only if `steps.length > 1`. Current step highlighted with `--accent`, completed steps with `--ink`, future steps with `--bg-2`. Step labels shown below ticks.
- **Content slot:** Children rendered here. Each form decides its own internal layout — fields, lists, inline-add forms.
- **Sticky action bar (`.action-bar` reused from app.css):** Primary CTA ("Continue →" / "Submit" / "Save"). Secondary ("Save draft" / "Back"). Save-status indicator on the left.

Props:
```ts
type FormShellProps = {
  title: string;
  pillar: string;             // e.g. 'P1', 'P3'
  steps?: Array<{ id: string; label: string }>;
  currentStepId?: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'pending' | 'synced' | 'error';
  primaryAction: { label: string; onClick: () => void; disabled?: boolean };
  secondaryAction?: { label: string; onClick: () => void };
  children: ReactNode;
};
```

**`<fields>` module** — small focused field components that wrap raw inputs + label + error display, all using existing app.css classes:

- `<TextField label required value onChange error/>`
- `<TextareaField label value onChange/>`
- `<SegmentedField label options value onChange required/>` — uses `.seg`
- `<SelectField label options value onChange required/>`
- `<PhoneField label value onChange required/>` — wraps text input with country-prefix UX
- `<DateField label value onChange/>`
- `<NumberField label value onChange suffix/>`
- `<CurrencyField label value onChange currency/>` — wraps NumberField with prefix
- `<ChecklistField label items value onChange minRequired/>` — checkbox group with min-required validation

Each component is presentational; state lives in the parent form component via `useState`.

### Per-form components

**`<PCMForm>`** at `/forms/pcm/new`:
- Internal state: 4-step wizard with current step index
- Fields per step (~20 total) — see "PCM Intake" section below
- "Continue →" disabled until all required fields on current step pass validation
- "Save draft" works at any time, persists to `localStorage` under `hjc_draft_pcm_<draftId>`
- "Submit PCM" on step 4 enqueues the submission and navigates back to `/forms/pcm`

**`<PCMListScreen>`** at `/forms/pcm`:
- Header: "PCM · Primary Committee Members", P1 badge
- Stat strip from mock data: "9 of 10 confirmed · 1 in vetting"
- List of existing PCMs (mock seed data + any added via `<PCMForm>`)
- Sticky bottom: "+ Add new PCM" → `/forms/pcm/new`

**`<BOTForm>`** at `/forms/bot`:
- Header + stat strip ("8 of 12 confirmed · 4 pending")
- Existing trustees list (mock seed + added entries)
- Sticky bottom: "+ Add trustee" toggle button
- Toggling reveals an inline form (~7 fields). Save appends the row to the list and collapses the form.

**`<PCMHuntDailyForm>`** at `/forms/pcm-hunt-daily`:
- Header + horizontal 14-day date selector (default today)
- Day rollup card: "N entries · M contacts · ₵X spent" (computed from selected day's entries)
- Today's entries list (newest first)
- Sticky bottom: "+ Log activity" → reveals inline 8-field form
- Each "Add" submits one entry to that day's log

### Persistence module: `web/src/lib/draftStorage.ts`

Pure functions, no React. Used by form components via `useEffect` to persist drafts and load them on mount.

```ts
export function saveDraft(formSlug: string, draftId: string, data: unknown): void
export function loadDraft<T>(formSlug: string, draftId: string): T | null
export function clearDraft(formSlug: string, draftId: string): void
export function listDrafts(formSlug: string): Array<{ id: string; updatedAt: string }>
```

Storage keys: `hjc_draft_<formSlug>_<draftId>`. Each draft is JSON-serialized with `{ data, updatedAt }`. Debouncing happens in the form component (a `useDebouncedCallback` wrapper around `saveDraft`).

### Submission queue: `web/src/lib/submitQueue.ts`

Pure module that handles "submit" events. Since no real API exists, it simulates network with a 1s timer. Enqueues to `localStorage` if offline, retries on `online` window event.

```ts
export type Submission = {
  id: string;
  formSlug: string;
  data: unknown;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  enqueuedAt: string;
  syncedAt?: string;
};

export function enqueue(formSlug: string, data: unknown): Submission
export function getQueue(): Submission[]
export function processQueue(): Promise<void>     // called on online event + on enqueue
export function getRecords<T>(formSlug: string): T[]   // synced records pulled back from localStorage
```

Storage:
- Queue: `hjc_submit_queue` (array of pending Submissions)
- Records: `hjc_records_<formSlug>` (array of synced data objects)

The queue automatically processes on:
1. Each `enqueue()` call (immediate attempt)
2. The `window` `online` event (retry stale items)
3. App mount (resume any queue items left from previous sessions)

Submission "succeeds" by moving the item from `hjc_submit_queue` → `hjc_records_<formSlug>`. Forms render their lists from `getRecords()` so synced entries appear immediately.

### Routes

Added to `web/src/App.tsx`:

```
/forms                  Forms hub (existing — wire row navigation, see below)
/forms/pcm              PCMListScreen
/forms/pcm/new          PCMForm
/forms/bot              BOTForm
/forms/pcm-hunt-daily   PCMHuntDailyForm
/forms/:slug            Placeholder (catch-all for the other 33 — already exists conceptually)
```

The `/forms/:slug` catch-all needs to be ordered AFTER the specific routes so React Router matches the specific ones first.

### Forms hub wiring

`web/src/screens/app/FormsScreen.tsx` currently renders `.form-row` divs that don't navigate. Update each row to be a clickable `<button type="button" onClick={() => navigate('/forms/<slug>')}>` (or wrap in `<Link>`). Slugs:

| Existing hub row | Route slug |
|---|---|
| PCM (Primary Committee Members) | `pcm` |
| BOT (Board of Trustees) | `bot` |
| PCM Hunt Daily Activity (if not already in hub — add it) | `pcm-hunt-daily` |
| All other rows | their own slug → catch-all → Placeholder |

The visual `.form-row` styling stays unchanged; we're only adding interactivity.

### File reorganization

**New files:**
- `web/src/screens/forms/FormShell.tsx`
- `web/src/screens/forms/fields.tsx`
- `web/src/screens/forms/forms.css`
- `web/src/screens/forms/PCMForm.tsx`
- `web/src/screens/forms/PCMListScreen.tsx`
- `web/src/screens/forms/BOTForm.tsx`
- `web/src/screens/forms/PCMHuntDailyForm.tsx`
- `web/src/screens/forms/seedData.ts` — mock initial PCM/BOT/Hunt records for first-load demo
- `web/src/lib/draftStorage.ts`
- `web/src/lib/submitQueue.ts`
- `web/src/lib/useDebouncedCallback.ts`

**Modified:**
- `web/src/App.tsx` — add 4 routes
- `web/src/screens/app/FormsScreen.tsx` — wire row navigation

**Deleted:** none.

## Per-form designs

### PCM Intake — multi-step wizard

#### Listing screen (`/forms/pcm`)

- App header: "PCM · Primary Committee Members" with `P1` badge
- Stat strip below header: serif "9" / "of 10 confirmed" + smaller "1 in vetting"
- List of existing PCMs (mock seed + records from `getRecords('pcm')`):
  - Each row: name (medium weight), church (small grey), status badge (Confirmed / Vetting / Pending / Flagged), last-updated mono
  - Tap → `/forms/pcm/<id>` (out of scope this phase — link is dead, opens placeholder)
- Sticky bottom action bar: "+ Add new PCM" primary button → `/forms/pcm/new`

#### Wizard (`/forms/pcm/new`)

4 steps shown in a `.stepper` strip at the top.

**Step 1 · Identification**
| Field | Component | Required |
|---|---|---|
| Full name | `TextField` | ✓ |
| Denomination | `SelectField` (options: Pentecostal, Baptist, Methodist, Anglican, Catholic, Other) | ✓ |
| Church name | `TextField` | ✓ |
| Role / title | `TextField` (placeholder "e.g. Senior Pastor") | ✓ |
| Years in ministry | `NumberField` (suffix "yrs") | – |
| Photo | placeholder UI ("Add photo" button — clicks do nothing in this phase) | – |

**Step 2 · Contact & Location**
| Field | Component | Required |
|---|---|---|
| Phone | `PhoneField` | ✓ |
| WhatsApp | `PhoneField` + "Same as phone" toggle | – |
| Email | `TextField` (type=email) | – |
| Address | `TextareaField` | – |
| Zone | `SelectField` (mock options: Wa Central, Wa North, Wa South, Wa East, Wa West) | ✓ |
| GPS coordinates | placeholder "Use my location" button (clicks do nothing) | – |

**Step 3 · Vetting**
| Field | Component | Required |
|---|---|---|
| Background check status | `SegmentedField` (Pending / Cleared / Flagged) | ✓ |
| Reference 1 — name | `TextField` | ✓ |
| Reference 1 — phone | `PhoneField` | ✓ |
| Reference 2 — name | `TextField` | – |
| Reference 2 — phone | `PhoneField` | – |
| Characteristics met | `ChecklistField` with these items, min 3 required: <br>• Ordained 5+ years <br>• Active congregation 100+ <br>• No prior moral failures <br>• Fluent in local language <br>• Endorsed by district overseer <br>• Available throughout crusade window <br>• Owns transport | ✓ (≥3) |
| Vetting notes | `TextareaField` | – |

**Step 4 · Review & Confirm**
- Read-only summary of all fields entered, grouped under each step header
- Each section has an "Edit" link → jumps back to that step (preserves all data)
- Attestation: `SegmentedField` with single-toggle ("I confirm this PCM has been vetted per HJC criteria") — required true to enable Submit
- Sticky CTA: "Submit PCM" (replaces "Continue →" on this step)

**Validation:**
- "Continue →" disabled until all required fields on current step pass
- Tapping Continue with errors highlights blank required fields with `--accent` border + inline error text
- "Save draft" always enabled — no validation
- Hitting back-button mid-wizard prompts: "Save draft and exit? / Discard"
- Browser refresh restores from autosave + lands on the last step you were on

**Behavior:**
- A new draft is created with `draftId = crypto.randomUUID()` on mount
- Autosave runs every 500ms after typing stops, persists `{ currentStepId, formData }`
- "Submit" calls `submitQueue.enqueue('pcm', formData)`, clears the draft, navigates to `/forms/pcm`
- A toast or banner on `/forms/pcm` confirms "PCM submitted ✓" (or "Submitted offline — will sync when online")

### BOT Roster — single-screen

`/forms/bot`

- App header: "BOT · Board of Trustees" with `P3` badge
- Stat strip: "8 of 12 confirmed · 4 pending"
- Trustees list — each row:
  - Name (medium weight)
  - Role · Org (small grey)
  - Phone (mono small) on the right
  - Status pill (`Confirmed` / `Pending` / `Declined`)
- Sticky bottom: "+ Add trustee" toggle button

When toggled open, an inline form expands below the button (NOT a modal):

| Field | Component | Required |
|---|---|---|
| Full name | `TextField` | ✓ |
| Role | `TextField` (placeholder "e.g. Treasurer") | ✓ |
| Organization | `TextField` | – |
| Phone | `PhoneField` | ✓ |
| Email | `TextField` | – |
| Status | `SegmentedField` (Confirmed / Pending / Declined) | ✓ |
| Notes | `TextareaField` | – |

Bottom of inline form: "Cancel" (collapses, discards) and "Save trustee" (calls `submitQueue.enqueue('bot', formData)`, prepends new row to list, collapses form).

No stepper. No multi-step. No autosave for the inline form (it's quick enough — abandon = lose).

### PCM Hunt Daily Activity — append-mode log

`/forms/pcm-hunt-daily`

- App header: "PCM Hunt · Daily Activity" with `P1` badge
- **Date selector strip** below header: horizontal scroll of last 14 days. Each day shows day-of-week + date number. Today is highlighted with `--accent` underline. Tap to switch.
- **Day rollup card:** "N entries · M contacts · ₵X spent" computed from the selected day's entries (where the entry data has `outcome === 'Met' | 'Won'` for contacts and `expense` field for currency total)
- **Entries list** (newest first within the day):
  - Each card: time (mono), location (medium), contact name (small), outcome badge, expense (mono right-aligned), notes preview if any
- Sticky bottom: "+ Log activity" toggle button

Inline add form when toggled:

| Field | Component | Required |
|---|---|---|
| Time | `DateField` (time-only — defaults to now) | ✓ |
| Location visited | `TextField` (placeholder "Church / venue") | ✓ |
| Contact name | `TextField` | ✓ |
| Contact phone | `PhoneField` | – |
| Outcome | `SegmentedField` (Met / No-show / Re-schedule / Won) | ✓ |
| Leads generated | `NumberField` | – |
| Expense | `CurrencyField` (₵) | – |
| Notes | `TextareaField` | – |

"Add entry" button — submits to `submitQueue.enqueue('pcm-hunt-daily', { date, ...formData })`, prepends to today's list, clears the form (stays open for the next entry — distinct from BOT which collapses). Director can rapid-fire entries during a hunt day.

Editing prior entries is out of scope for this phase. Tapping a day in the past shows entries read-only.

### Forms hub wiring

In `web/src/screens/app/FormsScreen.tsx`, add the missing "PCM Hunt Daily Activity" row to the appropriate category section (probably P · Participation or D · Daily ops). Wire each row's `onClick` to `navigate('/forms/<slug>')`. Slug map:

| Hub row name | Slug |
|---|---|
| PCM (Primary Committee Members) | `pcm` |
| Fathers of the Land | `fathers` |
| BOT (Board of Trustees) | `bot` |
| CPC (Central Planning) | `cpc` |
| Worker Groups | `workers` |
| Awareness Survey · Field | `awareness-survey` |
| PPPPPPPAVEDDD Town Name | `town-name` |
| Publicity & Video Campaign | `publicity` |
| Venue Inspection (Regular) | `venue-inspection` |
| Must-Do Checklist | `must-do` |
| Weekly Assessment Rating | `weekly` *(redirects to existing `/weekly`)* |
| Crusade Daily Expenses | `daily-expenses` |
| **PCM Hunt Daily Activity** *(new row)* | `pcm-hunt-daily` |

All slugs except `pcm`, `bot`, `pcm-hunt-daily`, and `weekly` will land on `Placeholder` via the `/forms/:slug` catch-all route.

The Weekly row should navigate to `/weekly` (the existing screen), not `/forms/weekly`. Special-case it in the click handler.

## Implementation order (suggested)

1. Storage primitives: `draftStorage.ts`, `submitQueue.ts`, `useDebouncedCallback.ts` — pure modules, can be tested in isolation.
2. Field components: `fields.tsx` with all 9 wrappers.
3. `FormShell.tsx` and `forms.css`.
4. `BOTForm.tsx` (simplest shape) — proves shell + fields + submit queue end-to-end.
5. `PCMHuntDailyForm.tsx` (different shape) — proves date-keyed records + per-entry append.
6. `PCMListScreen.tsx` and `PCMForm.tsx` (most complex — wizard with 4 steps + autosave restore).
7. `seedData.ts` — initial mock records for first-load demo.
8. Routes in `App.tsx`.
9. Wire `FormsScreen.tsx` row navigation.
10. Manual sweep of all three forms in browser at phone (393), tablet (820), desktop (1280) widths.

## Non-goals (explicitly out of scope)

- Real Laravel API endpoints — submission is `localStorage` simulation only. The real backend wiring is a separate phase; the swap point is `submitQueue.ts`.
- The other 33 forms in the hub — they navigate but land on `Placeholder`.
- Image upload (PCM "Photo" is a placeholder UI).
- Real geolocation (PCM "Use my location" is a placeholder UI).
- Multi-device sync / conflict resolution (single-device only).
- Editing prior-day entries in PCM Hunt Daily (read-only past).
- Editing existing PCM records (`/forms/pcm/<id>` is out of scope).
- Pillar drill-down (`/pillars/:code` stays placeholder).
- Pastors / Quick log / sidebar destinations (separate phases).
- Loading skeletons, server error toasts (no real server).
- Accessibility audit beyond the basics (focus management between steps, label-for-input pairing).

## Open follow-ups (post-implementation)

- Wire `submitQueue` to real Laravel endpoints (replace the simulated 1s timer with `apiFetch`).
- Build the remaining 33 forms (incrementally, prioritised by director feedback).
- PCM detail / edit screen at `/forms/pcm/:id`.
- Edit-prior-day support in PCM Hunt Daily.
- Real photo upload + storage in PCM Intake step 1.
- Real geolocation in PCM Intake step 2.
- Pillar drill-down screens at `/pillars/:code`.
- Migrate Pastors directory + profile, Quick log, sidebar destinations.
- The full validation step the council recommended: 60-min conversation with the director to confirm these three are the highest-leverage forms — and adjust the next batch accordingly.
