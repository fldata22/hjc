---
date: 2026-04-25
status: approved
phase: frontend mobile companion (8 screens)
---

# HJC Mission Control — Mobile Companion Design

## Goal

Add the 8-screen mobile companion to the existing Vite app at `~/Projects/hjc/web/`, alongside the desktop. Same backend API, same auth, separate route tree under `/m/*`. Phone users get auto-redirected to `/m/` from `/`.

Ship matches the hi-fi mobile design that just landed (`docs/superpowers/reference-mobile-hifi/`):
- DM.1 Mission control · DM.2 14 PAVEDDD powers · DM.3 Power detail (Awareness)
- DM.4 Pastors directory · DM.5 Pastor profile
- DM.6 Quick log · DM.7 Weekly assessment · DM.8 Activity log

## Architecture

- **Stack:** unchanged (Vite + React 18 + TS + React Router + TanStack Query). Same app, same auth, same API client.
- **Routing:**
  - `/` — desktop Mission Control (unchanged)
  - `/m/` — mobile Mission Control (DM.1)
  - `/m/powers`, `/m/powers/:code`, `/m/pastors`, `/m/pastors/:id`, `/m/log`, `/m/assessment`, `/m/activity` — other mobile screens
  - **Auto-redirect:** A small `<MaybeMobileRedirect>` wrapper on `/` checks `window.matchMedia('(max-width: 768px)').matches` once on mount; if true, redirects to `/m/`. Desktop is unaffected. Mobile users get the right view but can manually visit `/` if they want desktop on a tablet etc.
- **Mobile shell:** Sticky `TopBar` (with brand mark, eyebrow, title, back button when nested), bottom `TabBar` (5 tabs: Home / Powers / Quick log (center FAB) / Pastors / More), `Phone` wrapper for content area.
- **Brand:** Change the `P` mark in TopBar to `H` (template ships as `P` for Poimen — fix to `H` for HJC).

## File structure (additions to web/)

```
web/src/
├── mobile.css                          # verbatim copy of hifi-mobile/styles.css
├── components/
│   ├── MobileShell.tsx                 # ported from hifi-mobile/shell.jsx
│   │                                   #   exports: Phone, TopBar, TabBar, MobileIcon
│   └── MaybeMobileRedirect.tsx         # viewport-based redirect on `/`
└── screens/mobile/
    ├── MissionControlMobile.tsx        # DM.1
    ├── PowersListMobile.tsx            # DM.2
    ├── PowerDetailMobile.tsx           # DM.3 (template: Awareness; reused for any power)
    ├── PastorsDirectoryMobile.tsx      # DM.4
    ├── PastorProfileMobile.tsx         # DM.5
    ├── QuickLogMobile.tsx              # DM.6
    ├── WeeklyAssessmentMobile.tsx      # DM.7
    └── ActivityLogMobile.tsx           # DM.8
```

Modified files:
- `App.tsx` — add `/m/*` routes wrapped in `<RequireAuth>`. Add `<MaybeMobileRedirect>` on `/`.
- `main.tsx` — also import `mobile.css`.
- `api/hooks.ts` — add `usePowers()`, `usePowerByCode()`, `usePastors()`, `usePastor(id)`, `useActivityEntries()`, `useWeeklyLatest()`, `useAwarenessTrajectory()` plus mutation hooks for `useCreateActivityEntry()`, `useReplaceReadings()`, `useReplaceRisks()`.

## Data wiring per screen

| Screen | API |
|---|---|
| DM.1 Mission control | `useMissionControl()` (existing) |
| DM.2 14 PAVEDDD powers | `usePowers()` + `useWeeklyLatest()` (merge readings into power list) |
| DM.3 Power · Awareness | `useAwarenessTrajectory()` for the trajectory chart; `usePowerByCode('awareness')` for metadata. Generic enough to reuse for other powers later. |
| DM.4 Pastors directory | `usePastors()` (filter/search params from local state) |
| DM.5 Pastor profile | `usePastor(id)` with embedded identifications + pledge totals |
| DM.6 Quick log | `useCreateActivityEntry()` mutation; on success, navigate back |
| DM.7 Weekly assessment | `useWeeklyLatest()` + `useReplaceReadings()` + `useReplaceRisks()` mutations |
| DM.8 Activity log | `useActivityEntries()` (paginated) |

## Auto-redirect logic

`MaybeMobileRedirect` (rendered as the parent of the desktop Mission Control route on `/`):

```tsx
function MaybeMobileRedirect({ children }: { children: React.ReactNode }) {
  const [shouldRedirect] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  if (shouldRedirect) return <Navigate to="/m/" replace />;
  return <>{children}</>;
}
```

One-shot check on mount — no resize listener (we don't want to redirect mid-session if someone resizes their browser window narrow).

## Desktop placeholder routes (unchanged)

The existing 12 placeholder desktop routes (`/powers`, `/pastors`, etc.) stay as-is. They show "Coming soon" until ported. Mobile companion fills the gap for now: a director on phone can do most of the daily work via `/m/*` even though desktop counterparts are placeholders.

## Out of scope

- Push/pop transitions (use plain `<Link>` / `useNavigate`)
- Pull-to-refresh
- Haptics
- Swipe gestures
- Service worker / offline / PWA install prompt
- Native app shell (this is a mobile WEB companion)
- Loading skeletons (simple "Loading…" is fine for POC)
- Toasts (use plain inline error/success messages)
- Dark mode
- Frontend tests (Vitest can come later)

## Testing approach

Manual smoke per screen in a browser at narrow viewport (Chrome DevTools device toolbar set to iPhone 14 / 390×844). Same backend (`php artisan serve --port=8001`). Same dev server (`npm run dev`).

For each of the 8 screens: navigate to it, verify:
- Layout matches the hi-fi (no broken styles)
- Live data renders (counts, lists, badges)
- Navigation works (TabBar buttons, back button on detail screens)

## Open questions

None — proceed to implementation plan.
