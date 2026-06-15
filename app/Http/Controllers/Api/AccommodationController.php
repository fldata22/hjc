<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccommodationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Accommodation::query();
        if ($request->filled('crusade_id')) $q->where('crusade_id', $request->integer('crusade_id'));
        if ($request->filled('type'))       $q->where('type', $request->string('type'));
        if ($request->filled('status'))     $q->where('status', $request->string('status'));

        return response()->json(['data' => $q->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id'            => 'required|exists:crusades,id',
            'name'                  => 'required|string|max:128',
            'type'                  => 'required|in:hotel,guesthouse,hostel,private,other',
            'address'               => 'nullable|string|max:255',
            'capacity'              => 'sometimes|integer|min:0',
            'occupants_description' => 'nullable|string',
            'contact_name'          => 'nullable|string|max:128',
            'contact_phone'         => 'nullable|string|max:32',
            'check_in_date'         => 'nullable|date',
            'check_out_date'        => 'nullable|date|after_or_equal:check_in_date',
            'cost_per_night'        => 'sometimes|numeric|min:0',
            'currency'              => 'sometimes|string|size:3',
            'status'                => 'sometimes|in:pending,confirmed,cancelled',
            'notes'                 => 'nullable|string',
        ]);

        $accommodation = Accommodation::create($v);
        ActivityLogger::log(
            $accommodation->crusade_id,
            $request->user()?->id,
            'welfare',
            "Accommodation added: {$accommodation->name} ({$accommodation->type}, capacity {$accommodation->capacity})",
        );
        return response()->json(['data' => $accommodation], 201);
    }

    public function show(Accommodation $accommodation): JsonResponse
    {
        return response()->json(['data' => $accommodation]);
    }

    public function update(Request $request, Accommodation $accommodation): JsonResponse
    {
        $v = $request->validate([
            'name'                  => 'sometimes|string|max:128',
            'type'                  => 'sometimes|in:hotel,guesthouse,hostel,private,other',
            'address'               => 'sometimes|nullable|string|max:255',
            'capacity'              => 'sometimes|integer|min:0',
            'occupants_description' => 'sometimes|nullable|string',
            'contact_name'          => 'sometimes|nullable|string|max:128',
            'contact_phone'         => 'sometimes|nullable|string|max:32',
            'check_in_date'         => 'sometimes|nullable|date',
            'check_out_date'        => 'sometimes|nullable|date',
            'cost_per_night'        => 'sometimes|numeric|min:0',
            'currency'              => 'sometimes|string|size:3',
            'status'                => 'sometimes|in:pending,confirmed,cancelled',
            'notes'                 => 'sometimes|nullable|string',
        ]);

        $accommodation->update($v);
        return response()->json(['data' => $accommodation]);
    }

    public function destroy(Accommodation $accommodation): JsonResponse
    {
        $accommodation->delete();
        return response()->json(null, 204);
    }
}
