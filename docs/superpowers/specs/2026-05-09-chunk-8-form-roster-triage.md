# Chunk 8 — Forms Hub Roster Triage

**Date:** 2026-05-09
**Status:** Draft pending director input on rows marked **🟡 NEEDS-DIRECTOR**
**Roadmap chunk:** Chunk 8 of the revised 7-chunk roadmap (`docs/superpowers/specs/2026-05-02-form-wiring-triage.md`). The triage doc only described Chunk 8 in one line: "build remaining hub forms + add ~17 missing rows." This doc fills in the scope.

## Goal

Reconcile the FormsScreen hub's `36 forms · 5 categories` claim against actual built/wired forms, decide a per-form disposition (build / defer / drop / merge), and capture field-schema sketches for everything in the build set. Builds + sub-chunks for execution land in the implementation plan once the director input column is filled in.

## Why a triage now

Chunks 4-7 triaged forms that already existed in code. Chunk 8 is the inverse: most of the roster doesn't exist yet, the names came from a spec doc nine days ago (`2026-05-01-form-fill-trio-design.md`), and at least one row ("PPPPPPPAVEDDD Town Name", now renamed to "Town Profile") shipped to production as a garbled placeholder. The original plan said "prioritised by director feedback" — this doc surfaces what feedback is needed.

## Roster reconciliation

### Header claim vs. category sum

| Source | Count |
|---|---|
| Page header | "36 forms · 5 categories" |
| Sum of category counts | 17 + 6 + 5 + 8 = 36 (4 categories visible) |
| Tabs row | All 36 / Due 3 / PCM 5 / Workers 8 / Government 4 / Awareness 6 |

**Discrepancy:** the page claims 5 categories but the cat-head sections render 4. Tab labels (PCM / Workers / Government / Awareness) suggest a different taxonomy than the cat-head sections (P / A / V / D). These are inconsistent. Either the tabs or the cat-heads are wrong; both are currently decorative — the tabs don't filter. Resolve in this triage.

### Currently-rendered rows (12) — actual state

| # | Hub row | Pillar | Slug | Built? | Wired to backend? |
|---|---|---|---|---|---|
| 1 | PCM (Primary Committee Members) | P1 | pcm | ✓ | ✓ Chunk 7 (`/pastors`) |
| 2 | Fathers of the Land | P2 | fathers | — | — |
| 3 | BOT (Board of Trustees) | P3 | bot | ✓ | ✓ Chunk 5 (`/committee-members`) |
| 4 | CPC (Central Planning) | P4 | cpc | ✓ | ✓ Chunk 5 (`/committee-members`) |
| 5 | Worker Groups | P6 | workers | — | — |
| 6 | Awareness Survey · Field | A9 | awareness-survey | ✓ | ✓ Chunk 3 (`/awareness-surveys`) |
| 7 | Town Profile *(was PPPPPPPAVEDDD)* | A·all | town-profile | — | — |
| 8 | Publicity & Video Campaign | D13 | publicity | — | — |
| 9 | Venue Inspection (Regular) | V10 | venue-inspection | — | — |
| 10 | Must-Do Checklist | V10 | must-do | — | — |
| 11 | Weekly Assessment Rating | All | weekly | ✓ | ✓ pre-existing `/weekly` |
| 12 | Crusade Daily Expenses | Budget | daily-expenses | ✓ | ✓ Chunk 6 (`/budget-transactions`) |

**6 wired and working** + **6 placeholder rows in the hub.**

### Forms not in the hub at all

The roster claims 36; only 12 rows render. Missing: 24 forms. Per category:
- P · Participation: 17 claimed - 5 rendered = **12 missing**
- A · Awareness: 6 claimed - 3 rendered = **3 missing**
- V · Venue & Logistics: 5 claimed - 2 rendered = **3 missing**
- D · Daily ops: 8 claimed - 2 rendered = **6 missing**

**No source-of-truth list of those 24 form names exists in the spec docs.** This is the key director-input dependency.

