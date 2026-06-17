import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextareaField, NumberField, DateField, SelectField } from './fields';
import {
  useCrusade,
  useDailyAttendance,
  useCreateDailyAttendance,
  useDeleteDailyAttendance,
  type DailyAttendance,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { todayISO } from '../../lib/dateHelpers';
import { InlineSheet } from './InlineSheet';
import './forms.css';

const METHODS = [
  { value: 'head_count', label: 'Head count' },
  { value: 'aerial_estimate', label: 'Aerial estimate' },
  { value: 'turnstile', label: 'Turnstile / gate' },
  { value: 'usher_tally', label: 'Usher tally' },
  { value: 'photo_estimate', label: 'Photo estimate' },
  { value: 'other', label: 'Other' },
];

type Draft = {
  counted_on: string;
  count: number | '';
  estimation_method: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  counted_on: todayISO(),
  count: '',
  estimation_method: '',
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

export function DailyAttendanceScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: records, isLoading, isError, refetch } = useDailyAttendance();
  const createMutation = useCreateDailyAttendance();
  const deleteMutation = useDeleteDailyAttendance();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => records ?? [], [records]);
  const peak = list.reduce((max, r) => Math.max(max, r.count), 0);
  const total = list.reduce((sum, r) => sum + r.count, 0);

  const handleAdd = async () => {
    if (!crusade || draft.counted_on === '' || typeof draft.count !== 'number' || draft.count < 0 || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        counted_on: draft.counted_on,
        count: Number(draft.count),
        estimation_method: draft.estimation_method || null,
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft());
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleDelete = (r: DailyAttendance) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete attendance count for ${r.counted_on}?`)) return;
    deleteMutation.mutate(r.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Daily <em>Attendance</em></>} pillar="D14" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Daily <em>Attendance</em></>} pillar="D14" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Daily <em>Attendance</em></>} pillar="D14" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{peak.toLocaleString()}</div>
            <div className="lbl">peak night</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{total.toLocaleString()}</b> total counts</div>
            <div className="lbl" style={{ fontSize: 10 }}>across {list.length} {list.length === 1 ? 'entry' : 'entries'}</div>
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
            <div className="empty">No counts logged yet.</div>
          ) : (
            list.map((r) => {
              const methodLabel = METHODS.find((m) => m.value === r.estimation_method)?.label ?? r.estimation_method ?? '—';
              return (
                <div key={r.id} className="form-list-row">
                  <div>
                    <div className="name">{r.counted_on}</div>
                    <div className="sub">{methodLabel}{r.notes ? ` · ${r.notes.slice(0, 60)}${r.notes.length > 60 ? '…' : ''}` : ''}</div>
                  </div>
                  <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600 }}>{r.count.toLocaleString()}</div>
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
          Add count
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft()); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <DateField label="Counted on" required value={draft.counted_on} onChange={(v) => setDraft({ ...draft, counted_on: v })}/>
            <NumberField label="Headcount" required suffix="people" value={draft.count} onChange={(v) => setDraft({ ...draft, count: v })}/>
            <SelectField
              label="Method"
              options={METHODS}
              value={draft.estimation_method}
              onChange={(v) => setDraft({ ...draft, estimation_method: v })}
              placeholder="Optional"
            />
            <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft()); setSaveError(null); }}>Clear</button>
            <button
              type="button"
              className="btn primary"
              onClick={handleAdd}
              disabled={createMutation.isPending || draft.counted_on === '' || typeof draft.count !== 'number' || draft.count < 0}
            >
              {createMutation.isPending ? 'Saving…' : 'Save count'}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
