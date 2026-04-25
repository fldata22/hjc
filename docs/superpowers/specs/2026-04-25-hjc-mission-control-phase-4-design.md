---
date: 2026-04-25
status: approved
phase: 4 of 4
---

# HJC Mission Control — Phase 4 Design

## Goal

Backend support for the three Director-discipline + dashboard screens: **DW.11 (Budget)**, **DW.12 (Weekly assessment)**, **DW.1 (Mission control)**. This is the final phase.

After this, Phase 1-4 fully cover all 13 hi-fi screens.

## Architecture

- **Stack:** unchanged (Laravel 13, PHP 8.3, Sanctum, SQLite for dev/test)
- **Branch:** `main`
- **Single-tenant** continues. All Phase 4 tables carry `crusade_id`.

## Entities

All tables include `id`, `created_at`, `updated_at`. FK columns use `cascadeOnDelete` for required parents and `nullOnDelete` for optional parents.

### budget_categories (DW.11)

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| name | string(64) | "Crusade ground & sound", "Publicity", … |
| allocated_amount | decimal(12,2) | budget for this category |
| order_index | unsignedTinyInteger | display order |

`spent` is computed live from `budget_transactions` SUM (not denormalized — keep simple, recompute on read).

### budget_transactions

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| budget_category_id | FK nullable | nullOnDelete; null = income (not tied to a category) |
| description | string(255) | |
| occurred_on | date | |
| kind | enum | `income`, `expense` |
| amount | decimal(12,2) | always positive; sign comes from `kind` |

Index on (crusade_id, occurred_on) and (crusade_id, kind).

### weekly_assessments (DW.12)

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| week_number | unsignedTinyInteger | 1..N |
| prompted_at | timestamp | when the director was prompted to do this |
| self_score | unsignedTinyInteger nullable | 1-10 confidence |
| notes | text nullable | "What's driving the score" free text |
| decisions_needed | text nullable | "Decisions needed from BOT" free text |
| submitted_at | timestamp nullable | null = draft, set = submitted |

Unique on (crusade_id, week_number).

### weekly_assessment_readings

| column | type | notes |
|---|---|---|
| weekly_assessment_id | FK | cascadeOnDelete |
| power_id | FK | cascadeOnDelete |
| value_pct | unsignedTinyInteger | 0-100 |

Unique on (weekly_assessment_id, power_id).

### weekly_assessment_risks

| column | type | notes |
|---|---|---|
| weekly_assessment_id | FK | cascadeOnDelete |
| ordering | unsignedTinyInteger | 1, 2, 3, … |
| severity | enum | `critical`, `high`, `medium` |
| text | string(255) | |

## API surface

All routes prefixed `/api`, behind `auth:sanctum`.

### Budget
- `GET /budget-categories` — list with computed `spent` per category and `pct_spent`
- `POST/GET/PATCH/DELETE /budget-categories[/{id}]`
- `GET /budget-transactions` — filters: `kind`, `category_id`, `date_from`, `date_to`, paginated
- `POST/GET/PATCH/DELETE /budget-transactions[/{id}]`
- `GET /budget/summary` — DW.11 top stat cards: total_budget, income, spent, committed (= spent + signed contracts; for now just spent), gap_to_target. Plus the 8-category breakdown matching `/budget-categories` shape.

### Weekly Assessment
- `GET /weekly-assessments` — list (most recent first)
- `POST /weekly-assessments` — create new assessment for a week
- `GET /weekly-assessments/{id}` — full detail with embedded readings + risks
- `PATCH /weekly-assessments/{id}` — update notes/score/decisions
- `DELETE /weekly-assessments/{id}`
- `POST /weekly-assessments/{id}/submit` — mark submitted (sets `submitted_at`)
- `GET /weekly-assessments/latest` — latest assessment with embedded data (drives readings used by Mission Control)
- `PUT /weekly-assessments/{id}/readings` — bulk-replace all 14 readings for an assessment (idempotent)
- `PUT /weekly-assessments/{id}/risks` — bulk-replace top-N risks for an assessment

