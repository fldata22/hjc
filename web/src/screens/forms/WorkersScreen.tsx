import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, PhoneField } from './fields';
import {
  useCrusade,
  useWorkers,
  useCreateWorker,
  useUpdateWorker,
  useDeleteWorker,
  type WorkerGroup,
  type Worker,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

const GROUPS: Array<{ value: WorkerGroup; label: string }> = [
  { value: 'choir', label: 'Choir' },
  { value: 'ushers', label: 'Ushers' },
  { value: 'security', label: 'Security' },
  { value: 'counsellors', label: 'Counsellors' },
  { value: 'prayer_warriors', label: 'Prayer warriors' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'technical', label: 'Technical' },
  { value: 'medical', label: 'Medical' },
  { value: 'childrens', label: "Children's" },
  { value: 'general', label: 'General' },
];

type Draft = {
  name: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyDraft: Draft = { name: '', role: '', phone: '', email: '', notes: '' };

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

export function WorkersScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const [activeGroup, setActiveGroup] = useState<WorkerGroup>('choir');
  const { data: workers, isLoading: workersLoading, isError: workersError, refetch } = useWorkers({ group_type: activeGroup });
  const createMutation = useCreateWorker();
  const updateMutation = useUpdateWorker();
  const deleteMutation = useDeleteWorker();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => workers ?? [], [workers]);
  const activeCount = list.filter((w) => w.status === 'active').length;
  const groupLabel = GROUPS.find((g) => g.value === activeGroup)?.label ?? activeGroup;

  const handleAdd = async () => {
    if (!crusade || draft.name.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        group_type: activeGroup,
        name: draft.name.trim(),
        role: draft.role.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const toggleStatus = (w: Worker) => {
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: w.id, body: { status: w.status === 'active' ? 'inactive' : 'active' } });
  };

  const handleDelete = (w: Worker) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Remove ${w.name} from ${groupLabel}?`)) return;
    deleteMutation.mutate(w.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Worker <em>Groups</em></>} pillar="P6" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Worker <em>Groups</em></>} pillar="P6" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Worker <em>Groups</em></>} pillar="P6" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        {/* Group tabs */}
        <div style={{ padding: '0 20px 12px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
            {GROUPS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => {
                  setActiveGroup(g.value);
                  setShowForm(false);
                  setDraft(emptyDraft);
                  setSaveError(null);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 999,
                  border: '1px solid ' + (activeGroup === g.value ? 'var(--ink)' : 'var(--line)'),
                  background: activeGroup === g.value ? 'var(--ink)' : 'transparent',
                  color: activeGroup === g.value ? 'var(--bg)' : 'var(--ink-3)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stat-strip">
          <div>
            <div className="num">{activeCount}</div>
            <div className="lbl">of {list.length} {groupLabel.toLowerCase()} active</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {workersError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load workers.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : workersLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No {groupLabel.toLowerCase()} added yet.</div>
          ) : (
            list.map((w) => (
              <div key={w.id} className="form-list-row">
                <div>
                  <div className="name" style={{ color: w.status === 'inactive' ? 'var(--ink-3)' : 'var(--ink)' }}>{w.name}</div>
                  <div className="sub">{w.role ?? '—'}{w.phone ? ` · ${w.phone}` : ''}</div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => toggleStatus(w)}
                    className={'status ' + (w.status === 'active' ? 'confirmed' : 'pending')}
                    style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                    aria-label="Toggle active status"
                  >
                    {w.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(w)}
                    aria-label="Remove from group"
                    style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => {
            if (showForm) {
              setDraft(emptyDraft);
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : `Add to ${groupLabel}`}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Name" required placeholder="e.g. Sister Akua" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })}/>
              <TextField label="Role" placeholder="optional" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })}/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })}/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>

            {saveError && (
              <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>
            )}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setSaveError(null); }}>Clear</button>
              <button
                type="button"
                className="btn primary"
                onClick={handleAdd}
                disabled={createMutation.isPending || draft.name.trim() === ''}
              >
                {createMutation.isPending ? 'Saving…' : `Add to ${groupLabel}`}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
