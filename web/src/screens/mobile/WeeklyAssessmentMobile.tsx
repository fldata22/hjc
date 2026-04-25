// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Phone, TopBar } from '../../components/MobileShell';
import { usePowers, useWeeklyLatest, useReplaceReadings, useReplaceRisks } from '../../api/hooks';

const SEVERITIES = ['critical', 'high', 'medium'] as const;

export function WeeklyAssessmentMobile() {
  const { data: latest, isError, error } = useWeeklyLatest();
  const { data: powers } = usePowers();

  // ── Readings local state: Map<power_id, value_pct> ──
  const [readingsMap, setReadingsMap] = useState<Map<number, number>>(new Map());
  const [readingsSaving, setReadingsSaving] = useState(false);
  const [readingsMsg, setReadingsMsg] = useState<string | null>(null);

  // ── Risks local state: Map<ordering, {severity, text}> ──
  const [risksMap, setRisksMap] = useState<Map<number, { severity: string; text: string }>>(new Map());
  const [risksSaving, setRisksSaving] = useState(false);
  const [risksMsg, setRisksMsg] = useState<string | null>(null);

  const replaceReadings = useReplaceReadings();
  const replaceRisks = useReplaceRisks();

  // Initialise readings from latest
  useEffect(() => {
    if (!latest?.readings) return;
    const m = new Map<number, number>();
    for (const r of latest.readings) m.set(r.power_id, r.value_pct);
    setReadingsMap(m);
  }, [latest?.id]);

  // Initialise risks from latest
  useEffect(() => {
    if (!latest?.risks) return;
    const m = new Map<number, { severity: string; text: string }>();
    for (const r of latest.risks) m.set(r.ordering, { severity: r.severity, text: r.text });
    // ensure slots 1-3 exist
    for (const ord of [1, 2, 3]) {
      if (!m.has(ord)) m.set(ord, { severity: 'medium', text: '' });
    }
    setRisksMap(m);
  }, [latest?.id]);

  // 404 / no-assessment guard
  const is404 = isError && (error as any)?.status === 404;
  if (isError && !is404) {
    return (
      <Phone active="home" top={<TopBar back title="Weekly assessment" eyebrow="Weekly assessment" />}>
        <div style={{ padding: 24, color: 'var(--text-danger)' }}>Failed to load assessment.</div>
      </Phone>
    );
  }

  if (is404 || (!latest && isError)) {
    return (
      <Phone active="home" top={<TopBar back title="Weekly assessment" eyebrow="Weekly assessment" />}>
        <div style={{ padding: 24, color: 'var(--text-secondary)' }}>
          No weekly assessment yet for this crusade. Create one from the desktop.
        </div>
      </Phone>
    );
  }

  if (!latest) {
    return (
      <Phone active="home" top={<TopBar back title="Weekly assessment" eyebrow="Weekly assessment" />}>
        <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading…</div>
      </Phone>
    );
  }

  // ── Handlers ──
  const handleSliderChange = (powerId: number, val: number) => {
    setReadingsMap(prev => new Map(prev).set(powerId, val));
  };

  const handleSaveReadings = async () => {
    setReadingsSaving(true);
    setReadingsMsg(null);
    try {
      const readings = Array.from(readingsMap.entries()).map(([power_id, value_pct]) => ({ power_id, value_pct }));
      await replaceReadings.mutateAsync({ id: latest.id, readings });
      setReadingsMsg('Saved.');
    } catch {
      setReadingsMsg('Error saving readings.');
    } finally {
      setReadingsSaving(false);
    }
  };

  const handleRiskChange = (ordering: number, field: 'severity' | 'text', value: string) => {
    setRisksMap(prev => {
      const m = new Map(prev);
      const existing = m.get(ordering) ?? { severity: 'medium', text: '' };
      m.set(ordering, { ...existing, [field]: value });
      return m;
    });
  };

  const handleSaveRisks = async () => {
    setRisksSaving(true);
    setRisksMsg(null);
    try {
      const risks = Array.from(risksMap.entries())
        .filter(([, v]) => v.text.trim() !== '')
        .map(([ordering, { severity, text }]) => ({ ordering, severity, text }));
      await replaceRisks.mutateAsync({ id: latest.id, risks });
      setRisksMsg('Saved.');
    } catch {
      setRisksMsg('Error saving risks.');
    } finally {
      setRisksSaving(false);
    }
  };

  // Ordered powers list
  const orderedPowers = powers ? [...powers].sort((a, b) => a.order_index - b.order_index) : [];

  return (
    <Phone active="home" top={<TopBar back title={`Week ${latest.week_number}`} eyebrow="Weekly assessment" />}>

      {/* Self-score */}
      <div className="mw-stat info" style={{ marginBottom: 14 }}>
        <div className="lbl">Self-score (read-only)</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
          <div className="val" style={{ fontSize: 28 }}>
            {latest.self_score != null ? latest.self_score : '—'}
            {latest.self_score != null && (
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}> / 10</span>
            )}
          </div>
        </div>
      </div>

      {/* Power readings */}
      <div className="mw-section-title">Power-by-power readings</div>
      <div className="mw-card" style={{ padding: '4px 16px 12px' }}>
        {orderedPowers.map(power => {
          const val = readingsMap.get(power.id) ?? 0;
          return (
            <div key={power.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{power.name}</div>
                <span
                  className={`mw-badge ${val >= 70 ? 'success' : val >= 40 ? 'warning' : 'danger'}`}
                  style={{ minWidth: 36, textAlign: 'center' }}
                >
                  {val}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={val}
                onChange={e => handleSliderChange(power.id, Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--text-info)' }}
              />
            </div>
          );
        })}
      </div>

      <button
        className="mw-btn primary full"
        style={{ marginTop: 12 }}
        onClick={handleSaveReadings}
        disabled={readingsSaving}
      >
        {readingsSaving ? 'Saving…' : 'Save Readings'}
      </button>
      {readingsMsg && (
        <div style={{ textAlign: 'center', fontSize: 12, marginTop: 6, color: readingsMsg.startsWith('Error') ? 'var(--text-danger)' : 'var(--text-success)' }}>
          {readingsMsg}
        </div>
      )}

      {/* Top-3 risks */}
      <div className="mw-section-title" style={{ marginTop: 20 }}>Top-3 risks</div>
      <div className="mw-card" style={{ padding: '4px 16px 12px' }}>
        {[1, 2, 3].map(ord => {
          const risk = risksMap.get(ord) ?? { severity: 'medium', text: '' };
          return (
            <div key={ord} style={{ padding: '10px 0', borderBottom: ord < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 18 }}>#{ord}</span>
                <select
                  value={risk.severity}
                  onChange={e => handleRiskChange(ord, 'severity', e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '3px 6px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                >
                  {SEVERITIES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                className="mw-input"
                placeholder={`Risk #${ord} description…`}
                value={risk.text}
                onChange={e => handleRiskChange(ord, 'text', e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          );
        })}
      </div>

      <button
        className="mw-btn primary full"
        style={{ marginTop: 12, marginBottom: 32 }}
        onClick={handleSaveRisks}
        disabled={risksSaving}
      >
        {risksSaving ? 'Saving…' : 'Save Risks'}
      </button>
      {risksMsg && (
        <div style={{ textAlign: 'center', fontSize: 12, marginTop: -20, marginBottom: 20, color: risksMsg.startsWith('Error') ? 'var(--text-danger)' : 'var(--text-success)' }}>
          {risksMsg}
        </div>
      )}

    </Phone>
  );
}
