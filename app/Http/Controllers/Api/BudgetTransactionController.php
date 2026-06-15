<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetTransaction;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
            'receipt_photo' => 'nullable|image|max:5120',
        ]);

        $photo = $request->file('receipt_photo');
        if ($photo) {
            $path = $photo->store('receipts', 'public');
            $v['receipt_photo_url'] = Storage::url($path);
        }
        unset($v['receipt_photo']);

        $tx = BudgetTransaction::create($v);
        $sign = $tx->kind === 'expense' ? '-' : '+';
        ActivityLogger::log(
            $tx->crusade_id,
            $request->user()?->id,
            'budget',
            "{$tx->kind}: {$sign}\u{20B5}" . number_format((float) $tx->amount, 0) . " — {$tx->description}",
        );
        return response()->json(['data' => $tx], 201);
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

    public function approve(Request $request, BudgetTransaction $budgetTransaction): JsonResponse
    {
        $v = $request->validate(['status' => 'required|in:approved,rejected']);

        $budgetTransaction->update([
            'status'      => $v['status'],
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        ActivityLogger::log(
            $budgetTransaction->crusade_id,
            $request->user()?->id,
            'budget',
            "Transaction {$v['status']}: {$budgetTransaction->description} (" . number_format((float) $budgetTransaction->amount, 0) . ")",
        );

        return response()->json(['data' => $budgetTransaction]);
    }

    public function destroy(BudgetTransaction $budgetTransaction): JsonResponse
    {
        $budgetTransaction->delete();
        return response()->json(null, 204);
    }
}
