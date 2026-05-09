# Chunk 8a — Town Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the per-zone Town Profile form. Each zone gets one optional profile capturing language(s), religion mix, prior crusade history, and key contacts. New `town_profiles` table (1:1 with zones), apiResource, list-by-zone screen, and inline edit form.

**Architecture:** Backend: new `town_profiles` table with `zone_id` FK (unique), `apiResource('town-profiles')`. Frontend: `TownProfileScreen` lists all zones (joining `useZones` + `useTownProfiles`) with each zone's profile state ("complete" / "needs profile") and tap-to-edit. Form is an inline create-or-update against `/town-profiles` keyed by `zone_id`.

**Tech Stack:** Laravel 12 + PHPUnit Feature tests. React 19 + TypeScript strict + @tanstack/react-query v5.

**Spec:** `docs/superpowers/specs/2026-05-09-chunk-8-form-roster-triage.md` (Town Profile section)

---

## Data model

`town_profiles` columns:
- `id` — PK
- `zone_id` — FK → zones.id, **unique** (one profile per zone)
- `language_primary` — string(64) nullable
- `language_secondary` — string(64) nullable
- `religion_primary` — string(64) nullable (free-form: "Muslim", "Christian", "Mixed", etc.)
- `religion_mix_notes` — text nullable
- `prior_crusade_year` — integer nullable (range 1900-2100)
- `prior_crusade_notes` — text nullable
- `key_contacts` — text nullable (free-form list)
- `notes` — text nullable
- `created_at` / `updated_at`

`crusade_id` is *not* on town_profiles — derivable via `zone.crusade_id`. Keeps the relationship strict.

---

## File map

**Backend create:**
- `database/migrations/2026_05_09_create_town_profiles_table.php`
- `app/Models/TownProfile.php`
- `database/factories/TownProfileFactory.php`
- `app/Http/Controllers/Api/TownProfileController.php`
- `tests/Feature/TownProfileApiTest.php`

**Backend modify:**
- `routes/api.php` — add `apiResource('town-profiles', ...)`
- `app/Models/Zone.php` — add `townProfile(): HasOne` relationship

**Frontend create:**
- `web/src/screens/forms/TownProfileScreen.tsx` — list-by-zone + inline edit drawer

**Frontend modify:**
- `web/src/api/hooks.ts` — `TownProfile` type, `useTownProfiles`, `useUpsertTownProfile`
- `web/src/App.tsx` — add `/forms/town-profile` route

**Delete:** none.

---

## Task 1: Migration + model + factory + relationship

**Files:**
- Create: `database/migrations/2026_05_09_create_town_profiles_table.php`
- Create: `app/Models/TownProfile.php`
- Create: `database/factories/TownProfileFactory.php`
- Modify: `app/Models/Zone.php`

- [ ] **Step 1: Create the migration**

`database/migrations/2026_05_09_create_town_profiles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('town_profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('zone_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('language_primary', 64)->nullable();
            $t->string('language_secondary', 64)->nullable();
            $t->string('religion_primary', 64)->nullable();
            $t->text('religion_mix_notes')->nullable();
            $t->integer('prior_crusade_year')->nullable();
            $t->text('prior_crusade_notes')->nullable();
            $t->text('key_contacts')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('town_profiles');
    }
};
```

- [ ] **Step 2: Create the model**

`app/Models/TownProfile.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TownProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'zone_id',
        'language_primary',
        'language_secondary',
        'religion_primary',
        'religion_mix_notes',
        'prior_crusade_year',
        'prior_crusade_notes',
        'key_contacts',
        'notes',
    ];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
```

- [ ] **Step 3: Create the factory**

`database/factories/TownProfileFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

class TownProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'zone_id' => Zone::factory(),
            'language_primary' => $this->faker->randomElement(['Wala', 'Dagaare', 'Twi', 'Ewe', 'Ga']),
            'language_secondary' => null,
            'religion_primary' => $this->faker->randomElement(['Christian', 'Muslim', 'Mixed', 'Traditional']),
            'religion_mix_notes' => null,
            'prior_crusade_year' => null,
            'prior_crusade_notes' => null,
            'key_contacts' => null,
            'notes' => null,
        ];
    }
}
```

- [ ] **Step 4: Add the Zone relationship**

In `app/Models/Zone.php`, add the `townProfile()` HasOne relationship (and the matching import):

