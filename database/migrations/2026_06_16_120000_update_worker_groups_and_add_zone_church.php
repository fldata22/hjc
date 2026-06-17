<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private const GROUPS_OLD = [
        'choir', 'ushers', 'security', 'counsellors', 'prayer_warriors',
        'hospitality', 'technical', 'medical', 'childrens', 'general',
    ];

    private const GROUPS_NEW = [
        'choir', 'ushers', 'security', 'counsellors', 'prayer_warriors',
        'hospitality', 'technical', 'medical', 'womens', 'general',
    ];

    public function up(): void
    {
        // Add zone + church to workers (nullable FKs, app-validated).
        Schema::table('workers', function (Blueprint $t) {
            $t->foreignId('zone_id')->nullable()->after('crusade_id');
            $t->foreignId('church_id')->nullable()->after('zone_id');
        });

        // Migrate any existing rows before tightening the CHECK constraint.
        DB::table('workers')->where('group_type', 'childrens')->update(['group_type' => 'womens']);
        DB::table('worker_shifts')->where('group_type', 'childrens')->update(['group_type' => 'womens']);

        // Rebuild the enum CHECK constraint: childrens -> womens.
        Schema::table('workers', function (Blueprint $t) {
            $t->enum('group_type', self::GROUPS_NEW)->change();
        });
        Schema::table('worker_shifts', function (Blueprint $t) {
            $t->enum('group_type', self::GROUPS_NEW)->change();
        });
    }

    public function down(): void
    {
        DB::table('workers')->where('group_type', 'womens')->update(['group_type' => 'childrens']);
        DB::table('worker_shifts')->where('group_type', 'womens')->update(['group_type' => 'childrens']);

        Schema::table('workers', function (Blueprint $t) {
            $t->enum('group_type', self::GROUPS_OLD)->change();
        });
        Schema::table('worker_shifts', function (Blueprint $t) {
            $t->enum('group_type', self::GROUPS_OLD)->change();
        });

        Schema::table('workers', function (Blueprint $t) {
            $t->dropColumn(['zone_id', 'church_id']);
        });
    }
};
