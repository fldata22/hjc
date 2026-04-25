# HJC Mission Control — Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend support for Budget (DW.11), Weekly Assessment (DW.12), and Mission Control rollup (DW.1). 5 new tables + a non-breaking schema add to `crusades`.

**Architecture:** Same Laravel 13 + Sanctum scaffold. Continue on `main`. Backend-only. After this, all 13 hi-fi screens are backed.

**Conventions** (carried through prior phases):
- Controllers in `app/Http/Controllers/Api/`
- Inline `$request->validate(...)`
- Responses wrap data: `response()->json(['data' => ...])`
- Routes in `routes/api.php` inside the `auth:sanctum` group
- SUM aggregates use `number_format((float) $v, 2, '.', '')` for SQLite cast safety

**Spec:** `docs/superpowers/specs/2026-04-25-hjc-mission-control-phase-4-design.md`

---

## Task 1: Add context columns to `crusades` table

**Files:** `database/migrations/2026_04_25_130000_add_context_to_crusades_table.php`

- [ ] **Step 1: Generate migration**

```bash
cd ~/Projects/hjc
php artisan make:migration add_context_to_crusades_table
mv database/migrations/*_add_context_to_crusades_table.php database/migrations/2026_04_25_130000_add_context_to_crusades_table.php
```

- [ ] **Step 2: Migration body**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crusades', function (Blueprint $table) {
            $table->unsignedInteger('population')->nullable()->after('city');
            $table->unsignedInteger('pap')->nullable()->after('population');
            $table->unsignedInteger('convoy_target')->default(0)->after('awareness_target_pct');
            $table->unsignedInteger('makarios_target')->default(0)->after('convoy_target');
        });
    }

    public function down(): void
    {
        Schema::table('crusades', function (Blueprint $table) {
            $table->dropColumn(['population', 'pap', 'convoy_target', 'makarios_target']);
        });
    }
};
```

- [ ] **Step 3: Update Crusade model `$fillable`**

Edit `app/Models/Crusade.php` — add to `$fillable`:

```php
        'population', 'pap', 'convoy_target', 'makarios_target',
```

(Append these to the existing array.)

- [ ] **Step 4: Update CrusadeFactory to include defaults**

Edit `database/factories/CrusadeFactory.php` — add to the returned array:

```php
            'population' => 2200000,
            'pap' => 1800000,
            'convoy_target' => 24,
            'makarios_target' => 500,
```

- [ ] **Step 5: Test that the migration ran cleanly**

Add to `tests/Feature/CrusadeModelTest.php` (or create) a quick test:

```php
    public function test_factory_includes_context_fields(): void
    {
        $c = \App\Models\Crusade::factory()->create();
        $this->assertSame(2200000, $c->population);
        $this->assertSame(24, $c->convoy_target);
    }
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=CrusadeModelTest
git add -A && git commit -m "feat(data): add context columns to crusades for Mission Control"
```

---

## Task 2: BudgetCategory model + migration + factory + test

**Files:** `database/migrations/2026_04_25_130100_create_budget_categories_table.php`, model, factory, test.

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model BudgetCategory -mf
mv database/migrations/*_create_budget_categories_table.php database/migrations/2026_04_25_130100_create_budget_categories_table.php
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
        Schema::create('budget_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->decimal('allocated_amount', 12, 2)->default(0);
            $table->unsignedTinyInteger('order_index')->default(0);
            $table->timestamps();
            $table->index(['crusade_id', 'order_index']);
        });
    }
    public function down(): void { Schema::dropIfExists('budget_categories'); }
};
```

- [ ] **Step 3: Model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BudgetCategory extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'allocated_amount', 'order_index'];
    protected $casts = ['allocated_amount' => 'decimal:2'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function transactions(): HasMany { return $this->hasMany(BudgetTransaction::class); }
}
```

- [ ] **Step 4: Factory**

```php
<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetCategoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->randomElement(['Crusade ground', 'Publicity', 'Conference', 'Worker training']),
            'allocated_amount' => fake()->randomFloat(2, 1000, 20000),
            'order_index' => fake()->numberBetween(1, 8),
        ];
    }
}
```

- [ ] **Step 5: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetCategoryModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_category(): void
    {
        $c = BudgetCategory::factory()->create(['allocated_amount' => 18000]);
        $this->assertSame('18000.00', (string) $c->allocated_amount);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=BudgetCategoryModelTest
git add -A && git commit -m "feat(data): add BudgetCategory model + migration + factory"
```

---

## Task 3: BudgetCategoryController CRUD with computed `spent` per category

**Files:** `app/Http/Controllers/Api/BudgetCategoryController.php`, route changes, `tests/Feature/BudgetCategoryApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BudgetCategoryApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_categories_with_spent_and_pct(): void
    {
        $cat = BudgetCategory::factory()->create([
            'crusade_id' => $this->crusade->id,
            'name' => 'Publicity', 'allocated_amount' => 16000,
        ]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $this->crusade->id, 'budget_category_id' => $cat->id,
            'kind' => 'expense', 'amount' => 12400,
        ]);

        $r = $this->getJson('/api/budget-categories');
        $r->assertOk()->assertJsonCount(1, 'data');
        $row = $r->json('data.0');
        $this->assertSame('Publicity', $row['name']);
        $this->assertSame('12400.00', $row['spent']);
        $this->assertSame('77.50', $row['pct_spent']);
    }

    public function test_can_create_category(): void
    {
        $r = $this->postJson('/api/budget-categories', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Hospitality', 'allocated_amount' => 7000, 'order_index' => 6,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Hospitality');
    }

    public function test_can_update_and_delete(): void
    {
        $c = BudgetCategory::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/budget-categories/{$c->id}", ['allocated_amount' => 9000])
            ->assertOk()->assertJsonPath('data.allocated_amount', '9000.00');
        $this->deleteJson("/api/budget-categories/{$c->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $cats = BudgetCategory::orderBy('order_index')->orderBy('name')->get();
        $spent = BudgetTransaction::where('kind', 'expense')
            ->whereNotNull('budget_category_id')
            ->selectRaw('budget_category_id, SUM(amount) as total')
            ->groupBy('budget_category_id')
            ->pluck('total', 'budget_category_id');

        $data = $cats->map(function ($c) use ($spent) {
            $s = (float) ($spent[$c->id] ?? 0);
            $alloc = (float) $c->allocated_amount;
            return [
                'id' => $c->id,
                'crusade_id' => $c->crusade_id,
                'name' => $c->name,
                'allocated_amount' => number_format($alloc, 2, '.', ''),
                'spent' => number_format($s, 2, '.', ''),
                'pct_spent' => $alloc > 0 ? number_format($s / $alloc * 100, 2, '.', '') : '0.00',
                'order_index' => $c->order_index,
            ];
        });
        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:64',
            'allocated_amount' => 'required|numeric|min:0',
            'order_index' => 'nullable|integer|min:0|max:255',
        ]);
        return response()->json(['data' => BudgetCategory::create($v)], 201);
    }

    public function show(BudgetCategory $budgetCategory): JsonResponse { return response()->json(['data' => $budgetCategory]); }

    public function update(Request $request, BudgetCategory $budgetCategory): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:64',
            'allocated_amount' => 'sometimes|numeric|min:0',
            'order_index' => 'sometimes|integer|min:0|max:255',
        ]);
        $budgetCategory->update($v);
        return response()->json(['data' => $budgetCategory]);
    }

    public function destroy(BudgetCategory $budgetCategory): JsonResponse
    {
        $budgetCategory->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Route**

Inside `auth:sanctum` group:

```php
    Route::apiResource('budget-categories', \App\Http\Controllers\Api\BudgetCategoryController::class);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=BudgetCategoryApiTest
