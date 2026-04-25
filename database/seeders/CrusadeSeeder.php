<?php

namespace Database\Seeders;

use App\Models\ActivityEntry;
use App\Models\Church;
use App\Models\Committee;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use App\Models\Crusade;
use App\Models\CrusadeTarget;
use App\Models\Pastor;
use App\Models\PastorIdentification;
use App\Models\Permit;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Models\Power;
use App\Models\PublicityChannel;
use App\Models\Reminder;
use App\Models\Stakeholder;
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
                'power_id' => Power::where('code', $powers[array_rand($powers)])->first()->id,
                'status' => 'done',
            ]);
        }

        // Awareness surveys — 8 zones × 6 surveys, anchored to DW.2 hi-fi numbers.
        // Hi-fi matrix (% values per survey 1-6):
        // Z01: [10,12,28,30,35,42], Z02: [8,14,22,35,18,21], Z03: [12,26,30,61,52,68],
        // Z04: [5,8,12,14,9,11],   Z05: [-,-,8,10,7,12],     Z06: [-,-,-,15,18,22],
        // Z07: [14,12,22,26,8,10], Z08: [-,-,14,18,21,24]
        $awarenessMatrix = [
            ['Z01', [10, 12, 28, 30, 35, 42]],
            ['Z02', [8, 14, 22, 35, 18, 21]],
            ['Z03', [12, 26, 30, 61, 52, 68]],
            ['Z04', [5, 8, 12, 14, 9, 11]],
            ['Z05', [null, null, 8, 10, 7, 12]],
            ['Z06', [null, null, null, 15, 18, 22]],
            ['Z07', [14, 12, 22, 26, 8, 10]],
            ['Z08', [null, null, 14, 18, 21, 24]],
        ];
        foreach ($awarenessMatrix as [$zoneCode, $pcts]) {
            $z = $zones->firstWhere('code', $zoneCode);
            if (! $z) continue;
            foreach ($pcts as $i => $pct) {
                if ($pct === null) continue;
                \App\Models\AwarenessSurvey::create([
                    'crusade_id' => $crusade->id,
                    'zone_id' => $z->id,
                    'survey_number' => $i + 1,
                    'surveyed_count' => 100,
                    'attending_yes_count' => $pct,
                    'taken_on' => now()->subDays((6 - $i) * 7)->toDateString(),
                ]);
            }
        }

        // Worker rehearsals — anchored to DW.3 hi-fi numbers (matrix shows attendance counts).
        // Hi-fi matrix (per zone, sessions R1-R7, mixed groups — we'll use 'choir' for all to keep seed simple):
        // Z01: [94,66,82,95,12,-,-], Z02: [28,14,52,88,-,-,-], Z03: [120,96,142,155,88,-,-],
        // Z04: [8,-,14,-,-,-,-],     Z07: [52,22,66,88,-,-,-]
        $rehearsalMatrix = [
            ['Z01', [94, 66, 82, 95, 12, null, null]],
            ['Z02', [28, 14, 52, 88, null, null, null]],
            ['Z03', [120, 96, 142, 155, 88, null, null]],
            ['Z04', [8, null, 14, null, null, null, null]],
            ['Z07', [52, 22, 66, 88, null, null, null]],
        ];
        foreach ($rehearsalMatrix as [$zoneCode, $counts]) {
            $z = $zones->firstWhere('code', $zoneCode);
            if (! $z) continue;
            foreach ($counts as $i => $count) {
                if ($count === null) continue;
                \App\Models\WorkerRehearsal::create([
                    'crusade_id' => $crusade->id,
                    'zone_id' => $z->id,
                    'group' => 'choir',
                    'session_number' => $i + 1,
                    'attendance_count' => $count,
                ]);
            }
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

        // Committees
        $committees = [
            ['Steering', 'D. Boateng', 7, 88, 'on_track', 'today'],
            ['Finance', 'M. Sakala', 5, 60, 'on_track', '+2 days'],
            ['Pastoral relations', 'J. Adjei', 9, 72, 'watch', '+1 day'],
            ['Logistics', 'P. Musonda', 6, 30, 'at_risk', '+4 days'],
            ['Publicity', 'L. Banda', 5, 45, 'watch', '+1 day'],
            ['Worker training', 'E. Phiri', 6, 18, 'at_risk', 'today'],
            ['Counselling', 'R. Mwape', 4, 54, 'watch', '+5 days'],
            ['Hospitality', 'T. Daka', 4, 80, 'on_track', '+1 day'],
        ];
        foreach ($committees as [$name, $chair, $members, $pct, $status, $when]) {
            Committee::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'chair_name' => $chair,
                'member_count' => $members, 'deliverables_done_pct' => $pct,
                'status' => $status,
                'next_meeting_on' => date('Y-m-d', strtotime($when)),
            ]);
        }

        // Conference + tracks + sessions + registrations
        $conf = Conference::create([
            'crusade_id' => $crusade->id,
            'name' => 'HJC 2026 Pastors\' Conference',
            'starts_on' => '2026-04-30',
            'ends_on' => '2026-05-02',
            'capacity' => 820,
        ]);
        $tracks = collect();
        foreach ([['Worship & arts', 250], ['Pastoral leadership', 200], ['Counselling', 150], ['Youth & schools', 100], ['Bishops & elders', 120]] as [$tname, $cap]) {
            $tracks->push(ConferenceTrack::create(['conference_id' => $conf->id, 'name' => $tname, 'capacity' => $cap]));
        }
        $sessions = [
            ['Day 1 — Wed', 'Identity', 'Bishop Boateng', 'plenary', null, 520],
            ['Day 1 — Wed', 'Worship Lab', 'M. Chanda', 'track', $tracks[0]->id, 80],
            ['Day 2 — Thu', 'PAVEDDD overview', 'J. Adjei', 'plenary', null, 480],
            ['Day 2 — Thu', 'Counselling theology', 'R. Mwape', 'track', $tracks[2]->id, 98],
            ['Day 3 — Fri', 'Equipping the church', 'Panel', 'plenary', null, 0],
        ];
        foreach ($sessions as [$day, $name, $speaker, $kind, $tid, $rsvp]) {
            ConferenceSession::create([
                'conference_id' => $conf->id, 'track_id' => $tid,
                'day_label' => $day, 'name' => $name, 'speaker' => $speaker,
                'session_kind' => $kind, 'rsvp_count' => $rsvp,
            ]);
        }
        $regPastors = $pastors->random(min(25, $pastors->count()));
        foreach ($regPastors as $p) {
            $paid = fake()->boolean(75);
            ConferenceRegistration::create([
                'conference_id' => $conf->id,
                'pastor_id' => $p->id,
                'track_id' => $tracks->random()->id,
                'paid_amount' => $paid ? 40 : 0,
                'paid_in_full' => $paid,
                'registered_at' => fake()->dateTimeBetween('-2 months', 'now'),
            ]);
        }

        // Publicity channels
        $publicity = [
            ['Phoenix FM', 'radio', '620k reach', '3 spots / day · 14 days', 'live', 1800],
            ['Hot FM', 'radio', '410k reach', '2 spots / day · 14 days', 'live', 1200],
            ['Bus stops · 18 sites', 'ooh', 'est. 1.2M views', 'Print 60% · install 30%', 'in_progress', 980],
            ['Posters · 4,200', 'print', null, 'Print 90% · distribute 35%', 'in_progress', 980],
            ['SMS broadcast', 'sms', '85k recipients', 'Sender ID approved', 'scheduled', 0],
            ['Television · ZNBC', 'tv', '1.8M reach', 'Pending mayor letter', 'blocked', 0],
        ];
        foreach ($publicity as [$name, $type, $reach, $notes, $status, $spend]) {
            PublicityChannel::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'channel_type' => $type, 'reach_estimate' => $reach,
                'notes' => $notes, 'status' => $status, 'spend_to_date' => $spend,
            ]);
        }

        // Stakeholders
        $stakeholders = [
            ['Mayor Tembo', 'City of Lusaka', 'Mayor', 4, 'won', '2026-03-11'],
            ['Chief Imam Sayid', 'Lusaka Mosque', 'Imam', 4, 'won', '2026-02-22'],
            ['Bishop Banda', 'Catholic Diocese', 'Bishop', 4, 'won', '2026-03-08'],
            ['Min. Phiri', 'Religious Affairs', 'Permitting', 2, 'engaged', null],
            ['Chief Mukuni', 'Local council', 'Chief', 1, 'identified', null],
            ['Police Commissioner', 'LPS', 'Security', 3, 'committed', '2026-04-20'],
        ];
        foreach ($stakeholders as [$name, $org, $role, $stage, $label, $contact]) {
            Stakeholder::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'org' => $org, 'role' => $role,
                'pipeline_stage' => $stage, 'status_label' => $label,
                'last_contact_at' => $contact,
            ]);
        }

        // Permits
        $permits = [
            ['Crusade ground assembly', 'Religious Affairs', 'in_review', '2026-04-28', null],
            ['Sound clearance', 'Environmental', 'approved', null, '2026-04-09'],
            ['Traffic & parking', 'LPS', 'approved', null, '2026-04-12'],
        ];
        foreach ($permits as [$name, $agency, $status, $due, $signed]) {
            Permit::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'agency' => $agency, 'status' => $status,
                'due_on' => $due, 'signed_on' => $signed,
            ]);
        }
    }
}
