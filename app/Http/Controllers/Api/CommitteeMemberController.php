<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommitteeMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommitteeMemberController extends Controller
{
    private const STATUS_BY_KIND = [
        'bot' => ['confirmed', 'pending', 'declined'],
        'cpc' => ['active', 'on-leave', 'stepped-down'],
    ];

    public function index(Request $request): JsonResponse
    {
        $q = CommitteeMember::query();
        if ($request->filled('kind')) {
            $q->where('kind', $request->string('kind'));
        }
        return response()->json(['data' => $q->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $kind = $request->input('kind');
        $allowed = self::STATUS_BY_KIND[$kind] ?? [];

        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'kind' => ['required', Rule::in(array_keys(self::STATUS_BY_KIND))],
            'name' => 'required|string|max:128',
            'role' => 'required|string|max:64',
            'org' => 'nullable|string|max:128',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email|max:128',
            'status' => ['required', 'string', Rule::in($allowed)],
            'notes' => 'nullable|string|max:255',
        ]);

        return response()->json(['data' => CommitteeMember::create($validated)], 201);
    }

    public function show(CommitteeMember $committeeMember): JsonResponse
    {
        return response()->json(['data' => $committeeMember]);
    }

    public function update(Request $request, CommitteeMember $committeeMember): JsonResponse
    {
        $allowed = self::STATUS_BY_KIND[$committeeMember->kind] ?? [];

        $validated = $request->validate([
            'name' => 'sometimes|string|max:128',
            'role' => 'sometimes|string|max:64',
            'org' => 'sometimes|nullable|string|max:128',
            'phone' => 'sometimes|nullable|string|max:32',
            'email' => 'sometimes|nullable|email|max:128',
            'status' => ['sometimes', 'string', Rule::in($allowed)],
            'notes' => 'sometimes|nullable|string|max:255',
        ]);

        $committeeMember->update($validated);
        return response()->json(['data' => $committeeMember]);
    }

    public function destroy(CommitteeMember $committeeMember): JsonResponse
    {
        $committeeMember->delete();
        return response()->json(null, 204);
    }
}
