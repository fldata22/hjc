# Daily Expenses + Receipt Photo Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage-backed Daily Expenses with reads/writes to existing Laravel `/budget-transactions`, extended to accept multipart receipt-photo uploads to local filesystem storage. Drop the form's hardcoded category enum in favor of the existing `budget_categories` macros that the dashboard already reads.

**Architecture:** Backend gets a `receipt_photo_url` column on `budget_transactions`, multipart-aware `store()` that writes uploads to `storage/app/public/receipts/{uuid}.jpg` and returns the `/storage/...` URL. Frontend gets four new React Query hooks (`useBudgetCategories`, `useExpenseTransactions`, `useCreateExpenseTransaction`, `useBudgetSummary`); `apiFetch` learns to skip `Content-Type` when body is `FormData`; `compressImage` returns `{ blob, dataUrl }`. DailyExpensesForm rewrites to drop time/receiptNumber/approvedBy, fold vendor+notes into `description`, and use the existing budget categories. BudgetScreen recent-transactions list updates to consume the API shape.

**Tech Stack:** Laravel 12 + PHPUnit (Feature tests with `RefreshDatabase`, `Storage::fake('public')`, `UploadedFile::fake()->image()`). React 19 + TypeScript strict + @tanstack/react-query v5. `php artisan storage:link` symlink already exists on this machine; verify in implementation.

**Spec:** `docs/superpowers/specs/2026-05-02-daily-expenses-receipt-photo-design.md`

---

## File map

**Backend create:**
- `database/migrations/2026_05_03_add_receipt_photo_to_budget_transactions.php`

**Backend modify:**
- `app/Models/BudgetTransaction.php` — add `receipt_photo_url` to fillable
- `app/Http/Controllers/Api/BudgetTransactionController.php` — multipart store
- `tests/Feature/BudgetTransactionApiTest.php` — 3 new tests

**Frontend modify:**
- `web/src/api/client.ts` — skip Content-Type for FormData (one line)
- `web/src/lib/imageCompress.ts` — return `{ blob, dataUrl }` instead of string
- `web/src/api/hooks.ts` — 4 hooks + 3 types
- `web/src/screens/forms/DailyExpensesForm.tsx` — full rewrite
- `web/src/screens/app/BudgetScreen.tsx` — switch to API hooks

**Delete:** none.

---

## Task 1: Migration + model fillable

**Files:**
- Create: `database/migrations/2026_05_03_add_receipt_photo_to_budget_transactions.php`
- Modify: `app/Models/BudgetTransaction.php`

- [ ] **Step 1: Create the migration**

Write `database/migrations/2026_05_03_add_receipt_photo_to_budget_transactions.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('budget_transactions', function (Blueprint $table) {
            $table->string('receipt_photo_url', 255)->nullable()->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('budget_transactions', function (Blueprint $table) {
            $table->dropColumn('receipt_photo_url');
        });
    }
};
```

- [ ] **Step 2: Update the model `$fillable`**

In `/Users/adebimpegodwin/Projects/hjc/app/Models/BudgetTransaction.php`, find the existing `$fillable` array. Add `'receipt_photo_url'` as the last element. The property should now look like:

```php
    protected $fillable = [
        'crusade_id', 'budget_category_id', 'description',
        'occurred_on', 'kind', 'amount', 'receipt_photo_url',
    ];
```

(If the existing fillable order or contents are slightly different, just append `'receipt_photo_url'` to whatever is there.)

- [ ] **Step 3: Run the migration**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan migrate
```

Expected: `2026_05_03_add_receipt_photo_to_budget_transactions .... DONE`.

- [ ] **Step 4: Verify the column landed and the model accepts it**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan tinker --execute="echo Schema::hasColumn('budget_transactions', 'receipt_photo_url') ? 'has column' : 'MISSING';"
```

Expected: `has column`.

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan tinker --execute="\$t = App\Models\BudgetTransaction::factory()->create(['receipt_photo_url' => '/storage/test.jpg']); echo \$t->receipt_photo_url;"
```

Expected: `/storage/test.jpg`.

- [ ] **Step 5: Verify the storage symlink exists (should already)**

```bash
ls -l /Users/adebimpegodwin/Projects/hjc/public/storage
```

Expected: a symlink pointing to `../storage/app/public`. If absent, run `cd /Users/adebimpegodwin/Projects/hjc && php artisan storage:link`.

- [ ] **Step 6: Re-run the existing test suite to confirm no regressions**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter=BudgetTransactionApiTest
```

