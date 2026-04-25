// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, TopBar, MobileIcon as Icon } from '../../components/MobileShell';
import { usePowers, useCrusade, useCreateActivityEntry } from '../../api/hooks';

export function QuickLogMobile() {
  const nav = useNavigate();
  const [description, setDescription] = useState('');
  const [powerCode, setPowerCode] = useState<string | null>(null);

  const { data: powers = [] } = usePowers();
  const { data: crusade } = useCrusade();
  const createMutation = useCreateActivityEntry();

  async function handleSubmit() {
    if (!crusade || !powerCode || !description.trim()) return;
    await createMutation.mutateAsync({
      crusade_id: crusade.id,
      occurred_at: new Date().toISOString(),
      description: description.trim(),
      power_code: powerCode,
      status: 'done',
    });
    nav(-1);
  }

  const canSubmit = description.trim() !== '' && powerCode !== null;

  return (
    <Phone
      active="log"
      top={<TopBar back title="Quick log" />}
    >
      {/* What happened textarea */}
      <div style={{ marginBottom: 16 }}>
        <div
          className="mw-section-title"
          style={{ margin: '0 2px 8px' }}
        >
          What happened?
        </div>
        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the activity…"
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1.5px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Power picker chips */}
      <div style={{ marginBottom: 24 }}>
        <div
          className="mw-section-title"
          style={{ margin: '0 2px 10px' }}
        >
          Select a power
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {powers.map((power) => {
            const active = powerCode === power.code;
            return (
              <button
                key={power.code}
                onClick={() => setPowerCode(active ? null : power.code)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: active
                    ? '1.5px solid var(--text-info)'
                    : '1.5px solid var(--border)',
                  background: active ? 'var(--bg-info)' : 'var(--bg-card)',
                  color: active ? 'var(--text-info)' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {power.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline error */}
      {createMutation.isError && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--bg-danger)',
            color: 'var(--text-danger)',
            fontSize: 13,
          }}
        >
          Failed to save. Please try again.
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || createMutation.isPending}
        style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 14,
          border: 'none',
          background: canSubmit ? 'var(--text-info)' : 'var(--border)',
          color: canSubmit ? 'white' : 'var(--text-secondary)',
          fontSize: 15,
          fontWeight: 600,
          cursor: canSubmit && !createMutation.isPending ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s',
          fontFamily: 'inherit',
        }}
      >
        {createMutation.isPending ? 'Saving…' : 'Save log'}
      </button>
    </Phone>
  );
}
