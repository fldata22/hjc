import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, NumberField, SelectField } from './fields';
import {
  useCrusade,
  usePublicityAssets,
  useCreatePublicityAsset,
  useUpdatePublicityAsset,
  useDeletePublicityAsset,
  type PublicityAsset,
  type PublicityKind,
  type PublicityStatus,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { InlineSheet } from './InlineSheet';
import './forms.css';

const KINDS: Array<{ value: PublicityKind; label: string }> = [
  { value: 'radio_spot', label: 'Radio spot' },
  { value: 'poster', label: 'Poster' },
  { value: 'billboard', label: 'Billboard' },
  { value: 'social_post', label: 'Social post' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'banner', label: 'Banner' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
];

const STATUSES: Array<{ value: PublicityStatus; label: string }> = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_production', label: 'In production' },
  { value: 'produced', label: 'Produced' },
  { value: 'deployed', label: 'Deployed' },
];

const STATUS_CLASS: Record<PublicityStatus, string> = {
  planned: 'pending',
  in_production: 'pending',
  produced: 'pending',
  deployed: 'confirmed',
};

type Draft = {
  kind: PublicityKind | '';
  title: string;
  quantity: number | '';
  notes: string;
};

const emptyDraft: Draft = { kind: '', title: '', quantity: '', notes: '' };

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

export function PublicityAssetsScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: assets, isLoading, isError, refetch } = usePublicityAssets();
  const createMutation = useCreatePublicityAsset();
  const updateMutation = useUpdatePublicityAsset();
  const deleteMutation = useDeletePublicityAsset();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => assets ?? [], [assets]);
  const deployedCount = list.filter((a) => a.status === 'deployed').length;

  const advanceStatus = (s: PublicityStatus): PublicityStatus =>
    s === 'planned' ? 'in_production' :
    s === 'in_production' ? 'produced' :
    s === 'produced' ? 'deployed' : 'planned';

  const handleAdd = async () => {
    if (!crusade || draft.kind === '' || draft.title.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        kind: draft.kind,
        title: draft.title.trim(),
        quantity: draft.quantity === '' ? null : Number(draft.quantity),
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleStatusClick = (a: PublicityAsset) => {
    if (updateMutation.isPending) return;
    const next = advanceStatus(a.status);
    const body: Parameters<typeof updateMutation.mutate>[0]['body'] = { status: next };
    if (next === 'produced' && !a.produced_on) {
      body.produced_on = new Date().toISOString().slice(0, 10);
    }
    if (next === 'deployed' && !a.deployed_on) {
      body.deployed_on = new Date().toISOString().slice(0, 10);
    }
    updateMutation.mutate({ id: a.id, body });
  };

  const handleDelete = (a: PublicityAsset) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete "${a.title}"?`)) return;
    deleteMutation.mutate(a.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Publicity & <em>Video</em></>} pillar="A·all" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Publicity & <em>Video</em></>} pillar="A·all" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Publicity & <em>Video</em></>} pillar="A·all" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{deployedCount}</div>
            <div className="lbl">of {list.length} deployed</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load assets.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No campaign assets yet.</div>
          ) : (
            list.map((a) => {
              const kindLabel = KINDS.find((k) => k.value === a.kind)?.label ?? a.kind;
              const statusLabel = STATUSES.find((s) => s.value === a.status)?.label;
              return (
                <div key={a.id} className="form-list-row">
                  <div>
                    <div className="name">{a.title}</div>
                    <div className="sub">
                      {kindLabel}{a.quantity != null ? ` · qty ${a.quantity.toLocaleString()}` : ''}
                      {a.deployed_on ? ` · deployed ${a.deployed_on}` : a.produced_on ? ` · produced ${a.produced_on}` : ''}
                    </div>
                  </div>
                  <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleStatusClick(a)}
                      className={'status ' + STATUS_CLASS[a.status]}
                      style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                      aria-label="Advance status"
                    >
                      {statusLabel}
                    </button>
                    <button type="button" onClick={() => handleDelete(a)} aria-label="Delete" style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}>×</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => setShowForm(true)}
        >
          Add asset
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <SelectField
              label="Kind"
              required
              options={KINDS}
              value={draft.kind}
              onChange={(v) => setDraft({ ...draft, kind: v as PublicityKind | '' })}
              placeholder="Select…"
            />
            <TextField label="Title" required placeholder="e.g. Crusade Wa-Central A2 poster" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })}/>
            <NumberField label="Quantity" suffix="units" value={draft.quantity} onChange={(v) => setDraft({ ...draft, quantity: v })}/>
            <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setSaveError(null); }}>Clear</button>
            <button
              type="button"
              className="btn primary"
              onClick={handleAdd}
              disabled={createMutation.isPending || draft.kind === '' || draft.title.trim() === ''}
            >
              {createMutation.isPending ? 'Saving…' : 'Add asset'}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
