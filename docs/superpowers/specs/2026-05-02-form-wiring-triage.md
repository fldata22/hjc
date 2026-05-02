# Form Wiring Triage — Roadmap Revision

**Date:** 2026-05-02
**Status:** Approved, supersedes the original Chunk 4/5 framing
**Heuristic:** Drop fields unless something reads them. Receipt photos are the explicit carve-out (must keep).

## Why this exists

The original 11-chunk roadmap had:

- **Chunk 4:** "Generic submitQueue → API swap layer"
- **Chunk 5:** "Backend endpoints for PCM/BOT/CPC/Hunt Daily/Daily Expenses"

Both turned out to be wrong shapes for the actual problem. Investigating each remaining form revealed:

1. There is no "generic swap" because no form maps cleanly to a backend that already exists. Every form needs the same per-shape decision Awareness Survey needed (reshape form, extend backend, or build new backend).
2. The "5 forms need backend endpoints" framing was overly-uniform. Some forms have backends that almost match (Daily Expenses, BOT, CPC), one needs no backend changes (PCM), and one is redundant with other features (Hunt Daily).

This triage replaces those two chunks with a per-form disposition table and an ordered execution plan.

## Per-form dispositions

### PCM (Pastor identification — 4-step wizard)

**Backend:** `/pastors` (CRUD) + `/pastors/{id}/identifications` (POST). Both already exist, no changes needed.

**Drop:** denomination, whatsapp, backgroundCheck, reference1Name/Phone, reference2Name/Phone, characteristicsMet[], vettingNotes, attestation, churchName-as-freetext.

**Keep / map:**
- `fullName` → `pastors.full_name`
- `phone` → `pastors.phone`
- `email` → `pastors.email`
- `address` → `pastors.address`
- `zone` (string enum) → `pastors.zone_id` (lookup via `useZones`)
- `yearsInMinistry` → `pastors.pastor_since` (`current_year - yearsInMinistry`)
- `role` → `pastor_identifications.sub_role`

**Submission:** Two-call orchestration. POST `/pastors` to create the pastor record (with `pipeline_stage='identified'`), then POST `/pastors/{id}/identifications` with `{category: 'PCM', sub_role: role, assigned_at: now()}`. If step 2 fails, the pastor record exists without a PCM identification — surface as a partial-failure state (similar to the per-row error pattern from Awareness Survey, but for the second of two calls).

**Wizard collapses from 4 steps to 2:** basic info + assign. Big simplification.

**Disposition: REWIRE. No backend changes.**

---

### BOT (Board of Trustees roster)

**Backend:** `/stakeholders` (CRUD) — exists, but needs a small extension.

**Backend extension required:**
- Add `phone: string|null` to `stakeholders` table
- Add `email: string|null` to `stakeholders` table
- Add `kind: enum('bot','cpc','other')` to `stakeholders` table (defaults to `'other'`; existing records can be backfilled to `'other'`)
- Update `StakeholderController` validation to accept these fields

**Field mapping:**
- `name` → `name`
- `role` → `role`
- `organization` → `org`
- `phone`, `email` → newly-added columns
- `status` (confirmed/pending/declined) → `status_label` (committed/engaged/identified) via translation map; also set `pipeline_stage` accordingly (committed=3, engaged=2, identified=1)
- `notes` → `notes`
- `kind = 'bot'` set on every BOT submission

**Why phone/email are an exception to heuristic 1:** the BOT screen exists *for the director to call/email trustees*. The form itself is the consumer. Without phone/email it has no operational value.

**Disposition: REWIRE to /stakeholders + small migration.**

---

### CPC (Crusade Planning Committee roster)

**Backend:** `/stakeholders` — same as BOT, with `kind = 'cpc'` discriminator.

**Field mapping:**
- `fullName` → `name`
- `role` → `role`
- `zone` → `org` (zone is the closest thing to "the org/area they represent" in CPC context). Note: lossy — zone selector becomes a free-text-ish field; could revisit if a zones-as-FK model is needed later.
- `phone`, `email` → newly-added columns (shared migration with BOT)
- `status` (active/on-leave/stepped-down) → `status_label` (committed/engaged/identified) via translation map
- `notes` → `notes`
- `kind = 'cpc'` set on every CPC submission

**Bundle with BOT** as a single backend migration + two parallel form rewrites. Both forms share the new CSS patterns and the React Query hook shape.

**Disposition: REWIRE to /stakeholders. Shares migration with BOT.**

---

### PCM Hunt Daily (visit log)

**Form captures:** date, time, location, contactName, contactPhone, outcome (met/no-show/reschedule/won), leadsGenerated, expense, notes.

**Reality check:** nothing in the app reads `outcome`, `leadsGenerated`, `expense`, `contactPhone`, `time`, or `location` independently. The structured fields are speculative.

**The director's actual workflow:**
- Meet a pastor → run them through PCM (records the pastor with `pipeline_stage='identified'`)
- The pastor's `pipeline_stage` advances over time (engaged → committed → active → champion) as the relationship deepens. That covers the "outcome" use case.
- Daily summary aggregate ("today I met 4 pastors, won 2") fits the Chunk 9 quick-log feature better than a structured form.

