<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkerShift;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkerShiftController extends Controller
{
    private const GROUP_TYPES = [
        'choir', 'ushers', 'security', 'counsellors', 'prayer_warriors',
        'hospitality', 'technical', 'medical', 'womens', 'general',
    ];

    public function index(Request $request): JsonResponse
    {
        $q = WorkerShift::with('worker');
        if ($request->filled('crusade_id')) $q->where('crusade_id', $request->integer('crusade_id'));
        if ($request->filled('shift_date'))  $q->where('shift_date', $request->string('shift_date'));
        if ($request->filled('group_type'))  $q->where('group_type', $request->string('group_type'));
        if ($request->filled('status'))      $q->where('status', $request->string('status'));
        if ($request->filled('worker_id'))   $q->where('worker_id', $request->integer('worker_id'));

        return response()->json(['data' => $q->orderBy('shift_date')->orderBy('start_time')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'worker_id'  => 'nullable|exists:workers,id',
            'group_type' => 'required|in:' . implode(',', self::GROUP_TYPES),
            'shift_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i|after:start_time',
            'location'   => 'nullable|string|max:128',
            'status'     => 'sometimes|in:scheduled,attended,absent',
            'notes'      => 'nullable|string',
        ]);

        $shift = WorkerShift::create($v);
        ActivityLogger::log(
            $shift->crusade_id,
            $request->user()?->id,
            'volunteers',
            "Shift scheduled: {$shift->group_type} on {$shift->shift_date->toDateString()} {$shift->start_time}–{$shift->end_time}",
        );
        return response()->json(['data' => $shift->load('worker')], 201);
    }

    public function show(WorkerShift $workerShift): JsonResponse
    {
        return response()->json(['data' => $workerShift->load('worker')]);
    }

    public function update(Request $request, WorkerShift $workerShift): JsonResponse
    {
        $v = $request->validate([
            'worker_id'  => 'sometimes|nullable|exists:workers,id',
            'group_type' => 'sometimes|in:' . implode(',', self::GROUP_TYPES),
            'shift_date' => 'sometimes|date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time'   => 'sometimes|date_format:H:i',
            'location'   => 'sometimes|nullable|string|max:128',
            'status'     => 'sometimes|in:scheduled,attended,absent',
            'notes'      => 'sometimes|nullable|string',
        ]);

        $oldStatus = $workerShift->status;
        $workerShift->update($v);

        if (isset($v['status']) && $v['status'] !== $oldStatus) {
            ActivityLogger::log(
                $workerShift->crusade_id,
                $request->user()?->id,
                'volunteers',
                "Shift {$workerShift->shift_date->toDateString()} ({$workerShift->group_type}): {$oldStatus} → {$workerShift->status}",
            );
        }
        return response()->json(['data' => $workerShift->load('worker')]);
    }

    public function destroy(WorkerShift $workerShift): JsonResponse
    {
        $workerShift->delete();
        return response()->json(null, 204);
    }
}
