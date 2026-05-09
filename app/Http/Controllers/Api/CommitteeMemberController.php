<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommitteeMember;
use App\Services\ActivityLogger;
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
        $validated = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'kind' => ['required', Rule::in(array_keys(self::STATUS_BY_KIND))],
            'name' => 'required|string|max:128',
            'role' => 'required|string|max:64',
            'org' => 'nullable|string|max:128',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email|max:128',
            'status' => ['required', 'string', function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                $kind = $request->input('kind');
                if (!isset(self::STATUS_BY_KIND[$kind])) {
                    return; // Let kind's own validation report the error; don't compound it.
                }
                if (!in_array($value, self::STATUS_BY_KIND[$kind], true)) {
                    $fail('The status must be one of: ' . implode(', ', self::STATUS_BY_KIND[$kind]) . '.');
                }
            }],
            'notes' => 'nullable|string|max:255',
        ]);

        $member = CommitteeMember::create($validated);
        $kindLabel = strtoupper($member->kind);
        ActivityLogger::log(
            $member->crusade_id,
            $request->user()?->id,
            'committees',
            "{$kindLabel} member added: {$member->name} ({$member->role})",
        );
        return response()->json(['data' => $member], 201);
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

        $oldStatus = $committeeMember->status;
        $committeeMember->update($validated);
        if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
            $kindLabel = strtoupper($committeeMember->kind);
            ActivityLogger::log(
                $committeeMember->crusade_id,
                $request->user()?->id,
                'committees',
                "{$kindLabel} {$committeeMember->name}: {$oldStatus} → {$committeeMember->status}",
            );
        }
        return response()->json(['data' => $committeeMember]);
    }

    public function destroy(CommitteeMember $committeeMember): JsonResponse
    {
        $committeeMember->delete();
        return response()->json(null, 204);
    }
}
