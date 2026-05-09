import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, NumberField, SegmentedField } from './fields';
import { useSoundLightingPlan, useUpsertSoundLightingPlan, type SoundLightingPlan } from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Draft = {
  sound_provider: string;
  sound_capacity_notes: string;
  lighting_provider: string;
  lighting_setup_notes: string;
  generator_provider: string;
  generator_kva: number | '';
  has_backup_power: boolean;
  power_notes: string;
  equipment_notes: string;
};

const draftFromPlan = (p: SoundLightingPlan | null): Draft => ({
  sound_provider: p?.sound_provider ?? '',
  sound_capacity_notes: p?.sound_capacity_notes ?? '',
  lighting_provider: p?.lighting_provider ?? '',
  lighting_setup_notes: p?.lighting_setup_notes ?? '',
  generator_provider: p?.generator_provider ?? '',
  generator_kva: p?.generator_kva ?? '',
  has_backup_power: p?.has_backup_power ?? false,
  power_notes: p?.power_notes ?? '',
  equipment_notes: p?.equipment_notes ?? '',
});

function extractApiMessage(e: unknown, fallback = 'Failed'): string {
  if (e instanceof ApiError) {
    const body = e.body;
    if (body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') {
      return (body as { message: string }).message;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export function SoundLightingScreen() {
  const navigate = useNavigate();
  const { data: plan, isLoading, isError, refetch } = useSoundLightingPlan();
  const upsertMutation = useUpsertSoundLightingPlan();

  const [draft, setDraft] = useState<Draft>(draftFromPlan(null));
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (hasHydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(draftFromPlan(plan ?? null));
    setHasHydrated(true);
  }, [plan, isLoading, hasHydrated]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveOk(null);
    try {
      await upsertMutation.mutateAsync({
        sound_provider: draft.sound_provider.trim() || null,
        sound_capacity_notes: draft.sound_capacity_notes.trim() || null,
        lighting_provider: draft.lighting_provider.trim() || null,
        lighting_setup_notes: draft.lighting_setup_notes.trim() || null,
        generator_provider: draft.generator_provider.trim() || null,
        generator_kva: draft.generator_kva === '' ? null : Number(draft.generator_kva),
        has_backup_power: draft.has_backup_power,
        power_notes: draft.power_notes.trim() || null,
        equipment_notes: draft.equipment_notes.trim() || null,
      });
      setSaveOk('Saved.');
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  if (isError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Sound & <em>Lighting</em></>} pillar="V12" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Couldn't load plan.</span>
            <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
          </div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (isLoading || !hasHydrated) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Sound & <em>Lighting</em></>} pillar="V12" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Sound & <em>Lighting</em></>} pillar="V12" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 8px', borderBottom: '1px solid var(--line)' }}>
            Sound
          </div>
          <div className="fields" style={{ padding: '12px 0' }}>
            <TextField label="Sound provider" placeholder="e.g. Acme Sound Co" value={draft.sound_provider} onChange={(v) => setDraft({ ...draft, sound_provider: v })}/>
            <TextareaField label="Capacity notes" placeholder="e.g. 30kW main system, coverage 200m radius" value={draft.sound_capacity_notes} onChange={(v) => setDraft({ ...draft, sound_capacity_notes: v })}/>
          </div>

          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 8px', borderBottom: '1px solid var(--line)' }}>
            Lighting
          </div>
          <div className="fields" style={{ padding: '12px 0' }}>
            <TextField label="Lighting provider" placeholder="optional" value={draft.lighting_provider} onChange={(v) => setDraft({ ...draft, lighting_provider: v })}/>
            <TextareaField label="Setup notes" value={draft.lighting_setup_notes} onChange={(v) => setDraft({ ...draft, lighting_setup_notes: v })}/>
          </div>

          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 8px', borderBottom: '1px solid var(--line)' }}>
            Power
          </div>
          <div className="fields" style={{ padding: '12px 0' }}>
            <TextField label="Generator provider" value={draft.generator_provider} onChange={(v) => setDraft({ ...draft, generator_provider: v })}/>
            <NumberField label="Generator kVA" suffix="kVA" value={draft.generator_kva} onChange={(v) => setDraft({ ...draft, generator_kva: v })}/>
            <SegmentedField
              label="Backup power"
              options={[
                { value: 'no', label: 'None' },
                { value: 'yes', label: 'Backup ready' },
              ]}
              value={draft.has_backup_power ? 'yes' : 'no'}
              onChange={(v) => setDraft({ ...draft, has_backup_power: v === 'yes' })}
            />
            <TextareaField label="Power notes" value={draft.power_notes} onChange={(v) => setDraft({ ...draft, power_notes: v })}/>
          </div>

          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 8px', borderBottom: '1px solid var(--line)' }}>
            Equipment
          </div>
          <div className="fields" style={{ padding: '12px 0' }}>
            <TextareaField label="Equipment notes" placeholder="Free-form list: mics, mixers, monitors, cables, stands…" value={draft.equipment_notes} onChange={(v) => setDraft({ ...draft, equipment_notes: v })}/>
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}
          {saveOk && <div style={{ margin: '8px 0', fontSize: 12, color: 'var(--ok, #2a8c4a)' }}>{saveOk}</div>}

          <div className="row">
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? 'Saving…' : 'Save plan'}
            </button>
          </div>
        </div>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