```php
use Illuminate\Database\Eloquent\Relations\HasOne;

// inside the class:
public function townProfile(): HasOne
{
    return $this->hasOne(TownProfile::class);
}
```

- [ ] **Step 5: Run the migration**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan migrate
```

Expected: `2026_05_09_create_town_profiles_table .... DONE`.

- [ ] **Step 6: Sanity-check the relationship**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan tinker --execute="\$z = App\Models\Zone::factory()->create(); App\Models\TownProfile::factory()->create(['zone_id' => \$z->id, 'language_primary' => 'Wala']); echo \$z->fresh()->townProfile->language_primary;"
```

Expected: `Wala`.

- [ ] **Step 7: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add database/migrations/2026_05_09_create_town_profiles_table.php app/Models/TownProfile.php database/factories/TownProfileFactory.php app/Models/Zone.php && git commit -m "$(cat <<'EOF'
feat(api): town_profiles table + model + zone hasOne

One profile per zone, enforced by unique zone_id. Captures language(s),
religion mix, prior crusade history, key contacts. crusade_id is not
denormalized — derive via zone.crusade_id.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Controller + apiResource + tests (TDD)

**Files:**
- Create: `app/Http/Controllers/Api/TownProfileController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/TownProfileApiTest.php`

- [ ] **Step 1: Write the failing tests**

`tests/Feature/TownProfileApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\TownProfile;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TownProfileApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    private Zone $zone;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
        $this->zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
    }

    public function test_index_returns_all_profiles(): void
    {
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        TownProfile::factory()->create(['zone_id' => $this->zone->id, 'language_primary' => 'Wala']);
        TownProfile::factory()->create(['zone_id' => $z2->id, 'language_primary' => 'Twi']);

        $this->getJson('/api/town-profiles')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_profile(): void
    {
        $response = $this->postJson('/api/town-profiles', [
            'zone_id' => $this->zone->id,
            'language_primary' => 'Wala',
            'religion_primary' => 'Mixed',
            'prior_crusade_year' => 2018,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.language_primary', 'Wala')
            ->assertJsonPath('data.religion_primary', 'Mixed')
            ->assertJsonPath('data.prior_crusade_year', 2018);
    }

    public function test_create_validates_required_zone_id(): void
    {
        $this->postJson('/api/town-profiles', [
            'language_primary' => 'Wala',
        ])->assertStatus(422)->assertJsonValidationErrors(['zone_id']);
    }

    public function test_create_rejects_duplicate_zone(): void
    {
        TownProfile::factory()->create(['zone_id' => $this->zone->id]);

        $this->postJson('/api/town-profiles', [
            'zone_id' => $this->zone->id,
            'language_primary' => 'Wala',
        ])->assertStatus(422)->assertJsonValidationErrors(['zone_id']);
    }

    public function test_can_show_profile(): void
    {
        $tp = TownProfile::factory()->create(['zone_id' => $this->zone->id, 'language_primary' => 'Wala']);

        $this->getJson("/api/town-profiles/{$tp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.language_primary', 'Wala');
    }

    public function test_can_update_profile(): void
    {
        $tp = TownProfile::factory()->create(['zone_id' => $this->zone->id, 'language_primary' => 'Wala']);

        $this->patchJson("/api/town-profiles/{$tp->id}", [
            'language_primary' => 'Dagaare',
            'notes' => 'updated',
        ])->assertStatus(200)
            ->assertJsonPath('data.language_primary', 'Dagaare')
            ->assertJsonPath('data.notes', 'updated');
    }

    public function test_can_delete_profile(): void
    {
        $tp = TownProfile::factory()->create(['zone_id' => $this->zone->id]);

        $this->deleteJson("/api/town-profiles/{$tp->id}")->assertStatus(204);
        $this->assertDatabaseMissing('town_profiles', ['id' => $tp->id]);
    }

    public function test_validates_prior_crusade_year_range(): void
    {
        $this->postJson('/api/town-profiles', [
            'zone_id' => $this->zone->id,
            'prior_crusade_year' => 1500,
        ])->assertStatus(422)->assertJsonValidationErrors(['prior_crusade_year']);
    }
}
```

