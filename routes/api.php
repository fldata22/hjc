<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
Route::middleware('throttle:10,1')->post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/crusade', [\App\Http\Controllers\Api\CrusadeController::class, 'show']);
    Route::get('/zones', [\App\Http\Controllers\Api\ZoneController::class, 'index']);
    Route::get('/churches', [\App\Http\Controllers\Api\ChurchController::class, 'index']);
    Route::get('/pastors/stage-counts', [\App\Http\Controllers\Api\PastorController::class, 'stageCounts']);
    Route::get('/pastors/{pastor}/pledges', [\App\Http\Controllers\Api\PastorController::class, 'pledges']);
    Route::apiResource('pastors', \App\Http\Controllers\Api\PastorController::class);
    Route::get('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'index']);
    Route::post('/pastors/{pastor}/identifications', [\App\Http\Controllers\Api\PastorIdentificationController::class, 'store']);
    Route::apiResource('town-profiles', \App\Http\Controllers\Api\TownProfileController::class);
    Route::apiResource('venue-inspections', \App\Http\Controllers\Api\VenueInspectionController::class);
    Route::apiResource('must-do-items', \App\Http\Controllers\Api\MustDoItemController::class);
    Route::apiResource('workers', \App\Http\Controllers\Api\WorkerController::class);
    Route::get('/sound-lighting-plan', [\App\Http\Controllers\Api\SoundLightingPlanController::class, 'show']);
    Route::put('/sound-lighting-plan', [\App\Http\Controllers\Api\SoundLightingPlanController::class, 'upsert']);
    Route::get('/seating-plan', [\App\Http\Controllers\Api\SeatingPlanController::class, 'show']);
    Route::put('/seating-plan', [\App\Http\Controllers\Api\SeatingPlanController::class, 'upsert']);
    Route::apiResource('daily-attendance', \App\Http\Controllers\Api\DailyAttendanceController::class)->parameters(['daily-attendance' => 'dailyAttendance']);
    Route::apiResource('daily-decisions', \App\Http\Controllers\Api\DailyDecisionController::class);
    Route::apiResource('daily-programs', \App\Http\Controllers\Api\DailyProgramController::class);
    Route::apiResource('incidents', \App\Http\Controllers\Api\IncidentController::class);
    Route::apiResource('publicity-assets', \App\Http\Controllers\Api\PublicityAssetController::class);
    Route::apiResource('outreach-activities', \App\Http\Controllers\Api\OutreachActivityController::class);
    Route::apiResource('media-mentions', \App\Http\Controllers\Api\MediaMentionController::class);
    Route::apiResource('land-elders', \App\Http\Controllers\Api\LandElderController::class);
    Route::apiResource('donors', \App\Http\Controllers\Api\DonorController::class);
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
    Route::get('/publicity-channels/awareness-spend', [\App\Http\Controllers\Api\PublicityChannelController::class, 'awarenessSpend']);
    Route::apiResource('publicity-channels', \App\Http\Controllers\Api\PublicityChannelController::class);
    Route::apiResource('committees', \App\Http\Controllers\Api\CommitteeController::class);
    Route::apiResource('conferences', \App\Http\Controllers\Api\ConferenceController::class);
    Route::apiResource('stakeholders', \App\Http\Controllers\Api\StakeholderController::class);
    Route::apiResource('committee-members', \App\Http\Controllers\Api\CommitteeMemberController::class);
    Route::apiResource('permits', \App\Http\Controllers\Api\PermitController::class);
    Route::apiResource('budget-categories', \App\Http\Controllers\Api\BudgetCategoryController::class);
    Route::apiResource('budget-transactions', \App\Http\Controllers\Api\BudgetTransactionController::class);
    Route::get('/budget/summary', [\App\Http\Controllers\Api\BudgetSummaryController::class, 'show']);
    Route::get('/weekly-assessments', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'index']);
    Route::post('/weekly-assessments', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'store']);
    Route::get('/weekly-assessments/latest', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'latest']);
    Route::get('/weekly-assessments/{weeklyAssessment}', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'show']);
    Route::patch('/weekly-assessments/{weeklyAssessment}', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'update']);
    Route::delete('/weekly-assessments/{weeklyAssessment}', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'destroy']);
    Route::post('/weekly-assessments/{weeklyAssessment}/submit', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'submit']);
    Route::put('/weekly-assessments/{weeklyAssessment}/readings', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'replaceReadings']);
    Route::put('/weekly-assessments/{weeklyAssessment}/risks', [\App\Http\Controllers\Api\WeeklyAssessmentController::class, 'replaceRisks']);
    Route::get('/conferences/{conference}/registration-summary', [\App\Http\Controllers\Api\ConferenceController::class, 'registrationSummary']);
    Route::get('/conferences/{conference}/tracks', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'index']);
    Route::post('/conferences/{conference}/tracks', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'store']);
    Route::patch('/conference-tracks/{conferenceTrack}', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'update']);
    Route::delete('/conference-tracks/{conferenceTrack}', [\App\Http\Controllers\Api\ConferenceTrackController::class, 'destroy']);
    Route::get('/conferences/{conference}/sessions', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'index']);
    Route::post('/conferences/{conference}/sessions', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'store']);
    Route::patch('/conference-sessions/{conferenceSession}', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'update']);
    Route::delete('/conference-sessions/{conferenceSession}', [\App\Http\Controllers\Api\ConferenceSessionController::class, 'destroy']);
    Route::get('/conferences/{conference}/registrations', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'index']);
    Route::post('/conferences/{conference}/registrations', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'store']);
    Route::patch('/conference-registrations/{conferenceRegistration}', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'update']);
    Route::delete('/conference-registrations/{conferenceRegistration}', [\App\Http\Controllers\Api\ConferenceRegistrationController::class, 'destroy']);
    Route::get('/mission-control', [\App\Http\Controllers\Api\MissionControlController::class, 'show']);

    // Worker shift scheduling (Tab 4)
    Route::apiResource('worker-shifts', \App\Http\Controllers\Api\WorkerShiftController::class);

    // Prayer groups & sessions (Tab 10)
    Route::apiResource('prayer-groups', \App\Http\Controllers\Api\PrayerGroupController::class);
    Route::get('/prayer-groups/{prayerGroup}/sessions', [\App\Http\Controllers\Api\PrayerSessionController::class, 'index']);
    Route::post('/prayer-groups/{prayerGroup}/sessions', [\App\Http\Controllers\Api\PrayerSessionController::class, 'store']);
    Route::patch('/prayer-groups/{prayerGroup}/sessions/{prayerSession}', [\App\Http\Controllers\Api\PrayerSessionController::class, 'update']);
    Route::delete('/prayer-groups/{prayerGroup}/sessions/{prayerSession}', [\App\Http\Controllers\Api\PrayerSessionController::class, 'destroy']);

    // Accommodation & welfare (Tab 8)
    Route::apiResource('accommodations', \App\Http\Controllers\Api\AccommodationController::class);
    Route::apiResource('welfare-items', \App\Http\Controllers\Api\WelfareItemController::class);

    // Budget transaction approval (Tab 7)
    Route::patch('/budget-transactions/{budgetTransaction}/approve', [\App\Http\Controllers\Api\BudgetTransactionController::class, 'approve']);

    // Final crusade summary (Tab 12)
    Route::get('/final-summary', [\App\Http\Controllers\Api\FinalSummaryController::class, 'show']);
});
