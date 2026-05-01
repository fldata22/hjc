# People Screen — Design Spec

**Date:** 2026-05-01
**Status:** Approved, ready for implementation plan

## Goal

Build a unified directory at `/people` that rolls up the existing PCM, BOT, and CPC records (already in localStorage) into one searchable, filterable list of everyone associated with the crusade. Second of three planned sidebar destinations (Budget shipped → People → Documents).

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Layout | **A.** Flat list with type badges + filter chips + search box. Most powerful directory pattern; works regardless of crusade size. |
| 2 | Row tap action | **B.** Tap navigates to the source form's master list (`/forms/pcm` for PCM rows, `/forms/bot` for BOT, etc.). No new in-place profile screen. |
| 3 | Search box | **i. Yes** — name / role substring match, ~10 lines. Future-proofs for growth. |
| 4 | Status display per row | **z. Skip** — directory rows show name + role + type badge only. Status lives in the source form (one tap away). |

## Architecture

### Page shell

`<ResponsiveShell active="home">` (People isn't in `TabKey`; same acknowledged-minor as Budget — sidebar visually highlights Home for `/people`).

Inside the shell:
- `<AppBar onMenu={...}/>`
- `<div className="scroll">` — page sections
- `<TabBar active="home"/>`
- `<Drawer/>` if open

NOT `<FormShell>` — People is a read-only dashboard, not a form. Same pattern as Budget / Home / Pillars.

### Data flow

- Mount: lazy-init three records arrays from `submitQueue.getRecords<T>()`:
  - `getRecords<PCMRecord>('pcm')`
  - `getRecords<BOTRecord>('bot')`
  - `getRecords<CPCRecord>('cpc')`
- Single `useEffect` subscribes to `submitQueue.subscribe()` — re-reads all three on any notification.
- A `useMemo` merges the three arrays into one normalized `Person[]`:

  ```ts
  type Person = {
    name: string;
    role: string;
    phone: string;
    type: 'pcm' | 'bot' | 'cpc';
    sourceId: string | undefined;  // record's own id if present
  };
  ```

- `Person.name` resolves from the source's variant field (`fullName` for PCM/CPC, `name` for BOT).
- The merged array is sorted alphabetically by `name` (locale-aware compare).
- A second `useMemo` filters by the `search + activeChip` composite. Both controls compose: typing "akua" with chip set to "PCM" returns Akuas in the PCM list only.

### Type duplication

Same call we made for `BudgetScreen` — duplicate the source record types locally rather than cross-screen import:

```ts
type PCMRecord = { id?: string; fullName: string; role: string; phone: string; /* …other fields ignored on People */ };
type BOTRecord = { id?: string; name: string; role: string; phone: string; /* …other fields ignored */ };
type CPCRecord = { id?: string; fullName: string; role: string; phone: string; /* …other fields ignored */ };
```

These minimal local types declare only the fields People actually reads. The forms own the canonical types; lifting to a shared `types.ts` is a follow-up if a third consumer ever needs the same fields.

### Sidebar / Drawer wiring

Currently the "People" item in `Sidebar.tsx` and `Shell.tsx`'s Drawer is an inert `<div>`. Convert each to a navigating `<button>` calling `navigate('/people')`. Same fix pattern used for Budget in the prior phase.

Documents stays inert this phase.

### File touch list

**Create:**
- `web/src/screens/app/PeopleScreen.tsx`

**Modify:**
- `web/src/App.tsx` — change `/people` route from `<Placeholder title="People" />` to `<PeopleScreen />`
- `web/src/screens/app/Sidebar.tsx` — People item becomes navigating button
- `web/src/screens/app/Shell.tsx` — People item in Drawer becomes navigating button

**Delete:** none.

## Page sections

The page is a single scroll, top-to-bottom. Reuses CSS classes already in `app.css` and `forms.css`.

### Section 1 · Page header

```tsx
<div style={{ padding: '20px 20px 0' }}>
  <div className="eyebrow" style={{
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    fontWeight: 500,
    marginBottom: 10,
  }}>
    People · crusade committee
  </div>
  <h1 className="serif" style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}>
    Directory.
  </h1>
</div>
```

Same eyebrow + Playfair italic h1 pattern as Budget.

### Section 2 · Stat strip

Reuses the existing `.stat-strip` class from `forms.css`:

```tsx
<div className="stat-strip">
  <div>
    <div className="num">{totalPeople}</div>
    <div className="lbl">people total</div>
  </div>
  <div style={{ flex: 1 }}/>
  <div>
    <div className="lbl">
      <b>{pcmCount}</b> PCM · <b>{botCount}</b> BOT · <b>{cpcCount}</b> CPC
    </div>
  </div>
</div>
```

### Section 3 · Search input

```tsx
<div style={{ padding: '12px 20px 0' }}>
  <input
    type="search"
    className="input bordered"
    placeholder="Search by name or role…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{ width: '100%' }}
  />
</div>
```

Reuses the existing `.input.bordered` styling from `forms.css`.

### Section 4 · Filter chips

Reuses the existing `.chips` pattern (same as Pillars and Activity):

```tsx
<div className="chips">
  <div className={'chip' + (activeChip === 'all' ? ' on' : '')} onClick={() => setActiveChip('all')}>
    All<span className="n">{totalPeople}</span>
  </div>
  <div className={'chip' + (activeChip === 'pcm' ? ' on' : '')} onClick={() => setActiveChip('pcm')}>
    PCM<span className="n">{pcmCount}</span>
  </div>
  <div className={'chip' + (activeChip === 'bot' ? ' on' : '')} onClick={() => setActiveChip('bot')}>
    BOT<span className="n">{botCount}</span>
  </div>
  <div className={'chip' + (activeChip === 'cpc' ? ' on' : '')} onClick={() => setActiveChip('cpc')}>
    CPC<span className="n">{cpcCount}</span>
  </div>
</div>
```

`activeChip` state: `'all' | 'pcm' | 'bot' | 'cpc'`, default `'all'`.

### Section 5 · People list

Each row:

```tsx
{filteredPeople.map((p, i) => (
  <button
    type="button"
    key={`${p.type}-${p.sourceId ?? p.name}-${i}`}
    className="form-list-row"
    onClick={() => navigate(`/forms/${p.type}`)}
    style={{
      background: 'transparent',
      border: 0,
      padding: '14px 0',
      textAlign: 'left',
      cursor: 'pointer',
      fontFamily: 'inherit',
      width: '100%',
    }}
  >
    <div>
      <div className="name">{p.name}</div>
      <div className="sub">{p.role}</div>
    </div>
    <div className="right">
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        border: '1px solid var(--line)',
        padding: '2px 8px',
        borderRadius: 999,
      }}>
        {p.type}
      </span>
    </div>
  </button>
))}
```

Wrapper around the list: `<div style={{ padding: '0 20px' }}>` (matches existing form-list pattern).

Tapping a row navigates to `/forms/<type>` (the source form's master list).

### Section 6 · Empty states

**No people at all** (`totalPeople === 0` — all three source records empty):

```tsx
<div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
  No people yet.<br/>
  Add a{' '}
  <button type="button" onClick={() => navigate('/forms/pcm')} style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline' }}>PCM</button>,{' '}
  <button type="button" onClick={() => navigate('/forms/bot')} style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline' }}>BOT member</button>, or{' '}
  <button type="button" onClick={() => navigate('/forms/cpc')} style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline' }}>CPC member</button>.
</div>
```

This branch replaces both the search input + chips and the list. (No point in showing a search box when there's nothing to search.)

**Search / filter returns nothing** (`totalPeople > 0` but `filteredPeople.length === 0`):

```tsx
<div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
  No matches{search ? ` for "${search}"` : ''}.
</div>
```

The search input + chips remain visible above (so the user can adjust the query).

### Bottom

```tsx
<div className="bot-pad"/>
```

## Sidebar / Drawer wiring

In `web/src/screens/app/Sidebar.tsx`, find the People item:

```tsx
<div className="sidebar-item"><span className="ico">◐</span>People</div>
```

Replace with:

```tsx
<button type="button" className="sidebar-item" onClick={() => navigate('/people')}>
  <span className="ico">◐</span>People
</button>
```

(`navigate` is already in scope from `useNavigate()` at the top of the component, used by the Director nav buttons.)

In `web/src/screens/app/Shell.tsx`, find the matching People item in the Drawer:

```tsx
<div className="drawer-item"><span className="ico">◐</span>People</div>
```

Replace with:

```tsx
<button type="button" className="drawer-item" onClick={() => { onClose(); navigate('/people'); }}>
  <span className="ico">◐</span>People
</button>
```

(`navigate` is already in scope; the existing Drawer destinations use it. `onClose` is already a prop.)

Documents stays inert.

## Implementation order (suggested)

1. Create `PeopleScreen.tsx` — get the 6 sections rendering with mock-empty initially. Verify route swap works.
2. Wire `/people` in `App.tsx` (swap Placeholder → PeopleScreen).
3. Visit `/people` and confirm it loads with seed records visible.
4. Wire People items in Sidebar.tsx and Shell.tsx Drawer.
5. Manual sweep at phone (393), tablet (820), desktop (1280). Test empty state by clearing localStorage. Test live update by adding a PCM at `/forms/pcm/new` and navigating back.

## Non-goals (explicitly out of scope)

- No in-place profile screen (`/people/:type/:id`) — Q2 chose B (link out to source form).
- No edit / delete from this page — source form's domain.
- No batch operations (export, bulk message, etc.).
- No Pastors / Workers types — those forms don't exist yet; add them when they do.
- No People-specific stats beyond per-type counts (no pillar-readiness rollup, no activity score).
- No phone-call / WhatsApp-link buttons on rows (potential follow-up).
- No real Laravel API endpoints — still localStorage. Same swap point at `submitQueue.ts`.
- Documents sidebar item stays inert this phase.
- No status badge on rows — Q4 chose z (skip).

## Open follow-ups (post-implementation)

- Real Laravel API endpoints (with the rest of `submitQueue.ts`).
- In-place profile screen at `/people/:type/:id` if the director ends up wanting it (would replace the link-out-to-source-form behavior).
- Phone-call / WhatsApp / SMS-link buttons on rows.
- People types beyond the current 3 (Pastors, Workers, Volunteers) when those forms ship.
- Status filter (e.g. "show only active CPCs") — would need to bring per-type status back into the row, contradicting the current Q4.z choice. Revisit.
- Documents page (the third sidebar destination).
