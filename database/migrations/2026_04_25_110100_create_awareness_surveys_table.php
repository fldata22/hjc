<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('awareness_surveys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('survey_number');
            $table->unsignedInteger('surveyed_count');
            $table->unsignedInteger('attending_yes_count');
            $table->date('taken_on');
            $table->timestamps();
            $table->unique(['crusade_id', 'zone_id', 'survey_number']);
            $table->index(['crusade_id', 'survey_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('awareness_surveys');
    }
};
