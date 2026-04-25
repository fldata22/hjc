# HJC Mission Control — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Laravel 13 API for HJC Mission Control covering pastor CRM, pledge tracking, and the daily activity log (screens DW.4, DW.5, DW.7, DW.13).

**Architecture:** Clone of `~/Projects/bishops-school/api` (Laravel 13 + Sanctum), strip school-domain models, add 11 crusade-domain tables, expose REST endpoints under `/api`. Single tenant for now; every domain table carries `crusade_id` for future multi-crusade.

**Tech Stack:** Laravel 13, PHP 8.3, Sanctum (token auth), MySQL/SQLite (test), PHPUnit feature tests with `RefreshDatabase`.

**Conventions inherited from scaffold:**
- Controllers in `app/Http/Controllers/Api/` extending `App\Http\Controllers\Controller`
- Inline `$request->validate(...)` in controllers (no Form Requests)
- Responses wrap data: `response()->json(['data' => $model])`
- Routes in `routes/api.php` using `Route::apiResource(...)` where possible
- One PHPUnit feature test file per resource in `tests/Feature/`

**Spec:** `docs/superpowers/specs/2026-04-25-hjc-mission-control-phase-1-design.md`

---

## Task 1: Scaffold from bishops-school/api and strip school domain

**Files:**
- Create: everything in `~/Projects/hjc/` except the existing `docs/` and `.git/`
- Delete: school-specific models, migrations, controllers, tests, factories, seeders

- [ ] **Step 1: Copy scaffold (skipping .git and not overwriting docs)**

```bash
cd ~/Projects/hjc
rsync -a --exclude='.git' --exclude='vendor' --exclude='node_modules' --exclude='storage/logs/*' --exclude='storage/framework/cache/*' --exclude='storage/framework/sessions/*' --exclude='storage/framework/views/*' --exclude='.env' ~/Projects/bishops-school/api/ ./
ls -la
```

Expected: see `app/`, `routes/`, `database/`, `composer.json`, `docs/` (preserved), `.git/` (preserved).

- [ ] **Step 2: Delete school-domain models**

```bash
cd ~/Projects/hjc
rm app/Models/Attendance.php \
   app/Models/Book.php \
   app/Models/Church.php \
   app/Models/Denomination.php \
   app/Models/Module.php \
   app/Models/Participation.php \
   app/Models/SchoolClass.php \
   app/Models/Session.php \
   app/Models/Student.php \
   app/Models/Teacher.php \
   app/Models/TeacherModuleAssignment.php
ls app/Models/
```

Expected: only `User.php` remains.

- [ ] **Step 3: Delete school-domain controllers**

```bash
cd ~/Projects/hjc
rm -rf app/Http/Controllers/Api
mkdir -p app/Http/Controllers/Api
ls app/Http/Controllers/
```

Expected: `Api/` (empty), `Controller.php`.

- [ ] **Step 4: Delete school migrations, factories, seeders, feature tests**

```bash
cd ~/Projects/hjc
rm database/migrations/2026_04_*.php
rm -rf database/factories/*
rm -rf database/seeders/*
rm tests/Feature/*.php
ls database/migrations/
```

Expected: only the Laravel-default migrations (users, cache, jobs) remain — no `2026_04_*` files.

- [ ] **Step 5: Reset routes/api.php to a minimal stub**

```bash
cd ~/Projects/hjc
cat > routes/api.php <<'EOF'
<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
EOF
```

- [ ] **Step 6: Recreate empty DatabaseSeeder**

```bash
cd ~/Projects/hjc
cat > database/seeders/DatabaseSeeder.php <<'EOF'
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Phase 1 seed implemented in Task 25.
    }
}
EOF
```

- [ ] **Step 7: Update composer.json `description` and `keywords`**

Edit `composer.json` — change:

```json
    "description": "The skeleton application for the Laravel framework.",
    "keywords": ["laravel", "framework"],
```

to:

```json
    "description": "HJC Mission Control — crusade director command system.",
    "keywords": ["laravel", "hjc", "crusade"],
```

- [ ] **Step 8: Update .env.example**

Edit `.env.example` — change:

```
APP_NAME=Laravel
DB_DATABASE=laravel
```

to:

```
APP_NAME="HJC Mission Control"
DB_DATABASE=hjc
```

- [ ] **Step 9: Commit scaffold**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat: scaffold from bishops-school/api, strip school domain"
git log --oneline
```

Expected: 2 commits — initial spec, then this scaffold commit.

---

## Task 2: Install dependencies and verify scaffold boots

**Files:**
- Create: `.env`
- Modify: none (read-only verification)

- [ ] **Step 1: Install composer dependencies**

```bash
cd ~/Projects/hjc
composer install
```

Expected: vendor/ populated, no errors.

- [ ] **Step 2: Create .env and generate app key**

```bash
cd ~/Projects/hjc
cp .env.example .env
php artisan key:generate
grep APP_KEY .env
```

Expected: `APP_KEY=base64:...` populated.

- [ ] **Step 3: Configure SQLite for local dev (simplest)**

Edit `.env` — replace the DB block with:

```
DB_CONNECTION=sqlite
```

Remove or comment out `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.

- [ ] **Step 4: Create the SQLite file**

```bash
cd ~/Projects/hjc
touch database/database.sqlite
```

- [ ] **Step 5: Run migrations**

```bash
cd ~/Projects/hjc
php artisan migrate
```

Expected: default Laravel migrations (users, cache, jobs) run. No errors.

- [ ] **Step 6: Run tests**

```bash
cd ~/Projects/hjc
php artisan test
```

Expected: 0 tests, 0 assertions (we deleted the school tests, none replaced yet). Exit 0.

- [ ] **Step 7: Verify health endpoint**

```bash
cd ~/Projects/hjc
php artisan serve --port=8000 &
sleep 2
curl -s http://127.0.0.1:8000/api/health
kill %1
```

Expected: `{"status":"ok"}`.

- [ ] **Step 8: Commit lockfile if changed**

```bash
cd ~/Projects/hjc
git status
git add composer.lock 2>/dev/null || true
git diff --cached --quiet || git commit -m "chore: install dependencies"
```

---

## Task 3: Crusade model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100000_create_crusades_table.php`
- Create: `app/Models/Crusade.php`
- Create: `database/factories/CrusadeFactory.php`
- Create: `tests/Feature/CrusadeModelTest.php`

- [ ] **Step 1: Generate model + migration + factory**

```bash
cd ~/Projects/hjc
php artisan make:model Crusade -mf
```

This creates the migration with a default timestamp; rename it so ordering is predictable:

```bash
cd ~/Projects/hjc
mv database/migrations/*_create_crusades_table.php database/migrations/2026_04_25_100000_create_crusades_table.php
```

- [ ] **Step 2: Write migration**

Replace `database/migrations/2026_04_25_100000_create_crusades_table.php` with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crusades', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city');
            $table->date('opens_at');
            $table->date('closes_at');
            $table->decimal('budget_total', 12, 2)->default(0);
            $table->unsignedInteger('pastors_target')->default(0);
            $table->unsignedTinyInteger('awareness_target_pct')->default(60);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crusades');
    }
};
```

- [ ] **Step 3: Write model**

Replace `app/Models/Crusade.php` with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Crusade extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'city', 'opens_at', 'closes_at',
        'budget_total', 'pastors_target', 'awareness_target_pct',
    ];

    protected $casts = [
        'opens_at' => 'date',
        'closes_at' => 'date',
        'budget_total' => 'decimal:2',
    ];
}
```

- [ ] **Step 4: Write factory**

Replace `database/factories/CrusadeFactory.php` with:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CrusadeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Lusaka 2026',
            'city' => 'Lusaka',
            'opens_at' => '2026-05-02',
            'closes_at' => '2026-05-04',
            'budget_total' => 80000,
            'pastors_target' => 1088,
            'awareness_target_pct' => 60,
        ];
    }
}
```

- [ ] **Step 5: Write failing test**

Create `tests/Feature/CrusadeModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrusadeModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_a_crusade(): void
    {
        $crusade = Crusade::factory()->create();

        $this->assertDatabaseHas('crusades', ['id' => $crusade->id, 'city' => 'Lusaka']);
        $this->assertSame(80000.00, (float) $crusade->budget_total);
        $this->assertEquals('2026-05-02', $crusade->opens_at->toDateString());
    }
}
```

- [ ] **Step 6: Run test — must pass**

```bash
cd ~/Projects/hjc
php artisan test --filter=CrusadeModelTest
```

Expected: 1 passed, 3 assertions.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add Crusade model + migration + factory"
```

