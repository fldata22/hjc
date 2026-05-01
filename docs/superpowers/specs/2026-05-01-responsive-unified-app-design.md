# Responsive Unified App — Design Spec

**Date:** 2026-05-01
**Status:** Approved, ready for implementation plan

## Goal

Collapse the three current interface surfaces — desktop `MissionControl` (`/`), mobile companion (`/m/...`), and the new editorial director screens (`/d/...`) — into a single responsive web app under one root URL space.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Scope | **C.** Fold everything (existing desktop + mobile + new director screens) into one responsive site under one URL space. |
| 2 | Visual language | **A.** New editorial design wins (Playfair Display + Montserrat + JetBrains Mono, white background, single red accent `#d71921`, 1px hairlines). Old `styles.css` and `mobile.css` are retired. |
| 3 | Desktop chrome | **A.** Persistent left sidebar (~240px) replaces drawer + bottom tab bar at desktop. |
| 4 | Route structure | **A.** Flat at root (`/`, `/forms`, `/pillars`, `/weekly`, `/activity`). Old `/m/*` and `/d/*` redirect. |
| 5 | Existing mobile-only features (PowerDetail, Pastors, Pastor profile, Quick log) | **B.** Park as `Coming soon` placeholders. Migration is follow-up work. |
| 6 | Home desktop layout | **B.** 3-zone editorial hero + 3-card grid below. |
| 7 | Other 4 screens at desktop | **A.** Conservative reflow — Forms / Pillars / Weekly become 2-col grids; Activity stays single-column timeline (max-width ~760px, centered); inline action bar (not sticky). |
| 8 | Data wiring | **B.** Keep mock data from current `/d/` screens. API wiring is follow-up. |

## Breakpoints

| Range | Label | Chrome | Content |
|---|---|---|---|
| `<768px` | Phone | Status bar, app bar (hamburger), bottom tab bar, drawer for full nav | Single column (current `/d/` behavior) |
| `768–1023px` | Tablet | Same as phone (hamburger + bottom tab bar) | Single column, wider with more breathing room |
| `≥1024px` | Desktop | Persistent left sidebar (~240px). No status bar, no app bar, no bottom tab bar | Multi-column layouts per screen (see below) |

The status bar (the iOS-style 9:41 / 5G / battery row) is phone/tablet only — it disappears entirely at desktop, where it would feel out of place.

## Architecture

### Components

**`<ResponsiveShell active="home">`** — replaces the current `<PhoneFrame>`. One component handles both layouts:

- Below 1024px: renders `<StatusBar />`, `<AppBar />`, the children inside a `.scroll` container, `<TabBar active={active} />`, and conditionally a `<Drawer />`.
- At ≥1024px: renders `<Sidebar active={active} />` on the left and the children inside a `.app-main` container on the right. No status bar, no app bar, no tab bar, no drawer.

CSS handles the visibility switch via `@media (min-width: 1024px)`. The shell does not return different JSX trees per viewport — both sets of chrome render, and CSS hides whichever doesn't apply. This keeps the React tree stable across resize.

**`<Sidebar active="home">`** — new component. Anatomy top-to-bottom:

- Eyebrow `Crusade`
- Crusade name as Playfair italic: `Wa, Ghana 2024`
- Day counter (mono): `Day 58 of 84 · 26 days out` (matches the existing drawer head)
- Section header `Director` → Home, Forms (with badge `3`), Pillars, Weekly, Activity log
- Section header `Crusade` → People, Budget, Documents (placeholders)
- Section header `Account` → Settings, Sign out

Reuses CSS classes from the existing `.drawer-*` styles (drawer is essentially a sidebar that overlays at phone width); we add `.sidebar` styles that share most rules.

**`<Placeholder title="...">`** — minimal "Coming soon" component for parked routes. Renders inside `<ResponsiveShell>` so navigation chrome is consistent.

### Routes

