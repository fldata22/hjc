<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_contacts(): void
    {
        Contact::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/contacts')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_index_searches_by_name_phone_email(): void
    {
        Contact::factory()->create(['crusade_id' => $this->crusade->id, 'full_name' => 'Akua Mensah', 'phone' => '0244000111']);
        Contact::factory()->create(['crusade_id' => $this->crusade->id, 'full_name' => 'Kwame Boateng', 'phone' => '0209999888']);

        $this->getJson('/api/contacts?q=Akua')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Akua Mensah');

        $this->getJson('/api/contacts?q=0209')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Kwame Boateng');
    }

    public function test_can_create_contact(): void
    {
        $this->postJson('/api/contacts', [
            'crusade_id' => $this->crusade->id,
            'full_name' => 'Sister Akua',
            'phone' => '0244112233',
            'email' => 'akua@example.com',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.full_name', 'Sister Akua');

        $this->assertDatabaseHas('contacts', ['full_name' => 'Sister Akua', 'phone' => '0244112233']);
    }

    public function test_create_validates_required_name(): void
    {
        $this->postJson('/api/contacts', ['crusade_id' => $this->crusade->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['full_name']);
    }

    public function test_can_update_contact(): void
    {
        $contact = Contact::factory()->create(['crusade_id' => $this->crusade->id, 'full_name' => 'Old Name']);

        $this->patchJson("/api/contacts/{$contact->id}", ['full_name' => 'New Name'])
            ->assertStatus(200)
            ->assertJsonPath('data.full_name', 'New Name');

        $this->assertDatabaseHas('contacts', ['id' => $contact->id, 'full_name' => 'New Name']);
    }

    public function test_can_delete_contact(): void
    {
        $contact = Contact::factory()->create(['crusade_id' => $this->crusade->id]);

        $this->deleteJson("/api/contacts/{$contact->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
    }
}