---

## Task 4: Zone model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100100_create_zones_table.php`
- Create: `app/Models/Zone.php`
- Create: `database/factories/ZoneFactory.php`
- Create: `tests/Feature/ZoneModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model Zone -mf
mv database/migrations/*_create_zones_table.php database/migrations/2026_04_25_100100_create_zones_table.php
```

- [ ] **Step 2: Write migration**

Replace `database/migrations/2026_04_25_100100_create_zones_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('code', 8);
            $table->string('name')->nullable();
            $table->unsignedInteger('population')->nullable();
            $table->unsignedInteger('pap')->nullable();
            $table->timestamps();
            $table->unique(['crusade_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
```

- [ ] **Step 3: Write model**

Replace `app/Models/Zone.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Zone extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'code', 'name', 'population', 'pap'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
```

- [ ] **Step 4: Write factory**

Replace `database/factories/ZoneFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class ZoneFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'code' => fake()->unique()->bothify('Z##'),
            'name' => fake()->city(),
            'population' => fake()->numberBetween(20000, 80000),
            'pap' => fake()->numberBetween(15000, 70000),
        ];
    }
}
```

- [ ] **Step 5: Write failing test**

Create `tests/Feature/ZoneModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZoneModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_zone_belongs_to_crusade(): void
    {
        $zone = Zone::factory()->create();
        $this->assertInstanceOf(Crusade::class, $zone->crusade);
    }

    public function test_code_is_unique_within_crusade(): void
    {
        $crusade = Crusade::factory()->create();
        Zone::factory()->create(['crusade_id' => $crusade->id, 'code' => 'Z01']);
        $this->expectException(\Illuminate\Database\QueryException::class);
        Zone::factory()->create(['crusade_id' => $crusade->id, 'code' => 'Z01']);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=ZoneModelTest
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add Zone model + migration + factory"
```

---

## Task 5: Church model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100200_create_churches_table.php`
- Create: `app/Models/Church.php`
- Create: `database/factories/ChurchFactory.php`
- Create: `tests/Feature/ChurchModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model Church -mf
mv database/migrations/*_create_churches_table.php database/migrations/2026_04_25_100200_create_churches_table.php
```

- [ ] **Step 2: Write migration**

Replace `database/migrations/2026_04_25_100200_create_churches_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('churches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('churches');
    }
};
```

- [ ] **Step 3: Write model**

Replace `app/Models/Church.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Church extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'name', 'zone_id'];

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

Replace `database/factories/ChurchFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChurchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->company() . ' Church',
            'zone_id' => null,
        ];
    }
}
```

- [ ] **Step 5: Write test**

Create `tests/Feature/ChurchModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChurchModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_church_belongs_to_crusade_and_optional_zone(): void
    {
        $crusade = Crusade::factory()->create();
        $zone = Zone::factory()->create(['crusade_id' => $crusade->id]);
        $church = Church::factory()->create(['crusade_id' => $crusade->id, 'zone_id' => $zone->id]);

        $this->assertSame($crusade->id, $church->crusade->id);
        $this->assertSame($zone->id, $church->zone->id);
    }

    public function test_zone_is_optional(): void
    {
        $church = Church::factory()->create(['zone_id' => null]);
        $this->assertNull($church->zone);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=ChurchModelTest
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add Church model + migration + factory"
```

---

## Task 6: Pastor model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100300_create_pastors_table.php`
- Create: `app/Models/Pastor.php`
- Create: `database/factories/PastorFactory.php`
- Create: `tests/Feature/PastorModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model Pastor -mf
mv database/migrations/*_create_pastors_table.php database/migrations/2026_04_25_100300_create_pastors_table.php
```

- [ ] **Step 2: Write migration**

Replace `database/migrations/2026_04_25_100300_create_pastors_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pastors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->unsignedSmallInteger('pastor_since')->nullable();
            $table->enum('pipeline_stage', ['identified', 'engaged', 'committed', 'active', 'champion'])->default('identified');
            $table->timestamp('last_contact_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['crusade_id', 'pipeline_stage']);
            $table->index(['crusade_id', 'zone_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastors');
    }
};
```

- [ ] **Step 3: Write model**

Replace `app/Models/Pastor.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pastor extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'crusade_id', 'full_name', 'church_id', 'zone_id',
        'phone', 'email', 'address', 'pastor_since',
        'pipeline_stage', 'last_contact_at',
    ];

    protected $casts = [
        'last_contact_at' => 'datetime',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function identifications(): HasMany
    {
        return $this->hasMany(PastorIdentification::class);
    }

    public function pledges(): HasMany
    {
        return $this->hasMany(Pledge::class);
    }
}
```

- [ ] **Step 4: Write factory**

Replace `database/factories/PastorFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PastorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'full_name' => 'Pastor ' . fake()->name(),
            'church_id' => null,
            'zone_id' => null,
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'pastor_since' => fake()->numberBetween(2000, 2024),
            'pipeline_stage' => fake()->randomElement(['identified', 'engaged', 'committed', 'active', 'champion']),
            'last_contact_at' => fake()->optional()->dateTimeThisMonth(),
        ];
    }
}
```

- [ ] **Step 5: Write test**

Create `tests/Feature/PastorModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Pastor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PastorModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_pastor_with_default_pipeline(): void
    {
        $pastor = Pastor::factory()->create(['pipeline_stage' => 'identified']);
        $this->assertSame('identified', $pastor->pipeline_stage);
        $this->assertInstanceOf(Crusade::class, $pastor->crusade);
    }

    public function test_pastor_can_be_soft_deleted(): void
    {
        $pastor = Pastor::factory()->create();
        $pastor->delete();
        $this->assertSoftDeleted($pastor);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=PastorModelTest
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add Pastor model + migration + factory"
```

---

## Task 7: PastorIdentification model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100400_create_pastor_identifications_table.php`
- Create: `app/Models/PastorIdentification.php`
- Create: `database/factories/PastorIdentificationFactory.php`
- Create: `tests/Feature/PastorIdentificationModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model PastorIdentification -mf
mv database/migrations/*_create_pastor_identifications_table.php database/migrations/2026_04_25_100400_create_pastor_identifications_table.php
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
        Schema::create('pastor_identifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pastor_id')->constrained()->cascadeOnDelete();
            $table->string('category', 32);   // PCM, BOT, …
            $table->string('sub_role', 32)->nullable(); // primary, member, chair, sec, champion
            $table->date('assigned_at');
            $table->foreignId('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['pastor_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastor_identifications');
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

class PastorIdentification extends Model
{
    use HasFactory;

    protected $fillable = ['pastor_id', 'category', 'sub_role', 'assigned_at', 'assigned_by_user_id'];

    protected $casts = ['assigned_at' => 'date'];

    public function pastor(): BelongsTo
    {
        return $this->belongsTo(Pastor::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }
}
```

- [ ] **Step 4: Write factory**

```php
<?php

namespace Database\Factories;

use App\Models\Pastor;
use Illuminate\Database\Eloquent\Factories\Factory;

class PastorIdentificationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'pastor_id' => Pastor::factory(),
            'category' => fake()->randomElement(['PCM', 'BOT']),
            'sub_role' => fake()->randomElement(['primary', 'member', 'chair', 'sec']),
            'assigned_at' => fake()->dateTimeThisYear(),
            'assigned_by_user_id' => null,
        ];
    }
}
```

- [ ] **Step 5: Write test**

Create `tests/Feature/PastorIdentificationModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PastorIdentification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PastorIdentificationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_pastor_can_have_multiple_identifications(): void
    {
        $pastor = Pastor::factory()->create();
        PastorIdentification::factory()->create(['pastor_id' => $pastor->id, 'category' => 'PCM']);
        PastorIdentification::factory()->create(['pastor_id' => $pastor->id, 'category' => 'BOT']);

        $this->assertCount(2, $pastor->identifications);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=PastorIdentificationModelTest
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add PastorIdentification model + migration + factory"
```

---

## Task 8: PledgeMeeting + PledgeMeetingAttendance pivot

**Files:**
- Create: `database/migrations/2026_04_25_100500_create_pledge_meetings_table.php`
- Create: `database/migrations/2026_04_25_100600_create_pledge_meeting_attendances_table.php`
- Create: `app/Models/PledgeMeeting.php`
- Create: `database/factories/PledgeMeetingFactory.php`
- Create: `tests/Feature/PledgeMeetingModelTest.php`

- [ ] **Step 1: Generate model + migration + factory**

```bash
cd ~/Projects/hjc
php artisan make:model PledgeMeeting -mf
mv database/migrations/*_create_pledge_meetings_table.php database/migrations/2026_04_25_100500_create_pledge_meetings_table.php
php artisan make:migration create_pledge_meeting_attendances_table
mv database/migrations/*_create_pledge_meeting_attendances_table.php database/migrations/2026_04_25_100600_create_pledge_meeting_attendances_table.php
```

- [ ] **Step 2: Write pledge_meetings migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pledge_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('sequence', 8);   // M1, M2, …
            $table->date('held_on');
            $table->string('venue');
            $table->enum('status', ['upcoming', 'done'])->default('upcoming');
            $table->timestamps();
            $table->unique(['crusade_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pledge_meetings');
    }
};
```

- [ ] **Step 3: Write attendances pivot migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pledge_meeting_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pledge_meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pastor_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['pledge_meeting_id', 'pastor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pledge_meeting_attendances');
    }
};
```

