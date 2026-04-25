<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('weekly_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('week_number');
            $table->timestamp('prompted_at');
            $table->unsignedTinyInteger('self_score')->nullable();
            $table->text('notes')->nullable();
            $table->text('decisions_needed')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->unique(['crusade_id', 'week_number']);
        });
    }
    public function down(): void { Schema::dropIfExists('weekly_assessments'); }
};
