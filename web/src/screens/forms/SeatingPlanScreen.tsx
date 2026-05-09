import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, NumberField } from './fields';
import { useSeatingPlan, useUpsertSeatingPlan, type SeatingPlan } from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Draft = {
  estimated_capacity: number | '';
  vip_seating_count: number | '';
  general_seating_count: number | '';
  counsellor_area_count: number | '';
  chair_source: string;
  layout_notes: string;
};

const draftFromPlan = (p: SeatingPlan | null): Draft => ({
  estimated_capacity: p?.estimated_capacity ?? '',
  vip_seating_count: p?.vip_seating_count ?? '',
  general_seating_count: p?.general_seating_count ?? '',
  counsellor_area_count: p?.counsellor_area_count ?? '',
  chair_source: p?.chair_source ?? '',
  layout_notes: p?.layout_notes ?? '',
});

function extractApiMessage(e: unknown, fallback = 'Failed'): string {
  if (e instanceof ApiError) {
    const body = e.body;
    if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
      return (body as { message: string }).message;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export function SeatingPlanScreen() {
  const navigate = useNavigate();
  const { data: plan, isLoading, isError, refetch } = useSeatingPlan();
  const upsertMutation = useUpsertSeatingPlan();

  const [draft, setDraft] = useState<Draft>(draftFromPlan(null));
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (hasHydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(draftFromPlan(plan ?? null));
    setHasHydrated(true);
  }, [plan, isLoading, hasHydrated]);

  const totalAllocated = (typeof draft.vip_seating_count === 'number' ? draft.vip_seating_count : 0)
    + (typeof draft.general_seating_count === 'number' ? draft.general_seating_count : 0)
    + (typeof draft.counsellor_area_count === 'number' ? draft.counsellor_area_count : 0);
  const target = typeof draft.estimated_capacity === 'number' ? draft.estimated_capacity : 0;
  const variance = target > 0 ? totalAllocated - target : 0;

  const handleSave = async () => {
    setSaveError(null);
    setSaveOk(null);
    try {
      await upsertMutation.mutateAsync({
        estimated_capacity: draft.estimated_capacity === '' ? null : Number(draft.estimated_capacity),
        vip_seating_count: draft.vip_seating_count === '' ? null : Number(draft.vip_seating_count),
        general_seating_count: draft.general_seating_count === '' ? null : Number(draft.general_seating_count),
        counsellor_area_count: draft.counsellor_area_count === '' ? null : Number(draft.counsellor_area_count),
        chair_source: draft.chair_source.trim() || null,
        layout_notes: draft.layout_notes.trim() || null,
      });
      setSaveOk('Saved.');
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  if (isError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Seating & <em>Capacity</em></>} pillar="V13" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Couldn't load plan.</span>
            <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
          </div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (isLoading || !hasHydrated) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Seating & <em>Capacity</em></>} pillar="V13" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Seating & <em>Capacity</em></>} pillar="V13" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{totalAllocated.toLocaleString()}</div>
            <div className="lbl">seats allocated</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{target.toLocaleString()}</b> capacity target</div>
            {target > 0 && (
              <div className="lbl" style={{ fontSize: 10, color: variance < 0 ? 'var(--accent)' : variance > 0 ? 'var(--ok, #2a8c4a)' : 'var(--ink-3)' }}>
                {variance === 0 ? 'on target' : variance < 0 ? `${Math.abs(variance).toLocaleString()} short` : `${variance.toLocaleString()} over`}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <div className="fields" style={{ padding: '12px 0' }}>
            <NumberField label="Estimated capacity" suffix="seats" value={draft.estimated_capacity} onChange={(v) => setDraft({ ...draft, estimated_capacity: v })}/>
            <NumberField label="VIP seating" suffix="seats" value={draft.vip_seating_count} onChange={(v) => setDraft({ ...draft, vip_seating_count: v })}/>
            <NumberField label="General seating" suffix="seats" value={draft.general_seating_count} onChange={(v) => setDraft({ ...draft, general_seating_count: v })}/>
            <NumberField label="Counsellor area" suffix="seats" value={draft.counsellor_area_count} onChange={(v) => setDraft({ ...draft, counsellor_area_count: v })}/>
            <TextField label="Chair source" placeholder="e.g. Wa Hotel Rentals" value={draft.chair_source} onChange={(v) => setDraft({ ...draft, chair_source: v })}/>
            <TextareaField label="Layout notes" placeholder="Stage at north end, VIP front-right, counsellors back-left, two main aisles…" value={draft.layout_notes} onChange={(v) => setDraft({ ...draft, layout_notes: v })}/>
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}
          {saveOk && <div style={{ margin: '8px 0', fontSize: 12, color: 'var(--ok, #2a8c4a)' }}>{saveOk}</div>}

          <div className="row">
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? 'Saving…' : 'Save plan'}
            </button>
          </div>
        </div>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
