import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, SelectField, TextareaField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import './forms.css';

type CPCRecord = {
  id?: string;
  fullName: string;
  role: string;
  zone: string;
  phone: string;
  email: string;
  status: 'active' | 'on-leave' | 'stepped-down';
  notes: string;
};

const FORM_SLUG = 'cpc';

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const SEED: CPCRecord[] = [
  { fullName: 'Akua Boateng', role: 'Zone Coordinator', zone: 'wa-central', phone: '+233 24 555 0301', email: '', status: 'active', notes: '' },
  { fullName: 'Yaw Owusu', role: 'Logistics Lead', zone: 'wa-north', phone: '+233 24 555 0302', email: '', status: 'active', notes: '' },
  { fullName: 'Pst. Daniel Ofori', role: 'Pastor Liaison', zone: 'wa-south', phone: '+233 24 555 0303', email: '', status: 'active', notes: '' },
  { fullName: 'Mary Asante', role: 'Volunteer Manager', zone: 'wa-east', phone: '+233 24 555 0304', email: '', status: 'on-leave', notes: '' },
];

const STATUS_CLASS: Record<CPCRecord['status'], string> = {
  active: 'confirmed',
  'on-leave': 'pending',
  'stepped-down': 'declined',
};

const STATUS_LABEL: Record<CPCRecord['status'], string> = {
  active: 'active',
  'on-leave': 'on leave',
  'stepped-down': 'stepped down',
};

const emptyForm: CPCRecord = {
  fullName: '', role: '', zone: '', phone: '', email: '', status: 'active', notes: '',
};

export function CPCForm() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<CPCRecord[]>(() => {
    const stored = getRecords<CPCRecord>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<CPCRecord>(emptyForm);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<CPCRecord>(FORM_SLUG);
      if (stored.length > 0) setMembers(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const canSave =
    draft.fullName.trim() !== '' &&
    draft.role.trim() !== '' &&
    draft.zone !== '' &&
    draft.phone.trim() !== '' &&
    draft.status !== ('' as CPCRecord['status']);

  const handleSave = () => {
    enqueue<CPCRecord>(FORM_SLUG, draft);
    setDraft(emptyForm);
    setShowForm(false);
  };

  const activeCount = members.filter((m) => m.status === 'active').length;
  const onLeaveCount = members.filter((m) => m.status === 'on-leave').length;

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
            <div className="lbl">of {members.length} active</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{onLeaveCount}</b> on leave</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {members.map((m, i) => {
            const zoneLabel = ZONES.find((z) => z.value === m.zone)?.label ?? m.zone;
            return (
              <div key={m.id ?? `${m.fullName}-${i}`} className="form-list-row">
                <div>
                  <div className="name">{m.fullName}</div>
                  <div className="sub">{m.role} · {zoneLabel}</div>
                </div>
                <div className="right">
                  <div className={'status ' + STATUS_CLASS[m.status]}>{STATUS_LABEL[m.status]}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{m.phone}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add CPC member'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Full name" value={draft.fullName} onChange={(v) => setDraft({ ...draft, fullName: v })} required/>
              <TextField label="Role" placeholder="e.g. Zone Coordinator" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
              <SelectField label="Zone" required options={ZONES} value={draft.zone} onChange={(v) => setDraft({ ...draft, zone: v })} placeholder="Select zone…"/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} required/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
              <SegmentedField
                label="Status"
                required
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'on-leave', label: 'On leave' },
                  { value: 'stepped-down', label: 'Stepped down' },
                ]}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as CPCRecord['status'] })}
              />
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyForm); setShowForm(false); }}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>Save member</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
