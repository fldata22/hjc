<?php

namespace Database\Seeders;

use App\Models\ActivityEntry;
use App\Models\Church;
use App\Models\Crusade;
use App\Models\CrusadeTarget;
use App\Models\Pastor;
use App\Models\PastorIdentification;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Models\Reminder;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CrusadeSeeder extends Seeder
{
    public function run(): void
    {
        $director = User::firstOrCreate(
            ['email' => 'director@hjc.test'],
            ['name' => 'John Adjei', 'password' => Hash::make('password')]
        );

        $crusade = Crusade::create([
            'name' => 'Lusaka 2026',
            'city' => 'Lusaka',
            'opens_at' => '2026-05-02',
            'closes_at' => '2026-05-04',
            'budget_total' => 80000,
            'pastors_target' => 1088,
            'awareness_target_pct' => 60,
        ]);

        foreach ([['choir', 150], ['prayer', 200], ['ushers', 300], ['counsellors', 250], ['buses', 24], ['money', 80000]] as [$r, $t]) {
            CrusadeTarget::create(['crusade_id' => $crusade->id, 'resource' => $r, 'target_quantity' => $t]);
        }

        $zones = collect();
        foreach (range(1, 10) as $n) {
            $zones->push(Zone::create([
                'crusade_id' => $crusade->id,
                'code' => sprintf('Z%02d', $n),
                'name' => "Zone {$n}",
                'population' => fake()->numberBetween(20000, 80000),
                'pap' => fake()->numberBetween(15000, 70000),
            ]));
        }

        $churches = collect();
        $churchNames = ['Bread of Life Intl', 'Faith Baptist', 'Living Water', 'Grace Assembly', 'Cornerstone',
                        'Hope Chapel', 'Christ Embassy', 'Catholic Diocese', 'Lusaka Mosque', 'Anglican Cathedral',
                        'Methodist Central', 'New Life', 'Pentecostal Holiness', 'Redeemed Christian', 'Word of Faith'];
        foreach ($churchNames as $i => $name) {
            $churches->push(Church::create([
                'crusade_id' => $crusade->id,
                'name' => $name,
                'zone_id' => $zones->random()->id,
            ]));
        }

        $stages = ['identified', 'engaged', 'committed', 'active', 'champion'];
        $pastors = collect();
        foreach (range(1, 30) as $n) {
            $church = $churches->random();
            $pastors->push(Pastor::create([
                'crusade_id' => $crusade->id,
                'full_name' => 'Pastor ' . fake()->name(),
                'church_id' => $church->id,
                'zone_id' => $church->zone_id,
                'phone' => fake()->phoneNumber(),
                'email' => fake()->safeEmail(),
                'address' => fake()->address(),
                'pastor_since' => fake()->numberBetween(2005, 2024),
                'pipeline_stage' => $stages[array_rand($stages)],
                'last_contact_at' => fake()->optional(0.7)->dateTimeThisMonth(),
            ]));
        }

        // Identifications: ~half PCM, some BOT
        foreach ($pastors as $p) {
            if (fake()->boolean(70)) {
                PastorIdentification::create([
                    'pastor_id' => $p->id,
                    'category' => 'PCM',
                    'sub_role' => 'primary',
                    'assigned_at' => fake()->dateTimeBetween('-6 months', 'now'),
                    'assigned_by_user_id' => $director->id,
                ]);
            }
            if (fake()->boolean(20)) {
                PastorIdentification::create([
                    'pastor_id' => $p->id,
                    'category' => 'BOT',
                    'sub_role' => fake()->randomElement(['member', 'chair', 'sec']),
                    'assigned_at' => fake()->dateTimeBetween('-3 months', 'now'),
                    'assigned_by_user_id' => $director->id,
                ]);
            }
        }

        $meetings = collect([
            ['M1', '2026-03-15', 'Westside Hall', 'done'],
            ['M2', '2026-03-29', 'Mwami', 'done'],
            ['M3', '2026-04-12', 'Kabwata', 'done'],
            ['M4', '2026-04-24', 'Bishop residence', 'upcoming'],
        ])->map(function ($row) use ($crusade) {
            return PledgeMeeting::create([
                'crusade_id' => $crusade->id,
                'sequence' => $row[0],
                'held_on' => $row[1],
                'venue' => $row[2],
                'status' => $row[3],
            ]);
        });

        // Attach attendances + pledges to first 3 meetings (done ones)
        foreach ($meetings->take(3) as $m) {
            $attendees = $pastors->random(min(20, $pastors->count()));
            $m->attendees()->attach($attendees->pluck('id'));
            foreach ($attendees as $p) {
                foreach (['choir', 'ushers', 'counsellors', 'money'] as $resource) {
                    if (fake()->boolean(50)) {
                        Pledge::create([
                            'pastor_id' => $p->id,
                            'pledge_meeting_id' => $m->id,
                            'resource' => $resource,
                            'quantity' => $resource === 'money' ? fake()->numberBetween(50, 2000) : fake()->numberBetween(1, 20),
                        ]);
                    }
                }
            }
        }

        // Activity entries — last week
        $powers = ['pastors', 'awareness', 'pledges', 'publicity', 'committees', 'budget', 'govt'];
        foreach (range(1, 14) as $n) {
            ActivityEntry::create([
                'crusade_id' => $crusade->id,
                'user_id' => $director->id,
                'occurred_at' => fake()->dateTimeBetween('-7 days', 'now'),
                'description' => fake()->sentence(8),
                'power' => $powers[array_rand($powers)],
                'status' => 'done',
            ]);
        }

        // A few open reminders
        foreach ([
            ['Submit Sunday weekly assessment', '+2 days'],
            ['Confirm bus contract for convoy 5–8', '+1 day'],
            ['Send mayor letter for ZNBC TV permit', 'now'],
        ] as [$text, $when]) {
            Reminder::create([
                'crusade_id' => $crusade->id,
                'user_id' => $director->id,
                'text' => $text,
                'due_on' => date('Y-m-d', strtotime($when)),
                'completed_at' => null,
            ]);
        }
    }
}
