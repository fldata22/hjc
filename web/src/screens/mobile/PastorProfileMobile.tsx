// @ts-nocheck
import React from 'react';
import { useParams } from 'react-router-dom';
import { Phone, TopBar, MobileIcon as Icon } from '../../components/MobileShell';
import { usePastor } from '../../api/hooks';

const EARTH_TONES = [
  '#7B6E5D', '#5C7A5A', '#7A5C5C', '#5C6B7A', '#7A6B5C',
  '#6B7A5C', '#5C7A6B', '#7A5C6B', '#6B5C7A', '#5C7A7A',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return EARTH_TONES[hash % EARTH_TONES.length];
}

const STAGES = ['identified', 'engaged', 'committed', 'active', 'champion'] as const;
type Stage = typeof STAGES[number];

const STAGE_LABEL: Record<Stage, string> = {
  identified: 'Identified',
  engaged: 'Engaged',
  committed: 'Committed',
  active: 'Active',
  champion: 'Champion',
};

const STAGE_SHORT: Record<Stage, string> = {
  identified: 'Idnt',
  engaged: 'Engd',
  committed: 'Cmtd',
  active: 'Actv',
  champion: 'Chmp',
};

export function PastorProfileMobile() {
  const { id } = useParams<{ id: string }>();
  const { data: pastor, isLoading } = usePastor(id);

  if (isLoading || !pastor) {
    return (
      <Phone
        active="pastors"
        top={<TopBar back title="Pastor" eyebrow="Pastor" />}
      >
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Loading…
        </div>
      </Phone>
    );
  }

  const currentStageIndex = STAGES.indexOf(pastor.pipeline_stage as Stage);
  const bg = avatarBg(pastor.full_name);
  const ini = initials(pastor.full_name);

  const identifications: any[] = pastor.identifications ?? [];
  const pledgeTotals: Record<string, string> = pastor.pledge_totals ?? {};
  const pledgeRows = Object.entries(pledgeTotals).filter(([, qty]) => {
    const n = parseFloat(qty as string);
    return !isNaN(n) && n > 0;
  });

  return (
    <Phone
      active="pastors"
      top={
        <TopBar
          back
          title={pastor.full_name}
          eyebrow="Pastor"
          right={
            <>
              <button className="mw-iconbtn"><Icon name="share" size={19} /></button>
              <button className="mw-iconbtn"><Icon name="more" size={20} /></button>
            </>
          }
        />
      }
    >
      {/* Hero block */}
      <div style={{ padding: '18px 14px 14px', background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)' }}>
        <div className="mw-row" style={{ gap: 14 }}>
          <div
            className="mw-avatar lg"
            style={{ background: bg, color: '#fff', flexShrink: 0 }}
          >
            {ini}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{pastor.full_name}</div>
            {pastor.church_id != null && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Church #{pastor.church_id}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {[
                pastor.pipeline_stage ? STAGE_LABEL[pastor.pipeline_stage as Stage] ?? pastor.pipeline_stage : null,
                pastor.pastor_since ? `since ${pastor.pastor_since}` : null,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="mw-row" style={{ gap: 8, marginTop: 14 }}>
          {pastor.phone ? (
            <a
              href={`tel:${pastor.phone}`}
              className="mw-btn"
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            >
              <Icon name="phone" size={14} />Call
            </a>
          ) : (
            <button className="mw-btn" disabled style={{ flex: 1, justifyContent: 'center', opacity: 0.4 }}>
              <Icon name="phone" size={14} />Call
            </button>
          )}
          {pastor.email ? (
            <a
              href={`mailto:${pastor.email}`}
              className="mw-btn"
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            >
              <Icon name="mail" size={14} />Message
            </a>
          ) : (
            <button className="mw-btn" disabled style={{ flex: 1, justifyContent: 'center', opacity: 0.4 }}>
              <Icon name="mail" size={14} />Message
            </button>
          )}
          <button className="mw-btn" style={{ flex: 1, justifyContent: 'center' }}>
            <Icon name="edit" size={14} />Edit
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 14px 90px' }}>
        {/* Pipeline pill row */}
        <div className="mw-card" style={{ marginBottom: 14 }}>
          <div className="mw-eyebrow">Status pipeline</div>
          <div className="mw-pipeline" style={{ marginTop: 6 }}>
            {STAGES.map((s, i) => (
              <React.Fragment key={s}>
                <div className="mw-pip">
                  <div
                    className={`mw-pip-dot ${i < currentStageIndex ? 'done' : i === currentStageIndex ? 'current' : ''}`}
                  />
                  <div className="mw-pip-lbl">{STAGE_SHORT[s]}</div>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`mw-pip-line ${i < currentStageIndex ? 'done' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Contact info */}
        {(pastor.phone || pastor.email || pastor.address) && (
          <>
            <div className="mw-section-title"><span>Contact</span></div>
            <div className="mw-card" style={{ padding: '4px 14px', marginBottom: 14 }}>
              {pastor.phone && (
                <div className="mw-row" style={{ gap: 12, padding: '10px 0', borderBottom: (pastor.email || pastor.address) ? '0.5px solid var(--border)' : 'none' }}>
                  <Icon name="phone" size={15} />
                  <div style={{ flex: 1, fontSize: 13 }}>{pastor.phone}</div>
                </div>
              )}
              {pastor.email && (
                <div className="mw-row" style={{ gap: 12, padding: '10px 0', borderBottom: pastor.address ? '0.5px solid var(--border)' : 'none' }}>
                  <Icon name="mail" size={15} />
                  <div style={{ flex: 1, fontSize: 13, wordBreak: 'break-all' }}>{pastor.email}</div>
                </div>
              )}
              {pastor.address && (
                <div className="mw-row" style={{ gap: 12, padding: '10px 0' }}>
                  <Icon name="flag" size={15} />
                  <div style={{ flex: 1, fontSize: 13 }}>{pastor.address}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Identifications */}
        {identifications.length > 0 && (
          <>
            <div className="mw-section-title">
              <span>Identifications</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{identifications.length}</span>
            </div>
            <div className="mw-card" style={{ padding: '4px 14px', marginBottom: 14 }}>
              {identifications.map((item: any, i: number) => (
                <div
                  key={item.id ?? i}
                  className="mw-row"
                  style={{ gap: 12, padding: '10px 0', borderBottom: i < identifications.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {item.category ?? item.type ?? 'Identification'}
                    </div>
                    {item.sub_role && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.sub_role}</div>
                    )}
                  </div>
                  {item.assigned_at && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {item.assigned_at}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pledge totals */}
        {pledgeRows.length > 0 && (
          <>
            <div className="mw-section-title"><span>Pledged</span></div>
            <div className="mw-card">
              <div className="mw-col" style={{ gap: 8, fontSize: 13 }}>
                {pledgeRows.map(([resource, qty]) => (
                  <div key={resource} className="mw-row mw-between">
                    <span style={{ textTransform: 'capitalize' }}>{resource.replace(/_/g, ' ')}</span>
                    <b>{qty}</b>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Phone>
  );
}