- [ ] **Step 4: Write PledgeMeeting model**

Replace `app/Models/PledgeMeeting.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PledgeMeeting extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'sequence', 'held_on', 'venue', 'status'];

    protected $casts = ['held_on' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function attendees(): BelongsToMany
    {
        return $this->belongsToMany(Pastor::class, 'pledge_meeting_attendances')->withTimestamps();
    }

    public function pledges(): HasMany
    {
        return $this->hasMany(Pledge::class);
    }
}
```

- [ ] **Step 5: Write factory**

Replace `database/factories/PledgeMeetingFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PledgeMeetingFactory extends Factory
{
    public function definition(): array
    {
        static $seq = 0;
        $seq++;
        return [
            'crusade_id' => Crusade::factory(),
            'sequence' => 'M' . $seq,
            'held_on' => fake()->dateTimeThisYear()->format('Y-m-d'),
            'venue' => fake()->city(),
            'status' => fake()->randomElement(['upcoming', 'done']),
        ];
    }
}
```

- [ ] **Step 6: Write test**

Create `tests/Feature/PledgeMeetingModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PledgeMeetingModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_meeting_tracks_attendees_via_pivot(): void
    {
        $meeting = PledgeMeeting::factory()->create();
        $pastor = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $meeting->attendees()->attach($pastor->id);

        $this->assertCount(1, $meeting->fresh()->attendees);
    }

    public function test_attendance_is_unique(): void
    {
        $meeting = PledgeMeeting::factory()->create();
        $pastor = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $meeting->attendees()->attach($pastor->id);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $meeting->attendees()->attach($pastor->id);
    }
}
```

- [ ] **Step 7: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=PledgeMeetingModelTest
```

Expected: 2 passed.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add PledgeMeeting + attendances pivot"
```

---

## Task 9: Pledge model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100700_create_pledges_table.php`
- Create: `app/Models/Pledge.php`
- Create: `database/factories/PledgeFactory.php`
- Create: `tests/Feature/PledgeModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model Pledge -mf
mv database/migrations/*_create_pledges_table.php database/migrations/2026_04_25_100700_create_pledges_table.php
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
        Schema::create('pledges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pastor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pledge_meeting_id')->constrained()->cascadeOnDelete();
            $table->enum('resource', ['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']);
            $table->decimal('quantity', 12, 2);
            $table->timestamps();
            $table->index(['pledge_meeting_id', 'resource']);
            $table->index(['pastor_id', 'resource']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pledges');
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

class Pledge extends Model
{
    use HasFactory;

    protected $fillable = ['pastor_id', 'pledge_meeting_id', 'resource', 'quantity'];

    protected $casts = ['quantity' => 'decimal:2'];

    public function pastor(): BelongsTo
    {
        return $this->belongsTo(Pastor::class);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(PledgeMeeting::class, 'pledge_meeting_id');
    }
}
```

- [ ] **Step 4: Write factory**

```php
<?php

namespace Database\Factories;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use Illuminate\Database\Eloquent\Factories\Factory;

class PledgeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'pastor_id' => Pastor::factory(),
            'pledge_meeting_id' => PledgeMeeting::factory(),
            'resource' => fake()->randomElement(['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']),
            'quantity' => fake()->numberBetween(1, 50),
        ];
    }
}
```

- [ ] **Step 5: Write test**

Create `tests/Feature/PledgeModelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PledgeModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_pledge_relates_to_pastor_and_meeting(): void
    {
        $pastor = Pastor::factory()->create();
        $meeting = PledgeMeeting::factory()->create();
        $pledge = Pledge::factory()->create([
            'pastor_id' => $pastor->id,
            'pledge_meeting_id' => $meeting->id,
            'resource' => 'ushers',
            'quantity' => 12,
        ]);

        $this->assertSame($pastor->id, $pledge->pastor->id);
        $this->assertSame($meeting->id, $pledge->meeting->id);
        $this->assertSame('12.00', (string) $pledge->quantity);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=PledgeModelTest
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add Pledge model + migration + factory"
```

---

## Task 10: CrusadeTarget model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100800_create_crusade_targets_table.php`
- Create: `app/Models/CrusadeTarget.php`
- Create: `database/factories/CrusadeTargetFactory.php`
- Create: `tests/Feature/CrusadeTargetModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model CrusadeTarget -mf
mv database/migrations/*_create_crusade_targets_table.php database/migrations/2026_04_25_100800_create_crusade_targets_table.php
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
        Schema::create('crusade_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->enum('resource', ['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']);
            $table->decimal('target_quantity', 12, 2);
            $table->timestamps();
            $table->unique(['crusade_id', 'resource']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crusade_targets');
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

class CrusadeTarget extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'resource', 'target_quantity'];

    protected $casts = ['target_quantity' => 'decimal:2'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
```

- [ ] **Step 4: Write factory**

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrusadeTargetFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'resource' => 'ushers',
            'target_quantity' => 300,
        ];
    }
}
```

- [ ] **Step 5: Write test**

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\CrusadeTarget;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrusadeTargetModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_target_per_resource_per_crusade(): void
    {
        $crusade = Crusade::factory()->create();
        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'choir', 'target_quantity' => 150]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'choir', 'target_quantity' => 200]);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=CrusadeTargetModelTest
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add CrusadeTarget model + migration + factory"
```

---

## Task 11: ActivityEntry model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_100900_create_activity_entries_table.php`
- Create: `app/Models/ActivityEntry.php`
- Create: `database/factories/ActivityEntryFactory.php`
- Create: `tests/Feature/ActivityEntryModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model ActivityEntry -mf
mv database/migrations/*_create_activity_entries_table.php database/migrations/2026_04_25_100900_create_activity_entries_table.php
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
        Schema::create('activity_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('occurred_at');
            $table->text('description');
            $table->string('power', 32);  // pastors, awareness, …
            $table->enum('status', ['done', 'running'])->default('done');
            $table->timestamps();
            $table->index(['crusade_id', 'occurred_at']);
            $table->index(['crusade_id', 'power']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_entries');
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

class ActivityEntry extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'user_id', 'occurred_at', 'description', 'power', 'status'];

    protected $casts = ['occurred_at' => 'datetime'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 4: Write factory**

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
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
            'power' => fake()->randomElement(['pastors', 'awareness', 'pledges', 'publicity', 'committees', 'budget', 'govt']),
            'status' => 'done',
        ];
    }
}
```

