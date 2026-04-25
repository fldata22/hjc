<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pastor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PastorController extends Controller
{
    public function stageCounts(): JsonResponse
    {
        $counts = Pastor::selectRaw('pipeline_stage, COUNT(*) as n')->groupBy('pipeline_stage')->pluck('n', 'pipeline_stage');
        $stages = ['identified', 'engaged', 'committed', 'active', 'champion'];
        $data = [];
        $total = 0;
        foreach ($stages as $s) {
            $n = (int) ($counts[$s] ?? 0);
            $data[$s] = $n;
            $total += $n;
        }
        $data['total'] = $total;
        return response()->json(['data' => $data]);
    }

    public function index(Request $request): JsonResponse
    {
        $q = Pastor::query();

        if ($request->filled('pipeline_stage')) {
            $q->where('pipeline_stage', $request->string('pipeline_stage'));
        }
        if ($request->filled('zone_id')) {
            $q->where('zone_id', $request->integer('zone_id'));
        }
        if ($request->filled('q')) {
            $term = '%' . $request->string('q') . '%';
            $q->where(function ($w) use ($term) {
                $w->where('full_name', 'like', $term)
                  ->orWhere('phone', 'like', $term)
                  ->orWhere('email', 'like', $term);
            });
        }
        if ($request->filled('last_contact_before')) {
            $q->where('last_contact_at', '<', $request->date('last_contact_before'));
        }

        $paginator = $q->orderByDesc('last_contact_at')->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last'  => $paginator->url($paginator->lastPage()),
                'prev'  => $paginator->previousPageUrl(),
                'next'  => $paginator->nextPageUrl(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'full_name' => 'required|string|max:255',
            'church_id' => 'nullable|exists:churches,id',
            'zone_id' => 'nullable|exists:zones,id',
            'phone' => 'nullable|string|max:64',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'pastor_since' => 'nullable|integer|min:1900|max:2100',
            'pipeline_stage' => 'nullable|in:identified,engaged,committed,active,champion',
            'last_contact_at' => 'nullable|date',
        ]);
        $pastor = Pastor::create($validated);
        return response()->json(['data' => $pastor], 201);
    }

    public function show(Pastor $pastor): JsonResponse
    {
        $pastor->load('identifications');
        $totals = $pastor->pledges()
            ->selectRaw('resource, SUM(quantity) as total')
            ->groupBy('resource')
            ->pluck('total', 'resource');
        return response()->json(['data' => array_merge($pastor->toArray(), ['pledge_totals' => $totals])]);
    }

    public function update(Request $request, Pastor $pastor): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => 'sometimes|required|string|max:255',
            'church_id' => 'sometimes|nullable|exists:churches,id',
            'zone_id' => 'sometimes|nullable|exists:zones,id',
            'phone' => 'sometimes|nullable|string|max:64',
            'email' => 'sometimes|nullable|email|max:255',
            'address' => 'sometimes|nullable|string|max:255',
            'pastor_since' => 'sometimes|nullable|integer|min:1900|max:2100',
            'pipeline_stage' => 'sometimes|in:identified,engaged,committed,active,champion',
            'last_contact_at' => 'sometimes|nullable|date',
        ]);
        $pastor->update($validated);
        return response()->json(['data' => $pastor]);
    }

    public function destroy(Pastor $pastor): JsonResponse
    {
        $pastor->delete();
        return response()->json(null, 204);
    }

    public function pledges(Pastor $pastor): JsonResponse
    {
        $totals = $pastor->pledges()
            ->selectRaw('resource, SUM(quantity) as total')
            ->groupBy('resource')
            ->pluck('total', 'resource')
            ->map(fn ($v) => number_format((float) $v, 2, '.', ''));
        return response()->json(['data' => $totals]);
    }
}
