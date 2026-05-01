# Responsive Unified App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the desktop `MissionControl`, mobile companion (`/m/...`), and editorial director screens (`/d/...`) into a single responsive web app under one root URL space.

**Architecture:** The 5 director screens become canonical, rendered through one `ResponsiveShell` that shows phone chrome (status bar + app bar + bottom tab bar + drawer) below 1024px and a persistent left sidebar at desktop. Both sets of chrome render in the DOM; CSS media queries handle the visibility switch. All routes move to root paths; `/m/*` and `/d/*` redirect for backwards compatibility. Old `MissionControl.tsx`, `mobile/*` screens, and their CSS files are deleted.

**Tech Stack:** React 19, TypeScript, Vite 8, React Router 7. No test framework in `web/` — verification is `tsc --noEmit` + `npm run build` + manual viewport check at 393px / 820px / 1280px.

**Spec:** `docs/superpowers/specs/2026-05-01-responsive-unified-app-design.md`

**Conventions:**
- All paths below are relative to `/Users/adebimpegodwin/Projects/hjc`.
- All `npm`/`npx` commands run inside `web/` — prefix with `cd web && ...` or run from that directory.
- Each task ends with a typecheck + commit. Run `npm run build` only at end-of-task milestones (it's slower).
- The dev server is already running on `http://localhost:5173` per session context — manual checks happen there.

---

## Task 1: Rename `director/` → `app/` and re-scope CSS

Pure rename. No behavior changes. After this task, `/d/*` routes still serve the existing screens, but their files live under `screens/app/` and the CSS scope is `.app-root` instead of `.d-root`.

**Files:**
- Rename: `web/src/screens/director/` → `web/src/screens/app/` (8 files inside)
- Rename within: `web/src/screens/app/DirectorShell.tsx` → `web/src/screens/app/Shell.tsx`
- Rename within: `web/src/screens/app/director.css` → `web/src/screens/app/app.css`
- Modify: `web/src/screens/app/{HomeScreen,FormsScreen,PillarsScreen,WeeklyScreen,ActivityScreen}.tsx` — update CSS import path
- Modify: `web/src/screens/app/Shell.tsx` — update CSS class name `d-root` → `app-root`, update CSS import name
- Modify: `web/src/screens/app/app.css` — replace every `.d-root` selector with `.app-root`
- Modify: `web/src/App.tsx` — update 5 import paths from `./screens/director/...` to `./screens/app/...`

- [ ] **Step 1: `git mv` the directory and the two renamed files**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git mv web/src/screens/director web/src/screens/app
git mv web/src/screens/app/DirectorShell.tsx web/src/screens/app/Shell.tsx
git mv web/src/screens/app/director.css web/src/screens/app/app.css
```

- [ ] **Step 2: Replace `d-root` with `app-root` across `app.css` and `Shell.tsx`**

In `web/src/screens/app/app.css`, do a global replacement of the substring `d-root` with `app-root` (every CSS selector starts with `.d-root` and the file has ~120 occurrences). Use `sed` or your editor's project-wide replace. After:

```bash
grep -c 'd-root' web/src/screens/app/app.css
# Expected: 0
grep -c 'app-root' web/src/screens/app/app.css
# Expected: ~120 (was the previous count of d-root)
```

In `web/src/screens/app/Shell.tsx`, the only occurrence is in `PhoneFrame`:

```tsx
export const PhoneFrame = ({ children }: { children: ReactNode }) => (
  <div className="app-root">
    <div className="phone">{children}</div>
  </div>
);
```

- [ ] **Step 3: Update CSS import paths in all 5 screens**

In each of `HomeScreen.tsx`, `FormsScreen.tsx`, `PillarsScreen.tsx`, `WeeklyScreen.tsx`, `ActivityScreen.tsx`, change:

```tsx
import './director.css';
```
to:
```tsx
import './app.css';
```

And change every:
```tsx
import { ... } from './DirectorShell';
```
to:
```tsx
import { ... } from './Shell';
```

- [ ] **Step 4: Update import paths in `App.tsx`**

In `web/src/App.tsx`, change the 5 director imports from:

```tsx
import { HomeScreen as DirectorHome } from './screens/director/HomeScreen';
import { FormsScreen as DirectorForms } from './screens/director/FormsScreen';
import { PillarsScreen as DirectorPillars } from './screens/director/PillarsScreen';
import { WeeklyScreen as DirectorWeekly } from './screens/director/WeeklyScreen';
import { ActivityScreen as DirectorActivity } from './screens/director/ActivityScreen';
```
to:
```tsx
import { HomeScreen as DirectorHome } from './screens/app/HomeScreen';
import { FormsScreen as DirectorForms } from './screens/app/FormsScreen';
import { PillarsScreen as DirectorPillars } from './screens/app/PillarsScreen';
import { WeeklyScreen as DirectorWeekly } from './screens/app/WeeklyScreen';
import { ActivityScreen as DirectorActivity } from './screens/app/ActivityScreen';
```

(The `as Director*` aliases are temporary — they'll be cleaned up in Task 8.)

- [ ] **Step 5: Verify typecheck and build pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: no output, exit code 0
npm run build
# Expected: build succeeds, "✓ built in <Xms>"
```

- [ ] **Step 6: Spot-check `/d/` in the browser**

Open `http://localhost:5173/d/` after logging in. Visually identical to before. No console errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add -A web/src/screens/app web/src/App.tsx
git commit -m "$(cat <<'EOF'
refactor(web): rename director/ → app/, rescope CSS to .app-root

Pure rename in preparation for the responsive unified app.
No behavior changes; /d/* routes still serve the same screens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `Sidebar` component and `ResponsiveShell`

Extract a `<Sidebar>` component, refactor `<PhoneFrame>` into `<ResponsiveShell>` that includes both phone chrome and the sidebar, and add the desktop CSS that hides phone chrome (status bar / app bar / tab bar / drawer) at ≥1024px.

After this task, opening `/d/` at desktop width shows the sidebar on the left; phone chrome disappears. Below 1024px, behavior is unchanged.

**Files:**
- Create: `web/src/screens/app/Sidebar.tsx`
- Modify: `web/src/screens/app/Shell.tsx` — replace `PhoneFrame` with `ResponsiveShell`, re-export `PhoneFrame` as alias for backwards compat
- Modify: `web/src/screens/app/app.css` — add sidebar styles + desktop media query block
- Modify: `web/src/screens/app/{HomeScreen,FormsScreen,PillarsScreen,WeeklyScreen,ActivityScreen}.tsx` — swap `<PhoneFrame>` for `<ResponsiveShell active="...">`

- [ ] **Step 1: Create `Sidebar.tsx`**

`TabKey` already exists in `Shell.tsx` (the renamed `DirectorShell.tsx`). Don't redefine it — import it.

Write `web/src/screens/app/Sidebar.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { type TabKey } from './Shell';

const NAV_ROUTES: Record<TabKey, string> = {
  home: '/d/',
  forms: '/d/forms',
  pillars: '/d/pillars',
  weekly: '/d/weekly',
  activity: '/d/activity',
};

export const Sidebar = ({ active }: { active: TabKey }) => {
  const navigate = useNavigate();
  const goto = (key: TabKey) => () => navigate(NAV_ROUTES[key]);
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="crusade-eyebrow">Crusade</div>
        <h2 className="serif">
          Wa, <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>Ghana 2024</em>
        </h2>
        <div className="day">Day <b>58</b> of 84 · 26 days out</div>
      </div>
      <div className="sidebar-section">Director</div>
      <button type="button" className={'sidebar-item' + (active === 'home' ? ' on' : '')} onClick={goto('home')}>
        <span className="ico"><span className="gl-home"/></span>Home
      </button>
      <button type="button" className={'sidebar-item' + (active === 'forms' ? ' on' : '')} onClick={goto('forms')}>
        <span className="ico"><span className="gl-doc"/></span>Forms<span className="badge">3</span>
      </button>
      <button type="button" className={'sidebar-item' + (active === 'pillars' ? ' on' : '')} onClick={goto('pillars')}>
        <span className="ico"><span className="gl-pillars"/></span>Pillars
      </button>
      <button type="button" className={'sidebar-item' + (active === 'weekly' ? ' on' : '')} onClick={goto('weekly')}>
        <span className="ico"><span className="gl-cal"/></span>Weekly
      </button>
      <button type="button" className={'sidebar-item' + (active === 'activity' ? ' on' : '')} onClick={goto('activity')}>
        <span className="ico"><span className="gl-list"/></span>Activity log
      </button>
      <div className="sidebar-section">Crusade</div>
      <div className="sidebar-item"><span className="ico">◐</span>People</div>
      <div className="sidebar-item"><span className="ico">◇</span>Budget</div>
      <div className="sidebar-item"><span className="ico">⊟</span>Documents</div>
      <div className="sidebar-section" style={{ marginTop: 'auto' }}>Account</div>
      <div className="sidebar-item"><span className="ico">⊙</span>Settings</div>
      <div className="sidebar-item"><span className="ico">⤴</span>Sign out</div>
    </aside>
  );
};
```

Note: `NAV_ROUTES` will be updated to root paths in Task 8.

- [ ] **Step 2: Refactor `Shell.tsx` — add `ResponsiveShell`**

Replace the existing `PhoneFrame` export with `ResponsiveShell`. The shell takes an `active` prop and renders `<Sidebar>` next to the phone container. `TabKey` stays defined in `Shell.tsx` (Sidebar imports it from here).

At the top of `web/src/screens/app/Shell.tsx`, add a value import for Sidebar (the type-only `TabKey` is already defined locally):

```tsx
import { Sidebar } from './Sidebar';
```

Replace the existing `PhoneFrame` definition at the bottom of the file with:

```tsx
export const ResponsiveShell = ({
  active,
  children,
}: {
  active: TabKey;
  children: ReactNode;
}) => (
  <div className="app-root">
    <Sidebar active={active} />
    <div className="phone">{children}</div>
  </div>
);
```

Keep the existing `ReactNode` import at the top of the file untouched.

- [ ] **Step 3: Add sidebar CSS + desktop media query block to `app.css`**

Append the following block to the end of `web/src/screens/app/app.css`:

```css
/* ============================================================
   SIDEBAR (desktop only — hidden by default)
   ============================================================ */
.app-root .sidebar {
  display: none;
}

/* ============================================================
   DESKTOP REFLOW — sidebar visible, phone chrome hidden
   ============================================================ */
@media (min-width: 1024px) {
  .app-root {
    flex-direction: row;
    align-items: stretch;
    background: var(--bg);
  }

  .app-root .sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    flex-shrink: 0;
    background: var(--bg);
    border-right: 1px solid var(--line);
    height: 100dvh;
    position: sticky;
    top: 0;
    overflow-y: auto;
  }
  .app-root .sidebar-head {
    padding: 32px 24px 24px;
    border-bottom: 1px solid var(--line);
  }
  .app-root .sidebar-head .crusade-eyebrow {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 500;
    margin-bottom: 8px;
  }
  .app-root .sidebar-head h2 {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    font-weight: 300;
    letter-spacing: -0.03em;
    line-height: 1;
    margin-bottom: 6px;
  }
  .app-root .sidebar-head .day {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--ink-3);
  }
  .app-root .sidebar-head .day b { color: var(--accent); }
  .app-root .sidebar-section {
    padding: 16px 24px 6px;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 500;
  }
  .app-root .sidebar-item {
    padding: 10px 24px;
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 14px;
    color: var(--ink-2);
    font-weight: 500;
    letter-spacing: -0.005em;
    cursor: pointer;
    background: transparent;
    border: 0;
    text-align: left;
    width: 100%;
    font-family: inherit;
  }
  .app-root .sidebar-item.on {
    color: var(--ink);
    background: var(--bg-2);
    border-left: 2px solid var(--accent);
    padding-left: 22px;
  }
  .app-root .sidebar-item .ico {
    width: 22px; height: 22px;
    display: grid;
    place-items: center;
    color: var(--ink-3);
  }
  .app-root .sidebar-item.on .ico { color: var(--ink); }
  .app-root .sidebar-item .badge {
    margin-left: auto;
    background: var(--accent);
    color: var(--bg);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 999px;
    font-weight: 600;
  }

  /* Phone container becomes the main content pane */
  .app-root .phone {
    max-width: none;
    border-left: none;
    border-right: none;
    flex: 1;
    min-height: 100dvh;
  }

  /* Hide phone-only chrome at desktop */
  .app-root .statusbar,
  .app-root .app-bar,
  .app-root .tabbar,
  .app-root .drawer-overlay,
  .app-root .drawer {
    display: none !important;
  }

  /* Bottom padding (action bar still visible on Weekly) */
  .app-root .action-bar {
    position: relative;
  }
}
```

- [ ] **Step 4: Update each screen to use `ResponsiveShell` instead of `PhoneFrame`**

For each of the 5 screen files (`HomeScreen.tsx`, `FormsScreen.tsx`, `PillarsScreen.tsx`, `WeeklyScreen.tsx`, `ActivityScreen.tsx`):

a. Update the import line. Change:

```tsx
import { AppBar, Drawer, PhoneFrame, ..., StatusBar, TabBar } from './Shell';
```
to:
```tsx
import { AppBar, Drawer, ResponsiveShell, ..., StatusBar, TabBar } from './Shell';
```

b. Replace the JSX wrapper. Change:

```tsx
return (
  <PhoneFrame>
    <StatusBar/>
    <AppBar onMenu={() => setDrawer(true)}/>
    ...
    <TabBar active="home"/>
    {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
  </PhoneFrame>
);
```
to:
```tsx
return (
  <ResponsiveShell active="home">
    <StatusBar/>
    <AppBar onMenu={() => setDrawer(true)}/>
    ...
    <TabBar active="home"/>
    {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
  </ResponsiveShell>
);
```

The `active` prop value matches each screen: `home`, `forms`, `pillars`, `weekly`, `activity`. (`WeeklyScreen` doesn't currently render a TabBar — that's fine, the active prop only feeds the sidebar.)

- [ ] **Step 5: Remove `PhoneFrame` export and clean up `Shell.tsx`**

Once all 5 screens use `ResponsiveShell`, delete the now-unused `PhoneFrame` definition from `Shell.tsx` (don't leave a dead alias). Confirm:

```bash
grep -rn 'PhoneFrame' web/src
# Expected: no matches
```

- [ ] **Step 6: Verify typecheck and build pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 7: Manual viewport check at three widths**

Open `http://localhost:5173/d/`:
- DevTools → device toolbar → iPhone 14 (393×852). Visual: phone chrome (status bar, hamburger, bottom tab bar) — same as before.
- Resize to 820px. Same phone chrome, but content has more breathing room.
- Resize to 1280px. Sidebar appears on the left (240px), phone chrome disappears, content fills the rest. Sidebar nav reads "Home / Forms · 3 / Pillars / Weekly / Activity log". Active item ("Home") is highlighted.

Click each sidebar item — `/d/forms`, `/d/pillars`, etc. all navigate correctly and highlight the right item.

- [ ] **Step 8: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add web/src/screens/app
git commit -m "$(cat <<'EOF'
feat(web): add Sidebar + ResponsiveShell for desktop layout

Persistent left sidebar at >=1024px replaces the phone chrome
(status bar, app bar, bottom tab bar, drawer). Phone chrome still
renders in the DOM but is hidden via CSS at desktop. Below 1024px,
behavior is unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Home — desktop hero + 3-card grid

Phone layout untouched. At ≥1024px, the home screen reflows into a 2-column hero (greet + composite on left, pillar strip on right) followed by a 3-column grid (Forms due / Pillars at risk / Recent activity).

**Files:**
- Modify: `web/src/screens/app/HomeScreen.tsx` — wrap content blocks with desktop layout containers; add a "Pillars at risk" card
- Modify: `web/src/screens/app/app.css` — append desktop CSS rules for `.home-hero`, `.home-grid`, `.at-risk` card

- [ ] **Step 1: Wrap home content with desktop layout containers**

In `web/src/screens/app/HomeScreen.tsx`, restructure the `.scroll` body. The phone still sees a single column because the desktop wrappers only kick in at ≥1024px.

Change:

```tsx
<div className="scroll">
  <div className="greet">…</div>
  <div className="composite">…</div>
  <div className="pillar-strip">…</div>
  <div className="hr full"/>
  <div className="sec">…Due this week…</div>
  <div className="form-list">…</div>
  <div className="hr full"/>
  <div className="sec">…Recent activity…</div>
  <div className="activity">…</div>
  <div className="bot-pad"/>
</div>
```

to:

```tsx
<div className="scroll">
  <div className="home-hero">
    <div className="home-hero-l">
      <div className="greet">…</div>
      <div className="composite">…</div>
    </div>
    <div className="home-hero-r">
      <div className="pillar-strip">…</div>
    </div>
  </div>

  <div className="home-grid">
    <section className="home-card">
      <div className="sec">
        <h2 className="serif">Due <em>this week</em></h2>
        <span className="more">3 forms</span>
      </div>
      <div className="form-list">…three .form-row items…</div>
    </section>

    <section className="home-card">
      <div className="sec">
        <h2 className="serif">Pillars <em>at risk</em></h2>
        <span className="more">4 below 50%</span>
      </div>
      <div className="at-risk">
        {[...PILLARS].sort((a, b) => a.s - b.s).slice(0, 4).map((p, i) => (
          <div className="at-risk-row" key={i}>
            <span className="L serif">{p.l}</span>
            <span className="nm">{p.n}</span>
            <span className="pct">{p.s}<small>%</small></span>
          </div>
        ))}
      </div>
    </section>

    <section className="home-card">
      <div className="sec">
        <h2 className="serif">Recent <em>activity</em></h2>
        <span className="more">View all</span>
      </div>
      <div className="activity">…four .activity-item items…</div>
    </section>
  </div>

  <div className="bot-pad"/>
</div>
```

Move the existing markup blocks into their new wrappers — don't re-author them. Drop the two `<div className="hr full"/>` separators (the grid layout handles the visual separation).

The "Pillars at risk" card is new. It uses the existing `PILLARS` import from `Sidebar.tsx`. Import it at the top of the file:

```tsx
import { PILLARS } from './Shell';
```

(The `PILLARS` constant currently lives in `Shell.tsx`. Confirm the import path.)

- [ ] **Step 2: Append home desktop CSS**

Append to `web/src/screens/app/app.css`:

```css
/* ============================================================
   HOME — desktop reflow (>=1024px)
   ============================================================ */
@media (min-width: 1024px) {
  .app-root .home-hero {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 48px;
    padding: 8px 48px 24px;
    border-bottom: 1px solid var(--line);
    align-items: center;
  }
  .app-root .home-hero .greet { padding: 32px 0 16px; }
  .app-root .home-hero .greet h1 { font-size: 56px; }
  .app-root .home-hero .composite {
    border-top: none;
    border-bottom: none;
    padding: 16px 0 32px;
  }
  .app-root .home-hero .composite .num { font-size: 120px; }
  .app-root .home-hero .composite .num small { font-size: 42px; }
  .app-root .home-hero-r {
    align-self: stretch;
    display: flex;
    align-items: center;
  }
  .app-root .home-hero-r .pillar-strip {
    padding: 0;
    width: 100%;
  }
  .app-root .home-hero-r .pillar-strip .grid {
    gap: 4px;
  }
  .app-root .home-hero-r .pillar-strip .chip {
    height: 80px;
    font-size: 22px;
  }

  .app-root .home-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    padding: 32px 48px 48px;
  }
  .app-root .home-grid .home-card {
    border: 1px solid var(--line);
    background: var(--bg);
  }
  .app-root .home-grid .home-card .sec {
    padding: 20px 24px 12px;
  }
  .app-root .home-grid .home-card .form-list,
  .app-root .home-grid .home-card .activity,
  .app-root .home-grid .home-card .at-risk {
    padding: 0 24px 20px;
  }

  .app-root .at-risk-row {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid var(--line);
    align-items: center;
  }
  .app-root .at-risk-row:last-child { border-bottom: none; }
  .app-root .at-risk-row .L {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--ink-3);
  }
  .app-root .at-risk-row .nm {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  .app-root .at-risk-row .pct {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 300;
    color: var(--accent);
    letter-spacing: -0.03em;
  }
  .app-root .at-risk-row .pct small {
    font-size: 11px;
    color: var(--ink-3);
    font-weight: 400;
  }
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
```

- [ ] **Step 4: Manual viewport check**

Open `http://localhost:5173/d/`:
- 393px: identical to before — single-column phone layout.
- 1280px: see the wide hero (large 120pt 64% number on the left, big pillar strip on the right) above a 3-column grid showing Forms / Pillars at risk / Recent activity. Each card has a 1px border and 24px padding. Pillars-at-risk card lists E-House 30%, Workers 40%, Social 45%, Awareness 50% (the four lowest-scoring pillars from `PILLARS`).

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add web/src/screens/app/HomeScreen.tsx web/src/screens/app/app.css
git commit -m "$(cat <<'EOF'
feat(web): home desktop layout — editorial hero + 3-card grid

At >=1024px: 2-column hero (greet + composite on left, pillar strip
on right at hero scale) above a 3-column grid (Forms due, new Pillars
at risk card, Recent activity). Phone layout untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Forms — desktop 2-column card grid per category

Phone layout untouched. At ≥1024px, the form rows within each category lay out in a 2-column grid; the rows visually become cards (1px border around each).

**Files:**
- Modify: `web/src/screens/app/app.css` — append Forms desktop CSS

No structural change to `FormsScreen.tsx` — the existing markup (`.cat-group` + `.form-list` of `.form-row` children) is grid-friendly as-is.

- [ ] **Step 1: Append Forms desktop CSS**

Append to `web/src/screens/app/app.css`:

```css
/* ============================================================
   FORMS — desktop reflow (>=1024px)
   ============================================================ */
@media (min-width: 1024px) {
  .app-root .scroll > div:first-child {
    /* Forms hero header — wider padding */
    max-width: 1200px;
    margin: 0 auto;
  }
  .app-root .search {
    max-width: 1200px;
    margin: 24px auto 0;
  }
  .app-root .tabs {
    max-width: 1200px;
    margin: 24px auto 0;
    padding: 0 48px;
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 1;
  }
  .app-root .cat-group {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .app-root .cat-head {
    padding-top: 32px;
  }

  .app-root .form-list {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 48px 8px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 32px;
  }
  .app-root .form-list .form-row {
    border-bottom: 1px solid var(--line);
  }
}
```

The selector `.app-root .scroll > div:first-child` targets the inline-styled hero header in `FormsScreen.tsx`. If that's brittle, refactor to add an explicit class — but defer until the layout is confirmed working.

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
```

- [ ] **Step 3: Manual viewport check**

Open `http://localhost:5173/d/forms`:
- 393px: unchanged — single-column grouped lists.
- 1280px: hero "All intake forms" centered max-width 1200px. Search bar capped. Tabs sticky to top. Each category header full-width within the cap. Form rows lay out 2-up within each category — left column shows row 1, right column shows row 2, etc. Hairline at the bottom of each row visually separates them.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add web/src/screens/app/app.css
git commit -m "$(cat <<'EOF'
feat(web): forms hub desktop layout — 2-col grid per category

Header, search, tabs, and category groups cap at 1200px and center.
Form rows within each category lay out in a 2-column grid at >=1024px.
Phone layout untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Pillars — desktop 2-column grid

Phone layout untouched. At ≥1024px, the 13 pillar rows lay out in a 2-column grid with more whitespace.

**Files:**
- Modify: `web/src/screens/app/app.css` — append Pillars desktop CSS
- Modify: `web/src/screens/app/PillarsScreen.tsx` — wrap the mapped `.pillar-row` items in a container `.pillar-grid` so the grid styling has a clean parent

- [ ] **Step 1: Wrap pillar rows in `.pillar-grid` container**

In `web/src/screens/app/PillarsScreen.tsx`, change:

```tsx
{sorted.map((p, i) => {
  const dir = p.s - p.n7;
  return (
    <div className="pillar-row" key={i}>
      …
    </div>
  );
})}
<div className="bot-pad"/>
```

to:

```tsx
<div className="pillar-grid">
  {sorted.map((p, i) => {
    const dir = p.s - p.n7;
    return (
      <div className="pillar-row" key={i}>
        …
      </div>
    );
  })}
</div>
<div className="bot-pad"/>
```

Phone CSS continues to render `.pillar-row` items as a vertical stack (the wrapper has no styling at <1024px).

- [ ] **Step 2: Append Pillars desktop CSS**

Append to `web/src/screens/app/app.css`:

```css
/* ============================================================
   PILLARS — desktop reflow (>=1024px)
   ============================================================ */
@media (min-width: 1024px) {
  /* Pillars header (the inline-styled div before .chips) */
  .app-root .scroll > div:first-child {
    /* Targets the hero header on Pillars too — same shape as Forms */
    max-width: 1200px;
    margin: 0 auto;
  }
  .app-root .chips {
    max-width: 1200px;
    margin: 24px auto 0;
    padding: 0 48px;
  }

  .app-root .pillar-grid {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px 48px 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 48px;
  }
  .app-root .pillar-grid .pillar-row {
    padding: 22px 0;
  }
  .app-root .pillar-grid .pillar-row .nm {
    font-size: 16px;
  }
  .app-root .pillar-grid .pillar-row .pct {
    font-size: 28px;
  }
  .app-root .pillar-grid .pillar-row .L {
    font-size: 26px;
  }
}
```

The "Sorted: lowest first" sub-header sits inside `.scroll` between `.chips` and `.pillar-grid`. It will naturally span full width at desktop because its inline style isn't overridden — that's fine, the visual sits centered above the grid.

- [ ] **Step 3: Verify typecheck**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
```

- [ ] **Step 4: Manual viewport check**

Open `http://localhost:5173/d/pillars`:
- 393px: unchanged.
- 1280px: hero header centered. 13 pillar rows lay out in a 2-column grid with bigger letters, names, and percentages. The 2-up layout means E-House sits next to Worker Group Participation (the two lowest-scoring), CPC next to BOT, etc. Per-row hairline at the bottom of each row.

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add web/src/screens/app/PillarsScreen.tsx web/src/screens/app/app.css
git commit -m "$(cat <<'EOF'
feat(web): pillars desktop layout — 2-col grid

Wraps the 13 pillar rows in a .pillar-grid container that becomes
a 2-column CSS grid at >=1024px with larger type. Phone layout
untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Weekly — desktop 2-col rate cards + inline action bar

Phone layout untouched. At ≥1024px: rate cards lay out 2-up; narrative textareas lay out 3-up; action bar becomes inline at the bottom of the form (not sticky).

**Files:**
- Modify: `web/src/screens/app/WeeklyScreen.tsx` — wrap the rate cards in a `.rate-grid` container; wrap the three narrative `.field` elements in a `.narrative-grid` container
- Modify: `web/src/screens/app/app.css` — append Weekly desktop CSS

- [ ] **Step 1: Wrap rate cards in `.rate-grid`**

In `web/src/screens/app/WeeklyScreen.tsx`, change the rate-card map block from:

```tsx
{PILLARS.slice(0, 6).map((p, i) => {
  …
  return (
    <div className="rate-card" key={i}>
      …
    </div>
  );
})}
```
to:
```tsx
<div className="rate-grid">
  {PILLARS.slice(0, 6).map((p, i) => {
    …
    return (
      <div className="rate-card" key={i}>
        …
      </div>
    );
  })}
</div>
```

- [ ] **Step 2: Wrap narrative fields in `.narrative-grid`**

In the same file, find the `.fields` block containing the three narrative textareas. Change:

```tsx
<div className="fields" style={{ paddingTop: 0 }}>
  <div className="field">…win…</div>
  <div className="field">…blocker…</div>
  <div className="field">…ask…</div>
</div>
```
to:
```tsx
<div className="fields narrative-grid" style={{ paddingTop: 0 }}>
  <div className="field">…win…</div>
  <div className="field">…blocker…</div>
  <div className="field">…ask…</div>
</div>
```

(Just adds the `narrative-grid` class alongside the existing `fields` class.)

- [ ] **Step 3: Append Weekly desktop CSS**

Append to `web/src/screens/app/app.css`:

```css
/* ============================================================
   WEEKLY — desktop reflow (>=1024px)
   ============================================================ */
@media (min-width: 1024px) {
  .app-root .weekly-head {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 48px;
  }
  .app-root .weekly-head .week { font-size: 42px; }

  .app-root .rate-grid {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px 48px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 48px;
  }
  .app-root .rate-grid .rate-card {
    padding: 22px 0;
  }

  .app-root .narrative-grid {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 48px 24px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0 32px;
  }
  .app-root .narrative-grid .field {
    border-bottom: none;
  }

  /* "+ 7 more pillars" callout + Narrative heading wrapper centering */
  .app-root .scroll > div:not(.weekly-head):not(.rate-grid):not(.narrative-grid):not(.bot-pad) {
    max-width: 1200px;
    margin: 0 auto;
  }

  .app-root .action-bar {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 48px;
  }
}
```

- [ ] **Step 4: Verify typecheck**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
```

- [ ] **Step 5: Manual viewport check**

Open `http://localhost:5173/d/weekly`:
- 393px: unchanged. Action bar still appears at the bottom of the phone (the parent `.phone` is still flex column with `.action-bar` after `.scroll`).
- 1280px: header capped at 1200px. Six rate cards lay out 2-up (3 rows × 2 cols). The "+ 7 more pillars" callout and the "Narrative notes" heading both center within the 1200px cap. The three narrative textareas lay out 3-up (one row of three). Action bar appears at the bottom (post-scroll), not sticky — Save / Submit buttons sit on the right.

Try clicking ratings — they update live as before.

- [ ] **Step 6: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add web/src/screens/app/WeeklyScreen.tsx web/src/screens/app/app.css
git commit -m "$(cat <<'EOF'
feat(web): weekly desktop layout — 2-col rate cards, 3-col narrative

Rate cards lay out 2-up; narrative textareas lay out 3-up so all
three reflections sit side-by-side. Action bar becomes inline at the
bottom of the form (not sticky) at >=1024px. Phone layout untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Activity — desktop centered single-column timeline

Phone layout untouched. At ≥1024px, the activity log stays single-column but caps at max-width 760px and centers — reads like a long-form editorial timeline.

**Files:**
- Modify: `web/src/screens/app/app.css` — append Activity desktop CSS

No structural change to `ActivityScreen.tsx` needed; the existing `.activity-log` parent is enough.

- [ ] **Step 1: Append Activity desktop CSS**

Append to `web/src/screens/app/app.css`:

```css
/* ============================================================
   ACTIVITY — desktop reflow (>=1024px)
   ============================================================ */
@media (min-width: 1024px) {
  .app-root .activity-log {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 24px;
  }
  /* The chips row above the log gets the same cap so it visually aligns */
  .app-root .scroll > .chips {
    max-width: 760px;
    margin: 12px auto 0;
    padding-left: 24px;
    padding-right: 24px;
  }
  /* Day-head bands span full content width within the cap */
  .app-root .activity-log .day-head {
    margin: 0 -24px;
    padding-left: 24px;
    padding-right: 24px;
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
```

- [ ] **Step 3: Manual viewport check**

Open `http://localhost:5173/d/activity`:
- 393px: unchanged.
- 1280px: hero "Activity log" sits at top (it inherits the same wide centering from the Forms/Pillars rule because of the `.scroll > div:first-child` selector — that's intended). Filter chips center at max-width 760px. The activity log itself is a narrow centered column with day-head bands as visual dividers. Reads like an editorial timeline.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add web/src/screens/app/app.css
git commit -m "$(cat <<'EOF'
feat(web): activity log desktop layout — centered timeline

Activity log caps at max-width 760px and centers at >=1024px.
Reads as a long-form editorial timeline rather than a wide list.
Phone layout untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Restructure routes to root + add `Placeholder`

Move all screens to root paths, add backwards-compat redirects from `/m/*` and `/d/*`, and add a minimal `Placeholder` screen for parked features (Pastors, Quick log, Pillar drill-down, sidebar destinations).

**Files:**
- Create: `web/src/screens/app/Placeholder.tsx`
- Modify: `web/src/screens/app/Sidebar.tsx` — update `NAV_ROUTES` to root paths
- Modify: `web/src/App.tsx` — full route restructure

- [ ] **Step 1: Create `Placeholder.tsx`**

Write `web/src/screens/app/Placeholder.tsx`:

```tsx
import { ResponsiveShell, type TabKey } from './Shell';
import './app.css';

export const Placeholder = ({ title, active }: { title: string; active?: TabKey }) => (
  <ResponsiveShell active={active ?? 'home'}>
    <div className="scroll">
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          Coming soon
        </div>
        <h1
          className="serif"
          style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.05 }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.5 }}>
          This screen isn't built yet. Check back later.
        </p>
      </div>
    </div>
  </ResponsiveShell>
);
```

The shell's `Sidebar` and phone chrome both render even on placeholder pages so navigation stays consistent.

Note: the shell expects an `active` prop. `Placeholder` defaults to `'home'` if not passed, but for sidebar destinations like `/people`, `/budget`, `/documents`, `/settings`, no sidebar item should highlight. Cast to `'home'` is a pragmatic compromise; if needed, extend `TabKey` later. For now, the active highlight on Home for unrelated placeholder routes is a known minor — acceptable.

- [ ] **Step 2: Update `NAV_ROUTES` in `Sidebar.tsx` to root paths**

In `web/src/screens/app/Sidebar.tsx`, change `NAV_ROUTES` to:

```tsx
const NAV_ROUTES: Record<TabKey, string> = {
  home: '/',
  forms: '/forms',
  pillars: '/pillars',
  weekly: '/weekly',
  activity: '/activity',
};
```

The same constant exists in `Shell.tsx`'s `TabBar` and `Drawer` definitions. Update those too — find:

```tsx
const TAB_ROUTES: Record<TabKey, string> = {
  home: '/d/',
  forms: '/d/forms',
  pillars: '/d/pillars',
  weekly: '/d/weekly',
  activity: '/d/activity',
};
```

and replace with:

```tsx
const TAB_ROUTES: Record<TabKey, string> = {
  home: '/',
  forms: '/forms',
  pillars: '/pillars',
  weekly: '/weekly',
  activity: '/activity',
};
```

- [ ] **Step 3: Restructure `App.tsx`**

Replace the entirety of `web/src/App.tsx` with:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { HomeScreen } from './screens/app/HomeScreen';
import { FormsScreen } from './screens/app/FormsScreen';
import { PillarsScreen } from './screens/app/PillarsScreen';
import { WeeklyScreen } from './screens/app/WeeklyScreen';
import { ActivityScreen } from './screens/app/ActivityScreen';
import { Placeholder } from './screens/app/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Real screens at root */}
      <Route path="/" element={<RequireAuth><HomeScreen /></RequireAuth>} />
      <Route path="/forms" element={<RequireAuth><FormsScreen /></RequireAuth>} />
      <Route path="/pillars" element={<RequireAuth><PillarsScreen /></RequireAuth>} />
      <Route path="/weekly" element={<RequireAuth><WeeklyScreen /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><ActivityScreen /></RequireAuth>} />

      {/* Parked features per spec decision #5 */}
      <Route path="/log" element={<RequireAuth><Placeholder title="Quick log" /></RequireAuth>} />
      <Route path="/pastors" element={<RequireAuth><Placeholder title="Pastors directory" /></RequireAuth>} />
      <Route path="/pastors/:id" element={<RequireAuth><Placeholder title="Pastor profile" /></RequireAuth>} />
      <Route path="/pillars/:code" element={<RequireAuth><Placeholder title="Pillar detail" /></RequireAuth>} />

      {/* Sidebar destinations */}
      <Route path="/people" element={<RequireAuth><Placeholder title="People" /></RequireAuth>} />
      <Route path="/budget" element={<RequireAuth><Placeholder title="Budget" /></RequireAuth>} />
      <Route path="/documents" element={<RequireAuth><Placeholder title="Documents" /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Placeholder title="Settings" /></RequireAuth>} />

      {/* Backwards-compat redirects */}
      <Route path="/m/" element={<Navigate to="/" replace />} />
      <Route path="/m/powers" element={<Navigate to="/pillars" replace />} />
      <Route path="/m/powers/:code" element={<Navigate to="/pillars/:code" replace />} />
      <Route path="/m/pastors" element={<Navigate to="/pastors" replace />} />
      <Route path="/m/pastors/:id" element={<Navigate to="/pastors/:id" replace />} />
      <Route path="/m/log" element={<Navigate to="/log" replace />} />
      <Route path="/m/assessment" element={<Navigate to="/weekly" replace />} />
      <Route path="/m/activity" element={<Navigate to="/activity" replace />} />
      <Route path="/m/more" element={<Navigate to="/" replace />} />
      <Route path="/d/" element={<Navigate to="/" replace />} />
      <Route path="/d/forms" element={<Navigate to="/forms" replace />} />
      <Route path="/d/pillars" element={<Navigate to="/pillars" replace />} />
      <Route path="/d/weekly" element={<Navigate to="/weekly" replace />} />
      <Route path="/d/activity" element={<Navigate to="/activity" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

Note: the `/m/powers/:code` → `/pillars/:code` redirect: React Router's `<Navigate>` doesn't substitute path params. The simplest solution: for now, redirect to `/pillars` (drops the code). If a code-preserving redirect matters, refactor to a tiny component using `useParams` later. Acceptable since `/m/powers/:code` was rarely-bookmarked detail pages and the destination is a placeholder anyway. Same principle applies to `/m/pastors/:id`.

To keep the redirects honest, simplify those two:

```tsx
<Route path="/m/powers/:code" element={<Navigate to="/pillars" replace />} />
<Route path="/m/pastors/:id" element={<Navigate to="/pastors" replace />} />
```

Update the JSX above to drop the `:code`/`:id` from the destination strings.

- [ ] **Step 4: Verify typecheck**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
```

You'll see TypeScript warnings about unused imports for the deleted route components (`MissionControlMobile`, etc.) — no, you've removed those imports above. Verify by reading the file.

- [ ] **Step 5: Manual viewport check**

- `http://localhost:5173/` → loads Home (the new editorial design). Sidebar at desktop, phone chrome at <1024px.
- `http://localhost:5173/forms` → Forms hub.
- `http://localhost:5173/d/` → redirects to `/`. Confirm in DevTools network tab.
- `http://localhost:5173/m/` → redirects to `/`.
- `http://localhost:5173/pastors` → Placeholder "Pastors directory" with sidebar/chrome around it.

- [ ] **Step 6: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add web/src/App.tsx web/src/screens/app/Sidebar.tsx web/src/screens/app/Shell.tsx web/src/screens/app/Placeholder.tsx
git commit -m "$(cat <<'EOF'
feat(web): root routes + Placeholder for parked features

All real screens move to root paths (/, /forms, /pillars, /weekly,
/activity). Parked features (pastors, log, pillar detail, sidebar
destinations) render a Placeholder. Backwards-compat redirects from
/m/* and /d/* preserve existing bookmarks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Delete retired files + remove old CSS imports

Delete `MissionControl.tsx`, all of `screens/mobile/`, retired components, and the old global stylesheets. Drop the `import './styles.css'` and `import './mobile.css'` lines from `main.tsx`.

**Files:**
- Delete: `web/src/screens/MissionControl.tsx`
- Delete: `web/src/screens/mobile/` (entire directory, 8 files)
- Delete: `web/src/components/Shell.tsx`
- Delete: `web/src/components/MobileShell.tsx`
- Delete: `web/src/components/PaveDonut.tsx`
- Delete: `web/src/components/MaybeMobileRedirect.tsx`
- Delete: `web/src/styles.css`
- Delete: `web/src/mobile.css`
- Modify: `web/src/main.tsx` — remove the two CSS imports

- [ ] **Step 1: Verify nothing imports the targets**

```bash
cd /Users/adebimpegodwin/Projects/hjc
grep -rn "from '\.\./screens/MissionControl\|from '\.\./screens/mobile/\|from '\.\./components/Shell\|from '\.\./components/MobileShell\|from '\.\./components/PaveDonut\|from '\.\./components/MaybeMobileRedirect" web/src
# Expected: no matches
grep -rn "import './styles.css'\|import './mobile.css'" web/src
# Expected: only main.tsx
```

If anything else imports these, stop and investigate before deleting.

- [ ] **Step 2: Delete the files**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git rm web/src/screens/MissionControl.tsx
git rm -r web/src/screens/mobile
git rm web/src/components/Shell.tsx
git rm web/src/components/MobileShell.tsx
git rm web/src/components/PaveDonut.tsx
git rm web/src/components/MaybeMobileRedirect.tsx
git rm web/src/styles.css
git rm web/src/mobile.css
```

- [ ] **Step 3: Drop CSS imports from `main.tsx`**

In `web/src/main.tsx`, remove these two lines:

```tsx
import './styles.css';
import './mobile.css';
```

The remaining imports are `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `./auth/AuthProvider`, `./App`. The app's only stylesheet is now `web/src/screens/app/app.css`, imported by each screen.

- [ ] **Step 4: Verify typecheck and full build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit code 0
npm run build
# Expected: build succeeds, no warnings about missing modules
```

- [ ] **Step 5: Final manual viewport sweep**

Open `http://localhost:5173/`. Verify each route at three widths (393, 820, 1280):

| Route | 393px | 820px | 1280px |
|---|---|---|---|
| `/` | phone home | wider single-col | hero + 3-card grid |
| `/forms` | phone forms | wider single-col | 2-col grid per category |
| `/pillars` | phone pillars | wider single-col | 2-col pillar grid |
| `/weekly` | phone weekly + sticky action bar | wider single-col | 2-col rate cards + 3-col narrative + inline action bar |
| `/activity` | phone activity | wider single-col | centered 760px timeline |
| `/pastors` | placeholder + phone chrome | placeholder | placeholder + sidebar |

No console errors at any viewport. Sidebar nav at 1280px highlights the correct active item. Sidebar items navigate. `/d/forms` redirects to `/forms`.

- [ ] **Step 6: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc
git add -A web/src
git commit -m "$(cat <<'EOF'
chore(web): retire MissionControl, mobile/*, and global stylesheets

The unified responsive app (HomeScreen + FormsScreen + PillarsScreen +
WeeklyScreen + ActivityScreen under screens/app/) replaces the old
desktop MissionControl and the mobile companion screens. Their
components, helpers, and global stylesheets (styles.css, mobile.css)
are deleted. main.tsx no longer imports them; the only stylesheet
left is screens/app/app.css.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**Spec coverage:** every spec section maps to a task — file reorganization (Tasks 1, 8, 9), Sidebar + ResponsiveShell (Task 2), per-screen reflow (Tasks 3–7), routes (Task 8), retired files (Task 9), Placeholder for parked features (Task 8).

**Type consistency:** `TabKey` is defined once in `Sidebar.tsx`, re-exported from `Shell.tsx`. `ResponsiveShell` accepts `{ active: TabKey, children: ReactNode }` consistently.

**Known minor (acknowledged in plan):** `Placeholder` accepts `active?: TabKey` defaulting to `'home'`, so sidebar items unrelated to the visited placeholder route (e.g., `/people`) will visually highlight Home. Acceptable for first pass; can extend `TabKey` later if desired.

**Path-param redirects (acknowledged in plan):** `/m/powers/:code` redirects to `/pillars` (parent), not `/pillars/:code`, because `<Navigate>` doesn't substitute params. Same for `/m/pastors/:id`. Both destinations are placeholders so functional impact is nil.
