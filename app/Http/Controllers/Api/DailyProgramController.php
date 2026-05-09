<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyProgram;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = DailyProgram::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('date_from')) {
            $q->where('occurred_on', '>=', $request->date('date_from'));
        }
        if ($request->filled('date_to')) {
            $q->where('occurred_on', '<=', $request->date('date_to'));
        }

        return response()->json([
            'data' => $q->orderByDesc('occurred_on')->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'occurred_on' => 'required|date',
            'speaker' => 'nullable|string|max:128',
            'topic' => 'nullable|string|max:255',
            'duration_minutes' => 'nullable|integer|min:0|max:1440',
            'key_moments' => 'nullable|string',
            'narrative' => 'nullable|string',
        ]);

        return response()->json(['data' => DailyProgram::create($v)], 201);
    }

    public function show(DailyProgram $dailyProgram): JsonResponse
    {
        return response()->json(['data' => $dailyProgram]);
    }

    public function update(Request $request, DailyProgram $dailyProgram): JsonResponse
    {
        $v = $request->validate([
            'occurred_on' => 'sometimes|date',
            'speaker' => 'sometimes|nullable|string|max:128',
            'topic' => 'sometimes|nullable|string|max:255',
            'duration_minutes' => 'sometimes|nullable|integer|min:0|max:1440',
            'key_moments' => 'sometimes|nullable|string',
            'narrative' => 'sometimes|nullable|string',
        ]);

        $dailyProgram->update($v);
        return response()->json(['data' => $dailyProgram]);
    }

    public function destroy(DailyProgram $dailyProgram): JsonResponse
    {
        $dailyProgram->delete();
        return response()->json(null, 204);
    }
}
