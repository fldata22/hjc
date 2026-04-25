<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crusade;
use Illuminate\Http\JsonResponse;

class CrusadeController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => Crusade::firstOrFail()]);
    }
}