```
/                    Home
/forms               Forms hub
/pillars             Pillars
/weekly              Weekly assessment
/activity            Activity log

# Sidebar destinations (parked)
/people              Placeholder
/budget              Placeholder
/documents          Placeholder
/settings            Placeholder

# Existing functionality parked per decision #5
/log                 Placeholder (was /m/log)
/pastors             Placeholder (was /m/pastors)
/pastors/:id         Placeholder (was /m/pastors/:id)
/pillars/:code       Placeholder (was /m/powers/:code)

# Auth
/login               unchanged

# Backwards-compat redirects so existing bookmarks survive
/m/                  → /
/m/powers            → /pillars
/m/powers/:code      → /pillars/:code
/m/pastors           → /pastors
/m/pastors/:id       → /pastors/:id
/m/log               → /log
/m/assessment        → /weekly
/m/activity          → /activity
/m/more              → /
/d/                  → /
/d/forms             → /forms
/d/pillars           → /pillars
/d/weekly            → /weekly
/d/activity          → /activity

# Catch-all
*                    → / (existing behavior)
```

### File reorganization

**Renames:**
- `web/src/screens/director/` → `web/src/screens/app/`
- `web/src/screens/director/director.css` → `web/src/screens/app/app.css` (scoped under `.app-root`, replacing `.d-root`)
- `web/src/screens/director/DirectorShell.tsx` → `web/src/screens/app/Shell.tsx` (now exports `ResponsiveShell` instead of `PhoneFrame`)

**New files:**
- `web/src/screens/app/Sidebar.tsx`
- `web/src/screens/app/Placeholder.tsx`

**Deleted files:**
- `web/src/screens/MissionControl.tsx`
- `web/src/screens/mobile/MissionControlMobile.tsx`
- `web/src/screens/mobile/PowersListMobile.tsx`
- `web/src/screens/mobile/PowerDetailMobile.tsx`
- `web/src/screens/mobile/PastorsDirectoryMobile.tsx`
- `web/src/screens/mobile/PastorProfileMobile.tsx`
- `web/src/screens/mobile/QuickLogMobile.tsx`
- `web/src/screens/mobile/WeeklyAssessmentMobile.tsx`
- `web/src/screens/mobile/ActivityLogMobile.tsx`
- `web/src/components/Shell.tsx`
- `web/src/components/MobileShell.tsx`
- `web/src/components/PaveDonut.tsx`
- `web/src/components/MaybeMobileRedirect.tsx`
- `web/src/styles.css`
- `web/src/mobile.css`
- `web/src/screens/mobile/` directory (after files removed)

**Modified:**
- `web/src/App.tsx` — full route restructure per the routes table above
- `web/src/main.tsx` — drop the `import './styles.css'` and `import './mobile.css'` lines (only `app.css` remains, imported by screens)
- The 5 screen files (`HomeScreen`, `FormsScreen`, `PillarsScreen`, `WeeklyScreen`, `ActivityScreen`) — wrap children in `<ResponsiveShell>`, add desktop layout markup where needed (see per-screen sections)

## Per-screen reflow

Each screen keeps its phone layout exactly as built today. Desktop layouts are added via additional markup wrapped in CSS classes that only activate at `@media (min-width: 1024px)`.

### Home

**Phone:** unchanged from current `/d/`.

**Desktop (≥1024px):**

```
┌─────────────────────────────────────────────────────────────────┐
│  WED · 30 APR · DAY 58 / 84                                      │
│                                                                   │
│  Good morning,                  │  P P P P P P P P A V E D D       │
│  Bishop Lovell.                 │  ▓ ▓ ▓ ▓ ▓ ▓ ▓ ░ ░ ▓ ░ ▓ ░       │
│                                  │                                  │
│  3 forms due this week.          │  13 PILLARS · READINESS         │
│  Composite held at 64%, +4 pts.  │                                  │
│                                  │                                  │
│  64%   +4 pts vs last week       │                                  │
│        5 of 13 on track          │                                  │
│  ───────────────────────  64%    │                                  │
└─────────────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────┬─────────────────────────┐
│ DUE THIS WEEK    │ PILLARS AT RISK  │ RECENT ACTIVITY         │
│ Weekly W8 · 2D   │ E-House  30%     │ 2H · 3 PCMs verified    │
│ BOT Roster · 4D  │ Workers  40%     │ YEST · Week 7 submitted │
│ Awareness · 5D   │ Social   45%     │ 2D · Mayor visit won    │
│                  │ Awareness 50%    │ 3D · 4 fathers added    │
└──────────────────┴──────────────────┴─────────────────────────┘
```

