---
date: 2026-04-25
status: approved
phase: 1 of 4
---

# HJC Mission Control — Phase 1 Design

## Goal

Stand up a Laravel 13 API for the HJC Mission Control crusade-director system, scoped to **Phase 1 of 4**: pastor CRM, pledge tracking, and the daily activity log. This delivers screens **DW.4 (Pastors list)**, **DW.5 (Pastor detail)**, **DW.7 (Pledges)**, and **DW.13 (Activity log)** from the Hi-fi reference at `~/Downloads/Crusade Director Spec/Crusade Director Hi-fi.html`.

## Architecture

- **Stack:** Laravel 13, PHP 8.3, Sanctum (token auth)
- **Scaffold:** clone of `~/Projects/bishops-school/api` (school models stripped, structure/conventions/auth retained)
- **Project location:** `~/Projects/hjc/`
- **Database:** `hjc` (MySQL/Postgres — match scaffold)
- **API-only:** JSON responses; React/HTML mockups consume it. No Blade views.
- **Single-tenant for now:** one `crusades` row ("Lusaka 2026"). Every domain table carries `crusade_id` so multi-crusade is a non-breaking future change.
- **Branding:** "HJC Mission Control" (the Hi-fi sidebar shows "Poimen" — that label is wrong; use HJC).

## Entities

All tables include `id`, `created_at`, `updated_at`. `crusade_id` is FK to `crusades` everywhere it appears.

### crusades
| column | type | notes |
|---|---|---|
| name | string | "Lusaka 2026" |
| city | string | "Lusaka" |
| opens_at | date | crusade start (e.g. 2026-05-02) |
| closes_at | date | crusade end |
| budget_total | decimal(12,2) | overall target |
| pastors_target | int | e.g. 1088 |
| awareness_target_pct | tinyint | e.g. 60 |

### zones
| column | type | notes |
|---|---|---|
| crusade_id | FK | |
| code | string(8) | e.g. "Z01"; unique within crusade |
| name | string nullable | display name |
| population | int nullable | |
| pap | int nullable | potential audience pool |

### churches
| column | type | notes |
|---|---|---|
| crusade_id | FK | |
| name | string | |
| zone_id | FK nullable | |

### pastors
| column | type | notes |
|---|---|---|
| crusade_id | FK | |
| full_name | string | |
| church_id | FK nullable | |
| zone_id | FK nullable | denormalised for fast filtering |
| phone | string nullable | |
| email | string nullable | |
| address | string nullable | |
| pastor_since | year nullable | e.g. 2018 |
| pipeline_stage | enum | identified / engaged / committed / active / champion |
| last_contact_at | timestamp nullable | for the "Last contact" column |

### pastor_identifications
Replaces a flat "tags" column. A pastor can have multiple categorisations, each with a sub-role and date — needed for DW.5's "Identifications" list ("PCM · primary", "BOT · member").

| column | type | notes |
|---|---|---|
| pastor_id | FK | |
| category | enum | PCM, BOT, … (extend as needed) |
| sub_role | enum nullable | primary, member, chair, sec, champion |
| assigned_at | date | |
| assigned_by_user_id | FK nullable | |

### pledge_meetings
| column | type | notes |
|---|---|---|
| crusade_id | FK | |
| sequence | string(8) | "M1", "M2", … |
| held_on | date | |
| venue | string | |
| status | enum | upcoming, done |

### pledge_meeting_attendances (pivot)
| column | type | notes |
|---|---|---|
| pledge_meeting_id | FK | |
| pastor_id | FK | unique with pledge_meeting_id |

### pledges
Sparse rows — one per resource pledged at a meeting by a pastor. Aggregate via SUM.

| column | type | notes |
|---|---|---|
| pastor_id | FK | |
| pledge_meeting_id | FK | |
| resource | enum | choir, prayer, ushers, counsellors, buses, money |
| quantity | decimal(12,2) | counts for people; currency for money |

### crusade_targets
Per-resource targets shown in DW.7's aggregate cards.

