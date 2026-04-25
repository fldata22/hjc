<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pastor;
use App\Models\PastorIdentification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PastorIdentificationController extends Controller
{
    public function index(Pastor $pastor): JsonResponse
    {
        return response()->json(['data' => $pastor->identifications()->orderBy('assigned_at', 'desc')->get()]);
    }

    public function store(Request $request, Pastor $pastor): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|max:32',
            'sub_role' => 'nullable|string|max:32',
            'assigned_at' => 'required|date',
        ]);
        $validated['pastor_id'] = $pastor->id;
        $validated['assigned_by_user_id'] = $request->user()->id;
        $ident = PastorIdentification::create($validated);
        return response()->json(['data' => $ident], 201);
    }
}