- [ ] **Step 2: Run the failing tests**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter=TownProfileApiTest
```

Expected: all 8 tests fail (route doesn't exist yet → 404).

- [ ] **Step 3: Create the controller**

`app/Http/Controllers/Api/TownProfileController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TownProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TownProfileController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => TownProfile::all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id|unique:town_profiles,zone_id',
            'language_primary' => 'nullable|string|max:64',
            'language_secondary' => 'nullable|string|max:64',
            'religion_primary' => 'nullable|string|max:64',
            'religion_mix_notes' => 'nullable|string',
            'prior_crusade_year' => 'nullable|integer|min:1900|max:2100',
            'prior_crusade_notes' => 'nullable|string',
            'key_contacts' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $profile = TownProfile::create($validated);
        return response()->json(['data' => $profile], 201);
    }

    public function show(TownProfile $townProfile): JsonResponse
    {
        return response()->json(['data' => $townProfile]);
    }

    public function update(Request $request, TownProfile $townProfile): JsonResponse
    {
        $validated = $request->validate([
            'language_primary' => 'sometimes|nullable|string|max:64',
            'language_secondary' => 'sometimes|nullable|string|max:64',
            'religion_primary' => 'sometimes|nullable|string|max:64',
            'religion_mix_notes' => 'sometimes|nullable|string',
            'prior_crusade_year' => 'sometimes|nullable|integer|min:1900|max:2100',
            'prior_crusade_notes' => 'sometimes|nullable|string',
            'key_contacts' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
        ]);

        $townProfile->update($validated);
        return response()->json(['data' => $townProfile]);
    }

    public function destroy(TownProfile $townProfile): JsonResponse
    {
        $townProfile->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 4: Wire the route**

In `/Users/adebimpegodwin/Projects/hjc/routes/api.php`, add inside the `auth:sanctum` middleware group, near the other apiResource lines:

```php
Route::apiResource('town-profiles', \App\Http\Controllers\Api\TownProfileController::class);
```

- [ ] **Step 5: Run the tests — should pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter=TownProfileApiTest
```

Expected: all 8 pass.

- [ ] **Step 6: Run full backend suite for regressions**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test
```

Expected: full suite passes.

- [ ] **Step 7: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add app/Http/Controllers/Api/TownProfileController.php routes/api.php tests/Feature/TownProfileApiTest.php && git commit -m "$(cat <<'EOF'
feat(api): /town-profiles apiResource + 8 tests

Standard CRUD (index/store/show/update/destroy). Store validates
zone_id is required, exists, and unique (enforces 1:1 with zones).
prior_crusade_year validates 1900-2100. All other fields are
optional free-form strings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Frontend hooks

**Files:**
- Modify: `web/src/api/hooks.ts` — append type + 3 hooks (list, create, update)

- [ ] **Step 1: Append the hooks block**

Add to the bottom of `/Users/adebimpegodwin/Projects/hjc/web/src/api/hooks.ts`:

```ts
// === Town profiles ===
export interface TownProfile {
  id: number;
  zone_id: number;
  language_primary: string | null;
  language_secondary: string | null;
  religion_primary: string | null;
  religion_mix_notes: string | null;
  prior_crusade_year: number | null;
  prior_crusade_notes: string | null;
  key_contacts: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTownProfiles() {
  return useQuery({
    queryKey: ['town-profiles'],
    queryFn: () => apiFetch<{ data: TownProfile[] }>('/town-profiles').then((r) => r.data),
  });
}

export function useCreateTownProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      zone_id: number;
      language_primary?: string | null;
      language_secondary?: string | null;
      religion_primary?: string | null;
      religion_mix_notes?: string | null;
      prior_crusade_year?: number | null;
      prior_crusade_notes?: string | null;
      key_contacts?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: TownProfile }>('/town-profiles', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['town-profiles'] });
    },
  });
}

export function useUpdateTownProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        language_primary: string | null;
        language_secondary: string | null;
        religion_primary: string | null;
        religion_mix_notes: string | null;
        prior_crusade_year: number | null;
        prior_crusade_notes: string | null;
        key_contacts: string | null;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: TownProfile }>(`/town-profiles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['town-profiles'] });
    },
  });
}
```

- [ ] **Step 2: Verify TS + lint**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b; echo "tsc=$?"
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint 2>&1 | tail -3
```

Expected: tsc=0, 4 baseline errors only.

- [ ] **Step 3: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/api/hooks.ts && git commit -m "$(cat <<'EOF'
feat(web): TownProfile hooks (list, create, update)

Plus the TownProfile type. Update is PATCH with all fields optional
to match the controller's `sometimes|nullable` rules. Mutations
invalidate the town-profiles list query on success.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: TownProfileScreen (list + edit)

