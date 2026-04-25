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
    }
}
