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
use App\Models\CommitteeMember;
use App\Models\User;
use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
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
            'population' => 2200000,
            'pap' => 1800000,
            'convoy_target' => 24,
            'makarios_target' => 500,
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

        // Committee members (BOT + CPC)
        $committeeMembers = [
            ['bot', 'Rev. Edmund Asare', 'Chair', 'Wa Council of Churches', '+233 24 555 0100', null, 'confirmed', null],
            ['bot', 'Mrs. Adwoa Mensah', 'Treasurer', 'Christ Apostolic', '+233 24 555 0101', null, 'confirmed', null],
            ['bot', 'Pastor Kwaku Frimpong', 'Secretary', 'Living Word', '+233 24 555 0102', null, 'pending', null],
            ['cpc', 'Akua Boateng', 'Zone Coordinator', 'Wa Central', '+233 24 555 0301', null, 'active', null],
            ['cpc', 'Yaw Owusu', 'Logistics Lead', 'Wa North', '+233 24 555 0302', null, 'active', null],
            ['cpc', 'Pst. Daniel Ofori', 'Pastor Liaison', 'Wa South', '+233 24 555 0303', null, 'active', null],
            ['cpc', 'Mary Asante', 'Volunteer Manager', 'Wa East', '+233 24 555 0304', null, 'on-leave', null],
        ];
        foreach ($committeeMembers as [$kind, $name, $role, $org, $phone, $email, $status, $notes]) {
            CommitteeMember::create([
                'crusade_id' => $crusade->id, 'kind' => $kind, 'name' => $name, 'role' => $role,
                'org' => $org, 'phone' => $phone, 'email' => $email, 'status' => $status, 'notes' => $notes,
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

        // Budget categories — 8 categories matching DW.11
        $cats = collect();
        foreach ([
            ['Crusade ground & sound', 18000, 1],
            ['Publicity (radio · print · OOH)', 16000, 2],
            ['Conference (venue · meals · materials)', 14000, 3],
            ['Worker training (rehearsals · transport)', 8000, 4],
            ['Convoy & logistics (24 buses target)', 9000, 5],
            ['Hospitality & accommodation', 7000, 6],
            ['Counselling & follow-up', 5000, 7],
            ['Contingency · 5%', 3000, 8],
        ] as [$name, $alloc, $idx]) {
            $cats->push(BudgetCategory::create([
                'crusade_id' => $crusade->id,
                'name' => $name, 'allocated_amount' => $alloc, 'order_index' => $idx,
            ]));
        }

        foreach ([
            ['Donation · BoT pool', '2026-04-08', 12000],
            ['Donation · Faith Trust', '2026-04-12', 5000],
            ['Donation · monthly partners', '2026-04-01', 8000],
            ['Donation · Bishop Banda', '2026-03-25', 3500],
            ['Donation · large gift', '2026-03-15', 25000],
            ['Donation · pastors pool', '2026-04-18', 9000],
        ] as [$desc, $on, $amt]) {
            BudgetTransaction::create([
                'crusade_id' => $crusade->id, 'budget_category_id' => null,
                'description' => $desc, 'occurred_on' => $on,
                'kind' => 'income', 'amount' => $amt,
            ]);
        }

        $cgs = $cats->firstWhere('name', 'Crusade ground & sound');
        $pub = $cats->firstWhere('name', 'Publicity (radio · print · OOH)');
        $confCat = $cats->firstWhere('name', 'Conference (venue · meals · materials)');
        $wt = $cats->firstWhere('name', 'Worker training (rehearsals · transport)');
        $logi = $cats->firstWhere('name', 'Convoy & logistics (24 buses target)');
        $hosp = $cats->firstWhere('name', 'Hospitality & accommodation');
        $couns = $cats->firstWhere('name', 'Counselling & follow-up');
        foreach ([
            ['Phoenix FM · radio buy day 1', '2026-04-15', $pub->id, 1800],
            ['Hot FM · radio buy', '2026-04-15', $pub->id, 1200],
            ['Posters · 4,200 print', '2026-04-11', $pub->id, 980],
            ['Bus stops · OOH install', '2026-04-10', $pub->id, 980],
            ['SMS broadcast prep', '2026-04-12', $pub->id, 280],
            ['ZNBC TV deposit', '2026-04-14', $pub->id, 7180],
            ['Conference deposit · venue', '2026-04-12', $confCat->id, 2500],
            ['Conference catering · day 1', '2026-04-20', $confCat->id, 4200],
            ['Conference handouts print', '2026-04-08', $confCat->id, 3100],
            ['Stage hire', '2026-04-05', $cgs->id, 6500],
            ['Sound system rental', '2026-04-08', $cgs->id, 4700],
            ['Rehearsal hall rent · M3', '2026-04-10', $wt->id, 450],
            ['Rehearsal hall rent · M4', '2026-04-17', $wt->id, 450],
            ['Worker training catering', '2026-04-12', $wt->id, 4500],
            ['Bus deposits (4 vehicles)', '2026-04-15', $logi->id, 2200],
            ['Bishop residence catering', '2026-04-18', $hosp->id, 1900],
            ['Counselling booth setup', '2026-04-05', $couns->id, 800],
        ] as [$desc, $on, $catId, $amt]) {
            BudgetTransaction::create([
                'crusade_id' => $crusade->id, 'budget_category_id' => $catId,
                'description' => $desc, 'occurred_on' => $on,
                'kind' => 'expense', 'amount' => $amt,
            ]);
        }

        // Weekly assessments — 8 weeks. Latest (week 8) carries the DW.1/DW.12 hi-fi readings.
        $hifiReadings = [
            'pastors' => 78, 'awareness' => 21, 'volunteers' => 2, 'equipment' => 64,
            'decisions' => null, 'discipleship' => null, 'donors' => 71, 'drama' => 55,
            'events' => 38, 'pledges' => null, 'committees' => 50, 'publicity' => 30,
            'budget' => 55, 'govt' => 70,
        ];
        $allPowers = \App\Models\Power::all()->keyBy('code');
        for ($w = 1; $w <= 8; $w++) {
            $a = WeeklyAssessment::create([
                'crusade_id' => $crusade->id,
                'week_number' => $w,
                'prompted_at' => now()->subWeeks(8 - $w)->startOfWeek()->setHour(21),
                'self_score' => $w === 8 ? 6 : fake()->numberBetween(4, 8),
                'notes' => $w === 8 ? "Awareness still red. Volunteers stuck. But pastors and donors strong. PCM #4 next week should move volunteers." : fake()->paragraph(),
                'decisions_needed' => $w === 8 ? "Approve \$4k extra for two more radio stations. Approve hiring 2 zonal coordinators on stipend." : null,
                'submitted_at' => $w < 8 ? now()->subWeeks(8 - $w)->startOfWeek()->setHour(22) : null,
            ]);

            foreach ($hifiReadings as $code => $latestPct) {
                if ($latestPct === null) continue;
                $power = $allPowers->get($code);
                if (! $power) continue;
                $weekFactor = $w / 8;
                $value = (int) max(0, min(100, round($latestPct * $weekFactor)));
                WeeklyAssessmentReading::create([
                    'weekly_assessment_id' => $a->id,
                    'power_id' => $power->id,
                    'value_pct' => $value,
                ]);
            }

            if ($w === 8) {
                foreach ([
                    [1, 'critical', 'Awareness still red after radio launch'],
                    [2, 'critical', 'Worker rehearsals not scaling beyond 11 zones'],
                    [3, 'high', 'Crusade permit still pending — escalate to Bishop'],
                ] as [$ord, $sev, $text]) {
                    WeeklyAssessmentRisk::create([
                        'weekly_assessment_id' => $a->id,
                        'ordering' => $ord, 'severity' => $sev, 'text' => $text,
                    ]);
                }
            }
        }
    }
}
