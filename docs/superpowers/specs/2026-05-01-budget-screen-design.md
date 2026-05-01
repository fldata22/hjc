# Budget Screen — Design Spec

**Date:** 2026-05-01
**Status:** Approved, ready for implementation plan

## Goal

Build a read-only spend dashboard at `/budget` that rolls up the existing Daily Expenses records (already in localStorage) into one editorial screen the director can glance at to know "are we on track financially". First of three planned sidebar destinations (Budget → People → Documents).

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Page purpose | **A.** Spend dashboard — read-only rollup. No budget-plan editing in v1; that's a follow-up. |
| 2 | Hero metric | **A.** Total spent — big editorial `₵43,800` red. Subtitle: "of ₵84,000 budget · ₵40,200 left". |
| 3 | Category breakdown | **A.** Bar list — one row per category (sorted desc, zero-spend hidden), letter mark + name + bar + ₵. Same pattern as Home's "Pillars at risk" card. |
| 4 | Trend / pacing | **A.** Skip — no sparkline, no daily-spend chart. The recent transactions list shows trajectory implicitly. Charts are a follow-up if the director asks. |

## Architecture

### Page shell

`<ResponsiveShell active="home">` (Budget isn't in `TabKey`; same acknowledged-minor as the existing placeholder routes — sidebar will visually highlight Home for `/budget`. Acceptable for v1; not worth extending `TabKey` until People/Documents/Settings ship and we know whether they should each highlight independently).

Inside the shell:
- `<AppBar onMenu={...}/>`
- `<div className="scroll">` — page sections
- `<TabBar active="home"/>` (Budget isn't a tab — TabBar still shows the 5 director tabs, none active)
- `<Drawer/>` if open

NOT `<FormShell>` — Budget is a read-only dashboard, not a form. Same pattern as Home / Pillars / Activity.

### Data flow

- Mount: read `getRecords<ExpenseEntry>('daily-expenses')` from `submitQueue`.
- Subscribe to `submitQueue` so any new expense submitted from `/forms/daily-expenses` updates the dashboard live.
- All aggregation (total spent, per-category sum, sorted recent list) happens client-side in `useMemo`.
- Type `ExpenseEntry` is duplicated locally rather than imported from `DailyExpensesForm.tsx` (the form already has the type definition; we don't want a circular-feeling cross-screen import. Same shape, declared independently. If a third consumer ever appears, lift to a shared `types.ts`).

The `STATIC_BUDGET = 84000` constant is duplicated locally too (small constant, narrow consumer set). When real budget config endpoint lands, both copies get replaced together.

### Sidebar / Drawer wiring

Currently the "Budget" item in `Sidebar.tsx` and the matching item in `Shell.tsx`'s Drawer are inert `<div>` elements — clicking does nothing. Convert each to a navigating `<button>` calling `navigate('/budget')`.

Out of scope: People and Documents stay inert until those pages are built.

### File touch list

**Create:**
- `web/src/screens/app/BudgetScreen.tsx`

**Modify:**
- `web/src/App.tsx` — change `/budget` route from `<Placeholder title="Budget" />` to `<BudgetScreen />`
- `web/src/screens/app/Sidebar.tsx` — Budget item becomes navigating button
- `web/src/screens/app/Shell.tsx` — Budget item in Drawer becomes navigating button

**Delete:** none.

## Page sections

The page is a single scroll, top-to-bottom. Reuses CSS classes already in `app.css` and `forms.css`.

### Section 1 · Page header

```tsx
<div style={{ padding: '20px 20px 0' }}>
  <div className="eyebrow" style={{...}}>Budget · advance work</div>
  <h1 className="serif" style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}>
    Spend.
  </h1>
</div>
```

- Eyebrow: 10px uppercase grey, `var(--ink-3)`, 0.16em letter-spacing
- Headline: Playfair 34px on phone (matches Home/Pillars/Activity heroes)

### Section 2 · Hero stat-strip

```tsx
<div className="composite">
  <div className="label">Total spent · all-time</div>
  <div className="row">
    <div className="num serif">₵{totalSpent.toLocaleString()}</div>
    <div className="delta">
      <b>{overBudget ? `₵${(totalSpent - STATIC_BUDGET).toLocaleString()} over` : `₵${(STATIC_BUDGET - totalSpent).toLocaleString()} left`}</b>
      of ₵{STATIC_BUDGET.toLocaleString()} budget
    </div>
  </div>
  <div className="track"><i style={{ width: `${Math.min(100, (totalSpent / STATIC_BUDGET) * 100)}%` }}/></div>
</div>
```

Reuses existing `.composite` styles from `app.css` (the same block that renders Home's "64%" hero). Only difference: the number is currency, not percentage.

**Over-budget state:** if `totalSpent > STATIC_BUDGET`, the right-side `<b>` text reads `₵X over` instead of `₵X left`. The progress bar fills to 100% (the `Math.min(100, ...)` cap). The `<b>` text inherits `var(--ink)` so it stays in the editorial palette; we don't add a red flag at this scale (acknowledged: stronger over-budget visual treatment is a follow-up if the dashboard ever shows real overspend).

### Section 3 · Spend by category

Sub-header (reuses `.sec` from app.css):

```tsx
<div className="sec">
  <h2 className="serif">Spend by <em>category</em></h2>
  <span className="more">{categoriesWithSpend.length} categories</span>
</div>
```

Then a list of category rows:

```tsx
<div className="at-risk">
  {categoriesWithSpend.map((cat) => (
    <div className="at-risk-row" key={cat.value}>
      <span className="L serif">{LETTER_FOR_CATEGORY[cat.value]}</span>
      <span className="nm">{cat.label}</span>
      <span className="bar" style={{ flex: 1, height: 3, background: 'var(--bg-2)', position: 'relative', margin: '0 16px' }}>
        <i style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: `${(cat.amount / maxCategoryAmount) * 100}%`,
          background: cat.amount / totalSpent > 0.25 ? 'var(--accent)' : 'var(--ink)',
        }}/>
      </span>
      <span className="pct">₵{cat.amount.toLocaleString()}</span>
    </div>
  ))}
</div>
```

**Letter map** (one letter per category, no collisions):

```ts
const LETTER_FOR_CATEGORY: Record<ExpenseEntry['category'], string> = {
  transport: 'T',
  printing: 'P',
  permits: 'R',  // P is taken by Printing; R for "permits" (R for "regulatory" — close enough)
  food: 'F',
  venue: 'V',
  materials: 'M',
  other: 'O',
};
```

(Initial-letter collision between `printing` and `permits` is unavoidable. Pick `R` for permits to disambiguate; brief and forgivable. Acknowledged minor.)

**Bar geometry:**
- `width = (this category's amount) / (max category amount)` — the largest category's bar is full-width, others scale relative to it. NOT proportional to total budget — that would make small categories invisible.
- Color: `var(--ink)` solid, EXCEPT if the category accounts for >25% of total spend, then `var(--accent)`. (Lightweight visual cue for "this is dominating".)

**Sort:** descending by `amount`. Categories with `amount === 0` are filtered out (`categoriesWithSpend = CATEGORIES.filter(c => sumByCategory[c.value] > 0)`).

**Empty state:** if `totalSpent === 0` (no records), the entire Spend-by-category section renders an empty placeholder instead:

```tsx
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
```

### Section 4 · Recent transactions

Sub-header:

```tsx
<div className="sec">
  <h2 className="serif">Recent <em>· 5 latest</em></h2>
  <span className="more">{allEntries.length} total</span>
</div>
```

5 most recent entries from `allEntries`, sorted by `date desc, time desc`. Reuses `.form-list-row` from `forms.css`:

```tsx
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
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{e.time} · {formatRelativeDate(e.date)}</div>
        </div>
      </div>
    );
  })}
</div>
```

`formatRelativeDate(iso)` — small helper inline to this file (or, if we extract: shared lib later):
- if today: `"today"`
- if yesterday: `"yest"`
- otherwise: short ISO, e.g. `"28 Apr"`

After the list:

```tsx
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
```

**Empty state:** if no records, omit this entire section (the empty-state in Section 3 covers the "go log something" CTA).

### Bottom

```tsx
<div className="bot-pad"/>
```

## Sidebar / Drawer wiring

In `web/src/screens/app/Sidebar.tsx`, find the Budget item:

```tsx
<div className="sidebar-item"><span className="ico">◇</span>Budget</div>
```

Replace with:

```tsx
<button
  type="button"
  className="sidebar-item"
  onClick={() => { navigate('/budget'); }}
>
  <span className="ico">◇</span>Budget
</button>
```

(navigate is from useNavigate, already imported in Sidebar.tsx.)

In `web/src/screens/app/Shell.tsx`, find the matching Budget item in the Drawer:

```tsx
<div className="drawer-item"><span className="ico">◇</span>Budget</div>
```

Replace with:

```tsx
<button
  type="button"
  className="drawer-item"
  onClick={() => { onClose(); navigate('/budget'); }}
>
  <span className="ico">◇</span>Budget
</button>
```

(navigate is from useNavigate; the existing Drawer destinations already use it. `onClose` is already passed to Drawer.)

The other Crusade-section items (People, Documents) and Account items (Settings, Sign out) STAY inert this phase. They'll be wired when their pages land.

## Implementation order (suggested)

1. Create `BudgetScreen.tsx` with the 4 sections, mock-empty initially. Verify it renders.
2. Wire `/budget` route in `App.tsx` (swap Placeholder → BudgetScreen).
3. Verify routing: visit `/budget` and confirm the page loads.
4. Wire Budget items in Sidebar.tsx and Shell.tsx Drawer.
5. Verify clicking Budget in sidebar / drawer navigates correctly.
6. Manual sweep at phone (393), tablet (820), desktop (1280). Test empty state by clearing localStorage. Test populated state by hitting `/forms/daily-expenses` and adding an entry.

## Non-goals (explicitly out of scope)

- No budget plan / line-item editing (Q1 chose A — read-only).
- No category-level budget targets (one global ₵84k target only).
- No daily/weekly spend trend chart, no sparkline (Q4 chose A).
- No CSV export, no print view.
- No per-zone or per-category breakdown beyond the existing 7 categories.
- No date-range filter (always shows all-time spend).
- No edit / delete of past transactions from this screen — that's still the Daily Expenses form's domain.
- No People page wiring (separate phase).
- No Documents page wiring (separate phase).
- No real Laravel API endpoints — still localStorage. Same swap point at `submitQueue.ts`.
- No stronger over-budget visual treatment (red banner, alert chip) — current treatment is just the text flip.

## Open follow-ups (post-implementation)

- Real Laravel API endpoints (with the rest of `submitQueue.ts`).
- Budget plan editing (Q1.b — line-items per category, with allocation form).
- Trend chart / sparkline (Q4.b/c).
- Category-level budget targets and per-category variance.
- Stronger over-budget visual treatment.
- People page (the next sidebar destination).
- Documents page (deferred; needs real backend for file upload).
