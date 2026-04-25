<?php
namespace Tests\Feature;

use App\Models\Committee;
use App\Models\Crusade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommitteeModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_a_committee(): void
    {
        $c = Committee::factory()->create(['name' => 'Steering', 'status' => 'on_track']);
        $this->assertSame('Steering', $c->name);
        $this->assertInstanceOf(Crusade::class, $c->crusade);
    }
}
