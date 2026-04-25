<?php
namespace Tests\Feature;

use App\Models\PublicityChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicityChannelModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_a_channel(): void
    {
        $c = PublicityChannel::factory()->create(['channel_type' => 'radio']);
        $this->assertSame('radio', $c->channel_type);
    }
}