- [ ] **Step 5: Write test**

```php
<?php

namespace Tests\Feature;

use App\Models\ActivityEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityEntryModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_entry_belongs_to_user_and_crusade(): void
    {
        $entry = ActivityEntry::factory()->create();
        $this->assertInstanceOf(User::class, $entry->user);
        $this->assertNotNull($entry->crusade);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=ActivityEntryModelTest
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add ActivityEntry model + migration + factory"
```

---

## Task 12: Reminder model, migration, factory, test

**Files:**
- Create: `database/migrations/2026_04_25_101000_create_reminders_table.php`
- Create: `app/Models/Reminder.php`
- Create: `database/factories/ReminderFactory.php`
- Create: `tests/Feature/ReminderModelTest.php`

- [ ] **Step 1: Generate scaffolding**

```bash
cd ~/Projects/hjc
php artisan make:model Reminder -mf
mv database/migrations/*_create_reminders_table.php database/migrations/2026_04_25_101000_create_reminders_table.php
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
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('text');
            $table->date('due_on')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
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

class Reminder extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'user_id', 'text', 'due_on', 'completed_at'];

    protected $casts = [
        'due_on' => 'date',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 4: Write factory**

```php
<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReminderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'user_id' => User::factory(),
            'text' => fake()->sentence(),
            'due_on' => fake()->dateTimeBetween('now', '+2 weeks')->format('Y-m-d'),
            'completed_at' => null,
        ];
    }
}
```

- [ ] **Step 5: Write test**

```php
<?php

namespace Tests\Feature;

use App\Models\Reminder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReminderModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_reminder_defaults_to_incomplete(): void
    {
        $reminder = Reminder::factory()->create();
        $this->assertNull($reminder->completed_at);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=ReminderModelTest
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(data): add Reminder model + migration + factory"
```

---

## Task 13: Sanctum auth — login, logout, middleware

**Files:**
- Modify: `app/Models/User.php` (add `HasApiTokens`)
- Modify: `bootstrap/app.php` (register sanctum middleware alias if not present)
- Create: `app/Http/Controllers/Api/AuthController.php`
- Modify: `routes/api.php` (add `/login`, `/logout` and protect everything else)
- Create: `tests/Feature/AuthTest.php`
- Create: `database/factories/UserFactory.php` (verify or use scaffold default)

- [ ] **Step 1: Verify UserFactory exists from scaffold**

```bash
cd ~/Projects/hjc
ls database/factories/UserFactory.php
```

If missing, create:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => \Illuminate\Support\Str::random(10),
        ];
    }
}
```

- [ ] **Step 2: Add HasApiTokens to User model**

Modify `app/Models/User.php` — add the trait:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
```

- [ ] **Step 3: Write failing auth test**

Create `tests/Feature/AuthTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_token(): void
    {
        $user = User::factory()->create(['email' => 'd@example.com', 'password' => bcrypt('secret123')]);

        $response = $this->postJson('/api/login', ['email' => 'd@example.com', 'password' => 'secret123']);

        $response->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_login_rejects_bad_password(): void
    {
        User::factory()->create(['email' => 'd@example.com', 'password' => bcrypt('secret123')]);

        $response = $this->postJson('/api/login', ['email' => 'd@example.com', 'password' => 'wrong']);

        $response->assertStatus(422);
    }

    public function test_protected_route_requires_token(): void
    {
        $this->getJson('/api/crusade')->assertStatus(401);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/logout')->assertOk();
        $this->assertCount(0, $user->fresh()->tokens);
    }
}
```

- [ ] **Step 4: Run test — verify it fails**

```bash
cd ~/Projects/hjc
php artisan test --filter=AuthTest
```

Expected: failures (no /login route yet, no /crusade either).

- [ ] **Step 5: Write AuthController**

Create `app/Http/Controllers/Api/AuthController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['ok' => true]);
    }
}
```

- [ ] **Step 6: Wire routes — login open, everything else behind auth**

Replace `routes/api.php`:

```php
<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/crusade', fn () => response()->json(['data' => \App\Models\Crusade::firstOrFail()]));
});
```

- [ ] **Step 7: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=AuthTest
```

Expected: 4 passed (note the `/crusade` 401 test passes because middleware blocks unauthenticated requests — even though no Crusade exists yet).

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(auth): add Sanctum login/logout and protect routes"
```

---

## Task 14: GET /crusade — current crusade context

**Files:**
- Create: `app/Http/Controllers/Api/CrusadeController.php`
- Modify: `routes/api.php` (replace inline `/crusade` closure)
- Create: `tests/Feature/CrusadeApiTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/CrusadeApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CrusadeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_current_crusade(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create(['name' => 'Lusaka 2026']);

        $response = $this->getJson('/api/crusade');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Lusaka 2026')
            ->assertJsonPath('data.city', 'Lusaka');
    }

    public function test_returns_404_when_no_crusade_exists(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/crusade')->assertStatus(404);
    }
}
```

- [ ] **Step 2: Run test — verify it fails (or passes via the closure from Task 13)**

```bash
cd ~/Projects/hjc
php artisan test --filter=CrusadeApiTest
```

Expected: passes if Task 13's closure is in place; otherwise fails. Either way, replace with controller next.

- [ ] **Step 3: Write controller**

Create `app/Http/Controllers/Api/CrusadeController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crusade;
use Illuminate\Http\JsonResponse;

class CrusadeController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => Crusade::firstOrFail()]);
    }
}
```

- [ ] **Step 4: Wire route**

In `routes/api.php`, inside the `auth:sanctum` group, replace the closure:

```php
    Route::get('/crusade', [\App\Http\Controllers\Api\CrusadeController::class, 'show']);
```

- [ ] **Step 5: Run tests — must pass**

```bash
cd ~/Projects/hjc
php artisan test --filter=CrusadeApiTest
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): GET /crusade returns current crusade"
```

---

## Task 15: Lookups — GET /zones, GET /churches

**Files:**
- Create: `app/Http/Controllers/Api/ZoneController.php`
- Create: `app/Http/Controllers/Api/ChurchController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/LookupTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/LookupTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LookupTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_zones(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Zone::factory()->count(3)->create();

        $this->getJson('/api/zones')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_lists_churches(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Church::factory()->count(2)->create();

        $this->getJson('/api/churches')->assertOk()->assertJsonCount(2, 'data');
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd ~/Projects/hjc
php artisan test --filter=LookupTest
```

Expected: 404 failures.

- [ ] **Step 3: Write ZoneController**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;

class ZoneController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Zone::orderBy('code')->get()]);
    }
}
```

- [ ] **Step 4: Write ChurchController**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Church;
use Illuminate\Http\JsonResponse;

class ChurchController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Church::orderBy('name')->get()]);
    }
}
```

- [ ] **Step 5: Wire routes**

Inside the `auth:sanctum` group in `routes/api.php`, add:

```php
    Route::get('/zones', [\App\Http\Controllers\Api\ZoneController::class, 'index']);
    Route::get('/churches', [\App\Http\Controllers\Api\ChurchController::class, 'index']);