## Per-form disposition

Legend:
- 🟢 **BUILD** — straightforward, intent inferable from name + meta hint, ship in Chunk 8 sub-task
- 🟡 **NEEDS-DIRECTOR** — name exists but intent is ambiguous; need director to confirm before building
- 🔵 **DEFER** — keep in roster but punt to a later chunk (specific reason given)
- 🔴 **DROP** — remove from roster (not a real director workflow)
- ⚪ **WIRED** — already built and shipped

### Currently rendered rows

| Row | Disposition | Field-schema sketch / notes |
|---|---|---|
| PCM | ⚪ WIRED | Chunk 7 |
| BOT | ⚪ WIRED | Chunk 5 |
| CPC | ⚪ WIRED | Chunk 5 |
| Awareness Survey | ⚪ WIRED | Chunk 3 |
| Daily Expenses | ⚪ WIRED | Chunk 6 |
| Weekly Assessment | ⚪ WIRED | pre-existing |
| **Fathers of the Land** | 🟡 NEEDS-DIRECTOR | Could be: tribal elders / land custodians for venue rights, donor patriarchs, or a religious-leader courtship list. Field schema depends entirely on which. |
| **Worker Groups** | 🟡 NEEDS-DIRECTOR | Likely choir / ushers / security / hospitality / counselling team rosters. Could be one form with a `group` enum or N forms. Director: how many groups, what fields per member, who fills them in? |
| **Town Profile** | 🟢 BUILD | Per-town baseline: population estimate, zone code, language(s), key contacts, primary religion mix, prior crusade history. Single record per town/zone (1:1 with `zones` table?). Could fold into existing `zones` schema as new columns rather than a new resource. |
| **Publicity & Video Campaign** | 🟡 NEEDS-DIRECTOR | "On track · today" hint suggests a status-tracking form. Could be: campaign milestones (radio jingle recorded, posters printed, social cuts uploaded) or a per-asset checklist. Director: is this a one-off launch checklist or an ongoing log? |
| **Venue Inspection (Regular)** | 🟢 BUILD | Per-visit safety/permits checklist for the crusade ground. Fields likely: date, inspector, permit status (police / fire / city council), capacity verified, exits clear, power tested, sound tested, notes, photo. Append-log shape (one record per visit). |
| **Must-Do Checklist** | 🟢 BUILD | Master pre-crusade checklist (one record, many items). "82% complete" meta confirms it's a single-doc-with-tickboxes shape. Fields: item, owner, due date, status (pending / in-progress / done), evidence/notes. May overlap with Venue Inspection items. |

### Forms not in the hub (the 24)

🟡 **All 24 are NEEDS-DIRECTOR by default.** No spec doc lists them. Without naming them this triage can't disposition them. Two paths to surface this list:

(a) **Director provides the canonical 36-form list** — the source the original spec author had in mind.
(b) **Derive from workflow** — trace one full crusade lifecycle (intake → planning → publicity → inspection → execution → debrief) and list every input surface a director would touch. Sounds heavier but produces a defensible 36 and avoids inheriting garbage.

