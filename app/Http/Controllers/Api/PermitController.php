<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permit;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermitController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Permit::orderBy('name')->get();
        $counts = Permit::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        return response()->json([
            'data' => $rows,
            'meta' => [
                'status_counts' => [
                    'in_review' => (int) ($counts['in_review'] ?? 0),
                    'approved' => (int) ($counts['approved'] ?? 0),
                    'rejected' => (int) ($counts['rejected'] ?? 0),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'agency' => 'required|string|max:128',
            'status' => 'nullable|in:in_review,approved,rejected',
            'due_on' => 'nullable|date',
            'signed_on' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);
        $permit = Permit::create($v);
        ActivityLogger::log(
            $permit->crusade_id,
            $request->user()?->id,
            'govt',
            "Permit lodged: {$permit->name} ({$permit->agency})",
            $permit->status === 'approved' ? 'done' : 'running',
        );
        return response()->json(['data' => $permit], 201);
    }

    public function show(Permit $permit): JsonResponse { return response()->json(['data' => $permit]); }

    public function update(Request $request, Permit $permit): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'agency' => 'sometimes|string|max:128',
            'status' => 'sometimes|in:in_review,approved,rejected',
            'due_on' => 'sometimes|nullable|date',
            'signed_on' => 'sometimes|nullable|date',
            'notes' => 'sometimes|nullable|string|max:255',
        ]);
        $oldStatus = $permit->status;
        $permit->update($v);
        if (isset($v['status']) && $v['status'] !== $oldStatus) {
            ActivityLogger::log(
                $permit->crusade_id,
                $request->user()?->id,
                'govt',
                "Permit {$permit->name}: {$oldStatus} → {$permit->status}",
                $permit->status === 'approved' ? 'done' : 'running',
            );
        }
        return response()->json(['data' => $permit]);
    }

    public function destroy(Permit $permit): JsonResponse
    {
        $permit->delete();
        return response()->json(null, 204);
    }
}
