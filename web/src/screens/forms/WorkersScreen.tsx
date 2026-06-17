import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField } from './fields';
import { ContactPicker } from './ContactPicker';
import {
  useCrusade,
  useWorkers,
  useCreateWorker,
  useUpdateWorker,
  useDeleteWorker,
  useZones,
  useChurches,
  type WorkerGroup,
  type Worker,
  type Contact,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { InlineSheet } from './InlineSheet';
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
  { value: 'womens', label: "Women's" },
  { value: 'general', label: 'General' },
];

type Draft = {
  contact: Contact | null;
  role: string;
  notes: string;
};

const emptyDraft: Draft = { contact: null, role: '', notes: '' };

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
  const { data: zones } = useZones();
  const { data: churches } = useChurches();
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

  const zoneById = useMemo(() => new Map((zones ?? []).map((z) => [z.id, z] as const)), [zones]);
  const churchById = useMemo(() => new Map((churches ?? []).map((c) => [c.id, c] as const)), [churches]);

  const subLine = (w: Worker): string => {
    const parts: string[] = [];
    if (w.role) parts.push(w.role);
    const zoneName = w.zone_id != null ? (zoneById.get(w.zone_id)?.name ?? zoneById.get(w.zone_id)?.code) : null;
    const churchName = w.church_id != null ? churchById.get(w.church_id)?.name : null;
    if (zoneName) parts.push(zoneName);
    if (churchName) parts.push(churchName);
    if (w.phone) parts.push(w.phone);
    return parts.length ? parts.join(' · ') : '—';
  };

  const handleAdd = async () => {
    if (!crusade || !draft.contact || createMutation.isPending) return;
    const c = draft.contact;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        contact_id: c.id,
        zone_id: c.zone_id,
        church_id: c.church_id,
        group_type: activeGroup,
        name: c.full_name,
        role: draft.role.trim() || c.title || null,
        phone: c.phone,
        email: c.email,
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
                  <div className="sub">{subLine(w)}</div>
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
          onClick={() => setShowForm(true)}
        >
          {`Add to ${groupLabel}`}
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <ContactPicker
              label="Person"
              required
              value={draft.contact}
              onChange={(c) => setDraft({ ...draft, contact: c })}
            />
            <TextField label="Role in group" placeholder="optional — e.g. Lead, Section head" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })}/>
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
              disabled={createMutation.isPending || !draft.contact}
            >
              {createMutation.isPending ? 'Saving…' : `Add to ${groupLabel}`}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
