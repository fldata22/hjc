<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PledgeMeeting;
use App\Services\ActivityLogger;
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
        $added = count($validated['pastor_ids']);
        $pledgeMeeting->attendees()->syncWithoutDetaching($validated['pastor_ids']);
        ActivityLogger::log(
            $pledgeMeeting->crusade_id,
            $request->user()?->id,
            'pledges',
            "{$added} pastor" . ($added === 1 ? '' : 's') . " logged at pledge meeting #{$pledgeMeeting->sequence}",
        );

        return response()->json([
            'data' => ['attendees_count' => $pledgeMeeting->attendees()->count()],
        ]);
    }
}
