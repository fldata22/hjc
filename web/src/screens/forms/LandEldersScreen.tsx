import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, PhoneField, SegmentedField } from './fields';
import {
  useCrusade,
  useLandElders,
  useCreateLandElder,
  useUpdateLandElder,
  useDeleteLandElder,
  type LandElderStatus,
  type LandElder,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

const STATUSES: Array<{ value: LandElderStatus; label: string }> = [
  { value: 'identified', label: 'Identified' },
  { value: 'courted', label: 'Courted' },
  { value: 'blessed', label: 'Blessed' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'opposed', label: 'Opposed' },
];

const STATUS_CLASS: Record<LandElderStatus, string> = {
  identified: 'pending',
  courted: 'pending',
  blessed: 'confirmed',
  neutral: 'pending',
  opposed: 'declined',
};

type Draft = {
  name: string;
  title: string;
  region: string;
  phone: string;
  email: string;
  status: LandElderStatus;
  notes: string;
};

const emptyDraft: Draft = { name: '', title: '', region: '', phone: '', email: '', status: 'identified', notes: '' };

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

export function LandEldersScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: elders, isLoading, isError, refetch } = useLandElders();
  const createMutation = useCreateLandElder();
  const updateMutation = useUpdateLandElder();
  const deleteMutation = useDeleteLandElder();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => elders ?? [], [elders]);
  const blessedCount = list.filter((e) => e.status === 'blessed').length;
  const opposedCount = list.filter((e) => e.status === 'opposed').length;

  const advanceStatus = (s: LandElderStatus): LandElderStatus =>
    s === 'identified' ? 'courted' :
    s === 'courted' ? 'blessed' : s;

  const handleAdd = async () => {
    if (!crusade || draft.name.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        name: draft.name.trim(),
        title: draft.title.trim() || null,
        region: draft.region.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        status: draft.status,
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleStatusClick = (e: LandElder) => {
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: e.id, body: { status: advanceStatus(e.status) } });
  };

  const handleDelete = (e: LandElder) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete "${e.name}"?`)) return;
    deleteMutation.mutate(e.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Fathers of the <em>Land</em></>} pillar="P2" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Fathers of the <em>Land</em></>} pillar="P2" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Fathers of the <em>Land</em></>} pillar="P2" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{blessedCount}</div>
            <div className="lbl">of {list.length} blessed</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            {opposedCount > 0 && (
              <div className="lbl"><b style={{ color: 'var(--accent)' }}>{opposedCount}</b> opposed</div>
            )}
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load elders.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No land elders identified yet.</div>
          ) : (
            list.map((e) => (
              <div key={e.id} className="form-list-row">
                <div>
                  <div className="name">{e.title ? `${e.title} ` : ''}{e.name}</div>
                  <div className="sub">{e.region ?? '—'}{e.phone ? ` · ${e.phone}` : ''}</div>
                </div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleStatusClick(e)}
                    className={'status ' + STATUS_CLASS[e.status]}
                    style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                    aria-label="Advance status"
                  >
                    {STATUSES.find((s) => s.value === e.status)?.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e)}
                    aria-label="Delete elder"
                    style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => {
            if (showForm) {
              setDraft(emptyDraft);
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : 'Add elder'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Name" required placeholder="e.g. Yagbon-Wura" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })}/>
              <TextField label="Title" placeholder="e.g. Naa, Chief, Tindana, Elder" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })}/>
              <TextField label="Region / area" placeholder="e.g. Wa Central" value={draft.region} onChange={(v) => setDraft({ ...draft, region: v })}/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })}/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
              <SegmentedField
                label="Status"
                required
                options={STATUSES}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as LandElderStatus })}
              />
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>

            {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setSaveError(null); }}>Clear</button>
              <button
                type="button"
                className="btn primary"
                onClick={handleAdd}
                disabled={createMutation.isPending || draft.name.trim() === ''}
              >
                {createMutation.isPending ? 'Saving…' : 'Add elder'}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
