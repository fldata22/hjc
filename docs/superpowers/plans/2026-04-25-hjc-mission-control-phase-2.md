# HJC Mission Control — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 14-power framework + data sources for two of those powers (Awareness via surveys, Volunteers via worker rehearsals). Migrate `activity_entries.power` from string to FK against the new `powers` table.

**Architecture:** Same Laravel 13 + Sanctum scaffold as Phase 1. Continue on `main`. Backend-only.

**Tech Stack:** Laravel 13, PHP 8.3, Sanctum (token auth), SQLite (test/dev), PHPUnit feature tests with `RefreshDatabase`.

**Conventions inherited from Phase 1:**
- Controllers in `app/Http/Controllers/Api/` extending `App\Http\Controllers\Controller`
- Inline `$request->validate(...)`, no Form Requests
- Responses wrap data: `response()->json(['data' => ...])`
- Routes in `routes/api.php` inside the `auth:sanctum` group
- Numeric SUM aggregates use `number_format((float) $v, 2, '.', '')` to handle SQLite's int-cast quirk

**Spec:** `docs/superpowers/specs/2026-04-25-hjc-mission-control-phase-2-design.md`

---

## Task 1: Power model + 14-power data migration

**Files:**
- Create: `database/migrations/2026_04_25_110000_create_powers_table.php`
- Create: `app/Models/Power.php`
- Create: `database/factories/PowerFactory.php`
- Create: `tests/Feature/PowerModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model Power -mf
mv database/migrations/*_create_powers_table.php database/migrations/2026_04_25_110000_create_powers_table.php
```

- [ ] **Step 2: Write migration (table + seed in same migration)**

Replace `database/migrations/2026_04_25_110000_create_powers_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('powers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 64);
            $table->unsignedTinyInteger('order_index');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('powers')->insert([
            ['code' => 'pastors',      'name' => 'Pastors',      'order_index' => 1,  'description' => 'Pastor pipeline progression', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'awareness',    'name' => 'Awareness',    'order_index' => 2,  'description' => 'City-wide awareness of the crusade', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'volunteers',   'name' => 'Volunteers',   'order_index' => 3,  'description' => 'Worker rehearsal attendance', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'equipment',    'name' => 'Equipment',    'order_index' => 4,  'description' => 'Crusade ground equipment readiness', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'decisions',    'name' => 'Decisions',    'order_index' => 5,  'description' => 'Decisions for Christ at the crusade', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'discipleship', 'name' => 'Discipleship', 'order_index' => 6,  'description' => 'Follow-up and discipleship of converts', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'donors',       'name' => 'Donors',       'order_index' => 7,  'description' => 'Financial pipeline', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'drama',        'name' => 'Drama',        'order_index' => 8,  'description' => 'Counselling readiness (drama is the counselling/intervention ministry)', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'events',       'name' => 'Events',       'order_index' => 9,  'description' => 'Pre-crusade rehearsals and events', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'pledges',      'name' => 'Pledges',      'order_index' => 10, 'description' => 'Pastor pledge meetings', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'committees',   'name' => 'Committees',   'order_index' => 11, 'description' => 'Operating committees and their deliverables', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'publicity',    'name' => 'Publicity',    'order_index' => 12, 'description' => 'Radio, print, OOH publicity channels', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'budget',       'name' => 'Budget',       'order_index' => 13, 'description' => 'Budget tracking and burn', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'govt',         'name' => 'Government',   'order_index' => 14, 'description' => 'Stakeholder relations and permits', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('powers');
    }
};
```

- [ ] **Step 3: Write model**

Replace `app/Models/Power.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Power extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'name', 'order_index', 'description'];

    public function activityEntries(): HasMany
    {
        return $this->hasMany(ActivityEntry::class);
    }
}
```

- [ ] **Step 4: Write factory**