git add -A && git commit -m "feat(api): budget categories CRUD with spent + pct"
```

---

## Task 4: BudgetTransaction model + migration + factory + test

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model BudgetTransaction -mf
mv database/migrations/*_create_budget_transactions_table.php database/migrations/2026_04_25_130200_create_budget_transactions_table.php
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
        Schema::create('budget_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('budget_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description', 255);
            $table->date('occurred_on');
            $table->enum('kind', ['income', 'expense']);
            $table->decimal('amount', 12, 2);
            $table->timestamps();
            $table->index(['crusade_id', 'occurred_on']);
            $table->index(['crusade_id', 'kind']);
        });
    }
    public function down(): void { Schema::dropIfExists('budget_transactions'); }
};
```

- [ ] **Step 3: Model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetTransaction extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'budget_category_id', 'description', 'occurred_on', 'kind', 'amount'];
    protected $casts = ['occurred_on' => 'date', 'amount' => 'decimal:2'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function category(): BelongsTo { return $this->belongsTo(BudgetCategory::class, 'budget_category_id'); }
}
```

- [ ] **Step 4: Factory**

```php
<?php
namespace Database\Factories;

use App\Models\BudgetCategory;
use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetTransactionFactory extends Factory
{
    public function definition(): array
    {
        $kind = fake()->randomElement(['income', 'expense']);
        return [
            'crusade_id' => Crusade::factory(),
            'budget_category_id' => $kind === 'expense' ? BudgetCategory::factory() : null,
            'description' => fake()->sentence(4),
            'occurred_on' => fake()->dateTimeThisMonth()->format('Y-m-d'),
            'kind' => $kind,
            'amount' => fake()->randomFloat(2, 50, 5000),
        ];
    }
}
```

- [ ] **Step 5: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\BudgetTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetTransactionModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_transaction(): void
    {
        $t = BudgetTransaction::factory()->create(['kind' => 'expense', 'amount' => 1800]);
        $this->assertSame('expense', $t->kind);
        $this->assertSame('1800.00', (string) $t->amount);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=BudgetTransactionModelTest
git add -A && git commit -m "feat(data): add BudgetTransaction model + migration + factory"
```

---