Expected: all 7 existing tests pass (the migration adds a nullable column with no default; existing tests unaffected).

- [ ] **Step 7: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add database/migrations/2026_05_03_add_receipt_photo_to_budget_transactions.php app/Models/BudgetTransaction.php && git commit -m "$(cat <<'EOF'
feat(api): receipt_photo_url column on budget_transactions

Nullable VARCHAR(255). Stores the /storage/... URL of the uploaded
receipt photo when present. Multipart upload handler lands in the
next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Multipart store + 3 new tests (TDD)

**Files:**
- Modify: `app/Http/Controllers/Api/BudgetTransactionController.php`
- Modify: `tests/Feature/BudgetTransactionApiTest.php`

- [ ] **Step 1: Write the 3 failing tests**

Append these test methods to `tests/Feature/BudgetTransactionApiTest.php` (just before the closing `}` of the class). Add the new imports at the top of the file: `use Illuminate\Http\UploadedFile;` and `use Illuminate\Support\Facades\Storage;`.

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

        $response->assertStatus(201)->assertJsonPath('data.description', 'Test expense');
        $body = $response->json('data');
        $this->assertNotNull($body['receipt_photo_url']);
        $this->assertStringStartsWith('/storage/receipts/', $body['receipt_photo_url']);
        // The URL is /storage/receipts/{uuid}.jpg; the disk path is receipts/{uuid}.jpg
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

- [ ] **Step 2: Run the failing tests**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter=BudgetTransactionApiTest
```

Expected: 7 existing tests pass; 3 new tests fail — `test_store_accepts_multipart_with_receipt_photo` will fail because `receipt_photo_url` will be null, `test_store_works_without_receipt_photo` may pass (already nullable in the DB), and `test_store_rejects_non_image_upload` will fail (no validation rule yet, so it returns 201).

- [ ] **Step 3: Update the controller `store()` method**

In `/Users/adebimpegodwin/Projects/hjc/app/Http/Controllers/Api/BudgetTransactionController.php`, add the import at the top:

```php
use Illuminate\Support\Facades\Storage;
```

Then replace the `store()` method with:

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
            'receipt_photo' => 'nullable|image|max:5120',
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

- [ ] **Step 4: Run all tests to verify they pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter=BudgetTransactionApiTest
```

Expected: all 10 tests pass (7 existing + 3 new). If any fail, read the failure output and fix the controller.

