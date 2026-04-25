<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PledgeMeeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PledgeMeetingAttendanceController extends Controller
{
    public function store(Request $request, PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $validated = $request->validate([
            'pastor_ids' => 'required|array|min:1',
            'pastor_ids.*' => 'integer|exists:pastors,id',
        ]);
        $pledgeMeeting->attendees()->syncWithoutDetaching($validated['pastor_ids']);

        return response()->json([
            'data' => ['attendees_count' => $pledgeMeeting->attendees()->count()],
        ]);
    }
}
