# BOT + CPC Wiring (committee_members) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage-backed BOT and CPC forms with reads/writes to a new Laravel `/committee-members` endpoint, backed by a new `committee_members` table that uses a `kind` discriminator (`bot` | `cpc`) so both forms share one resource.

**Architecture:** New Laravel `committee_members` table + Eloquent model + apiResource controller with per-kind status enum validation. Frontend gets two new React Query hooks (`useCommitteeMembers(kind)`, `useCreateCommitteeMember()`); BOT and CPC forms drop their localStorage `submitQueue` paths and rewire to the hooks. The list-with-inline-add UX stays — only the data layer changes.

**Tech Stack:** Laravel 12 + PHPUnit (Feature tests with `RefreshDatabase`, Sanctum auth, factory pattern). React 19 + TypeScript strict + @tanstack/react-query v5. Web project has no automated test framework — verification gates are `tsc -b`, `eslint`, manual browser sweep.

**Spec:** `docs/superpowers/specs/2026-05-02-bot-cpc-wiring-design.md`

---

## File map

**Backend create:**
- `database/migrations/2026_05_02_create_committee_members_table.php`
- `app/Models/CommitteeMember.php`
- `database/factories/CommitteeMemberFactory.php`
- `app/Http/Controllers/Api/CommitteeMemberController.php`
- `tests/Feature/CommitteeMemberApiTest.php`

**Backend modify:**
- `routes/api.php` — add apiResource line
- `database/seeders/CrusadeSeeder.php` — add seed block + import

**Frontend modify:**
- `web/src/api/hooks.ts` — add types and 2 hooks
- `web/src/screens/forms/BOTForm.tsx` — rewrite (substantially smaller)
- `web/src/screens/forms/CPCForm.tsx` — rewrite

**Delete:** none.

---

## Task 1: Migration + Model + Factory

**Files:**
- Create: `database/migrations/2026_05_02_create_committee_members_table.php`
- Create: `app/Models/CommitteeMember.php`
- Create: `database/factories/CommitteeMemberFactory.php`

- [ ] **Step 1: Create the migration**

Write `database/migrations/2026_05_02_create_committee_members_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('committee_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->enum('kind', ['bot', 'cpc']);
            $table->string('name', 128);
            $table->string('role', 64);
            $table->string('org', 128)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email', 128)->nullable();
            $table->string('status', 32);
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('committee_members');
    }
};
```

- [ ] **Step 2: Create the model**

Write `app/Models/CommitteeMember.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommitteeMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'kind', 'name', 'role', 'org',
        'phone', 'email', 'status', 'notes',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
```

- [ ] **Step 3: Create the factory**

Write `database/factories/CommitteeMemberFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommitteeMemberFactory extends Factory
{
    public function definition(): array
    {
        $kind = fake()->randomElement(['bot', 'cpc']);
        $statuses = $kind === 'bot'
            ? ['confirmed', 'pending', 'declined']
            : ['active', 'on-leave', 'stepped-down'];

        return [
            'crusade_id' => Crusade::factory(),
            'kind' => $kind,
            'name' => fake()->name(),
            'role' => fake()->jobTitle(),
            'org' => fake()->company(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'status' => fake()->randomElement($statuses),
            'notes' => null,
        ];
    }

    public function bot(): static
    {
        return $this->state(fn () => [
            'kind' => 'bot',
            'status' => fake()->randomElement(['confirmed', 'pending', 'declined']),
        ]);
    }

    public function cpc(): static
    {
        return $this->state(fn () => [
            'kind' => 'cpc',
            'status' => fake()->randomElement(['active', 'on-leave', 'stepped-down']),
        ]);
    }
}
```

- [ ] **Step 4: Run the migration to verify it applies cleanly**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan migrate
```

Expected: `INFO  Running migrations.` followed by a `2026_05_02_create_committee_members_table .... DONE` line.

If you get an error like "table already exists," roll back first: `php artisan migrate:rollback --step=1` then re-run.

- [ ] **Step 5: Verify the factory + model can create a record**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan tinker --execute="App\Models\CommitteeMember::factory()->bot()->create()->toArray() | print_r"
```

