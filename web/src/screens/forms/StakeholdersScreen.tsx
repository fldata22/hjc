import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SegmentedField } from './fields';
import { ContactPicker } from './ContactPicker';
import {
  useCrusade,
  useStakeholders,
  useCreateStakeholder,
  useUpdateStakeholder,
  useDeleteStakeholder,
  type StakeholderStatus,
  type Stakeholder,
  type Contact,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { InlineSheet } from './InlineSheet';
import './forms.css';

const STATUSES: Array<{ value: StakeholderStatus; label: string }> = [
  { value: 'identified', label: 'Identified' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'committed', label: 'Committed' },
  { value: 'won', label: 'Won' },
];

const STATUS_CLASS: Record<StakeholderStatus, string> = {
  identified: 'pending',
  engaged: 'pending',
  committed: 'confirmed',
  won: 'confirmed',
};

type Draft = {
  contact: Contact | null;
  org: string;
  role: string;
  status_label: StakeholderStatus;
  notes: string;
};

const emptyDraft: Draft = { contact: null, org: '', role: '', status_label: 'identified', notes: '' };

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

export function StakeholdersScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: stakeholders, isLoading: listLoading, isError: listError, refetch } = useStakeholders();
  const createMutation = useCreateStakeholder();
  const updateMutation = useUpdateStakeholder();
  const deleteMutation = useDeleteStakeholder();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => stakeholders ?? [], [stakeholders]);
  const wonCount = list.filter((s) => s.status_label === 'won' || s.status_label === 'committed').length;

  const advanceStatus = (current: StakeholderStatus): StakeholderStatus =>
    current === 'identified' ? 'engaged' :
    current === 'engaged' ? 'committed' :
    current === 'committed' ? 'won' : 'identified';

  const handleAdd = async () => {
    if (!crusade || !draft.contact || draft.org.trim() === '' || draft.role.trim() === '' || createMutation.isPending) return;
    const c = draft.contact;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        contact_id: c.id,
        name: c.full_name,
        org: draft.org.trim(),
        role: draft.role.trim() || c.title || '',
        status_label: draft.status_label,
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleStatusClick = (s: Stakeholder) => {
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: s.id, body: { status_label: advanceStatus(s.status_label) } });
  };

  const handleDelete = (s: Stakeholder) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete "${s.name}"?`)) return;
    deleteMutation.mutate(s.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Governmental <em>Participation</em></>} pillar="P5" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Governmental <em>Participation</em></>} pillar="P5" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Governmental <em>Participation</em></>} pillar="P5" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{wonCount}</div>
            <div className="lbl">of {list.length} committed+</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {listError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load stakeholders.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : listLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No stakeholders yet. Tap "Add stakeholder" to start tracking VIPs.</div>
          ) : (
            list.map((s) => (
              <div key={s.id} className="form-list-row">
                <div>
                  <div className="name">{s.name}</div>
                  <div className="sub">{s.role} · {s.org}</div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleStatusClick(s)}
                    className={'status ' + STATUS_CLASS[s.status_label]}
                    style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                    aria-label="Advance status"
                  >
                    {STATUSES.find((st) => st.value === s.status_label)?.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    aria-label="Delete stakeholder"
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
          Add stakeholder
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <ContactPicker label="Person" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })}/>
            <TextField label="Organisation" required placeholder="e.g. Wa Municipal Assembly" value={draft.org} onChange={(v) => setDraft({ ...draft, org: v })}/>
            <TextField label="Role / title" required placeholder="e.g. Mayor" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })}/>
            <SegmentedField
              label="Funnel stage"
              required
              options={STATUSES}
              value={draft.status_label}
              onChange={(v) => setDraft({ ...draft, status_label: v as StakeholderStatus })}
            />
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
              disabled={createMutation.isPending || !draft.contact || draft.org.trim() === '' || draft.role.trim() === ''}
            >
              {createMutation.isPending ? 'Saving…' : 'Add stakeholder'}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
