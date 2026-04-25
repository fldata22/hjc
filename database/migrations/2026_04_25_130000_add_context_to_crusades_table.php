<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crusades', function (Blueprint $table) {
            $table->unsignedInteger('population')->nullable()->after('city');
            $table->unsignedInteger('pap')->nullable()->after('population');
            $table->unsignedInteger('convoy_target')->default(0)->after('awareness_target_pct');
            $table->unsignedInteger('makarios_target')->default(0)->after('convoy_target');
        });
    }

    public function down(): void
    {
        Schema::table('crusades', function (Blueprint $table) {
            $table->dropColumn(['population', 'pap', 'convoy_target', 'makarios_target']);
        });
    }
};
