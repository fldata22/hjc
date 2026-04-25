<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\Pastor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceRegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_registrations(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceRegistration::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->getJson("/api/conferences/{$c->id}/registrations")->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_register_pastor(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $p = Pastor::factory()->create();
        $r = $this->postJson("/api/conferences/{$c->id}/registrations", [
            'pastor_id' => $p->id, 'paid_amount' => 40, 'paid_in_full' => true,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.paid_in_full', true);
    }

    public function test_can_update_payment(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $r = ConferenceRegistration::factory()->create(['paid_in_full' => false, 'paid_amount' => 0]);
        $this->patchJson("/api/conference-registrations/{$r->id}", ['paid_in_full' => true, 'paid_amount' => 40])
            ->assertOk()->assertJsonPath('data.paid_in_full', true);
    }

    public function test_can_delete_registration(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $r = ConferenceRegistration::factory()->create();
        $this->deleteJson("/api/conference-registrations/{$r->id}")->assertStatus(204);
    }
}
