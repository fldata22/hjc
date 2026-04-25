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
                'convoy_actual' => 0,
                'convoy_target' => (int) ($crusade->convoy_target ?? 0),
                'makarios_actual' => 0,
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
