<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('media_mentions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->date('mentioned_on');
            $t->enum('kind', ['newspaper', 'radio', 'tv', 'online', 'social', 'other']);
            $t->string('outlet', 128);
            $t->string('headline', 255);
            $t->string('url', 512)->nullable();
            $t->enum('sentiment', ['positive', 'neutral', 'negative'])->nullable();
            $t->text('summary')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'mentioned_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_mentions');
    }
};
