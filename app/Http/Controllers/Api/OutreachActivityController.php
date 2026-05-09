<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OutreachActivity;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OutreachActivityController extends Controller
{
    private const KINDS = ['door_to_door', 'convoy'];

    public function index(Request $request): JsonResponse
    {
        $q = OutreachActivity::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('kind')) {
            $q->where('kind', $request->string('kind'));
        }
        if ($request->filled('zone_id')) {
            $q->where('zone_id', $request->integer('zone_id'));
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
            'kind' => 'required|in:' . implode(',', self::KINDS),
            'occurred_on' => 'required|date',
            'zone_id' => 'nullable|exists:zones,id',
            'team_lead_name' => 'nullable|string|max:128',
            'households_reached' => 'nullable|integer|min:0',
            'conversations_count' => 'nullable|integer|min:0',
            'pamphlets_distributed' => 'nullable|integer|min:0',
            'route_summary' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $activity = OutreachActivity::create($v);
        $kindLabel = $activity->kind === 'door_to_door' ? 'Door-to-door' : 'Convoy';
        $reachBits = [];
        if ($activity->households_reached) $reachBits[] = "{$activity->households_reached} households";
        if ($activity->conversations_count) $reachBits[] = "{$activity->conversations_count} convos";
        $reach = $reachBits ? ' — ' . implode(', ', $reachBits) : '';
        ActivityLogger::log(
            $activity->crusade_id,
            $request->user()?->id,
            'awareness',
            "{$kindLabel} outreach{$reach}",
        );
        return response()->json(['data' => $activity], 201);
    }

    public function show(OutreachActivity $outreachActivity): JsonResponse
    {
        return response()->json(['data' => $outreachActivity]);
    }

    public function update(Request $request, OutreachActivity $outreachActivity): JsonResponse
    {
        $v = $request->validate([
            'occurred_on' => 'sometimes|date',
            'zone_id' => 'sometimes|nullable|exists:zones,id',
            'team_lead_name' => 'sometimes|nullable|string|max:128',
            'households_reached' => 'sometimes|nullable|integer|min:0',
            'conversations_count' => 'sometimes|nullable|integer|min:0',
            'pamphlets_distributed' => 'sometimes|nullable|integer|min:0',
            'route_summary' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
        ]);

        $outreachActivity->update($v);
        return response()->json(['data' => $outreachActivity]);
    }

    public function destroy(OutreachActivity $outreachActivity): JsonResponse
    {
        $outreachActivity->delete();
        return response()->json(null, 204);
    }
}
