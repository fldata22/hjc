---
date: 2026-04-25
status: approved
phase: 3 of 4
---

# HJC Mission Control — Phase 3 Design

## Goal

Backend support for the four Operations screens: **DW.6 (Committees)**, **DW.8 (Conference)**, **DW.9 (Publicity)**, **DW.10 (Govt & permits)**.

Out of scope for Phase 3: per-power readiness % rollup (Phase 4), Budget tables (Phase 4), Mission Control aggregate (Phase 4), frontend.

## Architecture

- **Stack:** unchanged (Laravel 13, PHP 8.3, Sanctum, SQLite for dev/test)
- **Branch:** `main`
- **Single-tenant** continues. All Phase 3 tables carry `crusade_id`.

## Entities

All tables include `id`, `created_at`, `updated_at`. FK columns use `cascadeOnDelete` for required parents and `nullOnDelete` for optional parents.

### committees (DW.6)

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| name | string(64) | "Steering", "Finance", … |
| chair_name | string(128) | display name (free text — could become FK to pastors later) |
| focus_area | string(32) nullable | tag for grouping (publicity/finance/logistics/etc) |
| status | enum | `on_track`, `watch`, `at_risk` |
| deliverables_done_pct | unsignedTinyInteger | 0-100 |
| member_count | unsignedSmallInteger | denormalized count |
| next_meeting_on | date nullable | |

No separate `committee_members` table for Phase 3 — `member_count` is enough for the card display. Promote to a relation table when DW.6's drill-down is built.

### conferences

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| name | string(128) | e.g. "HJC 2026 Pastors' Conference" |
| starts_on | date | |
| ends_on | date | |
| capacity | unsignedInteger | overall attendee capacity |

One conference per crusade in practice. Modelled separately (not on `crusades`) for future flexibility and to keep `crusades` slim.

### conference_tracks

| column | type | notes |
|---|---|---|
| conference_id | FK | cascadeOnDelete |
| name | string(64) | "Worship & arts", "Pastoral leadership", … |
| capacity | unsignedInteger | per-track capacity |

Unique on (conference_id, name).

### conference_sessions

| column | type | notes |
|---|---|---|
| conference_id | FK | cascadeOnDelete |
| track_id | FK nullable | nullOnDelete; null = plenary |
| day_label | string(16) | "Day 1 — Wed", "Day 2 — Thu", … |
| name | string(128) | session title |
| speaker | string(128) nullable | |
| session_kind | enum | `plenary`, `track` |
| rsvp_count | unsignedInteger | denormalized RSVP count |

### conference_registrations

| column | type | notes |
|---|---|---|
| conference_id | FK | cascadeOnDelete |
| pastor_id | FK nullable | nullOnDelete; null allowed for non-pastor attendees |
| track_id | FK nullable | nullOnDelete |
| paid_amount | decimal(10,2) | default 0 |
| paid_in_full | boolean | default false |
| registered_at | timestamp | |

Unique on (conference_id, pastor_id) when pastor_id is not null (partial index — handle in app validation since SQLite/MySQL portability).

### publicity_channels (DW.9)

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| name | string(128) | "Phoenix FM", "Bus stops · 18 sites", … |
| channel_type | enum | `radio`, `print`, `ooh`, `sms`, `tv` |
| reach_estimate | string(64) nullable | "620k reach", "est. 1.2M views", … (free text — heterogeneous across channel types) |
| notes | string(255) nullable | "3 spots / day · 14 days" |
| status | enum | `live`, `in_progress`, `scheduled`, `blocked` |
| spend_to_date | decimal(10,2) | default 0 |

### stakeholders (DW.10)

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| name | string(128) | "Mayor Tembo", "Chief Imam Sayid", … |
| org | string(128) | "City of Lusaka", "Lusaka Mosque" |
| role | string(64) | "Mayor", "Imam", "Bishop", "Permitting" |
| pipeline_stage | unsignedTinyInteger | 1-4 (identified/engaged/committed/won) — matches the dot count in DW.10 |
| status_label | enum | `identified`, `engaged`, `committed`, `won` (mirrors pipeline_stage but as text for UI) |
| last_contact_at | timestamp nullable | |
| notes | string(255) nullable | |

