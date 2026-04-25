<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Committee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommitteeController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Committee::orderBy('name')->get();
        $counts = Committee::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        return response()->json([
            'data' => $rows,
            'meta' => [
                'eyebrow_stats' => [
                    'on_track' => (int) ($counts['on_track'] ?? 0),
                    'watch' => (int) ($counts['watch'] ?? 0),
                    'at_risk' => (int) ($counts['at_risk'] ?? 0),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:64',
            'chair_name' => 'required|string|max:128',
            'focus_area' => 'nullable|string|max:32',
            'status' => 'nullable|in:on_track,watch,at_risk',
            'deliverables_done_pct' => 'nullable|integer|min:0|max:100',
            'member_count' => 'nullable|integer|min:0',
            'next_meeting_on' => 'nullable|date',
        ]);
        return response()->json(['data' => Committee::create($v)], 201);
    }

    public function show(Committee $committee): JsonResponse { return response()->json(['data' => $committee]); }

    public function update(Request $request, Committee $committee): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:64',
            'chair_name' => 'sometimes|string|max:128',
            'focus_area' => 'sometimes|nullable|string|max:32',
            'status' => 'sometimes|in:on_track,watch,at_risk',
            'deliverables_done_pct' => 'sometimes|integer|min:0|max:100',
            'member_count' => 'sometimes|integer|min:0',
            'next_meeting_on' => 'sometimes|nullable|date',
        ]);
        $committee->update($v);
        return response()->json(['data' => $committee]);
    }

    public function destroy(Committee $committee): JsonResponse
    {
        $committee->delete();
        return response()->json(null, 204);
    }
}