### Mission Control
- `GET /mission-control` — the big rollup. Returns:
  - `top_stats`: `{days_to_go, financial: {spent, total, pct}, pastors_won: {n, target, pct}, awareness_pct}`
  - `powers`: array of 14 `{code, name, value_pct, status}` (status = success/warning/danger based on pct thresholds; null pct = "muted")
  - `context`: `{population, pap, zones_count, conference_registered, conference_capacity, convoy_actual, convoy_target, makarios_actual, makarios_target, permits_approved, permits_total}` (most computed from existing tables; population/pap/makarios live on crusades or are constants for now)
  - `top_risks`: from the latest weekly_assessment's risks (max 4-5)

For Phase 4, `convoy` and `makarios` aren't backed by real tables yet (they were in the hi-fi as crusade-level stats). Either add columns to `crusades` table for these, or hardcode placeholder values (preferred — flag as future work).

## Schema additions to existing `crusades` table

To support Mission Control context counters from the hi-fi (DW.1):
- `population` (unsigned int nullable) — city population (Lusaka 2.2M)
- `pap` (unsigned int nullable) — potential audience pool (1.8M)
- `convoy_target` (unsigned int default 0) — vehicle convoy target (24)
- `makarios_target` (unsigned int default 0) — Makarios partners target (500)

Convoy/Makarios actuals stay computed/manual for now (e.g., a count from a future table or a manual input). For Phase 4 simplicity, the `mission-control` endpoint returns 0/`null` for `convoy_actual` and `makarios_actual` — a follow-up can add those tables later.

## Existing endpoints unaffected

Phase 1-3 endpoints continue to work. The schema additions to `crusades` are non-breaking.

## Seeders

Extend `CrusadeSeeder`:
- 8 budget categories matching DW.11 (Crusade ground & sound, Publicity, Conference, Worker training, Convoy & logistics, Hospitality, Counselling, Contingency · 5%) with allocated amounts
- ~25 budget transactions across the last 4 weeks (mix of income from BoT/donations and expenses across categories) — anchored to DW.11's recent-transactions list
- 8 weekly assessments (week 1 to current week 8), each with all 14 power readings and 3 risks
- Latest assessment readings should match the DW.1/DW.12 hi-fi values (Pastors 78%, Awareness 21%, Volunteers 2%, etc.)

The Crusade row created in Phase 1 is updated to set `population`, `pap`, `convoy_target`, `makarios_target` matching the hi-fi.

## Out of scope (Phase 4)

- **Computing readiness % live from underlying data** — the hi-fi numbers are subjective director ratings, not pure formulas. Manual entry via weekly assessment is simpler and more honest. A future Phase 5 could add per-power formulas as override hints.
- File uploads (transaction receipts) — punted
- Recurring/scheduled transactions — out
- Notifications/Sat-9pm assessment prompts — out (the hi-fi mentions "prompted Sat 9pm" but that's a notification feature, not a backend feature)
- Convoy + Makarios entity tables — flag as future work; return 0/null in mission-control for now
- Frontend (still backend-only)

## Testing

PHPUnit feature tests with `RefreshDatabase`, same conventions as prior phases:
- Model-level tests for unique constraints and relations
- API tests for each endpoint (happy path + auth gate + one validation failure)
- Aggregate endpoint tests (`/budget/summary`, `/mission-control`)
- WeeklyAssessment bulk-replace endpoints tested for idempotency
- DatabaseSeederTest extended to assert new tables get seeded

## Open questions

None — proceed to implementation plan.

## Phase 1 review fixes

Still parked separately. Recommended to address as a clean-up phase after Phase 4: Reminder ownership check, stage-counts endpoint, pagination on activity-entries + pledge-meetings, /login rate limiting, ENUM portability for Postgres production.
