<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PledgeMeeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PledgeMeetingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => PledgeMeeting::orderBy('held_on')->withCount('attendees')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'sequence' => [
                'required', 'string', 'max:8',
                Rule::unique('pledge_meetings')->where(fn ($q) => $q->where('crusade_id', $request->crusade_id)),
            ],
            'held_on' => 'required|date',
            'venue' => 'required|string|max:255',
            'status' => 'nullable|in:upcoming,done',
        ]);
        $meeting = PledgeMeeting::create($validated);
        return response()->json(['data' => $meeting], 201);
    }

    public function show(PledgeMeeting $pledgeMeeting): JsonResponse
    {
        return response()->json(['data' => $pledgeMeeting->loadCount('attendees')]);
    }

    public function update(Request $request, PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $validated = $request->validate([
            'sequence' => 'sometimes|string|max:8',
            'held_on' => 'sometimes|date',
            'venue' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:upcoming,done',
        ]);
        $pledgeMeeting->update($validated);
        return response()->json(['data' => $pledgeMeeting]);
    }

    public function destroy(PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $pledgeMeeting->delete();
        return response()->json(null, 204);
    }
}
