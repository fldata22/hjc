<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crusade;
use App\Models\SoundLightingPlan;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SoundLightingPlanController extends Controller
{
    public function show(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();
        $plan = SoundLightingPlan::where('crusade_id', $crusade->id)->first();
        return response()->json(['data' => $plan]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $crusade = Crusade::firstOrFail();

        $v = $request->validate([
            'sound_provider' => 'nullable|string|max:128',
            'sound_capacity_notes' => 'nullable|string',
            'lighting_provider' => 'nullable|string|max:128',
            'lighting_setup_notes' => 'nullable|string',
            'generator_provider' => 'nullable|string|max:128',
            'generator_kva' => 'nullable|integer|min:0|max:10000',
            'has_backup_power' => 'nullable|boolean',
            'power_notes' => 'nullable|string',
            'equipment_notes' => 'nullable|string',
        ]);

        $existed = SoundLightingPlan::where('crusade_id', $crusade->id)->exists();
        $plan = SoundLightingPlan::updateOrCreate(
            ['crusade_id' => $crusade->id],
            $v,
        );
        ActivityLogger::log(
            $crusade->id,
            $request->user()?->id,
            'equipment',
            $existed ? 'Sound & lighting plan updated' : 'Sound & lighting plan drafted',
        );

        return response()->json(['data' => $plan->fresh()], 200);
    }
}
