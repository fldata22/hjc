import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { useBudgetCategories, useBudgetSummary, useExpenseTransactions } from '../../api/hooks';
import { ReceiptModal } from '../forms/ReceiptModal';
import './app.css';

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
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);

  const [dateRange] = useState(() => ({
    today: new Date().toISOString().slice(0, 10),
    thirtyDaysAgo: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
  }));
  const { data: page } = useExpenseTransactions(dateRange.thirtyDaysAgo, dateRange.today);
  const { data: categories } = useBudgetCategories();
  const { data: summary } = useBudgetSummary();

  const entries = useMemo(() => page?.data ?? [], [page]);

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c] as const)),
    [categories],
  );

  const recent = useMemo(
    () =>
      [...entries]
        .sort((a, b) => {
          if (a.occurred_on !== b.occurred_on) return b.occurred_on.localeCompare(a.occurred_on);
          return b.created_at.localeCompare(a.created_at);
        })
        .slice(0, 5),
    [entries],
  );

  const totalBudget = summary ? Number(summary.total_budget) : 0;
  const totalSpent = summary ? Number(summary.spent) : 0;
  const overBudget = totalSpent > totalBudget;
  const remainingOrOver = overBudget
    ? `₵${Math.round(totalSpent - totalBudget).toLocaleString()} over`
    : `₵${Math.round(Math.max(0, totalBudget - totalSpent)).toLocaleString()} left`;

  const categoriesWithSpend = useMemo(() => {
    if (!summary) return [];
    return summary.categories
      .map((c) => ({ id: c.id, label: c.name, amount: Number(c.spent) }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [summary]);

  const maxCategoryAmount = useMemo(
    () => Math.max(0, ...categoriesWithSpend.map((c) => c.amount)),
    [categoriesWithSpend],
  );

  const isEmpty = entries.length === 0 && categoriesWithSpend.length === 0;

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
            <div className="num serif">₵{Math.round(totalSpent).toLocaleString()}</div>
            <div className="delta">
              <b>{remainingOrOver}</b>
              of ₵{Math.round(totalBudget).toLocaleString()} budget
            </div>
          </div>
          <div className="track">
            <i style={{ width: `${totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0}%` }}/>
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
                  key={cat.id}
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
                    {cat.label.charAt(0).toUpperCase()}
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
                    ₵{Math.round(cat.amount).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {recent.length > 0 && (
          <>
            <div className="sec">
              <h2 className="serif">Recent <em>· 5 latest</em></h2>
              <span className="more">{entries.length} in last 30 days</span>
            </div>

            <div style={{ padding: '0 20px' }}>
              {recent.map((e) => {
                const cat = e.budget_category_id != null ? categoryById.get(e.budget_category_id) : null;
                return (
                  <div key={e.id} className="form-list-row">
                    <div>
                      <div className="name">{e.description}</div>
                      <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>{cat?.name ?? 'Uncategorized'}</span>
                        {e.receipt_photo_url && (
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receipt_photo_url); }}
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
                        ₵{Number(e.amount).toLocaleString()}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>
                        {formatRelativeDate(e.occurred_on)}
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
      {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
    </ResponsiveShell>
  );
}
