<?php
namespace Tests\Feature;

use App\Models\Stakeholder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StakeholderModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_stakeholder_with_matching_stage_and_label(): void
    {
        $s = Stakeholder::factory()->create(['pipeline_stage' => 4, 'status_label' => 'won']);
        $this->assertSame(4, $s->pipeline_stage);
        $this->assertSame('won', $s->status_label);
    }
}
