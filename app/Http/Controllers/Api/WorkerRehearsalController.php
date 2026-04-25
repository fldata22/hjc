<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkerRehearsal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkerRehearsalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = WorkerRehearsal::query();
        if ($request->filled('zone_id')) $q->where('zone_id', $request->integer('zone_id'));
        if ($request->filled('group')) $q->where('group', $request->string('group'));
        if ($request->filled('session_number')) $q->where('session_number', $request->integer('session_number'));
        return response()->json(['data' => $q->orderBy('zone_id')->orderBy('group')->orderBy('session_number')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'zone_id' => 'required|exists:zones,id',
            'group' => 'required|in:choir,prayer,ushers,counsellors',
            'session_number' => [
                'required', 'integer', 'min:1',
                Rule::unique('worker_rehearsals')->where(fn ($q) => $q
                    ->where('crusade_id', $request->crusade_id)
                    ->where('zone_id', $request->zone_id)
                    ->where('group', $request->group)),
            ],
            'attendance_count' => 'required|integer|min:0',
        ]);
        $r = WorkerRehearsal::create($validated);
        return response()->json(['data' => $r], 201);
    }

    public function update(Request $request, WorkerRehearsal $workerRehearsal): JsonResponse
    {
        $validated = $request->validate([
            'attendance_count' => 'sometimes|integer|min:0',
        ]);
        $workerRehearsal->update($validated);
        return response()->json(['data' => $workerRehearsal]);
    }
}
