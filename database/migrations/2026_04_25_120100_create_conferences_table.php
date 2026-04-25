<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->unsignedInteger('capacity');
            $table->timestamps();
            $table->index(['crusade_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('conferences'); }
};
