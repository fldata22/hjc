# Form-Fill Trio #2 (CPC / Daily Expenses / Awareness Survey) — Design Spec

**Date:** 2026-05-01
**Status:** Approved, ready for implementation plan

## Goal

Ship the next three working form-fill detail screens for the HJC director's tool — CPC (Central Planning Committee roster), Crusade Daily Expenses (date-keyed expense log), and Awareness Survey · Field (door-to-door respondent survey). Two reuse existing patterns; one introduces a new shape (single-page flat survey).

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Form shapes | **A.** CPC = roster (BOT-pattern), Daily Expenses = daily log (Hunt Daily-pattern), Awareness Survey = new single-page survey shape. |
| 2 | Survey layout | **A.** Single page — all questions visible, grouped with subheaders. Worker scrolls top-to-bottom and saves once. Optimised for speed (field workers run 20–30 surveys per session). |
| 3 | Survey logic | **A.** Flat — every question always visible. No `showIf` branching machinery in v1. Workers leave irrelevant fields blank (e.g. "How did you hear?" when respondent hasn't heard). |

## Architecture

Each form is its own component under `web/src/screens/forms/`, wrapped in `<ResponsiveShell active="forms">` with `<FormShell>` providing the editorial top bar + save status + sticky action bar. All three reuse:

- `FormShell` (header, optional stepper, action bar) — none of the three uses a stepper.
- `fields.tsx` (TextField, TextareaField, PhoneField, NumberField, CurrencyField, SegmentedField, SelectField, DateField, ChecklistField).
- `forms.css` (form-shell-top, stat-strip, form-list-row, date-strip, add-toggle, inline-form, checklist).
- `submitQueue.ts` (enqueue / getRecords / subscribe — offline-first localStorage with 1s simulated round-trip).

No real Laravel API endpoints in scope. The submission swap point remains `submitQueue.ts`.

### File reorganization

**New files:**
- `web/src/screens/forms/CPCForm.tsx`
- `web/src/screens/forms/DailyExpensesForm.tsx`
- `web/src/screens/forms/AwarenessSurveyForm.tsx`

**Modified files:**
- `web/src/App.tsx` — add 3 routes (replacing the catch-all hits for those slugs)
- `web/src/screens/app/FormsScreen.tsx` — no changes (rows already wired to `/forms/<slug>`; the catch-all stops being hit for these 3 slugs once their explicit routes exist)

**No new CSS rules.** All three reuse existing classes from `forms.css` and `app.css`.

## Per-form designs

### 1. CPC · Central Planning Committee

**Route:** `/forms/cpc`
**Pillar badge:** `P4`
**Pattern:** BOT-style single-screen roster + inline-add.

**Component anatomy** (mirrors `BOTForm.tsx`):
- `<ResponsiveShell active="forms">`
- `<FormShell title={<>CPC <em>Central Planning</em></>} pillar="P4" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>`
- `<div className="stat-strip">` — `{activeCount}` num · `of {total} active` lbl · `{onLeaveCount} on leave`
- List of `<div className="form-list-row">` — name + (role · zone) + status pill + phone mono
- `<button className="add-toggle">` — toggles inline form
- Inline `<div className="inline-form">` with 7 fields
- `<div className="bot-pad"/>`

**Type:**
```ts
type CPCRecord = {
  id?: string;
  fullName: string;
  role: string;
  zone: string;
  phone: string;
  email: string;
  status: 'active' | 'on-leave' | 'stepped-down';
  notes: string;
};
```

**Fields in inline-add form:**

| Field | Component | Required |
|---|---|---|
| Full name | `TextField` | ✓ |
| Role | `TextField` (placeholder "e.g. Zone Coordinator") | ✓ |
| Zone | `SelectField` (5 zones from existing PCM `ZONES` constant — duplicate or extract; for v1 inline a copy) | ✓ |
| Phone | `PhoneField` | ✓ |
| Email | `TextField` (type=email) | – |
| Status | `SegmentedField` (Active / On leave / Stepped down) | ✓ |
| Notes | `TextareaField` | – |

**`canSave`:** `fullName.trim() && role.trim() && zone && phone.trim() && status`

**Validation:** none beyond `canSave` button gating. No autosave.

**Seed (4 records):**
- "Akua Boateng" / "Zone Coordinator" / Wa Central / +233 24 555 0301 / active
- "Yaw Owusu" / "Logistics Lead" / Wa North / +233 24 555 0302 / active
- "Pst. Daniel Ofori" / "Pastor Liaison" / Wa South / +233 24 555 0303 / active
- "Mary Asante" / "Volunteer Manager" / Wa East / +233 24 555 0304 / on-leave

**Form-list-row status display:** `active → confirmed` class, `on-leave → pending`, `stepped-down → declined` (reusing the existing 3-status colour palette).

### 2. Crusade Daily Expenses

**Route:** `/forms/daily-expenses`
**Pillar badge:** `Budget`
**Pattern:** Hunt-Daily-style date-keyed append log.

**Component anatomy** (mirrors `PCMHuntDailyForm.tsx`):
- `<ResponsiveShell active="forms">`
- `<FormShell title={<>Crusade <em>Daily Expenses</em></>} pillar="Budget" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>`
- `<div className="date-strip">` — 14-day horizontal selector (today first)
- `<div className="stat-strip">` — `{daySpend.toLocaleString()}` num (₵ prefix) · `spent today` lbl · `{dayEntries.length}` entries · static `₵84,000 budget` remainder pill on the right
- List of `<div className="form-list-row">` — vendor + (category · receipt#) + amount mono right + time mono
- "Empty day" placeholder when `dayEntries.length === 0`
- `<button className="add-toggle">` — visible only when `isToday`; toggles inline form
- Inline form with 7 fields (today only)
- `<div className="bot-pad"/>`

**Type:**
```ts
type ExpenseEntry = {
  id?: string;
  date: string;     // YYYY-MM-DD
  time: string;     // HH:MM
  vendor: string;
  category: 'transport' | 'printing' | 'permits' | 'food' | 'venue' | 'materials' | 'other';
  amount: number | '';
  receiptNumber: string;
  approvedBy: string;
  notes: string;
};
```

**Fields in inline-add form:**

| Field | Component | Required |
|---|---|---|
| Time | `DateField` (type='time', defaults to now) | ✓ |
| Vendor / paid to | `TextField` | ✓ |
| Category | `SelectField` (Transport / Printing / Permits / Food / Venue / Materials / Other) | ✓ |
| Amount | `CurrencyField` (₵) | ✓ |
| Receipt # | `TextField` | – |
| Approved by | `TextField` | – |
| Notes | `TextareaField` | – |

**`canAdd`:** `time && vendor.trim() && category && typeof amount === 'number' && amount > 0`

**handleAdd:** enqueue, reset draft (preserving `selectedDate`), KEEP form open (rapid-fire entries during a busy spending day).

**Date helpers:** copy `todayISO()`, `nowHHMM()`, `last14Days()`, `formatDayLabel()` from `PCMHuntDailyForm.tsx` — these are date utilities, not form-specific. **Refactor opportunity** acknowledged: extract to `web/src/lib/dateHelpers.ts` and import in both Hunt Daily and Daily Expenses. Spec choice: extract to `dateHelpers.ts` as part of this work since we now have two consumers.

**Budget total:** Hardcode `₵84,000` for the static "of ₵X budget" reminder. Real budget tracking against a target is out of scope (would need a separate budget config endpoint).

**Seed (3 entries for today):**
- 09:30 / "Wa Stadium permit office" / permits / ₵800 / receipt R-2401 / "Director" / "Stage permit fee"
- 11:15 / "Newprint Press" / printing / ₵320 / receipt R-2402 / "Director" / "500 posters batch 2"
- 14:00 / "Sahel Transport" / transport / ₵140 / receipt R-2403 / "Director" / "PCM hunt day, 4 visits"

### 3. Awareness Survey · Field

**Route:** `/forms/awareness-survey`
**Pillar badge:** `A9`
**Pattern:** New single-page flat survey. Each entry = one respondent.

**Component anatomy:**
- `<ResponsiveShell active="forms">`
- `<FormShell title={<>Awareness <em>Survey</em></>} pillar="A9" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>`
- `<div className="stat-strip">` — `{todayCount}` num · `surveys today` lbl · `{awarenessPct}%` aware (computed live from records)
- List of past surveys (recent 10) — respondent name (or "Anon") + age range · awareness summary
- `<button className="add-toggle">` — "Add survey" / "Cancel"
- Inline survey form (12 fields grouped under 4 subheaders)
- `<div className="bot-pad"/>`

**Type:**
```ts
type SurveyResponse = {
  id?: string;
  date: string;          // YYYY-MM-DD captured at save
  respondentName: string;
  ageRange: '<18' | '18-30' | '31-50' | '51+';
  gender: 'm' | 'f' | 'prefer-not-to-say';
  zone: string;
  religion: 'christian' | 'muslim' | 'traditional' | 'none' | 'other';
  heardOfHJC: 'yes' | 'no' | '';
  heardOfCrusade: 'yes' | 'no' | '';
  channels: string[];     // multi-select via ChecklistField
  planToAttend: 'definitely' | 'maybe' | 'no' | 'unsure' | '';
  bringOthers: number | '';
  concerns: string;
  surveyorNotes: string;
};
```

**Subheader strip styling:** Reuse `.cat-head` from `app.css` (the same grey 10px-uppercase header used in the Forms hub). Each section header sits in `<div className="cat-head"><span>{label}</span></div>` between field groups inside the inline form.

**Field groups & fields:**

#### Subheader: "Respondent"
| Field | Component | Required |
|---|---|---|
| Respondent name | `TextField` (placeholder "Optional") | – |
| Age range | `SegmentedField` (<18 / 18–30 / 31–50 / 51+) | ✓ |
| Gender | `SegmentedField` (M / F / Prefer not to say) | ✓ |
| Zone | `SelectField` (5 zones) | ✓ |
| Religion | `SegmentedField` (Christian / Muslim / Traditional / None / Other) | ✓ |

#### Subheader: "Awareness"
| Field | Component | Required |
|---|---|---|
| Heard of HJC? | `SegmentedField` (Yes / No) | ✓ |
| Heard of upcoming crusade? | `SegmentedField` (Yes / No) | ✓ |
| How did you hear? | `ChecklistField` items: Radio, TV, Social media, Poster, Friend, Church, Other | – |

#### Subheader: "Engagement"
| Field | Component | Required |
|---|---|---|
| Plan to attend? | `SegmentedField` (Definitely / Maybe / No / Unsure) | ✓ |
| Likely to bring others (count) | `NumberField` (suffix "people") | – |
| Concerns / barriers | `TextareaField` | – |

#### Subheader: "Worker observations"
| Field | Component | Required |
|---|---|---|
| Surveyor notes | `TextareaField` | – |

**`canSave`:** all required fields populated (`ageRange && gender && zone && religion && heardOfHJC && heardOfCrusade && planToAttend`).

**handleSave:** enqueue, clear form (preserve nothing — every respondent is fresh), KEEP form open (rapid-fire surveys door-to-door).

**Awareness summary derivation** (for past-surveys list):
- If `heardOfCrusade === 'yes' && planToAttend === 'definitely'` → "Aware · attends"
- If `heardOfCrusade === 'yes' && (planToAttend === 'maybe' || planToAttend === 'unsure')` → "Aware · maybe"
- If `heardOfCrusade === 'yes' && planToAttend === 'no'` → "Aware · not attending"
- If `heardOfCrusade === 'no'` → "Not aware"

**`awarenessPct`:** `Math.round(records.filter(r => r.heardOfCrusade === 'yes').length / records.length * 100)`. Show "—" when records.length === 0.

**Seed (4 records):** A representative sample so the stat strip renders meaningfully on first visit.
- Anon · 18-30 · F · Wa Central · christian · heardOfHJC: yes · heardOfCrusade: yes · channels: [Radio, Friend] · plan: definitely · bringOthers: 3
- "Mr. Issah" · 31-50 · M · Wa North · muslim · heardOfHJC: no · heardOfCrusade: no · plan: unsure
- Anon · 51+ · F · Wa South · christian · heardOfHJC: yes · heardOfCrusade: yes · channels: [Church] · plan: definitely · bringOthers: 5
- "Akosua" · 18-30 · F · Wa East · christian · heardOfHJC: yes · heardOfCrusade: no · plan: maybe

(awareness % from seed: 2 of 4 = 50% aware)

## Date helpers refactor

The two daily-log forms (PCM Hunt Daily, Crusade Daily Expenses) need identical date utilities. Extract them to a shared module to keep DRY.

**New file:** `web/src/lib/dateHelpers.ts`

```ts
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
```

**Modify** `web/src/screens/forms/PCMHuntDailyForm.tsx` to import these helpers from `web/src/lib/dateHelpers.ts` and remove the local copies.

## Routes

Add to `web/src/App.tsx` (BEFORE the `/forms/:slug` catch-all):

```
/forms/cpc                  CPCForm
/forms/awareness-survey     AwarenessSurveyForm
/forms/daily-expenses       DailyExpensesForm
```

The Forms hub rows already point to these slugs — they currently route to `Placeholder` via the catch-all; once the explicit routes exist, the catch-all stops handling those slugs.

## Implementation order (suggested)

1. Extract `dateHelpers.ts` and update `PCMHuntDailyForm.tsx` imports — keeps the refactor isolated.
2. `CPCForm.tsx` (BOT clone with new fields) + route.
3. `DailyExpensesForm.tsx` (Hunt Daily clone with new fields, using shared dateHelpers) + route.
4. `AwarenessSurveyForm.tsx` (new pattern — single-page flat survey with cat-head subheaders) + route.
5. Manual sweep at phone (393), tablet (820), desktop (1280) widths.

## Non-goals (explicitly out of scope)

- Real Laravel API endpoints (still localStorage).
- Branching survey logic — `showIf` predicates not built in this phase.
- Real budget tracking against a target (Daily Expenses shows static ₵84k as the "of X" reminder).
- Editing prior records (CPC / past-day expenses / past surveys all read-only after save).
- Multi-select fields beyond `ChecklistField` (already exists).
- Survey export, expense export, CPC roster CSV — none in scope.
- GPS / location stamping on surveys.
- Photo / receipt-image upload on Daily Expenses.
- Real-time collaborative editing (single-device).

## Open follow-ups (post-implementation)

- Wire `submitQueue` to real Laravel endpoints.
- Build the remaining 7 hub-listed forms (Fathers of the Land, Worker Groups, PPPPPPPAVEDDD Town Name, Publicity & Video Campaign, Venue Inspection, Must-Do Checklist) plus the ~23 additional forms not yet in the hub.
- Branching survey logic (when a 2nd survey form actually needs it).
- Real budget tracking + variance against target on Daily Expenses.
- Edit-prior-day support across both daily-log forms.
- Survey aggregation dashboard / awareness chart on Mission Control.
