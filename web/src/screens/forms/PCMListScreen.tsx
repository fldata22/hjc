import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import {
  type Pastor,
  usePastors,
  useZones,
  useUpdatePastor,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { useToast } from '../../lib/toast-context';
import { TextareaField, DateField, SegmentedField, SelectField } from './fields';
import './forms.css';

type Stage = Pastor['pipeline_stage'];

const STAGES: Array<{ value: Stage; label: string }> = [
  { value: 'identified', label: 'Identified' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'committed', label: 'Committed' },
  { value: 'active', label: 'Active' },
  { value: 'champion', label: 'Champion' },
];

const STAGE_LABEL: Record<Stage, string> = {
  identified: 'Identified',
  engaged: 'Engaged',
  committed: 'Committed',
  active: 'Active',
  champion: 'Champion',
};

const STAGE_CLASS: Record<Stage, string> = {
  identified: 'pending',
  engaged: 'pending',
  committed: 'confirmed',
  active: 'confirmed',
  champion: 'confirmed',
};

const CONFIRMED_STAGES: Stage[] = ['committed', 'active', 'champion'];
const FUNNEL_STAGES: Stage[] = ['identified', 'engaged'];

const advanceStage = (s: Stage): Stage =>
  s === 'identified' ? 'engaged' :
  s === 'engaged' ? 'committed' :
  s === 'committed' ? 'active' :
  s === 'active' ? 'champion' :
  'champion'; // already at top

type EditDraft = {
  pipeline_stage: Stage;
  zone_id: number | '';
  last_contact_at: string;
  notes: string;
};

const editDraftFromPastor = (p: Pastor): EditDraft => ({
  pipeline_stage: p.pipeline_stage,
  zone_id: p.zone_id ?? '',
  last_contact_at: p.last_contact_at ? p.last_contact_at.slice(0, 10) : '',
  // Pastor model doesn't expose `notes` on the type — but the backend update accepts only the fields we send.
  // We use this draft for stage / zone / last contact only; notes are out of scope for this inline editor.
  notes: '',
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

export function PCMListScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: page, isLoading, isError, refetch } = usePastors({ per_page: 50 });
  const { data: zones } = useZones();
  const updateMutation = useUpdatePastor();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const pastors = useMemo(() => page?.data ?? [], [page]);
  const zoneById = useMemo(
    () => new Map((zones ?? []).map((z) => [z.id, z] as const)),
    [zones],
  );
  const zoneOptions = useMemo(
    () => (zones ?? []).map((z) => ({ value: String(z.id), label: z.name ?? z.code })),
    [zones],
  );

  const confirmedCount = pastors.filter((p) => CONFIRMED_STAGES.includes(p.pipeline_stage)).length;
  const funnelCount = pastors.filter((p) => FUNNEL_STAGES.includes(p.pipeline_stage)).length;

  const openEdit = (p: Pastor) => {
    setEditingId(p.id);
    setEditDraft(editDraftFromPastor(p));
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const handleStageClick = async (p: Pastor, ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (updateMutation.isPending) return;
    const next = advanceStage(p.pipeline_stage);
    if (next === p.pipeline_stage) {
      toast.show('Already at champion — top of pipeline.', 'info');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: p.id,
        body: {
          pipeline_stage: next,
          last_contact_at: new Date().toISOString().slice(0, 10),
        },
      });
      toast.show(`${p.full_name} → ${STAGE_LABEL[next]}`, 'success');
    } catch (e) {
      toast.show(extractApiMessage(e), 'error');
    }
  };

  const handleEditSave = async () => {
    if (editingId == null || !editDraft || updateMutation.isPending) return;
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: {
          pipeline_stage: editDraft.pipeline_stage,
          zone_id: typeof editDraft.zone_id === 'number' ? editDraft.zone_id : null,
          last_contact_at: editDraft.last_contact_at || null,
        },
      });
      toast.show('Pastor updated.', 'success');
      closeEdit();
    } catch (e) {
      setEditError(extractApiMessage(e));
    }
  };

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>PCM <em>Primary Committee</em></>}
        pillar="P1"
        primaryAction={{ label: 'Add new PCM', onClick: () => navigate('/forms/pcm/new') }}
      >
        {isError ? (
          <div
            style={{
              padding: '14px 16px',
              margin: '12px 20px',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-soft)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load pastors.</div>
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 999,
                border: '1px solid var(--accent)',
                background: 'transparent',
                color: 'var(--accent)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        ) : pastors.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
            No pastors identified yet.
          </div>
        ) : (
          <>
            <div className="stat-strip">
              <div>
                <div className="num">{confirmedCount}</div>
                <div className="lbl">of {pastors.length} confirmed</div>
              </div>
              <div style={{ flex: 1 }}/>
              <div>
                <div className="lbl"><b>{funnelCount}</b> in funnel</div>
              </div>
            </div>

            <div style={{ padding: '0 20px', fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
              Tap a pastor to edit · tap the stage pill to advance one stage
            </div>

            <div style={{ padding: '0 20px' }}>
              {pastors.map((p) => {
                const zone = p.zone_id != null ? zoneById.get(p.zone_id) : null;
                const zoneLabel = zone?.name ?? zone?.code ?? null;
                const isEditing = editingId === p.id;
                return (
                  <div key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      onClick={() => (isEditing ? closeEdit() : openEdit(p))}
                      className="form-list-row"
                      style={{ background: 'transparent', border: 0, padding: '14px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%', borderBottom: 0 }}
                    >
                      <div>
                        <div className="name">{p.full_name}</div>
                        <div className="sub">{zoneLabel ?? '—'}{p.last_contact_at ? ` · last contact ${p.last_contact_at.slice(0, 10)}` : ''}</div>
                      </div>
                      <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={(ev) => handleStageClick(p, ev)}
                          className={'status ' + STAGE_CLASS[p.pipeline_stage]}
                          style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                          aria-label="Advance stage"
                          disabled={updateMutation.isPending}
                        >
                          {STAGE_LABEL[p.pipeline_stage]}
                        </button>
                        {p.phone && (
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{p.phone}</div>
                        )}
                      </div>
                    </button>

                    {isEditing && editDraft && (
                      <div style={{ padding: '0 0 16px' }}>
                        <div className="fields" style={{ padding: 0 }}>
                          <SegmentedField
                            label="Stage"
                            options={STAGES}
                            value={editDraft.pipeline_stage}
                            onChange={(v) => setEditDraft({ ...editDraft, pipeline_stage: v as Stage })}
                          />
                          <SelectField
                            label="Zone"
                            options={zoneOptions}
                            value={editDraft.zone_id === '' ? '' : String(editDraft.zone_id)}
                            onChange={(v) => setEditDraft({ ...editDraft, zone_id: v === '' ? '' : Number(v) })}
                            placeholder="Optional"
                          />
                          <DateField label="Last contact" value={editDraft.last_contact_at} onChange={(v) => setEditDraft({ ...editDraft, last_contact_at: v })}/>
                          <TextareaField label="Notes (not yet persisted)" value={editDraft.notes} onChange={(v) => setEditDraft({ ...editDraft, notes: v })}/>
                        </div>
                        {editError && <div className="field-error" style={{ marginTop: 8 }}>{editError}</div>}
                        <div className="row">
                          <button type="button" className="btn" onClick={closeEdit}>Cancel</button>
                          <button
                            type="button"
                            className="btn primary"
                            onClick={handleEditSave}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
