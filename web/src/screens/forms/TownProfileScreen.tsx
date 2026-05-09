import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, NumberField } from './fields';
import {
  useZones,
  useTownProfiles,
  useCreateTownProfile,
  useUpdateTownProfile,
  type TownProfile,
  type Zone,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Draft = {
  language_primary: string;
  language_secondary: string;
  religion_primary: string;
  religion_mix_notes: string;
  prior_crusade_year: number | '';
  prior_crusade_notes: string;
  key_contacts: string;
  notes: string;
};

const draftFromProfile = (p: TownProfile | null): Draft => ({
  language_primary: p?.language_primary ?? '',
  language_secondary: p?.language_secondary ?? '',
  religion_primary: p?.religion_primary ?? '',
  religion_mix_notes: p?.religion_mix_notes ?? '',
  prior_crusade_year: p?.prior_crusade_year ?? '',
  prior_crusade_notes: p?.prior_crusade_notes ?? '',
  key_contacts: p?.key_contacts ?? '',
  notes: p?.notes ?? '',
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

export function TownProfileScreen() {
  const navigate = useNavigate();
  const { data: zones, isLoading: zonesLoading, isError: zonesError, refetch: refetchZones } = useZones();
  const { data: profiles, isLoading: profilesLoading } = useTownProfiles();
  const createMutation = useCreateTownProfile();
  const updateMutation = useUpdateTownProfile();

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [draft, setDraft] = useState<Draft>(draftFromProfile(null));
  const [saveError, setSaveError] = useState<string | null>(null);

  const profileByZone = useMemo(
    () => new Map((profiles ?? []).map((p) => [p.zone_id, p] as const)),
    [profiles],
  );

  const profiledCount = (profiles ?? []).length;
  const totalZones = (zones ?? []).length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openEditor = (zone: Zone) => {
    const existing = profileByZone.get(zone.id) ?? null;
    setEditingZone(zone);
    setDraft(draftFromProfile(existing));
    setSaveError(null);
  };

  const closeEditor = () => {
    setEditingZone(null);
    setDraft(draftFromProfile(null));
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingZone) return;
    setSaveError(null);

    const payload = {
      language_primary: draft.language_primary.trim() || null,
      language_secondary: draft.language_secondary.trim() || null,
      religion_primary: draft.religion_primary.trim() || null,
      religion_mix_notes: draft.religion_mix_notes.trim() || null,
      prior_crusade_year: draft.prior_crusade_year === '' ? null : Number(draft.prior_crusade_year),
      prior_crusade_notes: draft.prior_crusade_notes.trim() || null,
      key_contacts: draft.key_contacts.trim() || null,
      notes: draft.notes.trim() || null,
    };

    try {
      const existing = profileByZone.get(editingZone.id) ?? null;
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, body: payload });
      } else {
        await createMutation.mutateAsync({ zone_id: editingZone.id, ...payload });
      }
      closeEditor();
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  if (zonesError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Town <em>Profile</em></>}
          pillar="A·all"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Couldn't load zones.</span>
            <button type="button" onClick={() => refetchZones()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
          </div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (zonesLoading || profilesLoading || !zones) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Town <em>Profile</em></>}
          pillar="A·all"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Town <em>Profile</em></>}
        pillar="A·all"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{profiledCount}</div>
            <div className="lbl">of {totalZones} zones profiled</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {zones.length === 0 ? (
            <div className="empty">No zones yet.</div>
          ) : (
            zones.map((z) => {
              const existing = profileByZone.get(z.id);
              return (
                <button
                  key={z.id}
                  type="button"
                  className="form-list-row"
                  onClick={() => openEditor(z)}
                  style={{ background: 'transparent', border: 0, padding: '14px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                >
                  <div>
                    <div className="name">{z.name ?? z.code}</div>
                    <div className="sub">
                      {existing
                        ? `${existing.language_primary ?? '—'} · ${existing.religion_primary ?? '—'}`
                        : 'No profile yet'}
                    </div>
                  </div>
                  <div className="right">
                    <div className={'status ' + (existing ? 'confirmed' : 'pending')}>
                      {existing ? 'Profiled' : 'Pending'}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {editingZone && (
          <div className="inline-form" style={{ marginTop: 24 }}>
            <div style={{ padding: '0 20px 12px', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>
              Editing — {editingZone.name ?? editingZone.code}
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Primary language" placeholder="e.g. Wala" value={draft.language_primary} onChange={(v) => setDraft({ ...draft, language_primary: v })}/>
              <TextField label="Secondary language" placeholder="optional" value={draft.language_secondary} onChange={(v) => setDraft({ ...draft, language_secondary: v })}/>
              <TextField label="Primary religion" placeholder="e.g. Christian / Muslim / Mixed" value={draft.religion_primary} onChange={(v) => setDraft({ ...draft, religion_primary: v })}/>
              <TextareaField label="Religion mix notes" value={draft.religion_mix_notes} onChange={(v) => setDraft({ ...draft, religion_mix_notes: v })}/>
              <NumberField label="Prior crusade year" value={draft.prior_crusade_year} onChange={(v) => setDraft({ ...draft, prior_crusade_year: v })}/>
              <TextareaField label="Prior crusade notes" value={draft.prior_crusade_notes} onChange={(v) => setDraft({ ...draft, prior_crusade_notes: v })}/>
              <TextareaField label="Key contacts" value={draft.key_contacts} onChange={(v) => setDraft({ ...draft, key_contacts: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>

            {saveError && (
              <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>
            )}

            <div className="row">
              <button type="button" className="btn" onClick={closeEditor}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
