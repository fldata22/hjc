<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LandElder;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LandElderController extends Controller
{
    private const STATUSES = ['identified', 'courted', 'blessed', 'neutral', 'opposed'];

    public function index(Request $request): JsonResponse
    {
        $q = LandElder::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        return response()->json([
            'data' => $q->orderBy('status')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'title' => 'nullable|string|max:64',
            'region' => 'nullable|string|max:128',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email|max:128',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'last_contact_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $v['status'] = $v['status'] ?? 'identified';

        $elder = LandElder::create($v);
        $titlePart = $elder->title ? "{$elder->title} " : '';
        ActivityLogger::log(
            $elder->crusade_id,
            $request->user()?->id,
            'govt',
            "Land elder added: {$titlePart}{$elder->name}",
        );
        return response()->json(['data' => $elder], 201);
    }

    public function show(LandElder $landElder): JsonResponse
    {
        return response()->json(['data' => $landElder]);
    }

    public function update(Request $request, LandElder $landElder): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'title' => 'sometimes|nullable|string|max:64',
            'region' => 'sometimes|nullable|string|max:128',
            'phone' => 'sometimes|nullable|string|max:32',
            'email' => 'sometimes|nullable|email|max:128',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'last_contact_at' => 'sometimes|nullable|date',
            'notes' => 'sometimes|nullable|string',
        ]);

        $oldStatus = $landElder->status;
        $landElder->update($v);
        if (isset($v['status']) && $v['status'] !== $oldStatus) {
            ActivityLogger::log(
                $landElder->crusade_id,
                $request->user()?->id,
                'govt',
                "Land elder {$landElder->name}: {$oldStatus} → {$landElder->status}",
            );
        }
        return response()->json(['data' => $landElder]);
    }

    public function destroy(LandElder $landElder): JsonResponse
    {
        $landElder->delete();
        return response()->json(null, 204);
    }
}