Expected: prints an array with all the columns populated, including `id`, `crusade_id`, `kind => bot`, `status` from the BOT enum.

- [ ] **Step 6: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add database/migrations/2026_05_02_create_committee_members_table.php app/Models/CommitteeMember.php database/factories/CommitteeMemberFactory.php && git commit -m "$(cat <<'EOF'
feat(api): committee_members table + model + factory

New table backs BOT and CPC rosters via a kind discriminator. Generic
status string column with per-kind enum validation (added in the
controller in the next commit).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Controller + Routes + Feature Tests (TDD)

**Files:**
- Create: `app/Http/Controllers/Api/CommitteeMemberController.php`
- Create: `tests/Feature/CommitteeMemberApiTest.php`
- Modify: `routes/api.php`

- [ ] **Step 1: Add the route to `routes/api.php`**

Inside the `Route::middleware('auth:sanctum')->group(function () {` block, add a new line. Pick a sensible spot — after the existing `apiResource('stakeholders', ...)` line is natural. The line to add:

```php
    Route::apiResource('committee-members', \App\Http\Controllers\Api\CommitteeMemberController::class);
```

- [ ] **Step 2: Write the failing feature tests**

Write `tests/Feature/CommitteeMemberApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\CommitteeMember;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommitteeMemberApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_all_members(): void
    {
        CommitteeMember::factory()->count(2)->bot()->create(['crusade_id' => $this->crusade->id]);
        CommitteeMember::factory()->count(3)->cpc()->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/committee-members')->assertOk()->assertJsonCount(5, 'data');
    }

    public function test_filters_by_kind(): void
    {
        CommitteeMember::factory()->count(2)->bot()->create(['crusade_id' => $this->crusade->id]);
        CommitteeMember::factory()->count(3)->cpc()->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/committee-members?kind=bot')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/committee-members?kind=cpc')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_index_orders_by_name(): void
    {
        CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id, 'name' => 'Charlie']);
        CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id, 'name' => 'Alice']);
        CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id, 'name' => 'Bob']);

        $names = collect($this->getJson('/api/committee-members')->json('data'))->pluck('name')->toArray();
        $this->assertSame(['Alice', 'Bob', 'Charlie'], $names);
    }

    public function test_creates_bot_member(): void
    {
        $response = $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'bot',
            'name' => 'Rev. Edmund Asare',
            'role' => 'Chair',
            'org' => 'Wa Council of Churches',
            'phone' => '+233 24 555 0100',
            'email' => 'edmund@example.com',
            'status' => 'confirmed',
            'notes' => null,
        ]);
        $response->assertStatus(201)
            ->assertJsonPath('data.kind', 'bot')
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.name', 'Rev. Edmund Asare');
    }

    public function test_creates_cpc_member(): void
    {
        $response = $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'cpc',
            'name' => 'Akua Boateng',
            'role' => 'Zone Coordinator',
            'org' => 'Wa Central',
            'phone' => '+233 24 555 0301',
            'email' => null,
            'status' => 'active',
            'notes' => null,
        ]);
        $response->assertStatus(201)
            ->assertJsonPath('data.kind', 'cpc')
            ->assertJsonPath('data.status', 'active');
    }

    public function test_create_rejects_unknown_kind(): void
    {
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'other',
            'name' => 'X', 'role' => 'Y', 'status' => 'confirmed',
        ])->assertStatus(422)->assertJsonValidationErrors(['kind']);
    }

    public function test_create_rejects_status_not_in_kind_enum(): void
    {
        // BOT can't have CPC status 'active'
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'bot',
            'name' => 'X', 'role' => 'Y', 'status' => 'active',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);

        // CPC can't have BOT status 'confirmed'
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'cpc',
            'name' => 'X', 'role' => 'Y', 'status' => 'confirmed',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_create_requires_name_role_status_kind(): void
    {
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['kind', 'name', 'role', 'status']);
    }

    public function test_create_requires_valid_email(): void
    {
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'bot',
            'name' => 'X', 'role' => 'Y', 'status' => 'confirmed',
            'email' => 'not-an-email',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_can_update_status(): void
    {
        $member = CommitteeMember::factory()->bot()->create([
            'crusade_id' => $this->crusade->id, 'status' => 'pending',
        ]);
        $this->patchJson("/api/committee-members/{$member->id}", ['status' => 'confirmed'])
            ->assertOk()->assertJsonPath('data.status', 'confirmed');
    }

    public function test_update_rejects_status_not_in_record_kind_enum(): void
    {
        $member = CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/committee-members/{$member->id}", ['status' => 'active'])
            ->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_can_delete(): void
    {
        $member = CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/committee-members/{$member->id}")->assertNoContent();
        $this->assertDatabaseMissing('committee_members', ['id' => $member->id]);
    }
}
```

