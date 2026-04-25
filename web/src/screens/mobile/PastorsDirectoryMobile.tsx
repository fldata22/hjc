// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, TopBar, MobileIcon as Icon } from '../../components/MobileShell';
import { usePastors, usePastorStageCounts } from '../../api/hooks';

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

const STAGE_DOT: Record<string, string> = {
  champion: '#639922',
  active: '#639922',
  committed: '#0C447C',
  engaged: '#EF9F27',
  identified: '#B4B2A9',
};

const STAGE_LABEL: Record<string, string> = {
  identified: 'Identified',
  engaged: 'Engaged',
  committed: 'Committed',
  active: 'Active',
  champion: 'Champion',
};

const STAGES = ['identified', 'engaged', 'committed', 'active', 'champion'] as const;

export function PastorsDirectoryMobile() {
  const [q, setQ] = useState('');
  const [pipelineStage, setPipelineStage] = useState<string | null>(null);

  const { data: pastorsResp, isLoading } = usePastors({
    q: q || undefined,
    pipeline_stage: pipelineStage || undefined,
  });

  const { data: stageCounts } = usePastorStageCounts();

  const pastors = pastorsResp?.data ?? [];
  const total = stageCounts?.total ?? pastorsResp?.meta?.total ?? 0;

  return (
    <Phone
      active="pastors"
      top={
        <TopBar
          eyebrow="Crusade"
          title="Pastors"
          right={
            <button className="mw-iconbtn">
              <Icon name="search" size={19} />
            </button>
          }
        />
      }
    >
      {/* Search row */}
      <div className="mw-search" style={{ margin: '12px 16px 0' }}>
        <Icon name="search" size={15} />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, church, phone…"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Filter chips */}
      <div className="mw-filterbar" style={{ padding: '10px 0 12px' }}>
        <div
          className={`mw-chip${pipelineStage === null ? ' active' : ''}`}
          onClick={() => setPipelineStage(null)}
        >
          All {total > 0 && <span style={{ marginLeft: 3, opacity: 0.7 }}>{total}</span>}
        </div>
        {STAGES.map(stage => (
          <div
            key={stage}
            className={`mw-chip${pipelineStage === stage ? ' active' : ''}`}
            onClick={() => setPipelineStage(pipelineStage === stage ? null : stage)}
          >
            {STAGE_LABEL[stage]}
            {stageCounts?.[stage] != null && (
              <span style={{ marginLeft: 3, opacity: 0.7 }}>{stageCounts[stage]}</span>
            )}
          </div>
        ))}
      </div>

      {/* Pastor list */}
      <div className="mw-rowlist">
        {isLoading && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!isLoading && pastors.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No pastors found.
          </div>
        )}

        {pastors.map(pastor => (
          <Link
            key={pastor.id}
            to={`/m/pastors/${pastor.id}`}
            className="row"
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}
          >
            {/* Avatar */}
            <div
              className="mw-avatar"
              style={{ background: avatarBg(pastor.full_name), color: '#fff', flexShrink: 0 }}
            >
              {initials(pastor.full_name)}
            </div>

            {/* Name + church */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="title"
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {pastor.full_name}
              </div>
              {pastor.church_id != null && (
                <div className="sub">Church #{pastor.church_id}</div>
              )}
            </div>

            {/* Status dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: STAGE_DOT[pastor.pipeline_stage] ?? '#B4B2A9',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {STAGE_LABEL[pastor.pipeline_stage] ?? pastor.pipeline_stage}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Phone>
  );
}