## Task 5: BudgetTransactionController CRUD with filters

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BudgetTransactionApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_transactions_paginated(): void
    {
        BudgetTransaction::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/budget-transactions')->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']])
            ->assertJsonCount(3, 'data');
    }

    public function test_filters_by_kind(): void
    {
        BudgetTransaction::factory()->create(['crusade_id' => $this->crusade->id, 'kind' => 'income']);
        BudgetTransaction::factory()->create(['crusade_id' => $this->crusade->id, 'kind' => 'expense']);
        $this->getJson('/api/budget-transactions?kind=income')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_filters_by_category_and_date_range(): void
    {
        $cat = BudgetCategory::factory()->create(['crusade_id' => $this->crusade->id]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $this->crusade->id, 'budget_category_id' => $cat->id,
            'kind' => 'expense', 'occurred_on' => '2026-04-15',
        ]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $this->crusade->id, 'budget_category_id' => $cat->id,
            'kind' => 'expense', 'occurred_on' => '2026-03-01',
        ]);
        $this->getJson("/api/budget-transactions?category_id={$cat->id}&date_from=2026-04-01")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_income(): void
    {
        $r = $this->postJson('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'description' => 'Donation · Faith Trust', 'occurred_on' => '2026-04-12',
            'kind' => 'income', 'amount' => 5000,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.kind', 'income');
    }

    public function test_can_create_expense_with_category(): void
    {
        $cat = BudgetCategory::factory()->create(['crusade_id' => $this->crusade->id]);
        $r = $this->postJson('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'budget_category_id' => $cat->id,
            'description' => 'Phoenix FM · radio buy day 1', 'occurred_on' => '2026-04-15',
            'kind' => 'expense', 'amount' => 1800,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.budget_category_id', $cat->id);
    }

    public function test_validates_amount_positive(): void
    {
        $this->postJson('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'description' => 'X', 'occurred_on' => '2026-04-12',
            'kind' => 'income', 'amount' => -100,
        ])->assertStatus(422)->assertJsonValidationErrors(['amount']);
    }

    public function test_can_update_and_delete(): void
    {
        $t = BudgetTransaction::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/budget-transactions/{$t->id}", ['amount' => 999])
            ->assertOk()->assertJsonPath('data.amount', '999.00');
        $this->deleteJson("/api/budget-transactions/{$t->id}")->assertStatus(204);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = BudgetTransaction::query();
        if ($request->filled('kind')) $q->where('kind', $request->string('kind'));
        if ($request->filled('category_id')) $q->where('budget_category_id', $request->integer('category_id'));
        if ($request->filled('date_from')) $q->where('occurred_on', '>=', $request->date('date_from'));
        if ($request->filled('date_to')) $q->where('occurred_on', '<=', $request->date('date_to'));

        $paginator = $q->orderByDesc('occurred_on')->paginate(min((int) $request->integer('per_page', 25), 100));
        return response()->json([
            'data' => $paginator->items(),
            'meta' => ['current_page' => $paginator->currentPage(), 'total' => $paginator->total(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'budget_category_id' => 'nullable|exists:budget_categories,id',
            'description' => 'required|string|max:255',
            'occurred_on' => 'required|date',
            'kind' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0',
        ]);
        return response()->json(['data' => BudgetTransaction::create($v)], 201);
    }

    public function show(BudgetTransaction $budgetTransaction): JsonResponse { return response()->json(['data' => $budgetTransaction]); }

    public function update(Request $request, BudgetTransaction $budgetTransaction): JsonResponse
    {
        $v = $request->validate([
            'budget_category_id' => 'sometimes|nullable|exists:budget_categories,id',
            'description' => 'sometimes|string|max:255',
            'occurred_on' => 'sometimes|date',
            'kind' => 'sometimes|in:income,expense',
            'amount' => 'sometimes|numeric|min:0',
        ]);
        $budgetTransaction->update($v);
        return response()->json(['data' => $budgetTransaction]);
    }

    public function destroy(BudgetTransaction $budgetTransaction): JsonResponse
    {
        $budgetTransaction->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Route**

Inside `auth:sanctum` group:

```php
    Route::apiResource('budget-transactions', \App\Http\Controllers\Api\BudgetTransactionController::class);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=BudgetTransactionApiTest
git add -A && git commit -m "feat(api): budget transactions CRUD with filters + pagination"
```

---

## Task 6: GET /budget/summary endpoint

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BudgetSummaryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_returns_totals(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create(['budget_total' => 80000]);
        $cat = BudgetCategory::factory()->create(['crusade_id' => $crusade->id, 'allocated_amount' => 18000]);

        BudgetTransaction::factory()->create([
            'crusade_id' => $crusade->id, 'kind' => 'income', 'amount' => 62500, 'budget_category_id' => null,
        ]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $crusade->id, 'kind' => 'expense', 'amount' => 11200, 'budget_category_id' => $cat->id,
        ]);

        $r = $this->getJson('/api/budget/summary');
        $r->assertOk()
          ->assertJsonPath('data.total_budget', '80000.00')
          ->assertJsonPath('data.income', '62500.00')
          ->assertJsonPath('data.spent', '11200.00')
          ->assertJsonPath('data.gap_to_target', '17500.00');

        $cats = collect($r->json('data.categories'));
        $this->assertCount(1, $cats);
        $this->assertSame('11200.00', $cats[0]['spent']);
    }
}
```

- [ ] **Step 2: Controller**

Create `app/Http/Controllers/Api/BudgetSummaryController.php`:

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use Illuminate\Http\JsonResponse;

class BudgetSummaryController extends Controller
{
    public function show(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();
        $income = (float) BudgetTransaction::where('crusade_id', $crusade->id)->where('kind', 'income')->sum('amount');
        $spent = (float) BudgetTransaction::where('crusade_id', $crusade->id)->where('kind', 'expense')->sum('amount');
        $total = (float) $crusade->budget_total;
        $gap = max(0, $total - $income);

        // Category breakdown — same logic as BudgetCategoryController::index
        $cats = BudgetCategory::where('crusade_id', $crusade->id)->orderBy('order_index')->get();
        $spentByCat = BudgetTransaction::where('crusade_id', $crusade->id)
            ->where('kind', 'expense')
            ->whereNotNull('budget_category_id')
            ->selectRaw('budget_category_id, SUM(amount) as total')
            ->groupBy('budget_category_id')
            ->pluck('total', 'budget_category_id');

        $categories = $cats->map(function ($c) use ($spentByCat) {
            $s = (float) ($spentByCat[$c->id] ?? 0);
            $alloc = (float) $c->allocated_amount;
            return [
                'id' => $c->id, 'name' => $c->name,
                'allocated_amount' => number_format($alloc, 2, '.', ''),
                'spent' => number_format($s, 2, '.', ''),
                'pct_spent' => $alloc > 0 ? number_format($s / $alloc * 100, 2, '.', '') : '0.00',
            ];
        });

        return response()->json(['data' => [
            'total_budget' => number_format($total, 2, '.', ''),
            'income' => number_format($income, 2, '.', ''),
            'spent' => number_format($spent, 2, '.', ''),
            'committed' => number_format($spent, 2, '.', ''), // signed contracts not modelled separately yet — same as spent for now
            'gap_to_target' => number_format($gap, 2, '.', ''),
            'pct_spent_of_total' => $total > 0 ? number_format($spent / $total * 100, 2, '.', '') : '0.00',
            'categories' => $categories,
        ]]);
    }
}
```

- [ ] **Step 3: Route**

Inside `auth:sanctum` group:

```php
    Route::get('/budget/summary', [\App\Http\Controllers\Api\BudgetSummaryController::class, 'show']);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=BudgetSummaryApiTest
git add -A && git commit -m "feat(api): GET /budget/summary aggregate"
```

---

## Task 7: WeeklyAssessment + WeeklyAssessmentReading + WeeklyAssessmentRisk models

**Files:** 3 migrations, 3 models, 3 factories, 1 combined test file.

- [ ] **Step 1: Generate**

```bash
cd ~/Projects/hjc
php artisan make:model WeeklyAssessment -mf
mv database/migrations/*_create_weekly_assessments_table.php database/migrations/2026_04_25_130300_create_weekly_assessments_table.php
php artisan make:model WeeklyAssessmentReading -mf
mv database/migrations/*_create_weekly_assessment_readings_table.php database/migrations/2026_04_25_130400_create_weekly_assessment_readings_table.php
php artisan make:model WeeklyAssessmentRisk -mf
mv database/migrations/*_create_weekly_assessment_risks_table.php database/migrations/2026_04_25_130500_create_weekly_assessment_risks_table.php
```

- [ ] **Step 2: Migrations**

`weekly_assessments`:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('weekly_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('week_number');
            $table->timestamp('prompted_at');
            $table->unsignedTinyInteger('self_score')->nullable();
            $table->text('notes')->nullable();
            $table->text('decisions_needed')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->unique(['crusade_id', 'week_number']);
        });
    }
    public function down(): void { Schema::dropIfExists('weekly_assessments'); }
};
```

`weekly_assessment_readings`:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('weekly_assessment_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('weekly_assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('power_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('value_pct');
            $table->timestamps();
            $table->unique(['weekly_assessment_id', 'power_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('weekly_assessment_readings'); }
};
```

