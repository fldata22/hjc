---
date: 2026-04-25
status: approved
phase: frontend POC (single screen)
---

# HJC Mission Control — Frontend POC (DW.1) Design

## Goal

Stand up a working React frontend at `~/Projects/hjc/web/` that consumes the HJC API. **Scope: just DW.1 (Mission Control dashboard).** Login → see Mission Control with live data from the seeded Lusaka 2026 crusade.

This is the foundation that subsequent screens (DW.2-DW.13) will be added to.

## Architecture

- **Stack:** Vite + React 18 + TypeScript + React Router 7 + TanStack Query 5 + bespoke `hf-*` CSS (verbatim copy of the design system from `~/Downloads/Crusade Director Spec/hifi/styles.css`)
- **No CSS framework** (no Tailwind / shadcn / etc.) — the design IS the design system. Port `styles.css` as-is.
- **TypeScript pragmatism:** TS configured with relaxed settings. Ported components (TSX) won't have full type coverage at first — `// @ts-nocheck` is acceptable on ported screens. Type the API client + auth context strictly; let the rest grow types incrementally.
- **Location:** `~/Projects/hjc/web/` — sibling directory to the Laravel app, in the SAME git repo. Single `git push origin main` ships both backend and frontend.
- **Backend stays put** at the repo root (no relocation to `/api`). Adding `web/` doesn't conflict with Laravel's `public/`, `resources/`, etc.

## Auth flow

- POST `/api/login` with `{email, password}` → response includes `{token, user}`
- Token stored in `localStorage` under key `hjc_token`
- Every API call sends `Authorization: Bearer <token>` header
- 401 response → clear token + redirect to `/login`
- AuthContext provides `{user, token, login(), logout(), isAuthenticated}` via React Context
- Protected route wrapper: `<RequireAuth>` redirects to `/login` if no token
- Note: Sanctum tokens don't expire by default — fine for POC

## File structure

```
~/Projects/hjc/web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
└── src/
    ├── main.tsx                       # entry: React root + providers
    ├── App.tsx                        # router + routes
    ├── styles.css                     # verbatim copy of hifi/styles.css
    ├── api/
    │   ├── client.ts                  # fetch wrapper with auth header + 401 handling
    │   └── hooks.ts                   # TanStack Query hooks (useMissionControl, useCrusade, etc.)
    ├── auth/
    │   ├── AuthProvider.tsx           # Context provider
    │   ├── useAuth.ts                 # hook
    │   ├── RequireAuth.tsx            # protected route wrapper
    │   └── LoginPage.tsx              # /login screen
    ├── components/
    │   ├── Shell.tsx                  # ported from hifi/shell.jsx (Shell, Sidebar, Topbar)
    │   ├── Icon.tsx                   # ported icon library
    │   └── PaveDonut.tsx              # the 14-segment SVG donut from screens-1.jsx
    └── screens/
        └── MissionControl.tsx         # DW.1 — ported from screens-1.jsx::DW1
```

## API integration

- **Base URL:** `http://127.0.0.1:8001/api` (dev). Configurable via `VITE_API_URL` env var.
- **Hooks:** TanStack Query for data fetching/caching/refetching.
  - `useCrusade()` — `GET /api/crusade` (singleton, used in topbar/sidebar)
  - `useMissionControl()` — `GET /api/mission-control` (the main dashboard payload)
  - More to come per screen.
- **Mutations** out of scope for this POC (no forms wired yet).

## CORS update on backend

`config/cors.php` currently allows `http://localhost:3000`. Vite dev defaults to `http://localhost:5173`. Add it to `allowed_origins` (alongside the existing one) as part of this work — small backend change, single commit.

## DW.1 component breakdown

The existing `screens-1.jsx::DW1` component is the source of truth visually. Port it as `screens/MissionControl.tsx`, replacing inline static data with hooks:

| Hi-fi data (current) | Replace with |
|---|---|
| Hardcoded `'Lusaka 2026 · day 58 of 90 · 7 days to go'` | `crusade.name + day count + days_to_go` from `useMissionControl().data.top_stats.days_to_go` |
| `Days to go: 7` stat card | `top_stats.days_to_go` |
| `Financial $43.8k / $80k` | `top_stats.financial.{spent, total}` |
| `Pastors won 975 / 1,088` | `top_stats.pastors_won.{n, target}` |
| `Awareness 21%` stat card | `top_stats.awareness_pct` |
| PAVEDDD donut + 14-power list | `powers[]` (14 entries with `{code, name, value_pct, status}`) |
| Lusaka context counters | `context.{population, pap, zones_count, conference_registered, ...}` |
| Top risks list (4 hardcoded) | `top_risks[]` from latest weekly assessment |

Hi-fi shows 8 powers in the list ("+ 6 more · view all →"). Show the same — first 8 by `order_index`, with a "view all 14 →" link (non-functional in POC; placeholder).

## Out of scope (this POC)

- Other 12 screens (DW.2-DW.13) — coming in subsequent specs
- Forms / mutations (creating pastors, logging activity, etc.)
- Drilldown navigation (sidebar links go to placeholder pages)
- Real-time updates (no websockets)
- Mobile responsive design (desktop-only at 1440x960 viewport per the hi-fi)
- Dark mode
- Loading skeletons (a simple "Loading…" text is enough for POC)
- Error boundaries (basic try/catch + display is enough)
- Tests (Vitest can be added later; manual smoke is enough for POC)
- Production build optimization
- Deployment

## Testing approach

**Manual end-to-end smoke test only** for the POC:

1. Backend: `cd ~/Projects/hjc && php artisan serve --port=8001`
2. Frontend: `cd ~/Projects/hjc/web && npm run dev`
3. Visit `http://localhost:5173`
4. Login with `director@hjc.test` / `password`
5. Verify Mission Control renders with seed data:
   - Top stats show 7 days, ~$43.8k spent, etc.
   - Donut shows 14 segments with correct colors
   - 8-power list shows correct values matching DW.1 hi-fi
   - Lusaka context counters populated
   - 3 risks visible with correct severity badges
6. Verify logout clears token + redirects to login

Vitest + React Testing Library can be added later if/when the frontend grows.

## Open questions

None — proceed to implementation plan.
