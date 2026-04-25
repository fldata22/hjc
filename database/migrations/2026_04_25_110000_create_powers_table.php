<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('powers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 64);
            $table->unsignedTinyInteger('order_index');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('powers')->insert([
            ['code' => 'pastors',      'name' => 'Pastors',      'order_index' => 1,  'description' => 'Pastor pipeline progression', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'awareness',    'name' => 'Awareness',    'order_index' => 2,  'description' => 'City-wide awareness of the crusade', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'volunteers',   'name' => 'Volunteers',   'order_index' => 3,  'description' => 'Worker rehearsal attendance', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'equipment',    'name' => 'Equipment',    'order_index' => 4,  'description' => 'Crusade ground equipment readiness', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'decisions',    'name' => 'Decisions',    'order_index' => 5,  'description' => 'Decisions for Christ at the crusade', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'discipleship', 'name' => 'Discipleship', 'order_index' => 6,  'description' => 'Follow-up and discipleship of converts', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'donors',       'name' => 'Donors',       'order_index' => 7,  'description' => 'Financial pipeline', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'drama',        'name' => 'Drama',        'order_index' => 8,  'description' => 'Counselling readiness (drama is the counselling/intervention ministry)', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'events',       'name' => 'Events',       'order_index' => 9,  'description' => 'Pre-crusade rehearsals and events', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'pledges',      'name' => 'Pledges',      'order_index' => 10, 'description' => 'Pastor pledge meetings', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'committees',   'name' => 'Committees',   'order_index' => 11, 'description' => 'Operating committees and their deliverables', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'publicity',    'name' => 'Publicity',    'order_index' => 12, 'description' => 'Radio, print, OOH publicity channels', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'budget',       'name' => 'Budget',       'order_index' => 13, 'description' => 'Budget tracking and burn', 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'govt',         'name' => 'Government',   'order_index' => 14, 'description' => 'Stakeholder relations and permits', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('powers');
    }
};
