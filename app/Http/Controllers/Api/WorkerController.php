<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Worker;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkerController extends Controller
{
    private const GROUP_TYPES = [
        'choir', 'ushers', 'security', 'counsellors', 'prayer_warriors',
        'hospitality', 'technical', 'medical', 'womens', 'general',
    ];

    private const STATUSES = ['active', 'inactive'];

    public function index(Request $request): JsonResponse
    {
        $q = Worker::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('group_type')) {
            $q->where('group_type', $request->string('group_type'));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        return response()->json([
            'data' => $q->orderBy('group_type')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'zone_id' => 'nullable|exists:zones,id',
            'church_id' => 'nullable|exists:churches,id',
            'group_type' => 'required|in:' . implode(',', self::GROUP_TYPES),
            'name' => 'required|string|max:128',
            'role' => 'nullable|string|max:64',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email|max:128',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'notes' => 'nullable|string',
        ]);

        $v['status'] = $v['status'] ?? 'active';

        $worker = Worker::create($v);
        ActivityLogger::log(
            $worker->crusade_id,
            $request->user()?->id,
            'volunteers',
            "Worker added: {$worker->name} ({$worker->group_type})",
        );
        return response()->json(['data' => $worker], 201);
    }

    public function show(Worker $worker): JsonResponse
    {
        return response()->json(['data' => $worker]);
    }

    public function update(Request $request, Worker $worker): JsonResponse
    {
        $v = $request->validate([
            'contact_id' => 'sometimes|nullable|exists:contacts,id',
            'zone_id' => 'sometimes|nullable|exists:zones,id',
            'church_id' => 'sometimes|nullable|exists:churches,id',
            'group_type' => 'sometimes|in:' . implode(',', self::GROUP_TYPES),
            'name' => 'sometimes|string|max:128',
            'role' => 'sometimes|nullable|string|max:64',
            'phone' => 'sometimes|nullable|string|max:32',
            'email' => 'sometimes|nullable|email|max:128',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'notes' => 'sometimes|nullable|string',
        ]);

        $oldStatus = $worker->status;
        $worker->update($v);
        if (isset($v['status']) && $v['status'] !== $oldStatus) {
            ActivityLogger::log(
                $worker->crusade_id,
                $request->user()?->id,
                'volunteers',
                "Worker {$worker->name}: {$oldStatus} → {$worker->status}",
            );
        }
        return response()->json(['data' => $worker]);
    }

    public function destroy(Worker $worker): JsonResponse
    {
        $worker->delete();
        return response()->json(null, 204);
    }
}