- [ ] **Step 3: Run the failing tests**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter=CommitteeMemberApiTest
```

Expected: all tests fail because `CommitteeMemberController` doesn't exist yet (likely a "Class not found" error or 500 responses).

- [ ] **Step 4: Implement the controller**

Write `app/Http/Controllers/Api/CommitteeMemberController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommitteeMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommitteeMemberController extends Controller
{
    private const STATUS_BY_KIND = [
        'bot' => ['confirmed', 'pending', 'declined'],
        'cpc' => ['active', 'on-leave', 'stepped-down'],
    ];

    public function index(Request $request): JsonResponse
    {
        $q = CommitteeMember::query();
        if ($request->filled('kind')) {
            $q->where('kind', $request->string('kind'));
        }
        return response()->json(['data' => $q->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $kind = $request->input('kind');
        $allowed = self::STATUS_BY_KIND[$kind] ?? [];

        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'kind' => ['required', Rule::in(array_keys(self::STATUS_BY_KIND))],
            'name' => 'required|string|max:128',
            'role' => 'required|string|max:64',
            'org' => 'nullable|string|max:128',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email|max:128',
            'status' => ['required', 'string', Rule::in($allowed)],
            'notes' => 'nullable|string|max:255',
        ]);

        return response()->json(['data' => CommitteeMember::create($validated)], 201);
    }

    public function show(CommitteeMember $committeeMember): JsonResponse
    {
        return response()->json(['data' => $committeeMember]);
    }

    public function update(Request $request, CommitteeMember $committeeMember): JsonResponse
    {
        $allowed = self::STATUS_BY_KIND[$committeeMember->kind] ?? [];

        $validated = $request->validate([
            'name' => 'sometimes|string|max:128',
            'role' => 'sometimes|string|max:64',
            'org' => 'sometimes|nullable|string|max:128',
            'phone' => 'sometimes|nullable|string|max:32',
            'email' => 'sometimes|nullable|email|max:128',
            'status' => ['sometimes', 'string', Rule::in($allowed)],
            'notes' => 'sometimes|nullable|string|max:255',
        ]);

        $committeeMember->update($validated);
        return response()->json(['data' => $committeeMember]);
    }

    public function destroy(CommitteeMember $committeeMember): JsonResponse
    {
        $committeeMember->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 5: Run the tests again to verify they all pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter=CommitteeMemberApiTest
```

Expected: all 12 tests pass. If any fail, read the failure output, fix the controller, re-run.

- [ ] **Step 6: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add app/Http/Controllers/Api/CommitteeMemberController.php tests/Feature/CommitteeMemberApiTest.php routes/api.php && git commit -m "$(cat <<'EOF'
feat(api): /committee-members apiResource + per-kind status validation

CRUD endpoints with per-kind enum validation: BOT statuses are
confirmed|pending|declined; CPC statuses are active|on-leave|
stepped-down. Backend rejects cross-kind status values. Index
filterable by ?kind=bot|cpc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Seeder block

**Files:**
- Modify: `database/seeders/CrusadeSeeder.php`

- [ ] **Step 1: Add the import**

In `database/seeders/CrusadeSeeder.php`, find the existing `use App\Models\Stakeholder;` line near the top and add this immediately after it:

```php
use App\Models\CommitteeMember;
```

- [ ] **Step 2: Add the seed block**

Find the existing `// Stakeholders` block (around lines 318–334). Immediately AFTER the closing `}` of the `foreach ($stakeholders as ...)` loop, add this block:

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

- [ ] **Step 3: Re-seed and verify**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan migrate:fresh --seed
```

Expected: migrations re-run, seeder completes without errors.

Verify the records landed:

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan tinker --execute="echo App\Models\CommitteeMember::where('kind', 'bot')->count() . ' BOT, ' . App\Models\CommitteeMember::where('kind', 'cpc')->count() . ' CPC';"
```

Expected output: `3 BOT, 4 CPC`.

- [ ] **Step 4: Re-run all backend tests to confirm no regressions**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test
```

Expected: all tests pass (the existing AwarenessSurvey/Pastor/etc tests continue to pass; the new CommitteeMember tests pass).

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add database/seeders/CrusadeSeeder.php && git commit -m "$(cat <<'EOF'
feat(api): seed BOT + CPC committee members

3 BOT trustees + 4 CPC members so the rewired forms have data on first
load (matches the demo data shape the forms previously hard-coded as
SEED arrays).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Frontend hooks

**Files:**
- Modify: `web/src/api/hooks.ts` — append after the existing `useCreateAwarenessSurvey` block (currently the last export)

- [ ] **Step 1: Append the hooks**

Add to the bottom of `web/src/api/hooks.ts`:

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
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCommitteeMembers(kind: CommitteeKind) {
  return useQuery({
    queryKey: ['committee-members', kind],
    queryFn: () =>
      apiFetch<{ data: CommitteeMember[] }>(`/committee-members?kind=${kind}`).then((r) => r.data),
  });
}

export function useCreateCommitteeMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      kind: CommitteeKind;
      name: string;
      role: string;
      org: string | null;
      phone: string | null;
      email: string | null;
      status: string;
      notes: string | null;
    }) =>
      apiFetch<{ data: CommitteeMember }>('/committee-members', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['committee-members', vars.kind] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: exit 0.

- [ ] **Step 3: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit 1 with the same 4 baseline errors (no new ones from this task). The baseline errors are in `hooks.ts:74` (pre-existing `any[]`), `auth/AuthProvider.tsx:14`, `auth/LoginPage.tsx:22`, `screens/app/Shell.tsx:86`.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/api/hooks.ts && git commit -m "$(cat <<'EOF'
feat(web): useCommitteeMembers + useCreateCommitteeMember hooks

Parameterized by kind (bot|cpc) so BOT and CPC forms can share the
same hook instances. Mutation invalidates the per-kind query key on
success.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: BOTForm rewrite

**Files:**
- Modify: `web/src/screens/forms/BOTForm.tsx` — full rewrite (replace entire file)

- [ ] **Step 1: Replace the file contents**

Overwrite `/Users/adebimpegodwin/Projects/hjc/web/src/screens/forms/BOTForm.tsx` with:

```tsx
import { useState } from 'react';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, TextareaField } from './fields';
import {
  useCrusade,
  useCommitteeMembers,
  useCreateCommitteeMember,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Status = 'confirmed' | 'pending' | 'declined' | '';

type Draft = {
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
  status: Status;
  notes: string;
};

const emptyDraft: Draft = {
  name: '', role: '', organization: '', phone: '', email: '', status: '', notes: '',
};

const ErrorBanner = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
  <div style={{
    padding: '14px 16px',
    margin: '12px 20px',
    background: 'var(--accent-bg)',
    border: '1px solid var(--accent-soft)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  }}>
    <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load {what}.</div>
    <button
      type="button"
      onClick={onRetry}
      style={{
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 999,
        border: '1px solid var(--accent)',
        background: 'transparent',
        color: 'var(--accent)',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </div>
);

export function BOTForm() {
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: trustees, isLoading: trusteesLoading, isError: trusteesError, refetch: refetchTrustees } = useCommitteeMembers('bot');
  const createMutation = useCreateCommitteeMember();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave =
    !!crusade &&
    draft.name.trim() !== '' &&
    draft.role.trim() !== '' &&
    draft.phone.trim() !== '' &&
    draft.status !== '' &&
    !createMutation.isPending;

  const handleSave = async () => {
    if (!canSave || !crusade) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        kind: 'bot',
        name: draft.name.trim(),
        role: draft.role.trim(),
        org: draft.organization.trim() === '' ? null : draft.organization.trim(),
        phone: draft.phone.trim() === '' ? null : draft.phone.trim(),
        email: draft.email.trim() === '' ? null : draft.email.trim(),
        status: draft.status,
        notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      let message = 'Failed';
      if (e instanceof ApiError) {
        const body = e.body;
        if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
          message = (body as { message: string }).message;
        } else {
          message = e.message;
        }
      } else if (e instanceof Error) {
        message = e.message;
      }
      setSaveError(message);
    }
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>BOT <em>Board of Trustees</em></>}
          pillar="P3"
          primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
        >
          <ErrorBanner what="crusade" onRetry={refetchCrusade}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>BOT <em>Board of Trustees</em></>}
          pillar="P3"
          primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const list = trustees ?? [];
  const confirmedCount = list.filter((t) => t.status === 'confirmed').length;
  const pendingCount = list.filter((t) => t.status === 'pending').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>BOT <em>Board of Trustees</em></>}
        pillar="P3"
        primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{confirmedCount}</div>
            <div className="lbl">of {list.length} confirmed</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{pendingCount}</b> pending</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {trusteesError ? (
            <ErrorBanner what="trustees" onRetry={refetchTrustees}/>
          ) : trusteesLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No trustees yet.</div>
          ) : (
            list.map((t) => (
              <div key={t.id} className="form-list-row">
                <div>
                  <div className="name">{t.name}</div>
                  <div className="sub">{t.role}{t.org && ` · ${t.org}`}</div>
                </div>
                <div className="right">
                  <div className={'status ' + t.status}>{t.status}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{t.phone ?? ''}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add trustee'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Full name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required/>
              <TextField label="Role" placeholder="e.g. Treasurer" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
              <TextField label="Organization" value={draft.organization} onChange={(v) => setDraft({ ...draft, organization: v })}/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} required/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
              <SegmentedField
                label="Status"
                options={[
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'declined', label: 'Declined' },
                ]}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as Status })}
                required
              />
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            {saveError && (
              <div className="field-error" style={{ margin: '4px 0' }}>{saveError}</div>
            )}
            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>
                {createMutation.isPending ? 'Saving…' : 'Save trustee'}
              </button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: exit 0.

