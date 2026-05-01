# People Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified directory at `/people` rolling up PCM, BOT, and CPC records into one searchable, filterable list, plus wire the inert "People" sidebar/drawer items so they navigate.

**Architecture:** New `PeopleScreen` reads three localStorage record sets via `getRecords<T>()`, merges them into a normalized `Person[]` (name + role + type), and renders an editorial dashboard with a stat strip, search input, filter chips, and a flat list of rows. Each row navigates to its source form's master list. Subscribes to `submitQueue` for live updates. Bundled small fix: convert the inert "People" `<div>` items in `Sidebar.tsx` and `Shell.tsx`'s Drawer to navigating `<button>` elements (same pattern used for Budget).

**Tech Stack:** React 19, TypeScript, Vite 8, React Router 7. No test framework — verification is `tsc --noEmit` + `npm run build` + manual viewport check at 393px / 820px / 1280px.

**Spec:** `docs/superpowers/specs/2026-05-01-people-screen-design.md`

**Conventions:**
- All paths relative to `/Users/adebimpegodwin/Projects/hjc`.
- All `npm`/`npx` commands from `web/`.
- Each task ends with a defensive-staged commit (the working tree has pre-existing dirty files we don't want to capture).

---

## Task 1: PeopleScreen + route swap

Build the directory component and route `/people` to it (replacing the existing `Placeholder`).

**Files:**
- Create: `web/src/screens/app/PeopleScreen.tsx`
- Modify: `web/src/App.tsx` — swap `/people` route from `<Placeholder title="People" />` to `<PeopleScreen />`

- [ ] **Step 1: Create `PeopleScreen.tsx`**

Create the file at `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/PeopleScreen.tsx` with this EXACT content:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { getRecords, subscribe } from '../../lib/submitQueue';
import './app.css';

// Minimal local types — only the fields PeopleScreen reads. The forms own
// the canonical types (PCMRecord/BOTRecord/CPCRecord). Lift to a shared
// types file if a third consumer ever needs them.
type PCMRecord = { id?: string; fullName: string; role: string; phone: string };
type BOTRecord = { id?: string; name: string; role: string; phone: string };
type CPCRecord = { id?: string; fullName: string; role: string; phone: string };

type PersonType = 'pcm' | 'bot' | 'cpc';

type Person = {
  name: string;
  role: string;
  phone: string;
  type: PersonType;
  sourceId: string | undefined;
};

type ChipKey = 'all' | PersonType;

export function PeopleScreen() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const [pcmRecords, setPcmRecords] = useState<PCMRecord[]>(() => getRecords<PCMRecord>('pcm'));
  const [botRecords, setBotRecords] = useState<BOTRecord[]>(() => getRecords<BOTRecord>('bot'));
  const [cpcRecords, setCpcRecords] = useState<CPCRecord[]>(() => getRecords<CPCRecord>('cpc'));

  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<ChipKey>('all');

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setPcmRecords(getRecords<PCMRecord>('pcm'));
      setBotRecords(getRecords<BOTRecord>('bot'));
      setCpcRecords(getRecords<CPCRecord>('cpc'));
    });
    return () => { unsubscribe(); };
  }, []);

  const allPeople = useMemo<Person[]>(() => {
    const pcms: Person[] = pcmRecords.map((r) => ({
      name: r.fullName,
      role: r.role,
      phone: r.phone,
      type: 'pcm',
      sourceId: r.id,
    }));
    const bots: Person[] = botRecords.map((r) => ({
      name: r.name,
      role: r.role,
      phone: r.phone,
      type: 'bot',
      sourceId: r.id,
    }));
    const cpcs: Person[] = cpcRecords.map((r) => ({
      name: r.fullName,
      role: r.role,
      phone: r.phone,
      type: 'cpc',
      sourceId: r.id,
    }));
    return [...pcms, ...bots, ...cpcs].sort((a, b) => a.name.localeCompare(b.name));
  }, [pcmRecords, botRecords, cpcRecords]);

  const totalPeople = allPeople.length;
  const pcmCount = pcmRecords.length;
  const botCount = botRecords.length;
  const cpcCount = cpcRecords.length;

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPeople.filter((p) => {
      if (activeChip !== 'all' && p.type !== activeChip) return false;
      if (q === '') return true;
      return p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
    });
  }, [allPeople, search, activeChip]);

  const isEmpty = totalPeople === 0;

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
            People · crusade committee
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Directory.
          </h1>
        </div>

        {isEmpty ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            No people yet.<br/>
            Add a{' '}
            <button
              type="button"
              onClick={() => navigate('/forms/pcm')}
              style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}
            >
              PCM
            </button>
            ,{' '}
            <button
              type="button"
              onClick={() => navigate('/forms/bot')}
              style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}
            >
              BOT member
            </button>
            , or{' '}
            <button
              type="button"
              onClick={() => navigate('/forms/cpc')}
              style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}
            >
              CPC member
            </button>
            .
          </div>
        ) : (
          <>
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

            {filteredPeople.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                No matches{search ? ` for "${search}"` : ''}.
              </div>
            ) : (
              <div style={{ padding: '0 20px' }}>
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
              </div>
            )}
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

