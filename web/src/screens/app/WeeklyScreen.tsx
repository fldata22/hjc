import { useEffect, useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell } from './Shell';
import {
  useCrusade,
  usePowers,
  useWeeklyLatest,
  useReplaceReadings,
  useUpdateWeeklyAssessment,
  useCreateWeeklyAssessment,
  useSubmitWeeklyAssessment,
  type Power,
} from '../../api/hooks';
import { useToast } from '../../lib/toast-context';
import './app.css';

type RatingMap = Record<number, number>; // power_id -> 0..10

function powerLetter(code: string): string {
  if (['pastors', 'donors', 'committees', 'pledges', 'volunteers'].includes(code)) return 'P';
  if (['awareness', 'publicity'].includes(code)) return 'A';
  if (['equipment'].includes(code)) return 'V';
  if (['govt'].includes(code)) return 'G';
  return 'D';
}

export function WeeklyScreen() {
  const [drawer, setDrawer] = useState(false);
  const { data: crusade } = useCrusade();
  const { data: powers } = usePowers();
  const { data: weekly, isLoading: weeklyLoading, isError: weeklyError } = useWeeklyLatest();

  const createMutation = useCreateWeeklyAssessment();
  const replaceReadingsMutation = useReplaceReadings();
  const updateMutation = useUpdateWeeklyAssessment();
  const submitMutation = useSubmitWeeklyAssessment();
  const toast = useToast();

  const [ratings, setRatings] = useState<RatingMap>({});
  const [touched, setTouched] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');
  const [decisionsNeeded, setDecisionsNeeded] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Hydrate local state from server when latest assessment loads.
  useEffect(() => {
    if (!weekly) return;
    const initial: RatingMap = {};
    const seen = new Set<number>();
    weekly.readings?.forEach((r) => {
      initial[r.power_id] = Math.round(r.value_pct / 10);
      seen.add(r.power_id);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRatings(initial);
    setTouched(seen);
    setNotes(weekly.notes ?? '');
    setDecisionsNeeded(weekly.decisions_needed ?? '');
    // Only re-hydrate when the assessment id changes; live mutations on the same record
    // shouldn't clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekly?.id]);

  const sortedPowers = useMemo(() => (powers ?? []).slice().sort((a, b) => a.order_index - b.order_index), [powers]);
  const total = sortedPowers.length;
  const completed = touched.size;
  const submitted = !!weekly?.submitted_at;

  const setRating = (powerId: number, n: number) => {
    setRatings((prev) => ({ ...prev, [powerId]: n }));
    setTouched((prev) => {
      if (prev.has(powerId)) return prev;
      const next = new Set(prev);
      next.add(powerId);
      return next;
    });
  };

  const ensureAssessment = async () => {
    if (weekly) return weekly;
    if (!crusade) throw new Error('No crusade loaded');
    return createMutation.mutateAsync({
      crusade_id: crusade.id,
      week_number: 1,
      prompted_at: new Date().toISOString(),
    });
  };

  const startNextWeek = async () => {
    if (!crusade || !weekly) return;
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        week_number: weekly.week_number + 1,
        prompted_at: new Date().toISOString(),
      });
      toast.show(`Started week ${weekly.week_number + 1}`);
      setRatings({});
      setTouched(new Set());
      setNotes('');
      setDecisionsNeeded('');
      setSavedAt(null);
    } catch {
      toast.show('Couldn’t start a new week', 'error');
    }
  };

  const persist = async (): Promise<number | null> => {
    try {
      const a = await ensureAssessment();
      const readings = Object.entries(ratings).map(([pid, n]) => ({ power_id: Number(pid), value_pct: n * 10 }));
      if (readings.length > 0) {
        await replaceReadingsMutation.mutateAsync({ id: a.id, readings });
      }
      await updateMutation.mutateAsync({
        id: a.id,
        body: { notes: notes || null, decisions_needed: decisionsNeeded || null },
      });
      setSavedAt(new Date());
      return a.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.show(msg, 'error');
      return null;
    }
  };

  const handleSave = async () => {
    const id = await persist();
    if (id !== null) toast.show('Saved');
  };

  const handleSubmit = async () => {
    const id = await persist();
    if (id === null) return;
    try {
      await submitMutation.mutateAsync(id);
      toast.show(`Week ${weekly?.week_number ?? ''} submitted`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Submit failed';
      toast.show(msg, 'error');
    }
  };

  const saveStatus = (() => {
    if (replaceReadingsMutation.isPending || updateMutation.isPending || createMutation.isPending) return 'Saving…';
    if (submitMutation.isPending) return 'Submitting…';
    if (submitted && weekly?.submitted_at) {
      const d = new Date(weekly.submitted_at);
      return `Submitted ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
    }
    if (savedAt) {
      return `Saved at ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return weekly ? 'Not yet saved' : 'Start a new week';
  })();

  const weekLabel = weekly?.week_number ?? 1;
  const isPending = replaceReadingsMutation.isPending || updateMutation.isPending || createMutation.isPending || submitMutation.isPending;

  return (
    <ResponsiveShell active="weekly">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="weekly-head">
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: submitted ? 'var(--ok)' : 'var(--accent)' }}/>
            {submitted ? `Submitted week ${weekLabel}` : `Week ${weekLabel} · readiness check-in`}
          </div>
          <h1 className="week serif">Week {weekLabel} <em>readiness</em></h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
            Rate each pillar 0–10. The 8 ops-derived pillars (pastors, awareness, donors, pledges, committees, publicity, govt, volunteers) auto-update from form data — your rating here is treated as the manual fallback for them and the primary signal for the 6 qualitative pillars.
          </p>
          <div className="progress">
            <span><b>{completed}</b> of {total} rated</span>
            <span>{total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
          </div>
          <div className="ptrack"><i style={{ width: (total > 0 ? completed / total * 100 : 0) + '%' }}/></div>
        </div>

        {weeklyLoading && (
          <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        )}
        {weeklyError && !weekly && (
          <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--ink-2)', textAlign: 'center' }}>
            No assessment yet. Rate the pillars below and tap <b>Save</b> to start week 1.
          </div>
        )}

        <div className="rate-grid">
          {sortedPowers.map((p: Power) => {
            const r = ratings[p.id];
            const hasRating = r !== undefined;
            return (
              <div className="rate-card" key={p.id}>
                <div className="top">
                  <span className="L serif">{powerLetter(p.code)}</span>
                  <span className="nm">{p.name}</span>
                  <span className="last">{p.description ?? ''}</span>
                </div>
                <div className="scale">
                  {Array.from({ length: 11 }, (_, n) => (
                    <span key={n} className={n === r ? 'on' : ''} onClick={() => setRating(p.id, n)}>{n}</span>
                  ))}
                </div>
                <div className="delta">
                  <span>Selected: <b>{hasRating ? `${r}/10` : '—'}</b></span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{hasRating ? `${r * 10}% pillar` : 'not rated'}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="weekly-section" style={{ padding: '22px 20px 8px' }}>
          <h2
            className="serif"
            style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.025em', marginBottom: 4 }}
          >
            Narrative <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>notes</em>
          </h2>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em', marginBottom: 8 }}>
            Two short reflections — central office reads these.
          </p>
        </div>
        <div className="fields narrative-grid" style={{ paddingTop: 0 }}>
          <div className="field">
            <div className="lbl"><span>This week's notes</span></div>
            <textarea
              className="input area"
              placeholder="What moved? What's stuck? Wins, blockers."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitted}
            />
          </div>
          <div className="field">
            <div className="lbl"><span>Decisions you need from central office</span></div>
            <textarea
              className="input area"
              placeholder="What do you need from us?"
              value={decisionsNeeded}
              onChange={(e) => setDecisionsNeeded(e.target.value)}
              disabled={submitted}
            />
          </div>
        </div>

        {submitted && (
          <div style={{ padding: '14px 20px 0' }}>
            <button
              type="button"
              className="btn primary"
              style={{ width: '100%' }}
              onClick={startNextWeek}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Starting…' : `Start week ${weekLabel + 1} →`}
            </button>
          </div>
        )}

        <div className="bot-pad"/>
      </div>

      <div className="action-bar">
        <div className="save-status">{saveStatus}</div>
        <button type="button" className="btn" onClick={handleSave} disabled={isPending || submitted}>Save</button>
        <button type="button" className="btn primary" onClick={handleSubmit} disabled={isPending || submitted}>
          {submitted ? `W${weekLabel} submitted` : `Submit W${weekLabel} →`}
        </button>
      </div>

      {drawer && <Drawer active="weekly" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
