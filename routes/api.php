<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/crusade', [\App\Http\Controllers\Api\CrusadeController::class, 'show']);
    Route::get('/zones', [\App\Http\Controllers\Api\ZoneController::class, 'index']);
    Route::get('/churches', [\App\Http\Controllers\Api\ChurchController::class, 'index']);
    Route::apiResource('pastors', \App\Http\Controllers\Api\PastorController::class);
    Route::get('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'index']);
    Route::post('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'store']);
});
