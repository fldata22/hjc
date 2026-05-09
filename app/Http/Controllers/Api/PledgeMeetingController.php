<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PledgeMeeting;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PledgeMeetingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginator = PledgeMeeting::orderBy('held_on')->withCount('attendees')
            ->paginate(min((int) $request->integer('per_page', 25), 100));
        return response()->json([
            'data' => $paginator->items(),
            'meta' => ['current_page' => $paginator->currentPage(), 'total' => $paginator->total(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage()],
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
        ActivityLogger::log(
            $meeting->crusade_id,
            $request->user()?->id,
            'pledges',
            "Pledge meeting #{$meeting->sequence} scheduled at {$meeting->venue} ({$meeting->held_on->toDateString()})",
            $meeting->status === 'done' ? 'done' : 'running',
        );
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
