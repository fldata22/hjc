import { type ChangeEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SelectField, CurrencyField, DateField } from './fields';
import {
  useCrusade,
  useBudgetCategories,
  useExpenseTransactions,
  useBudgetSummary,
  useCreateExpenseTransaction,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { compressImage } from '../../lib/imageCompress';
import { ReceiptModal } from './ReceiptModal';
import { todayISO, last14Days, formatDayLabel } from '../../lib/dateHelpers';
import { useToast } from '../../lib/toast-context';
import './forms.css';

type Draft = {
  date: string;
  vendor: string;
  budgetCategoryId: number | '';
  amount: number | '';
  notes: string;
  receiptPreview: string | null;
  receiptBlob: Blob | null;
};

const emptyDraft = (date: string): Draft => ({
  date,
  vendor: '',
  budgetCategoryId: '',
  amount: '',
  notes: '',
  receiptPreview: null,
  receiptBlob: null,
});

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

function composeDescription(vendor: string, notes: string): string {
  const v = vendor.trim();
  const n = notes.trim();
  if (!n) return v;
  return `${v} — ${n}`;
}

export function DailyExpensesForm() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError, refetch: refetchCategories } = useBudgetCategories();
  const { data: summary } = useBudgetSummary();

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const { data: dayPage, isLoading: dayLoading, isError: dayError, refetch: refetchDay } = useExpenseTransactions(selectedDate, selectedDate);
  const createMutation = useCreateExpenseTransaction();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(todayISO()));
  const [capturing, setCapturing] = useState(false);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dayEntries = useMemo(
    () => (dayPage?.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [dayPage],
  );

  const daySpend = dayEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBudget = summary ? Number(summary.total_budget) : 0;
  const totalSpent = summary ? Number(summary.spent) : 0;
  const budgetRemaining = totalBudget - totalSpent;

  const canAdd =
    !!crusade &&
    draft.vendor.trim() !== '' &&
    typeof draft.amount === 'number' &&
    draft.amount > 0 &&
    !createMutation.isPending;

  const handleReceiptChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCapturing(true);
    try {
      const { blob, dataUrl } = await compressImage(file);
      setDraft((d) => ({ ...d, receiptPreview: dataUrl, receiptBlob: blob }));
    } catch (err) {
      console.error('Receipt compression failed:', err);
      toast.show('Could not load that image. Try a different file.', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const handleAdd = async () => {
    if (!canAdd || !crusade) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        budget_category_id: typeof draft.budgetCategoryId === 'number' ? draft.budgetCategoryId : null,
        description: composeDescription(draft.vendor, draft.notes),
        occurred_on: draft.date,
        amount: typeof draft.amount === 'number' ? draft.amount : 0,
        receipt_photo: draft.receiptBlob,
      });
      setDraft(emptyDraft(selectedDate));
      // Keep form open for rapid-fire entries (preserves the prior UX).
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
          title={<>Crusade <em>Daily Expenses</em></>}
          pillar="Budget"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <ErrorBanner what="crusade" onRetry={refetchCrusade}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (categoriesError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Crusade <em>Daily Expenses</em></>}
          pillar="Budget"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <ErrorBanner what="budget categories" onRetry={refetchCategories}/>
        </FormShell>
      </ResponsiveShell>
    );
  }
  if (crusadeLoading || categoriesLoading || !crusade || !categories) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Crusade <em>Daily Expenses</em></>}
          pillar="Budget"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const days = last14Days();

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
            <div className="num">₵{daySpend.toFixed(0)}</div>
            <div className="lbl">spent today</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>₵{Math.max(0, budgetRemaining).toFixed(0)}</b> remaining</div>
            <div className="lbl" style={{ fontSize: 10 }}>of ₵{totalBudget.toFixed(0)}</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {dayError ? (
            <ErrorBanner what="day's expenses" onRetry={refetchDay}/>
          ) : dayLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : dayEntries.length === 0 ? (
            <div className="empty">No expenses logged today.</div>
          ) : (
            dayEntries.map((e) => {
              const cat = e.budget_category_id != null ? categoryById.get(e.budget_category_id) : null;
              return (
                <div key={e.id} className="form-list-row">
                  <div>
                    <div className="name">{e.description}</div>
                    <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {cat?.name ?? 'Uncategorized'}
                      {e.receipt_photo_url && (
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receipt_photo_url); }}
                          style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                          aria-label="View receipt"
                        >
                          📷
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="right">
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>₵{Number(e.amount).toFixed(2)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => {
            if (showForm) {
              setDraft(emptyDraft(selectedDate));
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : 'Add expense'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} required/>
              <TextField label="Vendor" placeholder="e.g. Sahel Transport" value={draft.vendor} onChange={(v) => setDraft({ ...draft, vendor: v })} required/>
              <SelectField
                label="Category"
                options={categoryOptions}
                value={draft.budgetCategoryId === '' ? '' : String(draft.budgetCategoryId)}
                onChange={(v) => setDraft({ ...draft, budgetCategoryId: v === '' ? '' : Number(v) })}
                placeholder="Uncategorized"
              />
              <CurrencyField label="Amount" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} required/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>

            <div style={{ padding: '12px 0' }}>
              {draft.receiptPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={draft.receiptPreview}
                    alt="Receipt preview"
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, receiptPreview: null, receiptBlob: null }))}
                    style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="receipt-capture-btn" style={{ display: 'inline-block', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
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

            {saveError && (
              <div className="field-error" style={{ margin: '4px 0' }}>{saveError}</div>
            )}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft(selectedDate)); setSaveError(null); }}>Clear</button>
              <button type="button" className="btn primary" onClick={handleAdd} disabled={!canAdd}>
                {createMutation.isPending ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </div>
        )}

        {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
