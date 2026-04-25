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
            'committed' => number_format($spent, 2, '.', ''),
            'gap_to_target' => number_format($gap, 2, '.', ''),
            'pct_spent_of_total' => $total > 0 ? number_format($spent / $total * 100, 2, '.', '') : '0.00',
            'categories' => $categories,
        ]]);
    }
}
