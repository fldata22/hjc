<?php

namespace Tests\Feature;

use App\Models\Reminder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReminderModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_reminder_defaults_to_incomplete(): void
    {
        $reminder = Reminder::factory()->create();
        $this->assertNull($reminder->completed_at);
    }
}
