<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('must_do_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->enum('area', ['venue', 'publicity', 'permits', 'logistics', 'other']);
            $t->string('title', 255);
            $t->string('owner_name', 128)->nullable();
            $t->date('due_date')->nullable();
            $t->enum('status', ['pending', 'in_progress', 'done'])->default('pending');
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'status']);
            $t->index(['crusade_id', 'area']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('must_do_items');
    }
};