- Hero is a 2-column CSS grid: left column ~58% (greet + composite), right column ~42% (pillar strip).
- Pillar strip on desktop scales to fill its column (chips become taller / wider) but uses the same 13-cell grid.
- The "Due this week" + "Recent activity" sections that currently scroll below collapse into a 3-column CSS grid where the third card is "Pillars at risk" (a new card showing the bottom 4 pillars sorted by score, derived from the existing `PILLARS` constant).
- Existing markup is reused: `.greet`, `.composite`, `.pillar-strip`, `.form-list`, `.activity` blocks. Desktop adds container classes (`.home-hero`, `.home-grid`) that apply CSS Grid only ≥1024px.

### Forms

**Phone:** unchanged.

**Desktop:**

- Hero header + search + sticky horizontal `.tabs` span the full content width.
- Inside each `.cat-group`: the `.cat-head` row stays full-width; the `.form-list` underneath becomes a 2-column CSS grid of `.form-row` cards. Hairline bottom-borders become full card borders so the grid reads as cards rather than a broken list.

### Pillars

**Phone:** unchanged.

**Desktop:**

- Hero header + filter chips + sort label full-width.
- 13 `.pillar-row` items lay out in a 2-column CSS grid. Each row gets more padding around bar + percentage to use the available space without distorting type sizes.

### Weekly

**Phone:** unchanged.

**Desktop:**

- `.weekly-head` (eyebrow + "Week 8 readiness" + progress bar) full-width.
- The 6 visible `.rate-card` items lay out in a 2-column grid.
- "+ 7 more pillars" callout spans full content width.
- "Narrative notes" section: heading full-width, then the 3 `.field` textareas in a 3-column grid (so all three reflections sit side-by-side).
- `.action-bar` becomes inline at the bottom of the form, not sticky. (`position: sticky; bottom: 0` is removed at desktop.)

### Activity

**Phone:** unchanged.

**Desktop:**

- Hero header + filter chips + activity log all centered with `max-width: 760px` and `margin: 0 auto`.
- `.day-head` bands keep full-width inside that 760px column.
- Reads as a long-form editorial timeline rather than a multi-column dashboard. Matches decision #7's preference for editorial restraint.

## Implementation order (suggested)

1. Add `Sidebar.tsx`, `Placeholder.tsx`, refactor `DirectorShell.tsx` → `Shell.tsx` exposing `ResponsiveShell`.
2. Rename `director/` → `app/`, swap CSS scope `.d-root` → `.app-root`.
3. Wire desktop chrome (sidebar, hide phone chrome at ≥1024px) — verify in browser at 1280px width.
4. Update each of the 5 screen components: wrap content in `<ResponsiveShell>`, add desktop-only markup blocks for Home's hero/grid and Pillars-at-risk card.
5. Add desktop CSS rules per screen (`.home-hero`, `.home-grid`, `.forms-grid`, `.pillars-grid`, `.weekly-grid`, `.activity-narrow`).
6. Restructure `App.tsx` routes: real screens at root, redirects from `/m/*` and `/d/*`, placeholders for parked features.
7. Delete retired files; remove `styles.css` / `mobile.css` imports from `main.tsx`.
8. Build + typecheck pass; manual verify all 5 screens at phone (393), tablet (820), desktop (1280) widths.

## Non-goals

- Real API wiring (mock data stays).
- Form-fill detail screens (Forms hub items don't navigate yet).
- Migrating Pastors / Power detail / Quick log functionality — placeholders only.
- Loading / error / empty states — not relevant with mock data.
- Animation polish, theme switching, accessibility audit.
- Tablet does not get its own dedicated layout — it uses phone chrome at wider width; only desktop gets the sidebar + multi-column reflow.
- Marketing pages, public landing, anything outside the authenticated app.

## Open follow-ups (post-implementation)

- Wire `useMissionControl()` / `usePillars()` etc. into the 5 screens (replaces hardcoded `PILLARS` mock).
- Build form-fill detail screens for the Forms hub.
- Migrate Pastors directory + profile to the editorial design.
- Migrate Quick log capture to the editorial design.
- Migrate Pillar drill-down (`/pillars/:code`) to the editorial design.