- [ ] **Step 2: Update `/people` route in `App.tsx`**

In `web/src/App.tsx`:

a. Add this import alongside the other screen imports near the top of the file (likely next to `BudgetScreen`):

```tsx
import { PeopleScreen } from './screens/app/PeopleScreen';
```

b. Find the existing `/people` route — currently:

```tsx
<Route path="/people" element={<RequireAuth><Placeholder title="People" /></RequireAuth>} />
```

Replace it with:

```tsx
<Route path="/people" element={<RequireAuth><PeopleScreen /></RequireAuth>} />
```

The `Placeholder` import STAYS in `App.tsx` — still used for `/documents`, `/settings`, etc.

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
git add web/src/screens/app/PeopleScreen.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY PeopleScreen.tsx and App.tsx
```

If `git diff --cached --stat` shows ANY file other than the 2 listed, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): people directory at /people

Unified directory rolling up PCM, BOT, and CPC records from
localStorage. Stat strip with per-type counts, search input
(name + role substring), filter chips (All/PCM/BOT/CPC), flat
sortable list of rows. Each row navigates to its source form.
Empty state with "Add a PCM/BOT member/CPC member" inline links
when all three sources are empty. "No matches" state for empty
search/filter results.

Subscribes to submitQueue so new entries surface live. Reuses
.stat-strip, .chips, .form-list-row, .input.bordered patterns.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 1 of a 3-task plan for the People screen. Tasks 2-3 wire the sidebar/drawer People items, then a manual sweep.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main` (user has consented to commit directly).

**Existing state:**
- `web/src/screens/app/Shell.tsx` exports `ResponsiveShell`, `AppBar`, `TabBar`, `Drawer`.
- `web/src/lib/submitQueue.ts` exports `getRecords<T>(formSlug)` and `subscribe(listener)`.
- Source forms write records under `formSlug='pcm'`, `'bot'`, `'cpc'` with the field shapes mirrored in our local minimal types. (Source forms have many more fields per record; we only need name + role + phone for the directory row.)
- `app.css` has `.chips`, `.chips .chip`, `.chips .chip.on`, `.input.bordered`. `forms.css` has `.stat-strip` (with `.num` and `.lbl`), `.form-list-row` (with `.name`, `.sub`, `.right`).
- `App.tsx` currently routes `/people` to `<Placeholder title="People" />`. The `Placeholder` import stays since other routes use it.

**Architecture notes:**
- `active="home"` on `ResponsiveShell` is the same acknowledged-minor pattern used for Budget — People isn't in `TabKey` so the sidebar visually highlights Home. Acceptable for v1.
- The screen does NOT use `FormShell` — People is a dashboard, not a form.
- Each `Person.type` matches the route segment used by the source form (`pcm` → `/forms/pcm`, `bot` → `/forms/bot`, `cpc` → `/forms/cpc`), so `navigate(\`/forms/${p.type}\`)` works without a switch.

## Self-Review

