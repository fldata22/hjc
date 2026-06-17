import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer, useDrawer } from './Shell';
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
  const drawer = useDrawer();
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
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const remainingOrOver = overBudget
    ? `₵${Math.round(totalSpent - totalBudget).toLocaleString()} over budget`
    : `₵${Math.round(Math.max(0, totalBudget - totalSpent)).toLocaleString()} remaining`;

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
      <AppBar title="Budget" sub="advance work" onMenu={drawer.show}/>
      <div className="scroll">

        <div className="readiness-stat">
          <div className="stat-row">
            <span className="stat-num">
              ₵{totalSpent >= 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : Math.round(totalSpent).toLocaleString()}
            </span>
          </div>
          <div className="stat-sub">
            Total spent · <b>{remainingOrOver}</b>
          </div>
          <div className="progress-track">
            <div
              className={'progress-fill' + (overBudget ? ' risk' : pct > 80 ? ' hold' : '')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="sec-label">
          Spend by category
          <span className="sec-count">{categoriesWithSpend.length}</span>
        </div>

        {isEmpty ? (
          <div className="empty-state">
            No expenses logged yet.
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 12, display: 'block', width: '100%' }}
              onClick={() => navigate('/forms/daily-expenses')}
            >
              Log first expense →
            </button>
          </div>
        ) : (
          categoriesWithSpend.map((cat) => {
            const isDominating = totalSpent > 0 && cat.amount / totalSpent > 0.25;
            return (
              <div key={cat.id} className="list-row">
                <div className="pillar-badge">{cat.label.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row-label">{cat.label}</div>
                  <div className="mini-bar">
                    <div
                      className={'mini-bar-fill' + (isDominating ? ' risk' : '')}
                      style={{ width: `${maxCategoryAmount > 0 ? (cat.amount / maxCategoryAmount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="row-val">
                  ₵{Math.round(cat.amount).toLocaleString()}
                </div>
              </div>
            );
          })
        )}

        {recent.length > 0 && (
          <>
            <div className="sec-label" style={{ marginTop: 4 }}>
              Recent expenses
              <span className="sec-count">{entries.length} in 30 days</span>
            </div>

            {recent.map((e) => {
              const cat = e.budget_category_id != null ? categoryById.get(e.budget_category_id) : null;
              return (
                <div key={e.id} className="form-list-row" style={{ cursor: 'default' }}>
                  <div>
                    <div className="flr-name">{e.description}</div>
                    <div className="flr-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                  <div className="flr-right">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      ₵{Number(e.amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {formatRelativeDate(e.occurred_on)}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => navigate('/forms/daily-expenses')}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 20px',
                textAlign: 'center',
                fontSize: 11,
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
      {drawer.open && <Drawer active="home" onClose={drawer.hide}/>}
      {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
    </ResponsiveShell>
  );
}
