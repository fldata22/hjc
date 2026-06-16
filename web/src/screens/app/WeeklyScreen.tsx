import { useEffect, useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, useDrawer as useDrawerState } from './Shell';
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

export function WeeklyScreen() {
  const { data: crusade } = useCrusade();
  const { data: powers } = usePowers();
  const { data: weekly, isLoading: weeklyLoading } = useWeeklyLatest();

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
      toast.show('Could not start a new week', 'error');
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

  const drawer2 = useDrawerState();

  return (
    <ResponsiveShell active="weekly">
      <AppBar
        title={`Week ${weekLabel}`}
        sub={submitted ? 'submitted' : 'readiness check-in'}
        onMenu={drawer2.show}
      />

      <div className="weekly-progress">
        <span className="wp-label">{completed} / {total} rated</span>
        <div className="wp-bar">
          <div className="wp-fill" style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}/>
        </div>
        <span className="wp-count">{total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
      </div>

      <div className="scroll">
        <div className="weekly-desc">
          Rate each pillar 0–10. Ops-derived pillars (pastors, awareness, donors, pledges, committees, publicity, govt, volunteers) auto-update from form data — your rating is the manual fallback and primary signal for the 6 qualitative pillars.
        </div>

        {weeklyLoading && <div className="empty-state">Loading…</div>}

        {sortedPowers.map((p: Power) => {
          const r = ratings[p.id];
          return (
            <div className="rating-row" key={p.id}>
              <div className="rating-name">
                {p.name}
                {r !== undefined && (
                  <span style={{ float: 'right', fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>
                    {r}/10 · {r * 10}%
                  </span>
                )}
              </div>
              <div className="rating-pips">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    className={'rating-pip' + (n === r ? ' on' : '')}
                    onClick={() => setRating(p.id, n)}
                    disabled={submitted}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div className="weekly-field">
          <label>This week's notes</label>
          <textarea
            className="weekly-textarea"
            placeholder="What moved? What's stuck? Wins, blockers."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitted}
          />
        </div>

        <div className="weekly-field">
          <label>Decisions needed from central office</label>
          <textarea
            className="weekly-textarea"
            placeholder="What do you need from us?"
            value={decisionsNeeded}
            onChange={(e) => setDecisionsNeeded(e.target.value)}
            disabled={submitted}
          />
        </div>

        {submitted && (
          <div style={{ padding: '16px 20px' }}>
            <button
              type="button"
              className="btn-primary"
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
        <button type="button" className="btn-secondary" onClick={handleSave} disabled={isPending || submitted}>Save</button>
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isPending || submitted}>
          {submitted ? `W${weekLabel} submitted` : `Submit →`}
        </button>
      </div>

      {drawer2.open && <Drawer active="weekly" onClose={drawer2.hide}/>}
    </ResponsiveShell>
  );
}
