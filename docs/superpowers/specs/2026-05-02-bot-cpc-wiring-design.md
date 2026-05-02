# BOT + CPC Wiring (committee_members) — Design Spec

**Date:** 2026-05-02
**Status:** Approved, ready for implementation plan
**Roadmap chunk:** Chunk 5 of the revised 7-chunk roadmap (`docs/superpowers/specs/2026-05-02-form-wiring-triage.md`)

## Goal

Replace the localStorage-backed BOT and CPC forms with reads/writes to a new Laravel `/committee-members` endpoint backed by a new `committee_members` table. Both forms share the same backend resource, distinguished by a `kind` column (`bot` | `cpc`).

## Why a new table

The original triage proposed reusing `/stakeholders`. Closer inspection: the `stakeholders` table is purpose-shaped for VIP-courting (mayor/imam/bishop being moved through `identified → engaged → committed → won` pipeline stages). BOT and CPC are operational rosters of *already-committed team members* who just need contact info + active/inactive status tracking. The funnel vocabulary is the wrong fit; force-mapping `confirmed → committed_label, pipeline_stage=3` works mechanically but loses the meaning. A purpose-fit table is clearer than overloading the funnel.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Where do BOT/CPC records live? | **A.** New `committee_members` table. Stakeholders stays as the VIP funnel. Clean separation. |
| 2 | One endpoint or two? | **One.** `/committee-members` with `?kind=bot|cpc` filter. Simpler routing, single controller, single React Query hook parameterized by kind. |
| 3 | Status field shape | **Generic string column with per-kind enum validation in the controller.** BOT allowed values: `confirmed|pending|declined`. CPC allowed values: `active|on-leave|stepped-down`. Backend rejects mismatches. |
| 4 | Edit/delete in scope? | **Out of scope** (matches Awareness Survey pattern). Backend supports PATCH/DELETE so a future chunk can wire it. |
| 5 | Pagination | **Out of scope.** Rosters are <50 members. Return all. |
| 6 | Existing UI shape | **Keep the list-with-inline-add UX.** It already fits roster management; we're swapping the data layer, not redesigning. |

## Architecture

### Backend

**Migration** `database/migrations/2026_05_02_create_committee_members_table.php`:

```php
Schema::create('committee_members', function (Blueprint $t) {
  $t->id();
  $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
  $t->enum('kind', ['bot', 'cpc']);
  $t->string('name', 128);
  $t->string('role', 64);
  $t->string('org', 128)->nullable();   // BOT: organization name; CPC: zone label
  $t->string('phone', 32)->nullable();
  $t->string('email', 128)->nullable();
  $t->string('status', 32);             // BOT: confirmed/pending/declined; CPC: active/on-leave/stepped-down
  $t->string('notes', 255)->nullable();
  $t->timestamps();
  $t->index(['crusade_id', 'kind']);
});
```

**Model** `app/Models/CommitteeMember.php`:

```php
class CommitteeMember extends Model
{
    protected $fillable = ['crusade_id', 'kind', 'name', 'role', 'org', 'phone', 'email', 'status', 'notes'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
```

**Controller** `app/Http/Controllers/Api/CommitteeMemberController.php`:

```php
class CommitteeMemberController extends Controller
{
    private const STATUS_BY_KIND = [
        'bot' => ['confirmed', 'pending', 'declined'],
        'cpc' => ['active', 'on-leave', 'stepped-down'],
    ];

    public function index(Request $r): JsonResponse
    {
        $q = CommitteeMember::query();
        if ($r->filled('kind')) $q->where('kind', $r->string('kind'));
        return response()->json(['data' => $q->orderBy('name')->get()]);
    }

    public function store(Request $r): JsonResponse
    {
        $kind = $r->input('kind');
        $allowed = self::STATUS_BY_KIND[$kind] ?? [];
        $v = $r->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'kind' => 'required|in:bot,cpc',
            'name' => 'required|string|max:128',
            'role' => 'required|string|max:64',
            'org' => 'nullable|string|max:128',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email|max:128',
            'status' => ['required', 'string', Rule::in($allowed)],
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(['data' => CommitteeMember::create($v)], 201);
    }

    public function update(Request $r, CommitteeMember $committeeMember): JsonResponse
    {
        $kind = $committeeMember->kind;
        $allowed = self::STATUS_BY_KIND[$kind] ?? [];
        $v = $r->validate([
            'name' => 'sometimes|string|max:128',
            'role' => 'sometimes|string|max:64',
            'org' => 'sometimes|nullable|string|max:128',
            'phone' => 'sometimes|nullable|string|max:32',
            'email' => 'sometimes|nullable|email|max:128',
            'status' => ['sometimes', 'string', Rule::in($allowed)],
            'notes' => 'sometimes|nullable|string|max:255',
        ]);
        $committeeMember->update($v);
        return response()->json(['data' => $committeeMember]);
    }

    public function destroy(CommitteeMember $committeeMember): JsonResponse
    {
        $committeeMember->delete();
        return response()->json(null, 204);
    }
}
```