```

- [ ] **Step 6: Run tests — must pass**

```bash
cd ~/Projects/hjc
php artisan test --filter=LookupTest
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): GET /zones and /churches lookups"
```

---

## Task 16: Pastor CRUD with filters

**Files:**
- Create: `app/Http/Controllers/Api/PastorController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/PastorApiTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/PastorApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Pastor;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PastorApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_lists_pastors_paginated(): void
    {
        Pastor::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/pastors')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']])
            ->assertJsonCount(3, 'data');
    }

    public function test_index_filters_by_pipeline_stage(): void
    {
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 'active']);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 'identified']);

        $this->getJson('/api/pastors?pipeline_stage=active')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_index_filters_by_zone(): void
    {
        $z1 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z1->id]);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z2->id]);

        $this->getJson("/api/pastors?zone_id={$z1->id}")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_index_searches_by_name(): void
    {
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'full_name' => 'Pastor Emmanuel Mwanza']);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'full_name' => 'Rev. Joyce Kalonga']);

        $this->getJson('/api/pastors?q=mwanza')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_show_includes_identifications_and_pledge_totals(): void
    {
        $pastor = Pastor::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->getJson("/api/pastors/{$pastor->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'full_name', 'identifications', 'pledge_totals']]);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->postJson('/api/pastors', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['full_name', 'crusade_id']);
    }

    public function test_can_create_pastor(): void
    {
        $response = $this->postJson('/api/pastors', [
            'crusade_id' => $this->crusade->id,
            'full_name' => 'Pastor Mary Nkomo',
            'pipeline_stage' => 'engaged',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.full_name', 'Pastor Mary Nkomo');
    }

    public function test_can_update_pastor(): void
    {
        $pastor = Pastor::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/pastors/{$pastor->id}", ['pipeline_stage' => 'champion'])
            ->assertOk()
            ->assertJsonPath('data.pipeline_stage', 'champion');
    }

    public function test_can_soft_delete_pastor(): void
    {
        $pastor = Pastor::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/pastors/{$pastor->id}")->assertStatus(204);
        $this->assertSoftDeleted($pastor);
    }
}
```

- [ ] **Step 2: Run test — verify failures**

```bash
cd ~/Projects/hjc
php artisan test --filter=PastorApiTest
```

Expected: failures (no controller).

- [ ] **Step 3: Write PastorController**

Create `app/Http/Controllers/Api/PastorController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pastor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PastorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Pastor::query();

        if ($request->filled('pipeline_stage')) {
            $q->where('pipeline_stage', $request->string('pipeline_stage'));
        }
        if ($request->filled('zone_id')) {
            $q->where('zone_id', $request->integer('zone_id'));
        }
        if ($request->filled('q')) {
            $term = '%' . $request->string('q') . '%';
            $q->where(function ($w) use ($term) {
                $w->where('full_name', 'like', $term)
                  ->orWhere('phone', 'like', $term)
                  ->orWhere('email', 'like', $term);
            });
        }
        if ($request->filled('last_contact_before')) {
            $q->where('last_contact_at', '<', $request->date('last_contact_before'));
        }

        return response()->json($q->orderByDesc('last_contact_at')->paginate($request->integer('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'full_name' => 'required|string|max:255',
            'church_id' => 'nullable|exists:churches,id',
            'zone_id' => 'nullable|exists:zones,id',
            'phone' => 'nullable|string|max:64',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'pastor_since' => 'nullable|integer|min:1900|max:2100',
            'pipeline_stage' => 'nullable|in:identified,engaged,committed,active,champion',
            'last_contact_at' => 'nullable|date',
        ]);
        $pastor = Pastor::create($validated);
        return response()->json(['data' => $pastor], 201);
    }

    public function show(Pastor $pastor): JsonResponse
    {
        $pastor->load('identifications');
        $totals = $pastor->pledges()
            ->selectRaw('resource, SUM(quantity) as total')
            ->groupBy('resource')
            ->pluck('total', 'resource');
        return response()->json(['data' => array_merge($pastor->toArray(), ['pledge_totals' => $totals])]);
    }

    public function update(Request $request, Pastor $pastor): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => 'sometimes|required|string|max:255',
            'church_id' => 'sometimes|nullable|exists:churches,id',
            'zone_id' => 'sometimes|nullable|exists:zones,id',
            'phone' => 'sometimes|nullable|string|max:64',
            'email' => 'sometimes|nullable|email|max:255',
            'address' => 'sometimes|nullable|string|max:255',
            'pastor_since' => 'sometimes|nullable|integer|min:1900|max:2100',
            'pipeline_stage' => 'sometimes|in:identified,engaged,committed,active,champion',
            'last_contact_at' => 'sometimes|nullable|date',
        ]);
        $pastor->update($validated);
        return response()->json(['data' => $pastor]);
    }

    public function destroy(Pastor $pastor): JsonResponse
    {
        $pastor->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 4: Wire routes**

Inside the `auth:sanctum` group in `routes/api.php`, add:

```php
    Route::apiResource('pastors', \App\Http\Controllers\Api\PastorController::class);
```

- [ ] **Step 5: Run tests — must pass**

```bash
cd ~/Projects/hjc
php artisan test --filter=PastorApiTest
```

Expected: 9 passed.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): pastor CRUD with filter, search, pipeline pagination"
```

---

## Task 17: Pastor identifications endpoints

**Files:**
- Create: `app/Http/Controllers/Api/PastorIdentificationController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/PastorIdentificationApiTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/PastorIdentificationApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PastorIdentification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PastorIdentificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_identifications_for_pastor(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();
        PastorIdentification::factory()->count(2)->create(['pastor_id' => $pastor->id]);

        $this->getJson("/api/pastors/{$pastor->id}/identifications")
            ->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_can_add_identification(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();

        $response = $this->postJson("/api/pastors/{$pastor->id}/identifications", [
            'category' => 'BOT',
            'sub_role' => 'chair',
            'assigned_at' => '2026-03-11',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.category', 'BOT');
        $this->assertDatabaseHas('pastor_identifications', ['pastor_id' => $pastor->id, 'category' => 'BOT']);
    }

    public function test_add_validates_required(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();

        $this->postJson("/api/pastors/{$pastor->id}/identifications", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category', 'assigned_at']);
    }
}
```

- [ ] **Step 2: Write controller**

Create `app/Http/Controllers/Api/PastorIdentificationController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pastor;
use App\Models\PastorIdentification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PastorIdentificationController extends Controller
{
    public function index(Pastor $pastor): JsonResponse
    {
        return response()->json(['data' => $pastor->identifications()->orderBy('assigned_at', 'desc')->get()]);
    }

    public function store(Request $request, Pastor $pastor): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|max:32',
            'sub_role' => 'nullable|string|max:32',
            'assigned_at' => 'required|date',
        ]);
        $validated['pastor_id'] = $pastor->id;
        $validated['assigned_by_user_id'] = $request->user()->id;
        $ident = PastorIdentification::create($validated);
        return response()->json(['data' => $ident], 201);
    }
}
```

- [ ] **Step 3: Wire routes**

Inside the `auth:sanctum` group, add:

```php
    Route::get('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'index']);
    Route::post('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'store']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=PastorIdentificationApiTest
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): pastor identifications list + add"
```

---

## Task 18: Pastor pledges aggregate

**Files:**
- Modify: `app/Http/Controllers/Api/PastorController.php` (add `pledges()` method)
- Modify: `routes/api.php`
- Create: `tests/Feature/PastorPledgesApiTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/PastorPledgesApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PastorPledgesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_pledges_aggregated_by_resource(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();
        $m1 = PledgeMeeting::factory()->create(['crusade_id' => $pastor->crusade_id]);
        $m2 = PledgeMeeting::factory()->create(['crusade_id' => $pastor->crusade_id]);

        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $m1->id, 'resource' => 'ushers', 'quantity' => 8]);
        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $m2->id, 'resource' => 'ushers', 'quantity' => 4]);
        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $m1->id, 'resource' => 'counsellors', 'quantity' => 4]);

        $response = $this->getJson("/api/pastors/{$pastor->id}/pledges");
        $response->assertOk()
            ->assertJsonPath('data.ushers', '12.00')
            ->assertJsonPath('data.counsellors', '4.00');
    }
}
```

- [ ] **Step 2: Add controller method**

Append to `app/Http/Controllers/Api/PastorController.php`:

```php
    public function pledges(Pastor $pastor): JsonResponse
    {
        $totals = $pastor->pledges()
            ->selectRaw('resource, SUM(quantity) as total')
            ->groupBy('resource')
            ->pluck('total', 'resource');
        return response()->json(['data' => $totals]);
    }
```

- [ ] **Step 3: Wire route**

Inside the `auth:sanctum` group:

```php
    Route::get('/pastors/{pastor}/pledges', [\App\Http\Controllers\Api\PastorController::class, 'pledges']);
```

- [ ] **Step 4: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=PastorPledgesApiTest
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): GET /pastors/{id}/pledges aggregate"
```

---

## Task 19: PledgeMeeting CRUD

**Files:**
- Create: `app/Http/Controllers/Api/PledgeMeetingController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/PledgeMeetingApiTest.php`

