# Form-Fill Trio #2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the next three form-fill screens (CPC roster, Crusade Daily Expenses, Awareness Survey) plus a small refactor extracting shared date helpers.

**Architecture:** CPC reuses the BOT pattern (single-screen list + inline-add). Crusade Daily Expenses reuses the PCM Hunt Daily pattern (date-keyed append log). Both reuse `FormShell`, `fields.tsx`, `submitQueue`. Awareness Survey is a new shape — single-page flat survey grouped under `.cat-head` subheaders, optimised for door-to-door rapid-fire data capture. Date helpers (`todayISO`, `nowHHMM`, `last14Days`, `formatDayLabel`) are extracted from `PCMHuntDailyForm.tsx` to `web/src/lib/dateHelpers.ts` since two forms now need them.

**Tech Stack:** React 19, TypeScript, Vite 8, React Router 7. No test framework — verification is `tsc --noEmit` + `npm run build` + manual viewport check at 393px / 820px / 1280px.

**Spec:** `docs/superpowers/specs/2026-05-01-form-fill-trio-2-design.md`

**Conventions:**
- All paths relative to `/Users/adebimpegodwin/Projects/hjc`.
- All `npm`/`npx` commands from `web/`.
- Each task ends with a clean commit (no working-tree leakage from pre-existing dirty files — defensive `git restore --staged .` before staging this task's files).

---

## Task 1: Extract `dateHelpers.ts`, update `PCMHuntDailyForm.tsx`

Pure refactor. The four date helper functions currently live inline in `PCMHuntDailyForm.tsx`. Move them to a shared lib file so the new `DailyExpensesForm.tsx` can import them too. No behavior change.

**Files:**
- Create: `web/src/lib/dateHelpers.ts`
- Modify: `web/src/screens/forms/PCMHuntDailyForm.tsx` — remove local helpers, import from new module

- [ ] **Step 1: Create `dateHelpers.ts`**

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

- [ ] **Step 2: Update `PCMHuntDailyForm.tsx`**

In `web/src/screens/forms/PCMHuntDailyForm.tsx`:

a. Add the import at the top of the file (alongside the other lib imports):

```tsx
import { todayISO, nowHHMM, last14Days, formatDayLabel } from '../../lib/dateHelpers';
```

b. **Delete** the four local function declarations (`todayISO`, `nowHHMM`, `last14Days`, `formatDayLabel`). They're around lines 30–60 in the current file. Don't leave dead exports.

The rest of the file is unchanged — it already calls `todayISO()`, `nowHHMM()`, `last14Days()`, and `formatDayLabel()`, so the import provides identical bindings.

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/lib/dateHelpers.ts web/src/screens/forms/PCMHuntDailyForm.tsx
git diff --cached --stat
# Expected: ONLY the 2 files

git commit -m "$(cat <<'EOF'
refactor(web): extract date helpers to lib/dateHelpers.ts

Pure refactor in preparation for DailyExpensesForm, which needs the
same todayISO / nowHHMM / last14Days / formatDayLabel helpers.
Removes the local copies from PCMHuntDailyForm.tsx and imports them
from the new shared module. No behavior change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If `git diff --cached --stat` shows files outside `web/src/lib/dateHelpers.ts` and `web/src/screens/forms/PCMHuntDailyForm.tsx`, STOP and report NEEDS_CONTEXT.

---

## Task 2: CPC roster form

BOT-pattern roster + inline-add. Replaces the `Placeholder` currently served by `/forms/:slug` for the `cpc` slug.

**Files:**
- Create: `web/src/screens/forms/CPCForm.tsx`
- Modify: `web/src/App.tsx` — add `/forms/cpc` route

- [ ] **Step 1: Create `CPCForm.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, SelectField, TextareaField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import './forms.css';

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

const FORM_SLUG = 'cpc';

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const SEED: CPCRecord[] = [
  { fullName: 'Akua Boateng', role: 'Zone Coordinator', zone: 'wa-central', phone: '+233 24 555 0301', email: '', status: 'active', notes: '' },
  { fullName: 'Yaw Owusu', role: 'Logistics Lead', zone: 'wa-north', phone: '+233 24 555 0302', email: '', status: 'active', notes: '' },
  { fullName: 'Pst. Daniel Ofori', role: 'Pastor Liaison', zone: 'wa-south', phone: '+233 24 555 0303', email: '', status: 'active', notes: '' },
  { fullName: 'Mary Asante', role: 'Volunteer Manager', zone: 'wa-east', phone: '+233 24 555 0304', email: '', status: 'on-leave', notes: '' },
];

const STATUS_CLASS: Record<CPCRecord['status'], string> = {
  active: 'confirmed',
  'on-leave': 'pending',
  'stepped-down': 'declined',
};

const STATUS_LABEL: Record<CPCRecord['status'], string> = {
  active: 'active',
  'on-leave': 'on leave',
  'stepped-down': 'stepped down',
};

const emptyForm: CPCRecord = {
  fullName: '', role: '', zone: '', phone: '', email: '', status: 'active', notes: '',
};

export function CPCForm() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<CPCRecord[]>(() => {
    const stored = getRecords<CPCRecord>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<CPCRecord>(emptyForm);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<CPCRecord>(FORM_SLUG);
      if (stored.length > 0) setMembers(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const canSave =
    draft.fullName.trim() !== '' &&
    draft.role.trim() !== '' &&
    draft.zone !== '' &&
    draft.phone.trim() !== '' &&
    draft.status !== ('' as CPCRecord['status']);

  const handleSave = () => {
    enqueue<CPCRecord>(FORM_SLUG, draft);
    setDraft(emptyForm);
    setShowForm(false);
  };

  const activeCount = members.filter((m) => m.status === 'active').length;
  const onLeaveCount = members.filter((m) => m.status === 'on-leave').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>CPC <em>Central Planning</em></>}
        pillar="P4"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{activeCount}</div>
            <div className="lbl">of {members.length} active</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{onLeaveCount}</b> on leave</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {members.map((m, i) => {
            const zoneLabel = ZONES.find((z) => z.value === m.zone)?.label ?? m.zone;
            return (
              <div key={m.id ?? `${m.fullName}-${i}`} className="form-list-row">
                <div>
                  <div className="name">{m.fullName}</div>
                  <div className="sub">{m.role} · {zoneLabel}</div>
                </div>
                <div className="right">
                  <div className={'status ' + STATUS_CLASS[m.status]}>{STATUS_LABEL[m.status]}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{m.phone}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add CPC member'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Full name" value={draft.fullName} onChange={(v) => setDraft({ ...draft, fullName: v })} required/>
              <TextField label="Role" placeholder="e.g. Zone Coordinator" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
              <SelectField label="Zone" required options={ZONES} value={draft.zone} onChange={(v) => setDraft({ ...draft, zone: v })} placeholder="Select zone…"/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} required/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
              <SegmentedField
                label="Status"
                required
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'on-leave', label: 'On leave' },
                  { value: 'stepped-down', label: 'Stepped down' },
                ]}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as CPCRecord['status'] })}
              />
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyForm); setShowForm(false); }}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>Save member</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Add `/forms/cpc` route to `App.tsx`**

In `web/src/App.tsx`:

a. Add the import alongside the other form imports:

```tsx
import { CPCForm } from './screens/forms/CPCForm';
```

b. Add the route in the form-routes block, BEFORE the `/forms/:slug` catch-all:

```tsx
<Route path="/forms/cpc" element={<RequireAuth><CPCForm /></RequireAuth>} />
```

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/CPCForm.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY CPCForm.tsx and App.tsx

git commit -m "$(cat <<'EOF'
feat(web): CPC roster form (BOT-pattern, P4)

Single-screen list of CPC members + inline-add at /forms/cpc.
Fields: name, role, zone (5 zones), phone, email, status
(active/on-leave/stepped-down), notes. Seeded with 4 mock members.
Reuses FormShell + field components + submitQueue.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If `git diff --cached --stat` shows files outside CPCForm.tsx + App.tsx, STOP and report NEEDS_CONTEXT.

---

## Task 3: Crusade Daily Expenses form

PCM Hunt Daily-pattern date-keyed append log. Replaces the `Placeholder` for the `daily-expenses` slug.

**Files:**
- Create: `web/src/screens/forms/DailyExpensesForm.tsx`
- Modify: `web/src/App.tsx` — add `/forms/daily-expenses` route

- [ ] **Step 1: Create `DailyExpensesForm.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SelectField, CurrencyField, DateField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import { todayISO, nowHHMM, last14Days, formatDayLabel } from '../../lib/dateHelpers';
import './forms.css';

type ExpenseEntry = {
  id?: string;
  date: string;
  time: string;
  vendor: string;
  category: 'transport' | 'printing' | 'permits' | 'food' | 'venue' | 'materials' | 'other';
  amount: number | '';
  receiptNumber: string;
  approvedBy: string;
  notes: string;
};

const FORM_SLUG = 'daily-expenses';

const CATEGORIES = [
  { value: 'transport', label: 'Transport' },
  { value: 'printing', label: 'Printing' },
  { value: 'permits', label: 'Permits' },
  { value: 'food', label: 'Food' },
  { value: 'venue', label: 'Venue' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

const STATIC_BUDGET = 84000;

const SEED: ExpenseEntry[] = [
  { date: todayISO(), time: '09:30', vendor: 'Wa Stadium permit office', category: 'permits', amount: 800, receiptNumber: 'R-2401', approvedBy: 'Director', notes: 'Stage permit fee' },
  { date: todayISO(), time: '11:15', vendor: 'Newprint Press', category: 'printing', amount: 320, receiptNumber: 'R-2402', approvedBy: 'Director', notes: '500 posters batch 2' },
  { date: todayISO(), time: '14:00', vendor: 'Sahel Transport', category: 'transport', amount: 140, receiptNumber: 'R-2403', approvedBy: 'Director', notes: 'PCM hunt day, 4 visits' },
];

const emptyEntry = (date: string): ExpenseEntry => ({
  date,
  time: nowHHMM(),
  vendor: '',
  category: 'transport',
  amount: '',
  receiptNumber: '',
  approvedBy: '',
  notes: '',
});

export function DailyExpensesForm() {
  const navigate = useNavigate();
  const [allEntries, setAllEntries] = useState<ExpenseEntry[]>(() => {
    const stored = getRecords<ExpenseEntry>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<ExpenseEntry>(emptyEntry(todayISO()));

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<ExpenseEntry>(FORM_SLUG);
      if (stored.length > 0) setAllEntries(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const dayEntries = useMemo(
    () => allEntries
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => b.time.localeCompare(a.time)),
    [allEntries, selectedDate],
  );

  const daySpend = dayEntries.reduce(
    (sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0),
    0,
  );
  const totalSpend = allEntries.reduce(
    (sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0),
    0,
  );
  const budgetRemaining = STATIC_BUDGET - totalSpend;

  const canAdd =
    draft.time !== '' &&
    draft.vendor.trim() !== '' &&
    typeof draft.amount === 'number' &&
    draft.amount > 0;

  const handleAdd = () => {
    enqueue<ExpenseEntry>(FORM_SLUG, draft);
    setDraft(emptyEntry(selectedDate));
    // Keep form open for rapid-fire entries.
  };

  const days = last14Days();
  const isToday = selectedDate === todayISO();

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Crusade <em>Daily Expenses</em></>}
        pillar="Budget"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="date-strip">
          {days.map((iso) => {
            const { dow, dnum } = formatDayLabel(iso);
            return (
              <button
                type="button"
                key={iso}
                className={'day' + (selectedDate === iso ? ' on' : '')}
                onClick={() => {
                  setSelectedDate(iso);
                  setDraft((d) => ({ ...d, date: iso }));
                }}
              >
                <span className="dow">{dow}</span>
                <span className="dnum">{dnum}</span>
              </button>
            );
          })}
        </div>

        <div className="stat-strip">
          <div>
            <div className="num">₵{daySpend.toLocaleString()}</div>
            <div className="lbl">spent {isToday ? 'today' : 'this day'}</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{dayEntries.length}</b> entries · <b>₵{budgetRemaining.toLocaleString()}</b> of ₵{STATIC_BUDGET.toLocaleString()} left</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {dayEntries.length === 0 && (
            <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              No expenses logged for this day.
            </div>
          )}
          {dayEntries.map((e, i) => {
            const categoryLabel = CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category;
            return (
              <div key={e.id ?? `${e.time}-${i}`} className="form-list-row">
                <div>
                  <div className="name">{e.vendor}</div>
                  <div className="sub">{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</div>
                </div>
                <div className="right">
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    ₵{typeof e.amount === 'number' ? e.amount.toLocaleString() : '—'}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{e.time}</div>
                </div>
              </div>
            );
          })}
        </div>

        {isToday && (
          <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'Log expense'}
          </button>
        )}

        {showForm && isToday && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Time" type="time" value={draft.time} onChange={(v) => setDraft({ ...draft, time: v })} required/>
              <TextField label="Vendor / paid to" value={draft.vendor} onChange={(v) => setDraft({ ...draft, vendor: v })} required/>
              <SelectField
                label="Category"
                required
                options={CATEGORIES}
                value={draft.category}
                onChange={(v) => setDraft({ ...draft, category: v as ExpenseEntry['category'] })}
              />
              <CurrencyField label="Amount" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} required/>
              <TextField label="Receipt #" value={draft.receiptNumber} onChange={(v) => setDraft({ ...draft, receiptNumber: v })}/>
              <TextField label="Approved by" value={draft.approvedBy} onChange={(v) => setDraft({ ...draft, approvedBy: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => setDraft(emptyEntry(selectedDate))}>Clear</button>
              <button type="button" className="btn primary" onClick={handleAdd} disabled={!canAdd}>Add expense</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Add `/forms/daily-expenses` route to `App.tsx`**

In `web/src/App.tsx`:

a. Add the import:

```tsx
import { DailyExpensesForm } from './screens/forms/DailyExpensesForm';
```

b. Add the route alongside `/forms/cpc`, BEFORE the `/forms/:slug` catch-all:

```tsx
<Route path="/forms/daily-expenses" element={<RequireAuth><DailyExpensesForm /></RequireAuth>} />
```

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/DailyExpensesForm.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY DailyExpensesForm.tsx and App.tsx

git commit -m "$(cat <<'EOF'
feat(web): Crusade Daily Expenses form (date-keyed append log, Budget)

Per-day ledger of crusade spending at /forms/daily-expenses.
14-day date strip + day rollup (₵ spent, entry count, ₵ budget
remaining against static ₵84k target). Inline expense form on
today only — past days read-only. Each entry enqueued
independently; form stays open after add for rapid-fire logging.

Reuses FormShell + dateHelpers + field components.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If `git diff --cached --stat` shows files outside DailyExpensesForm.tsx + App.tsx, STOP and report NEEDS_CONTEXT.

---

## Task 4: Awareness Survey form

The new shape — single-page flat survey with 4 grouped sections. Each "entry" = one respondent surveyed. The form stays open after save for rapid-fire door-to-door capture.

**Files:**
- Create: `web/src/screens/forms/AwarenessSurveyForm.tsx`
- Modify: `web/src/App.tsx` — add `/forms/awareness-survey` route

- [ ] **Step 1: Create `AwarenessSurveyForm.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SegmentedField, SelectField, ChecklistField, NumberField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import { todayISO } from '../../lib/dateHelpers';
import './forms.css';

type SurveyResponse = {
  id?: string;
  date: string;
  respondentName: string;
  ageRange: '<18' | '18-30' | '31-50' | '51+' | '';
  gender: 'm' | 'f' | 'prefer-not-to-say' | '';
  zone: string;
  religion: 'christian' | 'muslim' | 'traditional' | 'none' | 'other' | '';
  heardOfHJC: 'yes' | 'no' | '';
  heardOfCrusade: 'yes' | 'no' | '';
  channels: string[];
  planToAttend: 'definitely' | 'maybe' | 'no' | 'unsure' | '';
  bringOthers: number | '';
  concerns: string;
  surveyorNotes: string;
};

const FORM_SLUG = 'awareness-survey';

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const CHANNELS = ['Radio', 'TV', 'Social media', 'Poster', 'Friend', 'Church', 'Other'];

const SEED: SurveyResponse[] = [
  { date: todayISO(), respondentName: '', ageRange: '18-30', gender: 'f', zone: 'wa-central', religion: 'christian', heardOfHJC: 'yes', heardOfCrusade: 'yes', channels: ['Radio', 'Friend'], planToAttend: 'definitely', bringOthers: 3, concerns: '', surveyorNotes: '' },
  { date: todayISO(), respondentName: 'Mr. Issah', ageRange: '31-50', gender: 'm', zone: 'wa-north', religion: 'muslim', heardOfHJC: 'no', heardOfCrusade: 'no', channels: [], planToAttend: 'unsure', bringOthers: '', concerns: '', surveyorNotes: '' },
  { date: todayISO(), respondentName: '', ageRange: '51+', gender: 'f', zone: 'wa-south', religion: 'christian', heardOfHJC: 'yes', heardOfCrusade: 'yes', channels: ['Church'], planToAttend: 'definitely', bringOthers: 5, concerns: '', surveyorNotes: '' },
  { date: todayISO(), respondentName: 'Akosua', ageRange: '18-30', gender: 'f', zone: 'wa-east', religion: 'christian', heardOfHJC: 'yes', heardOfCrusade: 'no', channels: [], planToAttend: 'maybe', bringOthers: '', concerns: '', surveyorNotes: '' },
];

const emptyResponse = (): SurveyResponse => ({
  date: todayISO(),
  respondentName: '',
  ageRange: '',
  gender: '',
  zone: '',
  religion: '',
  heardOfHJC: '',
  heardOfCrusade: '',
  channels: [],
  planToAttend: '',
  bringOthers: '',
  concerns: '',
  surveyorNotes: '',
});

function awarenessSummary(r: SurveyResponse): string {
  if (r.heardOfCrusade === 'yes' && r.planToAttend === 'definitely') return 'Aware · attends';
  if (r.heardOfCrusade === 'yes' && (r.planToAttend === 'maybe' || r.planToAttend === 'unsure')) return 'Aware · maybe';
  if (r.heardOfCrusade === 'yes' && r.planToAttend === 'no') return 'Aware · not attending';
  if (r.heardOfCrusade === 'no') return 'Not aware';
  return '—';
}

export function AwarenessSurveyForm() {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<SurveyResponse[]>(() => {
    const stored = getRecords<SurveyResponse>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<SurveyResponse>(emptyResponse());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<SurveyResponse>(FORM_SLUG);
      if (stored.length > 0) setResponses(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const todayCount = responses.filter((r) => r.date === todayISO()).length;
  const awarenessPct = responses.length > 0
    ? Math.round(responses.filter((r) => r.heardOfCrusade === 'yes').length / responses.length * 100)
    : 0;

  const canSave =
    draft.ageRange !== '' &&
    draft.gender !== '' &&
    draft.zone !== '' &&
    draft.religion !== '' &&
    draft.heardOfHJC !== '' &&
    draft.heardOfCrusade !== '' &&
    draft.planToAttend !== '';

  const handleSave = () => {
    enqueue<SurveyResponse>(FORM_SLUG, { ...draft, date: todayISO() });
    setDraft(emptyResponse());
    // Keep form open for rapid-fire surveys.
  };

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Awareness <em>Survey</em></>}
        pillar="A9"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{todayCount}</div>
            <div className="lbl">surveys today</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{responses.length > 0 ? `${awarenessPct}%` : '—'}</b> aware overall</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {responses.slice(0, 10).map((r, i) => (
            <div key={r.id ?? `${r.respondentName}-${i}`} className="form-list-row">
              <div>
                <div className="name">{r.respondentName.trim() || 'Anon'}</div>
                <div className="sub">{r.ageRange || '—'} · {awarenessSummary(r)}</div>
              </div>
              <div className="right">
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{r.zone || '—'}</div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add survey'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="cat-head" style={{ padding: '8px 0', marginBottom: 4 }}>
              <span>Respondent</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Respondent name" placeholder="Optional" value={draft.respondentName} onChange={(v) => setDraft({ ...draft, respondentName: v })}/>
              <SegmentedField
                label="Age range"
                required
                options={[
                  { value: '<18', label: '<18' },
                  { value: '18-30', label: '18–30' },
                  { value: '31-50', label: '31–50' },
                  { value: '51+', label: '51+' },
                ]}
                value={draft.ageRange}
                onChange={(v) => setDraft({ ...draft, ageRange: v as SurveyResponse['ageRange'] })}
              />
              <SegmentedField
                label="Gender"
                required
                options={[
                  { value: 'm', label: 'M' },
                  { value: 'f', label: 'F' },
                  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                ]}
                value={draft.gender}
                onChange={(v) => setDraft({ ...draft, gender: v as SurveyResponse['gender'] })}
              />
              <SelectField label="Zone" required options={ZONES} value={draft.zone} onChange={(v) => setDraft({ ...draft, zone: v })} placeholder="Select zone…"/>
              <SegmentedField
                label="Religion"
                required
                options={[
                  { value: 'christian', label: 'Christian' },
                  { value: 'muslim', label: 'Muslim' },
                  { value: 'traditional', label: 'Traditional' },
                  { value: 'none', label: 'None' },
                  { value: 'other', label: 'Other' },
                ]}
                value={draft.religion}
                onChange={(v) => setDraft({ ...draft, religion: v as SurveyResponse['religion'] })}
              />
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Awareness</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <SegmentedField
                label="Heard of HJC?"
                required
                options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                value={draft.heardOfHJC}
                onChange={(v) => setDraft({ ...draft, heardOfHJC: v as SurveyResponse['heardOfHJC'] })}
              />
              <SegmentedField
                label="Heard of upcoming crusade?"
                required
                options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                value={draft.heardOfCrusade}
                onChange={(v) => setDraft({ ...draft, heardOfCrusade: v as SurveyResponse['heardOfCrusade'] })}
              />
              <ChecklistField
                label="How did you hear?"
                items={CHANNELS}
                value={draft.channels}
                onChange={(v) => setDraft({ ...draft, channels: v })}
              />
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Engagement</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <SegmentedField
                label="Plan to attend?"
                required
                options={[
                  { value: 'definitely', label: 'Definitely' },
                  { value: 'maybe', label: 'Maybe' },
                  { value: 'no', label: 'No' },
                  { value: 'unsure', label: 'Unsure' },
                ]}
                value={draft.planToAttend}
                onChange={(v) => setDraft({ ...draft, planToAttend: v as SurveyResponse['planToAttend'] })}
              />
              <NumberField label="Likely to bring others" suffix="people" value={draft.bringOthers} onChange={(v) => setDraft({ ...draft, bringOthers: v })}/>
              <TextareaField label="Concerns / barriers" value={draft.concerns} onChange={(v) => setDraft({ ...draft, concerns: v })}/>
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Worker observations</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <TextareaField label="Surveyor notes" value={draft.surveyorNotes} onChange={(v) => setDraft({ ...draft, surveyorNotes: v })}/>
            </div>

            <div className="row">
              <button type="button" className="btn" onClick={() => setDraft(emptyResponse())}>Clear</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>Save survey</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Add `/forms/awareness-survey` route to `App.tsx`**

In `web/src/App.tsx`:

a. Add the import:

```tsx
import { AwarenessSurveyForm } from './screens/forms/AwarenessSurveyForm';
```

b. Add the route alongside the other form routes, BEFORE the `/forms/:slug` catch-all:

```tsx
<Route path="/forms/awareness-survey" element={<RequireAuth><AwarenessSurveyForm /></RequireAuth>} />
```

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/AwarenessSurveyForm.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY AwarenessSurveyForm.tsx and App.tsx

git commit -m "$(cat <<'EOF'
feat(web): Awareness Survey form (single-page flat survey, A9)

Door-to-door respondent survey at /forms/awareness-survey.
12 fields grouped under 4 .cat-head subheaders (Respondent /
Awareness / Engagement / Worker observations). Stat strip shows
"N surveys today · X% aware overall" computed live from records.
Form stays open after save for rapid-fire capture between doors.
Past surveys list shows respondent + age + awareness summary.

Reuses FormShell + field components + submitQueue. Seeded with
4 mock responses to make the awareness % render meaningfully on
first visit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If `git diff --cached --stat` shows files outside AwarenessSurveyForm.tsx + App.tsx, STOP and report NEEDS_CONTEXT.

---

## Task 5: Final manual sweep

No code changes. Confirm the three new forms work end-to-end at three viewport widths.

- [ ] **Step 1: Verify build is clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npm run build
# Expected: success
```

- [ ] **Step 2: Open `http://localhost:5173/forms` and click each row**

| Row | Expected destination |
|---|---|
| PCM (existing) | `/forms/pcm` — list with seed PCMs |
| BOT (existing) | `/forms/bot` — list with seed trustees |
| **CPC (Central Planning)** | `/forms/cpc` — list with 4 seed members + "Add CPC member" toggle |
| Worker Groups | Placeholder |
| PCM Hunt Daily Activity (existing) | `/forms/pcm-hunt-daily` |
| **Awareness Survey · Field** | `/forms/awareness-survey` — list with 4 seed responses + "Add survey" toggle |
| **Crusade Daily Expenses** | `/forms/daily-expenses` — date strip + 3 seed entries today + "Log expense" toggle |
| Weekly Assessment Rating | `/weekly` (existing screen) |

- [ ] **Step 3: CPC happy path**

1. `/forms/cpc` → "Add CPC member".
2. Fill name "Test Member", role "Test", zone "Wa Central", phone "+233 24 555 9999". Status defaults to Active.
3. Click "Save member". Form collapses; new member appears at top of list within ~1s (after simulated round-trip).
4. Refresh. Member persists.

- [ ] **Step 4: Daily Expenses happy path**

1. `/forms/daily-expenses` → today is selected, 3 seed entries visible, stat strip shows "₵1,260 spent today" and budget remaining.
2. Click "Log expense".
3. Time defaults to now. Fill vendor "Test Vendor", category "Food", amount "100".
4. Click "Add expense". New entry appears at top within ~1s. Form clears but stays open.
5. Click a prior day in the date strip. Empty state shows. "Log expense" button hidden (read-only).
6. Click today again. Entries return.

- [ ] **Step 5: Awareness Survey happy path**

1. `/forms/awareness-survey` → stat strip shows "0 surveys today" and "50% aware overall" (from 4 seeds, 2 of which are aware).
2. Click "Add survey".
3. Fill: age 18–30, gender F, zone Wa Central, religion Christian, Heard HJC Yes, Heard Crusade Yes, channels [Radio], plan Definitely.
4. Click "Save survey". New survey appears at top within ~1s. Form clears but stays open. Stat strip updates.
5. Repeat with all-No-aware response. Verify the awareness % drops accordingly.

- [ ] **Step 6: Three-viewport check**

DevTools → device toolbar → swap between iPhone 14 (393×852), iPad (820×1180), and laptop (1280×800). Each new form should:
- Phone: single column, sticky action bar at bottom of `.phone`, `.scroll` scrolls internally.
- Tablet: same as phone, more breathing room.
- Desktop: sidebar on the left, content centered with max-width 760px (from forms.css media query).

- [ ] **Step 7: If anything breaks**

Open `/Users/adebimpegodwin/Projects/hjc/docs/superpowers/specs/2026-05-01-form-fill-trio-2-design.md` for the source-of-truth design. File a follow-up commit if a small fix is needed.

---

## Self-Review Notes

**Spec coverage:**
- Date helpers refactor → Task 1
- CPC form spec → Task 2
- Daily Expenses form spec → Task 3
- Awareness Survey form spec → Task 4
- Routes for all 3 → Tasks 2, 3, 4 (each adds its own)
- Seeds, status maps, ZONES, CATEGORIES, awareness summary — all implemented inline in their respective forms
- Manual sweep → Task 5

**Type consistency:**
- `CPCRecord`, `ExpenseEntry`, `SurveyResponse` are local to their respective files (no cross-form consumers).
- Each uses the `'' | <enum>` pattern for selects so the `canSave` check can identify "not yet selected".
- `STATIC_BUDGET = 84000` matches the spec.
- Date helpers `todayISO`/`nowHHMM`/`last14Days`/`formatDayLabel` exported from `dateHelpers.ts` are imported (not redefined) in both `PCMHuntDailyForm.tsx` (via Task 1) and `DailyExpensesForm.tsx` (via Task 3).

**Known minor (acknowledged in spec):**
- Daily Expenses budget tracking uses static ₵84,000 — real budget config endpoint is a follow-up.
- Awareness Survey is flat (no branching `showIf` logic).
- Past records read-only across all 3 forms (no edit screens).
- Awareness summary derivation is centralized in `awarenessSummary(r)` for reuse if needed later.
