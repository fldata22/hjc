<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Church;
use Illuminate\Http\JsonResponse;

class ChurchController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Church::orderBy('name')->get()]);
    }
}
