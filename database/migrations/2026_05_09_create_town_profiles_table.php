<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('town_profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('zone_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('language_primary', 64)->nullable();
            $t->string('language_secondary', 64)->nullable();
            $t->string('religion_primary', 64)->nullable();
            $t->text('religion_mix_notes')->nullable();
            $t->integer('prior_crusade_year')->nullable();
            $t->text('prior_crusade_notes')->nullable();
            $t->text('key_contacts')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('town_profiles');
    }
};
