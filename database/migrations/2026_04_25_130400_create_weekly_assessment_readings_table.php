<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('weekly_assessment_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('weekly_assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('power_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('value_pct');
            $table->timestamps();
            $table->unique(['weekly_assessment_id', 'power_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('weekly_assessment_readings'); }
};
