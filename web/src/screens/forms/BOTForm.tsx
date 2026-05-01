import { useEffect, useState } from 'react';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, TextareaField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import './forms.css';

type BOTRecord = {
  id?: string;
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
  status: 'confirmed' | 'pending' | 'declined';
  notes: string;
};

const SEED: BOTRecord[] = [
  { name: 'Rev. Edmund Asare', role: 'Chair', organization: 'Wa Council of Churches', phone: '+233 24 555 0100', email: '', status: 'confirmed', notes: '' },
  { name: 'Mrs. Adwoa Mensah', role: 'Treasurer', organization: 'Christ Apostolic', phone: '+233 24 555 0101', email: '', status: 'confirmed', notes: '' },
  { name: 'Pastor Kwaku Frimpong', role: 'Secretary', organization: 'Living Word', phone: '+233 24 555 0102', email: '', status: 'pending', notes: '' },
];

const FORM_SLUG = 'bot';

const emptyForm: BOTRecord = {
  name: '', role: '', organization: '', phone: '', email: '', status: 'pending', notes: '',
};

export function BOTForm() {
  const [trustees, setTrustees] = useState<BOTRecord[]>(() => {
    const stored = getRecords<BOTRecord>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<BOTRecord>(emptyForm);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<BOTRecord>(FORM_SLUG);
      if (stored.length > 0) setTrustees(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const canSave = draft.name.trim() !== '' && draft.role.trim() !== '' && draft.phone.trim() !== '';

  const handleSave = () => {
    enqueue<BOTRecord>(FORM_SLUG, draft);
    setDraft(emptyForm);
    setShowForm(false);
  };

  const confirmedCount = trustees.filter((t) => t.status === 'confirmed').length;
  const pendingCount = trustees.filter((t) => t.status === 'pending').length;

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
            <div className="lbl">of {trustees.length} confirmed</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{pendingCount}</b> pending</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {trustees.map((t, i) => (
            <div key={t.id ?? `${t.name}-${i}`} className="form-list-row">
              <div>
                <div className="name">{t.name}</div>
                <div className="sub">{t.role}{t.organization && ` · ${t.organization}`}</div>
              </div>
              <div className="right">
                <div className={'status ' + t.status}>{t.status}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{t.phone}</div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
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
                onChange={(v) => setDraft({ ...draft, status: v as BOTRecord['status'] })}
                required
              />
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyForm); setShowForm(false); }}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>Save trustee</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
