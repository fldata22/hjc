import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Drawer, ResponsiveShell, TabBar, useDrawer } from './Shell';
import {
  usePastorStageCounts,
  useCommitteeMembers,
  useAwarenessSurveys,
  useWeeklyLatest,
  useBudgetSummary,
} from '../../api/hooks';
import './app.css';

type DueClass = 'ok' | 'warn' | 'urgent';
type FormRow = { n: string; p: string; meta: string; due: string; dueClass: DueClass; slug: string };

const FormGroup = ({ title, count, rows }: { title: string; count: number; rows: FormRow[] }) => {
  const navigate = useNavigate();
  const goto = (slug: string) => () => {
    if (slug === 'weekly') navigate('/weekly');
    else navigate(`/forms/${slug}`);
  };
  return (
    <>
      <div className="sec-label" style={{ paddingTop: 20 }}>
        {title}
        <span className="sec-count">{count}</span>
      </div>
      <div className="divider full"/>
      {rows.map((r, i) => (
        <button type="button" className="form-list-row" key={i} onClick={goto(r.slug)}>
          <div>
            <div className="flr-name">{r.n}</div>
            <div className="flr-meta">{r.p} · {r.meta}</div>
          </div>
          <div className="flr-right">
            <div className={`flr-status ${r.dueClass}`}>{r.due}</div>
            <div className="flr-arr">›</div>
          </div>
        </button>
      ))}
    </>
  );
};

