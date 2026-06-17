import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, NumberField, DateField } from './fields';
import {
  useCrusade,
  useDailyPrograms,
  useCreateDailyProgram,
  useDeleteDailyProgram,
  type DailyProgram,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { todayISO } from '../../lib/dateHelpers';
import { InlineSheet } from './InlineSheet';
import './forms.css';

type Draft = {
  occurred_on: string;
  speaker: string;
  topic: string;
  duration_minutes: number | '';
  key_moments: string;
  narrative: string;
};

const emptyDraft = (): Draft => ({
  occurred_on: todayISO(),
  speaker: '',
  topic: '',
  duration_minutes: '',
  key_moments: '',
  narrative: '',
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

export function DailyProgramScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: records, isLoading, isError, refetch } = useDailyPrograms();
  const createMutation = useCreateDailyProgram();
  const deleteMutation = useDeleteDailyProgram();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => records ?? [], [records]);

  const handleAdd = async () => {
    if (!crusade || draft.occurred_on === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        occurred_on: draft.occurred_on,
        speaker: draft.speaker.trim() || null,
        topic: draft.topic.trim() || null,
        duration_minutes: draft.duration_minutes === '' ? null : Number(draft.duration_minutes),
        key_moments: draft.key_moments.trim() || null,
        narrative: draft.narrative.trim() || null,
      });
      setDraft(emptyDraft());
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleDelete = (r: DailyProgram) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete program log for ${r.occurred_on}?`)) return;
    deleteMutation.mutate(r.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Daily <em>Program</em></>} pillar="D16" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Daily <em>Program</em></>} pillar="D16" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Daily <em>Program</em></>} pillar="D16" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{list.length}</div>
            <div className="lbl">{list.length === 1 ? 'night logged' : 'nights logged'}</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load entries.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No nights logged yet.</div>
          ) : (
            list.map((r) => (
              <div key={r.id} className="form-list-row">
                <div>
                  <div className="name">{r.occurred_on}{r.topic ? ` · ${r.topic}` : ''}</div>
                  <div className="sub">
                    {r.speaker ?? '—'}{r.duration_minutes != null ? ` · ${r.duration_minutes} min` : ''}
                  </div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => handleDelete(r)} aria-label="Delete" style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}>×</button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => setShowForm(true)}
        >
          Log a night
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft()); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <DateField label="Occurred on" required value={draft.occurred_on} onChange={(v) => setDraft({ ...draft, occurred_on: v })}/>
            <TextField label="Speaker" placeholder="e.g. Bishop Lovell" value={draft.speaker} onChange={(v) => setDraft({ ...draft, speaker: v })}/>
            <TextField label="Topic / sermon" placeholder="optional" value={draft.topic} onChange={(v) => setDraft({ ...draft, topic: v })}/>
            <NumberField label="Duration" suffix="min" value={draft.duration_minutes} onChange={(v) => setDraft({ ...draft, duration_minutes: v })}/>
            <TextareaField label="Key moments" placeholder="e.g. Healing service erupted at 9pm; technician swap during worship…" value={draft.key_moments} onChange={(v) => setDraft({ ...draft, key_moments: v })}/>
            <TextareaField label="Narrative" placeholder="Free-form notes about the night" value={draft.narrative} onChange={(v) => setDraft({ ...draft, narrative: v })}/>
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft()); setSaveError(null); }}>Clear</button>
            <button
              type="button"
              className="btn primary"
              onClick={handleAdd}
              disabled={createMutation.isPending || draft.occurred_on === ''}
            >
              {createMutation.isPending ? 'Saving…' : 'Save log'}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