**Files:**
- Create: `web/src/screens/forms/TownProfileScreen.tsx`
- Modify: `web/src/App.tsx` — add route
- Modify: `web/src/screens/app/FormsScreen.tsx` — update meta from "Coming soon" → operational

- [ ] **Step 1: Create the screen**

`web/src/screens/forms/TownProfileScreen.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, NumberField } from './fields';
import {
  useZones,
  useTownProfiles,
  useCreateTownProfile,
  useUpdateTownProfile,
  type TownProfile,
  type Zone,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Draft = {
  language_primary: string;
  language_secondary: string;
  religion_primary: string;
  religion_mix_notes: string;
  prior_crusade_year: number | '';
  prior_crusade_notes: string;
  key_contacts: string;
  notes: string;
};

const draftFromProfile = (p: TownProfile | null): Draft => ({
  language_primary: p?.language_primary ?? '',
  language_secondary: p?.language_secondary ?? '',
  religion_primary: p?.religion_primary ?? '',
  religion_mix_notes: p?.religion_mix_notes ?? '',
  prior_crusade_year: p?.prior_crusade_year ?? '',
  prior_crusade_notes: p?.prior_crusade_notes ?? '',
  key_contacts: p?.key_contacts ?? '',
  notes: p?.notes ?? '',
});

function extractApiMessage(e: unknown, fallback = 'Failed'): string {
  if (e instanceof ApiError) {
    const body = e.body;
    if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
      return (body as { message: string }).message;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export function TownProfileScreen() {
  const navigate = useNavigate();
  const { data: zones, isLoading: zonesLoading, isError: zonesError, refetch: refetchZones } = useZones();
  const { data: profiles, isLoading: profilesLoading } = useTownProfiles();
  const createMutation = useCreateTownProfile();
  const updateMutation = useUpdateTownProfile();

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [draft, setDraft] = useState<Draft>(draftFromProfile(null));
  const [saveError, setSaveError] = useState<string | null>(null);

  const profileByZone = useMemo(
    () => new Map((profiles ?? []).map((p) => [p.zone_id, p] as const)),
    [profiles],
  );

  const profiledCount = (profiles ?? []).length;
  const totalZones = (zones ?? []).length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openEditor = (zone: Zone) => {
    const existing = profileByZone.get(zone.id) ?? null;
    setEditingZone(zone);
    setDraft(draftFromProfile(existing));
    setSaveError(null);
  };

  const closeEditor = () => {
    setEditingZone(null);
    setDraft(draftFromProfile(null));
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingZone) return;
    setSaveError(null);

    const payload = {
      language_primary: draft.language_primary.trim() || null,
      language_secondary: draft.language_secondary.trim() || null,
      religion_primary: draft.religion_primary.trim() || null,
      religion_mix_notes: draft.religion_mix_notes.trim() || null,
      prior_crusade_year: draft.prior_crusade_year === '' ? null : Number(draft.prior_crusade_year),
      prior_crusade_notes: draft.prior_crusade_notes.trim() || null,
      key_contacts: draft.key_contacts.trim() || null,
      notes: draft.notes.trim() || null,
    };

    try {
      const existing = profileByZone.get(editingZone.id) ?? null;
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, body: payload });
      } else {
        await createMutation.mutateAsync({ zone_id: editingZone.id, ...payload });
      }
      closeEditor();
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  if (zonesError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Town <em>Profile</em></>}
          pillar="A·all"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Couldn't load zones.</span>
            <button type="button" onClick={() => refetchZones()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
          </div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (zonesLoading || profilesLoading || !zones) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Town <em>Profile</em></>}
          pillar="A·all"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Town <em>Profile</em></>}
        pillar="A·all"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{profiledCount}</div>
            <div className="lbl">of {totalZones} zones profiled</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {zones.length === 0 ? (
            <div className="empty">No zones yet.</div>
          ) : (
            zones.map((z) => {
              const existing = profileByZone.get(z.id);
              return (
                <button
                  key={z.id}
                  type="button"
                  className="form-list-row"
                  onClick={() => openEditor(z)}
                  style={{ background: 'transparent', border: 0, padding: '14px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                >
                  <div>
                    <div className="name">{z.name ?? z.code}</div>
                    <div className="sub">
                      {existing
                        ? `${existing.language_primary ?? '—'} · ${existing.religion_primary ?? '—'}`
                        : 'No profile yet'}
                    </div>
                  </div>
                  <div className="right">
                    <div className={'status ' + (existing ? 'confirmed' : 'pending')}>
                      {existing ? 'Profiled' : 'Pending'}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {editingZone && (
          <div className="inline-form" style={{ marginTop: 24 }}>
            <div style={{ padding: '0 20px 12px', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>
              Editing — {editingZone.name ?? editingZone.code}
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Primary language" placeholder="e.g. Wala" value={draft.language_primary} onChange={(v) => setDraft({ ...draft, language_primary: v })}/>
              <TextField label="Secondary language" placeholder="optional" value={draft.language_secondary} onChange={(v) => setDraft({ ...draft, language_secondary: v })}/>
              <TextField label="Primary religion" placeholder="e.g. Christian / Muslim / Mixed" value={draft.religion_primary} onChange={(v) => setDraft({ ...draft, religion_primary: v })}/>
              <TextareaField label="Religion mix notes" value={draft.religion_mix_notes} onChange={(v) => setDraft({ ...draft, religion_mix_notes: v })}/>
              <NumberField label="Prior crusade year" placeholder="e.g. 2018" value={draft.prior_crusade_year} onChange={(v) => setDraft({ ...draft, prior_crusade_year: v })}/>
              <TextareaField label="Prior crusade notes" value={draft.prior_crusade_notes} onChange={(v) => setDraft({ ...draft, prior_crusade_notes: v })}/>
              <TextareaField label="Key contacts" value={draft.key_contacts} onChange={(v) => setDraft({ ...draft, key_contacts: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>

            {saveError && (
              <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>
            )}

            <div className="row">
              <button type="button" className="btn" onClick={closeEditor}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save profile'}
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

- [ ] **Step 2: Wire the route**

In `/Users/adebimpegodwin/Projects/hjc/web/src/App.tsx`, add the import:

```tsx
import { TownProfileScreen } from './screens/forms/TownProfileScreen';
```

And add the route BEFORE the `/forms/:slug` catch-all:

```tsx
<Route path="/forms/town-profile" element={<RequireAuth><TownProfileScreen /></RequireAuth>} />
```

- [ ] **Step 3: Update the FormsScreen meta**

In `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/FormsScreen.tsx`, change the Town Profile row:

```ts
{ n: 'Town Profile',              p: 'A·all', meta: 'Per-zone baseline',  due: 'OK', dueClass: 'ok',   slug: 'town-profile' },
```

(Drop "Coming soon" → real description. Will be replaced with live "X of Y zones profiled" when the live-counts cleanup chunk lands.)

- [ ] **Step 4: Verify TS + lint + build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b; echo "tsc=$?"
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint 2>&1 | tail -3
cd /Users/adebimpegodwin/Projects/hjc/web && npm run build 2>&1 | tail -3
```

