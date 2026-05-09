<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MustDoItem;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MustDoItemController extends Controller
{
    private const AREAS = ['venue', 'publicity', 'permits', 'logistics', 'other'];
    private const STATUSES = ['pending', 'in_progress', 'done'];

    public function index(Request $request): JsonResponse
    {
        $q = MustDoItem::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('area')) {
            $q->where('area', $request->string('area'));
        }

        return response()->json([
            'data' => $q->orderBy('area')->orderBy('due_date')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'area' => 'required|in:' . implode(',', self::AREAS),
            'title' => 'required|string|max:255',
            'owner_name' => 'nullable|string|max:128',
            'due_date' => 'nullable|date',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'notes' => 'nullable|string',
        ]);

        $v['status'] = $v['status'] ?? 'pending';

        $item = MustDoItem::create($v);
        ActivityLogger::log(
            $item->crusade_id,
            $request->user()?->id,
            'equipment',
            "Must-do added ({$item->area}): {$item->title}",
            $item->status === 'done' ? 'done' : 'running',
        );
        return response()->json(['data' => $item], 201);
    }

    public function show(MustDoItem $mustDoItem): JsonResponse
    {
        return response()->json(['data' => $mustDoItem]);
    }

    public function update(Request $request, MustDoItem $mustDoItem): JsonResponse
    {
        $v = $request->validate([
            'area' => 'sometimes|in:' . implode(',', self::AREAS),
            'title' => 'sometimes|string|max:255',
            'owner_name' => 'sometimes|nullable|string|max:128',
            'due_date' => 'sometimes|nullable|date',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'notes' => 'sometimes|nullable|string',
        ]);

        $oldStatus = $mustDoItem->status;
        $mustDoItem->update($v);
        if (isset($v['status']) && $v['status'] !== $oldStatus) {
            ActivityLogger::log(
                $mustDoItem->crusade_id,
                $request->user()?->id,
                'equipment',
                "Must-do \"{$mustDoItem->title}\": {$oldStatus} → {$mustDoItem->status}",
                $mustDoItem->status === 'done' ? 'done' : 'running',
            );
        }
        return response()->json(['data' => $mustDoItem]);
    }

    public function destroy(MustDoItem $mustDoItem): JsonResponse
    {
        $mustDoItem->delete();
        return response()->json(null, 204);
    }
}
