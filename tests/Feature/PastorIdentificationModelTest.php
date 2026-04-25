<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PastorIdentification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PastorIdentificationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_pastor_can_have_multiple_identifications(): void
    {
        $pastor = Pastor::factory()->create();
        PastorIdentification::factory()->create(['pastor_id' => $pastor->id, 'category' => 'PCM']);
        PastorIdentification::factory()->create(['pastor_id' => $pastor->id, 'category' => 'BOT']);

        $this->assertCount(2, $pastor->identifications);
    }
}
