# HJC Mission Control — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend support for the four Operations screens — DW.6 (Committees), DW.8 (Conference), DW.9 (Publicity), DW.10 (Govt & permits). 8 new tables, ~14 controllers, ~25 endpoints.

**Architecture:** Same Laravel 13 + Sanctum scaffold. Continue on `main`. Backend-only.

**Conventions** (carried from Phases 1 & 2):
- Controllers in `app/Http/Controllers/Api/`
- Inline `$request->validate(...)`, no Form Requests
- Responses wrap data: `response()->json(['data' => ...])`
- Routes in `routes/api.php` inside the `auth:sanctum` group
- SUM aggregates use `number_format((float) $v, 2, '.', '')` to handle SQLite int-cast quirk

**Spec:** `docs/superpowers/specs/2026-04-25-hjc-mission-control-phase-3-design.md`

---

## Task 1: Committee model + migration + factory + test

**Files:** `database/migrations/2026_04_25_120000_create_committees_table.php`, `app/Models/Committee.php`, `database/factories/CommitteeFactory.php`, `tests/Feature/CommitteeModelTest.php`

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model Committee -mf
mv database/migrations/*_create_committees_table.php database/migrations/2026_04_25_120000_create_committees_table.php
```

- [ ] **Step 2: Migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('committees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->string('chair_name', 128);
            $table->string('focus_area', 32)->nullable();
            $table->enum('status', ['on_track', 'watch', 'at_risk'])->default('on_track');
            $table->unsignedTinyInteger('deliverables_done_pct')->default(0);
            $table->unsignedSmallInteger('member_count')->default(0);
            $table->date('next_meeting_on')->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('committees'); }
};
```

- [ ] **Step 3: Model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Committee extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'chair_name', 'focus_area', 'status', 'deliverables_done_pct', 'member_count', 'next_meeting_on'];
    protected $casts = ['next_meeting_on' => 'date'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
```

- [ ] **Step 4: Factory**

```php
<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommitteeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->randomElement(['Steering', 'Finance', 'Logistics', 'Counselling']),
            'chair_name' => fake()->name(),
            'focus_area' => fake()->randomElement(['publicity', 'finance', 'logistics']),
            'status' => fake()->randomElement(['on_track', 'watch', 'at_risk']),
            'deliverables_done_pct' => fake()->numberBetween(0, 100),
            'member_count' => fake()->numberBetween(3, 12),
            'next_meeting_on' => fake()->dateTimeBetween('now', '+2 weeks')->format('Y-m-d'),
        ];
    }
}
```

- [ ] **Step 5: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Committee;
use App\Models\Crusade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommitteeModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_a_committee(): void
    {
        $c = Committee::factory()->create(['name' => 'Steering', 'status' => 'on_track']);
        $this->assertSame('Steering', $c->name);
        $this->assertInstanceOf(Crusade::class, $c->crusade);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=CommitteeModelTest
git add -A && git commit -m "feat(data): add Committee model + migration + factory"
```

---

## Task 2: CommitteeController CRUD + eyebrow stats

**Files:** `app/Http/Controllers/Api/CommitteeController.php`, `routes/api.php`, `tests/Feature/CommitteeApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Committee;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommitteeApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_lists_committees_with_status_counts(): void
    {
        Committee::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'status' => 'on_track']);
        Committee::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'watch']);
        Committee::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'at_risk']);

        $r = $this->getJson('/api/committees');
        $r->assertOk()->assertJsonCount(4, 'data')
          ->assertJsonPath('meta.eyebrow_stats.on_track', 2)
          ->assertJsonPath('meta.eyebrow_stats.watch', 1)
          ->assertJsonPath('meta.eyebrow_stats.at_risk', 1);
    }

    public function test_can_create_committee(): void
    {
        $r = $this->postJson('/api/committees', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Steering',
            'chair_name' => 'D. Boateng',
            'status' => 'on_track',
            'deliverables_done_pct' => 88,
            'member_count' => 7,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Steering');
    }

    public function test_create_validates_status_enum(): void
    {
        $this->postJson('/api/committees', [
            'crusade_id' => $this->crusade->id,
            'name' => 'X', 'chair_name' => 'Y', 'status' => 'invalid',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_can_update_committee(): void
    {
        $c = Committee::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'watch']);
        $this->patchJson("/api/committees/{$c->id}", ['status' => 'on_track'])
            ->assertOk()->assertJsonPath('data.status', 'on_track');
    }

    public function test_can_delete_committee(): void
    {
        $c = Committee::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/committees/{$c->id}")->assertStatus(204);
        $this->assertDatabaseMissing('committees', ['id' => $c->id]);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Committee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommitteeController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Committee::orderBy('name')->get();
        $counts = Committee::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        return response()->json([
            'data' => $rows,
            'meta' => [
                'eyebrow_stats' => [
                    'on_track' => (int) ($counts['on_track'] ?? 0),
                    'watch' => (int) ($counts['watch'] ?? 0),
                    'at_risk' => (int) ($counts['at_risk'] ?? 0),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:64',
            'chair_name' => 'required|string|max:128',
            'focus_area' => 'nullable|string|max:32',
            'status' => 'nullable|in:on_track,watch,at_risk',
            'deliverables_done_pct' => 'nullable|integer|min:0|max:100',
            'member_count' => 'nullable|integer|min:0',
            'next_meeting_on' => 'nullable|date',
        ]);
        return response()->json(['data' => Committee::create($v)], 201);
    }

    public function show(Committee $committee): JsonResponse { return response()->json(['data' => $committee]); }

    public function update(Request $request, Committee $committee): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:64',
            'chair_name' => 'sometimes|string|max:128',
            'focus_area' => 'sometimes|nullable|string|max:32',
            'status' => 'sometimes|in:on_track,watch,at_risk',
            'deliverables_done_pct' => 'sometimes|integer|min:0|max:100',
            'member_count' => 'sometimes|integer|min:0',
            'next_meeting_on' => 'sometimes|nullable|date',
        ]);
        $committee->update($v);
        return response()->json(['data' => $committee]);
    }

    public function destroy(Committee $committee): JsonResponse
    {
        $committee->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Route**

Inside `auth:sanctum` group: `Route::apiResource('committees', \App\Http\Controllers\Api\CommitteeController::class);`

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=CommitteeApiTest
git add -A && git commit -m "feat(api): committees CRUD with eyebrow status counts"
```

---

## Task 3: Conference + ConferenceTrack models

**Files:** `database/migrations/2026_04_25_120100_create_conferences_table.php`, `database/migrations/2026_04_25_120200_create_conference_tracks_table.php`, `app/Models/Conference.php`, `app/Models/ConferenceTrack.php`, factories + test

- [ ] **Step 1: Generate both**

```bash
cd ~/Projects/hjc
php artisan make:model Conference -mf
mv database/migrations/*_create_conferences_table.php database/migrations/2026_04_25_120100_create_conferences_table.php
php artisan make:model ConferenceTrack -mf
mv database/migrations/*_create_conference_tracks_table.php database/migrations/2026_04_25_120200_create_conference_tracks_table.php
```

- [ ] **Step 2: Conferences migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->unsignedInteger('capacity');
            $table->timestamps();
            $table->index(['crusade_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('conferences'); }
};
```

- [ ] **Step 3: ConferenceTracks migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conference_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conference_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->unsignedInteger('capacity');
            $table->timestamps();
            $table->unique(['conference_id', 'name']);
        });
    }
    public function down(): void { Schema::dropIfExists('conference_tracks'); }
};
```

- [ ] **Step 4: Conference model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conference extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'starts_on', 'ends_on', 'capacity'];
    protected $casts = ['starts_on' => 'date', 'ends_on' => 'date'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function tracks(): HasMany { return $this->hasMany(ConferenceTrack::class); }
    public function sessions(): HasMany { return $this->hasMany(ConferenceSession::class); }
    public function registrations(): HasMany { return $this->hasMany(ConferenceRegistration::class); }
}
```

- [ ] **Step 5: ConferenceTrack model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConferenceTrack extends Model
{
    use HasFactory;
    protected $fillable = ['conference_id', 'name', 'capacity'];
    public function conference(): BelongsTo { return $this->belongsTo(Conference::class); }
    public function sessions(): HasMany { return $this->hasMany(ConferenceSession::class, 'track_id'); }
    public function registrations(): HasMany { return $this->hasMany(ConferenceRegistration::class, 'track_id'); }
}
```

- [ ] **Step 6: Factories**

ConferenceFactory:

```php
<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => 'HJC ' . fake()->year() . ' Pastors\' Conference',
            'starts_on' => '2026-04-30',
            'ends_on' => '2026-05-02',
            'capacity' => 820,
        ];
    }
}
```

ConferenceTrackFactory:

```php
<?php
namespace Database\Factories;

use App\Models\Conference;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceTrackFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conference_id' => Conference::factory(),
            'name' => fake()->unique()->randomElement(['Worship & arts', 'Pastoral leadership', 'Counselling', 'Youth & schools', 'Bishops & elders']),
            'capacity' => fake()->numberBetween(100, 250),
        ];
    }
}
```

- [ ] **Step 7: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceTrack;
use App\Models\Crusade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConferenceModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_conference_has_tracks(): void
    {
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->assertCount(3, $c->fresh()->tracks);
    }

    public function test_track_name_unique_per_conference(): void
    {
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Worship & arts']);
        $this->expectException(\Illuminate\Database\QueryException::class);
        ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Worship & arts']);
    }
}
```

- [ ] **Step 8: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=ConferenceModelTest
git add -A && git commit -m "feat(data): add Conference + ConferenceTrack models + migrations"
```

---

## Task 4: ConferenceSession + ConferenceRegistration models

**Files:** Two more migrations, two models, factories, one combined test file.

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model ConferenceSession -mf
mv database/migrations/*_create_conference_sessions_table.php database/migrations/2026_04_25_120300_create_conference_sessions_table.php
php artisan make:model ConferenceRegistration -mf
mv database/migrations/*_create_conference_registrations_table.php database/migrations/2026_04_25_120400_create_conference_registrations_table.php
```

- [ ] **Step 2: Sessions migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conference_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conference_id')->constrained()->cascadeOnDelete();
            $table->foreignId('track_id')->nullable()->constrained('conference_tracks')->nullOnDelete();
            $table->string('day_label', 16);
            $table->string('name', 128);
            $table->string('speaker', 128)->nullable();
            $table->enum('session_kind', ['plenary', 'track']);
            $table->unsignedInteger('rsvp_count')->default(0);
            $table->timestamps();
            $table->index(['conference_id', 'session_kind']);
        });
    }
    public function down(): void { Schema::dropIfExists('conference_sessions'); }
};
```

- [ ] **Step 3: Registrations migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conference_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conference_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pastor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('track_id')->nullable()->constrained('conference_tracks')->nullOnDelete();
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->boolean('paid_in_full')->default(false);
            $table->timestamp('registered_at');
            $table->timestamps();
            $table->index(['conference_id', 'paid_in_full']);
        });
    }
    public function down(): void { Schema::dropIfExists('conference_registrations'); }
};
```

- [ ] **Step 4: Session model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConferenceSession extends Model
{
    use HasFactory;
    protected $fillable = ['conference_id', 'track_id', 'day_label', 'name', 'speaker', 'session_kind', 'rsvp_count'];
    public function conference(): BelongsTo { return $this->belongsTo(Conference::class); }
    public function track(): BelongsTo { return $this->belongsTo(ConferenceTrack::class, 'track_id'); }
}
```

- [ ] **Step 5: Registration model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConferenceRegistration extends Model
{
    use HasFactory;
    protected $fillable = ['conference_id', 'pastor_id', 'track_id', 'paid_amount', 'paid_in_full', 'registered_at'];
    protected $casts = ['paid_amount' => 'decimal:2', 'paid_in_full' => 'boolean', 'registered_at' => 'datetime'];
    public function conference(): BelongsTo { return $this->belongsTo(Conference::class); }
    public function pastor(): BelongsTo { return $this->belongsTo(Pastor::class); }
    public function track(): BelongsTo { return $this->belongsTo(ConferenceTrack::class, 'track_id'); }
}
```

- [ ] **Step 6: Factories**

ConferenceSessionFactory:

```php
<?php
namespace Database\Factories;

use App\Models\Conference;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceSessionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conference_id' => Conference::factory(),
            'track_id' => null,
            'day_label' => fake()->randomElement(['Day 1 — Wed', 'Day 2 — Thu', 'Day 3 — Fri']),
            'name' => fake()->sentence(3),
            'speaker' => fake()->name(),
            'session_kind' => 'plenary',
            'rsvp_count' => fake()->numberBetween(50, 600),
        ];
    }
}
```

ConferenceRegistrationFactory:

```php
<?php
namespace Database\Factories;

use App\Models\Conference;
use App\Models\Pastor;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceRegistrationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conference_id' => Conference::factory(),
            'pastor_id' => Pastor::factory(),
            'track_id' => null,
            'paid_amount' => fake()->randomElement([0, 20, 40]),
            'paid_in_full' => fake()->boolean(70),
            'registered_at' => fake()->dateTimeThisMonth(),
        ];
    }
}
```

- [ ] **Step 7: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConferenceSubModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_belongs_to_conference_and_optional_track(): void
    {
        $c = Conference::factory()->create();
        $t = ConferenceTrack::factory()->create(['conference_id' => $c->id]);
        $s = ConferenceSession::factory()->create(['conference_id' => $c->id, 'track_id' => $t->id, 'session_kind' => 'track']);
        $this->assertSame($c->id, $s->conference->id);
        $this->assertSame($t->id, $s->track->id);
    }

    public function test_registration_relations_work(): void
    {
        $r = ConferenceRegistration::factory()->create(['paid_in_full' => true, 'paid_amount' => 40]);
        $this->assertNotNull($r->conference);
        $this->assertNotNull($r->pastor);
        $this->assertTrue($r->paid_in_full);
    }
}
```

- [ ] **Step 8: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=ConferenceSubModelTest
git add -A && git commit -m "feat(data): add ConferenceSession + ConferenceRegistration models"
```

---

## Task 5: ConferenceController + registration-summary endpoint

**Files:** `app/Http/Controllers/Api/ConferenceController.php`, route changes, `tests/Feature/ConferenceApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_conferences(): void
    {
        Conference::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/conferences')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_conference(): void
    {
        $r = $this->postJson('/api/conferences', [
            'crusade_id' => $this->crusade->id,
            'name' => 'HJC 2026',
            'starts_on' => '2026-04-30',
            'ends_on' => '2026-05-02',
            'capacity' => 820,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.capacity', 820);
    }

    public function test_registration_summary(): void
    {
        $c = Conference::factory()->create(['crusade_id' => $this->crusade->id, 'capacity' => 820]);
        $t1 = ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Worship & arts', 'capacity' => 250]);
        $t2 = ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Counselling', 'capacity' => 150]);

        // 5 plenary, 3 track sessions
        ConferenceSession::factory()->count(5)->create(['conference_id' => $c->id, 'session_kind' => 'plenary']);
        ConferenceSession::factory()->count(3)->create(['conference_id' => $c->id, 'session_kind' => 'track', 'track_id' => $t1->id]);

        // 4 registrations: 3 paid in full, 1 not
        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t1->id, 'paid_in_full' => true, 'paid_amount' => 40]);
        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t1->id, 'paid_in_full' => true, 'paid_amount' => 40]);
        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t2->id, 'paid_in_full' => true, 'paid_amount' => 40]);
        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t2->id, 'paid_in_full' => false, 'paid_amount' => 0]);

        $r = $this->getJson("/api/conferences/{$c->id}/registration-summary");
        $r->assertOk()
          ->assertJsonPath('data.registered', 4)
          ->assertJsonPath('data.paid_in_full', 3)
          ->assertJsonPath('data.sum_paid_amount', '120.00')
          ->assertJsonPath('data.sessions.plenary', 5)
          ->assertJsonPath('data.sessions.track', 3);

        $tracks = collect($r->json('data.tracks'));
        $worship = $tracks->firstWhere('name', 'Worship & arts');
        $this->assertSame(2, $worship['registered']);
        $this->assertSame(250, $worship['capacity']);
    }

    public function test_can_update_and_delete(): void
    {
        $c = Conference::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/conferences/{$c->id}", ['capacity' => 1000])
            ->assertOk()->assertJsonPath('data.capacity', 1000);
        $this->deleteJson("/api/conferences/{$c->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConferenceController extends Controller
{
    public function index(): JsonResponse { return response()->json(['data' => Conference::all()]); }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'starts_on' => 'required|date',
            'ends_on' => 'required|date|after_or_equal:starts_on',
            'capacity' => 'required|integer|min:0',
        ]);
        return response()->json(['data' => Conference::create($v)], 201);
    }

    public function show(Conference $conference): JsonResponse { return response()->json(['data' => $conference]); }

    public function update(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'starts_on' => 'sometimes|date',
            'ends_on' => 'sometimes|date',
            'capacity' => 'sometimes|integer|min:0',
        ]);
        $conference->update($v);
        return response()->json(['data' => $conference]);
    }

    public function destroy(Conference $conference): JsonResponse
    {
        $conference->delete();
        return response()->json(null, 204);
    }

    public function registrationSummary(Conference $conference): JsonResponse
    {
        $regs = ConferenceRegistration::where('conference_id', $conference->id);
        $registered = (clone $regs)->count();
        $paidInFull = (clone $regs)->where('paid_in_full', true)->count();
        $sumPaid = (float) (clone $regs)->sum('paid_amount');

        $sessionCounts = ConferenceSession::where('conference_id', $conference->id)
            ->selectRaw('session_kind, COUNT(*) as n')->groupBy('session_kind')->pluck('n', 'session_kind');

        $tracks = ConferenceTrack::where('conference_id', $conference->id)->get()->map(function ($t) use ($conference) {
            $reg = ConferenceRegistration::where('conference_id', $conference->id)->where('track_id', $t->id)->count();
            return [
                'track_id' => $t->id,
                'name' => $t->name,
                'capacity' => $t->capacity,
                'registered' => $reg,
                'pct' => $t->capacity > 0 ? number_format($reg / $t->capacity * 100, 2, '.', '') : '0.00',
            ];
        })->values();

        return response()->json(['data' => [
            'registered' => $registered,
            'paid_in_full' => $paidInFull,
            'sum_paid_amount' => number_format($sumPaid, 2, '.', ''),
            'capacity' => $conference->capacity,
            'pct_of_capacity' => $conference->capacity > 0 ? number_format($registered / $conference->capacity * 100, 2, '.', '') : '0.00',
            'sessions' => [
                'plenary' => (int) ($sessionCounts['plenary'] ?? 0),
                'track' => (int) ($sessionCounts['track'] ?? 0),
            ],
            'tracks' => $tracks,
        ]]);
    }
}
```

- [ ] **Step 3: Routes**

Inside `auth:sanctum` group:

```php
    Route::apiResource('conferences', \App\Http\Controllers\Api\ConferenceController::class);
    Route::get('/conferences/{conference}/registration-summary', [\App\Http\Controllers\Api\ConferenceController::class, 'registrationSummary']);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=ConferenceApiTest
git add -A && git commit -m "feat(api): conferences CRUD + registration summary"
```

---

## Task 6: ConferenceTrackController CRUD

**Files:** `app/Http/Controllers/Api/ConferenceTrackController.php`, route changes, `tests/Feature/ConferenceTrackApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceTrack;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceTrackApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_tracks_for_conference(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->getJson("/api/conferences/{$c->id}/tracks")->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_add_track(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $r = $this->postJson("/api/conferences/{$c->id}/tracks", ['name' => 'Worship & arts', 'capacity' => 250]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Worship & arts');
    }

    public function test_rejects_duplicate_track_name_in_conference(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Counselling']);
        $this->postJson("/api/conferences/{$c->id}/tracks", ['name' => 'Counselling', 'capacity' => 100])
            ->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_can_update_and_delete_track(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $t = ConferenceTrack::factory()->create();
        $this->patchJson("/api/conference-tracks/{$t->id}", ['capacity' => 300])
            ->assertOk()->assertJsonPath('data.capacity', 300);
        $this->deleteJson("/api/conference-tracks/{$t->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceTrack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConferenceTrackController extends Controller
{
    public function index(Conference $conference): JsonResponse
    {
        return response()->json(['data' => $conference->tracks()->orderBy('name')->get()]);
    }

    public function store(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'name' => ['required', 'string', 'max:64',
                Rule::unique('conference_tracks')->where(fn ($q) => $q->where('conference_id', $conference->id))],
            'capacity' => 'required|integer|min:0',
        ]);
        $v['conference_id'] = $conference->id;
        return response()->json(['data' => ConferenceTrack::create($v)], 201);
    }

    public function update(Request $request, ConferenceTrack $conferenceTrack): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:64',
            'capacity' => 'sometimes|integer|min:0',
        ]);
        $conferenceTrack->update($v);
        return response()->json(['data' => $conferenceTrack]);
    }

    public function destroy(ConferenceTrack $conferenceTrack): JsonResponse
    {
        $conferenceTrack->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Routes**

Inside `auth:sanctum` group:

```php
    Route::get('/conferences/{conference}/tracks', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'index']);
    Route::post('/conferences/{conference}/tracks', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'store']);
    Route::patch('/conference-tracks/{conferenceTrack}', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'update']);
    Route::delete('/conference-tracks/{conferenceTrack}', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'destroy']);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=ConferenceTrackApiTest
git add -A && git commit -m "feat(api): conference tracks CRUD"
```

---

## Task 7: ConferenceSessionController CRUD

**Files:** `app/Http/Controllers/Api/ConferenceSessionController.php`, routes, `tests/Feature/ConferenceSessionApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceSessionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_sessions(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceSession::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->getJson("/api/conferences/{$c->id}/sessions")->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_add_plenary_session(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $r = $this->postJson("/api/conferences/{$c->id}/sessions", [
            'day_label' => 'Day 1 — Wed', 'name' => 'Identity', 'speaker' => 'Bishop Boateng',
            'session_kind' => 'plenary', 'rsvp_count' => 520,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.session_kind', 'plenary');
    }

    public function test_can_add_track_session(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $t = ConferenceTrack::factory()->create(['conference_id' => $c->id]);
        $this->postJson("/api/conferences/{$c->id}/sessions", [
            'day_label' => 'Day 1 — Wed', 'name' => 'Worship Lab', 'speaker' => 'M. Chanda',
            'session_kind' => 'track', 'track_id' => $t->id,
        ])->assertStatus(201)->assertJsonPath('data.track_id', $t->id);
    }

    public function test_validates_session_kind(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $this->postJson("/api/conferences/{$c->id}/sessions", [
            'day_label' => 'X', 'name' => 'Y', 'session_kind' => 'invalid',
        ])->assertStatus(422)->assertJsonValidationErrors(['session_kind']);
    }

    public function test_can_update_and_delete(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $s = ConferenceSession::factory()->create();
        $this->patchJson("/api/conference-sessions/{$s->id}", ['rsvp_count' => 100])
            ->assertOk()->assertJsonPath('data.rsvp_count', 100);
        $this->deleteJson("/api/conference-sessions/{$s->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConferenceSessionController extends Controller
{
    public function index(Conference $conference): JsonResponse
    {
        return response()->json(['data' => $conference->sessions()->orderBy('day_label')->orderBy('name')->get()]);
    }

    public function store(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'day_label' => 'required|string|max:16',
            'name' => 'required|string|max:128',
            'speaker' => 'nullable|string|max:128',
            'session_kind' => 'required|in:plenary,track',
            'track_id' => 'nullable|exists:conference_tracks,id',
            'rsvp_count' => 'nullable|integer|min:0',
        ]);
        $v['conference_id'] = $conference->id;
        return response()->json(['data' => ConferenceSession::create($v)], 201);
    }

    public function update(Request $request, ConferenceSession $conferenceSession): JsonResponse
    {
        $v = $request->validate([
            'day_label' => 'sometimes|string|max:16',
            'name' => 'sometimes|string|max:128',
            'speaker' => 'sometimes|nullable|string|max:128',
            'session_kind' => 'sometimes|in:plenary,track',
            'track_id' => 'sometimes|nullable|exists:conference_tracks,id',
            'rsvp_count' => 'sometimes|integer|min:0',
        ]);
        $conferenceSession->update($v);
        return response()->json(['data' => $conferenceSession]);
    }

    public function destroy(ConferenceSession $conferenceSession): JsonResponse
    {
        $conferenceSession->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Routes**

```php
    Route::get('/conferences/{conference}/sessions', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'index']);
    Route::post('/conferences/{conference}/sessions', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'store']);
    Route::patch('/conference-sessions/{conferenceSession}', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'update']);
    Route::delete('/conference-sessions/{conferenceSession}', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'destroy']);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=ConferenceSessionApiTest
git add -A && git commit -m "feat(api): conference sessions CRUD"
```

---

## Task 8: ConferenceRegistrationController CRUD

**Files:** `app/Http/Controllers/Api/ConferenceRegistrationController.php`, routes, `tests/Feature/ConferenceRegistrationApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\Pastor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceRegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_registrations(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceRegistration::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->getJson("/api/conferences/{$c->id}/registrations")->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_register_pastor(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $p = Pastor::factory()->create();
        $r = $this->postJson("/api/conferences/{$c->id}/registrations", [
            'pastor_id' => $p->id, 'paid_amount' => 40, 'paid_in_full' => true,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.paid_in_full', true);
    }

    public function test_can_update_payment(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $r = ConferenceRegistration::factory()->create(['paid_in_full' => false, 'paid_amount' => 0]);
        $this->patchJson("/api/conference-registrations/{$r->id}", ['paid_in_full' => true, 'paid_amount' => 40])
            ->assertOk()->assertJsonPath('data.paid_in_full', true);
    }

    public function test_can_delete_registration(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $r = ConferenceRegistration::factory()->create();
        $this->deleteJson("/api/conference-registrations/{$r->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConferenceRegistrationController extends Controller
{
    public function index(Conference $conference): JsonResponse
    {
        return response()->json(['data' => $conference->registrations()->orderByDesc('registered_at')->get()]);
    }

    public function store(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'pastor_id' => 'nullable|exists:pastors,id',
            'track_id' => 'nullable|exists:conference_tracks,id',
            'paid_amount' => 'nullable|numeric|min:0',
            'paid_in_full' => 'nullable|boolean',
            'registered_at' => 'nullable|date',
        ]);
        $v['conference_id'] = $conference->id;
        $v['registered_at'] = $v['registered_at'] ?? now();
        return response()->json(['data' => ConferenceRegistration::create($v)], 201);
    }

    public function update(Request $request, ConferenceRegistration $conferenceRegistration): JsonResponse
    {
        $v = $request->validate([
            'track_id' => 'sometimes|nullable|exists:conference_tracks,id',
            'paid_amount' => 'sometimes|numeric|min:0',
            'paid_in_full' => 'sometimes|boolean',
        ]);
        $conferenceRegistration->update($v);
        return response()->json(['data' => $conferenceRegistration]);
    }

    public function destroy(ConferenceRegistration $conferenceRegistration): JsonResponse
    {
        $conferenceRegistration->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Routes**

```php
    Route::get('/conferences/{conference}/registrations', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'index']);
    Route::post('/conferences/{conference}/registrations', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'store']);
    Route::patch('/conference-registrations/{conferenceRegistration}', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'update']);
    Route::delete('/conference-registrations/{conferenceRegistration}', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'destroy']);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=ConferenceRegistrationApiTest
git add -A && git commit -m "feat(api): conference registrations CRUD"
```

---

## Task 9: PublicityChannel model + migration + factory + test

**Files:** `database/migrations/2026_04_25_120500_create_publicity_channels_table.php`, model, factory, test.

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model PublicityChannel -mf
mv database/migrations/*_create_publicity_channels_table.php database/migrations/2026_04_25_120500_create_publicity_channels_table.php
```

- [ ] **Step 2: Migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('publicity_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->enum('channel_type', ['radio', 'print', 'ooh', 'sms', 'tv']);
            $table->string('reach_estimate', 64)->nullable();
            $table->string('notes', 255)->nullable();
            $table->enum('status', ['live', 'in_progress', 'scheduled', 'blocked'])->default('scheduled');
            $table->decimal('spend_to_date', 10, 2)->default(0);
            $table->timestamps();
            $table->index(['crusade_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('publicity_channels'); }
};
```

- [ ] **Step 3: Model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicityChannel extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'channel_type', 'reach_estimate', 'notes', 'status', 'spend_to_date'];
    protected $casts = ['spend_to_date' => 'decimal:2'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
```

- [ ] **Step 4: Factory**

```php
<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PublicityChannelFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->company() . ' FM',
            'channel_type' => fake()->randomElement(['radio', 'print', 'ooh', 'sms', 'tv']),
            'reach_estimate' => fake()->numberBetween(50, 999) . 'k reach',
            'notes' => fake()->sentence(),
            'status' => fake()->randomElement(['live', 'in_progress', 'scheduled', 'blocked']),
            'spend_to_date' => fake()->randomFloat(2, 0, 5000),
        ];
    }
}
```

- [ ] **Step 5: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\PublicityChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicityChannelModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_a_channel(): void
    {
        $c = PublicityChannel::factory()->create(['channel_type' => 'radio']);
        $this->assertSame('radio', $c->channel_type);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=PublicityChannelModelTest
git add -A && git commit -m "feat(data): add PublicityChannel model + migration + factory"
```

---

## Task 10: PublicityChannelController CRUD + awareness-spend endpoint

**Files:** controller, routes, `tests/Feature/PublicityChannelApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\PublicityChannel;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicityChannelApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_channels(): void
    {
        PublicityChannel::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/publicity-channels')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_create_channel(): void
    {
        $r = $this->postJson('/api/publicity-channels', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Phoenix FM', 'channel_type' => 'radio',
            'reach_estimate' => '620k reach', 'status' => 'live', 'spend_to_date' => 1800,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Phoenix FM');
    }

    public function test_validates_channel_type(): void
    {
        $this->postJson('/api/publicity-channels', [
            'crusade_id' => $this->crusade->id,
            'name' => 'X', 'channel_type' => 'invalid',
        ])->assertStatus(422)->assertJsonValidationErrors(['channel_type']);
    }

    public function test_can_update_status(): void
    {
        $c = PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'scheduled']);
        $this->patchJson("/api/publicity-channels/{$c->id}", ['status' => 'live'])
            ->assertOk()->assertJsonPath('data.status', 'live');
    }

    public function test_can_delete_channel(): void
    {
        $c = PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/publicity-channels/{$c->id}")->assertStatus(204);
    }

    public function test_awareness_spend_pairs_chart_data(): void
    {
        $z = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        // 2 surveys
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z->id,
            'survey_number' => 1, 'surveyed_count' => 100, 'attending_yes_count' => 18,
        ]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z->id,
            'survey_number' => 2, 'surveyed_count' => 100, 'attending_yes_count' => 30,
        ]);
        // Spend total $2k across two channels
        PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id, 'spend_to_date' => 1200]);
        PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id, 'spend_to_date' => 800]);

        $r = $this->getJson('/api/publicity-channels/awareness-spend');
        $r->assertOk();
        $rows = $r->json('data');
        $this->assertSame(2, count($rows));
        // Each row has survey_number, awareness_pct, spend_total (cumulative)
        $this->assertSame(1, $rows[0]['survey_number']);
        $this->assertSame('18.00', $rows[0]['awareness_pct']);
        $this->assertSame('30.00', $rows[1]['awareness_pct']);
        // spend_total is cumulative spend at each survey point — for now, just current total spend
        // (a more sophisticated time-series would require channel-launch dates; out of scope)
        $this->assertSame('2000.00', $rows[1]['spend_total']);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\PublicityChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicityChannelController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => PublicityChannel::orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'channel_type' => 'required|in:radio,print,ooh,sms,tv',
            'reach_estimate' => 'nullable|string|max:64',
            'notes' => 'nullable|string|max:255',
            'status' => 'nullable|in:live,in_progress,scheduled,blocked',
            'spend_to_date' => 'nullable|numeric|min:0',
        ]);
        return response()->json(['data' => PublicityChannel::create($v)], 201);
    }

    public function show(PublicityChannel $publicityChannel): JsonResponse { return response()->json(['data' => $publicityChannel]); }

    public function update(Request $request, PublicityChannel $publicityChannel): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'channel_type' => 'sometimes|in:radio,print,ooh,sms,tv',
            'reach_estimate' => 'sometimes|nullable|string|max:64',
            'notes' => 'sometimes|nullable|string|max:255',
            'status' => 'sometimes|in:live,in_progress,scheduled,blocked',
            'spend_to_date' => 'sometimes|numeric|min:0',
        ]);
        $publicityChannel->update($v);
        return response()->json(['data' => $publicityChannel]);
    }

    public function destroy(PublicityChannel $publicityChannel): JsonResponse
    {
        $publicityChannel->delete();
        return response()->json(null, 204);
    }

    public function awarenessSpend(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();
        // Awareness trajectory (weighted % per survey_number)
        $awareness = AwarenessSurvey::where('crusade_id', $crusade->id)
            ->selectRaw('survey_number, SUM(surveyed_count) as s, SUM(attending_yes_count) as a')
            ->groupBy('survey_number')
            ->orderBy('survey_number')
            ->get();

        // Cumulative spend (single value for now — applied to each survey row)
        $totalSpend = (float) PublicityChannel::where('crusade_id', $crusade->id)->sum('spend_to_date');

        $rows = $awareness->map(fn ($r) => [
            'survey_number' => (int) $r->survey_number,
            'awareness_pct' => $r->s > 0 ? number_format($r->a / $r->s * 100, 2, '.', '') : '0.00',
            'spend_total' => number_format($totalSpend, 2, '.', ''),
        ]);

        return response()->json(['data' => $rows]);
    }
}
```

- [ ] **Step 3: Routes**

```php
    Route::get('/publicity-channels/awareness-spend', [\App\Http\Controllers\Api\PublicityChannelController::class, 'awarenessSpend']);
    Route::apiResource('publicity-channels', \App\Http\Controllers\Api\PublicityChannelController::class);
```

(Place the literal path BEFORE apiResource so `/awareness-spend` doesn't get interpreted as `{publicityChannel} = "awareness-spend"`.)

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=PublicityChannelApiTest
git add -A && git commit -m "feat(api): publicity channels CRUD + awareness-spend chart endpoint"
```

---

## Task 11: Stakeholder model + migration + factory + test

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model Stakeholder -mf
mv database/migrations/*_create_stakeholders_table.php database/migrations/2026_04_25_120600_create_stakeholders_table.php
```

- [ ] **Step 2: Migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stakeholders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->string('org', 128);
            $table->string('role', 64);
            $table->unsignedTinyInteger('pipeline_stage');  // 1-4
            $table->enum('status_label', ['identified', 'engaged', 'committed', 'won']);
            $table->timestamp('last_contact_at')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'status_label']);
        });
    }
    public function down(): void { Schema::dropIfExists('stakeholders'); }
};
```

- [ ] **Step 3: Model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stakeholder extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'org', 'role', 'pipeline_stage', 'status_label', 'last_contact_at', 'notes'];
    protected $casts = ['last_contact_at' => 'datetime'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
```

- [ ] **Step 4: Factory**

```php
<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class StakeholderFactory extends Factory
{
    public function definition(): array
    {
        $stage = fake()->numberBetween(1, 4);
        $labels = [1 => 'identified', 2 => 'engaged', 3 => 'committed', 4 => 'won'];
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->name(),
            'org' => fake()->company(),
            'role' => fake()->randomElement(['Mayor', 'Imam', 'Bishop', 'Permitting', 'Chief', 'Security']),
            'pipeline_stage' => $stage,
            'status_label' => $labels[$stage],
            'last_contact_at' => fake()->optional()->dateTimeThisMonth(),
            'notes' => null,
        ];
    }
}
```

- [ ] **Step 5: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Stakeholder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StakeholderModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_stakeholder_with_matching_stage_and_label(): void
    {
        $s = Stakeholder::factory()->create(['pipeline_stage' => 4, 'status_label' => 'won']);
        $this->assertSame(4, $s->pipeline_stage);
        $this->assertSame('won', $s->status_label);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=StakeholderModelTest
git add -A && git commit -m "feat(data): add Stakeholder model + migration + factory"
```

---

## Task 12: StakeholderController CRUD

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Stakeholder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StakeholderApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_stakeholders_sortable_by_pipeline(): void
    {
        Stakeholder::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 1, 'status_label' => 'identified']);
        Stakeholder::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 4, 'status_label' => 'won']);
        $this->getJson('/api/stakeholders')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_can_create(): void
    {
        $r = $this->postJson('/api/stakeholders', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Mayor Tembo', 'org' => 'City of Lusaka', 'role' => 'Mayor',
            'pipeline_stage' => 4, 'status_label' => 'won',
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Mayor Tembo');
    }

    public function test_validates_pipeline_stage_range(): void
    {
        $this->postJson('/api/stakeholders', [
            'crusade_id' => $this->crusade->id,
            'name' => 'X', 'org' => 'Y', 'role' => 'Z',
            'pipeline_stage' => 5, 'status_label' => 'won',
        ])->assertStatus(422)->assertJsonValidationErrors(['pipeline_stage']);
    }

    public function test_can_update_and_delete(): void
    {
        $s = Stakeholder::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/stakeholders/{$s->id}", ['pipeline_stage' => 3, 'status_label' => 'committed'])
            ->assertOk()->assertJsonPath('data.pipeline_stage', 3);
        $this->deleteJson("/api/stakeholders/{$s->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Stakeholder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StakeholderController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Stakeholder::orderByDesc('pipeline_stage')->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'org' => 'required|string|max:128',
            'role' => 'required|string|max:64',
            'pipeline_stage' => 'required|integer|min:1|max:4',
            'status_label' => 'required|in:identified,engaged,committed,won',
            'last_contact_at' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(['data' => Stakeholder::create($v)], 201);
    }

    public function show(Stakeholder $stakeholder): JsonResponse { return response()->json(['data' => $stakeholder]); }

    public function update(Request $request, Stakeholder $stakeholder): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'org' => 'sometimes|string|max:128',
            'role' => 'sometimes|string|max:64',
            'pipeline_stage' => 'sometimes|integer|min:1|max:4',
            'status_label' => 'sometimes|in:identified,engaged,committed,won',
            'last_contact_at' => 'sometimes|nullable|date',
            'notes' => 'sometimes|nullable|string|max:255',
        ]);
        $stakeholder->update($v);
        return response()->json(['data' => $stakeholder]);
    }

    public function destroy(Stakeholder $stakeholder): JsonResponse
    {
        $stakeholder->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Routes**

```php
    Route::apiResource('stakeholders', \App\Http\Controllers\Api\StakeholderController::class);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=StakeholderApiTest
git add -A && git commit -m "feat(api): stakeholders CRUD"
```

---

## Task 13: Permit model + migration + factory + test

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model Permit -mf
mv database/migrations/*_create_permits_table.php database/migrations/2026_04_25_120700_create_permits_table.php
```

- [ ] **Step 2: Migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('permits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->string('agency', 128);
            $table->enum('status', ['in_review', 'approved', 'rejected'])->default('in_review');
            $table->date('due_on')->nullable();
            $table->date('signed_on')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('permits'); }
};
```

- [ ] **Step 3: Model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Permit extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'agency', 'status', 'due_on', 'signed_on', 'notes'];
    protected $casts = ['due_on' => 'date', 'signed_on' => 'date'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
```

- [ ] **Step 4: Factory**

```php
<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PermitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->randomElement(['Crusade ground assembly', 'Sound clearance', 'Traffic & parking']),
            'agency' => fake()->randomElement(['Religious Affairs', 'Environmental', 'LPS']),
            'status' => fake()->randomElement(['in_review', 'approved', 'rejected']),
            'due_on' => fake()->optional()->dateTimeBetween('+1 week', '+2 months')?->format('Y-m-d'),
            'signed_on' => fake()->optional()->dateTimeBetween('-1 month', 'now')?->format('Y-m-d'),
            'notes' => null,
        ];
    }
}
```

- [ ] **Step 5: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Permit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermitModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_permit(): void
    {
        $p = Permit::factory()->create(['status' => 'approved']);
        $this->assertSame('approved', $p->status);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=PermitModelTest
git add -A && git commit -m "feat(data): add Permit model + migration + factory"
```

---

## Task 14: PermitController CRUD with status counts in meta

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Permit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PermitApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_with_status_counts(): void
    {
        Permit::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'status' => 'approved']);
        Permit::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'in_review']);

        $r = $this->getJson('/api/permits');
        $r->assertOk()->assertJsonCount(3, 'data')
          ->assertJsonPath('meta.status_counts.approved', 2)
          ->assertJsonPath('meta.status_counts.in_review', 1);
    }

    public function test_can_create_permit(): void
    {
        $r = $this->postJson('/api/permits', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Sound clearance', 'agency' => 'Environmental', 'status' => 'approved',
            'signed_on' => '2026-04-09',
        ]);
        $r->assertStatus(201)->assertJsonPath('data.status', 'approved');
    }

    public function test_can_update_status(): void
    {
        $p = Permit::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'in_review']);
        $this->patchJson("/api/permits/{$p->id}", ['status' => 'approved', 'signed_on' => '2026-04-25'])
            ->assertOk()->assertJsonPath('data.status', 'approved');
    }

    public function test_can_delete_permit(): void
    {
        $p = Permit::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/permits/{$p->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermitController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Permit::orderBy('name')->get();
        $counts = Permit::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        return response()->json([
            'data' => $rows,
            'meta' => [
                'status_counts' => [
                    'in_review' => (int) ($counts['in_review'] ?? 0),
                    'approved' => (int) ($counts['approved'] ?? 0),
                    'rejected' => (int) ($counts['rejected'] ?? 0),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'agency' => 'required|string|max:128',
            'status' => 'nullable|in:in_review,approved,rejected',
            'due_on' => 'nullable|date',
            'signed_on' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(['data' => Permit::create($v)], 201);
    }

    public function show(Permit $permit): JsonResponse { return response()->json(['data' => $permit]); }

    public function update(Request $request, Permit $permit): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'agency' => 'sometimes|string|max:128',
            'status' => 'sometimes|in:in_review,approved,rejected',
            'due_on' => 'sometimes|nullable|date',
            'signed_on' => 'sometimes|nullable|date',
            'notes' => 'sometimes|nullable|string|max:255',
        ]);
        $permit->update($v);
        return response()->json(['data' => $permit]);
    }

    public function destroy(Permit $permit): JsonResponse
    {
        $permit->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Routes**

```php
    Route::apiResource('permits', \App\Http\Controllers\Api\PermitController::class);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=PermitApiTest
git add -A && git commit -m "feat(api): permits CRUD with status counts"
```

---

## Task 15: Extend CrusadeSeeder + final smoke test

**Files:** `database/seeders/CrusadeSeeder.php`, `tests/Feature/DatabaseSeederTest.php`

- [ ] **Step 1: Extend DatabaseSeederTest**

Append these assertions to `test_seeder_populates_realistic_data` in `tests/Feature/DatabaseSeederTest.php`:

```php
        $this->assertGreaterThanOrEqual(8, \DB::table('committees')->count());
        $this->assertGreaterThanOrEqual(1, \DB::table('conferences')->count());
        $this->assertGreaterThanOrEqual(5, \DB::table('conference_tracks')->count());
        $this->assertGreaterThanOrEqual(5, \DB::table('conference_sessions')->count());
        $this->assertGreaterThanOrEqual(20, \DB::table('conference_registrations')->count());
        $this->assertGreaterThanOrEqual(6, \DB::table('publicity_channels')->count());
        $this->assertGreaterThanOrEqual(6, \DB::table('stakeholders')->count());
        $this->assertGreaterThanOrEqual(3, \DB::table('permits')->count());
```

- [ ] **Step 2: Extend CrusadeSeeder**

Add at the bottom of `CrusadeSeeder::run()` (after the reminders block, before the closing brace), and add the necessary imports at top:

```php
use App\Models\Committee;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use App\Models\Permit;
use App\Models\PublicityChannel;
use App\Models\Stakeholder;
```

Then in `run()`:

```php
        // Committees
        $committees = [
            ['Steering', 'D. Boateng', 7, 88, 'on_track', 'today'],
            ['Finance', 'M. Sakala', 5, 60, 'on_track', '+2 days'],
            ['Pastoral relations', 'J. Adjei', 9, 72, 'watch', '+1 day'],
            ['Logistics', 'P. Musonda', 6, 30, 'at_risk', '+4 days'],
            ['Publicity', 'L. Banda', 5, 45, 'watch', '+1 day'],
            ['Worker training', 'E. Phiri', 6, 18, 'at_risk', 'today'],
            ['Counselling', 'R. Mwape', 4, 54, 'watch', '+5 days'],
            ['Hospitality', 'T. Daka', 4, 80, 'on_track', '+1 day'],
        ];
        foreach ($committees as [$name, $chair, $members, $pct, $status, $when]) {
            Committee::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'chair_name' => $chair,
                'member_count' => $members, 'deliverables_done_pct' => $pct,
                'status' => $status,
                'next_meeting_on' => date('Y-m-d', strtotime($when)),
            ]);
        }

        // Conference + tracks + sessions + registrations
        $conf = Conference::create([
            'crusade_id' => $crusade->id,
            'name' => 'HJC 2026 Pastors\' Conference',
            'starts_on' => '2026-04-30',
            'ends_on' => '2026-05-02',
            'capacity' => 820,
        ]);
        $tracks = collect();
        foreach ([['Worship & arts', 250], ['Pastoral leadership', 200], ['Counselling', 150], ['Youth & schools', 100], ['Bishops & elders', 120]] as [$tname, $cap]) {
            $tracks->push(ConferenceTrack::create(['conference_id' => $conf->id, 'name' => $tname, 'capacity' => $cap]));
        }
        // Sessions
        $sessions = [
            ['Day 1 — Wed', 'Identity', 'Bishop Boateng', 'plenary', null, 520],
            ['Day 1 — Wed', 'Worship Lab', 'M. Chanda', 'track', $tracks[0]->id, 80],
            ['Day 2 — Thu', 'PAVEDDD overview', 'J. Adjei', 'plenary', null, 480],
            ['Day 2 — Thu', 'Counselling theology', 'R. Mwape', 'track', $tracks[2]->id, 98],
            ['Day 3 — Fri', 'Equipping the church', 'Panel', 'plenary', null, 0],
        ];
        foreach ($sessions as [$day, $name, $speaker, $kind, $tid, $rsvp]) {
            ConferenceSession::create([
                'conference_id' => $conf->id, 'track_id' => $tid,
                'day_label' => $day, 'name' => $name, 'speaker' => $speaker,
                'session_kind' => $kind, 'rsvp_count' => $rsvp,
            ]);
        }
        // ~25 registrations across pastors
        $regPastors = $pastors->random(min(25, $pastors->count()));
        foreach ($regPastors as $p) {
            $paid = fake()->boolean(75);
            ConferenceRegistration::create([
                'conference_id' => $conf->id,
                'pastor_id' => $p->id,
                'track_id' => $tracks->random()->id,
                'paid_amount' => $paid ? 40 : 0,
                'paid_in_full' => $paid,
                'registered_at' => fake()->dateTimeBetween('-2 months', 'now'),
            ]);
        }

        // Publicity channels
        $publicity = [
            ['Phoenix FM', 'radio', '620k reach', '3 spots / day · 14 days', 'live', 1800],
            ['Hot FM', 'radio', '410k reach', '2 spots / day · 14 days', 'live', 1200],
            ['Bus stops · 18 sites', 'ooh', 'est. 1.2M views', 'Print 60% · install 30%', 'in_progress', 980],
            ['Posters · 4,200', 'print', null, 'Print 90% · distribute 35%', 'in_progress', 980],
            ['SMS broadcast', 'sms', '85k recipients', 'Sender ID approved', 'scheduled', 0],
            ['Television · ZNBC', 'tv', '1.8M reach', 'Pending mayor letter', 'blocked', 0],
        ];
        foreach ($publicity as [$name, $type, $reach, $notes, $status, $spend]) {
            PublicityChannel::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'channel_type' => $type, 'reach_estimate' => $reach,
                'notes' => $notes, 'status' => $status, 'spend_to_date' => $spend,
            ]);
        }

        // Stakeholders
        $stakeholders = [
            ['Mayor Tembo', 'City of Lusaka', 'Mayor', 4, 'won', '2026-03-11'],
            ['Chief Imam Sayid', 'Lusaka Mosque', 'Imam', 4, 'won', '2026-02-22'],
            ['Bishop Banda', 'Catholic Diocese', 'Bishop', 4, 'won', '2026-03-08'],
            ['Min. Phiri', 'Religious Affairs', 'Permitting', 2, 'engaged', null],
            ['Chief Mukuni', 'Local council', 'Chief', 1, 'identified', null],
            ['Police Commissioner', 'LPS', 'Security', 3, 'committed', '2026-04-20'],
        ];
        foreach ($stakeholders as [$name, $org, $role, $stage, $label, $contact]) {
            Stakeholder::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'org' => $org, 'role' => $role,
                'pipeline_stage' => $stage, 'status_label' => $label,
                'last_contact_at' => $contact,
            ]);
        }

        // Permits
        $permits = [
            ['Crusade ground assembly', 'Religious Affairs', 'in_review', '2026-04-28', null],
            ['Sound clearance', 'Environmental', 'approved', null, '2026-04-09'],
            ['Traffic & parking', 'LPS', 'approved', null, '2026-04-12'],
        ];
        foreach ($permits as [$name, $agency, $status, $due, $signed]) {
            Permit::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'agency' => $agency, 'status' => $status,
                'due_on' => $due, 'signed_on' => $signed,
            ]);
        }
```

- [ ] **Step 3: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=DatabaseSeederTest
php artisan test
```

- [ ] **Step 4: Apply seed**

```bash
cd ~/Projects/hjc
php artisan migrate:fresh --seed
```

- [ ] **Step 5: Smoke test**

```bash
cd ~/Projects/hjc
php artisan serve --port=8001 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2
TOKEN=$(curl -s -X POST http://127.0.0.1:8001/api/login -H 'Content-Type: application/json' \
  -d '{"email":"director@hjc.test","password":"password"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "=== /api/committees ==="
curl -s http://127.0.0.1:8001/api/committees -H "Authorization: Bearer $TOKEN" | head -c 600
echo
echo "=== /api/conferences ==="
curl -s http://127.0.0.1:8001/api/conferences -H "Authorization: Bearer $TOKEN" | head -c 400
echo
echo "=== /api/conferences/1/registration-summary ==="
curl -s http://127.0.0.1:8001/api/conferences/1/registration-summary -H "Authorization: Bearer $TOKEN"
echo
echo "=== /api/publicity-channels/awareness-spend ==="
curl -s http://127.0.0.1:8001/api/publicity-channels/awareness-spend -H "Authorization: Bearer $TOKEN"
echo
echo "=== /api/stakeholders ==="
curl -s http://127.0.0.1:8001/api/stakeholders -H "Authorization: Bearer $TOKEN" | head -c 600
echo
echo "=== /api/permits ==="
curl -s http://127.0.0.1:8001/api/permits -H "Authorization: Bearer $TOKEN" | head -c 600
kill $SERVER_PID 2>/dev/null || pkill -f "artisan serve --port=8001" 2>/dev/null || true
```

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(seed): Phase 3 operations seed data"
```

---

## Notes for Phase 4

- Phase 4 will introduce: Budget tables (`budget_categories`, `budget_transactions`), `weekly_assessments`, and the Mission Control rollup endpoint that aggregates per-power readiness % across all 14 powers.
- The Mission Control rollup is now backed by data sources for: Pastors (pipeline counts), Awareness (Phase 2 surveys), Volunteers (Phase 2 rehearsals), Pledges (Phase 1), Committees (Phase 3 deliverables_done_pct), Publicity (Phase 3 awareness_pct from Phase 2), Govt (Phase 3 stakeholder + permit status), Donors (Phase 4 budget income), Budget (Phase 4 spend %). Two powers (`decisions`, `discipleship`) won't have data sources until they're built — they should return null in the rollup.
- Phase 1 fixes (Reminder ownership check, stage-counts endpoint, pagination on activity/meetings, etc.) remain parked for a separate follow-up after Phase 4.
