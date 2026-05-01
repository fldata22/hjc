import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { getRecords, subscribe } from '../../lib/submitQueue';
import './app.css';

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
};

const FORM_SLUG = 'daily-expenses';
const STATIC_BUDGET = 84000;

const CATEGORIES: Array<{ value: ExpenseEntry['category']; label: string }> = [
  { value: 'transport', label: 'Transport' },
  { value: 'printing', label: 'Printing' },
  { value: 'permits', label: 'Permits' },
  { value: 'food', label: 'Food' },
  { value: 'venue', label: 'Venue' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

const LETTER_FOR_CATEGORY: Record<ExpenseEntry['category'], string> = {
  transport: 'T',
  printing: 'P',
  permits: 'R',
  food: 'F',
  venue: 'V',
  materials: 'M',
  other: 'O',
};

function formatRelativeDate(iso: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'today';
  if (iso === yest) return 'yest';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function BudgetScreen() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [allEntries, setAllEntries] = useState<ExpenseEntry[]>(() =>
    getRecords<ExpenseEntry>(FORM_SLUG),
  );

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setAllEntries(getRecords<ExpenseEntry>(FORM_SLUG));
    });
    return () => { unsubscribe(); };
  }, []);

  const totalSpent = useMemo(
    () => allEntries.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0),
    [allEntries],
  );

  const sumByCategory = useMemo(() => {
    const sums: Record<ExpenseEntry['category'], number> = {
      transport: 0, printing: 0, permits: 0, food: 0, venue: 0, materials: 0, other: 0,
    };
    for (const e of allEntries) {
      if (typeof e.amount === 'number') sums[e.category] += e.amount;
    }
    return sums;
  }, [allEntries]);

  const categoriesWithSpend = useMemo(
    () =>
      CATEGORIES
        .map((c) => ({ ...c, amount: sumByCategory[c.value] }))
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [sumByCategory],
  );

  const maxCategoryAmount = useMemo(
    () => Math.max(0, ...categoriesWithSpend.map((c) => c.amount)),
    [categoriesWithSpend],
  );

  const recent = useMemo(
    () =>
      [...allEntries]
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.time.localeCompare(a.time);
        })
        .slice(0, 5),
    [allEntries],
  );

  const overBudget = totalSpent > STATIC_BUDGET;
  const remainingOrOver = overBudget
    ? `₵${(totalSpent - STATIC_BUDGET).toLocaleString()} over`
    : `₵${(STATIC_BUDGET - totalSpent).toLocaleString()} left`;

  const isEmpty = allEntries.length === 0;

  return (
    <ResponsiveShell active="home">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div style={{ padding: '20px 20px 0' }}>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            Budget · advance work
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Spend.
          </h1>
        </div>

        <div className="composite">
          <div className="label">Total spent · all-time</div>
          <div className="row">
            <div className="num serif">₵{totalSpent.toLocaleString()}</div>
            <div className="delta">
              <b>{remainingOrOver}</b>
              of ₵{STATIC_BUDGET.toLocaleString()} budget
            </div>
          </div>
          <div className="track">
            <i style={{ width: `${Math.min(100, (totalSpent / STATIC_BUDGET) * 100)}%` }}/>
          </div>
        </div>

        <div className="sec">
          <h2 className="serif">Spend by <em>category</em></h2>
          <span className="more">{categoriesWithSpend.length} categories</span>
        </div>

        {isEmpty ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
            No expenses logged yet.
            <button
              type="button"
              onClick={() => navigate('/forms/daily-expenses')}
              style={{
                display: 'block',
                margin: '12px auto 0',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 999,
                border: '1px solid var(--ink)',
                background: 'var(--ink)',
                color: 'var(--bg)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Log first expense →
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 20px' }}>
            {categoriesWithSpend.map((cat) => {
              const isDominating = totalSpent > 0 && cat.amount / totalSpent > 0.25;
              return (
                <div
                  key={cat.value}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr auto',
                    gap: 12,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--line)',
                    alignItems: 'center',
                  }}
                >
                  <span
                    className="serif"
                    style={{ fontSize: 18, color: 'var(--ink-3)', lineHeight: 1 }}
                  >
                    {LETTER_FOR_CATEGORY[cat.value]}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
                      {cat.label}
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: 'var(--bg-2)',
                        position: 'relative',
                      }}
                    >
                      <i
                        style={{
                          position: 'absolute',
                          left: 0, top: 0, bottom: 0,
                          width: `${maxCategoryAmount > 0 ? (cat.amount / maxCategoryAmount) * 100 : 0}%`,
                          background: isDominating ? 'var(--accent)' : 'var(--ink)',
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="serif"
                    style={{
                      fontSize: 22,
                      fontWeight: 300,
                      color: 'var(--ink)',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    ₵{cat.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!isEmpty && (
          <>
            <div className="sec">
              <h2 className="serif">Recent <em>· 5 latest</em></h2>
              <span className="more">{allEntries.length} total</span>
            </div>

            <div style={{ padding: '0 20px' }}>
              {recent.map((e, i) => {
                const categoryLabel = CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category;
                return (
                  <div key={e.id ?? `${e.date}-${e.time}-${i}`} className="form-list-row">
                    <div>
                      <div className="name">{e.vendor}</div>
                      <div className="sub">{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</div>
                    </div>
                    <div className="right">
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        ₵{typeof e.amount === 'number' ? e.amount.toLocaleString() : '—'}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>
                        {e.time} · {formatRelativeDate(e.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate('/forms/daily-expenses')}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 20px',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: 0,
                borderTop: '1px solid var(--line)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              View all expenses →
            </button>
          </>
        )}

        <div className="bot-pad"/>
      </div>
      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