export function FormsScreen() {
  const drawer = useDrawer();

  const { data: pastorCounts } = usePastorStageCounts();
  const { data: bot } = useCommitteeMembers('bot');
  const { data: cpc } = useCommitteeMembers('cpc');
  const { data: surveys } = useAwarenessSurveys();
  const { data: weekly } = useWeeklyLatest();
  const { data: budget } = useBudgetSummary();

  const pcmMeta = useMemo(() => {
    if (!pastorCounts) return '…';
    const confirmed = pastorCounts.committed + pastorCounts.active + pastorCounts.champion;
    return `${confirmed} of ${pastorCounts.total} confirmed`;
  }, [pastorCounts]);

  const botMeta = useMemo(() => {
    if (!bot) return '…';
    const confirmed = bot.filter((m) => m.status === 'confirmed').length;
    return `${confirmed} of ${bot.length} confirmed`;
  }, [bot]);

  const cpcMeta = useMemo(() => {
    if (!cpc) return '…';
    const active = cpc.filter((m) => m.status === 'active').length;
    return `${active} of ${cpc.length} active`;
  }, [cpc]);

  const awarenessMeta = useMemo(() => {
    if (!surveys) return '…';
    if (surveys.length === 0) return 'No waves logged yet';
    const lastWave = Math.max(...surveys.map((s) => s.survey_number));
    const wavesUnique = new Set(surveys.map((s) => s.survey_number)).size;
    return `${wavesUnique} wave${wavesUnique === 1 ? '' : 's'} · last W${lastWave}`;
  }, [surveys]);

  const weeklyMeta = useMemo(() => {
    if (!weekly) return 'No assessment yet';
    const wn = weekly.week_number;
    return weekly.submitted_at
      ? `W${wn} submitted ${new Date(weekly.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
      : `W${wn} awaiting submission`;
  }, [weekly]);

  const expensesMeta = useMemo(() => {
    if (!budget) return '…';
    const spent = Number(budget.spent);
    const total = Number(budget.total_budget);
    const fmt = (n: number) => '₵' + (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString());
    return `${fmt(spent)} of ${fmt(total)}`;
  }, [budget]);

  const participation: FormRow[] = useMemo(() => [
    { n: 'PCM (Primary Committee Members)', p: 'P1', meta: pcmMeta,  due: 'OK', dueClass: 'ok',   slug: 'pcm' },
    { n: 'Fathers of the Land',             p: 'P2', meta: 'Elders + chiefs',            due: 'OK', dueClass: 'ok',   slug: 'fathers' },
    { n: 'BOT (Board of Trustees)',         p: 'P3', meta: botMeta,  due: 'OK', dueClass: 'ok',   slug: 'bot' },
    { n: 'CPC (Central Planning)',          p: 'P4', meta: cpcMeta,  due: 'OK', dueClass: 'ok',   slug: 'cpc' },
    { n: 'Stakeholders',                    p: 'P5', meta: 'Mayors, bishops, donors',     due: 'OK', dueClass: 'ok',   slug: 'stakeholders' },
    { n: 'Worker Groups',                   p: 'P6', meta: 'Choir, ushers, security…',   due: 'OK', dueClass: 'ok',   slug: 'workers' },
    { n: 'Pledge Meetings',                 p: 'P7', meta: 'Schedule + record pledges',  due: 'OK', dueClass: 'ok',   slug: 'pledge-meetings' },
    { n: 'Donor Roster',                    p: 'P8', meta: 'Money funnel · pledges',     due: 'OK', dueClass: 'ok',   slug: 'donors' },
  ], [pcmMeta, botMeta, cpcMeta]);

  const awareness: FormRow[] = useMemo(() => [
    { n: 'Awareness Survey',      p: 'A9',    meta: awarenessMeta,                due: 'OK', dueClass: 'ok', slug: 'awareness-survey' },
    { n: 'Town Profile',          p: 'A·all', meta: 'Per-zone baseline',          due: 'OK', dueClass: 'ok', slug: 'town-profile' },
    { n: 'Publicity & Video',     p: 'D13',   meta: 'Campaign asset log',         due: 'OK', dueClass: 'ok', slug: 'publicity' },
    { n: 'Door-to-Door Outreach', p: 'A·all', meta: 'Per-zone sweep log',         due: 'OK', dueClass: 'ok', slug: 'door-to-door' },
    { n: 'Convoy Outreach',       p: 'A·all', meta: 'Mobile evangelism runs',     due: 'OK', dueClass: 'ok', slug: 'convoy' },
    { n: 'Media Coverage',        p: 'A·all', meta: 'Newspaper, radio, TV',       due: 'OK', dueClass: 'ok', slug: 'media-coverage' },
  ], [awarenessMeta]);

  const venue: FormRow[] = [
    { n: 'Venue Inspection',   p: 'V10', meta: 'Per-visit checklist',         due: 'OK', dueClass: 'ok', slug: 'venue-inspection' },
    { n: 'Must-Do Checklist',  p: 'V10', meta: 'Pre-crusade items',           due: 'OK', dueClass: 'ok', slug: 'must-do' },
    { n: 'Permits Tracker',    p: 'V11', meta: 'Police, fire, city, health',  due: 'OK', dueClass: 'ok', slug: 'permits' },
    { n: 'Sound & Lighting',   p: 'V12', meta: 'Providers + power plan',      due: 'OK', dueClass: 'ok', slug: 'sound-lighting' },
    { n: 'Seating Plan',       p: 'V13', meta: 'VIP / general / counsellor',  due: 'OK', dueClass: 'ok', slug: 'seating-plan' },
  ];

  const daily: FormRow[] = useMemo(() => [
    { n: 'Weekly Assessment',   p: 'All',    meta: weeklyMeta,    due: 'WEEKLY',    dueClass: 'warn', slug: 'weekly' },
    { n: 'Daily Expenses',      p: 'Budget', meta: expensesMeta,  due: 'DAILY',     dueClass: 'ok',   slug: 'daily-expenses' },
    { n: 'Daily Attendance',    p: 'D14',    meta: 'Per-night headcount',    due: 'DAILY', dueClass: 'ok', slug: 'daily-attendance' },
    { n: 'Daily Decisions',     p: 'D15',    meta: 'Salvations, healings…',  due: 'DAILY', dueClass: 'ok', slug: 'daily-decisions' },
    { n: 'Daily Program',       p: 'D16',    meta: 'Speaker, topic, notes',  due: 'DAILY', dueClass: 'ok', slug: 'daily-program' },
    { n: 'Security Incident',   p: 'D17',    meta: 'Crowd / safety log',     due: 'AS NEEDED', dueClass: 'ok', slug: 'daily-security' },
    { n: 'Medical Incident',    p: 'D18',    meta: 'First aid / hospital',   due: 'AS NEEDED', dueClass: 'ok', slug: 'daily-medical' },
    { n: 'Activity Quick-Log',  p: 'D19',    meta: 'One-line micro-log',     due: 'ANYTIME',   dueClass: 'ok', slug: 'activity-quick-log' },
  ], [weeklyMeta, expensesMeta]);

  return (
    <ResponsiveShell active="forms">
      <AppBar title="Forms" onMenu={drawer.show}/>
      <div className="scroll">
        <FormGroup title="P · Participation" count={8}  rows={participation}/>
        <FormGroup title="A · Awareness"     count={6}  rows={awareness}/>
        <FormGroup title="V · Venue"         count={5}  rows={venue}/>
        <FormGroup title="D · Daily ops"     count={8}  rows={daily}/>
        <div className="bot-pad"/>
      </div>
      <TabBar active="forms"/>
      {drawer.open && <Drawer active="forms" onClose={drawer.hide}/>}
    </ResponsiveShell>
  );
}
