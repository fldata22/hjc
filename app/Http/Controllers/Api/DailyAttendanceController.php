<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyAttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = DailyAttendance::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('date_from')) {
            $q->where('counted_on', '>=', $request->date('date_from'));
        }
        if ($request->filled('date_to')) {
            $q->where('counted_on', '<=', $request->date('date_to'));
        }

        return response()->json([
            'data' => $q->orderByDesc('counted_on')->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'counted_on' => 'required|date',
            'count' => 'required|integer|min:0',
            'estimation_method' => 'nullable|string|max:64',
            'notes' => 'nullable|string',
        ]);

        return response()->json(['data' => DailyAttendance::create($v)], 201);
    }

    public function show(DailyAttendance $dailyAttendance): JsonResponse
    {
        return response()->json(['data' => $dailyAttendance]);
    }

    public function update(Request $request, DailyAttendance $dailyAttendance): JsonResponse
    {
        $v = $request->validate([
            'counted_on' => 'sometimes|date',
            'count' => 'sometimes|integer|min:0',
            'estimation_method' => 'sometimes|nullable|string|max:64',
            'notes' => 'sometimes|nullable|string',
        ]);

        $dailyAttendance->update($v);
        return response()->json(['data' => $dailyAttendance]);
    }

    public function destroy(DailyAttendance $dailyAttendance): JsonResponse
    {
        $dailyAttendance->delete();
        return response()->json(null, 204);
    }
}
