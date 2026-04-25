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
