<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_populates_realistic_data(): void
    {
        $this->seed();

        $this->assertDatabaseCount('crusades', 1);
        $crusade = \DB::table('crusades')->first();
        $this->assertSame(2200000, (int) $crusade->population);
        $this->assertSame(24, (int) $crusade->convoy_target);
        $this->assertDatabaseCount('crusade_targets', 6);
        $this->assertGreaterThanOrEqual(8, \DB::table('zones')->count());
        $this->assertGreaterThanOrEqual(15, \DB::table('churches')->count());
        $this->assertGreaterThanOrEqual(30, \DB::table('pastors')->count());
        $this->assertGreaterThanOrEqual(4, \DB::table('pledge_meetings')->count());
        $this->assertGreaterThan(0, \DB::table('pledges')->count());
        $this->assertGreaterThanOrEqual(10, \DB::table('activity_entries')->count());
        $this->assertGreaterThanOrEqual(1, \DB::table('users')->count());
        $this->assertGreaterThanOrEqual(35, \DB::table('awareness_surveys')->count());
        $this->assertGreaterThan(0, \DB::table('worker_rehearsals')->count());
        $this->assertSame(14, \DB::table('powers')->count());
        $this->assertGreaterThanOrEqual(8, \DB::table('committees')->count());
        $this->assertGreaterThanOrEqual(1, \DB::table('conferences')->count());
        $this->assertGreaterThanOrEqual(5, \DB::table('conference_tracks')->count());
        $this->assertGreaterThanOrEqual(5, \DB::table('conference_sessions')->count());
        $this->assertGreaterThanOrEqual(20, \DB::table('conference_registrations')->count());
        $this->assertGreaterThanOrEqual(6, \DB::table('publicity_channels')->count());
        $this->assertGreaterThanOrEqual(6, \DB::table('stakeholders')->count());
        $this->assertGreaterThanOrEqual(3, \DB::table('permits')->count());
        $this->assertGreaterThanOrEqual(8, \DB::table('budget_categories')->count());
        $this->assertGreaterThanOrEqual(15, \DB::table('budget_transactions')->count());
        $this->assertGreaterThanOrEqual(8, \DB::table('weekly_assessments')->count());
        $this->assertGreaterThanOrEqual(14, \DB::table('weekly_assessment_readings')->count());
        $this->assertGreaterThanOrEqual(3, \DB::table('weekly_assessment_risks')->count());
    }
}
