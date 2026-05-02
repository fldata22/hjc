# Daily Expenses + Receipt Photo Backend — Design Spec

**Date:** 2026-05-02
**Status:** Approved, ready for implementation plan
**Roadmap chunk:** Chunk 6 of the revised 7-chunk roadmap (`docs/superpowers/specs/2026-05-02-form-wiring-triage.md`)

## Goal

Replace the localStorage-backed Daily Expenses form with reads/writes to the existing Laravel `/budget-transactions` endpoint, and extend the backend to store receipt photos via a multipart upload to local filesystem storage. Reshape the form to drop fields nothing reads (time, receipt number, approved-by) and to use the existing macro-level `budget_categories` instead of the form's hardcoded operational tags.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Receipt upload endpoint shape | **A.** Multipart on create. Single roundtrip. Edit-photo-later is out of scope. |
| 2 | Budget category mapping | **Drop the form's hardcoded enum.** Fetch the existing 8 macro categories from `/budget-categories` and render as a SelectField. The dashboard already reads `budget_category_id` for macro-spending tracking; the form should write that, not a parallel operational tag. |
| 3 | Receipt photo storage | **Local Laravel filesystem** via `storage:link` symlink. Cloud storage is its own future chunk. |
| 4 | Edit existing expenses | **Out of scope.** Backend supports PATCH; no UI hook. |
| 5 | Replace receipt photo on existing record | **Out of scope.** Photo is set at create-time only. |
| 6 | Income transactions | **Out of scope.** This form is `kind='expense'` only. Income capture would be its own form/screen. |

## Architecture

### Backend

**Migration** `database/migrations/2026_05_02_add_receipt_photo_to_budget_transactions.php`:

```php
return new class extends Migration {
    public function up(): void {
        Schema::table('budget_transactions', function (Blueprint $t) {
            $t->string('receipt_photo_url', 255)->nullable()->after('amount');
        });
    }
    public function down(): void {
        Schema::table('budget_transactions', function (Blueprint $t) {
            $t->dropColumn('receipt_photo_url');
        });
    }
};
```

**Model** `app/Models/BudgetTransaction.php`: append `'receipt_photo_url'` to `$fillable`.

**Storage setup:** `php artisan storage:link` creates `public/storage` → `storage/app/public` symlink. Run as a one-off step in the implementation plan; document in the README and the chunk's deployment notes. (Not added to `composer.json` post-install hooks — the symlink is environment-specific and shouldn't run in CI.)

**Controller** `BudgetTransactionController::store` — switch to multipart-aware:

```php
public function store(Request $request): JsonResponse
{
    $v = $request->validate([
        'crusade_id' => 'required|exists:crusades,id',
        'budget_category_id' => 'nullable|exists:budget_categories,id',
        'description' => 'required|string|max:255',
        'occurred_on' => 'required|date',
        'kind' => 'required|in:income,expense',
        'amount' => 'required|numeric|min:0',
        'receipt_photo' => 'nullable|image|max:5120', // 5MB cap
    ]);

    $photo = $request->file('receipt_photo');
    if ($photo) {
        $path = $photo->store('receipts', 'public');
        $v['receipt_photo_url'] = Storage::url($path);
    }
    unset($v['receipt_photo']);

    return response()->json(['data' => BudgetTransaction::create($v)], 201);
}
```

