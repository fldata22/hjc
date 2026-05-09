import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import {
  usePastorStageCounts,
  useCommitteeMembers,
  useAwarenessSurveys,
  useWeeklyLatest,
  useBudgetSummary,
} from '../../api/hooks';
import './app.css';

type FormRow = { n: string; p: string; meta: string; due: string; dueClass: 'ok' | 'warn' | 'urgent'; slug: string };

const FormGroup = ({ rows }: { rows: FormRow[] }) => {
  const navigate = useNavigate();
  const goto = (slug: string) => () => {
    if (slug === 'weekly') navigate('/weekly');
    else navigate(`/forms/${slug}`);
  };
  return (
    <div className="form-list forms-grid">
      {rows.map((r, i) => (
        <button
          type="button"
          className="form-row"
          key={i}
          onClick={goto(r.slug)}
          style={{ background: 'transparent', border: 0, padding: '16px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
        >
          <div>
            <div className="name">{r.n}</div>
            <div className="meta">
              <span className="pillar serif">{r.p}</span>
              <span className="d">·</span>
              <span>{r.meta}</span>
            </div>
          </div>
          <div className="right">
            <div className={'due ' + r.dueClass}>{r.due}</div>
            <div className="arr">›</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export function FormsScreen() {
  const [drawer, setDrawer] = useState(false);

  // Live data for hub-row meta. Each hook is independently cached by React Query.
  const { data: pastorCounts } = usePastorStageCounts();
  const { data: bot } = useCommitteeMembers('bot');
  const { data: cpc } = useCommitteeMembers('cpc');
  const { data: surveys } = useAwarenessSurveys();
  const { data: weekly } = useWeeklyLatest();
  const { data: budget } = useBudgetSummary();

  const pcmMeta = useMemo(() => {
    if (!pastorCounts) return 'Loading…';
    const confirmed = pastorCounts.committed + pastorCounts.active + pastorCounts.champion;
    return `${confirmed} of ${pastorCounts.total} confirmed`;
  }, [pastorCounts]);

  const botMeta = useMemo(() => {
    if (!bot) return 'Loading…';
    const confirmed = bot.filter((m) => m.status === 'confirmed').length;
    return `${confirmed} of ${bot.length} confirmed`;
  }, [bot]);

  const cpcMeta = useMemo(() => {
    if (!cpc) return 'Loading…';
    const active = cpc.filter((m) => m.status === 'active').length;
    return `${active} of ${cpc.length} active`;
  }, [cpc]);

  const awarenessMeta = useMemo(() => {
    if (!surveys) return 'Loading…';
    if (surveys.length === 0) return 'No waves logged yet';
    const lastWave = Math.max(...surveys.map((s) => s.survey_number));
    const wavesUnique = new Set(surveys.map((s) => s.survey_number)).size;
    return `${wavesUnique} wave${wavesUnique === 1 ? '' : 's'} logged · last W${lastWave}`;
  }, [surveys]);

  const weeklyMeta = useMemo(() => {
    if (!weekly) return 'No assessment yet';
    const wn = weekly.week_number;
    return weekly.submitted_at
      ? `W${wn} submitted ${new Date(weekly.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
      : `W${wn} awaiting submission`;
  }, [weekly]);

  const expensesMeta = useMemo(() => {
    if (!budget) return 'Loading…';
    const spent = Number(budget.spent);
    const total = Number(budget.total_budget);
    const fmt = (n: number) => '₵' + (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString());
    return `${fmt(spent)} of ${fmt(total)}`;
  }, [budget]);

  const participation: FormRow[] = useMemo(() => [
    { n: 'PCM (Primary Committee Members)', p: 'P1', meta: pcmMeta, due: 'OK', dueClass: 'ok', slug: 'pcm' },
    { n: 'Fathers of the Land',             p: 'P2', meta: 'Coming soon',                due: '—',  dueClass: 'ok', slug: 'fathers' },
    { n: 'BOT (Board of Trustees)',         p: 'P3', meta: botMeta, due: 'OK', dueClass: 'ok', slug: 'bot' },
    { n: 'CPC (Central Planning)',          p: 'P4', meta: cpcMeta, due: 'OK', dueClass: 'ok', slug: 'cpc' },
    { n: 'Stakeholders (VIP funnel)',       p: 'P5', meta: 'Mayors, bishops, donors',  due: 'OK', dueClass: 'ok', slug: 'stakeholders' },
    { n: 'Worker Groups',                   p: 'P6', meta: 'Choir, ushers, security…', due: 'OK', dueClass: 'ok', slug: 'workers' },
    { n: 'Pledge Meetings',                 p: 'P7', meta: 'Schedule + record pledges', due: 'OK', dueClass: 'ok', slug: 'pledge-meetings' },
  ], [pcmMeta, botMeta, cpcMeta]);

  const awareness: FormRow[] = useMemo(() => [
    { n: 'Awareness Survey · Field',  p: 'A9',    meta: awarenessMeta,                  due: 'OK', dueClass: 'ok',   slug: 'awareness-survey' },
    { n: 'Town Profile',              p: 'A·all', meta: 'Per-zone baseline',            due: 'OK', dueClass: 'ok',   slug: 'town-profile' },
    { n: 'Publicity & Video Campaign', p: 'D13',  meta: 'Campaign asset log',           due: 'OK', dueClass: 'ok',   slug: 'publicity' },
  ], [awarenessMeta]);

  const venue: FormRow[] = useMemo(() => [
    { n: 'Venue Inspection (Regular)', p: 'V10', meta: 'Per-visit checklist',          due: 'OK', dueClass: 'ok', slug: 'venue-inspection' },
    { n: 'Must-Do Checklist',          p: 'V10', meta: 'Pre-crusade items',            due: 'OK', dueClass: 'ok', slug: 'must-do' },
    { n: 'Permits Tracker',            p: 'V11', meta: 'Police, fire, city, health',   due: 'OK', dueClass: 'ok', slug: 'permits' },
    { n: 'Sound & Lighting Setup',     p: 'V12', meta: 'Providers + power plan',       due: 'OK', dueClass: 'ok', slug: 'sound-lighting' },
    { n: 'Seating & Capacity Plan',    p: 'V13', meta: 'VIP / general / counsellor',   due: 'OK', dueClass: 'ok', slug: 'seating-plan' },
  ], []);

  const daily: FormRow[] = useMemo(() => [
    { n: 'Weekly Assessment Rating', p: 'All',    meta: weeklyMeta,                    due: 'WEEKLY',   dueClass: 'warn',   slug: 'weekly' },
    { n: 'Crusade Daily Expenses',   p: 'Budget', meta: expensesMeta,                  due: 'DAILY',    dueClass: 'ok',     slug: 'daily-expenses' },
    { n: 'Daily Attendance',         p: 'D14',    meta: 'Per-night headcount',         due: 'DAILY',    dueClass: 'ok',     slug: 'daily-attendance' },
    { n: 'Daily Decisions',          p: 'D15',    meta: 'Salvations, healings, etc.',  due: 'DAILY',    dueClass: 'ok',     slug: 'daily-decisions' },
    { n: 'Daily Program Log',        p: 'D16',    meta: 'Speaker, topic, narrative',   due: 'DAILY',    dueClass: 'ok',     slug: 'daily-program' },
    { n: 'Daily Security Incident',  p: 'D17',    meta: 'Crowd / safety log',          due: 'AS-NEEDED', dueClass: 'ok',    slug: 'daily-security' },
    { n: 'Daily Medical Incident',   p: 'D18',    meta: 'First aid / hospital log',    due: 'AS-NEEDED', dueClass: 'ok',    slug: 'daily-medical' },
    { n: 'Activity Quick-Log',       p: 'D19',    meta: 'One-line micro-log',          due: 'ANYTIME',   dueClass: 'ok',    slug: 'activity-quick-log' },
  ], [weeklyMeta, expensesMeta]);

  return (
    <ResponsiveShell active="forms">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="forms-hero" style={{ padding: '20px 20px 0' }}>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            23 forms · 4 categories
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            All <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>intake</em><br/>forms.
          </h1>
        </div>

        <div className="cat-group">
          <div className="cat-head"><span>P · Participation</span><span>7 forms</span></div>
        </div>
        <FormGroup rows={participation}/>

        <div className="cat-group">
          <div className="cat-head"><span>A · Awareness</span><span>3 forms</span></div>
        </div>
        <FormGroup rows={awareness}/>

        <div className="cat-group">
          <div className="cat-head"><span>V · Venue & Logistics</span><span>5 forms</span></div>
        </div>
        <FormGroup rows={venue}/>

        <div className="cat-group">
          <div className="cat-head"><span>D · Daily ops</span><span>8 forms</span></div>
        </div>
        <FormGroup rows={daily}/>

        <div className="bot-pad"/>
      </div>
      <TabBar active="forms"/>
      {drawer && <Drawer active="forms" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