- [ ] **Step 5: Run the full suite to confirm no broader regressions**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test
```

Expected: full suite passes.

- [ ] **Step 6: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add app/Http/Controllers/Api/BudgetTransactionController.php tests/Feature/BudgetTransactionApiTest.php && git commit -m "$(cat <<'EOF'
feat(api): /budget-transactions accepts multipart receipt_photo

Store() now validates an optional `receipt_photo` File (image, ≤5MB),
saves it to storage/app/public/receipts/{uuid}.jpg, and stores the
/storage/... URL in receipt_photo_url. JSON-only callers still work.

Three new tests cover: multipart with photo (201 + url + file written),
multipart without photo (201 + null url), non-image upload (422).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: apiFetch FormData fix + imageCompress return shape

**Files:**
- Modify: `web/src/api/client.ts` — one-line update
- Modify: `web/src/lib/imageCompress.ts` — change return type

- [ ] **Step 1: Update `apiFetch` to skip Content-Type for FormData**

In `/Users/adebimpegodwin/Projects/hjc/web/src/api/client.ts`, find the line:

```ts
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
```

Replace it with:

```ts
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
```

When body is a `FormData` instance, the browser sets `Content-Type: multipart/form-data; boundary=...` automatically. Forcing `application/json` would break the upload.

- [ ] **Step 2: Rewrite `imageCompress.ts` to return both blob and dataUrl**

Overwrite `/Users/adebimpegodwin/Projects/hjc/web/src/lib/imageCompress.ts`:

```ts
/**
 * Compress an image file by drawing it to an off-screen canvas at a
 * capped width and exporting as JPEG. Returns both the binary Blob
 * (for multipart upload) and the data URL (for in-form preview).
 *
 * Used for receipt photos — typical phone-camera input (3–5MB) compresses
 * to ~50–150KB at the defaults below.
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read file'));

    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Unexpected reader result'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const targetWidth = Math.min(maxWidth, img.naturalWidth);
        const scale = targetWidth / img.naturalWidth;
        const targetHeight = Math.round(img.naturalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Encode failed'));
              return;
            }
            const previewUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({ blob, dataUrl: previewUrl });
          },
          'image/jpeg',
          quality,
        );
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: at this point you may see one TS error in `DailyExpensesForm.tsx` (still expecting the old `Promise<string>` return type). That's fine — the form will be rewritten in Task 5. **Stop here if that's the only TS error.** If you see other errors, investigate before proceeding.

If you want a clean build before committing this task, you can stub the form's caller temporarily, but the cleanest path is: commit Task 3 now, then Task 4 doesn't touch the form (just hooks), then Task 5's form rewrite re-aligns the call site.

To work around: skip the build check for this task; lint + commit and let Task 5 re-align. Run instead:

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b 2>&1 | grep -v "DailyExpensesForm.tsx" | grep -E "error|TS\d+" || echo "no other errors"
```

Expected: `no other errors`.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/api/client.ts web/src/lib/imageCompress.ts && git commit -m "$(cat <<'EOF'
feat(web): apiFetch handles FormData; imageCompress returns blob+dataUrl

apiFetch skips its automatic Content-Type=application/json header when
body is FormData, letting the browser set multipart/form-data with the
right boundary.

imageCompress now returns {blob, dataUrl}: blob for multipart upload,
dataUrl for in-form preview. The transient TS error in
DailyExpensesForm.tsx (still calling the old single-string API) is
resolved by the Task 5 rewrite.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Frontend hooks (4 hooks + 3 types)

**Files:**
- Modify: `web/src/api/hooks.ts` — append after the existing `useCreateCommitteeMember` hook

- [ ] **Step 1: Append the hooks block**

Add to the bottom of `/Users/adebimpegodwin/Projects/hjc/web/src/api/hooks.ts`:

```ts
// === Budget categories + transactions + summary ===
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

export interface BudgetSummary {
  total_budget: string;
  income: string;
  spent: string;
  committed: string;
  gap_to_target: string;
  pct_spent_of_total: string;
  categories: Array<{
    id: number;
    name: string;
    allocated_amount: string;
    spent: string;
    pct_spent: string;
  }>;
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
    queryFn: () =>
      apiFetch<{
        data: BudgetTransaction[];
        meta: { current_page: number; total: number; per_page: number; last_page: number };
      }>(
        `/budget-transactions?kind=expense&date_from=${dateFrom}&date_to=${dateTo}&per_page=100`,
      ),
  });
}

export function useBudgetSummary() {
  return useQuery({
    queryKey: ['budget-summary'],
    queryFn: () => apiFetch<{ data: BudgetSummary }>('/budget/summary').then((r) => r.data),
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
      return apiFetch<{ data: BudgetTransaction }>('/budget-transactions', {
        method: 'POST',
        body: fd,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-transactions'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b 2>&1 | grep -v "DailyExpensesForm.tsx" | grep -E "error|TS\d+" || echo "no other errors"
```

Expected: `no other errors`. (The `DailyExpensesForm.tsx` TS error from Task 3 is still there and stays until Task 5.)

- [ ] **Step 3: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit 1 with the same 4 baseline errors only.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/api/hooks.ts && git commit -m "$(cat <<'EOF'
feat(web): budget category + transaction + summary hooks

Four hooks: useBudgetCategories, useExpenseTransactions(from, to),
useBudgetSummary, useCreateExpenseTransaction. The mutation builds
FormData (multipart) so receipt photos upload as binary, not base64.
On success it invalidates budget-transactions, budget-summary, and
mission-control.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: DailyExpensesForm rewrite

**Files:**
- Modify: `web/src/screens/forms/DailyExpensesForm.tsx` — full rewrite

- [ ] **Step 1: Replace the file contents**

Overwrite `/Users/adebimpegodwin/Projects/hjc/web/src/screens/forms/DailyExpensesForm.tsx` with EXACTLY:

```tsx
import { type ChangeEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SelectField, CurrencyField, DateField } from './fields';
import {
  useCrusade,
  useBudgetCategories,
  useExpenseTransactions,
  useBudgetSummary,
  useCreateExpenseTransaction,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { compressImage } from '../../lib/imageCompress';
import { ReceiptModal } from './ReceiptModal';
import { todayISO, last14Days, formatDayLabel } from '../../lib/dateHelpers';
import './forms.css';

type Draft = {
  date: string;
  vendor: string;
  budgetCategoryId: number | '';
  amount: number | '';
  notes: string;
  receiptPreview: string | null;
  receiptBlob: Blob | null;
};

const emptyDraft = (date: string): Draft => ({
  date,
  vendor: '',
  budgetCategoryId: '',
  amount: '',
  notes: '',
  receiptPreview: null,
  receiptBlob: null,
});

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

function composeDescription(vendor: string, notes: string): string {
  const v = vendor.trim();
  const n = notes.trim();
  if (!n) return v;
  return `${v} — ${n}`;
}

export function DailyExpensesForm() {
  const navigate = useNavigate();

  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError, refetch: refetchCategories } = useBudgetCategories();
  const { data: summary } = useBudgetSummary();

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const { data: dayPage, isLoading: dayLoading, isError: dayError, refetch: refetchDay } = useExpenseTransactions(selectedDate, selectedDate);
  const createMutation = useCreateExpenseTransaction();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(todayISO()));
  const [capturing, setCapturing] = useState(false);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dayEntries = useMemo(
    () => (dayPage?.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [dayPage],
  );

  const daySpend = dayEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBudget = summary ? Number(summary.total_budget) : 0;
  const totalSpent = summary ? Number(summary.spent) : 0;
  const budgetRemaining = totalBudget - totalSpent;

  const canAdd =
    !!crusade &&
    draft.vendor.trim() !== '' &&
    typeof draft.amount === 'number' &&
    draft.amount > 0 &&
    !createMutation.isPending;

  const handleReceiptChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCapturing(true);
    try {
      const { blob, dataUrl } = await compressImage(file);
      setDraft((d) => ({ ...d, receiptPreview: dataUrl, receiptBlob: blob }));
    } catch (err) {
      console.error('Receipt compression failed:', err);
      alert('Could not load that image. Try a different file.');
    } finally {
      setCapturing(false);
    }
  };

  const handleAdd = async () => {
    if (!canAdd || !crusade) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        budget_category_id: typeof draft.budgetCategoryId === 'number' ? draft.budgetCategoryId : null,
        description: composeDescription(draft.vendor, draft.notes),
        occurred_on: draft.date,
        amount: typeof draft.amount === 'number' ? draft.amount : 0,
        receipt_photo: draft.receiptBlob,
      });
      setDraft(emptyDraft(selectedDate));
      // Keep form open for rapid-fire entries (preserves the prior UX).
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
          title={<>Crusade <em>Daily Expenses</em></>}
          pillar="Budget"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <ErrorBanner what="crusade" onRetry={refetchCrusade}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (categoriesError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Crusade <em>Daily Expenses</em></>}
          pillar="Budget"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <ErrorBanner what="budget categories" onRetry={refetchCategories}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (crusadeLoading || categoriesLoading || !crusade || !categories) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Crusade <em>Daily Expenses</em></>}
          pillar="Budget"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const days = last14Days();

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Crusade <em>Daily Expenses</em></>}
        pillar="Budget"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="date-strip">
          {days.map((iso) => {
            const { dow, dnum } = formatDayLabel(iso);
            return (
              <button
                type="button"
                key={iso}
                className={'day' + (selectedDate === iso ? ' on' : '')}
                onClick={() => {
                  setSelectedDate(iso);
                  setDraft((d) => ({ ...d, date: iso }));
                }}
              >
                <span className="dow">{dow}</span>
                <span className="dnum">{dnum}</span>
              </button>
            );
          })}
        </div>

        <div className="stat-strip">
          <div>
            <div className="num">₵{daySpend.toFixed(0)}</div>
            <div className="lbl">spent today</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>₵{Math.max(0, budgetRemaining).toFixed(0)}</b> remaining</div>
            <div className="lbl" style={{ fontSize: 10 }}>of ₵{totalBudget.toFixed(0)}</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {dayError ? (
            <ErrorBanner what="day's expenses" onRetry={refetchDay}/>
          ) : dayLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : dayEntries.length === 0 ? (
            <div className="empty">No expenses logged today.</div>
          ) : (
            dayEntries.map((e) => {
              const cat = e.budget_category_id != null ? categoryById.get(e.budget_category_id) : null;
              return (
                <div key={e.id} className="form-list-row">
                  <div>
                    <div className="name">{e.description}</div>
                    <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {cat?.name ?? 'Uncategorized'}
                      {e.receipt_photo_url && (
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receipt_photo_url); }}
                          style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                          aria-label="View receipt"
                        >
                          📷
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="right">
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>₵{Number(e.amount).toFixed(2)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => {
            if (showForm) {
              setDraft(emptyDraft(selectedDate));
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : 'Add expense'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} required/>
              <TextField label="Vendor" placeholder="e.g. Sahel Transport" value={draft.vendor} onChange={(v) => setDraft({ ...draft, vendor: v })} required/>
              <SelectField
                label="Category"
                options={categoryOptions}
                value={draft.budgetCategoryId === '' ? '' : String(draft.budgetCategoryId)}
                onChange={(v) => setDraft({ ...draft, budgetCategoryId: v === '' ? '' : Number(v) })}
                placeholder="Uncategorized"
              />
              <CurrencyField label="Amount" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} required/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>

            <div style={{ padding: '12px 0' }}>
              {draft.receiptPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={draft.receiptPreview}
                    alt="Receipt preview"
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, receiptPreview: null, receiptBlob: null }))}
                    style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="receipt-capture-btn" style={{ display: 'inline-block', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleReceiptChange}
                    disabled={capturing}
                  />
                  {capturing ? 'Processing…' : '+ Add receipt'}
                </label>
              )}
            </div>

            {saveError && (
              <div className="field-error" style={{ margin: '4px 0' }}>{saveError}</div>
            )}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft(selectedDate)); setSaveError(null); }}>Clear</button>
              <button type="button" className="btn primary" onClick={handleAdd} disabled={!canAdd}>
                {createMutation.isPending ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </div>
        )}

        {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
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

Expected: exit 0 (the Task 3 transient TS error is now resolved by this rewrite).

- [ ] **Step 3: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit 1 with the same 4 baseline errors only.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/screens/forms/DailyExpensesForm.tsx && git commit -m "$(cat <<'EOF'
feat(web): wire DailyExpensesForm to /budget-transactions multipart

Drop submitQueue/localStorage, hardcoded CATEGORIES enum, time field,
receiptNumber field, approvedBy field. Fold vendor + notes into the
backend's `description` column. Categories now come from
useBudgetCategories (the existing macros the dashboard reads).

Receipt capture: compressImage now returns {blob, dataUrl}; the blob
ships in FormData while the dataUrl is the in-form preview source.
Existing photos render via /storage/... URLs in ReceiptModal.

Stat strip shows day-spent + budget-remaining (from useBudgetSummary).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: BudgetScreen update

**Files:**
- Modify: `web/src/screens/app/BudgetScreen.tsx` — replace localStorage path with API hooks

- [ ] **Step 1: Replace the relevant sections**

The current `BudgetScreen.tsx` uses `getRecords` to load expense entries from localStorage. Replace those imports and reads with the API hooks.

Replace the imports at the top of `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/BudgetScreen.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { getRecords, subscribe } from '../../lib/submitQueue';
import { ReceiptModal } from '../forms/ReceiptModal';
import './app.css';
```

with:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { useBudgetCategories, useExpenseTransactions } from '../../api/hooks';
import { ReceiptModal } from '../forms/ReceiptModal';
import './app.css';
```

Then replace the `ExpenseEntry` type, the `FORM_SLUG` constant, the `STATIC_BUDGET` constant, the `CATEGORIES` array, the `LETTER_FOR_CATEGORY` map, and the `formatRelativeDate` helper. Keep `formatRelativeDate` — it's used downstream. Drop the rest. The new top-of-file looks like:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { useBudgetCategories, useExpenseTransactions } from '../../api/hooks';
import { ReceiptModal } from '../forms/ReceiptModal';
import './app.css';

function formatRelativeDate(iso: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'today';
  if (iso === yest) return 'yest';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
```

Then update the component body. Replace the existing `BudgetScreen` function (lines ~53 onward) with:

```tsx
export function BudgetScreen() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);

  // Fetch the last 30 days of expense transactions for the recent-list section.
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data: page } = useExpenseTransactions(thirtyDaysAgo, today);
  const { data: categories } = useBudgetCategories();

  const entries = page?.data ?? [];
  const recent = entries.slice(0, 5);
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c] as const));

  return (
    <ResponsiveShell active="budget">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="page-head">
          <h1 className="serif">Budget</h1>
          <p className="summary">Recent expense activity, last 30 days.</p>
        </div>

        <div className="recent-tx">
          <div className="sec">
            <h2 className="serif">Recent <em>expenses</em></h2>
            <span className="more">{entries.length} this month</span>
          </div>

          {recent.length === 0 ? (
            <div className="empty" style={{ padding: '20px' }}>No recent expenses.</div>
          ) : (
            recent.map((e) => {
              const cat = e.budget_category_id != null ? categoryById.get(e.budget_category_id) : null;
              return (
                <button
                  key={e.id}
                  type="button"
                  className="tx-row"
                  onClick={() => navigate('/forms/daily-expenses')}
                >
                  <div className="tx-letter">E</div>
                  <div className="tx-mid">
                    <div className="tx-name">{e.description}</div>
                    <div className="tx-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {cat?.name ?? 'Uncategorized'} · {formatRelativeDate(e.occurred_on)}
                      {e.receipt_photo_url && (
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receipt_photo_url); }}
                          style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                          aria-label="View receipt"
                        >
                          📷
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="tx-amt">₵{Number(e.amount).toFixed(2)}</div>
                </button>
              );
            })
          )}
        </div>

        <div className="bot-pad"/>
      </div>

      <TabBar active="budget"/>
      {drawer && <Drawer active="budget" onClose={() => setDrawer(false)}/>}
      {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
    </ResponsiveShell>
  );
}
```

Note: this rewrite preserves the recent-transactions section but drops anything that previously consumed the localStorage `daily-expenses` slug (totals, filters, etc — none of those existed in the first place; the previous BudgetScreen was also primarily a recent-list view). If the existing file has additional sections (e.g., budget-summary card), inspect what's there first and keep them, just update the recent-transactions data source.

**Important:** before applying the rewrite, read the current file in full to confirm there isn't additional content (charts, donor list, etc.) you'd be wiping out. If there's other content, preserve it and only swap the recent-transactions section.

- [ ] **Step 2: Read the current file to confirm no other sections will be lost**

```bash
cd /Users/adebimpegodwin/Projects/hjc && wc -l web/src/screens/app/BudgetScreen.tsx
```

If line count is significantly larger than what your replacement covers, read the full file and adjust your edit to preserve the other sections. The minimum-viable version of this rewrite swaps:
- The `useState(getRecords...)` initialization → `useExpenseTransactions(...)` data
- The `useEffect(subscribe...)` block → removed
- The `LETTER_FOR_CATEGORY[entry.category]` rendering → just `'E'`
- The `entry.receiptPhoto` references → `entry.receipt_photo_url`
- The `entry.vendor`/`entry.notes` references → `entry.description`
- The `entry.category` (string enum) references → category lookup via `categoryById.get(entry.budget_category_id)`

If preserving other sections is simpler than wholesale rewrite, do that instead — the goal is "no localStorage, uses the new API shape."

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b
```

Expected: exit 0.

- [ ] **Step 4: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: exit 1 with same 4 baseline errors only.

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/screens/app/BudgetScreen.tsx && git commit -m "$(cat <<'EOF'
feat(web): BudgetScreen recent-expenses uses /budget-transactions

Drop submitQueue/localStorage path; consume useExpenseTransactions for
the last 30 days of expense rows and useBudgetCategories for category
name resolution. Receipt photo button now points at receipt_photo_url
(/storage/...) instead of a base64 data URL. Letter chip simplified
to constant 'E' for all expense rows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

After all six tasks land:

- [ ] **Backend tests pass**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test
```

Expected: full suite (existing + 3 new BudgetTransaction tests) passes.

- [ ] **Frontend build clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run build
```

Expected: exit 0; bundle in `dist/`.

- [ ] **Frontend lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint
```

Expected: same 4 baseline errors only.

- [ ] **End-to-end manual smoke**

1. Re-seed: `php artisan migrate:fresh --seed`
2. Confirm Laravel server (`php artisan serve --port=8001`) and Vite dev server are running.
3. Log in via the app.
4. Visit `/forms/daily-expenses`. Confirm the seeded expense data renders for the appropriate dates (the seeder creates several expenses across `Crusade ground & sound`, `Publicity`, `Conference`, etc.). Tap through the date strip to find days with entries.
5. Click "Add expense". Fill in: vendor "Test vendor", category "Crusade ground & sound", amount ₵42.50, notes "Smoke test". Click Save expense. Confirm: button shows "Saving…" briefly, the new entry appears in the day's list, the form clears (date sticky), the day-spent stat updates.
6. Click "+ Add receipt" on a fresh expense, pick any image. Confirm the thumbnail preview shows. Save the expense. Network tab: `POST /api/budget-transactions` should be `multipart/form-data`. Confirm the new entry's row shows the 📷 icon. Tap it — ReceiptModal opens with the image. ESC or click backdrop to close.
7. Visit `/budget`. Confirm the recent-transactions list shows the new entries (last 30 days). Tap the 📷 on one with a receipt — ReceiptModal opens. Tap a row body — navigates to /forms/daily-expenses.
8. Visit `/`. Confirm the Mission Control "spent" / "% of budget" stats reflect the new entries (network tab should show /mission-control was re-fetched after the create).

---

## Self-review notes

**Spec coverage:**
- Decision 1 (multipart on create) — Tasks 2 + 4 + 5 (controller + mutation + form Save handler).
- Decision 2 (drop hardcoded category enum) — Task 5 (form rewrite uses `useBudgetCategories`).
- Decision 3 (local filesystem storage) — Task 1 + 2 (Storage::url + storage:link).
- Decision 4 (out of scope: edit existing) — no PATCH UI hook anywhere; backend retained.
- Decision 5 (out of scope: replace photo) — `update()` doesn't accept photo; no UI affordance.
- Decision 6 (out of scope: income) — form hardcodes `kind='expense'` in the mutation; no income toggle.
- Receipt photo storage tests — Task 2 step 1 (3 new tests covering with-photo, without-photo, non-image).
- `apiFetch` FormData fix — Task 3.
- `compressImage` shape change — Task 3.
- BudgetScreen swap — Task 6.

**Placeholder scan:** All steps have runnable code or commands. No TBD/TODO. The Task 6 step 2 instruction "if other sections exist, preserve them" is a judgment call but explicit — not a placeholder.

**Type consistency:**
- `BudgetTransaction` interface (Task 4) used by Task 5 form + Task 6 BudgetScreen.
- `BudgetCategory` interface (Task 4) used by Task 5 form + Task 6 BudgetScreen.
- `BudgetSummary` interface (Task 4) used by Task 5 form for `total_budget`/`spent` numerics.
- Mutation body type (Task 4) matches controller validation (Task 2): `crusade_id`, `budget_category_id` (nullable), `description`, `occurred_on`, `kind` (always 'expense'), `amount`, `receipt_photo` (Blob | null).
- `compressImage` return shape `{ blob, dataUrl }` consistent across Task 3 definition and Task 5 caller.
- `useExpenseTransactions(from, to)` query key shape consistent across Task 4 + Task 5 + Task 6.
