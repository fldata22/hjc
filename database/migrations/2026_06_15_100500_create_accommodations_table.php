<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accommodations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->string('name', 128);
            $t->enum('type', ['hotel', 'guesthouse', 'hostel', 'private', 'other'])->default('hotel');
            $t->string('address', 255)->nullable();
            $t->unsignedInteger('capacity')->default(0);
            $t->text('occupants_description')->nullable();
            $t->string('contact_name', 128)->nullable();
            $t->string('contact_phone', 32)->nullable();
            $t->date('check_in_date')->nullable();
            $t->date('check_out_date')->nullable();
            $t->decimal('cost_per_night', 10, 2)->nullable();
            $t->char('currency', 3)->default('USD');
            $t->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending');
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accommodations');
    }
};
