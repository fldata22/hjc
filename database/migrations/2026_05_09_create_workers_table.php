<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('workers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->enum('group_type', [
                'choir',
                'ushers',
                'security',
                'counsellors',
                'prayer_warriors',
                'hospitality',
                'technical',
                'medical',
                'childrens',
                'general',
            ]);
            $t->string('name', 128);
            $t->string('role', 64)->nullable();
            $t->string('phone', 32)->nullable();
            $t->string('email', 128)->nullable();
            $t->string('status', 16)->default('active');
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'group_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workers');
    }
};
