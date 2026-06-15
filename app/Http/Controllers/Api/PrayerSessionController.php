<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrayerGroup;
use App\Models\PrayerSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrayerSessionController extends Controller
{
    public function index(PrayerGroup $prayerGroup): JsonResponse
    {
        return response()->json(['data' => $prayerGroup->sessions()->orderByDesc('session_date')->get()]);
    }

    public function store(Request $request, PrayerGroup $prayerGroup): JsonResponse
    {
        $v = $request->validate([
            'session_date'    => 'required|date',
            'attendees_count' => 'sometimes|integer|min:0',
            'focus_theme'     => 'nullable|string|max:255',
            'notes'           => 'nullable|string',
        ]);

        $session = $prayerGroup->sessions()->create($v);
        return response()->json(['data' => $session], 201);
    }

    public function update(Request $request, PrayerGroup $prayerGroup, PrayerSession $prayerSession): JsonResponse
    {
        $v = $request->validate([
            'session_date'    => 'sometimes|date',
            'attendees_count' => 'sometimes|integer|min:0',
            'focus_theme'     => 'sometimes|nullable|string|max:255',
            'notes'           => 'sometimes|nullable|string',
        ]);

        $prayerSession->update($v);
        return response()->json(['data' => $prayerSession]);
    }

    public function destroy(PrayerGroup $prayerGroup, PrayerSession $prayerSession): JsonResponse
    {
        $prayerSession->delete();
        return response()->json(null, 204);
    }
}
