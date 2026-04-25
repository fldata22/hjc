<?php
namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\PublicityChannel;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicityChannelApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_channels(): void
    {
        PublicityChannel::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/publicity-channels')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_create_channel(): void
    {
        $r = $this->postJson('/api/publicity-channels', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Phoenix FM', 'channel_type' => 'radio',
            'reach_estimate' => '620k reach', 'status' => 'live', 'spend_to_date' => 1800,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Phoenix FM');
    }

    public function test_validates_channel_type(): void
    {
        $this->postJson('/api/publicity-channels', [
            'crusade_id' => $this->crusade->id,
            'name' => 'X', 'channel_type' => 'invalid',
        ])->assertStatus(422)->assertJsonValidationErrors(['channel_type']);
    }

    public function test_can_update_status(): void
    {
        $c = PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'scheduled']);
        $this->patchJson("/api/publicity-channels/{$c->id}", ['status' => 'live'])
            ->assertOk()->assertJsonPath('data.status', 'live');
    }

    public function test_can_delete_channel(): void
    {
        $c = PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/publicity-channels/{$c->id}")->assertStatus(204);
    }

    public function test_awareness_spend_pairs_chart_data(): void
    {
        $z = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z->id,
            'survey_number' => 1, 'surveyed_count' => 100, 'attending_yes_count' => 18,
        ]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z->id,
            'survey_number' => 2, 'surveyed_count' => 100, 'attending_yes_count' => 30,
        ]);
        PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id, 'spend_to_date' => 1200]);
        PublicityChannel::factory()->create(['crusade_id' => $this->crusade->id, 'spend_to_date' => 800]);

        $r = $this->getJson('/api/publicity-channels/awareness-spend');
        $r->assertOk();
        $rows = $r->json('data');
        $this->assertSame(2, count($rows));
        $this->assertSame(1, $rows[0]['survey_number']);
        $this->assertSame('18.00', $rows[0]['awareness_pct']);
        $this->assertSame('30.00', $rows[1]['awareness_pct']);
        $this->assertSame('2000.00', $rows[1]['spend_total']);
    }
}
