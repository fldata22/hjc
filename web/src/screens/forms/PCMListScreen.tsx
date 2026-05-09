import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { type Pastor, usePastors, useZones } from '../../api/hooks';
import './forms.css';

const STAGE_LABEL: Record<Pastor['pipeline_stage'], string> = {
  identified: 'Identified',
  engaged: 'Engaged',
  committed: 'Committed',
  active: 'Active',
  champion: 'Champion',
};

const STAGE_CLASS: Record<Pastor['pipeline_stage'], string> = {
  identified: 'pending',
  engaged: 'pending',
  committed: 'confirmed',
  active: 'confirmed',
  champion: 'confirmed',
};

const CONFIRMED_STAGES: Pastor['pipeline_stage'][] = ['committed', 'active', 'champion'];
const FUNNEL_STAGES: Pastor['pipeline_stage'][] = ['identified', 'engaged'];

export function PCMListScreen() {
  const navigate = useNavigate();
  const { data: page, isLoading, isError, refetch } = usePastors({ per_page: 50 });
  const { data: zones } = useZones();

  const pastors = useMemo(() => page?.data ?? [], [page]);
  const zoneById = useMemo(
    () => new Map((zones ?? []).map((z) => [z.id, z] as const)),
    [zones],
  );

  const confirmedCount = pastors.filter((p) => CONFIRMED_STAGES.includes(p.pipeline_stage)).length;
  const funnelCount = pastors.filter((p) => FUNNEL_STAGES.includes(p.pipeline_stage)).length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>PCM <em>Primary Committee</em></>}
        pillar="P1"
        primaryAction={{ label: 'Add new PCM', onClick: () => navigate('/forms/pcm/new') }}
      >
        {isError ? (
          <div
            style={{
              padding: '14px 16px',
              margin: '12px 20px',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-soft)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load pastors.</div>
            <button
              type="button"
              onClick={() => refetch()}
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
        ) : isLoading ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        ) : pastors.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
            No pastors identified yet.
          </div>
        ) : (
          <>
            <div className="stat-strip">
              <div>
                <div className="num">{confirmedCount}</div>
                <div className="lbl">of {pastors.length} confirmed</div>
              </div>
              <div style={{ flex: 1 }}/>
              <div>
                <div className="lbl"><b>{funnelCount}</b> in funnel</div>
              </div>
            </div>

            <div style={{ padding: '0 20px' }}>
              {pastors.map((p) => {
                const zone = p.zone_id != null ? zoneById.get(p.zone_id) : null;
                const zoneLabel = zone?.name ?? zone?.code ?? null;
                return (
                  <div key={p.id} className="form-list-row">
                    <div>
                      <div className="name">{p.full_name}</div>
                      <div className="sub">{zoneLabel ?? '—'}</div>
                    </div>
                    <div className="right">
                      <div className={'status ' + STAGE_CLASS[p.pipeline_stage]}>{STAGE_LABEL[p.pipeline_stage]}</div>
                      {p.phone && (
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{p.phone}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
