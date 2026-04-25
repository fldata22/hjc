<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AwarenessSurveyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = AwarenessSurvey::query();
        if ($request->filled('zone_id')) {
            $q->where('zone_id', $request->integer('zone_id'));
        }
        if ($request->filled('survey_number')) {
            $q->where('survey_number', $request->integer('survey_number'));
        }
        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        return response()->json(['data' => $q->orderBy('zone_id')->orderBy('survey_number')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'zone_id' => 'required|exists:zones,id',
            'survey_number' => [
                'required', 'integer', 'min:1',
                Rule::unique('awareness_surveys')->where(fn ($q) => $q
                    ->where('crusade_id', $request->crusade_id)
                    ->where('zone_id', $request->zone_id)),
            ],
            'surveyed_count' => 'required|integer|min:0',
            'attending_yes_count' => 'required|integer|min:0|lte:surveyed_count',
            'taken_on' => 'required|date',
        ]);
        $survey = AwarenessSurvey::create($validated);
        return response()->json(['data' => $survey], 201);
    }

    public function update(Request $request, AwarenessSurvey $awarenessSurvey): JsonResponse
    {
        $validated = $request->validate([
            'surveyed_count' => 'sometimes|integer|min:0',
            'attending_yes_count' => 'sometimes|integer|min:0',
            'taken_on' => 'sometimes|date',
        ]);
        // Cross-field check after merge
        $newSurveyed = $validated['surveyed_count'] ?? $awarenessSurvey->surveyed_count;
        $newAttending = $validated['attending_yes_count'] ?? $awarenessSurvey->attending_yes_count;
        abort_if($newAttending > $newSurveyed, 422, 'attending_yes_count cannot exceed surveyed_count');

        $awarenessSurvey->update($validated);
        return response()->json(['data' => $awarenessSurvey]);
    }

    public function trajectory(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();
        $rows = AwarenessSurvey::where('crusade_id', $crusade->id)
            ->selectRaw('survey_number, SUM(surveyed_count) as surveyed_total, SUM(attending_yes_count) as attending_yes_total')
            ->groupBy('survey_number')
            ->orderBy('survey_number')
            ->get()
            ->map(fn ($r) => [
                'survey_number' => (int) $r->survey_number,
                'surveyed_total' => (int) $r->surveyed_total,
                'attending_yes_total' => (int) $r->attending_yes_total,
                'pct' => $r->surveyed_total > 0
                    ? number_format($r->attending_yes_total / $r->surveyed_total * 100, 2, '.', '')
                    : '0.00',
            ]);
        return response()->json(['data' => $rows]);
    }
}