- Did `git diff --cached --stat` show ONLY the 2 files?
- Does typecheck pass?
- Does build succeed?
- Does `PeopleScreen` subscribe to the queue and re-read all 3 record sets on update?
- Is the empty state covered (when `totalPeople === 0`)?
- Does the search filter compose with the chip filter (e.g. "akua" + chip "PCM" finds Akuas in PCM only)?
- Does the row navigate correctly per type (`/forms/pcm`, `/forms/bot`, `/forms/cpc`)?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA (`git log -1 --format=%H`)
- Confirmation `git show --stat HEAD` shows only the 2 files
- Self-review findings if any

---

## Task 2: Wire People items in Sidebar + Drawer

The "People" entries in `Sidebar.tsx` and `Shell.tsx`'s Drawer are currently inert `<div>` elements — clicking them does nothing. Convert each to a navigating `<button>`.

Documents, Settings, and Sign-out STAY inert this phase.

**Files:**
- Modify: `web/src/screens/app/Sidebar.tsx`
- Modify: `web/src/screens/app/Shell.tsx` (the Drawer block)

- [ ] **Step 1: Wire People in `Sidebar.tsx`**

In `web/src/screens/app/Sidebar.tsx`, find this line (in the "Crusade" section — the Budget item should now be a button immediately after this from the prior phase):

```tsx
<div className="sidebar-item"><span className="ico">◐</span>People</div>
```

Replace it with:

```tsx
<button type="button" className="sidebar-item" onClick={() => navigate('/people')}>
  <span className="ico">◐</span>People
</button>
```

`navigate` is already in scope from `useNavigate()` at the top of the component. No new import needed.

- [ ] **Step 2: Wire People in `Shell.tsx`'s Drawer**

In `web/src/screens/app/Shell.tsx`, find this line inside the `Drawer` component (in the "Crusade" section — the Budget item should now be a button immediately after this from the prior phase):

```tsx
<div className="drawer-item"><span className="ico">◐</span>People</div>
```

Replace it with:

```tsx
<button type="button" className="drawer-item" onClick={() => { onClose(); navigate('/people'); }}>
  <span className="ico">◐</span>People
</button>
```

