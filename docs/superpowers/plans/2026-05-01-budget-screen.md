# Budget Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only spend dashboard at `/budget` that rolls up the existing Daily Expenses records into one editorial screen, plus wire the Sidebar/Drawer "Budget" items so they actually navigate.

**Architecture:** New `BudgetScreen` component reads `getRecords<ExpenseEntry>('daily-expenses')` from the existing `submitQueue` localStorage layer and subscribes for live updates. Renders four sections inside `<ResponsiveShell active="home">`: editorial page header, hero stat-strip (reusing Home's `.composite` block), category breakdown bar list (reusing the at-risk-pillars pattern), and a "5 latest" transactions list (reusing the `.form-list-row` pattern). Aggregations are pure-function `useMemo`s. Bundled small fix: convert the inert "Budget" `<div>` items in `Sidebar.tsx` and `Shell.tsx`'s Drawer to navigating `<button>` elements.

**Tech Stack:** React 19, TypeScript, Vite 8, React Router 7. No test framework — verification is `tsc --noEmit` + `npm run build` + manual viewport check at 393px / 820px / 1280px.

**Spec:** `docs/superpowers/specs/2026-05-01-budget-screen-design.md`

**Conventions:**
- All paths relative to `/Users/adebimpegodwin/Projects/hjc`.
- All `npm`/`npx` commands from `web/`.
- Each task ends with a clean commit (defensive `git restore --staged .` before staging this task's files — the working tree has pre-existing dirty files we don't want to capture).

---

## Task 1: BudgetScreen + route swap

Build the dashboard component and route `/budget` to it (replacing the existing `Placeholder`).

**Files:**
- Create: `web/src/screens/app/BudgetScreen.tsx`
- Modify: `web/src/App.tsx` — swap `/budget` route from `<Placeholder title="Budget" />` to `<BudgetScreen />`

- [ ] **Step 1: Create `BudgetScreen.tsx`**

Create the file at `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/BudgetScreen.tsx` with this EXACT content:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { getRecords, subscribe } from '../../lib/submitQueue';
import './app.css';

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
const STATIC_BUDGET = 84000;

const CATEGORIES: Array<{ value: ExpenseEntry['category']; label: string }> = [
  { value: 'transport', label: 'Transport' },
  { value: 'printing', label: 'Printing' },
  { value: 'permits', label: 'Permits' },
  { value: 'food', label: 'Food' },
  { value: 'venue', label: 'Venue' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

const LETTER_FOR_CATEGORY: Record<ExpenseEntry['category'], string> = {
  transport: 'T',
  printing: 'P',
  permits: 'R',
  food: 'F',
  venue: 'V',
  materials: 'M',
  other: 'O',
};

function formatRelativeDate(iso: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'today';
  if (iso === yest) return 'yest';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function BudgetScreen() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [allEntries, setAllEntries] = useState<ExpenseEntry[]>(() =>
    getRecords<ExpenseEntry>(FORM_SLUG),
  );

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setAllEntries(getRecords<ExpenseEntry>(FORM_SLUG));
    });
    return () => { unsubscribe(); };
  }, []);

  const totalSpent = useMemo(
    () => allEntries.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0),
    [allEntries],
  );

  const sumByCategory = useMemo(() => {
    const sums: Record<ExpenseEntry['category'], number> = {
      transport: 0, printing: 0, permits: 0, food: 0, venue: 0, materials: 0, other: 0,
    };
    for (const e of allEntries) {
      if (typeof e.amount === 'number') sums[e.category] += e.amount;
    }
    return sums;
  }, [allEntries]);

  const categoriesWithSpend = useMemo(
    () =>
      CATEGORIES
        .map((c) => ({ ...c, amount: sumByCategory[c.value] }))
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [sumByCategory],
  );

  const maxCategoryAmount = useMemo(
    () => Math.max(0, ...categoriesWithSpend.map((c) => c.amount)),
    [categoriesWithSpend],
  );

  const recent = useMemo(
    () =>
      [...allEntries]
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.time.localeCompare(a.time);
        })
        .slice(0, 5),
    [allEntries],
  );

  const overBudget = totalSpent > STATIC_BUDGET;
  const remainingOrOver = overBudget
    ? `₵${(totalSpent - STATIC_BUDGET).toLocaleString()} over`
    : `₵${(STATIC_BUDGET - totalSpent).toLocaleString()} left`;

  const isEmpty = allEntries.length === 0;

  return (
    <ResponsiveShell active="home">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div style={{ padding: '20px 20px 0' }}>
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
            Budget · advance work
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Spend.
          </h1>
        </div>

        <div className="composite">
          <div className="label">Total spent · all-time</div>
          <div className="row">
            <div className="num serif">₵{totalSpent.toLocaleString()}</div>
            <div className="delta">
              <b>{remainingOrOver}</b>
              of ₵{STATIC_BUDGET.toLocaleString()} budget
            </div>
          </div>
          <div className="track">
            <i style={{ width: `${Math.min(100, (totalSpent / STATIC_BUDGET) * 100)}%` }}/>
          </div>
        </div>

        <div className="sec">
          <h2 className="serif">Spend by <em>category</em></h2>
          <span className="more">{categoriesWithSpend.length} categories</span>
        </div>

        {isEmpty ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
            No expenses logged yet.
            <button
              type="button"
              onClick={() => navigate('/forms/daily-expenses')}
              style={{
                display: 'block',
                margin: '12px auto 0',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 999,
                border: '1px solid var(--ink)',
                background: 'var(--ink)',
                color: 'var(--bg)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Log first expense →
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 20px' }}>
            {categoriesWithSpend.map((cat) => {
              const isDominating = totalSpent > 0 && cat.amount / totalSpent > 0.25;
              return (
                <div
                  key={cat.value}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr auto',
                    gap: 12,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--line)',
                    alignItems: 'center',
                  }}
                >
                  <span
                    className="serif"
                    style={{ fontSize: 18, color: 'var(--ink-3)', lineHeight: 1 }}
                  >
                    {LETTER_FOR_CATEGORY[cat.value]}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
                      {cat.label}
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: 'var(--bg-2)',
                        position: 'relative',
                      }}
                    >
                      <i
                        style={{
                          position: 'absolute',
                          left: 0, top: 0, bottom: 0,
                          width: `${maxCategoryAmount > 0 ? (cat.amount / maxCategoryAmount) * 100 : 0}%`,
                          background: isDominating ? 'var(--accent)' : 'var(--ink)',
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="serif"
                    style={{
                      fontSize: 22,
                      fontWeight: 300,
                      color: 'var(--ink)',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    ₵{cat.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!isEmpty && (
          <>
            <div className="sec">
              <h2 className="serif">Recent <em>· 5 latest</em></h2>
              <span className="more">{allEntries.length} total</span>
            </div>

            <div style={{ padding: '0 20px' }}>
              {recent.map((e, i) => {
                const categoryLabel = CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category;
                return (
                  <div key={e.id ?? `${e.date}-${e.time}-${i}`} className="form-list-row">
                    <div>
                      <div className="name">{e.vendor}</div>
                      <div className="sub">{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</div>
                    </div>
                    <div className="right">
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        ₵{typeof e.amount === 'number' ? e.amount.toLocaleString() : '—'}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>
                        {e.time} · {formatRelativeDate(e.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate('/forms/daily-expenses')}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 20px',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: 0,
                borderTop: '1px solid var(--line)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              View all expenses →
            </button>
          </>
        )}

        <div className="bot-pad"/>
      </div>
      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Update `/budget` route in `App.tsx`**

In `web/src/App.tsx`:

a. Add this import alongside the other screen imports (near the top of the file, after the existing imports):

```tsx
import { BudgetScreen } from './screens/app/BudgetScreen';
```

b. Find the existing `/budget` route — currently:

```tsx
<Route path="/budget" element={<RequireAuth><Placeholder title="Budget" /></RequireAuth>} />
```

Replace it with:

```tsx
<Route path="/budget" element={<RequireAuth><BudgetScreen /></RequireAuth>} />
```

The `Placeholder` import stays — it's still used for `/people`, `/documents`, `/settings`, etc.

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 4: Commit (clean staging)**

The repo working tree has pre-existing dirty files (start.sh, stop.sh, web/index.html, web/src/api/client.ts, web/vite.config.ts, hjc.code-workspace) NOT part of this task. Don't let them sneak in.

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/app/BudgetScreen.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY BudgetScreen.tsx and App.tsx
```

If `git diff --cached --stat` shows any other file, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): budget spend dashboard at /budget

Read-only rollup of Daily Expenses records. Hero stat-strip with
total spent vs ₵84k static budget (over-budget state flips text +
caps progress bar). Category breakdown bar list (sorted desc, zero-
spend hidden, dominant category gets accent color). 5-latest
transactions list with "View all" link to /forms/daily-expenses.
Empty state with "Log first expense" CTA when no records exist.

Subscribes to submitQueue so new expenses surface live. Reuses
.composite, .sec, .form-list-row patterns from app.css/forms.css.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 1 of a 3-task plan for the Budget screen. Tasks 2 and 3 wire the sidebar/drawer Budget items to navigate, then do a manual sweep.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main` (user has consented to commit directly).

**Existing state:**
- `web/src/screens/app/Shell.tsx` exports `ResponsiveShell`, `AppBar`, `TabBar`, `Drawer`.
- `web/src/lib/submitQueue.ts` exports `getRecords<T>(formSlug)` and `subscribe(listener)`.
- `web/src/screens/forms/DailyExpensesForm.tsx` writes to records under `formSlug='daily-expenses'` with the same `ExpenseEntry` shape — we duplicate the type rather than create a cross-screen import (small constants + type, narrow consumer set, no benefit to shared file yet).
- `app.css` already has `.composite`, `.sec`, `.composite .num/.delta/.label/.track/.track > i`, `.bot-pad`. `forms.css` has `.form-list-row`. All scoped under `.app-root`.
- `App.tsx` currently routes `/budget` to `<Placeholder title="Budget" />`. The `Placeholder` import stays since other routes still use it.

**Architecture notes:**
- `active="home"` on `ResponsiveShell` is the same acknowledged-minor pattern used for the existing placeholder routes — Budget isn't in `TabKey` so the sidebar visually highlights Home. Acceptable for v1.
- The screen does NOT use `FormShell` — Budget is a dashboard, not a form. Pattern matches Home / Pillars / Activity.
- Aggregations (`totalSpent`, `sumByCategory`, `categoriesWithSpend`, `maxCategoryAmount`, `recent`) all use `useMemo` keyed on `allEntries` so they recompute only when new records sync.

## Self-Review

- Did `git diff --cached --stat` show ONLY the 2 files?
- Does typecheck pass?
- Does build succeed?
- Does `BudgetScreen` subscribe to the queue and re-read records on update?
- Is the empty state covered (when `allEntries.length === 0`)?
- Does `formatRelativeDate` handle today / yesterday / older?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA (`git log -1 --format=%H`)
- Confirmation `git show --stat HEAD` shows only the 2 files
- Self-review findings if any

---

## Task 2: Wire Budget items in Sidebar + Drawer

The "Budget" entries in `Sidebar.tsx` and `Shell.tsx`'s Drawer are currently inert `<div>` elements — clicking them does nothing. Convert each to a navigating `<button>`.

People, Documents, Settings, and Sign-out STAY inert this phase.

**Files:**
- Modify: `web/src/screens/app/Sidebar.tsx`
- Modify: `web/src/screens/app/Shell.tsx` (the Drawer block)

- [ ] **Step 1: Wire Budget in `Sidebar.tsx`**

In `web/src/screens/app/Sidebar.tsx`, find this line (in the "Crusade" section — between "Director" and "Account"):

```tsx
<div className="sidebar-item"><span className="ico">◇</span>Budget</div>
```

Replace it with:

```tsx
<button type="button" className="sidebar-item" onClick={() => navigate('/budget')}>
  <span className="ico">◇</span>Budget
</button>
```

`navigate` is already imported via `useNavigate` at the top of the file (used by the Director nav buttons). No new import needed.

- [ ] **Step 2: Wire Budget in `Shell.tsx`'s Drawer**

In `web/src/screens/app/Shell.tsx`, find this line inside the `Drawer` component (in the "Crusade" section):

```tsx
<div className="drawer-item"><span className="ico">◇</span>Budget</div>
```

Replace it with:

```tsx
<button type="button" className="drawer-item" onClick={() => { onClose(); navigate('/budget'); }}>
  <span className="ico">◇</span>Budget
</button>
```

`navigate` is already used by the Director-section buttons in this same Drawer (via `useNavigate` at the top of `Drawer`). `onClose` is already a prop the component receives.

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
git add web/src/screens/app/Sidebar.tsx web/src/screens/app/Shell.tsx
git diff --cached --stat
# Expected: ONLY Sidebar.tsx and Shell.tsx
```

If any other files are staged, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): wire Budget item in Sidebar + Drawer to /budget

Replaces the inert <div> in both the desktop Sidebar and the phone
Drawer with a navigating <button>. People, Documents, Settings, and
Sign out stay inert until their pages are built.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 2 of the 3-task Budget plan. Task 1 created `BudgetScreen.tsx` and routed `/budget` to it. Without this task, the new Budget screen is only reachable by typing the URL — sidebar clicks would do nothing.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Existing state:**
- `Sidebar.tsx` already imports `useNavigate` and uses it for the Director-section buttons (Home, Forms, Pillars, Weekly, Activity log).
- `Shell.tsx`'s `Drawer` already imports `useNavigate` and uses it for its own Director-section buttons.
- The Drawer is a self-contained component inside Shell.tsx — its existing nav buttons follow the pattern `() => { onClose(); navigate(...) }` so the drawer closes after navigation.

## Self-Review

- Did `git diff --cached --stat` show ONLY the 2 files?
- Both Sidebar AND Drawer Budget items wired?
- Sidebar's Budget button does NOT include `onClose` (Sidebar has no overlay to close — desktop only)?
- Drawer's Budget button DOES include `onClose()` BEFORE navigate (matches existing nav buttons in the same Drawer)?
- Other inert items (People, Documents, Settings, Sign out) were NOT changed?
- Does typecheck pass?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only the 2 files
- Self-review findings if any

---

## Task 3: Final manual sweep

No code changes. Verify the Budget screen works end-to-end at three viewport widths and through the navigation entry points. No commit unless an issue surfaces.

- [ ] **Step 1: Verify build is clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npm run build
# Expected: success
```

- [ ] **Step 2: Direct route check**

Open `http://localhost:5173/budget`:
- Hero stat-strip shows the editorial "₵X spent" number with budget remaining on the right.
- "Spend by category" section lists categories sorted descending by spend, each with letter mark + name + bar + ₵ amount.
- "Recent · 5 latest" section lists up to 5 entries with vendor/category/receipt + amount + time.
- "View all expenses →" link at the bottom navigates to `/forms/daily-expenses`.

- [ ] **Step 3: Sidebar navigation (desktop)**

Resize to 1280px wide. Click "Budget" in the left sidebar (Crusade section). Should navigate to `/budget`. (Note: the sidebar will visually highlight Home — that's the acknowledged minor.)

- [ ] **Step 4: Drawer navigation (phone)**

Resize to 393px. Tap the hamburger to open the drawer. Tap "Budget" in the Crusade section. Should:
- Close the drawer
- Navigate to `/budget`

- [ ] **Step 5: Empty state**

In DevTools → Application → Local Storage → `http://localhost:5173`:
- Delete the `hjc_records_daily-expenses` key (and any keys starting with `hjc_records_daily-expenses` — should only be that one).
- Reload `/budget`.
- Expected: Hero shows ₵0 spent and ₵84,000 left. Category breakdown shows the empty placeholder with "Log first expense →" CTA. The "Recent" section is hidden entirely.
- Click "Log first expense →" — navigates to `/forms/daily-expenses`.

- [ ] **Step 6: Live update**

After clearing storage in Step 5:
- Navigate to `/forms/daily-expenses`.
- Add 1 expense (e.g. "Test vendor / transport / ₵50").
- Navigate back to `/budget`.
- Expected: hero shows ₵50 spent, the Transport category appears in the breakdown, the Recent section appears with the one entry.

- [ ] **Step 7: Three-viewport check**

DevTools device toolbar → swap between iPhone 14 (393×852), iPad (820×1180), and laptop (1280×800):
- Phone: single column, sticky tab bar at the bottom, sidebar hidden.
- Tablet: same as phone, more breathing room.
- Desktop: sidebar visible on left, content centered, Budget item is now a real button.

- [ ] **Step 8: If anything breaks**

Reference the spec at `/Users/adebimpegodwin/Projects/hjc/docs/superpowers/specs/2026-05-01-budget-screen-design.md` and file a follow-up commit. If the issue is structural, raise a discussion before fixing.

---

## Self-Review Notes

**Spec coverage:**
- Page anatomy (header / hero / breakdown / recent) → Task 1
- Hero stat-strip with over-budget state → Task 1
- Category breakdown with letter map + bar geometry + dominating-color rule → Task 1
- Recent transactions with formatRelativeDate → Task 1
- Empty state for both sections → Task 1
- Route swap → Task 1 Step 2
- Sidebar/Drawer wiring → Task 2
- Manual verification including empty state + live update → Task 3

**Type consistency:** `ExpenseEntry` is duplicated in `BudgetScreen.tsx` (same shape as in `DailyExpensesForm.tsx`); spec acknowledged this. `LETTER_FOR_CATEGORY` keys map exactly to the `category` union members. `CATEGORIES` constant matches the order spec'd in the design.

**Known minor (acknowledged in spec):**
- `active="home"` highlights Home in the sidebar when on `/budget` — the same minor that affects existing Placeholder routes. Resolves when `TabKey` is extended for sidebar destinations later.
- "P" letter collision between Printing and Permits — Permits gets "R" (regulatory) per the spec.
