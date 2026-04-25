---
date: 2026-04-25
status: approved
phase: 2 of 4
---

# HJC Mission Control — Phase 2 Design

## Goal

Add the Powers framework + the data sources for two of the 14 PAVEDDD powers — **Awareness** (DW.2) and **Worker rehearsals** (DW.3). Promote `activity_entries.power` from string to FK against the new `powers` table.

Out of scope for Phase 2: per-power readiness % computation (Phase 4), other powers' data sources (Phase 3), frontend.

## Architecture

- **Stack:** unchanged from Phase 1 (Laravel 13, PHP 8.3, Sanctum, SQLite for dev/test)
- **Branch:** `main` (sequential after Phase 1, autonomy preference set)
- **Single-tenant assumption** continues — every domain table carries `crusade_id`. `powers` is the one global table (the 14 PAVEDDD powers are framework-defined, not crusade-specific).

## Entities

All tables include `id`, `created_at`, `updated_at`. FK columns use `cascadeOnDelete` for required parents and `nullOnDelete` for optional parents — same convention as Phase 1.

### powers (global)

| column | type | notes |
|---|---|---|
| code | string(32) unique | slug: `pastors`, `awareness`, `volunteers`, `equipment`, `decisions`, `discipleship`, `donors`, `drama`, `events`, `pledges`, `committees`, `publicity`, `budget`, `govt` |
| name | string(64) | display name |
| order_index | unsignedTinyInteger | 1..14, for sorting in UI |
| description | string nullable | optional tooltip text |

Seeded with all 14 powers in the same migration. Order/codes match the PAVEDDD framework as referenced in the hi-fi.

### awareness_surveys

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| zone_id | FK | cascadeOnDelete |
| survey_number | unsignedTinyInteger | 1..N (typically 1..6) |
| surveyed_count | unsignedInteger | total people surveyed in this zone for this run |
| attending_yes_count | unsignedInteger | of those, how many said "yes and attending" |
| taken_on | date | when the survey was taken |

Unique on `(crusade_id, zone_id, survey_number)`.

`%` is derived: `attending_yes_count / surveyed_count * 100`. Stored counts allow weighted aggregation across zones.

### worker_rehearsals

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| zone_id | FK | cascadeOnDelete |
| group | enum | `choir`, `prayer`, `ushers`, `counsellors` (matches `pledges.resource` subset) |
| session_number | unsignedTinyInteger | 1..N (typically 1..7 per the hi-fi) |
| attendance_count | unsignedInteger | how many showed up |

Unique on `(crusade_id, zone_id, group, session_number)`.

No separate `worker_groups` table — the group taxonomy is an enum, consistent with `pledges.resource`.

### Migration on `activity_entries`

Convert the existing `power` string column to a FK against `powers`.

Steps (one migration file):
1. Add nullable `power_id` FK column (`foreignId('power_id')->nullable()->constrained('powers')->nullOnDelete()`)
2. Backfill: `UPDATE activity_entries SET power_id = (SELECT id FROM powers WHERE code = activity_entries.power)`
3. Make `power_id` NOT NULL
4. Drop the `power` string column and its index `(crusade_id, power)`
5. Add new index `(crusade_id, power_id)`

The `powers` migration must run before this one (timestamp ordering). Update `ActivityEntry` model: replace `'power'` in `$fillable` with `'power_id'`, add `power(): BelongsTo` relation. Update `ActivityEntryController` to validate `power_id` instead of `power` string, and to eager-load `power` in responses.

## API surface

All routes prefixed `/api`. Sanctum-protected.

| Method | Path | Purpose |
|---|---|---|
| GET | `/powers` | list 14 powers (ordered by order_index) |
| GET | `/powers/{code}` | one power's metadata (lookup by `code`, not id) |
| GET | `/awareness-surveys` | filters: `zone_id`, `survey_number`, `crusade_id`. Returns rows for the DW.2 matrix. |
| POST | `/awareness-surveys` | create one survey row. Validates: crusade_id, zone_id, survey_number, surveyed_count, attending_yes_count, taken_on. Idempotent on (crusade_id, zone_id, survey_number) — repeat returns 422 with "already exists" — use PATCH to revise. |
| PATCH | `/awareness-surveys/{id}` | revise an existing survey's counts |
| GET | `/awareness-surveys/trajectory` | weighted aggregate `%` per `survey_number` across all zones in the current crusade. Returns `[{survey_number, surveyed_total, attending_yes_total, pct}]`. Drives the DW.2 trajectory bar chart. |
| GET | `/worker-rehearsals` | filters: `zone_id`, `group`, `session_number`. Returns rows for the DW.3 matrix. |
| POST | `/worker-rehearsals` | create one attendance row. Validates: crusade_id, zone_id, group (enum), session_number, attendance_count. |
| PATCH | `/worker-rehearsals/{id}` | revise attendance count |
| GET | `/activity-entries` *(modified)* | now eager-loads `power` relation; response includes `power: {id, code, name}` |
| POST | `/activity-entries` *(modified)* | now accepts `power_id` (or `power_code` as a convenience that resolves to id) instead of `power` string |

The `ActivityEntryController` change is breaking for any existing client that sent `power: "pastors"` as a string. There is no such client today (frontend not built) — safe to break.

## Existing Phase 1 endpoints unaffected

`/pastors`, `/pledge-meetings`, `/pledges`, `/reminders`, etc. unchanged.

## Seeders

Extend the existing `CrusadeSeeder`:

- After creating zones/pastors/etc., seed:
  - 6 awareness surveys per zone for the first 8 zones (matches DW.2's "8 of 42 surveyed" — though we have 10 zones so use 8). Use the matrix values from the hi-fi (`Z01: [10, 12, 28, 30, 35, 42]` etc.). Convert to surveyed/attending counts: assume `surveyed_count = 100` for clarity, derive `attending_yes_count = pct`.
  - Worker rehearsals for the first 8 zones, varied across groups and sessions, matching the DW.3 matrix where data is shown.
- The 14 `powers` rows should be seeded by their own migration (data migration), not by `CrusadeSeeder` — they're framework-level, not per-crusade.

## Out of scope

- Per-power readiness % computation (Phase 4 with Mission Control rollup)
- Worker rehearsal session metadata (date, venue) — punted until needed
- Survey method tracking (in-person vs phone) — out
- Frontend (still backend-only)
- File uploads, exports, notifications

## Testing

PHPUnit feature tests with `RefreshDatabase`, same conventions as Phase 1:

- Model-level tests for unique constraints and relations
- API tests for each endpoint (happy path + auth gate + one validation failure)
- Migration test: confirm `activity_entries.power_id` is FK + not-null after running migrations against the Phase 1 schema with existing string-power data
- DatabaseSeederTest extended to assert new tables get seeded

## Open questions

None — proceed to implementation plan.