### permits (DW.10)

| column | type | notes |
|---|---|---|
| crusade_id | FK | cascadeOnDelete |
| name | string(128) | "Crusade ground assembly", "Sound clearance", "Traffic & parking" |
| agency | string(128) | "Religious Affairs", "Environmental", "LPS" |
| status | enum | `in_review`, `approved`, `rejected` |
| due_on | date nullable | |
| signed_on | date nullable | |
| notes | string(255) nullable | |

## API surface

All routes under `/api`, all behind `auth:sanctum`.

### Committees
- `GET /committees` — list with `eyebrow_stats: {on_track, watch, at_risk}` summary in meta block (drives the DW.6 page header)
- `POST/GET/PATCH/DELETE /committees[/{id}]`

### Conferences (nested)
- `GET /conferences` — list (typically 1 row)
- `POST/GET/PATCH/DELETE /conferences[/{id}]`
- `GET /conferences/{id}/registration-summary` — totals: registered, paid_in_full, sum_paid_amount, sessions_count (5 plenary + N track), per-track breakdown {track_id, name, registered, capacity, pct}. Drives DW.8 stat cards + track bars.
- `GET /conferences/{id}/tracks` + `POST` to add a track
- `PATCH/DELETE /conference-tracks/{id}`
- `GET /conferences/{id}/sessions` + `POST` to add a session
- `PATCH/DELETE /conference-sessions/{id}`
- `GET /conferences/{id}/registrations` + `POST` to register a pastor (supports `pastor_id` or free-form attendee fields later)
- `PATCH/DELETE /conference-registrations/{id}`

### Publicity
- `GET /publicity-channels` — list
- `POST/GET/PATCH/DELETE /publicity-channels[/{id}]`
- `GET /publicity-channels/awareness-spend` — paired chart data combining the existing Phase 2 awareness trajectory with cumulative publicity spend at each survey point. Returns `[{survey_number, awareness_pct, spend_total}]`. Drives DW.9 secondary chart.

### Stakeholders
- `GET /stakeholders` — list (sortable by pipeline_stage)
- `POST/GET/PATCH/DELETE /stakeholders[/{id}]`

### Permits
- `GET /permits` — list with status counts in meta
- `POST/GET/PATCH/DELETE /permits[/{id}]`

## Existing endpoints unaffected

Phase 1 + 2 endpoints continue to work. No schema changes to existing tables in this phase.

## Seeders

Extend `CrusadeSeeder`:

- 8 committees matching DW.6 (Steering, Finance, Pastoral relations, Logistics, Publicity, Worker training, Counselling, Hospitality) with chairs from hi-fi (D. Boateng, M. Sakala, J. Adjei, P. Musonda, L. Banda, E. Phiri, R. Mwape, T. Daka)
- 1 conference (HJC 2026, Apr 30–May 02, capacity 820) with the 5 tracks from DW.8 + ~5 sessions across days
- ~50 conference registrations (pastors random, with paid_in_full mix)
- 6 publicity channels matching DW.9 (Phoenix FM, Hot FM, Bus stops, Posters, SMS, ZNBC)
- 6 stakeholders matching DW.10 (Mayor Tembo, Chief Imam Sayid, Bishop Banda, Min. Phiri, Chief Mukuni, Police Commissioner) with their pipeline stages
- 3 permits matching DW.10

## Out of scope

- File uploads (artwork, letter scans) — punted
- Notification/SMS sending — out
- Per-channel reach analytics dashboard — only store text estimates
- Stakeholder activity timeline / contact log — flag as future work
- Conference attendee check-in — out
- Frontend (still backend-only)

## Testing

PHPUnit feature tests with `RefreshDatabase`, same conventions:
- Model-level tests for unique constraints and relations
- API tests for each endpoint (happy path + auth gate + one validation failure)
- Aggregate endpoint tests (`/conferences/{id}/registration-summary`, `/publicity-channels/awareness-spend`, `/committees` eyebrow stats)
- DatabaseSeederTest extended to assert new tables get seeded

## Open questions

None — proceed to implementation plan.