`weekly_assessment_risks`:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('weekly_assessment_risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('weekly_assessment_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('ordering');
            $table->enum('severity', ['critical', 'high', 'medium']);
            $table->string('text', 255);
            $table->timestamps();
            $table->index(['weekly_assessment_id', 'ordering']);
        });
    }
    public function down(): void { Schema::dropIfExists('weekly_assessment_risks'); }
};
```

- [ ] **Step 3: Models**

`WeeklyAssessment`:

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeeklyAssessment extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'week_number', 'prompted_at', 'self_score', 'notes', 'decisions_needed', 'submitted_at'];
    protected $casts = ['prompted_at' => 'datetime', 'submitted_at' => 'datetime'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function readings(): HasMany { return $this->hasMany(WeeklyAssessmentReading::class); }
    public function risks(): HasMany { return $this->hasMany(WeeklyAssessmentRisk::class)->orderBy('ordering'); }
}
```

`WeeklyAssessmentReading`:

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyAssessmentReading extends Model
{
    use HasFactory;
    protected $fillable = ['weekly_assessment_id', 'power_id', 'value_pct'];
    public function assessment(): BelongsTo { return $this->belongsTo(WeeklyAssessment::class, 'weekly_assessment_id'); }
    public function power(): BelongsTo { return $this->belongsTo(Power::class); }
}
```

`WeeklyAssessmentRisk`:

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyAssessmentRisk extends Model
{
    use HasFactory;
    protected $fillable = ['weekly_assessment_id', 'ordering', 'severity', 'text'];
    public function assessment(): BelongsTo { return $this->belongsTo(WeeklyAssessment::class, 'weekly_assessment_id'); }
}
```

- [ ] **Step 4: Factories**

`WeeklyAssessmentFactory`:

```php
<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class WeeklyAssessmentFactory extends Factory
{
    public function definition(): array
    {
        static $week = 0;
        $week++;
        return [
            'crusade_id' => Crusade::factory(),
            'week_number' => $week,
            'prompted_at' => fake()->dateTimeThisYear(),
            'self_score' => fake()->numberBetween(1, 10),
            'notes' => fake()->paragraph(),
            'decisions_needed' => fake()->paragraph(),
            'submitted_at' => null,
        ];
    }
}
```

`WeeklyAssessmentReadingFactory`:

```php
<?php
namespace Database\Factories;

use App\Models\Power;
use App\Models\WeeklyAssessment;
use Illuminate\Database\Eloquent\Factories\Factory;

class WeeklyAssessmentReadingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'weekly_assessment_id' => WeeklyAssessment::factory(),
            'power_id' => Power::inRandomOrder()->first()?->id ?? Power::factory(),
            'value_pct' => fake()->numberBetween(0, 100),
        ];
    }
}
```

`WeeklyAssessmentRiskFactory`:

```php
<?php
namespace Database\Factories;

use App\Models\WeeklyAssessment;
use Illuminate\Database\Eloquent\Factories\Factory;

class WeeklyAssessmentRiskFactory extends Factory
{
    public function definition(): array
    {
        return [
            'weekly_assessment_id' => WeeklyAssessment::factory(),
            'ordering' => fake()->numberBetween(1, 3),
            'severity' => fake()->randomElement(['critical', 'high', 'medium']),
            'text' => fake()->sentence(),
        ];
    }
}
```

- [ ] **Step 5: Combined test**

```php
<?php
namespace Tests\Feature;

use App\Models\Power;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WeeklyAssessmentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_assessment_with_readings_and_risks(): void
    {
        $a = WeeklyAssessment::factory()->create();
        $power = Power::where('code', 'awareness')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $power->id, 'value_pct' => 21]);
        WeeklyAssessmentRisk::factory()->create(['weekly_assessment_id' => $a->id, 'ordering' => 1, 'severity' => 'critical']);
        WeeklyAssessmentRisk::factory()->create(['weekly_assessment_id' => $a->id, 'ordering' => 2, 'severity' => 'high']);

        $a = $a->fresh();
        $this->assertCount(1, $a->readings);
        $this->assertCount(2, $a->risks);
        $this->assertSame(1, $a->risks[0]->ordering);
    }

    public function test_unique_reading_per_power_per_assessment(): void
    {
        $a = WeeklyAssessment::factory()->create();
        $p = Power::where('code', 'pastors')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $p->id, 'value_pct' => 50]);
        $this->expectException(\Illuminate\Database\QueryException::class);
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $p->id, 'value_pct' => 60]);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=WeeklyAssessmentModelTest
git add -A && git commit -m "feat(data): add WeeklyAssessment + Reading + Risk models"
```

---