Expected: tsc=0, 4 baseline lint errors only, build clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/screens/forms/TownProfileScreen.tsx web/src/App.tsx web/src/screens/app/FormsScreen.tsx && git commit -m "$(cat <<'EOF'
feat(web): Town Profile form (per-zone baseline)

List of all zones with profile status (Profiled / Pending). Tap a
zone to open the inline editor; save creates or updates the
town_profile keyed by zone_id. Stat strip shows X of Y zones
profiled. Hub row's "Coming soon" → "Per-zone baseline" now that
the form is wired.

Form fields: primary/secondary language, primary religion, religion
mix notes, prior crusade year + notes, key contacts, notes. All
optional — directors can fill in over time as they learn each zone.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

- [ ] **Backend tests pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test
```

Expected: full suite + 8 new TownProfileApiTest pass.

- [ ] **Frontend build clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run build
```

Expected: exit 0.

- [ ] **Frontend lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: same 4 baseline errors.

- [ ] **Manual smoke (browser, run by user)**

1. `php artisan migrate:fresh --seed` (or just `migrate` if you don't want to lose data)
2. Run `php artisan serve --port=8001` + `cd web && npm run dev`
3. Log in
4. Visit `/forms` — Town Profile row says "Per-zone baseline"; click it
5. List of zones renders with "Pending" pills (no profiles seeded yet)
6. Tap a zone — inline editor appears below; fill primary language + religion; click Save profile
7. Editor closes; that zone now shows "Profiled" pill with the language/religion in the sub line; stat strip increments to "1 of N zones profiled"
8. Tap the same zone again — editor reopens with previously saved values; change one field and save; sub line updates
