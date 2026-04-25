<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityEntry;
use App\Models\Power;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ActivityEntry::query()->with('power:id,code,name');

        if ($request->filled('date')) {
            $q->whereDate('occurred_at', $request->date('date'));
        }
        if ($request->filled('power')) {
            // accept either power code or power_id for filtering
            $code = $request->string('power')->toString();
            $q->whereHas('power', fn ($p) => $p->where('code', $code));
        }
        if ($request->filled('power_id')) {
            $q->where('power_id', $request->integer('power_id'));
        }

        return response()->json(['data' => $q->orderByDesc('occurred_at')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        // Accept either power_id (preferred) or power_code (convenience)
        $payload = $request->all();
        if (! isset($payload['power_id']) && isset($payload['power_code'])) {
            $power = Power::where('code', $payload['power_code'])->first();
            if ($power) $payload['power_id'] = $power->id;
        }

        $validated = validator($payload, [
            'crusade_id' => 'required|exists:crusades,id',
            'occurred_at' => 'required|date',
            'description' => 'required|string',
            'power_id' => 'required|exists:powers,id',
            'status' => 'nullable|in:done,running',
        ])->validate();

        $validated['user_id'] = $request->user()->id;
        $entry = ActivityEntry::create($validated);
        $entry->load('power:id,code,name');
        return response()->json(['data' => $entry], 201);
    }
}
