<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ActivityEntry::query();

        if ($request->filled('date')) {
            $q->whereDate('occurred_at', $request->date('date'));
        }
        if ($request->filled('power')) {
            $q->where('power', $request->string('power'));
        }

        return response()->json(['data' => $q->orderByDesc('occurred_at')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'occurred_at' => 'required|date',
            'description' => 'required|string',
            'power' => 'required|string|max:32',
            'status' => 'nullable|in:done,running',
        ]);
        $validated['user_id'] = $request->user()->id;
        $entry = ActivityEntry::create($validated);
        return response()->json(['data' => $entry], 201);
    }
}
