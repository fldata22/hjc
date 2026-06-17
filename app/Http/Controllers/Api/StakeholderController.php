<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Stakeholder;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StakeholderController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Stakeholder::orderByDesc('pipeline_stage')->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'name' => 'required|string|max:128',
            'org' => 'required|string|max:128',
            'role' => 'required|string|max:64',
            'pipeline_stage' => 'required|integer|min:1|max:4',
            'status_label' => 'required|in:identified,engaged,committed,won',
            'last_contact_at' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);
        $stakeholder = Stakeholder::create($v);
        ActivityLogger::log(
            $stakeholder->crusade_id,
            $request->user()?->id,
            'govt',
            "Stakeholder added: {$stakeholder->name} ({$stakeholder->role}, {$stakeholder->org})",
        );
        return response()->json(['data' => $stakeholder], 201);
    }

    public function show(Stakeholder $stakeholder): JsonResponse { return response()->json(['data' => $stakeholder]); }

    public function update(Request $request, Stakeholder $stakeholder): JsonResponse
    {
        $v = $request->validate([
            'contact_id' => 'sometimes|nullable|exists:contacts,id',
            'name' => 'sometimes|string|max:128',
            'org' => 'sometimes|string|max:128',
            'role' => 'sometimes|string|max:64',
            'pipeline_stage' => 'sometimes|integer|min:1|max:4',
            'status_label' => 'sometimes|in:identified,engaged,committed,won',
            'last_contact_at' => 'sometimes|nullable|date',
            'notes' => 'sometimes|nullable|string|max:255',
        ]);
        $oldLabel = $stakeholder->status_label;
        $stakeholder->update($v);
        if (isset($v['status_label']) && $v['status_label'] !== $oldLabel) {
            ActivityLogger::log(
                $stakeholder->crusade_id,
                $request->user()?->id,
                'govt',
                "Stakeholder {$stakeholder->name}: {$oldLabel} → {$stakeholder->status_label}",
            );
        }
        return response()->json(['data' => $stakeholder]);
    }

    public function destroy(Stakeholder $stakeholder): JsonResponse
    {
        $stakeholder->delete();
        return response()->json(null, 204);
    }
}
