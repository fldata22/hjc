<?php

namespace Tests\Feature;

use App\Models\ActivityEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityEntryModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_entry_belongs_to_user_and_crusade(): void
    {
        $entry = ActivityEntry::factory()->create();
        $this->assertInstanceOf(User::class, $entry->user);
        $this->assertNotNull($entry->crusade);
    }
}