If you get a `TS2305` ("no exported member") for `useCommitteeMembers` or `useCreateCommitteeMember`, Task 4 wasn't completed correctly — verify those exports exist in `web/src/api/hooks.ts`.

- [ ] **Step 3: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit 1 with the same 4 baseline errors (no new ones from this task).

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/screens/forms/BOTForm.tsx && git commit -m "$(cat <<'EOF'
feat(web): wire BOTForm to /committee-members

Drop submitQueue/localStorage path. List query, create mutation,
loading/error states with the same per-query partial degradation
pattern as Awareness Survey. Stat strip and inline-add UX preserved
exactly. Status enum (confirmed/pending/declined) preserved as-is —
backend per-kind validator accepts these directly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: CPCForm rewrite

**Files:**
- Modify: `web/src/screens/forms/CPCForm.tsx` — full rewrite

- [ ] **Step 1: Replace the file contents**

Overwrite `/Users/adebimpegodwin/Projects/hjc/web/src/screens/forms/CPCForm.tsx` with:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, SelectField, TextareaField } from './fields';
import {
  useCrusade,
  useCommitteeMembers,
  useCreateCommitteeMember,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Status = 'active' | 'on-leave' | 'stepped-down' | '';

type Draft = {
  fullName: string;
  role: string;
  zone: string;
  phone: string;
  email: string;
  status: Status;
  notes: string;
};

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const STATUS_CLASS: Record<'active' | 'on-leave' | 'stepped-down', string> = {
  active: 'confirmed',
  'on-leave': 'pending',
  'stepped-down': 'declined',
};

const STATUS_LABEL: Record<'active' | 'on-leave' | 'stepped-down', string> = {
  active: 'active',
  'on-leave': 'on leave',
  'stepped-down': 'stepped down',
};

const emptyDraft: Draft = {
  fullName: '', role: '', zone: '', phone: '', email: '', status: '', notes: '',
};

const ErrorBanner = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
  <div style={{
    padding: '14px 16px',
    margin: '12px 20px',
    background: 'var(--accent-bg)',
    border: '1px solid var(--accent-soft)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  }}>
    <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load {what}.</div>
    <button
      type="button"
      onClick={onRetry}
      style={{
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 999,
        border: '1px solid var(--accent)',
        background: 'transparent',
        color: 'var(--accent)',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </div>
);

export function CPCForm() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: members, isLoading: membersLoading, isError: membersError, refetch: refetchMembers } = useCommitteeMembers('cpc');
  const createMutation = useCreateCommitteeMember();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave =
    !!crusade &&
    draft.fullName.trim() !== '' &&
    draft.role.trim() !== '' &&
    draft.zone !== '' &&
    draft.phone.trim() !== '' &&
    draft.status !== '' &&
    !createMutation.isPending;

  const handleSave = async () => {
    if (!canSave || !crusade) return;
    setSaveError(null);
    const zoneLabel = ZONES.find((z) => z.value === draft.zone)?.label ?? draft.zone;
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        kind: 'cpc',
        name: draft.fullName.trim(),
        role: draft.role.trim(),
        org: zoneLabel,
        phone: draft.phone.trim() === '' ? null : draft.phone.trim(),
        email: draft.email.trim() === '' ? null : draft.email.trim(),
        status: draft.status,
        notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      let message = 'Failed';
      if (e instanceof ApiError) {
        const body = e.body;
        if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
          message = (body as { message: string }).message;
        } else {
          message = e.message;
        }
      } else if (e instanceof Error) {
        message = e.message;
      }
      setSaveError(message);
    }
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>CPC <em>Central Planning</em></>}
          pillar="P4"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <ErrorBanner what="crusade" onRetry={refetchCrusade}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>CPC <em>Central Planning</em></>}
          pillar="P4"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const list = members ?? [];
  const isKnownStatus = (s: string): s is 'active' | 'on-leave' | 'stepped-down' =>
    s === 'active' || s === 'on-leave' || s === 'stepped-down';
  const activeCount = list.filter((m) => m.status === 'active').length;
  const onLeaveCount = list.filter((m) => m.status === 'on-leave').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>CPC <em>Central Planning</em></>}
        pillar="P4"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{activeCount}</div>
            <div className="lbl">of {list.length} active</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{onLeaveCount}</b> on leave</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {membersError ? (
            <ErrorBanner what="members" onRetry={refetchMembers}/>
          ) : membersLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No members yet.</div>
          ) : (
            list.map((m) => {
              const statusClass = isKnownStatus(m.status) ? STATUS_CLASS[m.status] : 'pending';
              const statusLabel = isKnownStatus(m.status) ? STATUS_LABEL[m.status] : m.status;
              return (
                <div key={m.id} className="form-list-row">
                  <div>
                    <div className="name">{m.name}</div>
                    <div className="sub">{m.role}{m.org && ` · ${m.org}`}</div>
                  </div>
                  <div className="right">
                    <div className={'status ' + statusClass}>{statusLabel}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{m.phone ?? ''}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add CPC member'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Full name" value={draft.fullName} onChange={(v) => setDraft({ ...draft, fullName: v })} required/>
              <TextField label="Role" placeholder="e.g. Zone Coordinator" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
              <SelectField label="Zone" required options={ZONES} value={draft.zone} onChange={(v) => setDraft({ ...draft, zone: v })} placeholder="Select zone…"/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} required/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
              <SegmentedField
                label="Status"
                required
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'on-leave', label: 'On leave' },
                  { value: 'stepped-down', label: 'Stepped down' },
                ]}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as Status })}
              />
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            {saveError && (
              <div className="field-error" style={{ margin: '4px 0' }}>{saveError}</div>
            )}
            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>
                {createMutation.isPending ? 'Saving…' : 'Save member'}
              </button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: exit 0.