**Routes** `routes/api.php` (inside `auth:sanctum` group):

```php
Route::apiResource('committee-members', \App\Http\Controllers\Api\CommitteeMemberController::class);
```

(Routes come from apiResource: GET /committee-members, POST /committee-members, GET /committee-members/{id}, PATCH /committee-members/{id}, DELETE /committee-members/{id}. The `show` method default from apiResource is fine as-is.)

**Seeder** `database/seeders/CrusadeSeeder.php` — add a small block right after the existing Stakeholders block:

```php
// Committee members (BOT + CPC)
$committeeMembers = [
    ['bot', 'Rev. Edmund Asare', 'Chair', 'Wa Council of Churches', '+233 24 555 0100', null, 'confirmed', null],
    ['bot', 'Mrs. Adwoa Mensah', 'Treasurer', 'Christ Apostolic', '+233 24 555 0101', null, 'confirmed', null],
    ['bot', 'Pastor Kwaku Frimpong', 'Secretary', 'Living Word', '+233 24 555 0102', null, 'pending', null],
    ['cpc', 'Akua Boateng', 'Zone Coordinator', 'Wa Central', '+233 24 555 0301', null, 'active', null],
    ['cpc', 'Yaw Owusu', 'Logistics Lead', 'Wa North', '+233 24 555 0302', null, 'active', null],
    ['cpc', 'Pst. Daniel Ofori', 'Pastor Liaison', 'Wa South', '+233 24 555 0303', null, 'active', null],
    ['cpc', 'Mary Asante', 'Volunteer Manager', 'Wa East', '+233 24 555 0304', null, 'on-leave', null],
];
foreach ($committeeMembers as [$kind, $name, $role, $org, $phone, $email, $status, $notes]) {
    CommitteeMember::create([
        'crusade_id' => $crusade->id, 'kind' => $kind, 'name' => $name, 'role' => $role,
        'org' => $org, 'phone' => $phone, 'email' => $email, 'status' => $status, 'notes' => $notes,
    ]);
}
```

(Seeder needs `use App\Models\CommitteeMember;` added at the top.)

### Frontend hooks

Add to `web/src/api/hooks.ts`:

```ts
// === Committee members (BOT + CPC roster) ===
export type CommitteeKind = 'bot' | 'cpc';

export interface CommitteeMember {
  id: number;
  crusade_id: number;
  kind: CommitteeKind;
  name: string;
  role: string;
  org: string | null;
  phone: string | null;
  email: string | null;
  status: string;          // BOT: 'confirmed'|'pending'|'declined'; CPC: 'active'|'on-leave'|'stepped-down'
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCommitteeMembers(kind: CommitteeKind) {
  return useQuery({
    queryKey: ['committee-members', kind],
    queryFn: () => apiFetch<{ data: CommitteeMember[] }>(`/committee-members?kind=${kind}`).then((r) => r.data),
  });
}

export function useCreateCommitteeMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number; kind: CommitteeKind; name: string; role: string;
      org: string | null; phone: string | null; email: string | null;
      status: string; notes: string | null;
    }) =>
      apiFetch<{ data: CommitteeMember }>('/committee-members', {
        method: 'POST', body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['committee-members', vars.kind] });
    },
  });
}
```

### BOTForm.tsx rewrite

