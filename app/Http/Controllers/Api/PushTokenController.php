<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    /** Register/refresh the authenticated user's Expo push token. */
    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'expo_push_token' => 'required|string|max:255',
        ]);

        $request->user()->forceFill([
            'expo_push_token' => $v['expo_push_token'],
            'expo_push_token_updated_at' => now(),
        ])->save();

        return response()->json(['status' => 'ok']);
    }

    /** Clear the token (e.g. on logout / disabled notifications). */
    public function destroy(Request $request): JsonResponse
    {
        $request->user()->forceFill([
            'expo_push_token' => null,
            'expo_push_token_updated_at' => now(),
        ])->save();

        return response()->json(null, 204);
    }
}
