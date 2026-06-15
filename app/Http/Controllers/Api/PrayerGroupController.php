<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrayerGroup;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrayerGroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = PrayerGroup::with('zone');
        if ($request->filled('crusade_id')) $q->where('crusade_id', $request->integer('crusade_id'));
        if ($request->filled('zone_id'))    $q->where('zone_id', $request->integer('zone_id'));
        if ($request->filled('status'))     $q->where('status', $request->string('status'));

        $groups = $q->orderBy('name')->get();

        $totalMembers = $groups->sum('members_count');
        $totalGroups  = $groups->count();

        return response()->json([
            'data' => $groups,
            'meta' => ['total_groups' => $totalGroups, 'total_members' => $totalMembers],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id'        => 'required|exists:crusades,id',
            'zone_id'           => 'nullable|exists:zones,id',
            'name'              => 'required|string|max:128',
            'leader_name'       => 'nullable|string|max:128',
            'leader_phone'      => 'nullable|string|max:32',
            'members_count'     => 'sometimes|integer|min:0',
            'meeting_frequency' => 'sometimes|in:daily,weekly,other',
            'meeting_day'       => 'nullable|string|max:16',
            'meeting_time'      => 'nullable|date_format:H:i',
            'location'          => 'nullable|string|max:128',
            'status'            => 'sometimes|string|max:16',
            'notes'             => 'nullable|string',
        ]);

        $group = PrayerGroup::create($v);
        ActivityLogger::log(
            $group->crusade_id,
            $request->user()?->id,
            'prayer',
            "Prayer group added: {$group->name} ({$group->members_count} members)",
        );
        return response()->json(['data' => $group->load('zone')], 201);
    }

    public function show(PrayerGroup $prayerGroup): JsonResponse
    {
        return response()->json(['data' => $prayerGroup->load(['zone', 'sessions'])]);
    }

    public function update(Request $request, PrayerGroup $prayerGroup): JsonResponse
    {
        $v = $request->validate([
            'zone_id'           => 'sometimes|nullable|exists:zones,id',
            'name'              => 'sometimes|string|max:128',
            'leader_name'       => 'sometimes|nullable|string|max:128',
            'leader_phone'      => 'sometimes|nullable|string|max:32',
            'members_count'     => 'sometimes|integer|min:0',
            'meeting_frequency' => 'sometimes|in:daily,weekly,other',
            'meeting_day'       => 'sometimes|nullable|string|max:16',
            'meeting_time'      => 'sometimes|nullable|date_format:H:i',
            'location'          => 'sometimes|nullable|string|max:128',
            'status'            => 'sometimes|string|max:16',
            'notes'             => 'sometimes|nullable|string',
        ]);

        $prayerGroup->update($v);
        return response()->json(['data' => $prayerGroup->load('zone')]);
    }

    public function destroy(PrayerGroup $prayerGroup): JsonResponse
    {
        $prayerGroup->delete();
        return response()->json(null, 204);
    }
}