## Task 8: WeeklyAssessmentController CRUD + submit + latest + bulk-replace

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Power;
use App\Models\User;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WeeklyAssessmentApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_assessments_most_recent_first(): void
    {
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 1]);
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 2]);
        $r = $this->getJson('/api/weekly-assessments');
        $r->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame(2, $r->json('data.0.week_number'));
    }

    public function test_can_create_assessment(): void
    {
        $r = $this->postJson('/api/weekly-assessments', [
            'crusade_id' => $this->crusade->id,
            'week_number' => 8,
            'prompted_at' => '2026-04-19 21:00:00',
            'self_score' => 6,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.week_number', 8);
    }

    public function test_create_rejects_duplicate_week(): void
    {
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 8]);
        $this->postJson('/api/weekly-assessments', [
            'crusade_id' => $this->crusade->id, 'week_number' => 8,
            'prompted_at' => '2026-04-19 21:00:00',
        ])->assertStatus(422)->assertJsonValidationErrors(['week_number']);
    }

    public function test_show_includes_readings_and_risks(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id]);
        $power = Power::where('code', 'pastors')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $power->id, 'value_pct' => 78]);
        WeeklyAssessmentRisk::factory()->create(['weekly_assessment_id' => $a->id, 'ordering' => 1, 'severity' => 'critical', 'text' => 'Awareness still red']);

        $r = $this->getJson("/api/weekly-assessments/{$a->id}");
        $r->assertOk()
          ->assertJsonStructure(['data' => ['id', 'readings', 'risks']]);
        $this->assertCount(1, $r->json('data.readings'));
        $this->assertCount(1, $r->json('data.risks'));
    }

    public function test_can_submit_assessment(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'submitted_at' => null]);
        $r = $this->postJson("/api/weekly-assessments/{$a->id}/submit");
        $r->assertOk();
        $this->assertNotNull($a->fresh()->submitted_at);
    }

    public function test_latest_returns_most_recent_with_data(): void
    {
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 1]);
        $latest = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 2]);
        $power = Power::where('code', 'pastors')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $latest->id, 'power_id' => $power->id, 'value_pct' => 78]);

        $r = $this->getJson('/api/weekly-assessments/latest');
        $r->assertOk()->assertJsonPath('data.week_number', 2);
        $this->assertCount(1, $r->json('data.readings'));
    }

    public function test_bulk_replace_readings(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id]);
        $p1 = Power::where('code', 'pastors')->first();
        $p2 = Power::where('code', 'awareness')->first();
        // Pre-existing reading
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $p1->id, 'value_pct' => 50]);

        $r = $this->putJson("/api/weekly-assessments/{$a->id}/readings", [
            'readings' => [
                ['power_id' => $p1->id, 'value_pct' => 78],
                ['power_id' => $p2->id, 'value_pct' => 21],
            ],
        ]);
        $r->assertOk();
        $this->assertCount(2, $a->fresh()->readings);
        $this->assertSame(78, $a->fresh()->readings()->where('power_id', $p1->id)->value('value_pct'));
    }

    public function test_bulk_replace_risks(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id]);
        $r = $this->putJson("/api/weekly-assessments/{$a->id}/risks", [
            'risks' => [
                ['ordering' => 1, 'severity' => 'critical', 'text' => 'Awareness red'],
                ['ordering' => 2, 'severity' => 'critical', 'text' => 'Worker rehearsals stuck'],
                ['ordering' => 3, 'severity' => 'high', 'text' => 'Crusade permit pending'],
            ],
        ]);
        $r->assertOk();
        $this->assertCount(3, $a->fresh()->risks);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WeeklyAssessmentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => WeeklyAssessment::orderByDesc('week_number')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'week_number' => [
                'required', 'integer', 'min:1',
                Rule::unique('weekly_assessments')->where(fn ($q) => $q->where('crusade_id', $request->crusade_id)),
            ],
            'prompted_at' => 'required|date',
            'self_score' => 'nullable|integer|min:1|max:10',
            'notes' => 'nullable|string',
            'decisions_needed' => 'nullable|string',
        ]);
        return response()->json(['data' => WeeklyAssessment::create($v)], 201);
    }

    public function show(WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $weeklyAssessment->load(['readings.power:id,code,name', 'risks']);
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function update(Request $request, WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $v = $request->validate([
            'self_score' => 'sometimes|nullable|integer|min:1|max:10',
            'notes' => 'sometimes|nullable|string',
            'decisions_needed' => 'sometimes|nullable|string',
        ]);
        $weeklyAssessment->update($v);
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function destroy(WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $weeklyAssessment->delete();
        return response()->json(null, 204);
    }

    public function submit(WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $weeklyAssessment->update(['submitted_at' => now()]);
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function latest(): JsonResponse
    {
        $a = WeeklyAssessment::with(['readings.power:id,code,name', 'risks'])
            ->orderByDesc('week_number')
            ->first();
        if (! $a) abort(404);
        return response()->json(['data' => $a]);
    }

    public function replaceReadings(Request $request, WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $v = $request->validate([
            'readings' => 'required|array',
            'readings.*.power_id' => 'required|integer|exists:powers,id',
            'readings.*.value_pct' => 'required|integer|min:0|max:100',
        ]);
        DB::transaction(function () use ($weeklyAssessment, $v) {
            $weeklyAssessment->readings()->delete();
            foreach ($v['readings'] as $row) {
                WeeklyAssessmentReading::create([
                    'weekly_assessment_id' => $weeklyAssessment->id,
                    'power_id' => $row['power_id'],
                    'value_pct' => $row['value_pct'],
                ]);
            }
        });
        $weeklyAssessment->load('readings.power:id,code,name');
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function replaceRisks(Request $request, WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $v = $request->validate([
            'risks' => 'required|array',
            'risks.*.ordering' => 'required|integer|min:1',
            'risks.*.severity' => 'required|in:critical,high,medium',
            'risks.*.text' => 'required|string|max:255',
        ]);
        DB::transaction(function () use ($weeklyAssessment, $v) {
            $weeklyAssessment->risks()->delete();
            foreach ($v['risks'] as $row) {
                WeeklyAssessmentRisk::create([
                    'weekly_assessment_id' => $weeklyAssessment->id,
                    'ordering' => $row['ordering'],
                    'severity' => $row['severity'],
                    'text' => $row['text'],
                ]);
            }
        });
        $weeklyAssessment->load('risks');
        return response()->json(['data' => $weeklyAssessment]);
    }
}
```

- [ ] **Step 3: Routes**

Inside `auth:sanctum` group (latest BEFORE the `{weeklyAssessment}` literal routes so it resolves first):

```php
    Route::get('/weekly-assessments', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'index']);
    Route::post('/weekly-assessments', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'store']);
    Route::get('/weekly-assessments/latest', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'latest']);
    Route::get('/weekly-assessments/{weeklyAssessment}', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'show']);
    Route::patch('/weekly-assessments/{weeklyAssessment}', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'update']);
    Route::delete('/weekly-assessments/{weeklyAssessment}', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'destroy']);
    Route::post('/weekly-assessments/{weeklyAssessment}/submit', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'submit']);
    Route::put('/weekly-assessments/{weeklyAssessment}/readings', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'replaceReadings']);
    Route::put('/weekly-assessments/{weeklyAssessment}/risks', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'replaceRisks']);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=WeeklyAssessmentApiTest
