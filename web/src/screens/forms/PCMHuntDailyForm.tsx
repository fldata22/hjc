import { useEffect, useMemo, useState } from 'react';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, TextareaField, NumberField, CurrencyField, DateField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import { todayISO, nowHHMM, last14Days, formatDayLabel } from '../../lib/dateHelpers';
import './forms.css';

type HuntEntry = {
  id?: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  location: string;
  contactName: string;
  contactPhone: string;
  outcome: 'met' | 'no-show' | 'reschedule' | 'won';
  leadsGenerated: number | '';
  expense: number | '';
  notes: string;
};

const FORM_SLUG = 'pcm-hunt-daily';

const SEED: HuntEntry[] = [
  { date: todayISO(), time: '11:42', location: 'Wa Pastors\' Fellowship', contactName: 'Pst. Kofi Adjei', contactPhone: '+233 24 555 1001', outcome: 'won', leadsGenerated: 2, expense: 45, notes: 'Confirmed for PCM. Following up Tue.' },
  { date: todayISO(), time: '09:14', location: 'Christ Apostolic Wa', contactName: 'Rev. Mensah', contactPhone: '+233 24 555 1002', outcome: 'met', leadsGenerated: 1, expense: 30, notes: '' },
];

const emptyEntry = (date: string): HuntEntry => ({
  date,
  time: nowHHMM(),
  location: '',
  contactName: '',
  contactPhone: '',
  outcome: 'met',
  leadsGenerated: '',
  expense: '',
  notes: '',
});

export function PCMHuntDailyForm() {
  const [allEntries, setAllEntries] = useState<HuntEntry[]>(() => {
    const stored = getRecords<HuntEntry>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<HuntEntry>(emptyEntry(todayISO()));

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<HuntEntry>(FORM_SLUG);
      if (stored.length > 0) setAllEntries(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const dayEntries = useMemo(
    () => allEntries.filter((e) => e.date === selectedDate).sort((a, b) => b.time.localeCompare(a.time)),
    [allEntries, selectedDate],
  );

  const dayContacts = dayEntries.filter((e) => e.outcome === 'met' || e.outcome === 'won').length;
  const daySpend = dayEntries.reduce((sum, e) => sum + (typeof e.expense === 'number' ? e.expense : 0), 0);

  const canAdd = draft.location.trim() !== '' && draft.contactName.trim() !== '' && draft.time !== '';

  const handleAdd = () => {
    enqueue<HuntEntry>(FORM_SLUG, draft);
    setDraft(emptyEntry(selectedDate));
    // Don't collapse the form — director may want to add another immediately.
  };

  const days = last14Days();
  const isToday = selectedDate === todayISO();

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>PCM Hunt <em>Daily Activity</em></>}
        pillar="P1"
        primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
      >
        <div className="date-strip">
          {days.map((iso) => {
            const { dow, dnum } = formatDayLabel(iso);
            return (
              <button
                type="button"
                key={iso}
                className={'day' + (selectedDate === iso ? ' on' : '')}
                onClick={() => {
                  setSelectedDate(iso);
                  setDraft((d) => ({ ...d, date: iso }));
                }}
              >
                <span className="dow">{dow}</span>
                <span className="dnum">{dnum}</span>
              </button>
            );
          })}
        </div>

        <div className="stat-strip">
          <div>
            <div className="num">{dayEntries.length}</div>
            <div className="lbl">entries</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{dayContacts}</b> contacts · <b>₵{daySpend}</b> spent</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {dayEntries.length === 0 && (
            <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              No entries logged for this day.
            </div>
          )}
          {dayEntries.map((e, i) => (
            <div key={e.id ?? `${e.time}-${i}`} className="form-list-row">
              <div>
                <div className="name">{e.location}</div>
                <div className="sub">{e.contactName}{e.notes && ` · ${e.notes.slice(0, 60)}${e.notes.length > 60 ? '…' : ''}`}</div>
              </div>
              <div className="right">
                <div className={'status ' + (e.outcome === 'won' ? 'confirmed' : e.outcome === 'no-show' ? 'declined' : 'pending')}>{e.outcome.replace('-', ' ')}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>
                  {e.time}{typeof e.expense === 'number' && e.expense > 0 ? ` · ₵${e.expense}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {isToday && (
          <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'Log activity'}
          </button>
        )}

        {showForm && isToday && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Time" type="time" value={draft.time} onChange={(v) => setDraft({ ...draft, time: v })} required/>
              <TextField label="Location visited" placeholder="Church / venue" value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })} required/>
              <TextField label="Contact name" value={draft.contactName} onChange={(v) => setDraft({ ...draft, contactName: v })} required/>
              <PhoneField label="Contact phone" value={draft.contactPhone} onChange={(v) => setDraft({ ...draft, contactPhone: v })}/>
              <SegmentedField
                label="Outcome"
                options={[
                  { value: 'met', label: 'Met' },
                  { value: 'no-show', label: 'No-show' },
                  { value: 'reschedule', label: 'Re-sched' },
                  { value: 'won', label: 'Won' },
                ]}
                value={draft.outcome}
                onChange={(v) => setDraft({ ...draft, outcome: v as HuntEntry['outcome'] })}
                required
              />
              <NumberField label="Leads generated" value={draft.leadsGenerated} onChange={(v) => setDraft({ ...draft, leadsGenerated: v })}/>
              <CurrencyField label="Expense" value={draft.expense} onChange={(v) => setDraft({ ...draft, expense: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => setDraft(emptyEntry(selectedDate))}>Clear</button>
              <button type="button" className="btn primary" onClick={handleAdd} disabled={!canAdd}>Add entry</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
