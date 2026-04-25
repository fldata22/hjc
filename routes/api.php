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
    Route::get('/pastors/{pastor}/pledges', [\App\Http\Controllers\Api\PastorController::class, 'pledges']);
    Route::apiResource('pastors', \App\Http\Controllers\Api\PastorController::class);
    Route::get('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'index']);
    Route::post('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'store']);
    Route::apiResource('pledge-meetings', \App\Http\Controllers\Api\PledgeMeetingController::class);
    Route::post('/pledge-meetings/{pledgeMeeting}/attendances', [\App\Http\Controllers\Api\PledgeMeetingAttendanceController::class, 'store']);
    Route::post('/pledge-meetings/{pledgeMeeting}/pledges', [\App\Http\Controllers\Api\PledgeMeetingPledgesController::class, 'store']);
    Route::get('/pledges/summary', [\App\Http\Controllers\Api\PledgeSummaryController::class, 'show']);
    Route::get('/activity-entries', [\App\Http\Controllers\Api\ActivityEntryController::class, 'index']);
    Route::post('/activity-entries', [\App\Http\Controllers\Api\ActivityEntryController::class, 'store']);
    Route::get('/reminders', [\App\Http\Controllers\Api\ReminderController::class, 'index']);
    Route::post('/reminders', [\App\Http\Controllers\Api\ReminderController::class, 'store']);
    Route::patch('/reminders/{reminder}', [\App\Http\Controllers\Api\ReminderController::class, 'update']);
    Route::delete('/reminders/{reminder}', [\App\Http\Controllers\Api\ReminderController::class, 'destroy']);
    Route::get('/powers', [\App\Http\Controllers\Api\PowerController::class, 'index']);
    Route::get('/powers/{code}', [\App\Http\Controllers\Api\PowerController::class, 'show']);
    Route::get('/awareness-surveys', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'index']);
    Route::post('/awareness-surveys', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'store']);
    Route::get('/awareness-surveys/trajectory', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'trajectory']);
    Route::patch('/awareness-surveys/{awarenessSurvey}', [\App\Http\Controllers\Api\AwarenessSurveyController::class, 'update']);
    Route::get('/worker-rehearsals', [\App\Http\Controllers\Api\WorkerRehearsalController::class, 'index']);
    Route::post('/worker-rehearsals', [\App\Http\Controllers\Api\WorkerRehearsalController::class, 'store']);
    Route::patch('/worker-rehearsals/{workerRehearsal}', [\App\Http\Controllers\Api\WorkerRehearsalController::class, 'update']);
    Route::apiResource('committees', \App\Http\Controllers\Api\CommitteeController::class);
});
