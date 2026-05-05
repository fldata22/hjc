<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_store_accepts_multipart_with_receipt_photo(): void
    {
        Storage::fake('public');
        $cat = BudgetCategory::factory()->create(['crusade_id' => $this->crusade->id]);
        $file = UploadedFile::fake()->image('receipt.jpg', 800, 600);

        $response = $this->post('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'budget_category_id' => $cat->id,
            'description' => 'Test expense',
            'occurred_on' => '2026-04-15',
            'kind' => 'expense',
            'amount' => '125.50',
            'receipt_photo' => $file,
        ]);

        $response->assertStatus(201)->assertJsonPath('data.description', 'Test expense');
        $body = $response->json('data');
        $this->assertNotNull($body['receipt_photo_url']);
        $this->assertStringStartsWith('/storage/receipts/', $body['receipt_photo_url']);
        $diskPath = str_replace('/storage/', '', $body['receipt_photo_url']);
        Storage::disk('public')->assertExists($diskPath);
    }

    public function test_store_works_without_receipt_photo(): void
    {
        $response = $this->postJson('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'description' => 'No photo',
            'occurred_on' => '2026-04-15',
            'kind' => 'expense',
            'amount' => '50.00',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.receipt_photo_url', null);
    }

    public function test_store_rejects_non_image_upload(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->create('not-an-image.pdf', 100, 'application/pdf');

        $this->withHeaders(['Accept' => 'application/json'])
            ->post('/api/budget-transactions', [
                'crusade_id' => $this->crusade->id,
                'description' => 'Bad file',
                'occurred_on' => '2026-04-15',
                'kind' => 'expense',
                'amount' => '10.00',
                'receipt_photo' => $file,
            ])->assertStatus(422)->assertJsonValidationErrors(['receipt_photo']);
    }
}
