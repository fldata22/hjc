<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Step A: add nullable FK
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->foreignId('power_id')->nullable()->after('description')->constrained('powers')->nullOnDelete();
        });

        // Step B: backfill from existing string column
        // Match by code; rows with unknown power codes will keep power_id = NULL and need manual fix
        DB::statement("
            UPDATE activity_entries
            SET power_id = (SELECT id FROM powers WHERE powers.code = activity_entries.power)
        ");

        // Step C: drop the old index that references the dropped string column, then drop the column
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->dropIndex(['crusade_id', 'power']);
            $table->dropColumn('power');
        });

        // Step D: add new index on FK
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->index(['crusade_id', 'power_id']);
        });
    }

    public function down(): void
    {
        // Reverse: re-add string column, backfill from FK, drop FK
        Schema::table('activity_entries', function (Blueprint $table) {
            $table->dropIndex(['crusade_id', 'power_id']);
            $table->string('power', 32)->nullable()->after('description');
        });

        DB::statement("
            UPDATE activity_entries
            SET power = (SELECT code FROM powers WHERE powers.id = activity_entries.power_id)
        ");

        Schema::table('activity_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('power_id');
            $table->index(['crusade_id', 'power']);
        });
    }
};
