import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, SegmentedField, TextareaField } from './fields';
import { ContactPicker } from './ContactPicker';
import {
  useCrusade,
  useCommitteeMembers,
  useCreateCommitteeMember,
  type Contact,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { InlineSheet } from './InlineSheet';
import './forms.css';

type Status = 'confirmed' | 'pending' | 'declined' | '';

type Draft = {
  contact: Contact | null;
  role: string;
  organization: string;
  status: Status;
  notes: string;
};

const emptyDraft: Draft = {
  contact: null, role: '', organization: '', status: '', notes: '',
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

export function BOTForm() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: trustees, isLoading: trusteesLoading, isError: trusteesError, refetch: refetchTrustees } = useCommitteeMembers('bot');
  const createMutation = useCreateCommitteeMember();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave =
    !!crusade &&
    !!draft.contact &&
    draft.role.trim() !== '' &&
    draft.status !== '' &&
    !createMutation.isPending;

  const handleSave = async () => {
    if (!canSave || !crusade || !draft.contact) return;
    const c = draft.contact;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        contact_id: c.id,
        kind: 'bot',
        name: c.full_name,
        role: draft.role.trim(),
        org: draft.organization.trim() === '' ? null : draft.organization.trim(),
        phone: c.phone,
        email: c.email,
        status: draft.status,
        notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      let message = 'Failed';
      if (e instanceof ApiError) {
        const body = e.body;
        if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
          message = (body as { message: string }).message;
        } else {
          message = e.message;
        }
      } else if (e instanceof Error) {
        message = e.message;
      }
      setSaveError(message);
    }
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>BOT <em>Board of Trustees</em></>}
          pillar="P3"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <ErrorBanner what="crusade" onRetry={refetchCrusade}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>BOT <em>Board of Trustees</em></>}
          pillar="P3"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const list = trustees ?? [];
  const confirmedCount = list.filter((t) => t.status === 'confirmed').length;
  const pendingCount = list.filter((t) => t.status === 'pending').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>BOT <em>Board of Trustees</em></>}
        pillar="P3"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{confirmedCount}</div>
            <div className="lbl">of {list.length} confirmed</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{pendingCount}</b> pending</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {trusteesError ? (
            <ErrorBanner what="trustees" onRetry={refetchTrustees}/>
          ) : trusteesLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No trustees yet.</div>
          ) : (
            list.map((t) => (
              <div key={t.id} className="form-list-row">
                <div>
                  <div className="name">{t.name}</div>
                  <div className="sub">{t.role}{t.org && ` · ${t.org}`}</div>
                </div>
                <div className="right">
                  <div className={'status ' + t.status}>{t.status}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{t.phone ?? ''}</div>
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
          Add trustee
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <ContactPicker label="Trustee" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })}/>
            <TextField label="Role" placeholder="e.g. Treasurer" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
            <TextField label="Organization" value={draft.organization} onChange={(v) => setDraft({ ...draft, organization: v })}/>
            <SegmentedField
              label="Status"
              options={[
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'pending', label: 'Pending' },
                { value: 'declined', label: 'Declined' },
              ]}
              value={draft.status}
              onChange={(v) => setDraft({ ...draft, status: v as Status })}
              required
            />
            <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
          </div>
          {saveError && (
            <div className="field-error" style={{ margin: '4px 0' }}>{saveError}</div>
          )}
          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>Cancel</button>
            <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>
              {createMutation.isPending ? 'Saving…' : 'Save trustee'}
            </button>
          </div>
        </InlineSheet>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