git add -A && git commit -m "feat(api): weekly assessments with bulk-replace readings + risks"
```

---

## Task 9: MissionControlController — the big rollup

**Files:** `app/Http/Controllers/Api/MissionControlController.php`, route, `tests/Feature/MissionControlApiTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\BudgetTransaction;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\Crusade;
use App\Models\Pastor;
use App\Models\Permit;
use App\Models\Power;
use App\Models\User;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MissionControlApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_full_rollup(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create([
            'budget_total' => 80000, 'pastors_target' => 1088,
            'opens_at' => now()->addDays(7)->toDateString(),
            'population' => 2200000, 'pap' => 1800000,
        ]);

        // Some pastors
        Pastor::factory()->count(5)->create(['crusade_id' => $crusade->id, 'pipeline_stage' => 'active']);
        Pastor::factory()->count(3)->create(['crusade_id' => $crusade->id, 'pipeline_stage' => 'champion']);

        // Awareness surveys
        $z = Zone::factory()->create(['crusade_id' => $crusade->id]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $crusade->id, 'zone_id' => $z->id,
            'survey_number' => 6, 'surveyed_count' => 100, 'attending_yes_count' => 21,
        ]);

        // Budget — $43.8k spent
        BudgetTransaction::factory()->create([
            'crusade_id' => $crusade->id, 'kind' => 'expense', 'amount' => 43800, 'budget_category_id' => null,
        ]);

        // Conference + registrations
        $conf = Conference::factory()->create(['crusade_id' => $crusade->id, 'capacity' => 820]);
        ConferenceRegistration::factory()->count(3)->create(['conference_id' => $conf->id]);

        // Permits
        Permit::factory()->count(2)->create(['crusade_id' => $crusade->id, 'status' => 'approved']);
        Permit::factory()->create(['crusade_id' => $crusade->id, 'status' => 'in_review']);

        // Latest weekly assessment with readings + risks
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $crusade->id, 'week_number' => 8]);
        WeeklyAssessmentReading::factory()->create([
            'weekly_assessment_id' => $a->id,
            'power_id' => Power::where('code', 'pastors')->first()->id,
            'value_pct' => 78,
        ]);
        WeeklyAssessmentReading::factory()->create([
            'weekly_assessment_id' => $a->id,
            'power_id' => Power::where('code', 'awareness')->first()->id,
            'value_pct' => 21,
        ]);
        WeeklyAssessmentRisk::factory()->create([
            'weekly_assessment_id' => $a->id, 'ordering' => 1, 'severity' => 'critical',
            'text' => 'Worker groups at 2%',
        ]);

        $r = $this->getJson('/api/mission-control');
        $r->assertOk();

        // Top stats
        $this->assertSame(7, $r->json('data.top_stats.days_to_go'));
        $this->assertSame('43800.00', $r->json('data.top_stats.financial.spent'));
        $this->assertSame('80000.00', $r->json('data.top_stats.financial.total'));
        $this->assertSame('54.75', $r->json('data.top_stats.financial.pct'));
        $this->assertSame(8, $r->json('data.top_stats.pastors_won.n'));   // 5 active + 3 champion
        $this->assertSame(1088, $r->json('data.top_stats.pastors_won.target'));
        $this->assertSame('21.00', $r->json('data.top_stats.awareness_pct'));

        // Powers — 14 entries (one per Power), with values from latest assessment readings
        $powers = collect($r->json('data.powers'));
        $this->assertCount(14, $powers);
        $pastorsRow = $powers->firstWhere('code', 'pastors');
        $this->assertSame(78, $pastorsRow['value_pct']);
        $this->assertSame('success', $pastorsRow['status']);
        $awarenessRow = $powers->firstWhere('code', 'awareness');
        $this->assertSame(21, $awarenessRow['value_pct']);
        $this->assertSame('danger', $awarenessRow['status']);

        // Context
        $this->assertSame(2200000, $r->json('data.context.population'));
        $this->assertSame(1, $r->json('data.context.zones_count'));
        $this->assertSame(3, $r->json('data.context.conference_registered'));
        $this->assertSame(820, $r->json('data.context.conference_capacity'));
        $this->assertSame(2, $r->json('data.context.permits_approved'));
        $this->assertSame(3, $r->json('data.context.permits_total'));

        // Risks
        $this->assertCount(1, $r->json('data.top_risks'));
        $this->assertSame('critical', $r->json('data.top_risks.0.severity'));
    }

    public function test_handles_missing_assessment_gracefully(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Crusade::factory()->create();

        $r = $this->getJson('/api/mission-control');
        $r->assertOk();
        // Powers should still return 14 entries with value_pct = null
        $this->assertCount(14, $r->json('data.powers'));
        $first = $r->json('data.powers.0');
        $this->assertNull($first['value_pct']);
        $this->assertSame('muted', $first['status']);
    }
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AwarenessSurvey;
use App\Models\BudgetTransaction;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\Crusade;
use App\Models\Pastor;
use App\Models\Permit;
use App\Models\Power;
use App\Models\WeeklyAssessment;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;

class MissionControlController extends Controller
{
    public function show(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();

        // ==== Top stats ====
        $daysToGo = max(0, now()->startOfDay()->diffInDays($crusade->opens_at, false));

        $spent = (float) BudgetTransaction::where('crusade_id', $crusade->id)->where('kind', 'expense')->sum('amount');
        $total = (float) $crusade->budget_total;
        $financialPct = $total > 0 ? number_format($spent / $total * 100, 2, '.', '') : '0.00';

        $pastorsWon = Pastor::where('crusade_id', $crusade->id)
            ->whereIn('pipeline_stage', ['active', 'champion'])->count();

        $awarenessLatest = AwarenessSurvey::where('crusade_id', $crusade->id)
            ->orderByDesc('survey_number')->first();
        if ($awarenessLatest) {
            $maxSurvey = $awarenessLatest->survey_number;
            $agg = AwarenessSurvey::where('crusade_id', $crusade->id)
                ->where('survey_number', $maxSurvey)
                ->selectRaw('SUM(surveyed_count) as s, SUM(attending_yes_count) as a')->first();
            $awarenessPct = $agg && $agg->s > 0
                ? number_format($agg->a / $agg->s * 100, 2, '.', '')
                : '0.00';
        } else {
            $awarenessPct = '0.00';
        }

        // ==== Powers ====
        $latestAssessment = WeeklyAssessment::with('readings')
            ->where('crusade_id', $crusade->id)
            ->orderByDesc('week_number')->first();
        $readingsByPower = collect();
        if ($latestAssessment) {
            $readingsByPower = $latestAssessment->readings->keyBy('power_id');
        }

        $powers = Power::orderBy('order_index')->get()->map(function ($p) use ($readingsByPower) {
            $reading = $readingsByPower->get($p->id);
            $value = $reading?->value_pct;
            $status = match (true) {
                $value === null => 'muted',
                $value >= 60 => 'success',
                $value >= 30 => 'warning',
                default => 'danger',
            };
            return ['code' => $p->code, 'name' => $p->name, 'order_index' => $p->order_index, 'value_pct' => $value, 'status' => $status];
        });

        // ==== Context ====
        $zonesCount = Zone::where('crusade_id', $crusade->id)->count();
        $conf = Conference::where('crusade_id', $crusade->id)->first();
        $confRegistered = $conf ? ConferenceRegistration::where('conference_id', $conf->id)->count() : 0;
        $confCapacity = $conf?->capacity ?? 0;
        $permitsApproved = Permit::where('crusade_id', $crusade->id)->where('status', 'approved')->count();
        $permitsTotal = Permit::where('crusade_id', $crusade->id)->count();

        // ==== Risks ====
        $risks = [];
        if ($latestAssessment) {
            $risks = $latestAssessment->risks()->orderBy('ordering')->get()->map(fn ($r) => [
                'ordering' => $r->ordering, 'severity' => $r->severity, 'text' => $r->text,
            ])->toArray();
        }

        return response()->json(['data' => [
            'top_stats' => [
                'days_to_go' => (int) $daysToGo,
                'financial' => [
                    'spent' => number_format($spent, 2, '.', ''),
                    'total' => number_format($total, 2, '.', ''),
                    'pct' => $financialPct,
                ],
                'pastors_won' => [
                    'n' => $pastorsWon,
                    'target' => (int) $crusade->pastors_target,
                    'pct' => $crusade->pastors_target > 0
                        ? number_format($pastorsWon / $crusade->pastors_target * 100, 2, '.', '')
                        : '0.00',
                ],
                'awareness_pct' => $awarenessPct,
            ],
            'powers' => $powers,
            'context' => [
                'population' => $crusade->population,
                'pap' => $crusade->pap,
                'zones_count' => $zonesCount,
                'conference_registered' => $confRegistered,
                'conference_capacity' => $confCapacity,
                'convoy_actual' => 0,                                // future work
                'convoy_target' => (int) ($crusade->convoy_target ?? 0),
                'makarios_actual' => 0,                              // future work
                'makarios_target' => (int) ($crusade->makarios_target ?? 0),
                'permits_approved' => $permitsApproved,
                'permits_total' => $permitsTotal,
            ],
            'top_risks' => $risks,
            'crusade' => [
                'id' => $crusade->id,
                'name' => $crusade->name,
                'city' => $crusade->city,
                'opens_at' => $crusade->opens_at->toDateString(),
                'closes_at' => $crusade->closes_at->toDateString(),
            ],
        ]]);
    }
}
```

- [ ] **Step 3: Route**

Inside `auth:sanctum` group:

```php
    Route::get('/mission-control', [\App\Http\Controllers\Api\MissionControlController::class, 'show']);
