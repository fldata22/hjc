<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\DailyAttendance;
use App\Models\DailyDecision;
use App\Models\Pastor;
use App\Models\Permit;
use App\Models\PrayerGroup;
use App\Models\WeeklyAssessment;
use App\Models\WelfareItem;
use App\Models\Worker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinalSummaryController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $crusadeId = $request->integer('crusade_id');
        if (!$crusadeId) {
            $crusade = Crusade::first();
            $crusadeId = $crusade?->id;
        }

        // Attendance
        $attendanceRows = DailyAttendance::where('crusade_id', $crusadeId)->get();
        $totalAttendance = $attendanceRows->sum('count');
        $sessionCount    = $attendanceRows->count();
        $peakSession     = $attendanceRows->sortByDesc('count')->first();

        // Decisions
        $decisionRows  = DailyDecision::where('crusade_id', $crusadeId)->get();
        $totalSalvations    = $decisionRows->sum('salvations');
        $totalRededications = $decisionRows->sum('rededications');
        $totalHealings      = $decisionRows->sum('healings');
        $totalCounselled    = $decisionRows->sum('counselled');

        // Pastors
        $pastors = Pastor::where('crusade_id', $crusadeId)->get();
        $pastorsByStage = $pastors->groupBy('pipeline_stage')
            ->map(fn ($g) => $g->count())
            ->toArray();

        // Workers
        $workers = Worker::where('crusade_id', $crusadeId)->get();
        $workersByType = $workers->groupBy('group_type')
            ->map(fn ($g) => $g->count())
            ->toArray();

        // Budget
        $transactions = BudgetTransaction::where('crusade_id', $crusadeId)->get();
        $totalIncome  = $transactions->where('kind', 'income')->sum('amount');
        $totalExpense = $transactions->where('kind', 'expense')->sum('amount');

        // Permits
        $permits = Permit::where('crusade_id', $crusadeId)->get();
        $permitsByStatus = $permits->groupBy('status')
            ->map(fn ($g) => $g->count())
            ->toArray();

        // Weekly assessment (latest submitted)
        $latestAssessment = WeeklyAssessment::where('crusade_id', $crusadeId)
            ->whereNotNull('submitted_at')
            ->orderByDesc('week_number')
            ->with(['readings', 'risks'])
            ->first();

        // Prayer
        $prayerGroups     = PrayerGroup::where('crusade_id', $crusadeId)->get();
        $prayerGroupCount = $prayerGroups->count();
        $prayerMemberCount = $prayerGroups->sum('members_count');

        // Accommodation
        $accommodations = Accommodation::where('crusade_id', $crusadeId)->get();

        // Welfare
        $welfareItems = WelfareItem::where('crusade_id', $crusadeId)->where('status', 'processed')->get();
        $welfareByCategory = $welfareItems->groupBy('category')
            ->map(fn ($g) => (float) $g->sum('amount'))
            ->toArray();

        return response()->json([
            'data' => [
                'crusade_id' => $crusadeId,
                'attendance' => [
                    'total'         => (int) $totalAttendance,
                    'sessions'      => $sessionCount,
                    'average'       => $sessionCount ? round($totalAttendance / $sessionCount) : 0,
                    'peak_day'      => $peakSession?->counted_on?->toDateString(),
                    'peak_count'    => $peakSession ? (int) $peakSession->count : 0,
                ],
                'decisions' => [
                    'salvations'    => (int) $totalSalvations,
                    'rededications' => (int) $totalRededications,
                    'healings'      => (int) $totalHealings,
                    'counselled'    => (int) $totalCounselled,
                    'total'         => (int) ($totalSalvations + $totalRededications + $totalHealings + $totalCounselled),
                ],
                'pastors' => [
                    'total'    => $pastors->count(),
                    'by_stage' => $pastorsByStage,
                ],
                'workers' => [
                    'total'   => $workers->count(),
                    'by_type' => $workersByType,
                ],
                'budget' => [
                    'total_income'  => (float) $totalIncome,
                    'total_expense' => (float) $totalExpense,
                    'net'           => (float) ($totalIncome - $totalExpense),
                    'transactions'  => $transactions->count(),
                ],
                'permits' => [
                    'total'     => $permits->count(),
                    'by_status' => $permitsByStatus,
                ],
                'prayer' => [
                    'groups'  => $prayerGroupCount,
                    'members' => (int) $prayerMemberCount,
                ],
                'accommodation' => [
                    'total'     => $accommodations->count(),
                    'confirmed' => $accommodations->where('status', 'confirmed')->count(),
                    'capacity'  => (int) $accommodations->sum('capacity'),
                ],
                'welfare' => [
                    'total_processed' => (float) $welfareItems->sum('amount'),
                    'by_category'     => $welfareByCategory,
                ],
                'latest_assessment' => $latestAssessment ? [
                    'week_number' => $latestAssessment->week_number,
                    'self_score'  => $latestAssessment->self_score,
                    'submitted_at' => $latestAssessment->submitted_at?->toIso8601String(),
                    'risks'        => $latestAssessment->risks,
                ] : null,
            ],
        ]);
    }
}
