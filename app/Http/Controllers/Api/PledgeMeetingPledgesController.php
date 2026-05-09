<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PledgeMeetingPledgesController extends Controller
{
    public function store(Request $request, PledgeMeeting $pledgeMeeting): JsonResponse
    {
        $validated = $request->validate([
            'pledges' => 'required|array|min:1',
            'pledges.*.pastor_id' => 'required|integer|exists:pastors,id',
            'pledges.*.resource' => 'required|in:choir,prayer,ushers,counsellors,buses,money',
            'pledges.*.quantity' => 'required|numeric|min:0',
        ]);

        $created = 0;
        foreach ($validated['pledges'] as $row) {
            Pledge::create([
                'pastor_id' => $row['pastor_id'],
                'pledge_meeting_id' => $pledgeMeeting->id,
                'resource' => $row['resource'],
                'quantity' => $row['quantity'],
            ]);
            $created++;
        }

        ActivityLogger::log(
            $pledgeMeeting->crusade_id,
            $request->user()?->id,
            'pledges',
            "{$created} pledge" . ($created === 1 ? '' : 's') . " logged at meeting #{$pledgeMeeting->sequence}",
        );

        return response()->json(['data' => ['created' => $created]]);
    }
}
