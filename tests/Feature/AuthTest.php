<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_token(): void
    {
        $user = User::factory()->create(['email' => 'd@example.com', 'password' => bcrypt('secret123')]);

        $response = $this->postJson('/api/login', ['email' => 'd@example.com', 'password' => 'secret123']);

        $response->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_login_rejects_bad_password(): void
    {
        User::factory()->create(['email' => 'd@example.com', 'password' => bcrypt('secret123')]);

        $response = $this->postJson('/api/login', ['email' => 'd@example.com', 'password' => 'wrong']);

        $response->assertStatus(422);
    }

    public function test_protected_route_requires_token(): void
    {
        $this->getJson('/api/crusade')->assertStatus(401);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/logout')->assertOk();
        $this->assertCount(0, $user->fresh()->tokens);
    }
}
