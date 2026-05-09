<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('outreach_activities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->enum('kind', ['door_to_door', 'convoy']);
            $t->date('occurred_on');
            $t->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $t->string('team_lead_name', 128)->nullable();
            $t->integer('households_reached')->nullable();
            $t->integer('conversations_count')->nullable();
            $t->integer('pamphlets_distributed')->nullable();
            $t->text('route_summary')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'kind', 'occurred_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outreach_activities');
    }
};
