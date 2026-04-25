// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, TopBar, MobileIcon as Icon } from '../../components/MobileShell';
import { useActivityEntries } from '../../api/hooks';

type DateMode = 'today' | 'yesterday' | 'week';

function getDateParam(mode: DateMode): string | undefined {
  const now = new Date();
  if (mode === 'today') {
    return now.toISOString().slice(0, 10);
  }
  if (mode === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  // week: no date param — backend returns last 7 days
  return undefined;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const TABS: { key: DateMode; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This week' },
];

export function ActivityLogMobile() {
  const [dateMode, setDateMode] = useState<DateMode>('today');

  const date = getDateParam(dateMode);
  const { data: result, isLoading } = useActivityEntries({ date, per_page: 50 });

  const entries = (result?.data ?? []).slice().sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );

  return (
    <Phone
      active="home"
      top={
        <TopBar
          back
          title="Activity log"
          right={
            <button className="mw-iconbtn">
              <Icon name="filter" size={18} />
            </button>
          }
        />
      }
    >
      {/* Date mode tabs */}
      <div className="mw-filterbar" style={{ padding: '0 0 12px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`mw-chip${dateMode === tab.key ? ' active' : ''}`}
            onClick={() => setDateMode(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Entries list */}
      {isLoading ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          No entries for this period.
        </div>
      ) : (
        <div className="mw-card" style={{ padding: '4px 14px' }}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="mw-row"
              style={{
                gap: 12,
                padding: '12px 0',
                borderBottom: i < entries.length - 1 ? '0.5px solid var(--border)' : 'none',
                alignItems: 'flex-start',
              }}
            >
              {/* colour dot — green for done, amber for running */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: entry.status === 'done' ? '#639922' : '#EF9F27',
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />

              {/* description + power badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {entry.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {entry.power && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-info)',
                        background: 'var(--bg-info)',
                        borderRadius: 6,
                        padding: '2px 7px',
                        fontWeight: 500,
                      }}
                    >
                      {entry.power.name}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      color: entry.status === 'done' ? '#639922' : '#EF9F27',
                      background: entry.status === 'done' ? 'rgba(99,153,34,0.10)' : 'rgba(239,159,39,0.12)',
                      borderRadius: 6,
                      padding: '2px 7px',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {entry.status}
                  </span>
                </div>
              </div>

              {/* time */}
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {fmtTime(entry.occurred_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick log FAB */}
      <Link
        to="/m/log"
        style={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--text-info)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
          textDecoration: 'none',
          zIndex: 50,
        }}
      >
        <Icon name="plus" size={22} color="white" />
      </Link>
    </Phone>
  );
}
