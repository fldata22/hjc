<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('publicity_assets', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->enum('kind', ['radio_spot', 'poster', 'billboard', 'social_post', 'flyer', 'banner', 'video', 'other']);
            $t->string('title', 255);
            $t->enum('status', ['planned', 'in_production', 'produced', 'deployed'])->default('planned');
            $t->date('produced_on')->nullable();
            $t->date('deployed_on')->nullable();
            $t->integer('quantity')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publicity_assets');
    }
};
