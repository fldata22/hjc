<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('town_profiles', function (Blueprint $t) {
            $t->string('country', 64)->nullable()->after('zone_id');
            $t->string('region', 64)->nullable()->after('country');
            $t->decimal('latitude', 10, 7)->nullable()->after('region');
            $t->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $t->unsignedTinyInteger('government_openness_rating')->nullable()->after('longitude')
                ->comment('1 = hostile, 5 = very open');
            $t->text('demographic_notes')->nullable()->after('government_openness_rating');
            $t->unsignedInteger('population_estimate')->nullable()->after('demographic_notes');
        });
    }

    public function down(): void
    {
        Schema::table('town_profiles', function (Blueprint $t) {
            $t->dropColumn([
                'country', 'region', 'latitude', 'longitude',
                'government_openness_rating', 'demographic_notes', 'population_estimate',
            ]);
        });
    }
};
