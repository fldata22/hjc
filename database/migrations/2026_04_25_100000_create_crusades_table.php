<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crusades', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city');
            $table->date('opens_at');
            $table->date('closes_at');
            $table->decimal('budget_total', 12, 2)->default(0);
            $table->unsignedInteger('pastors_target')->default(0);
            $table->unsignedTinyInteger('awareness_target_pct')->default(60);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crusades');
    }
};
