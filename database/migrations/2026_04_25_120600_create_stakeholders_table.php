<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stakeholders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->string('org', 128);
            $table->string('role', 64);
            $table->unsignedTinyInteger('pipeline_stage');  // 1-4
            $table->enum('status_label', ['identified', 'engaged', 'committed', 'won']);
            $table->timestamp('last_contact_at')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'status_label']);
        });
    }
    public function down(): void { Schema::dropIfExists('stakeholders'); }
};
