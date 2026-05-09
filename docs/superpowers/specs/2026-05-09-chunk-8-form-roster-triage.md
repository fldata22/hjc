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

## Strawman roster — full 36 (derived from a crusade end-to-end trace)

Director was asked to react to this strawman rather than fill in 24 blank rows. Items currently in the hub keep their existing names; new items are derived from a top-to-bottom walk through the crusade lifecycle (intake → planning → publicity → permits → venue → execution → debrief). Numbers chosen to hit 17 / 6 / 5 / 8 = 36 to match the existing cat-head claim. **All NEW rows are 🟡 NEEDS-DIRECTOR until confirmed.**

### P · Participation (17) — people the director is tracking

| # | Form | State | Strawman intent |
|---|---|---|---|
| 1 | PCM (Primary Committee Members) | ⚪ WIRED | Pastor intake (Chunk 7) |
| 2 | BOT (Board of Trustees) | ⚪ WIRED | National/advisory roster (Chunk 5) |
| 3 | CPC (Crusade Planning Committee) | ⚪ WIRED | Local planning team roster (Chunk 5) |
| 4 | Fathers of the Land | 🟡 placeholder, in hub | Tribal elders / land custodians who grant venue rights — *guessing*; could be donor patriarchs or a religious-leader courtship list. CONFIRM. |
| 5 | Stakeholders (VIP funnel) | 🟡 NEW | Mayor / imam / bishop / governor courtship — uses the existing `stakeholders` table that triage doc explicitly carved out as separate from BOT/CPC. Probably already exists in the backend; just needs a hub row + form. |
| 6 | Choir Roster | 🟡 NEW | Singers, vocal range, zone, attendance |
| 7 | Ushers Roster | 🟡 NEW | Crowd-flow volunteers, zone, shift |
| 8 | Security Team | 🟡 NEW | Internal security (separate from police), background-checked |
| 9 | Counsellors Roster | 🟡 NEW | Altar-call counsellors with theological training records |
| 10 | Prayer Warriors | 🟡 NEW | 24/7 prayer chain enlistment (slot/hour assignment) |
| 11 | Hospitality Team | 🟡 NEW | Housing/feeding visiting workers |
| 12 | Technical Team | 🟡 NEW | Sound / lights / video / livestream |
| 13 | Medical Team | 🟡 NEW | First aid + ambulance liaison |
| 14 | Convoy Team | 🟡 NEW | Mobile-evangelism crews assigned by zone |
| 15 | Children's Ministry Workers | 🟡 NEW | Kids tent staff (background check critical) |
| 16 | Donor Roster | 🟡 NEW | Financial + in-kind (parallel to Stakeholders but money-flow only) |
| 17 | Volunteer Sign-up | 🟡 NEW | General catch-all when role TBD; gets sorted into 6-15 |

**Director gut-check on this category:**
- Rows 6-15 could be ONE form ("Worker Groups") with a `group_type` picker, identical to BOT/CPC sharing one `committee_members` table. Saves 9 rows. But then the Forms hub only has 8 P-rows, not 17. **Question: prefer one umbrella row or N separate rows?**
- Children's Ministry could fold into Worker Groups under `kind='kids'` or be split out for the safeguarding paperwork.
- "Volunteer Sign-up" is mostly redundant if Worker Groups is umbrella.

### A · Awareness (6) — building public attention

| # | Form | State | Strawman intent |
|---|---|---|---|
| 1 | Awareness Survey · Field | ⚪ WIRED | Rolling pre-crusade surveys (Chunk 3) |
| 2 | Town Profile | 🟢 BUILD | Per-town/zone baseline (population, language, religion mix, prior history) |
| 3 | Publicity & Video Campaign | 🟡 placeholder, in hub | Status log of campaign assets (radio jingle / posters / banners / social cuts / billboards / flyers). CONFIRM: log of milestones, or per-asset checklist? |
| 4 | Door-to-Door Outreach Log | 🟡 NEW | Daily door-knock counts per zone |
| 5 | Convoy Outreach Schedule | 🟡 NEW | Where the mobile evangelism crews go each day |
| 6 | Media Coverage Tracker | 🟡 NEW | Newspaper / radio / TV mentions; sentiment if available |

### V · Venue & Logistics (5) — physical site

| # | Form | State | Strawman intent |
|---|---|---|---|
| 1 | Venue Inspection (Regular) | 🟢 BUILD | Per-visit safety + permits checklist for the crusade ground |
| 2 | Must-Do Checklist | 🟢 BUILD | Master pre-crusade items list with ticks |
| 3 | Permits Tracker | 🟡 NEW | Police / fire / city / health permits — status, application date, approval date, document upload |
| 4 | Sound & Lighting Setup | 🟡 NEW | Equipment manifest + setup checklist + power requirements |
| 5 | Seating & Capacity Plan | 🟡 NEW | Layout, capacity by zone (front / general / VIP / counsellor area), chair count |

### D · Daily ops (8) — recurring during planning + execution

| # | Form | State | Strawman intent |
|---|---|---|---|
| 1 | Crusade Daily Expenses | ⚪ WIRED | Chunk 6 |
| 2 | Weekly Assessment Rating | ⚪ WIRED | Existing `/weekly` |
| 3 | Daily Attendance Count | 🟡 NEW | Per-night headcount + estimate methodology |
| 4 | Daily Decisions & Conversions | 🟡 NEW | Per-night response card counts: salvations / rededications / healings / counselled |
| 5 | Daily Program Log | 🟡 NEW | What happened that night — speaker, key moments, testimonies, length |
| 6 | Daily Security Incident | 🟡 NEW | Append-log per incident |
| 7 | Daily Medical Incident | 🟡 NEW | Append-log per incident |
| 8 | Activity Quick-Log | 🟡 NEW (= Chunk 9 in original roadmap) | Director's micro-log: "Met 4 pastors, won 2" — already scoped as Chunk 9 |

### Math check

P 17 + A 6 + V 5 + D 8 = **36** ✓ matches the cat-head sum. Header claim of "5 categories" remains unreconciled — if a 5th category is real, the most natural carve-out is **G · Government & Permits** (4 forms: Police, Fire, City, Health), pulling Permits Tracker out of V and splitting it. That'd shift V to 5 and add G at 4, leaving 17 + 6 + 5 + 4 + 8 = **40** — over by 4. Doesn't reconcile cleanly without dropping rows elsewhere. **Recommendation: drop the "5 categories" claim from the header until a 5th category is genuinely named.**

### Strawman implications for Chunk 8 build set

Unchanged from the original 🟢 set: Town Profile, Venue Inspection, Must-Do Checklist. Strawman doesn't shift the build scope — it just gives the director something concrete to react to for the 24 currently-unspec'd forms.

## Open follow-ups

- Fold `Town Profile` into `zones` schema vs new resource: decide when implementation plan is written
- Photo upload on Venue Inspection: reuse the multipart pattern from Daily Expenses
- `Must-Do Checklist` UX shape: is it a single linear list, grouped by area (venue / publicity / permits), or a kanban? Sketch in plan
- Sub-chunk numbering: 8a/8b/8c per 🟢 form vs one chunk for all three (depends on how much the schemas diverge)
