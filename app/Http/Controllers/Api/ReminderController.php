<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Reminder::where('user_id', $request->user()->id);
        if (! $request->boolean('include_completed')) {
            $q->whereNull('completed_at');
        }
        return response()->json(['data' => $q->orderBy('due_on')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'text' => 'required|string|max:255',
            'due_on' => 'nullable|date',
        ]);
        $validated['user_id'] = $request->user()->id;
        $r = Reminder::create($validated);
        return response()->json(['data' => $r], 201);
    }

    public function update(Request $request, Reminder $reminder): JsonResponse
    {
        abort_if($reminder->user_id !== $request->user()->id, 403);
        $validated = $request->validate([
            'text' => 'sometimes|string|max:255',
            'due_on' => 'sometimes|nullable|date',
            'completed_at' => 'sometimes|nullable|date',
        ]);
        $reminder->update($validated);
        return response()->json(['data' => $reminder]);
    }

    public function destroy(Request $request, Reminder $reminder): JsonResponse
    {
        abort_if($reminder->user_id !== $request->user()->id, 403);
        $reminder->delete();
        return response()->json(null, 204);
    }
}