- [ ] **Step 1: Write failing test**

Create `tests/Feature/PledgeMeetingApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeMeetingApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_meetings(): void
    {
        PledgeMeeting::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/pledge-meetings')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_create_meeting(): void
    {
        $response = $this->postJson('/api/pledge-meetings', [
            'crusade_id' => $this->crusade->id,
            'sequence' => 'M5',
            'held_on' => '2026-04-30',
            'venue' => 'Bishop residence',
            'status' => 'upcoming',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.sequence', 'M5');
    }

    public function test_create_rejects_duplicate_sequence_in_crusade(): void
    {
        PledgeMeeting::factory()->create(['crusade_id' => $this->crusade->id, 'sequence' => 'M1']);
        $this->postJson('/api/pledge-meetings', [
            'crusade_id' => $this->crusade->id,
            'sequence' => 'M1',
            'held_on' => '2026-04-30',
            'venue' => 'X',
        ])->assertStatus(422)->assertJsonValidationErrors(['sequence']);
    }

    public function test_can_update_status(): void
    {
        $m = PledgeMeeting::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'upcoming']);
        $this->patchJson("/api/pledge-meetings/{$m->id}", ['status' => 'done'])
            ->assertOk()->assertJsonPath('data.status', 'done');
    }
}
```

- [ ] **Step 2: Write controller**

Create `app/Http/Controllers/Api/PledgeMeetingController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PledgeMeeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PledgeMeetingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => PledgeMeeting::orderBy('held_on')->withCount('attendees')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'sequence' => [
                'required', 'string', 'max:8',
                Rule::unique('pledge_meetings')->where(fn ($q) => $q->where('crusade_id', $request->crusade_id)),
            ],
            'held_on' => 'required|date',
            'venue' => 'required|string|max:255',
            'status' => 'nullable|in:upcoming,done',
        ]);
        $meeting = PledgeMeeting::create($validated);
        return response()->json(['data' => $meeting], 201);
    }

    public function show(PledgeMeeting $pledgeMeeting): JsonResponse
    {
        return response()->json(['data' => $pledgeMeeting->loadCount('attendees')]);
    }

    public function update(Request $request, PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $validated = $request->validate([
            'sequence' => 'sometimes|string|max:8',
            'held_on' => 'sometimes|date',
            'venue' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:upcoming,done',
        ]);
        $pledgeMeeting->update($validated);
        return response()->json(['data' => $pledgeMeeting]);
    }

    public function destroy(PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $pledgeMeeting->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Wire routes**

Inside the `auth:sanctum` group:

```php
    Route::apiResource('pledge-meetings', \App\Http\Controllers\Api\PledgeMeetingController::class);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=PledgeMeetingApiTest
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): pledge meetings CRUD"
```

---

## Task 20: Pledge meeting attendances endpoint

**Files:**
- Create: `app/Http/Controllers/Api/PledgeMeetingAttendanceController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/PledgeMeetingAttendanceApiTest.php`

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeMeetingAttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_record_bulk_attendance(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p1 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $p2 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $response = $this->postJson("/api/pledge-meetings/{$meeting->id}/attendances", [
            'pastor_ids' => [$p1->id, $p2->id],
        ]);

        $response->assertOk()->assertJsonPath('data.attendees_count', 2);
        $this->assertDatabaseHas('pledge_meeting_attendances', ['pledge_meeting_id' => $meeting->id, 'pastor_id' => $p1->id]);
    }

    public function test_attendance_is_idempotent(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $this->postJson("/api/pledge-meetings/{$meeting->id}/attendances", ['pastor_ids' => [$p->id]])->assertOk();
        $this->postJson("/api/pledge-meetings/{$meeting->id}/attendances", ['pastor_ids' => [$p->id]])
            ->assertOk()
            ->assertJsonPath('data.attendees_count', 1);
    }
}
```

- [ ] **Step 2: Write controller**

Create `app/Http/Controllers/Api/PledgeMeetingAttendanceController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PledgeMeeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PledgeMeetingAttendanceController extends Controller
{
    public function store(Request $request, PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $validated = $request->validate([
            'pastor_ids' => 'required|array|min:1',
            'pastor_ids.*' => 'integer|exists:pastors,id',
        ]);
        $pledgeMeeting->attendees()->syncWithoutDetaching($validated['pastor_ids']);

        return response()->json([
            'data' => ['attendees_count' => $pledgeMeeting->attendees()->count()],
        ]);
    }
}
```

- [ ] **Step 3: Wire route**

Inside the `auth:sanctum` group:

```php
    Route::post('/pledge-meetings/{pledgeMeeting}/attendances', [\App\Http\Controllers\Api\PledgeMeetingAttendanceController::class, 'store']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=PledgeMeetingAttendanceApiTest
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): bulk attendance for pledge meetings"
```

---

## Task 21: Pledge meeting pledges endpoint (bulk record pledges)