```

- [ ] **Step 4: Run + commit**

```bash
cd ~/Projects/hjc
php artisan test --filter=MissionControlApiTest
git add -A && git commit -m "feat(api): GET /mission-control rollup endpoint"
```

---

## Task 10: Extend CrusadeSeeder + final smoke test

**Files:** `database/seeders/CrusadeSeeder.php`, `tests/Feature/DatabaseSeederTest.php`

- [ ] **Step 1: Extend DatabaseSeederTest**

Append to `test_seeder_populates_realistic_data`:

```php
        $this->assertGreaterThanOrEqual(8, \DB::table('budget_categories')->count());
        $this->assertGreaterThanOrEqual(15, \DB::table('budget_transactions')->count());
        $this->assertGreaterThanOrEqual(8, \DB::table('weekly_assessments')->count());
        $this->assertGreaterThanOrEqual(14, \DB::table('weekly_assessment_readings')->count());
        $this->assertGreaterThanOrEqual(3, \DB::table('weekly_assessment_risks')->count());
```

Also update the existing crusade assertion to include the new context columns. Find:

```php
        $this->assertDatabaseCount('crusades', 1);
```

and replace with:

```php
        $this->assertDatabaseCount('crusades', 1);
        $crusade = \DB::table('crusades')->first();
        $this->assertSame(2200000, (int) $crusade->population);
        $this->assertSame(24, (int) $crusade->convoy_target);
```

- [ ] **Step 2: Update CrusadeSeeder — set context columns on the Crusade**

In `database/seeders/CrusadeSeeder.php`, find the `Crusade::create([...])` call and add to it:

```php
            'population' => 2200000,
            'pap' => 1800000,
            'convoy_target' => 24,
            'makarios_target' => 500,
