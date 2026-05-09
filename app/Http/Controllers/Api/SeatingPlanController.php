<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crusade;
use App\Models\SeatingPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeatingPlanController extends Controller
{
    public function show(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();
        $plan = SeatingPlan::where('crusade_id', $crusade->id)->first();
        return response()->json(['data' => $plan]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $crusade = Crusade::firstOrFail();

        $v = $request->validate([
            'estimated_capacity' => 'nullable|integer|min:0|max:1000000',
            'vip_seating_count' => 'nullable|integer|min:0|max:1000000',
            'general_seating_count' => 'nullable|integer|min:0|max:1000000',
            'counsellor_area_count' => 'nullable|integer|min:0|max:1000000',
            'chair_source' => 'nullable|string|max:128',
            'layout_notes' => 'nullable|string',
        ]);

        $plan = SeatingPlan::updateOrCreate(
            ['crusade_id' => $crusade->id],
            $v,
        );

        return response()->json(['data' => $plan->fresh()], 200);
    }
}
