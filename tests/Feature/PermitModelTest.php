<?php
namespace Tests\Feature;

use App\Models\Permit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermitModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_permit(): void
    {
        $p = Permit::factory()->create(['status' => 'approved']);
        $this->assertSame('approved', $p->status);
    }
}