| column | type | notes |
|---|---|---|
| crusade_id | FK | |
| resource | enum | matches `pledges.resource` |
| target_quantity | decimal(12,2) | |

Unique on (crusade_id, resource).

### activity_entries
| column | type | notes |
|---|---|---|
| crusade_id | FK | |
| user_id | FK | director who logged it |
| occurred_at | timestamp | |
| description | text | |
| power | string(32) | tag: pastors, awareness, volunteers, govt, publicity, committees, budget, pledges, … (string for now; promoted to FK when Phase 2 builds the Power table) |
| status | enum | done, running |

### reminders
| column | type | notes |
|---|---|---|
| crusade_id | FK | |
| user_id | FK | |
| text | string | |
| due_on | date nullable | |
| completed_at | timestamp nullable | |

## API surface

All routes prefixed `/api`. Sanctum-protected except `/login`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/login` | issue Sanctum token |
| POST | `/logout` | revoke current token |
| GET | `/crusade` | current crusade context (singleton) |
| GET | `/zones` | list zones (lookup) |
| GET | `/churches` | list churches (lookup) |
| GET | `/pastors` | list w/ filters: `q`, `zone_id`, `pipeline_stage`, `last_contact_before`, paginated |
| POST | `/pastors` | create |
| GET | `/pastors/{id}` | detail incl. identifications & pledge totals |
| PATCH | `/pastors/{id}` | update |
| DELETE | `/pastors/{id}` | soft-delete |
| GET | `/pastors/{id}/identifications` | list |
| POST | `/pastors/{id}/identifications` | add |
| GET | `/pastors/{id}/pledges` | aggregated by resource |
| GET | `/pledge-meetings` | list |
| POST | `/pledge-meetings` | create |
| GET | `/pledge-meetings/{id}` | detail |
| PATCH | `/pledge-meetings/{id}` | update |
| POST | `/pledge-meetings/{id}/attendances` | record attendance (bulk pastor_ids) |
| POST | `/pledge-meetings/{id}/pledges` | record pledges (bulk rows) |
| GET | `/pledges/summary` | totals per resource vs target (drives DW.7 aggregate cards) |
| GET | `/activity-entries` | list, filters: `date`, `power`, paginated |
| POST | `/activity-entries` | create |
| GET | `/reminders` | list (default: incomplete) |
| POST | `/reminders` | create |
| PATCH | `/reminders/{id}` | mark complete / edit |

Pipeline stage counts (the 5 stat cards on DW.4: Identified/Engaged/Committed/Active/Champion totals) come from `GET /pastors?include=stage_counts` or a dedicated `/pastors/stage-counts` endpoint — pick one in plan stage.

## Auth

Sanctum personal-access tokens. Single role: **director**. No multi-role permissions in Phase 1; revisit if a Phase 2 screen needs read-only viewers.

## Seed data

Seeders provide enough data to make the four screens realistic locally:
- 1 crusade (Lusaka 2026)
- 8–10 zones (Z01–Z08+)
- ~15 churches across those zones
- ~30 pastors spread across pipeline stages with mixed identifications
- 4 pledge meetings (3 done, 1 upcoming) with attendance + pledges
- 6 crusade targets (one per resource)
- ~10 activity entries across the last week
- A handful of reminders

Use the figures from the Hi-fi as anchor values where shown (e.g. M3 = Kabwata, 62 attended).

## Out of scope (Phase 1)

- Frontend (React/HTML mockups are reference only, not built)
- File uploads, CSV exports
- Email/SMS notifications
- Real-time updates (websockets)
- Multi-tenancy
- The 14 Powers readiness engine (Phase 2)
- Awareness surveys, worker rehearsals (Phase 2)
- Committees, Conference, Publicity, Stakeholders, Permits (Phase 3)
- Budget/transactions, weekly assessment, Mission Control rollup (Phase 4)

## Testing

Pest/PHPUnit feature tests covering each endpoint's happy path + auth gate + a representative validation failure. Use `RefreshDatabase`. No UI tests in this phase.

## Open questions

None — proceed to implementation plan.
