<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WelfareItem;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WelfareItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = WelfareItem::query();
        if ($request->filled('crusade_id')) $q->where('crusade_id', $request->integer('crusade_id'));
        if ($request->filled('category'))   $q->where('category', $request->string('category'));
        if ($request->filled('status'))     $q->where('status', $request->string('status'));

        $items = $q->orderByDesc('item_date')->get();
        $totalAmount = $items->sum('amount');

        return response()->json([
            'data' => $items,
            'meta' => ['total_amount' => (float) $totalAmount, 'count' => $items->count()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id'  => 'required|exists:crusades,id',
            'category'    => 'required|in:meals,transport,medical,allowance,other',
            'description' => 'required|string|max:255',
            'beneficiary' => 'nullable|string|max:128',
            'amount'      => 'sometimes|numeric|min:0',
            'currency'    => 'sometimes|string|size:3',
            'item_date'   => 'required|date',
            'status'      => 'sometimes|in:planned,processed',
            'notes'       => 'nullable|string',
        ]);

        $item = WelfareItem::create($v);
        ActivityLogger::log(
            $item->crusade_id,
            $request->user()?->id,
            'welfare',
            "Welfare item: {$item->category} — {$item->description} ({$item->currency} " . number_format((float) $item->amount, 0) . ")",
        );
        return response()->json(['data' => $item], 201);
    }

    public function show(WelfareItem $welfareItem): JsonResponse
    {
        return response()->json(['data' => $welfareItem]);
    }

    public function update(Request $request, WelfareItem $welfareItem): JsonResponse
    {
        $v = $request->validate([
            'category'    => 'sometimes|in:meals,transport,medical,allowance,other',
            'description' => 'sometimes|string|max:255',
            'beneficiary' => 'sometimes|nullable|string|max:128',
            'amount'      => 'sometimes|numeric|min:0',
            'currency'    => 'sometimes|string|size:3',
            'item_date'   => 'sometimes|date',
            'status'      => 'sometimes|in:planned,processed',
            'notes'       => 'sometimes|nullable|string',
        ]);

        $welfareItem->update($v);
        return response()->json(['data' => $welfareItem]);
    }

    public function destroy(WelfareItem $welfareItem): JsonResponse
    {
        $welfareItem->delete();
        return response()->json(null, 204);
    }
}