- [ ] **Step 3: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit 1 with the same 4 baseline errors (no new ones).

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/screens/forms/CPCForm.tsx && git commit -m "$(cat <<'EOF'
feat(web): wire CPCForm to /committee-members

Same shape as BOT rewrite. Zone selector resolves to a label string
that's stored in the org column. Status enum (active/on-leave/
stepped-down) preserved as-is; STATUS_CLASS/STATUS_LABEL display maps
preserved so existing CSS color classes still apply.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

After all six tasks land:

- [ ] **Backend tests all pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test
```

Expected: full suite passes including 12 new CommitteeMember tests.

- [ ] **Frontend build clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run build
```

Expected: exit 0; bundle in `dist/`.

- [ ] **Frontend lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit 1 with the same 4 pre-existing errors (no new ones from any of Tasks 4–6).

- [ ] **End-to-end manual smoke**

1. Re-seed the database: `php artisan migrate:fresh --seed`
2. Confirm Laravel server is running (`php artisan serve --port=8001`) and Vite dev server is running (already up via the existing background processes).
3. Log in to the app at the ngrok URL.
4. Visit `/forms/bot`. Confirm the 3 seeded BOT trustees render with the right counts (`2 of 3 confirmed · 1 pending`).
5. Add a new trustee: name "Test Trustee", role "Test Role", phone "+233 24 999 9999", status "Pending". Click Save trustee. Confirm: button shows "Saving…" briefly, form closes, list updates with the new entry, count becomes `2 of 4 confirmed · 2 pending`.
6. Visit `/forms/cpc`. Confirm the 4 seeded CPC members render. Add a new one with status "Active" and a chosen zone. Confirm save round-trips and the org column shows the zone label (e.g., "Wa Central").
7. Network tab spot-check: each save fires exactly one `POST /api/committee-members`; on success the `GET /api/committee-members?kind=...` is invalidated and re-fetched.

