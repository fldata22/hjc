<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\User;
use App\Models\VenueInspection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VenueInspectionApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_inspections(): void
    {
        VenueInspection::factory()->count(2)->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/venue-inspections')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_index_filters_by_date_range(): void
    {
        VenueInspection::factory()->create(['crusade_id' => $this->crusade->id, 'inspected_at' => '2026-04-15']);
        VenueInspection::factory()->create(['crusade_id' => $this->crusade->id, 'inspected_at' => '2026-04-20']);
        VenueInspection::factory()->create(['crusade_id' => $this->crusade->id, 'inspected_at' => '2026-05-01']);

        $this->getJson('/api/venue-inspections?date_from=2026-04-15&date_to=2026-04-25')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_inspection_via_json(): void
    {
        $this->postJson('/api/venue-inspections', [
            'crusade_id' => $this->crusade->id,
            'inspected_at' => '2026-04-15',
            'inspector_name' => 'Director',
            'capacity_verified' => true,
            'exits_clear' => true,
            'power_tested' => false,
            'sound_tested' => false,
            'permits_status' => 'Police: approved, Fire: pending',
        ])->assertStatus(201)
            ->assertJsonPath('data.inspector_name', 'Director')
            ->assertJsonPath('data.capacity_verified', true)
            ->assertJsonPath('data.power_tested', false);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->postJson('/api/venue-inspections', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['inspected_at', 'inspector_name']);
    }

    public function test_store_accepts_multipart_with_photo(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->image('inspection.jpg', 800, 600);

        $response = $this->post('/api/venue-inspections', [
            'crusade_id' => $this->crusade->id,
            'inspected_at' => '2026-04-15',
            'inspector_name' => 'Director',
            'capacity_verified' => '1',
            'exits_clear' => '1',
            'power_tested' => '0',
            'sound_tested' => '0',
            'photo' => $file,
        ]);

        $response->assertStatus(201);
        $body = $response->json('data');
        $this->assertNotNull($body['photo_url']);
        $this->assertStringStartsWith('/storage/inspections/', $body['photo_url']);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $body['photo_url']));
    }

    public function test_store_rejects_non_image_photo(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->create('not-an-image.pdf', 100, 'application/pdf');

        $this->withHeaders(['Accept' => 'application/json'])
            ->post('/api/venue-inspections', [
                'crusade_id' => $this->crusade->id,
                'inspected_at' => '2026-04-15',
                'inspector_name' => 'Director',
                'photo' => $file,
            ])->assertStatus(422)->assertJsonValidationErrors(['photo']);
    }

    public function test_can_show_inspection(): void
    {
        $i = VenueInspection::factory()->create(['crusade_id' => $this->crusade->id, 'inspector_name' => 'Director']);

        $this->getJson("/api/venue-inspections/{$i->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.inspector_name', 'Director');
    }

    public function test_can_update_inspection(): void
    {
        $i = VenueInspection::factory()->create([
            'crusade_id' => $this->crusade->id,
            'capacity_verified' => false,
        ]);

        $this->patchJson("/api/venue-inspections/{$i->id}", [
            'capacity_verified' => true,
            'notes' => 'Re-checked',
        ])->assertStatus(200)
            ->assertJsonPath('data.capacity_verified', true)
            ->assertJsonPath('data.notes', 'Re-checked');
    }

    public function test_can_delete_inspection(): void
    {
        $i = VenueInspection::factory()->create(['crusade_id' => $this->crusade->id]);

        $this->deleteJson("/api/venue-inspections/{$i->id}")->assertStatus(204);
        $this->assertDatabaseMissing('venue_inspections', ['id' => $i->id]);
    }
}
