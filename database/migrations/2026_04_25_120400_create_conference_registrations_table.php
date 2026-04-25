<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conference_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conference_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pastor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('track_id')->nullable()->constrained('conference_tracks')->nullOnDelete();
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->boolean('paid_in_full')->default(false);
            $table->timestamp('registered_at');
            $table->timestamps();
            $table->index(['conference_id', 'paid_in_full']);
        });
    }
    public function down(): void { Schema::dropIfExists('conference_registrations'); }
};