```

- [ ] **Step 3: Add Phase 4 seed blocks**

Add at the bottom of `CrusadeSeeder::run()`, before the closing brace. Add imports first:

```php
use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
```

Then in `run()`:

```php
        // Budget categories — 8 categories matching DW.11
        $cats = collect();
        foreach ([
            ['Crusade ground & sound', 18000, 1],
            ['Publicity (radio · print · OOH)', 16000, 2],
            ['Conference (venue · meals · materials)', 14000, 3],
            ['Worker training (rehearsals · transport)', 8000, 4],
            ['Convoy & logistics (24 buses target)', 9000, 5],
            ['Hospitality & accommodation', 7000, 6],
            ['Counselling & follow-up', 5000, 7],
            ['Contingency · 5%', 3000, 8],
        ] as [$name, $alloc, $idx]) {
            $cats->push(BudgetCategory::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'allocated_amount' => $alloc, 'order_index' => $idx,
            ]));
        }

        // Income transactions
        foreach ([
            ['Donation · BoT pool', '2026-04-08', 12000],
            ['Donation · Faith Trust', '2026-04-12', 5000],
            ['Donation · monthly partners', '2026-04-01', 8000],
            ['Donation · Bishop Banda', '2026-03-25', 3500],
            ['Donation · large gift', '2026-03-15', 25000],
            ['Donation · pastors pool', '2026-04-18', 9000],
        ] as [$desc, $on, $amt]) {
            BudgetTransaction::create([
                'crusade_id' => $crusade->id, 'budget_category_id' => null,
                'description' => $desc, 'occurred_on' => $on,
                'kind' => 'income', 'amount' => $amt,
            ]);
        }

        // Expense transactions — distributed across categories
        $cgs = $cats->firstWhere('name', 'Crusade ground & sound');
        $pub = $cats->firstWhere('name', 'Publicity (radio · print · OOH)');
        $confCat = $cats->firstWhere('name', 'Conference (venue · meals · materials)');
        $wt = $cats->firstWhere('name', 'Worker training (rehearsals · transport)');
        $logi = $cats->firstWhere('name', 'Convoy & logistics (24 buses target)');
        $hosp = $cats->firstWhere('name', 'Hospitality & accommodation');
        $couns = $cats->firstWhere('name', 'Counselling & follow-up');
        foreach ([
            ['Phoenix FM · radio buy day 1', '2026-04-15', $pub->id, 1800],
            ['Hot FM · radio buy', '2026-04-15', $pub->id, 1200],
            ['Posters · 4,200 print', '2026-04-11', $pub->id, 980],
            ['Bus stops · OOH install', '2026-04-10', $pub->id, 980],
            ['SMS broadcast prep', '2026-04-12', $pub->id, 280],
            ['ZNBC TV deposit', '2026-04-14', $pub->id, 7180],
            ['Conference deposit · venue', '2026-04-12', $confCat->id, 2500],
            ['Conference catering · day 1', '2026-04-20', $confCat->id, 4200],
            ['Conference handouts print', '2026-04-08', $confCat->id, 3100],
            ['Stage hire', '2026-04-05', $cgs->id, 6500],
            ['Sound system rental', '2026-04-08', $cgs->id, 4700],
            ['Lighting', '2026-04-10', $cgs->id, 0],
            ['Rehearsal hall rent · M3', '2026-04-10', $wt->id, 450],
            ['Rehearsal hall rent · M4', '2026-04-17', $wt->id, 450],
            ['Worker training catering', '2026-04-12', $wt->id, 4500],
            ['Bus deposits (4 vehicles)', '2026-04-15', $logi->id, 2200],
            ['Bishop residence catering', '2026-04-18', $hosp->id, 1900],
            ['Counselling booth setup', '2026-04-05', $couns->id, 800],
        ] as [$desc, $on, $catId, $amt]) {
            if ($amt <= 0) continue;
            BudgetTransaction::create([
                'crusade_id' => $crusade->id, 'budget_category_id' => $catId,
                'description' => $desc, 'occurred_on' => $on,
                'kind' => 'expense', 'amount' => $amt,
            ]);
        }

        // Weekly assessments — 8 weeks. Latest (week 8) carries the DW.1/DW.12 hi-fi readings.
        $hifiReadings = [
            'pastors' => 78, 'awareness' => 21, 'volunteers' => 2, 'equipment' => 64,
            'decisions' => null, 'discipleship' => null, 'donors' => 71, 'drama' => 55,
            'events' => 38, 'pledges' => 0, 'committees' => 50, 'publicity' => 30,
            'budget' => 55, 'govt' => 70,
        ];
        $allPowers = \App\Models\Power::all()->keyBy('code');
        for ($w = 1; $w <= 8; $w++) {
            $a = WeeklyAssessment::create([
                'crusade_id' => $crusade->id,
                'week_number' => $w,
                'prompted_at' => now()->subWeeks(8 - $w)->startOfWeek()->setHour(21),
                'self_score' => $w === 8 ? 6 : fake()->numberBetween(4, 8),
                'notes' => $w === 8 ? "Awareness still red. Volunteers stuck. But pastors and donors strong. PCM #4 next week should move volunteers." : fake()->paragraph(),
                'decisions_needed' => $w === 8 ? "Approve \$4k extra for two more radio stations. Approve hiring 2 zonal coordinators on stipend." : null,
                'submitted_at' => $w < 8 ? now()->subWeeks(8 - $w)->startOfWeek()->setHour(22) : null,
            ]);

            // Readings — week 8 uses the hi-fi values; earlier weeks ramp up
            foreach ($hifiReadings as $code => $latestPct) {
                if ($latestPct === null) continue;
                $power = $allPowers->get($code);
                if (! $power) continue;
                // Earlier weeks: ramp from a lower start to the latest value (linear)
                $weekFactor = $w / 8;
                $value = (int) max(0, min(100, round($latestPct * $weekFactor)));
                WeeklyAssessmentReading::create([
                    'weekly_assessment_id' => $a->id,
                    'power_id' => $power->id,
                    'value_pct' => $value,
                ]);
            }

            // Risks — only the latest assessment gets the 3 hi-fi risks
            if ($w === 8) {
                foreach ([
                    [1, 'critical', 'Awareness still red after radio launch'],
                    [2, 'critical', 'Worker rehearsals not scaling beyond 11 zones'],
                    [3, 'high', 'Crusade permit still pending — escalate to Bishop'],
                ] as [$ord, $sev, $text]) {
                    WeeklyAssessmentRisk::create([
                        'weekly_assessment_id' => $a->id,
                        'ordering' => $ord, 'severity' => $sev, 'text' => $text,
                    ]);
                }
            }
        }
```

- [ ] **Step 4: Run tests + apply seed**

```bash
cd ~/Projects/hjc
php artisan test --filter=DatabaseSeederTest
php artisan test
php artisan migrate:fresh --seed
```

Expected: all tests green; seeder runs without errors.

- [ ] **Step 5: Smoke test all key endpoints**

```bash
cd ~/Projects/hjc
php artisan serve --port=8001 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2
TOKEN=$(curl -s -X POST http://127.0.0.1:8001/api/login -H 'Content-Type: application/json' \
  -d '{"email":"director@hjc.test","password":"password"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "=== /api/budget/summary ==="
curl -s http://127.0.0.1:8001/api/budget/summary -H "Authorization: Bearer $TOKEN"
echo
echo "=== /api/budget-transactions?kind=income ==="
curl -s "http://127.0.0.1:8001/api/budget-transactions?kind=income" -H "Authorization: Bearer $TOKEN" | head -c 400
echo
echo "=== /api/weekly-assessments/latest ==="
curl -s http://127.0.0.1:8001/api/weekly-assessments/latest -H "Authorization: Bearer $TOKEN" | head -c 800
echo
echo "=== /api/mission-control ==="
curl -s http://127.0.0.1:8001/api/mission-control -H "Authorization: Bearer $TOKEN"
echo

kill $SERVER_PID 2>/dev/null || pkill -f "artisan serve --port=8001" 2>/dev/null || true
```

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(seed): Phase 4 budget + weekly assessments seed data"
```

---

## Final verification

- [ ] **Step 1: Full test run**

```bash
cd ~/Projects/hjc
php artisan test
```

Expected: ~140-150 tests, all green.

- [ ] **Step 2: Confirm Mission Control returns sensible Lusaka 2026 data**

The smoke test above already covers this. The `mission-control` response should show 7 days to go, ~$43.8k spent, ~8 pastors won (depends on factory seed), 14 powers with the hi-fi readings (Pastors 78, Awareness 21, Volunteers 2, etc), zones count, conference registered, permits.

---

## After Phase 4 — known follow-up work

These are still parked from earlier phase reviews:

- **Phase 1 fixes:** Reminder ownership check, GET /pastors/stage-counts endpoint, pagination on /activity-entries + /pledge-meetings, /login rate limiting, ENUM portability for Postgres.
- **Phase 2 follow-up:** Worker rehearsal session metadata (date/venue) when needed.
- **Phase 4 follow-up:** Convoy + Makarios entity tables (currently return 0 in mission-control). "Committed" budget figure currently equals "spent" — split out signed-contracts when contract entities exist.

Phase 5 (if there is one) candidates:
- Live computation of power readiness from underlying data (formulas per power) as alternative to manual weekly entry
- Frontend (React app consuming the full API)
- File uploads (artwork, transaction receipts, permit letters)
- Notifications (Sat 9pm assessment prompt, etc.)
