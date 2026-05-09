<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidentController extends Controller
{
    private const KINDS = ['security', 'medical'];
    private const SEVERITIES = ['low', 'medium', 'high'];

    public function index(Request $request): JsonResponse
    {
        $q = Incident::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('kind')) {
            $q->where('kind', $request->string('kind'));
        }
        if ($request->filled('severity')) {
            $q->where('severity', $request->string('severity'));
        }
        if ($request->filled('date_from')) {
            $q->where('occurred_on', '>=', $request->date('date_from'));
        }
        if ($request->filled('date_to')) {
            $q->where('occurred_on', '<=', $request->date('date_to'));
        }

        return response()->json([
            'data' => $q->orderByDesc('occurred_on')->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'kind' => 'required|in:' . implode(',', self::KINDS),
            'occurred_on' => 'required|date',
            'occurred_at_time' => 'nullable|date_format:H:i',
            'severity' => 'sometimes|in:' . implode(',', self::SEVERITIES),
            'location' => 'nullable|string|max:128',
            'description' => 'required|string',
            'response_taken' => 'nullable|string',
            'transported_to' => 'nullable|string|max:128',
            'resolution' => 'nullable|string',
        ]);

        $v['severity'] = $v['severity'] ?? 'low';

        return response()->json(['data' => Incident::create($v)], 201);
    }

    public function show(Incident $incident): JsonResponse
    {
        return response()->json(['data' => $incident]);
    }

    public function update(Request $request, Incident $incident): JsonResponse
    {
        $v = $request->validate([
            'occurred_on' => 'sometimes|date',
            'occurred_at_time' => 'sometimes|nullable|date_format:H:i',
            'severity' => 'sometimes|in:' . implode(',', self::SEVERITIES),
            'location' => 'sometimes|nullable|string|max:128',
            'description' => 'sometimes|string',
            'response_taken' => 'sometimes|nullable|string',
            'transported_to' => 'sometimes|nullable|string|max:128',
            'resolution' => 'sometimes|nullable|string',
        ]);

        $incident->update($v);
        return response()->json(['data' => $incident]);
    }

    public function destroy(Incident $incident): JsonResponse
    {
        $incident->delete();
        return response()->json(null, 204);
    }
}