`update`, `index`, `show`, `destroy` stay unchanged. (Update doesn't accept photo; replacing photos is out of scope.)

**Tests** in `tests/Feature/BudgetTransactionApiTest.php` — 3 new test methods:

```php
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

    $response->assertStatus(201)
        ->assertJsonPath('data.description', 'Test expense');
    $body = $response->json('data');
    $this->assertNotNull($body['receipt_photo_url']);
    $this->assertStringStartsWith('/storage/receipts/', $body['receipt_photo_url']);
    Storage::disk('public')->assertExists(str_replace('/storage/', '', $body['receipt_photo_url']));
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

    $this->post('/api/budget-transactions', [
        'crusade_id' => $this->crusade->id,
        'description' => 'Bad file',
        'occurred_on' => '2026-04-15',
        'kind' => 'expense',
        'amount' => '10.00',
        'receipt_photo' => $file,
    ])->assertStatus(422)->assertJsonValidationErrors(['receipt_photo']);
}
```

(Existing tests in `BudgetTransactionApiTest` continue to pass unchanged — they all use JSON, which is still accepted.)

### Frontend

**`apiFetch` update** in `web/src/api/client.ts`:

```ts
// Skip Content-Type when body is FormData — browser sets multipart with boundary
if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
  headers.set('Content-Type', 'application/json');
}
```

One-line change. All existing JSON callers work as before.

**`compressImage` change** in `web/src/lib/imageCompress.ts`:

Change return type from `Promise<string>` to `Promise<{ blob: Blob; dataUrl: string }>`. The data URL is still produced (used for the in-form thumbnail preview); the Blob is what gets uploaded. Implementation: after `canvas.toDataURL(...)`, also call `canvas.toBlob(resolve, 'image/jpeg', quality)` to get the Blob. Return both.

```ts
export function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    // ... existing FileReader → Image → canvas pipeline ...
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Encode failed')); return; }
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ blob, dataUrl });
    }, 'image/jpeg', quality);
  });
}
```

**New hooks** in `web/src/api/hooks.ts`:

```ts
export interface BudgetCategory {
  id: number;
  crusade_id: number;
  name: string;
  allocated_amount: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetTransaction {
  id: number;
  crusade_id: number;
  budget_category_id: number | null;
  description: string;
  occurred_on: string;
  kind: 'income' | 'expense';
  amount: string;
  receipt_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: ['budget-categories'],
    queryFn: () => apiFetch<{ data: BudgetCategory[] }>('/budget-categories').then((r) => r.data),
  });
}

export function useExpenseTransactions(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['budget-transactions', 'expense', dateFrom, dateTo],
    queryFn: () => apiFetch<{ data: BudgetTransaction[]; meta: { current_page: number; total: number; per_page: number; last_page: number } }>(
      `/budget-transactions?kind=expense&date_from=${dateFrom}&date_to=${dateTo}&per_page=100`
    ),
  });
}

export function useCreateExpenseTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      crusade_id: number;
      budget_category_id: number | null;
      description: string;
      occurred_on: string;
      amount: number;
      receipt_photo: Blob | null;
    }) => {
      const fd = new FormData();
      fd.set('crusade_id', String(input.crusade_id));
      if (input.budget_category_id != null) fd.set('budget_category_id', String(input.budget_category_id));
      fd.set('description', input.description);
      fd.set('occurred_on', input.occurred_on);
      fd.set('kind', 'expense');
      fd.set('amount', String(input.amount));
      if (input.receipt_photo) fd.set('receipt_photo', input.receipt_photo, 'receipt.jpg');
      return apiFetch<{ data: BudgetTransaction }>('/budget-transactions', { method: 'POST', body: fd }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-transactions'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}
```

Also add a `useBudgetSummary()` hook for the budget-remaining stat (existing endpoint `/budget/summary` returns the totals we need):

```ts
export interface BudgetSummary {
  total_budget: string;
  income: string;
  spent: string;
  committed: string;
  gap_to_target: string;
  pct_spent_of_total: string;
  categories: Array<{ id: number; name: string; allocated_amount: string; spent: string; pct_spent: string }>;
}

export function useBudgetSummary() {
  return useQuery({
    queryKey: ['budget-summary'],
    queryFn: () => apiFetch<{ data: BudgetSummary }>('/budget/summary').then((r) => r.data),
  });
}
```

### Form rewrite

`web/src/screens/forms/DailyExpensesForm.tsx` — full rewrite. **Drop:**
- `submitQueue` imports (`enqueue`, `getRecords`, `subscribe`)
- `SEED` array
- `STATIC_BUDGET` constant (replaced by `useBudgetSummary().data.total_budget`)
- `CATEGORIES` hardcoded enum
- `time` field (the type loses it)
- `receiptNumber` field
- `approvedBy` field
- The `compressImage` data-URL stored in `receiptPhoto` — replace with `{ blob, dataUrl }` shape

**Keep / map:**
- Date strip (last 14 days) — drives `useExpenseTransactions(selectedDate, selectedDate)` for the day's entries
- Vendor field (kept as a separate UI input for clarity, but folded into `description` at submit time as `vendor + ' — ' + notes` or just `vendor` if notes empty)
- Notes field (also folded into description)
- Amount → amount
- Category → SelectField populated from `useBudgetCategories()`
- Receipt photo capture flow (unchanged button/thumbnail/Remove UI; just changes what's stored)

**Stat strip:**
- Today's spend: sum of `dayEntries[].amount` (numeric coercion from string)
- Budget remaining: `useBudgetSummary().data.total_budget - useBudgetSummary().data.spent`

**Submission flow:**
- On Save: convert vendor + notes → description; convert amount string → number; pull `compressedPhoto?.blob` from local state; call `useCreateExpenseTransaction.mutateAsync({...})`.
- On success: clear draft (keep date), keep form open (rapid-fire entries — preserve existing UX). Surface created entry in the list immediately via the invalidation.
- On failure: same `ApiError.body.message` extraction pattern as Awareness Survey + BOT/CPC; surface as an inline error caption above the action row.

**Loading/error/empty:**
- Crusade, categories, summary all loading: full-screen `Loading…`
- Crusade or categories error: full-screen `ErrorBanner` with retry (form is unusable without either)
- Day's transactions error: inline `ErrorBanner` in the list area; "+ Add expense" button still usable
- Empty (no expenses today): `<div className="empty">No expenses logged today.</div>`

**Receipt thumbnail in list rows:** rows whose `receipt_photo_url` is non-null get the existing 📷 icon; tapping opens `ReceiptModal` with `src={entry.receipt_photo_url}` (now a `/storage/...` URL, not a data URL).

### `BudgetScreen.tsx` update

Recent transactions section currently reads from localStorage via `getRecords`. Replace with `useExpenseTransactions(today-30d, today)` and update the local `ExpenseEntry` type to match `BudgetTransaction` (specifically `receipt_photo_url` instead of `receiptPhoto`, `description` instead of separate vendor/notes, `budget_category_id` instead of category enum). Display name resolution: lookup category name via `useBudgetCategories()`.

The `LETTER_FOR_CATEGORY` map (used for the row's first-letter chip) is dropped — render `'E'` for all expense rows. Less visual noise; the category name is in the row's subtext anyway.

The existing receipt-icon hookup (📷 button + `ReceiptModal` + `openReceipt` state) **stays** — just point the modal `src` at `entry.receipt_photo_url` (the `/storage/...` URL) instead of the localStorage data URL. Rows whose `receipt_photo_url` is non-null show the 📷 button; others don't.

### `description` composition

The form has separate Vendor (required) and Notes (optional) inputs. At submit time:
- If notes is empty: `description = vendor`
- If notes is non-empty: `description = vendor + ' — ' + notes`

Backend `description` column is `VARCHAR(255)`; frontend should soft-clamp the combined string to 255 characters (or rely on the server's validation rejection). For now: rely on backend rejection — the form-level validation only checks "vendor non-empty + amount > 0".

### File touch list

**Backend create:**
- `database/migrations/2026_05_02_add_receipt_photo_to_budget_transactions.php`

**Backend modify:**
- `app/Models/BudgetTransaction.php`
- `app/Http/Controllers/Api/BudgetTransactionController.php`
- `tests/Feature/BudgetTransactionApiTest.php`

**Backend command (one-off):** `php artisan storage:link`

**Frontend modify:**
- `web/src/api/client.ts`
- `web/src/api/hooks.ts`
- `web/src/lib/imageCompress.ts`
- `web/src/screens/forms/DailyExpensesForm.tsx`
- `web/src/screens/app/BudgetScreen.tsx`

**Delete:** none.

## Out of scope (explicitly)

- Editing existing expenses (PATCH endpoint exists; no UI hook in this chunk)
- Replacing receipt photos
- Multiple photos per expense
- Income transactions (form is expense-only)
- Budget category CRUD UI
- S3 / cloud storage
- Receipt OCR
- Bulk import
- Date range past last 14 days
- Multi-day filter combinations

## Open follow-ups

- Edit-existing-expense flow (especially category/amount corrections)
- Replace/remove receipt photo on existing record
- Income capture form (donations, transfers in)
- Receipt photo on BudgetScreen recent transactions
- S3/cloud storage swap when deployment goes multi-server
- OCR-extract amount/vendor/date from photo to prefill the form
