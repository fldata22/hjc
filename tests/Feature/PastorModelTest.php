<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Pastor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PastorModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_pastor_with_default_pipeline(): void
    {
        $pastor = Pastor::factory()->create(['pipeline_stage' => 'identified']);
        $this->assertSame('identified', $pastor->pipeline_stage);
        $this->assertInstanceOf(Crusade::class, $pastor->crusade);
    }

    public function test_pastor_can_be_soft_deleted(): void
    {
        $pastor = Pastor::factory()->create();
        $pastor->delete();
        $this->assertSoftDeleted($pastor);
    }
}
