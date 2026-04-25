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
