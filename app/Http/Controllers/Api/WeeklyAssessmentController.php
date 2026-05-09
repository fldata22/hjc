<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WeeklyAssessmentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => WeeklyAssessment::orderByDesc('week_number')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'week_number' => [
                'required', 'integer', 'min:1',
                Rule::unique('weekly_assessments')->where(fn ($q) => $q->where('crusade_id', $request->crusade_id)),
            ],
            'prompted_at' => 'required|date',
            'self_score' => 'nullable|integer|min:1|max:10',
            'notes' => 'nullable|string',
            'decisions_needed' => 'nullable|string',
        ]);
        return response()->json(['data' => WeeklyAssessment::create($v)], 201);
    }

    public function show(WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $weeklyAssessment->load(['readings.power:id,code,name', 'risks']);
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function update(Request $request, WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $v = $request->validate([
            'self_score' => 'sometimes|nullable|integer|min:1|max:10',
            'notes' => 'sometimes|nullable|string',
            'decisions_needed' => 'sometimes|nullable|string',
        ]);
        $weeklyAssessment->update($v);
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function destroy(WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $weeklyAssessment->delete();
        return response()->json(null, 204);
    }

    public function submit(Request $request, WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $weeklyAssessment->update(['submitted_at' => now()]);
        ActivityLogger::log(
            $weeklyAssessment->crusade_id,
            $request->user()?->id,
            'events',
            "Weekly readiness W{$weeklyAssessment->week_number} submitted",
        );
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function latest(): JsonResponse
    {
        $a = WeeklyAssessment::with(['readings.power:id,code,name', 'risks'])
            ->orderByDesc('week_number')
            ->first();
        if (! $a) abort(404);
        return response()->json(['data' => $a]);
    }

    public function replaceReadings(Request $request, WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $v = $request->validate([
            'readings' => 'required|array',
            'readings.*.power_id' => 'required|integer|exists:powers,id',
            'readings.*.value_pct' => 'required|integer|min:0|max:100',
        ]);
        DB::transaction(function () use ($weeklyAssessment, $v) {
            $weeklyAssessment->readings()->delete();
            foreach ($v['readings'] as $row) {
                WeeklyAssessmentReading::create([
                    'weekly_assessment_id' => $weeklyAssessment->id,
                    'power_id' => $row['power_id'],
                    'value_pct' => $row['value_pct'],
                ]);
            }
        });
        $weeklyAssessment->load('readings.power:id,code,name');
        return response()->json(['data' => $weeklyAssessment]);
    }

    public function replaceRisks(Request $request, WeeklyAssessment $weeklyAssessment): JsonResponse
    {
        $v = $request->validate([
            'risks' => 'required|array',
            'risks.*.ordering' => 'required|integer|min:1',
            'risks.*.severity' => 'required|in:critical,high,medium',
            'risks.*.text' => 'required|string|max:255',
        ]);
        DB::transaction(function () use ($weeklyAssessment, $v) {
            $weeklyAssessment->risks()->delete();
            foreach ($v['risks'] as $row) {
                WeeklyAssessmentRisk::create([
                    'weekly_assessment_id' => $weeklyAssessment->id,
                    'ordering' => $row['ordering'],
                    'severity' => $row['severity'],
                    'text' => $row['text'],
                ]);
            }
        });
        $weeklyAssessment->load('risks');
        return response()->json(['data' => $weeklyAssessment]);
    }
}