**Disposition: DELETE.** Subsumed by PCM (Chunk 6 below) and Chunk 9 quick-log.

**Specifically remove:**
- `web/src/screens/forms/PCMHuntDailyForm.tsx` (the file)
- The route in `web/src/App.tsx` (or wherever routes are wired)
- The forms-list entry in `web/src/screens/app/FormsScreen.tsx`
- Any localStorage cleanup is unnecessary (it'll just become dead data in users' browsers; cleared on next migration sweep)

---

### Daily Expenses

**Backend:** `/budget-transactions` (CRUD) — exists. Needs receipt-photo extension.

**Backend extensions required:**
- Add `receipt_photo_url: string|null` column to `budget_transactions`
- Add multipart upload endpoint (likely `POST /budget-transactions/{id}/receipt` returning the storage URL, or fold the upload into the create endpoint via multipart `multipart/form-data` POST)
- Configure Laravel filesystem (`storage/app/public/receipts/...` served via `/storage/...` symlink)
- Seed `budget_categories` with: Transport, Printing, Permits, Food, Venue, Materials, Other (so the form's category enum can resolve to `budget_category_id` at submit)

**Drop:** time (nobody filters by hour), receiptNumber (nothing reads), approvedBy (nothing reads).

**Fold into `description`:** `vendor + ' — ' + notes`.

**Map:**
- `date` → `occurred_on`
- `category` (string enum) → `budget_category_id` (FK lookup against the seeded budget_categories table)
- `amount` → `amount`
- `kind = 'expense'` set on every submission
- `receiptPhoto` (data URL from `compressImage`) → upload via multipart, store the returned URL in `receipt_photo_url`. The frontend's `imageCompress` helper still produces a Blob/File; just stop encoding to data URL and POST the binary directly.

**Disposition: REWIRE to /budget-transactions + receipt-photo backend.**

---

## Revised execution plan

| New chunk | Scope | Backend work | Risk |
|---|---|---|---|
| **Chunk 4** | Delete PCM Hunt Daily | None | Trivial |
| **Chunk 5** | Wire BOT + CPC together to /stakeholders | Migration: add phone, email, kind columns | Low — Awareness Survey pattern x2 |
| **Chunk 6** | Wire Daily Expenses (incl. receipt photo backend) | New column + multipart upload + budget_categories seed | Medium — receipt upload is the unknown |
| **Chunk 7** | Wire PCM (2-call orchestration) | None | Medium — multi-step wizard with rollback if step 2 fails |
| (Chunk 9 from original) | Quick log → /activity-entries | None | Subsumes Hunt Daily's actual use case; build later |
| (Chunks 10, 11 from original) | Pillar drill-down + final polish | Pre-existing | Unchanged |

**Note on numbering:** the original roadmap's Chunk 4 was "generic API swap" and Chunk 5 was "backend endpoints." Both are now superseded. The new Chunks 4–7 above replace them. Original Chunks 8a/b/c (build remaining hub forms + add ~17 missing rows) are still outstanding and unchanged. Original Chunks 9, 10, 11 are also unchanged.

## Recommended attack order (and why)

**Chunk 4 (delete Hunt Daily) first.** Cleanup chunks should land first because they reduce the surface area of every subsequent change. ~20 min of work.

**Chunk 5 (BOT + CPC) next.** Smallest backend extension (single migration) and the simplest form rewrites (closest to Awareness Survey's shape — flat list of records, simple form, no orchestration). Builds confidence in the migration pattern.

**Chunk 6 (Daily Expenses) third.** Highest director-value but introduces the unfamiliar multipart upload territory. Doing it after Chunks 4–5 means the React Query patterns are well-rehearsed.

**Chunk 7 (PCM) last among the wiring chunks.** Most complex form (multi-step), most complex orchestration (2-call with rollback semantics). Worth doing once the team has the pattern muscle from the other 3.

## Out of scope for this triage

- Whether to keep the localStorage `submitQueue` infrastructure long-term. After all 5 forms are wired, only the in-flight `submitQueue.ts` module + `draftStorage.ts` (used for PCM wizard step persistence) will remain. Both can stay or go in Chunk 11 polish.
- Any backend authorization model beyond `auth:sanctum` (already in place).
- Pagination on the past-record lists (BOT/CPC/Daily Expenses lists).
- Edit existing records (currently not in any of the 5 forms; deferred uniformly).

## Open follow-ups

- After Chunk 5 (BOT/CPC ship), revisit whether the `pipeline_stage` integer is right for these contexts (BOT trustees may not have a "stage" the way pastors do — flat status may be enough).
- After Chunk 6 (Daily Expenses ships), decide whether the receipt-photo multipart endpoint should be its own resource or folded into the create endpoint. Lean toward separate endpoint for clarity.
- After Chunk 7 (PCM ships), evaluate whether the wizard-style UX is still right at 2 steps or whether it should collapse to a single-page form.
