import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, DateField, SegmentedField } from './fields';
import {
  useCrusade,
  useIncidents,
  useCreateIncident,
  useDeleteIncident,
  type IncidentKind,
  type IncidentSeverity,
  type Incident,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { todayISO } from '../../lib/dateHelpers';
import './forms.css';

const SEVERITIES: Array<{ value: IncidentSeverity; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SEVERITY_CLASS: Record<IncidentSeverity, string> = {
  low: 'pending',
  medium: 'pending',
  high: 'declined',
};

type Draft = {
  occurred_on: string;
  occurred_at_time: string;
  severity: IncidentSeverity;
  location: string;
  description: string;
  response_taken: string;
  transported_to: string;
  resolution: string;
};

const emptyDraft = (): Draft => ({
  occurred_on: todayISO(),
  occurred_at_time: '',
  severity: 'low',
  location: '',
  description: '',
  response_taken: '',
  transported_to: '',
  resolution: '',
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

interface Props {
  kind: IncidentKind;
  pillar: string;
  title: React.ReactNode;
}

export function IncidentsScreen({ kind, pillar, title }: Props) {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: records, isLoading, isError, refetch } = useIncidents({ kind });
  const createMutation = useCreateIncident();
  const deleteMutation = useDeleteIncident();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => records ?? [], [records]);
  const highCount = list.filter((i) => i.severity === 'high').length;

  const handleAdd = async () => {
    if (!crusade || draft.occurred_on === '' || draft.description.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        kind,
        occurred_on: draft.occurred_on,
        occurred_at_time: draft.occurred_at_time || null,
        severity: draft.severity,
        location: draft.location.trim() || null,
        description: draft.description.trim(),
        response_taken: draft.response_taken.trim() || null,
        transported_to: kind === 'medical' ? (draft.transported_to.trim() || null) : null,
        resolution: draft.resolution.trim() || null,
      });
      setDraft(emptyDraft());
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleDelete = (i: Incident) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete incident: "${i.description.slice(0, 60)}${i.description.length > 60 ? '…' : ''}"?`)) return;
    deleteMutation.mutate(i.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={title} pillar={pillar} primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={title} pillar={pillar} primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={title} pillar={pillar} primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{list.length}</div>
            <div className="lbl">total {kind} {list.length === 1 ? 'incident' : 'incidents'}</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b style={{ color: highCount > 0 ? 'var(--accent)' : undefined }}>{highCount}</b> high severity</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load incidents.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No {kind} incidents logged yet.</div>
          ) : (
            list.map((i) => (
              <div key={i.id} className="form-list-row">
                <div>
                  <div className="name">{i.description.slice(0, 80)}{i.description.length > 80 ? '…' : ''}</div>
                  <div className="sub">
                    {i.occurred_on}{i.occurred_at_time ? ` · ${i.occurred_at_time.slice(0, 5)}` : ''}{i.location ? ` · ${i.location}` : ''}
                    {kind === 'medical' && i.transported_to ? ` · → ${i.transported_to}` : ''}
                  </div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={'status ' + SEVERITY_CLASS[i.severity]}>{SEVERITIES.find((s) => s.value === i.severity)?.label}</div>
                  <button type="button" onClick={() => handleDelete(i)} aria-label="Delete" style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}>×</button>
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
              setDraft(emptyDraft());
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : `Log ${kind} incident`}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Occurred on" required value={draft.occurred_on} onChange={(v) => setDraft({ ...draft, occurred_on: v })}/>
              <TextField label="Time (HH:MM)" placeholder="optional" value={draft.occurred_at_time} onChange={(v) => setDraft({ ...draft, occurred_at_time: v })}/>
              <SegmentedField
                label="Severity"
                required
                options={SEVERITIES}
                value={draft.severity}
                onChange={(v) => setDraft({ ...draft, severity: v as IncidentSeverity })}
              />
              <TextField label="Location" placeholder={kind === 'security' ? 'e.g. Front rail / VIP entrance' : 'e.g. Counsellor area / row 12'} value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })}/>
              <TextareaField label="Description" required placeholder={kind === 'security' ? 'What happened?' : 'Symptoms / condition'} value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })}/>
              <TextareaField label="Response taken" placeholder={kind === 'security' ? 'How was it handled?' : 'First aid given'} value={draft.response_taken} onChange={(v) => setDraft({ ...draft, response_taken: v })}/>
              {kind === 'medical' && (
                <TextField label="Transported to" placeholder="Hospital / clinic, if any" value={draft.transported_to} onChange={(v) => setDraft({ ...draft, transported_to: v })}/>
              )}
              <TextareaField label="Resolution" placeholder="Outcome / follow-up notes" value={draft.resolution} onChange={(v) => setDraft({ ...draft, resolution: v })}/>
            </div>

            {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft()); setSaveError(null); }}>Clear</button>
              <button
                type="button"
                className="btn primary"
                onClick={handleAdd}
                disabled={createMutation.isPending || draft.occurred_on === '' || draft.description.trim() === ''}
              >
                {createMutation.isPending ? 'Saving…' : 'Log incident'}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}

export function SecurityIncidentsScreen() {
  return <IncidentsScreen kind="security" pillar="D17" title={<>Security <em>Incidents</em></>}/>;
}

export function MedicalIncidentsScreen() {
  return <IncidentsScreen kind="medical" pillar="D18" title={<>Medical <em>Incidents</em></>}/>;
}