---

## Self-review notes

**Spec coverage:**
- Decision 1 (new committee_members table) — Task 1 (migration + model + factory).
- Decision 2 (one endpoint, two kinds) — Task 2 (apiResource + ?kind filter in index).
- Decision 3 (per-kind status enum validation) — Task 2 (controller `STATUS_BY_KIND` constant + `Rule::in($allowed)` in store/update).
- Decision 4 (out of scope: edit/delete UI; backend supports both) — Task 2 ships PATCH/DELETE endpoints; no UI hooks defined.
- Decision 5 (no pagination) — Task 2 `index` returns `->orderBy('name')->get()` (no `paginate`).
- Decision 6 (keep list-with-inline-add UX) — Tasks 5, 6 preserve the existing JSX shapes.
- Loading/error states — Tasks 5, 6 (per-query degradation with `ErrorBanner` + `Loading…`).
- Mutation status UX — Tasks 5, 6 (`Saving…` button text + per-row `field-error` for backend message).
- Seeder — Task 3 (matches the SEED arrays the original forms had).

**Placeholder scan:** No "TBD" / "TODO" / "fill in later" / "add validation" — every step has runnable code or commands.

**Type consistency:**
- `CommitteeMember` interface (Task 4) used in `useCommitteeMembers` query type (Task 4) and consumed in BOTForm (Task 5) + CPCForm (Task 6).
- `CommitteeKind = 'bot' | 'cpc'` (Task 4) used as the `kind` argument to `useCommitteeMembers` and as the literal `'bot'` / `'cpc'` in mutation calls (Tasks 5, 6).
- Mutation body (Task 4) matches controller validation (Task 2): same field names (`crusade_id`, `kind`, `name`, `role`, `org`, `phone`, `email`, `status`, `notes`).
- Status enums match per kind: BOT (`'confirmed' | 'pending' | 'declined'`) in Task 5 form + Task 2 controller `STATUS_BY_KIND['bot']`. CPC (`'active' | 'on-leave' | 'stepped-down'`) in Task 6 form + Task 2 controller `STATUS_BY_KIND['cpc']`. Factory states (Task 1) match.
- Seeder values (Task 3) all valid per the per-kind enum.