Replace `database/factories/PowerFactory.php`:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PowerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->slug(2),
            'name' => fake()->words(2, true),
            'order_index' => fake()->numberBetween(1, 14),
            'description' => fake()->sentence(),
        ];
    }
}
```

- [ ] **Step 5: Write test**

Create `tests/Feature/PowerModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Power;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PowerModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_seeds_14_powers(): void
    {
        $this->assertSame(14, Power::count());
        $this->assertNotNull(Power::where('code', 'awareness')->first());
        $this->assertNotNull(Power::where('code', 'volunteers')->first());
    }

    public function test_powers_have_unique_codes(): void
    {
        $duplicate = ['code' => 'awareness', 'name' => 'Dup', 'order_index' => 99];
        $this->expectException(\Illuminate\Database\QueryException::class);
        Power::create($duplicate);
    }

    public function test_powers_are_ordered_by_index(): void
    {
        $first = Power::orderBy('order_index')->first();
        $this->assertSame('pastors', $first->code);
    }
}
```

- [ ] **Step 6: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=PowerModelTest
```

Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add Power model + 14-power data migration"
```

---

## Task 2: PowerController (GET /powers, GET /powers/{code})

**Files:**
- Create: `app/Http/Controllers/Api/PowerController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/PowerApiTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/PowerApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PowerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_all_14_powers_ordered(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $response = $this->getJson('/api/powers');
        $response->assertOk()->assertJsonCount(14, 'data');
        $this->assertSame('pastors', $response->json('data.0.code'));
    }

    public function test_show_by_code(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/powers/awareness')
            ->assertOk()
            ->assertJsonPath('data.code', 'awareness')
            ->assertJsonPath('data.name', 'Awareness');
    }

    public function test_show_unknown_code_returns_404(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/powers/no-such-power')->assertStatus(404);
    }
}
```

- [ ] **Step 2: Write controller**

Create `app/Http/Controllers/Api/PowerController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Power;
use Illuminate\Http\JsonResponse;

class PowerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Power::orderBy('order_index')->get()]);
    }

    public function show(string $code): JsonResponse
    {
        $power = Power::where('code', $code)->firstOrFail();
        return response()->json(['data' => $power]);
    }
}
```

- [ ] **Step 3: Wire routes**

Inside the `auth:sanctum` group in `routes/api.php`, add:

```php
    Route::get('/powers', [\App\Http\Controllers\Api\PowerController::class, 'index']);
    Route::get('/powers/{code}', [\App\Http\Controllers\Api\PowerController::class, 'show']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=PowerApiTest
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): GET /powers list and lookup by code"
```

---

## Task 3: AwarenessSurvey model + migration + factory + test

**Files:**
- Create: `database/migrations/2026_04_25_110100_create_awareness_surveys_table.php`
- Create: `app/Models/AwarenessSurvey.php`
- Create: `database/factories/AwarenessSurveyFactory.php`
- Create: `tests/Feature/AwarenessSurveyModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model AwarenessSurvey -mf
mv database/migrations/*_create_awareness_surveys_table.php database/migrations/2026_04_25_110100_create_awareness_surveys_table.php
```

- [ ] **Step 2: Write migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('awareness_surveys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('survey_number');
            $table->unsignedInteger('surveyed_count');
            $table->unsignedInteger('attending_yes_count');
            $table->date('taken_on');
            $table->timestamps();
            $table->unique(['crusade_id', 'zone_id', 'survey_number']);
            $table->index(['crusade_id', 'survey_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('awareness_surveys');
    }
};
```

- [ ] **Step 3: Write model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AwarenessSurvey extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'zone_id', 'survey_number',
        'surveyed_count', 'attending_yes_count', 'taken_on',
    ];

    protected $casts = [
        'taken_on' => 'date',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function getPctAttribute(): float
    {
        if ($this->surveyed_count === 0) return 0.0;
        return round($this->attending_yes_count / $this->surveyed_count * 100, 2);
    }
}
```

- [ ] **Step 4: Write factory**

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

class AwarenessSurveyFactory extends Factory
{
    public function definition(): array
    {
        $surveyed = fake()->numberBetween(50, 200);
        return [
            'crusade_id' => Crusade::factory(),
            'zone_id' => Zone::factory(),
            'survey_number' => fake()->numberBetween(1, 6),
            'surveyed_count' => $surveyed,
            'attending_yes_count' => fake()->numberBetween(0, $surveyed),
            'taken_on' => fake()->dateTimeThisYear()->format('Y-m-d'),
        ];
    }
}
```

- [ ] **Step 5: Write test**

```php
<?php

namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AwarenessSurveyModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_pct_is_derived(): void
    {
        $survey = AwarenessSurvey::factory()->create([
            'surveyed_count' => 100,
            'attending_yes_count' => 28,
        ]);
        $this->assertSame(28.0, $survey->pct);
    }

    public function test_pct_handles_zero_surveyed(): void
    {
        $survey = AwarenessSurvey::factory()->create([
            'surveyed_count' => 0,
            'attending_yes_count' => 0,
        ]);
        $this->assertSame(0.0, $survey->pct);
    }

    public function test_unique_constraint_per_zone_survey(): void
    {
        $crusade = Crusade::factory()->create();
        $zone = Zone::factory()->create(['crusade_id' => $crusade->id]);
        AwarenessSurvey::factory()->create(['crusade_id' => $crusade->id, 'zone_id' => $zone->id, 'survey_number' => 1]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        AwarenessSurvey::factory()->create(['crusade_id' => $crusade->id, 'zone_id' => $zone->id, 'survey_number' => 1]);
    }
}
```

- [ ] **Step 6: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=AwarenessSurveyModelTest
```

Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add AwarenessSurvey model + migration + factory"
```

---

## Task 4: AwarenessSurveyController + trajectory endpoint

**Files:**
- Create: `app/Http/Controllers/Api/AwarenessSurveyController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/AwarenessSurveyApiTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/AwarenessSurveyApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AwarenessSurveyApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_surveys(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        AwarenessSurvey::factory()->count(3)->sequence(
            ['survey_number' => 1], ['survey_number' => 2], ['survey_number' => 3]
        )->create(['crusade_id' => $this->crusade->id, 'zone_id' => $zone->id]);

        $this->getJson('/api/awareness-surveys')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_filters_by_zone(): void
    {
        $z1 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        AwarenessSurvey::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z1->id, 'survey_number' => 1]);
        AwarenessSurvey::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z2->id, 'survey_number' => 1]);

        $this->getJson("/api/awareness-surveys?zone_id={$z1->id}")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_survey(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $response = $this->postJson('/api/awareness-surveys', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'survey_number' => 1,
            'surveyed_count' => 100,
            'attending_yes_count' => 28,
            'taken_on' => '2026-04-10',
        ]);
        $response->assertStatus(201)
            ->assertJsonPath('data.surveyed_count', 100)
            ->assertJsonPath('data.attending_yes_count', 28);
    }

    public function test_create_rejects_attending_greater_than_surveyed(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->postJson('/api/awareness-surveys', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'survey_number' => 1,
            'surveyed_count' => 50,
            'attending_yes_count' => 100,
            'taken_on' => '2026-04-10',
        ])->assertStatus(422)->assertJsonValidationErrors(['attending_yes_count']);
    }

    public function test_create_rejects_duplicate_zone_survey(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id, 'survey_number' => 1,
        ]);
        $this->postJson('/api/awareness-surveys', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'survey_number' => 1,
            'surveyed_count' => 80,
            'attending_yes_count' => 20,
            'taken_on' => '2026-04-12',
        ])->assertStatus(422)->assertJsonValidationErrors(['survey_number']);
    }

    public function test_can_patch_counts(): void
    {
        $survey = AwarenessSurvey::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/awareness-surveys/{$survey->id}", [
            'surveyed_count' => 150,
            'attending_yes_count' => 60,
        ])->assertOk()->assertJsonPath('data.surveyed_count', 150);
    }

    public function test_trajectory_returns_weighted_average_per_survey_number(): void
    {
        $z1 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        // Survey 1: zone1 100 surveyed, 30 yes; zone2 50 surveyed, 10 yes
        // Weighted: (30+10) / (100+50) = 40/150 = 26.67
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z1->id, 'survey_number' => 1,
            'surveyed_count' => 100, 'attending_yes_count' => 30,
        ]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z2->id, 'survey_number' => 1,
            'surveyed_count' => 50, 'attending_yes_count' => 10,
        ]);

        $response = $this->getJson('/api/awareness-surveys/trajectory');
        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('survey_number', 1);
        $this->assertSame(150, $row['surveyed_total']);
        $this->assertSame(40, $row['attending_yes_total']);
        $this->assertSame('26.67', $row['pct']);
    }
}
```

- [ ] **Step 2: Write controller**

Create `app/Http/Controllers/Api/AwarenessSurveyController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AwarenessSurveyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = AwarenessSurvey::query();
        if ($request->filled('zone_id')) {
            $q->where('zone_id', $request->integer('zone_id'));
        }
        if ($request->filled('survey_number')) {
            $q->where('survey_number', $request->integer('survey_number'));
        }
        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        return response()->json(['data' => $q->orderBy('zone_id')->orderBy('survey_number')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'zone_id' => 'required|exists:zones,id',
            'survey_number' => [
                'required', 'integer', 'min:1',
                Rule::unique('awareness_surveys')->where(fn ($q) => $q
                    ->where('crusade_id', $request->crusade_id)
                    ->where('zone_id', $request->zone_id)),
            ],
            'surveyed_count' => 'required|integer|min:0',
            'attending_yes_count' => 'required|integer|min:0|lte:surveyed_count',
            'taken_on' => 'required|date',
        ]);
        $survey = AwarenessSurvey::create($validated);
        return response()->json(['data' => $survey], 201);
    }

    public function update(Request $request, AwarenessSurvey $awarenessSurvey): JsonResponse
    {
        $validated = $request->validate([
            'surveyed_count' => 'sometimes|integer|min:0',
            'attending_yes_count' => 'sometimes|integer|min:0',
            'taken_on' => 'sometimes|date',
        ]);
        // Cross-field check after merge
        $newSurveyed = $validated['surveyed_count'] ?? $awarenessSurvey->surveyed_count;
        $newAttending = $validated['attending_yes_count'] ?? $awarenessSurvey->attending_yes_count;
        abort_if($newAttending > $newSurveyed, 422, 'attending_yes_count cannot exceed surveyed_count');

        $awarenessSurvey->update($validated);
        return response()->json(['data' => $awarenessSurvey]);
    }

    public function trajectory(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();
        $rows = AwarenessSurvey::where('crusade_id', $crusade->id)
            ->selectRaw('survey_number, SUM(surveyed_count) as surveyed_total, SUM(attending_yes_count) as attending_yes_total')
            ->groupBy('survey_number')
            ->orderBy('survey_number')
            ->get()
            ->map(fn ($r) => [
                'survey_number' => (int) $r->survey_number,
                'surveyed_total' => (int) $r->surveyed_total,
                'attending_yes_total' => (int) $r->attending_yes_total,
                'pct' => $r->surveyed_total > 0
                    ? number_format($r->attending_yes_total / $r->surveyed_total * 100, 2, '.', '')
                    : '0.00',
            ]);
        return response()->json(['data' => $rows]);
    }
}
```

- [ ] **Step 3: Wire routes**

Inside the `auth:sanctum` group in `routes/api.php`, add (place trajectory BEFORE the `{awarenessSurvey}` PATCH so the literal path resolves first):

```php
    Route::get('/awareness-surveys', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'index']);
    Route::post('/awareness-surveys', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'store']);
    Route::get('/awareness-surveys/trajectory', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'trajectory']);
    Route::patch('/awareness-surveys/{awarenessSurvey}', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'update']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=AwarenessSurveyApiTest
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): awareness surveys CRUD + weighted trajectory aggregate"
```

---

## Task 5: WorkerRehearsal model + migration + factory + test

**Files:**
- Create: `database/migrations/2026_04_25_110200_create_worker_rehearsals_table.php`
- Create: `app/Models/WorkerRehearsal.php`
- Create: `database/factories/WorkerRehearsalFactory.php`
- Create: `tests/Feature/WorkerRehearsalModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model WorkerRehearsal -mf
mv database/migrations/*_create_worker_rehearsals_table.php database/migrations/2026_04_25_110200_create_worker_rehearsals_table.php
```

- [ ] **Step 2: Write migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('worker_rehearsals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained()->cascadeOnDelete();
            $table->enum('group', ['choir', 'prayer', 'ushers', 'counsellors']);
            $table->unsignedTinyInteger('session_number');
            $table->unsignedInteger('attendance_count');
            $table->timestamps();
            $table->unique(['crusade_id', 'zone_id', 'group', 'session_number']);
            $table->index(['crusade_id', 'group', 'session_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_rehearsals');
    }
};
```

- [ ] **Step 3: Write model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkerRehearsal extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'zone_id', 'group', 'session_number', 'attendance_count',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
```

- [ ] **Step 4: Write factory**

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkerRehearsalFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'zone_id' => Zone::factory(),
            'group' => fake()->randomElement(['choir', 'prayer', 'ushers', 'counsellors']),
            'session_number' => fake()->numberBetween(1, 7),
            'attendance_count' => fake()->numberBetween(0, 200),
        ];
    }
}
```

- [ ] **Step 5: Write test**

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\WorkerRehearsal;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkerRehearsalModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_unique_per_zone_group_session(): void
    {
        $crusade = Crusade::factory()->create();
        $zone = Zone::factory()->create(['crusade_id' => $crusade->id]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1, 'attendance_count' => 50,
        ]);
        $this->expectException(\Illuminate\Database\QueryException::class);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1, 'attendance_count' => 60,
        ]);
    }

    public function test_belongs_to_crusade_and_zone(): void
    {
        $r = WorkerRehearsal::factory()->create();
        $this->assertInstanceOf(Crusade::class, $r->crusade);
        $this->assertInstanceOf(Zone::class, $r->zone);
    }
}
```

- [ ] **Step 6: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=WorkerRehearsalModelTest
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add WorkerRehearsal model + migration + factory"
```

---

## Task 6: WorkerRehearsalController (GET, POST, PATCH)

**Files:**
- Create: `app/Http/Controllers/Api/WorkerRehearsalController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/WorkerRehearsalApiTest.php`

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\User;
use App\Models\WorkerRehearsal;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkerRehearsalApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_rehearsals(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        WorkerRehearsal::factory()->count(3)->sequence(
            ['session_number' => 1, 'group' => 'choir'],
            ['session_number' => 2, 'group' => 'choir'],
            ['session_number' => 1, 'group' => 'ushers'],
        )->create(['crusade_id' => $this->crusade->id, 'zone_id' => $zone->id]);

        $this->getJson('/api/worker-rehearsals')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_filters_by_group(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1,
        ]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id,
            'group' => 'ushers', 'session_number' => 1,
        ]);

        $this->getJson('/api/worker-rehearsals?group=choir')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_rehearsal(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $response = $this->postJson('/api/worker-rehearsals', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'group' => 'choir',
            'session_number' => 1,
            'attendance_count' => 94,
        ]);
        $response->assertStatus(201)->assertJsonPath('data.attendance_count', 94);
    }

    public function test_create_validates_group_enum(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->postJson('/api/worker-rehearsals', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'group' => 'invalid_group',
            'session_number' => 1,
            'attendance_count' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors(['group']);
    }

    public function test_create_rejects_duplicate_session(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1,
        ]);
        $this->postJson('/api/worker-rehearsals', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'group' => 'choir',
            'session_number' => 1,
            'attendance_count' => 99,
        ])->assertStatus(422)->assertJsonValidationErrors(['session_number']);
    }

    public function test_can_patch_attendance(): void
    {
        $r = WorkerRehearsal::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/worker-rehearsals/{$r->id}", ['attendance_count' => 120])
            ->assertOk()->assertJsonPath('data.attendance_count', 120);
    }
}
```

- [ ] **Step 2: Write controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkerRehearsal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkerRehearsalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = WorkerRehearsal::query();
        if ($request->filled('zone_id')) $q->where('zone_id', $request->integer('zone_id'));
        if ($request->filled('group')) $q->where('group', $request->string('group'));
        if ($request->filled('session_number')) $q->where('session_number', $request->integer('session_number'));
        return response()->json(['data' => $q->orderBy('zone_id')->orderBy('group')->orderBy('session_number')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'zone_id' => 'required|exists:zones,id',
            'group' => 'required|in:choir,prayer,ushers,counsellors',
            'session_number' => [
                'required', 'integer', 'min:1',
                Rule::unique('worker_rehearsals')->where(fn ($q) => $q
                    ->where('crusade_id', $request->crusade_id)
                    ->where('zone_id', $request->zone_id)
                    ->where('group', $request->group)),
            ],
            'attendance_count' => 'required|integer|min:0',
        ]);
        $r = WorkerRehearsal::create($validated);
        return response()->json(['data' => $r], 201);
    }

    public function update(Request $request, WorkerRehearsal $workerRehearsal): JsonResponse
    {
        $validated = $request->validate([
            'attendance_count' => 'sometimes|integer|min:0',
        ]);
        $workerRehearsal->update($validated);
        return response()->json(['data' => $workerRehearsal]);
    }
}
```

- [ ] **Step 3: Wire routes**

Inside the `auth:sanctum` group:

```php
    Route::get('/worker-rehearsals', [\App\Http\Controllers\Api\WorkerRehearsalController::class, 'index']);
    Route::post('/worker-rehearsals', [\App\Http\Controllers\Api\WorkerRehearsalController::class, 'store']);
    Route::patch('/worker-rehearsals/{workerRehearsal}', [\App\Http\Controllers\Api\WorkerRehearsalController::class, 'update']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=WorkerRehearsalApiTest
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): worker rehearsals CRUD"
```

---

## Task 7: Migrate `activity_entries.power` from string to FK

**Files:**
- Create: `database/migrations/2026_04_25_110300_migrate_activity_entries_power_to_fk.php`
- Modify: `app/Models/ActivityEntry.php`
- Modify: `database/factories/ActivityEntryFactory.php`
- Modify: `app/Http/Controllers/Api/ActivityEntryController.php`
- Modify: `tests/Feature/ActivityEntryModelTest.php`
- Modify: `tests/Feature/ActivityEntryApiTest.php`

This is the breaking-schema-change task. Existing rows using string `power` get converted via JOIN to `powers.code`. The string column is then dropped.

- [ ] **Step 1: Write migration**

Create `database/migrations/2026_04_25_110300_migrate_activity_entries_power_to_fk.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Step A: add nullable FK
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->foreignId('power_id')->nullable()->after('description')->constrained('powers')->nullOnDelete();
        });

        // Step B: backfill from existing string column
        // Match by code; rows with unknown power codes will keep power_id = NULL and need manual fix
        DB::statement("
            UPDATE activity_entries
            SET power_id = (SELECT id FROM powers WHERE powers.code = activity_entries.power)
        ");

        // Step C: drop the old index that references the dropped string column, then drop the column
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->dropIndex(['crusade_id', 'power']);
            $table->dropColumn('power');
        });

        // Step D: add new index on FK
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->index(['crusade_id', 'power_id']);
        });
    }

    public function down(): void
    {
        // Reverse: re-add string column, backfill from FK, drop FK
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->dropIndex(['crusade_id', 'power_id']);
            $table->string('power', 32)->nullable()->after('description');
        });

        DB::statement("
            UPDATE activity_entries
            SET power = (SELECT code FROM powers WHERE powers.id = activity_entries.power_id)
        ");

        Schema::table('activity_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('power_id');
            $table->index(['crusade_id', 'power']);
        });
    }
};
```

- [ ] **Step 2: Update ActivityEntry model**

Replace `app/Models/ActivityEntry.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityEntry extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'user_id', 'occurred_at', 'description', 'power_id', 'status'];

    protected $casts = ['occurred_at' => 'datetime'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function power(): BelongsTo
    {
        return $this->belongsTo(Power::class);
    }
}
```

- [ ] **Step 3: Update ActivityEntry factory**

Replace `database/factories/ActivityEntryFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\Power;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ActivityEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'user_id' => User::factory(),
            'occurred_at' => fake()->dateTimeThisMonth(),
            'description' => fake()->sentence(),
            'power_id' => Power::inRandomOrder()->first()?->id ?? Power::factory(),
            'status' => 'done',
        ];
    }
}
```

- [ ] **Step 4: Update ActivityEntryController**

Replace `app/Http/Controllers/Api/ActivityEntryController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityEntry;
use App\Models\Power;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ActivityEntry::query()->with('power:id,code,name');

        if ($request->filled('date')) {
            $q->whereDate('occurred_at', $request->date('date'));
        }
        if ($request->filled('power')) {
            // accept either power code or power_id for filtering
            $code = $request->string('power')->toString();
            $q->whereHas('power', fn ($p) => $p->where('code', $code));
        }
        if ($request->filled('power_id')) {
            $q->where('power_id', $request->integer('power_id'));
        }

        return response()->json(['data' => $q->orderByDesc('occurred_at')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        // Accept either power_id (preferred) or power_code (convenience)
        $payload = $request->all();
        if (! isset($payload['power_id']) && isset($payload['power_code'])) {
            $power = Power::where('code', $payload['power_code'])->first();
            if ($power) $payload['power_id'] = $power->id;
        }

        $validated = validator($payload, [
            'crusade_id' => 'required|exists:crusades,id',
            'occurred_at' => 'required|date',
            'description' => 'required|string',
            'power_id' => 'required|exists:powers,id',
            'status' => 'nullable|in:done,running',
        ])->validate();

        $validated['user_id'] = $request->user()->id;
        $entry = ActivityEntry::create($validated);
        $entry->load('power:id,code,name');
        return response()->json(['data' => $entry], 201);
    }
}
```

- [ ] **Step 5: Update existing ActivityEntryModelTest**

Replace `tests/Feature/ActivityEntryModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\ActivityEntry;
use App\Models\Power;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityEntryModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_entry_belongs_to_user_crusade_and_power(): void
    {
        $entry = ActivityEntry::factory()->create();
        $this->assertInstanceOf(User::class, $entry->user);
        $this->assertNotNull($entry->crusade);
        $this->assertInstanceOf(Power::class, $entry->power);
    }
}
```

- [ ] **Step 6: Update existing ActivityEntryApiTest**

Replace `tests/Feature/ActivityEntryApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\ActivityEntry;
use App\Models\Crusade;
use App\Models\Power;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityEntryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_today_by_default(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        ActivityEntry::factory()->create([
            'crusade_id' => $crusade->id, 'user_id' => $user->id, 'occurred_at' => now(),
        ]);
        ActivityEntry::factory()->create([
            'crusade_id' => $crusade->id, 'user_id' => $user->id, 'occurred_at' => now()->subDays(3),
        ]);

        $this->getJson('/api/activity-entries?date=' . now()->toDateString())
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_filters_by_power_code(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();
        $pastors = Power::where('code', 'pastors')->first();
        $budget = Power::where('code', 'budget')->first();

        ActivityEntry::factory()->create([
            'crusade_id' => $crusade->id, 'user_id' => $user->id, 'power_id' => $pastors->id,
        ]);
        ActivityEntry::factory()->create([
            'crusade_id' => $crusade->id, 'user_id' => $user->id, 'power_id' => $budget->id,
        ]);

        $this->getJson('/api/activity-entries?power=pastors')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_entry_via_power_id(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();
        $pledges = Power::where('code', 'pledges')->first();

        $response = $this->postJson('/api/activity-entries', [
            'crusade_id' => $crusade->id,
            'occurred_at' => '2026-04-21 11:00:00',
            'description' => 'Pledge meeting #3 · Kabwata · 62 attended',
            'power_id' => $pledges->id,
            'status' => 'done',
        ]);
        $response->assertStatus(201)
            ->assertJsonPath('data.power.code', 'pledges')
            ->assertJsonPath('data.power.name', 'Pledges');
    }

    public function test_can_create_entry_via_power_code_convenience(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        $response = $this->postJson('/api/activity-entries', [
            'crusade_id' => $crusade->id,
            'occurred_at' => '2026-04-21 11:00:00',
            'description' => 'Test entry',
            'power_code' => 'budget',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.power.code', 'budget');
    }
}
```

- [ ] **Step 7: Run all activity-entry tests + full suite**

```bash
cd ~/Projects/hjc
php artisan test --filter=ActivityEntry
php artisan test
```

Expected: ActivityEntryModelTest + ActivityEntryApiTest all pass; full suite green.

- [ ] **Step 8: Update CrusadeSeeder so it doesn't reference the dropped `power` string column**

Read the existing `database/seeders/CrusadeSeeder.php`. Find the `ActivityEntry::create([...])` calls — they currently set `'power' => $powers[array_rand($powers)]`. Replace with `'power_id' => Power::where('code', $powers[array_rand($powers)])->first()->id`. The `$powers` local string array can stay (just used as code lookups).

Then add the import: `use App\Models\Power;` at the top.

Run:

```bash
cd ~/Projects/hjc
php artisan migrate:fresh --seed
php artisan test --filter=DatabaseSeederTest
```

Expected: seeder runs cleanly; DatabaseSeederTest still passes.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): migrate activity_entries.power string to FK against powers"
```

---

## Task 8: Extend CrusadeSeeder with Phase 2 data

**Files:**
- Modify: `database/seeders/CrusadeSeeder.php`
- Modify: `tests/Feature/DatabaseSeederTest.php`

- [ ] **Step 1: Update DatabaseSeederTest with new assertions**

Edit `tests/Feature/DatabaseSeederTest.php` — append to the existing `test_seeder_populates_realistic_data` method these assertions:

```php
        $this->assertGreaterThanOrEqual(48, \DB::table('awareness_surveys')->count());   // 8 zones × 6 surveys
        $this->assertGreaterThan(0, \DB::table('worker_rehearsals')->count());
        $this->assertSame(14, \DB::table('powers')->count());
```

(Powers are seeded by their migration, not the seeder, but the count assertion is harmless and confirms the migration ran.)

- [ ] **Step 2: Update CrusadeSeeder to add Phase 2 seed**

Edit `database/seeders/CrusadeSeeder.php` — add these blocks **after** the activity-entries seed and **before** the reminders seed:

```php
        // Awareness surveys — 8 zones × 6 surveys, anchored to DW.2 hi-fi numbers.
        // Hi-fi matrix (% values per survey 1-6):
        // Z01: [10,12,28,30,35,42], Z02: [8,14,22,35,18,21], Z03: [12,26,30,61,52,68],
        // Z04: [5,8,12,14,9,11],   Z05: [-,-,8,10,7,12],     Z06: [-,-,-,15,18,22],
        // Z07: [14,12,22,26,8,10], Z08: [-,-,14,18,21,24]
        $awarenessMatrix = [
            ['Z01', [10, 12, 28, 30, 35, 42]],
            ['Z02', [8, 14, 22, 35, 18, 21]],
            ['Z03', [12, 26, 30, 61, 52, 68]],
            ['Z04', [5, 8, 12, 14, 9, 11]],
            ['Z05', [null, null, 8, 10, 7, 12]],
            ['Z06', [null, null, null, 15, 18, 22]],
            ['Z07', [14, 12, 22, 26, 8, 10]],
            ['Z08', [null, null, 14, 18, 21, 24]],
        ];
        foreach ($awarenessMatrix as [$zoneCode, $pcts]) {
            $z = $zones->firstWhere('code', $zoneCode);
            if (! $z) continue;
            foreach ($pcts as $i => $pct) {
                if ($pct === null) continue;
                \App\Models\AwarenessSurvey::create([
                    'crusade_id' => $crusade->id,
                    'zone_id' => $z->id,
                    'survey_number' => $i + 1,
                    'surveyed_count' => 100,
                    'attending_yes_count' => $pct,
                    'taken_on' => now()->subDays((6 - $i) * 7)->toDateString(),
                ]);
            }
        }

        // Worker rehearsals — anchored to DW.3 hi-fi numbers (matrix shows attendance counts).
        // Hi-fi matrix (per zone, sessions R1-R7, mixed groups — we'll use 'choir' for all to keep seed simple):
        // Z01: [94,66,82,95,12,-,-], Z02: [28,14,52,88,-,-,-], Z03: [120,96,142,155,88,-,-],
        // Z04: [8,-,14,-,-,-,-],     Z07: [52,22,66,88,-,-,-]
        $rehearsalMatrix = [
            ['Z01', [94, 66, 82, 95, 12, null, null]],
            ['Z02', [28, 14, 52, 88, null, null, null]],
            ['Z03', [120, 96, 142, 155, 88, null, null]],
            ['Z04', [8, null, 14, null, null, null, null]],
            ['Z07', [52, 22, 66, 88, null, null, null]],
        ];
        foreach ($rehearsalMatrix as [$zoneCode, $counts]) {
            $z = $zones->firstWhere('code', $zoneCode);
            if (! $z) continue;
            foreach ($counts as $i => $count) {
                if ($count === null) continue;
                \App\Models\WorkerRehearsal::create([
                    'crusade_id' => $crusade->id,
                    'zone_id' => $z->id,
                    'group' => 'choir',
                    'session_number' => $i + 1,
                    'attendance_count' => $count,
                ]);
            }
        }
```

- [ ] **Step 3: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=DatabaseSeederTest
php artisan test
```

Expected: DatabaseSeederTest passes with new assertions; full suite green.

- [ ] **Step 4: Apply seed to dev DB to verify**

```bash
cd ~/Projects/hjc
php artisan migrate:fresh --seed
php artisan tinker --execute="echo App\Models\AwarenessSurvey::count() . PHP_EOL; echo App\Models\WorkerRehearsal::count() . PHP_EOL;"
```

Expected: prints 39 (sum of non-null cells in awareness matrix) and 17 (sum of non-null cells in rehearsal matrix).

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(seed): add Phase 2 awareness + worker rehearsal seed data"
```

---

## Final verification

- [ ] **Step 1: Full test run**

```bash
cd ~/Projects/hjc
php artisan test
```

Expected: all green. Should be ~70 tests now (52 from Phase 1 + ~18 added in Phase 2).

- [ ] **Step 2: Manual smoke test of new endpoints**

```bash
cd ~/Projects/hjc
php artisan migrate:fresh --seed
php artisan serve --port=8001 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

TOKEN=$(curl -s -X POST http://127.0.0.1:8001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"director@hjc.test","password":"password"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "=== /api/powers ==="
curl -s http://127.0.0.1:8001/api/powers -H "Authorization: Bearer $TOKEN" | head -c 600
echo
echo "=== /api/awareness-surveys/trajectory ==="
curl -s http://127.0.0.1:8001/api/awareness-surveys/trajectory -H "Authorization: Bearer $TOKEN"
echo
echo "=== /api/worker-rehearsals?group=choir ==="
curl -s "http://127.0.0.1:8001/api/worker-rehearsals?group=choir" -H "Authorization: Bearer $TOKEN" | head -c 600

kill $SERVER_PID 2>/dev/null || pkill -f "artisan serve --port=8001" 2>/dev/null || true
```

Expected: each call returns 200 with sensible data.

- [ ] **Step 3: Final commit (if any cleanup)**

```bash
cd ~/Projects/hjc
git status
git log --oneline | head -15
```

---

## Notes for Phase 3+

- **Phase 3** layers on Operations: Committee, Conference (Track/Session/Registration), PublicityChannel, Stakeholder, Permit. Each is a new resource with CRUD + tests, similar pattern to Phase 1's API tasks.
- **Phase 4** brings Budget tables, WeeklyAssessment, and the Mission Control rollup endpoint. The Mission Control rollup needs to compute readiness % for all 14 powers — this is where the Awareness/Volunteers formulas (now sittable on the data added in Phase 2) get implemented alongside formulas for Pastors (from `pastors`/`pipeline_stage`), Pledges (from `pledges`/`crusade_targets`), Budget, etc.
- The `Power` table is intentionally framework-only (no per-crusade target stored on it). Per-crusade targets live on Crusade columns (`pastors_target`, `awareness_target_pct`, …) for now. If Phase 4 needs richer per-crusade target metadata, a `crusade_power_targets` join table is the natural next step.
