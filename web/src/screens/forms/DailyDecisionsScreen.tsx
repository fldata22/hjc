import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextareaField, NumberField, DateField } from './fields';
import {
  useCrusade,
  useDailyDecisions,
  useCreateDailyDecision,
  useDeleteDailyDecision,
  type DailyDecision,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { todayISO } from '../../lib/dateHelpers';
import { InlineSheet } from './InlineSheet';
import './forms.css';

type Draft = {
  decided_on: string;
  salvations: number | '';
  rededications: number | '';
  healings: number | '';
  counselled: number | '';
  notes: string;
};

const emptyDraft = (): Draft => ({
  decided_on: todayISO(),
  salvations: '',
  rededications: '',
  healings: '',
  counselled: '',
  notes: '',
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

export function DailyDecisionsScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: records, isLoading, isError, refetch } = useDailyDecisions();
  const createMutation = useCreateDailyDecision();
  const deleteMutation = useDeleteDailyDecision();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => records ?? [], [records]);
  const totalSalvations = list.reduce((s, r) => s + r.salvations, 0);
  const totalCounselled = list.reduce((s, r) => s + r.counselled, 0);

  const num = (v: number | '') => (typeof v === 'number' ? v : 0);

  const handleAdd = async () => {
    if (!crusade || draft.decided_on === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        decided_on: draft.decided_on,
        salvations: num(draft.salvations),
        rededications: num(draft.rededications),
        healings: num(draft.healings),
        counselled: num(draft.counselled),
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft());
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleDelete = (r: DailyDecision) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete decisions log for ${r.decided_on}?`)) return;
    deleteMutation.mutate(r.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Daily <em>Decisions</em></>} pillar="D15" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Daily <em>Decisions</em></>} pillar="D15" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Daily <em>Decisions</em></>} pillar="D15" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{totalSalvations.toLocaleString()}</div>
            <div className="lbl">total salvations</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{totalCounselled.toLocaleString()}</b> counselled</div>
            <div className="lbl" style={{ fontSize: 10 }}>across {list.length} {list.length === 1 ? 'night' : 'nights'}</div>
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
            list.map((r) => {
              const total = r.salvations + r.rededications + r.healings + r.counselled;
              return (
                <div key={r.id} className="form-list-row">
                  <div>
                    <div className="name">{r.decided_on}</div>
                    <div className="sub">
                      {r.salvations} sal · {r.rededications} red · {r.healings} heal · {r.counselled} couns
                    </div>
                  </div>
                  <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600 }}>{total.toLocaleString()}</div>
                    <button type="button" onClick={() => handleDelete(r)} aria-label="Delete" style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}>×</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => setShowForm(true)}
        >
          Log decisions
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft()); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <DateField label="Decisions on" required value={draft.decided_on} onChange={(v) => setDraft({ ...draft, decided_on: v })}/>
            <NumberField label="Salvations" suffix="people" value={draft.salvations} onChange={(v) => setDraft({ ...draft, salvations: v })}/>
            <NumberField label="Rededications" suffix="people" value={draft.rededications} onChange={(v) => setDraft({ ...draft, rededications: v })}/>
            <NumberField label="Healings" suffix="people" value={draft.healings} onChange={(v) => setDraft({ ...draft, healings: v })}/>
            <NumberField label="Counselled" suffix="people" value={draft.counselled} onChange={(v) => setDraft({ ...draft, counselled: v })}/>
            <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft()); setSaveError(null); }}>Clear</button>
            <button
              type="button"
              className="btn primary"
              onClick={handleAdd}
              disabled={createMutation.isPending || draft.decided_on === ''}
            >
              {createMutation.isPending ? 'Saving…' : 'Save decisions'}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
