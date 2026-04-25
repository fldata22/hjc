<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Power;
use Illuminate\Http\JsonResponse;

class PowerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Power::orderBy('order_index')->get()]);
    }

    public function show(string $code): JsonResponse
    {
        $power = Power::where('code', $code)->firstOrFail();
        return response()->json(['data' => $power]);
    }
}
