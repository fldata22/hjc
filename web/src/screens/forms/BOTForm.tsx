import { useState } from 'react';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, TextareaField } from './fields';
import {
  useCrusade,
  useCommitteeMembers,
  useCreateCommitteeMember,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Status = 'confirmed' | 'pending' | 'declined' | '';

type Draft = {
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
  status: Status;
  notes: string;
};

const emptyDraft: Draft = {
  name: '', role: '', organization: '', phone: '', email: '', status: '', notes: '',
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
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: trustees, isLoading: trusteesLoading, isError: trusteesError, refetch: refetchTrustees } = useCommitteeMembers('bot');
  const createMutation = useCreateCommitteeMember();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave =
    !!crusade &&
    draft.name.trim() !== '' &&
    draft.role.trim() !== '' &&
    draft.phone.trim() !== '' &&
    draft.status !== '' &&
    !createMutation.isPending;

  const handleSave = async () => {
    if (!canSave || !crusade) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        kind: 'bot',
        name: draft.name.trim(),
        role: draft.role.trim(),
        org: draft.organization.trim() === '' ? null : draft.organization.trim(),
        phone: draft.phone.trim() === '' ? null : draft.phone.trim(),
        email: draft.email.trim() === '' ? null : draft.email.trim(),
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
          primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
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
          primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
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
        primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
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
          onClick={() => {
            if (showForm) {
              setDraft(emptyDraft);
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : 'Add trustee'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Full name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required/>
              <TextField label="Role" placeholder="e.g. Treasurer" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
              <TextField label="Organization" value={draft.organization} onChange={(v) => setDraft({ ...draft, organization: v })}/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} required/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
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
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