`navigate` is already in scope (Drawer's existing buttons use it). `onClose` is already a prop the component receives.

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
feat(web): wire People item in Sidebar + Drawer to /people

Replaces the inert <div> in both the desktop Sidebar and the phone
Drawer with a navigating <button>. Documents, Settings, and Sign
out stay inert until their pages are built.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 2 of the 3-task People plan. Task 1 created `PeopleScreen.tsx` and routed `/people` to it. Without this task, the new People screen is only reachable by typing the URL — sidebar clicks would do nothing.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Existing state:**
- `Sidebar.tsx` already imports `useNavigate` and uses it for the Director-section buttons + the (already-wired) Budget button.
- `Shell.tsx`'s `Drawer` already imports `useNavigate` and uses it for its own Director-section buttons + the (already-wired) Budget button.
- Pattern reference: how the Budget item in both files looks today is exactly the shape this task creates for People.

## Self-Review

- Did `git diff --cached --stat` show ONLY the 2 files?
- Both Sidebar AND Drawer People items wired?
- Sidebar's People button does NOT include `onClose` (Sidebar has no overlay)?
- Drawer's People button DOES include `onClose()` BEFORE navigate?
- Other inert items (Documents, Settings, Sign out) were NOT changed?
- Does typecheck pass?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only the 2 files
- Self-review findings if any

---

## Task 3: Final manual sweep

No code changes. Verify the People screen works end-to-end at three viewport widths and through the navigation entry points. No commit unless an issue surfaces.

- [ ] **Step 1: Verify build is clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npm run build
# Expected: success
```

- [ ] **Step 2: Direct route check**

Open `http://localhost:5173/people`:
- Page header shows "People · crusade committee" eyebrow + "Directory." headline.
- Stat strip: large editorial total (sum of PCM+BOT+CPC seeds — should be ~19) + per-type counts on the right.
- Search input with "Search by name or role…" placeholder.
- Filter chips: All / PCM / BOT / CPC with counts.
- List: alphabetical by name, each row shows name + role on the left and a `PCM` / `BOT` / `CPC` mono badge on the right.

- [ ] **Step 3: Search + filter composition**

- Type "ak" in the search box. Expected: only people whose name OR role contains "ak" (e.g. Akua Boateng, Akosua).
- Tap "PCM" chip. Expected: PCM rows only — and the search "ak" is still applied (Akua/Akosua may or may not be PCMs; the visible set is the intersection).
- Clear the search. Expected: full PCM list visible.
- Tap "All" chip. Expected: full list returns.

- [ ] **Step 4: Row navigation**

- Tap a PCM row. Expected: navigates to `/forms/pcm`.
- Use back button. Tap a BOT row. Expected: `/forms/bot`.
- Use back button. Tap a CPC row. Expected: `/forms/cpc`.

- [ ] **Step 5: Sidebar navigation (desktop)**

Resize to 1280px. Click "People" in the left sidebar (Crusade section). Should navigate to `/people`. (Sidebar visually highlights Home — known minor.)

- [ ] **Step 6: Drawer navigation (phone)**

Resize to 393px. Tap the hamburger to open the drawer. Tap "People" in the Crusade section. Should:
- Close the drawer
- Navigate to `/people`

- [ ] **Step 7: Empty states**

In DevTools → Application → Local Storage → `http://localhost:5173`:
- Delete `hjc_records_pcm`, `hjc_records_bot`, `hjc_records_cpc` (and reset their forms by visiting them — they reseed from SEED if records is empty, but the rendering on People screen reads only from records, not seeds).

Actually — important nuance: each form reads `getRecords` and falls back to its own SEED only for that form's display. PeopleScreen reads `getRecords` directly with no seed fallback. So if you clear all 3 records keys and reload `/people`, you should see the empty state.

- Reload `/people`.
- Expected: "No people yet. Add a PCM, BOT member, or CPC member." with three styled inline links.
- Click one of the links — navigates to that source form.

To restore: visit the source forms one by one. Each form's lazy-init falls back to its own SEED when its records key is empty.

- [ ] **Step 8: "No matches" state**

Type "zzzzz" in the search input.
- Expected: "No matches for "zzzzz"." in the list area; stat strip / chips remain visible.
- Clear search. List returns.

- [ ] **Step 9: Live update**

- Navigate to `/forms/pcm/new`.
- Fill out a quick PCM (Step 1: name "Test Person", denomination Pentecostal, church "Test Church", role "Test Role"; Step 2: phone, zone; Step 3: background check Cleared, ref name + phone, 3 characteristics; Step 4: attest, submit).
- Navigate back to `/people`. Expected: "Test Person" appears in the list (alphabetical position), per-type counts updated, total updated.

- [ ] **Step 10: Three-viewport check**

DevTools device toolbar → swap between iPhone 14 (393×852), iPad (820×1180), and laptop (1280×800):
- Phone: single column, sticky tab bar at the bottom, sidebar hidden.
- Tablet: same as phone, more breathing room.
- Desktop: sidebar visible on left, content centered, People item is now a real button.

- [ ] **Step 11: If anything breaks**

Reference the spec at `/Users/adebimpegodwin/Projects/hjc/docs/superpowers/specs/2026-05-01-people-screen-design.md` and file a follow-up commit.

---

## Self-Review Notes

**Spec coverage:**
- Page header, stat strip, search, chips, list, empty states → Task 1
- Row click → source form navigation → Task 1
- Subscribe + reactive updates → Task 1
- Sidebar/Drawer wiring → Task 2
- Manual verification incl. empty + search + live update → Task 3

**Type consistency:** Local minimal types (`PCMRecord`, `BOTRecord`, `CPCRecord`) match the canonical fields the source forms write. `Person.type` enum (`'pcm' | 'bot' | 'cpc'`) maps directly to route segments via `\`/forms/${p.type}\``. `ChipKey` extends `PersonType` with `'all'` for the "show everything" case.

**Known minor (acknowledged in spec):**
- `active="home"` highlights Home in the sidebar when on `/people` — same minor as Budget. Resolves when `TabKey` is extended for sidebar destinations later.
- Documents stays inert (only People is wired in this phase; Documents has no real screen yet).
- No in-place profile screen (`/people/:type/:id`) — Q2 chose B (link out to source form).
