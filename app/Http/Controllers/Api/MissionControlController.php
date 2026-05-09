<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AwarenessSurvey;
use App\Models\BudgetTransaction;
use App\Models\CommitteeMember;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\Crusade;
use App\Models\Donor;
use App\Models\Pastor;
use App\Models\Permit;
use App\Models\PledgeMeeting;
use App\Models\Power;
use App\Models\PublicityAsset;
use App\Models\WeeklyAssessment;
use App\Models\Worker;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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

        // Permit counts (used by both pillars and context block below).
        $permitsApproved = Permit::where('crusade_id', $crusade->id)->where('status', 'approved')->count();
        $permitsTotal = Permit::where('crusade_id', $crusade->id)->count();

        // ==== Powers ====
        // Two-tier model:
        //   1. Operational pillars derive their value_pct live from real records (override).
        //   2. Qualitative pillars fall back to the latest WeeklyAssessment reading (manual self-rating).
        $latestAssessment = WeeklyAssessment::with('readings')
            ->where('crusade_id', $crusade->id)
            ->orderByDesc('week_number')->first();
        $readingsByPower = collect();
        if ($latestAssessment) {
            $readingsByPower = $latestAssessment->readings->keyBy('power_id');
        }

        // Derived (operational) pillar values. null means "no signal yet, fall back to manual".
        $derived = $this->derivePillarValues($crusade, (float) $awarenessPct, $pastorsWon, $spent, $total, $permitsApproved, $permitsTotal);

        $powers = Power::orderBy('order_index')->get()->map(function ($p) use ($readingsByPower, $derived) {
            $derivedValue = $derived[$p->code] ?? null;
            $reading = $readingsByPower->get($p->id);
            $manualValue = $reading?->value_pct;

            // Derived overrides manual when present.
            $value = $derivedValue ?? $manualValue;
            $source = $derivedValue !== null ? 'derived' : ($manualValue !== null ? 'manual' : null);

            $status = match (true) {
                $value === null => 'muted',
                $value >= 60 => 'success',
                $value >= 30 => 'warning',
                default => 'danger',
            };
            return [
                'code' => $p->code,
                'name' => $p->name,
                'order_index' => $p->order_index,
                'value_pct' => $value,
                'status' => $status,
                'source' => $source,
            ];
        });

        // ==== Context ====
        $zonesCount = Zone::where('crusade_id', $crusade->id)->count();
        $conf = Conference::where('crusade_id', $crusade->id)->first();
        $confRegistered = $conf ? ConferenceRegistration::where('conference_id', $conf->id)->count() : 0;
        $confCapacity = $conf?->capacity ?? 0;
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

    /**
     * Compute derived (operational) pillar values for the live-overriding tier.
     *
     * Returns a map of power code → integer 0-100, or null when there's no
     * signal yet (in which case the manual weekly-assessment value still wins).
     *
     * @return array<string, int|null>
     */
    private function derivePillarValues(
        Crusade $crusade,
        float $awarenessPct,
        int $pastorsWon,
        float $spent,
        float $total,
        int $permitsApproved,
        int $permitsTotal,
    ): array {
        $cid = $crusade->id;

        // Pastors: active+champion / target. Mirrors the top-stat numerator.
        // Returns null with zero ops signal so the manual reading (or muted state) wins.
        $pastorsTarget = (int) $crusade->pastors_target;
        $pastorsValue = $pastorsTarget > 0 && $pastorsWon > 0
            ? (int) round(min(100, $pastorsWon / $pastorsTarget * 100))
            : null;

        // Awareness: latest survey wave aggregate (already computed).
        $awarenessValue = $awarenessPct > 0 ? (int) round($awarenessPct) : null;

        // Donors: pledge_amount sum (committed+given) / budget_total.
        $donorsPledged = (float) Donor::query()
            ->where('crusade_id', $cid)
            ->whereIn('status', ['committed', 'given'])
            ->sum('pledge_amount');
        $donorsValue = $total > 0 && $donorsPledged > 0
            ? (int) round(min(100, $donorsPledged / $total * 100))
            : null;

        // Pledges: distinct pastors with at least one pledge-meeting attendance / total pastors.
        $totalPastors = Pastor::where('crusade_id', $cid)->count();
        $attendedCount = 0;
        if ($totalPastors > 0) {
            $meetingIds = PledgeMeeting::where('crusade_id', $cid)->pluck('id');
            if ($meetingIds->isNotEmpty()) {
                $attendedCount = (int) DB::table('pledge_meeting_attendances')
                    ->whereIn('pledge_meeting_id', $meetingIds)
                    ->distinct('pastor_id')
                    ->count('pastor_id');
            }
        }
        $pledgesValue = $totalPastors > 0 && $attendedCount > 0
            ? (int) round(min(100, $attendedCount / $totalPastors * 100))
            : null;

        // Committees: confirmed/active members / total committee members.
        $committeesTotal = CommitteeMember::where('crusade_id', $cid)->count();
        $committeesActive = CommitteeMember::where('crusade_id', $cid)
            ->whereIn('status', ['confirmed', 'active'])
            ->count();
        $committeesValue = $committeesTotal > 0 && $committeesActive > 0
            ? (int) round($committeesActive / $committeesTotal * 100)
            : null;

        // Publicity: deployed assets / total publicity assets.
        $publicityTotal = PublicityAsset::where('crusade_id', $cid)->count();
        $publicityDeployed = PublicityAsset::where('crusade_id', $cid)
            ->where('status', 'deployed')
            ->count();
        $publicityValue = $publicityTotal > 0 && $publicityDeployed > 0
            ? (int) round($publicityDeployed / $publicityTotal * 100)
            : null;

        // Government: approved permits / total permits.
        $govtValue = $permitsTotal > 0 && $permitsApproved > 0
            ? (int) round($permitsApproved / $permitsTotal * 100)
            : null;

        // Volunteers: active workers / max(active+inactive, 1) — % of recruited that are active.
        $workersTotal = Worker::where('crusade_id', $cid)->count();
        $workersActive = Worker::where('crusade_id', $cid)->where('status', 'active')->count();
        $volunteersValue = $workersTotal > 0 && $workersActive > 0
            ? (int) round($workersActive / $workersTotal * 100)
            : null;

        return [
            'pastors' => $pastorsValue,
            'awareness' => $awarenessValue,
            'donors' => $donorsValue,
            'pledges' => $pledgesValue,
            'committees' => $committeesValue,
            'publicity' => $publicityValue,
            'govt' => $govtValue,
            'volunteers' => $volunteersValue,
            // Qualitative pillars (decisions, discipleship, drama, equipment, events, budget) intentionally
            // omitted — they fall through to the weekly assessment manual value.
        ];
    }
}
