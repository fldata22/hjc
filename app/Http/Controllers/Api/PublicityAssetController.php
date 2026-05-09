<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PublicityAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicityAssetController extends Controller
{
    private const KINDS = ['radio_spot', 'poster', 'billboard', 'social_post', 'flyer', 'banner', 'video', 'other'];
    private const STATUSES = ['planned', 'in_production', 'produced', 'deployed'];

    public function index(Request $request): JsonResponse
    {
        $q = PublicityAsset::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('kind')) {
            $q->where('kind', $request->string('kind'));
        }

        return response()->json([
            'data' => $q->orderBy('status')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'kind' => 'required|in:' . implode(',', self::KINDS),
            'title' => 'required|string|max:255',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'produced_on' => 'nullable|date',
            'deployed_on' => 'nullable|date',
            'quantity' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $v['status'] = $v['status'] ?? 'planned';

        return response()->json(['data' => PublicityAsset::create($v)], 201);
    }

    public function show(PublicityAsset $publicityAsset): JsonResponse
    {
        return response()->json(['data' => $publicityAsset]);
    }

    public function update(Request $request, PublicityAsset $publicityAsset): JsonResponse
    {
        $v = $request->validate([
            'kind' => 'sometimes|in:' . implode(',', self::KINDS),
            'title' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'produced_on' => 'sometimes|nullable|date',
            'deployed_on' => 'sometimes|nullable|date',
            'quantity' => 'sometimes|nullable|integer|min:0',
            'notes' => 'sometimes|nullable|string',
        ]);

        $publicityAsset->update($v);
        return response()->json(['data' => $publicityAsset]);
    }

    public function destroy(PublicityAsset $publicityAsset): JsonResponse
    {
        $publicityAsset->delete();
        return response()->json(null, 204);
    }
}
