<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaMention;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaMentionController extends Controller
{
    private const KINDS = ['newspaper', 'radio', 'tv', 'online', 'social', 'other'];
    private const SENTIMENTS = ['positive', 'neutral', 'negative'];

    public function index(Request $request): JsonResponse
    {
        $q = MediaMention::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('kind')) {
            $q->where('kind', $request->string('kind'));
        }
        if ($request->filled('sentiment')) {
            $q->where('sentiment', $request->string('sentiment'));
        }

        return response()->json([
            'data' => $q->orderByDesc('mentioned_on')->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'mentioned_on' => 'required|date',
            'kind' => 'required|in:' . implode(',', self::KINDS),
            'outlet' => 'required|string|max:128',
            'headline' => 'required|string|max:255',
            'url' => 'nullable|url|max:512',
            'sentiment' => 'nullable|in:' . implode(',', self::SENTIMENTS),
            'summary' => 'nullable|string',
        ]);

        $mention = MediaMention::create($v);
        ActivityLogger::log(
            $mention->crusade_id,
            $request->user()?->id,
            'awareness',
            "{$mention->kind} mention in {$mention->outlet}: \"{$mention->headline}\"",
        );
        return response()->json(['data' => $mention], 201);
    }

    public function show(MediaMention $mediaMention): JsonResponse
    {
        return response()->json(['data' => $mediaMention]);
    }

    public function update(Request $request, MediaMention $mediaMention): JsonResponse
    {
        $v = $request->validate([
            'mentioned_on' => 'sometimes|date',
            'kind' => 'sometimes|in:' . implode(',', self::KINDS),
            'outlet' => 'sometimes|string|max:128',
            'headline' => 'sometimes|string|max:255',
            'url' => 'sometimes|nullable|url|max:512',
            'sentiment' => 'sometimes|nullable|in:' . implode(',', self::SENTIMENTS),
            'summary' => 'sometimes|nullable|string',
        ]);

        $mediaMention->update($v);
        return response()->json(['data' => $mediaMention]);
    }

    public function destroy(MediaMention $mediaMention): JsonResponse
    {
        $mediaMention->delete();
        return response()->json(null, 204);
    }
}