**Files:**
- Create: `app/Http/Controllers/Api/PledgeMeetingPledgesController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/PledgeMeetingPledgesApiTest.php`

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeMeetingPledgesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_record_bulk_pledges(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p1 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $p2 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $response = $this->postJson("/api/pledge-meetings/{$meeting->id}/pledges", [
            'pledges' => [
                ['pastor_id' => $p1->id, 'resource' => 'ushers', 'quantity' => 12],
                ['pastor_id' => $p1->id, 'resource' => 'counsellors', 'quantity' => 4],
                ['pastor_id' => $p2->id, 'resource' => 'choir', 'quantity' => 6],
            ],
        ]);

        $response->assertOk()->assertJsonPath('data.created', 3);
        $this->assertDatabaseCount('pledges', 3);
    }

    public function test_validates_resource_enum(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p1 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $this->postJson("/api/pledge-meetings/{$meeting->id}/pledges", [
            'pledges' => [['pastor_id' => $p1->id, 'resource' => 'invalid', 'quantity' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors(['pledges.0.resource']);
    }
}
```

- [ ] **Step 2: Write controller**

Create `app/Http/Controllers/Api/PledgeMeetingPledgesController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PledgeMeetingPledgesController extends Controller
{
    public function store(Request $request, PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $validated = $request->validate([
            'pledges' => 'required|array|min:1',
            'pledges.*.pastor_id' => 'required|integer|exists:pastors,id',
            'pledges.*.resource' => 'required|in:choir,prayer,ushers,counsellors,buses,money',
            'pledges.*.quantity' => 'required|numeric|min:0',
        ]);

        $created = 0;
        foreach ($validated['pledges'] as $row) {
            Pledge::create([
                'pastor_id' => $row['pastor_id'],
                'pledge_meeting_id' => $pledgeMeeting->id,
                'resource' => $row['resource'],
                'quantity' => $row['quantity'],
            ]);
            $created++;
        }

        return response()->json(['data' => ['created' => $created]]);
    }
}
```

- [ ] **Step 3: Wire route**

Inside the `auth:sanctum` group:

```php
    Route::post('/pledge-meetings/{pledgeMeeting}/pledges', [\App\Http\Controllers\Api\PledgeMeetingPledgesController::class, 'store']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=PledgeMeetingPledgesApiTest
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): bulk pledge recording for meetings"
```

---

## Task 22: GET /pledges/summary — aggregate vs target

**Files:**
- Create: `app/Http/Controllers/Api/PledgeSummaryController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/PledgeSummaryApiTest.php`

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\CrusadeTarget;
use App\Models\Pastor;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeSummaryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_returns_pledged_vs_target_per_resource(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create();
        $meeting = PledgeMeeting::factory()->create(['crusade_id' => $crusade->id]);
        $pastor = Pastor::factory()->create(['crusade_id' => $crusade->id]);

        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'choir', 'target_quantity' => 150]);
        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'ushers', 'target_quantity' => 300]);

        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $meeting->id, 'resource' => 'choir', 'quantity' => 98]);
        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $meeting->id, 'resource' => 'ushers', 'quantity' => 180]);

        $response = $this->getJson('/api/pledges/summary');
        $response->assertOk()
            ->assertJsonPath('data.choir.pledged', '98.00')
            ->assertJsonPath('data.choir.target', '150.00')
            ->assertJsonPath('data.ushers.pledged', '180.00')
            ->assertJsonPath('data.ushers.target', '300.00');
    }
}
```

- [ ] **Step 2: Add `pledgeMeetings` relation to Crusade**

Modify `app/Models/Crusade.php` — add this method to the class:

```php
    public function pledgeMeetings(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PledgeMeeting::class);
    }
```

- [ ] **Step 3: Write controller**

Create `app/Http/Controllers/Api/PledgeSummaryController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crusade;
use App\Models\CrusadeTarget;
use App\Models\Pledge;
use Illuminate\Http\JsonResponse;

class PledgeSummaryController extends Controller
{
    public function show(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();

        $pledged = Pledge::query()
            ->whereIn('pledge_meeting_id', $crusade->pledgeMeetings()->select('id'))
            ->selectRaw('resource, SUM(quantity) as total')
            ->groupBy('resource')
            ->pluck('total', 'resource');

        $targets = CrusadeTarget::where('crusade_id', $crusade->id)->pluck('target_quantity', 'resource');

        $resources = collect(['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']);
        $data = $resources->mapWithKeys(fn ($r) => [
            $r => [
                'pledged' => number_format((float) ($pledged[$r] ?? 0), 2, '.', ''),
                'target' => number_format((float) ($targets[$r] ?? 0), 2, '.', ''),
            ],
        ]);

        return response()->json(['data' => $data]);
    }
}
```

- [ ] **Step 4: Wire route**

Inside the `auth:sanctum` group:

```php
    Route::get('/pledges/summary', [\App\Http\Controllers\Api\PledgeSummaryController::class, 'show']);
```

- [ ] **Step 5: Run test**

```bash
cd ~/Projects/hjc
php artisan test --filter=PledgeSummaryApiTest
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): GET /pledges/summary aggregate vs target"
```

---

## Task 23: ActivityEntry — index + store

**Files:**
- Create: `app/Http/Controllers/Api/ActivityEntryController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/ActivityEntryApiTest.php`

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\ActivityEntry;
use App\Models\Crusade;
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

        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'occurred_at' => now()]);
        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'occurred_at' => now()->subDays(3)]);

        $this->getJson('/api/activity-entries?date=' . now()->toDateString())
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_filters_by_power(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'power' => 'pastors']);
        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'power' => 'budget']);

        $this->getJson('/api/activity-entries?power=pastors')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_entry(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        $response = $this->postJson('/api/activity-entries', [
            'crusade_id' => $crusade->id,
            'occurred_at' => '2026-04-21 11:00:00',
            'description' => 'Pledge meeting #3 · Kabwata · 62 attended',
            'power' => 'pledges',
            'status' => 'done',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.power', 'pledges');
        $this->assertDatabaseHas('activity_entries', ['user_id' => $user->id, 'description' => 'Pledge meeting #3 · Kabwata · 62 attended']);
    }
}
```

- [ ] **Step 2: Write controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ActivityEntry::query();

        if ($request->filled('date')) {
            $q->whereDate('occurred_at', $request->date('date'));
        }
        if ($request->filled('power')) {
            $q->where('power', $request->string('power'));
        }

        return response()->json(['data' => $q->orderByDesc('occurred_at')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'occurred_at' => 'required|date',
            'description' => 'required|string',
            'power' => 'required|string|max:32',
            'status' => 'nullable|in:done,running',
        ]);
        $validated['user_id'] = $request->user()->id;
        $entry = ActivityEntry::create($validated);
        return response()->json(['data' => $entry], 201);
    }
}
```

- [ ] **Step 3: Wire routes**

Inside the `auth:sanctum` group:

```php
    Route::get('/activity-entries', [\App\Http\Controllers\Api\ActivityEntryController::class, 'index']);
    Route::post('/activity-entries', [\App\Http\Controllers\Api\ActivityEntryController::class, 'store']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=ActivityEntryApiTest
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): activity entries index + create"
```

---

## Task 24: Reminder CRUD

**Files:**
- Create: `app/Http/Controllers/Api/ReminderController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/ReminderApiTest.php`

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReminderApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_open_reminders_by_default(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        Reminder::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id]);
        Reminder::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'completed_at' => now()]);

        $this->getJson('/api/reminders')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_reminder(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        $this->postJson('/api/reminders', [
            'crusade_id' => $crusade->id,
            'text' => 'Send mayor letter for ZNBC TV permit',
            'due_on' => now()->toDateString(),
        ])->assertStatus(201)->assertJsonPath('data.text', 'Send mayor letter for ZNBC TV permit');
    }

    public function test_can_complete_reminder(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $r = Reminder::factory()->create(['user_id' => $user->id, 'completed_at' => null]);

        $this->patchJson("/api/reminders/{$r->id}", ['completed_at' => now()->toDateTimeString()])
            ->assertOk()
            ->assertJsonPath('data.completed_at', fn ($v) => $v !== null);
    }
}
```

- [ ] **Step 2: Write controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Reminder::where('user_id', $request->user()->id);
        if (! $request->boolean('include_completed')) {
            $q->whereNull('completed_at');
        }
        return response()->json(['data' => $q->orderBy('due_on')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'text' => 'required|string|max:255',
            'due_on' => 'nullable|date',
        ]);
        $validated['user_id'] = $request->user()->id;
        $r = Reminder::create($validated);
        return response()->json(['data' => $r], 201);
    }

    public function update(Request $request, Reminder $reminder): JsonResponse
    {
        $validated = $request->validate([
            'text' => 'sometimes|string|max:255',
            'due_on' => 'sometimes|nullable|date',
            'completed_at' => 'sometimes|nullable|date',
        ]);
        $reminder->update($validated);
        return response()->json(['data' => $reminder]);
    }

    public function destroy(Reminder $reminder): JsonResponse
    {
        $reminder->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Wire routes**

Inside the `auth:sanctum` group:

```php
    Route::get('/reminders', [\App\Http\Controllers\Api\ReminderController::class, 'index']);
    Route::post('/reminders', [\App\Http\Controllers\Api\ReminderController::class, 'store']);
    Route::patch('/reminders/{reminder}', [\App\Http\Controllers\Api\ReminderController::class, 'update']);
    Route::delete('/reminders/{reminder}', [\App\Http\Controllers\Api\ReminderController::class, 'destroy']);
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Projects/hjc
php artisan test --filter=ReminderApiTest
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(api): reminders CRUD"
```

---

## Task 25: Database seeder with realistic Lusaka 2026 data

**Files:**
- Modify: `database/seeders/DatabaseSeeder.php`
- Create: `database/seeders/CrusadeSeeder.php`
- Create: `tests/Feature/DatabaseSeederTest.php`

- [ ] **Step 1: Write failing seeder test**

Create `tests/Feature/DatabaseSeederTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_populates_realistic_data(): void
    {
        $this->seed();

        $this->assertDatabaseCount('crusades', 1);
        $this->assertDatabaseCount('crusade_targets', 6);
        $this->assertGreaterThanOrEqual(8, \DB::table('zones')->count());
        $this->assertGreaterThanOrEqual(15, \DB::table('churches')->count());
        $this->assertGreaterThanOrEqual(30, \DB::table('pastors')->count());
        $this->assertGreaterThanOrEqual(4, \DB::table('pledge_meetings')->count());
        $this->assertGreaterThan(0, \DB::table('pledges')->count());
        $this->assertGreaterThanOrEqual(10, \DB::table('activity_entries')->count());
        $this->assertGreaterThanOrEqual(1, \DB::table('users')->count());
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd ~/Projects/hjc
php artisan test --filter=DatabaseSeederTest
```

Expected: failure (seeder is empty).

- [ ] **Step 3: Write CrusadeSeeder**

Create `database/seeders/CrusadeSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\ActivityEntry;
use App\Models\Church;
use App\Models\Crusade;
use App\Models\CrusadeTarget;
use App\Models\Pastor;
use App\Models\PastorIdentification;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Models\Reminder;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CrusadeSeeder extends Seeder
{
    public function run(): void
    {
        $director = User::firstOrCreate(
            ['email' => 'director@hjc.test'],
            ['name' => 'John Adjei', 'password' => Hash::make('password')]
        );

        $crusade = Crusade::create([
            'name' => 'Lusaka 2026',
            'city' => 'Lusaka',
            'opens_at' => '2026-05-02',
            'closes_at' => '2026-05-04',
            'budget_total' => 80000,
            'pastors_target' => 1088,
            'awareness_target_pct' => 60,
        ]);

        foreach ([['choir', 150], ['prayer', 200], ['ushers', 300], ['counsellors', 250], ['buses', 24], ['money', 80000]] as [$r, $t]) {
            CrusadeTarget::create(['crusade_id' => $crusade->id, 'resource' => $r, 'target_quantity' => $t]);
        }

        $zones = collect();
        foreach (range(1, 10) as $n) {
            $zones->push(Zone::create([
                'crusade_id' => $crusade->id,
                'code' => sprintf('Z%02d', $n),
                'name' => "Zone {$n}",
                'population' => fake()->numberBetween(20000, 80000),
                'pap' => fake()->numberBetween(15000, 70000),
            ]));
        }

        $churches = collect();
        $churchNames = ['Bread of Life Intl', 'Faith Baptist', 'Living Water', 'Grace Assembly', 'Cornerstone',
                        'Hope Chapel', 'Christ Embassy', 'Catholic Diocese', 'Lusaka Mosque', 'Anglican Cathedral',
                        'Methodist Central', 'New Life', 'Pentecostal Holiness', 'Redeemed Christian', 'Word of Faith'];
        foreach ($churchNames as $i => $name) {
            $churches->push(Church::create([
                'crusade_id' => $crusade->id,
                'name' => $name,
                'zone_id' => $zones->random()->id,
            ]));
        }

        $stages = ['identified', 'engaged', 'committed', 'active', 'champion'];
        $pastors = collect();
        foreach (range(1, 30) as $n) {
            $church = $churches->random();
            $pastors->push(Pastor::create([
                'crusade_id' => $crusade->id,
                'full_name' => 'Pastor ' . fake()->name(),
                'church_id' => $church->id,
                'zone_id' => $church->zone_id,
                'phone' => fake()->phoneNumber(),
                'email' => fake()->safeEmail(),
                'address' => fake()->address(),
                'pastor_since' => fake()->numberBetween(2005, 2024),
                'pipeline_stage' => $stages[array_rand($stages)],
                'last_contact_at' => fake()->optional(0.7)->dateTimeThisMonth(),
            ]));
        }

        // Identifications: ~half PCM, some BOT
        foreach ($pastors as $p) {
            if (fake()->boolean(70)) {
                PastorIdentification::create([
                    'pastor_id' => $p->id,
                    'category' => 'PCM',
                    'sub_role' => 'primary',
                    'assigned_at' => fake()->dateTimeBetween('-6 months', 'now'),
                    'assigned_by_user_id' => $director->id,
                ]);
            }
            if (fake()->boolean(20)) {
                PastorIdentification::create([
                    'pastor_id' => $p->id,
                    'category' => 'BOT',
                    'sub_role' => fake()->randomElement(['member', 'chair', 'sec']),
                    'assigned_at' => fake()->dateTimeBetween('-3 months', 'now'),
                    'assigned_by_user_id' => $director->id,
                ]);
            }
        }

        $meetings = collect([
            ['M1', '2026-03-15', 'Westside Hall', 'done'],
            ['M2', '2026-03-29', 'Mwami', 'done'],
            ['M3', '2026-04-12', 'Kabwata', 'done'],
            ['M4', '2026-04-24', 'Bishop residence', 'upcoming'],
        ])->map(function ($row) use ($crusade) {
            return PledgeMeeting::create([
                'crusade_id' => $crusade->id,
                'sequence' => $row[0],
                'held_on' => $row[1],
                'venue' => $row[2],
                'status' => $row[3],
            ]);
        });

        // Attach attendances + pledges to first 3 meetings (done ones)
        foreach ($meetings->take(3) as $m) {
            $attendees = $pastors->random(min(20, $pastors->count()));
            $m->attendees()->attach($attendees->pluck('id'));
            foreach ($attendees as $p) {
                foreach (['choir', 'ushers', 'counsellors', 'money'] as $resource) {
                    if (fake()->boolean(50)) {
                        Pledge::create([
                            'pastor_id' => $p->id,
                            'pledge_meeting_id' => $m->id,
                            'resource' => $resource,
                            'quantity' => $resource === 'money' ? fake()->numberBetween(50, 2000) : fake()->numberBetween(1, 20),
                        ]);
                    }
                }
            }
        }

        // Activity entries — last week
        $powers = ['pastors', 'awareness', 'pledges', 'publicity', 'committees', 'budget', 'govt'];
        foreach (range(1, 14) as $n) {
            ActivityEntry::create([
                'crusade_id' => $crusade->id,
                'user_id' => $director->id,
                'occurred_at' => fake()->dateTimeBetween('-7 days', 'now'),
                'description' => fake()->sentence(8),
                'power' => $powers[array_rand($powers)],
                'status' => 'done',
            ]);
        }

        // A few open reminders
        foreach ([
            ['Submit Sunday weekly assessment', '+2 days'],
            ['Confirm bus contract for convoy 5–8', '+1 day'],
            ['Send mayor letter for ZNBC TV permit', 'now'],
        ] as [$text, $when]) {
            Reminder::create([
                'crusade_id' => $crusade->id,
                'user_id' => $director->id,
                'text' => $text,
                'due_on' => date('Y-m-d', strtotime($when)),
                'completed_at' => null,
            ]);
        }
    }
}
```

- [ ] **Step 4: Wire seeder into DatabaseSeeder**

Replace `database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(CrusadeSeeder::class);
    }
}
```

- [ ] **Step 5: Run test — must pass**

```bash
cd ~/Projects/hjc
php artisan test --filter=DatabaseSeederTest
```

Expected: 1 passed.

- [ ] **Step 6: Run full test suite to confirm nothing regressed**

```bash
cd ~/Projects/hjc
php artisan test
```

Expected: all tests pass.

- [ ] **Step 7: Apply seed to dev DB**

```bash
cd ~/Projects/hjc
php artisan migrate:fresh --seed
php artisan tinker --execute="echo App\Models\Pastor::count() . PHP_EOL;"
```

Expected: prints `30` (or more) pastors.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(seed): realistic Lusaka 2026 dataset for Phase 1"
```