Recommendation: if (a) is fast (the list lives in someone's head or a Notion doc), use (a). If not, do (b) in 30 minutes — it's still cheaper than building the wrong forms.

## Recommended Chunk 8 scope

Build exactly the 🟢 set this chunk:

1. **Town Profile** (`town-profile`) — per-zone or per-town baseline. Likely small — 6-10 fields, 1:1 with `zones` or new `town_profiles` table.
2. **Venue Inspection (Regular)** (`venue-inspection`) — append-log per visit. Pattern matches Daily Expenses; receipt-photo infrastructure already in place (Chunk 6).
3. **Must-Do Checklist** (`must-do`) — items + per-item status. Different from existing form patterns (closer to a kanban-lite list); needs a small backend resource.

Defer everything else to **Chunk 8b** (after director input lands on the 🟡 rows). That keeps Chunk 8 shippable in a focused window.

**Sub-chunks if 🟢 alone is too much:**
- 8a: Town Profile (single, simplest)
- 8b: Venue Inspection (append-log, follows Daily Expenses pattern)
- 8c: Must-Do Checklist (needs new shape — flag for closer design)

## Director consult — load-bearing questions

Asking the user (in the original-engineer sense — i.e. the crusade director, who is also our user here) the following resolves the 🟡 set:

1. **Fathers of the Land** — who are these people in your workflow? Are they the same as the BOT trustees, a different VIP courtship list, or something else?
2. **Worker Groups** — is this one form with a "group type" picker, or one form per group (choir / ushers / security / etc.)? What fields matter per member?
3. **Publicity & Video Campaign** — one-off launch checklist, or an ongoing log of campaign assets and their status?
4. **The 24 missing forms** — does a canonical list exist anywhere (Notion doc, planning notes, conversation transcript), or should I derive it by tracing a full crusade end-to-end?
5. **Categories** — the page claims 5 but renders 4 (P / A / V / D). Is there a 5th category that got dropped (e.g. "G · Government" — the tabs hint at it), or is the "5" a stale claim?

## Cleanup the triage should produce in code

Independent of director input, three sweeps make the hub honest:

1. **Tabs row.** Currently decorative — clicking a tab doesn't filter. Either wire the filter or remove the tabs entirely until they work. (Recommend remove until wired; nobody knows the rows are unfiltered.)
2. **Fake meta strings on placeholder rows.** "3 of 4 verified · yesterday" (Fathers), "Population baseline · 12d" (Town Profile), etc. These look like real status. Replace with `Coming soon` or empty meta until the underlying form is built.
3. **Fake meta strings on wired rows.** "9 of 10 confirmed · 2h ago" on PCM, "$43.8k of $84k · today" on Daily Expenses (also wrong currency — should be ₵). These are *also* fake but the data sources to compute them are now available; this is a small follow-up chunk on its own (live status counts).

Cleanup #1 + #2 are tiny and could land in this chunk's stop-the-bleeding pass. #3 is its own thing.

## File touch list (this chunk, pending director input)

**Frontend create:**
- `web/src/screens/forms/TownProfileForm.tsx` (if BUILD set lands)
- `web/src/screens/forms/VenueInspectionForm.tsx`
- `web/src/screens/forms/MustDoChecklistScreen.tsx`

**Frontend modify:**
- `web/src/api/hooks.ts` — new resource hooks per form
- `web/src/App.tsx` — wire new routes
- `web/src/screens/app/FormsScreen.tsx` — drop fake meta on placeholder rows; possibly remove tabs row

**Backend (if needed for any of the 🟢 set):**
- New `town_profiles` table + controller + apiResource OR extend `zones` schema
- New `venue_inspections` table + controller + apiResource (with photo column following the Daily Expenses pattern)
- New `must_do_items` table + controller + apiResource

(Per the form-wiring-triage's discipline: backend additions only when an existing endpoint can't be reshaped. Each of the three 🟢 forms likely needs new backend; concrete decisions when the implementation plan is written.)

## Out of scope (explicitly)

- The 🟡 set — held until director input
- The 24 forms not currently in the hub
- The 5-categories vs 4-categories taxonomy fix (cosmetic; defer unless director picks the 5th)
- Wiring tabs to actually filter
- Live status counts on hub rows
- Search bar wiring
- Edit/delete UX on any of the new forms (matches existing chunk pattern)

## Open follow-ups

- Fold `Town Profile` into `zones` schema vs new resource: decide when implementation plan is written
- Photo upload on Venue Inspection: reuse the multipart pattern from Daily Expenses
- `Must-Do Checklist` UX shape: is it a single linear list, grouped by area (venue / publicity / permits), or a kanban? Sketch in plan
- Sub-chunk numbering: 8a/8b/8c per 🟢 form vs one chunk for all three (depends on how much the schemas diverge)