Drop:
- `submitQueue` imports (`enqueue`, `getRecords`, `subscribe`)
- `SEED` array
- `useEffect` with subscribe
- localStorage-derived initial state

Add:
- `useCrusade` for `crusade_id`
- `useCommitteeMembers('bot')` for the list
- `useCreateCommitteeMember()` for save
- Loading state (`Loading…` placeholder in the list area)
- Error state (`ErrorBanner` component, same inline copy as Awareness Survey)
- Save handler: call mutation, on success close form + clear draft; on failure show inline error caption (single error, not per-row, since only one record being created)

The list rendering, stat strip, inline form layout, and field set all stay the same. Status enum values stay the same (the form's `confirmed|pending|declined` is preserved by the backend per-kind validation).

The trustee row's `t.status` rendering stays as-is (`<div className={'status ' + t.status}>{t.status}</div>`).

### CPCForm.tsx rewrite

Same shape as BOT rewrite, just with `kind='cpc'` and the CPC-specific fields (fullName→name, zone→org, status enum active|on-leave|stepped-down).

The current form has a `STATUS_LABEL` translation map (`active`→`active`, `on-leave`→`on leave`, `stepped-down`→`stepped down`) for display. Keep this for the rendered text; the actual stored value is the dash-form.

The current form has a `STATUS_CLASS` map (`active`→`confirmed`, `on-leave`→`pending`, `stepped-down`→`declined`) for CSS class reuse. Keep this — it lets us reuse the existing `.status.confirmed` / `.status.pending` / `.status.declined` color classes from `forms.css` without adding new ones.

### Loading / error / empty states

Following the per-query partial degradation pattern from Awareness Survey:

- While `useCrusade` OR `useCommitteeMembers(kind)` is loading: show `Loading…` in the list area; "+ Add" button disabled (no crusade_id to POST against).
- If `useCrusade` errors: full-form `ErrorBanner` with retry.
- If `useCommitteeMembers` errors: inline `ErrorBanner` in the list area; "+ Add" button still usable (mutation can succeed even if the list query failed).
- Empty list (200, empty data): `<div className="empty">No members yet.</div>` (existing utility class from `forms.css`).

### Mutation status UX

- Save button text:
  - Idle: `Save trustee` (BOT) / `Save member` (CPC)
  - Pending: `Saving…` (disabled)
- On failure: inline error caption below the form action row using `ApiError.body.message` extraction (same pattern as Awareness Survey's `handleSubmit`).

## Files touched

**Backend (Laravel):**
- Create: `database/migrations/2026_05_02_create_committee_members_table.php`
- Create: `app/Models/CommitteeMember.php`
- Create: `app/Http/Controllers/Api/CommitteeMemberController.php`
- Modify: `routes/api.php` — add apiResource line inside `auth:sanctum` group
- Modify: `database/seeders/CrusadeSeeder.php` — add `use App\Models\CommitteeMember;` import + seed block

**Frontend:**
- Modify: `web/src/api/hooks.ts` — add `CommitteeKind`, `CommitteeMember` types and `useCommitteeMembers`, `useCreateCommitteeMember` hooks
- Modify: `web/src/screens/forms/BOTForm.tsx` — rewrite (substantially smaller)
- Modify: `web/src/screens/forms/CPCForm.tsx` — rewrite (substantially smaller)

**Delete:** none. (submitQueue path is still in use by PCM, PCMHuntDaily-deleted, DailyExpenses; cleanup waits until after Chunks 6 + 7.)

## Out of scope (explicitly)

- Editing existing committee members. Backend supports PATCH but no UI hook.
- Deleting members. Backend supports DELETE but no UI hook.
- Bulk import.
- Status transitions without re-entering (no "mark as stepped-down" inline toggle).
- Photos/avatars.
- Auth/role-based field visibility (all fields visible to any authenticated user).
- Migrating any existing localStorage records into the new table — the SEED records were just demo data; production users haven't logged real BOT/CPC members yet.

## Open follow-ups

- Edit/delete UI for both forms.
- "Promote member to PCM" or similar cross-form flows (would touch both `committee_members` and `pastor_identifications`).
- Filter/search on long roster lists (only matters past ~50 members).
- Status auto-suggestion based on last-contact-date.
