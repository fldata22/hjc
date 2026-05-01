import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SelectField, CurrencyField, DateField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import { compressImage } from '../../lib/imageCompress';
import { ReceiptModal } from './ReceiptModal';
import { todayISO, nowHHMM, last14Days, formatDayLabel } from '../../lib/dateHelpers';
import './forms.css';

type ExpenseEntry = {
  id?: string;
  date: string;
  time: string;
  vendor: string;
  category: 'transport' | 'printing' | 'permits' | 'food' | 'venue' | 'materials' | 'other';
  amount: number | '';
  receiptNumber: string;
  approvedBy: string;
  notes: string;
  receiptPhoto: string | null;
};

const FORM_SLUG = 'daily-expenses';

const CATEGORIES = [
  { value: 'transport', label: 'Transport' },
  { value: 'printing', label: 'Printing' },
  { value: 'permits', label: 'Permits' },
  { value: 'food', label: 'Food' },
  { value: 'venue', label: 'Venue' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

const STATIC_BUDGET = 84000;

const SEED: ExpenseEntry[] = [
  { date: todayISO(), time: '09:30', vendor: 'Wa Stadium permit office', category: 'permits', amount: 800, receiptNumber: 'R-2401', approvedBy: 'Director', notes: 'Stage permit fee', receiptPhoto: null },
  { date: todayISO(), time: '11:15', vendor: 'Newprint Press', category: 'printing', amount: 320, receiptNumber: 'R-2402', approvedBy: 'Director', notes: '500 posters batch 2', receiptPhoto: null },
  { date: todayISO(), time: '14:00', vendor: 'Sahel Transport', category: 'transport', amount: 140, receiptNumber: 'R-2403', approvedBy: 'Director', notes: 'PCM hunt day, 4 visits', receiptPhoto: null },
];

const emptyEntry = (date: string): ExpenseEntry => ({
  date,
  time: nowHHMM(),
  vendor: '',
  category: 'transport',
  amount: '',
  receiptNumber: '',
  approvedBy: '',
  notes: '',
  receiptPhoto: null,
});

export function DailyExpensesForm() {
  const navigate = useNavigate();
  const [allEntries, setAllEntries] = useState<ExpenseEntry[]>(() => {
    const stored = getRecords<ExpenseEntry>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<ExpenseEntry>(emptyEntry(todayISO()));
  const [capturing, setCapturing] = useState(false);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<ExpenseEntry>(FORM_SLUG);
      if (stored.length > 0) setAllEntries(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const dayEntries = useMemo(
    () => allEntries
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => b.time.localeCompare(a.time)),
    [allEntries, selectedDate],
  );

  const daySpend = dayEntries.reduce(
    (sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0),
    0,
  );
  const totalSpend = allEntries.reduce(
    (sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0),
    0,
  );
  const budgetRemaining = STATIC_BUDGET - totalSpend;

  const canAdd =
    draft.time !== '' &&
    draft.vendor.trim() !== '' &&
    typeof draft.amount === 'number' &&
    draft.amount > 0;

  const handleAdd = () => {
    enqueue<ExpenseEntry>(FORM_SLUG, draft);
    setDraft(emptyEntry(selectedDate));
    // Keep form open for rapid-fire entries.
  };

  const handleReceiptChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so the same file can be re-selected after Remove.
    e.target.value = '';
    if (!file) return;
    setCapturing(true);
    try {
      const dataUrl = await compressImage(file);
      setDraft((d) => ({ ...d, receiptPhoto: dataUrl }));
    } catch (err) {
      console.error('Receipt compression failed:', err);
      alert('Could not load that image. Try a different file.');
    } finally {
      setCapturing(false);
    }
  };

  const days = last14Days();
  const isToday = selectedDate === todayISO();

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Crusade <em>Daily Expenses</em></>}
        pillar="Budget"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
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
            <div className="num">₵{daySpend.toLocaleString()}</div>
            <div className="lbl">spent {isToday ? 'today' : 'this day'}</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{dayEntries.length}</b> entries · <b>₵{budgetRemaining.toLocaleString()}</b> of ₵{STATIC_BUDGET.toLocaleString()} left</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {dayEntries.length === 0 && (
            <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              No expenses logged for this day.
            </div>
          )}
          {dayEntries.map((e, i) => {
            const categoryLabel = CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category;
            return (
              <div key={e.id ?? `${e.time}-${i}`} className="form-list-row">
                <div>
                  <div className="name">{e.vendor}</div>
                  <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</span>
                    {e.receiptPhoto && (
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receiptPhoto ?? null); }}
                        aria-label="View receipt"
                        style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                      >
                        📷
                      </button>
                    )}
                  </div>
                </div>
                <div className="right">
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    ₵{typeof e.amount === 'number' ? e.amount.toLocaleString() : '—'}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{e.time}</div>
                </div>
              </div>
            );
          })}
        </div>

        {isToday && (
          <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'Log expense'}
          </button>
        )}

        {showForm && isToday && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Time" type="time" value={draft.time} onChange={(v) => setDraft({ ...draft, time: v })} required/>
              <TextField label="Vendor / paid to" value={draft.vendor} onChange={(v) => setDraft({ ...draft, vendor: v })} required/>
              <SelectField
                label="Category"
                required
                options={CATEGORIES}
                value={draft.category}
                onChange={(v) => setDraft({ ...draft, category: v as ExpenseEntry['category'] })}
              />
              <CurrencyField label="Amount" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} required/>
              <TextField label="Receipt #" value={draft.receiptNumber} onChange={(v) => setDraft({ ...draft, receiptNumber: v })}/>
              <TextField label="Approved by" value={draft.approvedBy} onChange={(v) => setDraft({ ...draft, approvedBy: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>

              <div className="field">
                <div className="lbl"><span>Receipt photo</span></div>
                {draft.receiptPhoto ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                    <img
                      src={draft.receiptPhoto}
                      alt="Receipt"
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, receiptPhoto: null })}
                      style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'inline-block',
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 999,
                      border: '1px solid var(--ink)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      cursor: capturing ? 'not-allowed' : 'pointer',
                      opacity: capturing ? 0.5 : 1,
                      marginTop: 4,
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handleReceiptChange}
                      disabled={capturing}
                    />
                    {capturing ? 'Processing…' : '+ Add receipt'}
                  </label>
                )}
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => setDraft(emptyEntry(selectedDate))}>Clear</button>
              <button type="button" className="btn primary" onClick={handleAdd} disabled={!canAdd}>Add expense</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
      {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
    </ResponsiveShell>
  );
}
