<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TownProfile;
use App\Models\Zone;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TownProfileController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => TownProfile::all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id|unique:town_profiles,zone_id',
            'language_primary' => 'nullable|string|max:64',
            'language_secondary' => 'nullable|string|max:64',
            'religion_primary' => 'nullable|string|max:64',
            'religion_mix_notes' => 'nullable|string',
            'prior_crusade_year' => 'nullable|integer|min:1900|max:2100',
            'prior_crusade_notes' => 'nullable|string',
            'key_contacts' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $profile = TownProfile::create($validated);
        $zone = Zone::find($profile->zone_id);
        if ($zone) {
            ActivityLogger::log(
                $zone->crusade_id,
                $request->user()?->id,
                'awareness',
                "Town profile logged for {$zone->code} ({$zone->name})",
            );
        }
        return response()->json(['data' => $profile], 201);
    }

    public function show(TownProfile $townProfile): JsonResponse
    {
        return response()->json(['data' => $townProfile]);
    }

    public function update(Request $request, TownProfile $townProfile): JsonResponse
    {
        $validated = $request->validate([
            'language_primary' => 'sometimes|nullable|string|max:64',
            'language_secondary' => 'sometimes|nullable|string|max:64',
            'religion_primary' => 'sometimes|nullable|string|max:64',
            'religion_mix_notes' => 'sometimes|nullable|string',
            'prior_crusade_year' => 'sometimes|nullable|integer|min:1900|max:2100',
            'prior_crusade_notes' => 'sometimes|nullable|string',
            'key_contacts' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
        ]);

        $townProfile->update($validated);
        return response()->json(['data' => $townProfile]);
    }

    public function destroy(TownProfile $townProfile): JsonResponse
    {
        $townProfile->delete();
        return response()->json(null, 204);
    }
}
