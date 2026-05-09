<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyDecision;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyDecisionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = DailyDecision::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('date_from')) {
            $q->where('decided_on', '>=', $request->date('date_from'));
        }
        if ($request->filled('date_to')) {
            $q->where('decided_on', '<=', $request->date('date_to'));
        }

        return response()->json([
            'data' => $q->orderByDesc('decided_on')->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'decided_on' => 'required|date',
            'salvations' => 'sometimes|integer|min:0',
            'rededications' => 'sometimes|integer|min:0',
            'healings' => 'sometimes|integer|min:0',
            'counselled' => 'sometimes|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        return response()->json(['data' => DailyDecision::create($v)], 201);
    }

    public function show(DailyDecision $dailyDecision): JsonResponse
    {
        return response()->json(['data' => $dailyDecision]);
    }

    public function update(Request $request, DailyDecision $dailyDecision): JsonResponse
    {
        $v = $request->validate([
            'decided_on' => 'sometimes|date',
            'salvations' => 'sometimes|integer|min:0',
            'rededications' => 'sometimes|integer|min:0',
            'healings' => 'sometimes|integer|min:0',
            'counselled' => 'sometimes|integer|min:0',
            'notes' => 'sometimes|nullable|string',
        ]);

        $dailyDecision->update($v);
        return response()->json(['data' => $dailyDecision]);
    }

    public function destroy(DailyDecision $dailyDecision): JsonResponse
    {
        $dailyDecision->delete();
        return response()->json(null, 204);
    }
}
