import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, SegmentedField, SelectField, TextareaField } from './fields';
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

type Status = 'active' | 'on-leave' | 'stepped-down' | '';

type Draft = {
  contact: Contact | null;
  role: string;
  zone: string;
  status: Status;
  notes: string;
};

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const STATUS_CLASS: Record<'active' | 'on-leave' | 'stepped-down', string> = {
  active: 'confirmed',
  'on-leave': 'pending',
  'stepped-down': 'declined',
};

const STATUS_LABEL: Record<'active' | 'on-leave' | 'stepped-down', string> = {
  active: 'active',
  'on-leave': 'on leave',
  'stepped-down': 'stepped down',
};

const emptyDraft: Draft = {
  contact: null, role: '', zone: '', status: '', notes: '',
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

export function CPCForm() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: members, isLoading: membersLoading, isError: membersError, refetch: refetchMembers } = useCommitteeMembers('cpc');
  const createMutation = useCreateCommitteeMember();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave =
    !!crusade &&
    !!draft.contact &&
    draft.role.trim() !== '' &&
    draft.zone !== '' &&
    draft.status !== '' &&
    !createMutation.isPending;

  const handleSave = async () => {
    if (!canSave || !crusade || !draft.contact) return;
    const c = draft.contact;
    setSaveError(null);
    const zoneLabel = ZONES.find((z) => z.value === draft.zone)?.label ?? draft.zone;
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        contact_id: c.id,
        kind: 'cpc',
        name: c.full_name,
        role: draft.role.trim(),
        org: zoneLabel,
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
          title={<>CPC <em>Central Planning</em></>}
          pillar="P4"
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
          title={<>CPC <em>Central Planning</em></>}
          pillar="P4"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const list = members ?? [];
  const isKnownStatus = (s: string): s is 'active' | 'on-leave' | 'stepped-down' =>
    s === 'active' || s === 'on-leave' || s === 'stepped-down';
  const activeCount = list.filter((m) => m.status === 'active').length;
  const onLeaveCount = list.filter((m) => m.status === 'on-leave').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>CPC <em>Central Planning</em></>}
        pillar="P4"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{activeCount}</div>
            <div className="lbl">of {list.length} active</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{onLeaveCount}</b> on leave</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {membersError ? (
            <ErrorBanner what="members" onRetry={refetchMembers}/>
          ) : membersLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No members yet.</div>
          ) : (
            list.map((m) => {
              const statusClass = isKnownStatus(m.status) ? STATUS_CLASS[m.status] : 'pending';
              const statusLabel = isKnownStatus(m.status) ? STATUS_LABEL[m.status] : m.status;
              return (
                <div key={m.id} className="form-list-row">
                  <div>
                    <div className="name">{m.name}</div>
                    <div className="sub">{m.role}{m.org && ` · ${m.org}`}</div>
                  </div>
                  <div className="right">
                    <div className={'status ' + statusClass}>{statusLabel}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{m.phone ?? ''}</div>
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
          Add CPC member
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <ContactPicker label="Member" required value={draft.contact} onChange={(c) => setDraft({ ...draft, contact: c })}/>
            <TextField label="Role" placeholder="e.g. Zone Coordinator" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
            <SelectField label="Zone" required options={ZONES} value={draft.zone} onChange={(v) => setDraft({ ...draft, zone: v })} placeholder="Select zone…"/>
            <SegmentedField
              label="Status"
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on-leave', label: 'On leave' },
                { value: 'stepped-down', label: 'Stepped down' },
              ]}
              value={draft.status}
              onChange={(v) => setDraft({ ...draft, status: v as Status })}
            />
            <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
          </div>
          {saveError && (
            <div className="field-error" style={{ margin: '4px 0' }}>{saveError}</div>
          )}
          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>Cancel</button>
            <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>
              {createMutation.isPending ? 'Saving…' : 'Save member'}
            </button>
          </div>
        </InlineSheet>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
