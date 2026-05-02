import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { DateField, NumberField } from './fields';
import {
  useCrusade,
  useZones,
  useAwarenessSurveys,
  useCreateAwarenessSurvey,
  type Zone,
  type AwarenessSurveyRow,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { todayISO } from '../../lib/dateHelpers';
import './forms.css';

type RowDraft = {
  zone_id: number;
  surveyed: number | '';
  attending: number | '';
};

const emptyRows = (zones: Zone[]): RowDraft[] =>
  zones.map((z) => ({ zone_id: z.id, surveyed: '', attending: '' }));

const formatTakenOn = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const ErrorBanner = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
  <div style={{
    padding: '14px 16px',
    margin: '12px 20px',
    background: 'var(--accent-bg)',
    border: '1px solid var(--accent-soft)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  }}>
    <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load {what}.</div>
    <button
      type="button"
      onClick={onRetry}
      style={{
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 999,
        border: '1px solid var(--accent)',
        background: 'transparent',
        color: 'var(--accent)',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </div>
);

type WaveSummary = {
  survey_number: number;
  zones_count: number;
  pct: number;
  taken_on: string;
  rows: AwarenessSurveyRow[];
};

function summarizeWaves(rows: AwarenessSurveyRow[]): WaveSummary[] {
  const byWave = new Map<number, AwarenessSurveyRow[]>();
  for (const r of rows) {
    const list = byWave.get(r.survey_number) ?? [];
    list.push(r);
    byWave.set(r.survey_number, list);
  }
  return Array.from(byWave.entries())
    .map(([survey_number, rs]) => {
      const surveyed = rs.reduce((s, r) => s + r.surveyed_count, 0);
      const attending = rs.reduce((s, r) => s + r.attending_yes_count, 0);
      // Use the latest taken_on within the wave for the display date.
      const taken_on = rs.map((r) => r.taken_on).sort().slice(-1)[0] ?? '';
      return {
        survey_number,
        zones_count: rs.length,
        pct: surveyed > 0 ? Math.round((attending / surveyed) * 100) : 0,
        taken_on,
        rows: rs,
      };
    })
    .sort((a, b) => b.survey_number - a.survey_number);
}

export function AwarenessSurveyForm() {
  const navigate = useNavigate();

  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: zones, isLoading: zonesLoading, isError: zonesError, refetch: refetchZones } = useZones();
  const { data: surveys, isLoading: surveysLoading, isError: surveysError, refetch: refetchSurveys } = useAwarenessSurveys();
  const createMutation = useCreateAwarenessSurvey();

  const defaultWave = useMemo(() => {
    if (!surveys || surveys.length === 0) return 1;
    return Math.max(...surveys.map((r) => r.survey_number));
  }, [surveys]);

  const wavesSummary = useMemo(() => summarizeWaves(surveys ?? []), [surveys]);

  const currentWaveStats = useMemo(() => {
    if (!surveys) return { zones_logged: 0, pct: null as number | null };
    const inWave = surveys.filter((r) => r.survey_number === defaultWave);
    const surveyed = inWave.reduce((s, r) => s + r.surveyed_count, 0);
    const attending = inWave.reduce((s, r) => s + r.attending_yes_count, 0);
    return {
      zones_logged: inWave.length,
      pct: surveyed > 0 ? Math.round((attending / surveyed) * 100) : null,
    };
  }, [surveys, defaultWave]);

  const [showForm, setShowForm] = useState(false);
  const [waveNumber, setWaveNumber] = useState<number | ''>('');
  const [takenOn, setTakenOn] = useState<string>(todayISO());
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [submittedZoneIds, setSubmittedZoneIds] = useState<Set<number>>(new Set());
  const [expandedWave, setExpandedWave] = useState<number | null>(null);

  const openForm = () => {
    if (!zones) return;
    setWaveNumber(defaultWave);
    setTakenOn(todayISO());
    setRows(emptyRows(zones));
    setRowErrors({});
    setSubmittedZoneIds(new Set());
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setRowErrors({});
  };

  const updateRow = (zone_id: number, patch: Partial<RowDraft>) => {
    setRows((rs) => rs.map((r) => (r.zone_id === zone_id ? { ...r, ...patch } : r)));
  };

  const rowHasMismatch = (r: RowDraft): boolean => {
    const a = typeof r.attending === 'number' ? r.attending : 0;
    const s = typeof r.surveyed === 'number' ? r.surveyed : 0;
    return a > s;
  };

  const validRows = rows.filter(
    (r) => typeof r.surveyed === 'number' && r.surveyed > 0 && !submittedZoneIds.has(r.zone_id)
  );
  const anyMismatch = rows.some(rowHasMismatch);
  const canSubmit =
    typeof waveNumber === 'number' &&
    waveNumber > 0 &&
    !!takenOn &&
    validRows.length > 0 &&
    !anyMismatch &&
    !createMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !crusade) return;
    setRowErrors({});
    const results = await Promise.allSettled(
      validRows.map((r) =>
        createMutation.mutateAsync({
          crusade_id: crusade.id,
          zone_id: r.zone_id,
          survey_number: waveNumber as number,
          surveyed_count: r.surveyed as number,
          attending_yes_count: typeof r.attending === 'number' ? r.attending : 0,
          taken_on: takenOn,
        })
      )
    );
    const failures = results
      .map((res, i) => ({ res, row: validRows[i] }))
      .filter(({ res }) => res.status === 'rejected');
    const succeededZoneIds = results
      .map((res, i) => ({ res, row: validRows[i] }))
      .filter(({ res }) => res.status === 'fulfilled')
      .map(({ row }) => row.zone_id);
    if (succeededZoneIds.length > 0) {
      setSubmittedZoneIds((prev) => {
        const next = new Set(prev);
        succeededZoneIds.forEach((id) => next.add(id));
        return next;
      });
    }
    if (failures.length === 0) {
      alert(`Wave ${waveNumber} logged · ${validRows.length} zone${validRows.length === 1 ? '' : 's'}`);
      closeForm();
      return;
    }
    const errs: Record<number, string> = {};
    failures.forEach(({ res, row }) => {
      const reason = (res as PromiseRejectedResult).reason;
      let message = 'Failed';
      if (reason instanceof ApiError) {
        const body = reason.body;
        if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
          message = (body as { message: string }).message;
        } else {
          message = reason.message;
        }
      } else if (reason instanceof Error) {
        message = reason.message;
      }
      errs[row.zone_id] = message;
    });
    setRowErrors(errs);
  };

  // Bootstrap: full-screen skeleton/error if crusade or zones is unavailable.
  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Awareness <em>Survey</em></>} pillar="A9" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <ErrorBanner what="crusade" onRetry={refetchCrusade}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (zonesError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Awareness <em>Survey</em></>} pillar="A9" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <ErrorBanner what="zones" onRetry={refetchZones}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (crusadeLoading || zonesLoading || !crusade || !zones) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Awareness <em>Survey</em></>} pillar="A9" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const zoneById = new Map(zones.map((z) => [z.id, z] as const));

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Awareness <em>Survey</em></>}
        pillar="A9"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">Wave {defaultWave}</div>
            <div className="lbl">{currentWaveStats.zones_logged} zone{currentWaveStats.zones_logged === 1 ? '' : 's'} logged</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{currentWaveStats.pct === null ? '—' : `${currentWaveStats.pct}%`}</b> aware</div>
            <div className="lbl" style={{ fontSize: 10 }}>(wave {defaultWave})</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <div className="cat-head" style={{ padding: '8px 0', marginBottom: 4 }}>
            <span>Past waves</span>
          </div>
          {surveysError ? (
            <ErrorBanner what="past waves" onRetry={refetchSurveys}/>
          ) : surveysLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : wavesSummary.length === 0 ? (
            <div className="empty">No surveys logged yet.</div>
          ) : (
            wavesSummary.map((w) => (
              <div key={w.survey_number}>
                <button
                  type="button"
                  className="form-list-row"
                  onClick={() => setExpandedWave(expandedWave === w.survey_number ? null : w.survey_number)}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, fontFamily: 'inherit', cursor: 'pointer', padding: '10px 0' }}
                >
                  <div>
                    <div className="name">Wave {w.survey_number}</div>
                    <div className="sub">{w.zones_count} zone{w.zones_count === 1 ? '' : 's'} · {w.pct}% · {formatTakenOn(w.taken_on)}</div>
                  </div>
                  <div className="right" aria-hidden="true">
                    <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{expandedWave === w.survey_number ? '⌃' : '›'}</span>
                  </div>
                </button>
                {expandedWave === w.survey_number && (
                  <div style={{ padding: '4px 0 12px 16px' }}>
                    {w.rows.map((r) => {
                      const zone = zoneById.get(r.zone_id);
                      const pct = r.surveyed_count > 0 ? Math.round((r.attending_yes_count / r.surveyed_count) * 100) : 0;
                      return (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-2)' }}>
                          <span>{zone?.name ?? `Zone #${r.zone_id}`}</span>
                          <span>{r.attending_yes_count}/{r.surveyed_count} · {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <button type="button" className="add-toggle" onClick={showForm ? closeForm : openForm}>
          {showForm ? 'Cancel' : 'Log new wave'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="cat-head" style={{ padding: '8px 0', marginBottom: 4 }}>
              <span>Log wave</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <NumberField
                label="Wave number"
                value={waveNumber}
                onChange={(v) => setWaveNumber(v)}
                required
              />
              <DateField
                label="Taken on"
                value={takenOn}
                onChange={(v) => setTakenOn(v)}
                required
              />
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Zones</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              {rows.map((r) => {
                const zone = zoneById.get(r.zone_id);
                const mismatch = rowHasMismatch(r);
                const apiError = rowErrors[r.zone_id];
                return (
                  <div key={r.zone_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: '0 0 96px', fontSize: 13, color: 'var(--ink-2)' }}>{zone?.name ?? `Zone #${r.zone_id}`}</div>
                      <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                        <input
                          type="number"
                          className="input"
                          placeholder="surveyed"
                          value={r.surveyed}
                          onChange={(e) => updateRow(r.zone_id, { surveyed: e.target.value === '' ? '' : Number(e.target.value) })}
                          style={{ width: '50%' }}
                        />
                        <input
                          type="number"
                          className="input"
                          placeholder="attending"
                          value={r.attending}
                          onChange={(e) => updateRow(r.zone_id, { attending: e.target.value === '' ? '' : Number(e.target.value) })}
                          style={{ width: '50%' }}
                        />
                      </div>
                    </div>
                    {mismatch && (
                      <div className="field-error" style={{ marginTop: 4 }}>can't exceed surveyed</div>
                    )}
                    {apiError && (
                      <div className="field-error" style={{ marginTop: 4 }}>{apiError}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="row">
              <button type="button" className="btn" onClick={closeForm}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSubmit} disabled={!canSubmit}>
                {createMutation.isPending ? 'Submitting…' : 'Submit wave'}
              </button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
