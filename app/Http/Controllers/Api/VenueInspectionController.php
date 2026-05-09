<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VenueInspection;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VenueInspectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = VenueInspection::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('date_from')) {
            $q->where('inspected_at', '>=', $request->date('date_from'));
        }
        if ($request->filled('date_to')) {
            $q->where('inspected_at', '<=', $request->date('date_to'));
        }

        return response()->json(['data' => $q->orderByDesc('inspected_at')->orderByDesc('id')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'inspected_at' => 'required|date',
            'inspector_name' => 'required|string|max:128',
            'capacity_verified' => 'nullable|boolean',
            'exits_clear' => 'nullable|boolean',
            'power_tested' => 'nullable|boolean',
            'sound_tested' => 'nullable|boolean',
            'permits_status' => 'nullable|string',
            'photo' => 'nullable|image|max:5120',
            'notes' => 'nullable|string',
        ]);

        $photo = $request->file('photo');
        if ($photo) {
            $path = $photo->store('inspections', 'public');
            $v['photo_url'] = Storage::url($path);
        }
        unset($v['photo']);

        $inspection = VenueInspection::create($v);
        ActivityLogger::log(
            $inspection->crusade_id,
            $request->user()?->id,
            'equipment',
            "Venue inspected by {$inspection->inspector_name}",
        );
        return response()->json(['data' => $inspection], 201);
    }

    public function show(VenueInspection $venueInspection): JsonResponse
    {
        return response()->json(['data' => $venueInspection]);
    }

    public function update(Request $request, VenueInspection $venueInspection): JsonResponse
    {
        $v = $request->validate([
            'inspected_at' => 'sometimes|date',
            'inspector_name' => 'sometimes|string|max:128',
            'capacity_verified' => 'sometimes|boolean',
            'exits_clear' => 'sometimes|boolean',
            'power_tested' => 'sometimes|boolean',
            'sound_tested' => 'sometimes|boolean',
            'permits_status' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
        ]);

        $venueInspection->update($v);
        return response()->json(['data' => $venueInspection]);
    }

    public function destroy(VenueInspection $venueInspection): JsonResponse
    {
        $venueInspection->delete();
        return response()->json(null, 204);
    }
}
