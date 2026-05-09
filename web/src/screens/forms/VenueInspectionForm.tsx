import { type ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, DateField } from './fields';
import {
  useCrusade,
  useVenueInspections,
  useCreateVenueInspection,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { compressImage } from '../../lib/imageCompress';
import { ReceiptModal } from './ReceiptModal';
import { todayISO } from '../../lib/dateHelpers';
import { useToast } from '../../lib/toast-context';
import './forms.css';

type Draft = {
  inspected_at: string;
  inspector_name: string;
  capacity_verified: boolean;
  exits_clear: boolean;
  power_tested: boolean;
  sound_tested: boolean;
  permits_status: string;
  notes: string;
  photoPreview: string | null;
  photoBlob: Blob | null;
};

const emptyDraft = (date: string): Draft => ({
  inspected_at: date,
  inspector_name: '',
  capacity_verified: false,
  exits_clear: false,
  power_tested: false,
  sound_tested: false,
  permits_status: '',
  notes: '',
  photoPreview: null,
  photoBlob: null,
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

const CHECKS: Array<{ key: 'capacity_verified' | 'exits_clear' | 'power_tested' | 'sound_tested'; label: string }> = [
  { key: 'capacity_verified', label: 'Capacity verified' },
  { key: 'exits_clear', label: 'Exits clear' },
  { key: 'power_tested', label: 'Power tested' },
  { key: 'sound_tested', label: 'Sound tested' },
];

export function VenueInspectionForm() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError, refetch: refetchCrusade } = useCrusade();
  const { data: inspections, isLoading: inspectionsLoading, isError: inspectionsError, refetch: refetchList } = useVenueInspections();
  const createMutation = useCreateVenueInspection();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(todayISO()));
  const [capturing, setCapturing] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = inspections ?? [];

  const canSave =
    !!crusade &&
    draft.inspector_name.trim() !== '' &&
    draft.inspected_at !== '' &&
    !createMutation.isPending;

  const toggleCheck = (key: typeof CHECKS[number]['key']) => {
    setDraft((d) => ({ ...d, [key]: !d[key] }));
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCapturing(true);
    try {
      const { blob, dataUrl } = await compressImage(file);
      setDraft((d) => ({ ...d, photoPreview: dataUrl, photoBlob: blob }));
    } catch (err) {
      console.error('Photo compression failed:', err);
      toast.show('Could not load that image. Try a different file.', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || !crusade) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        inspected_at: draft.inspected_at,
        inspector_name: draft.inspector_name.trim(),
        capacity_verified: draft.capacity_verified,
        exits_clear: draft.exits_clear,
        power_tested: draft.power_tested,
        sound_tested: draft.sound_tested,
        permits_status: draft.permits_status.trim() || null,
        notes: draft.notes.trim() || null,
        photo: draft.photoBlob,
      });
      setDraft(emptyDraft(todayISO()));
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Venue <em>Inspection</em></>}
          pillar="V10"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Couldn't load crusade.</span>
            <button type="button" onClick={() => refetchCrusade()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
          </div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Venue <em>Inspection</em></>}
          pillar="V10"
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
        title={<>Venue <em>Inspection</em></>}
        pillar="V10"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{list.length}</div>
            <div className="lbl">inspections logged</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {inspectionsError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load inspections.</span>
              <button type="button" onClick={() => refetchList()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : inspectionsLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No inspections logged yet.</div>
          ) : (
            list.map((i) => {
              const checks = [
                i.capacity_verified ? 'capacity' : null,
                i.exits_clear ? 'exits' : null,
                i.power_tested ? 'power' : null,
                i.sound_tested ? 'sound' : null,
              ].filter(Boolean);
              const total = 4;
              return (
                <div key={i.id} className="form-list-row">
                  <div>
                    <div className="name">{i.inspected_at}</div>
                    <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{i.inspector_name}</span>
                      <span>·</span>
                      <span>{checks.length}/{total} checks</span>
                      {i.photo_url && (
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setOpenPhoto(i.photo_url); }}
                          style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                          aria-label="View inspection photo"
                        >
                          📷
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="right">
                    <div className={'status ' + (checks.length === total ? 'confirmed' : 'pending')}>
                      {checks.length === total ? 'All clear' : 'Partial'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => {
            if (showForm) {
              setDraft(emptyDraft(todayISO()));
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : 'Add inspection'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Inspected on" value={draft.inspected_at} onChange={(v) => setDraft({ ...draft, inspected_at: v })} required/>
              <TextField label="Inspector name" placeholder="e.g. Director Adebimpe" value={draft.inspector_name} onChange={(v) => setDraft({ ...draft, inspector_name: v })} required/>

              <div className="field">
                <div className="lbl"><span>Checks</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {CHECKS.map((c) => (
                    <label
                      key={c.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        border: '1px solid var(--line)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        background: draft[c.key] ? 'var(--bg-2)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={draft[c.key]}
                        onChange={() => toggleCheck(c.key)}
                        style={{ margin: 0 }}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <TextareaField label="Permits status" placeholder="e.g. Police: approved, Fire: pending, City: approved" value={draft.permits_status} onChange={(v) => setDraft({ ...draft, permits_status: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>

            <div style={{ padding: '12px 0' }}>
              {draft.photoPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={draft.photoPreview}
                    alt="Inspection preview"
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, photoPreview: null, photoBlob: null }))}
                    style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label style={{ display: 'inline-block', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                    disabled={capturing}
                  />
                  {capturing ? 'Processing…' : '+ Add photo'}
                </label>
              )}
            </div>

            {saveError && (
              <div className="field-error" style={{ margin: '4px 0' }}>{saveError}</div>
            )}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft(todayISO())); setSaveError(null); }}>Clear</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>
                {createMutation.isPending ? 'Saving…' : 'Save inspection'}
              </button>
            </div>
          </div>
        )}

        {openPhoto && <ReceiptModal photo={openPhoto} onClose={() => setOpenPhoto(null)}/>}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
