<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('publicity_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->enum('channel_type', ['radio', 'print', 'ooh', 'sms', 'tv']);
            $table->string('reach_estimate', 64)->nullable();
            $table->string('notes', 255)->nullable();
            $table->enum('status', ['live', 'in_progress', 'scheduled', 'blocked'])->default('scheduled');
            $table->decimal('spend_to_date', 10, 2)->default(0);
            $table->timestamps();
            $table->index(['crusade_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('publicity_channels'); }
};