---

## Final verification

- [ ] **Step 1: Full test run**

```bash
cd ~/Projects/hjc
php artisan test
```

Expected: all green.

- [ ] **Step 2: Manual smoke test**

```bash
cd ~/Projects/hjc
php artisan migrate:fresh --seed
php artisan serve --port=8000 &
sleep 2

# Login
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"director@hjc.test","password":"password"}' | jq -r '.token')
echo "Token: $TOKEN"

# Crusade context
curl -s http://127.0.0.1:8000/api/crusade -H "Authorization: Bearer $TOKEN" | jq

# Pastors list
curl -s http://127.0.0.1:8000/api/pastors -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# Pledges summary
curl -s http://127.0.0.1:8000/api/pledges/summary -H "Authorization: Bearer $TOKEN" | jq

# Activity today
curl -s "http://127.0.0.1:8000/api/activity-entries?date=$(date +%Y-%m-%d)" -H "Authorization: Bearer $TOKEN" | jq

kill %1
```

Expected: each call returns 200 with sensible data shapes.

- [ ] **Step 3: Commit any final tweaks**

```bash
cd ~/Projects/hjc
git status
git log --oneline
```

Expected: clean working tree, ~26 commits visible.

---

## Notes for future phases

- **Phase 2** introduces the Power table — promote `activity_entries.power` from string to FK, then expose `/powers` and add survey + worker rehearsal endpoints.
- **Phase 3** layers on Committees, Conference, Publicity, Stakeholders, Permits — each is a new resource with its own CRUD controller.
- **Phase 4** brings the Budget tables and the Mission Control rollup endpoint that aggregates across everything.
- All Phase 1 tables already carry `crusade_id`, so the eventual switch from "single crusade" to "current-crusade-from-token" is a controller-layer change only — schema is already multi-crusade-ready.
