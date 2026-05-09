import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, DateField } from './fields';
import {
  useCrusade,
  usePermits,
  useCreatePermit,
  useUpdatePermit,
  useDeletePermit,
  type PermitStatus,
  type Permit,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

const STATUSES: Array<{ value: PermitStatus; label: string }> = [
  { value: 'in_review', label: 'In review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_CLASS: Record<PermitStatus, string> = {
  in_review: 'pending',
  approved: 'confirmed',
  rejected: 'declined',
};

type CreateDraft = {
  name: string;
  agency: string;
  due_on: string;
};

const emptyDraft: CreateDraft = { name: '', agency: '', due_on: '' };

type EditDraft = {
  name: string;
  agency: string;
  due_on: string;
  signed_on: string;
  notes: string;
};

const editDraftFromPermit = (p: Permit): EditDraft => ({
  name: p.name,
  agency: p.agency,
  due_on: p.due_on ?? '',
  signed_on: p.signed_on ?? '',
  notes: p.notes ?? '',
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

export function PermitsScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: permitsResp, isLoading: permitsLoading, isError: permitsError, refetch } = usePermits();
  const createMutation = useCreatePermit();
  const updateMutation = useUpdatePermit();
  const deleteMutation = useDeletePermit();

  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyDraft);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const list = useMemo(() => permitsResp?.data ?? [], [permitsResp]);
  const counts = permitsResp?.meta.status_counts;

  const cycleStatus = (s: PermitStatus): PermitStatus =>
    s === 'in_review' ? 'approved' : s === 'approved' ? 'rejected' : 'in_review';

  const handleCreate = async () => {
    if (!crusade || createDraft.name.trim() === '' || createDraft.agency.trim() === '' || createMutation.isPending) return;
    setCreateError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        name: createDraft.name.trim(),
        agency: createDraft.agency.trim(),
        due_on: createDraft.due_on || null,
      });
      setCreateDraft(emptyDraft);
      setShowCreate(false);
    } catch (e) {
      setCreateError(extractApiMessage(e));
    }
  };

  const handleStatusClick = (p: Permit) => {
    if (updateMutation.isPending) return;
    const next = cycleStatus(p.status);
    const body: Parameters<typeof updateMutation.mutate>[0]['body'] = { status: next };
    if (next === 'approved' && !p.signed_on) {
      body.signed_on = new Date().toISOString().slice(0, 10);
    }
    updateMutation.mutate({ id: p.id, body });
  };

  const handleDelete = (p: Permit) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete permit "${p.name}" (${p.agency})?`)) return;
    deleteMutation.mutate(p.id);
  };

  const openEdit = (p: Permit) => {
    setEditingId(p.id);
    setEditDraft(editDraftFromPermit(p));
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (editingId == null || !editDraft || updateMutation.isPending) return;
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: {
          name: editDraft.name.trim(),
          agency: editDraft.agency.trim(),
          due_on: editDraft.due_on || null,
          signed_on: editDraft.signed_on || null,
          notes: editDraft.notes.trim() || null,
        },
      });
      closeEdit();
    } catch (e) {
      setEditError(extractApiMessage(e));
    }
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Permits <em>Tracker</em></>} pillar="V10" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Permits <em>Tracker</em></>} pillar="V10" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Permits <em>Tracker</em></>} pillar="V10" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{counts?.approved ?? 0}</div>
            <div className="lbl">of {list.length} approved</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{counts?.in_review ?? 0}</b> in review</div>
            {counts?.rejected ? <div className="lbl" style={{ fontSize: 10 }}>{counts.rejected} rejected</div> : null}
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {permitsError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load permits.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : permitsLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No permits tracked yet.</div>
          ) : (
            list.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <div className="form-list-row" style={{ borderBottom: 0 }}>
                    <button
                      type="button"
                      onClick={() => (isEditing ? closeEdit() : openEdit(p))}
                      style={{ flex: 1, background: 'transparent', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <div className="name">{p.name}</div>
                      <div className="sub">
                        {p.agency}
                        {p.due_on ? ` · due ${p.due_on}` : ''}
                        {p.signed_on ? ` · signed ${p.signed_on}` : ''}
                      </div>
                    </button>
                    <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleStatusClick(p)}
                        className={'status ' + STATUS_CLASS[p.status]}
                        style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                        aria-label="Cycle status"
                      >
                        {STATUSES.find((s) => s.value === p.status)?.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        aria-label="Delete permit"
                        style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {isEditing && editDraft && (
                    <div style={{ padding: '8px 0 16px' }}>
                      <div className="fields" style={{ padding: 0 }}>
                        <TextField label="Permit name" required value={editDraft.name} onChange={(v) => setEditDraft({ ...editDraft, name: v })}/>
                        <TextField label="Agency" required value={editDraft.agency} onChange={(v) => setEditDraft({ ...editDraft, agency: v })}/>
                        <DateField label="Due on" value={editDraft.due_on} onChange={(v) => setEditDraft({ ...editDraft, due_on: v })}/>
                        <DateField label="Signed on" value={editDraft.signed_on} onChange={(v) => setEditDraft({ ...editDraft, signed_on: v })}/>
                        <TextareaField label="Notes" value={editDraft.notes} onChange={(v) => setEditDraft({ ...editDraft, notes: v })}/>
                      </div>
                      {editError && <div className="field-error" style={{ marginTop: 8 }}>{editError}</div>}
                      <div className="row">
                        <button type="button" className="btn" onClick={closeEdit}>Cancel</button>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={handleEditSave}
                          disabled={updateMutation.isPending || editDraft.name.trim() === '' || editDraft.agency.trim() === ''}
                        >
                          {updateMutation.isPending ? 'Saving…' : 'Save permit'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => {
            if (showCreate) {
              setCreateDraft(emptyDraft);
              setCreateError(null);
            }
            setShowCreate((s) => !s);
          }}
        >
          {showCreate ? 'Cancel' : 'Add permit'}
        </button>

        {showCreate && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Permit name" required placeholder="e.g. Crusade ground assembly permit" value={createDraft.name} onChange={(v) => setCreateDraft({ ...createDraft, name: v })}/>
              <TextField label="Agency" required placeholder="e.g. Wa Municipal Assembly" value={createDraft.agency} onChange={(v) => setCreateDraft({ ...createDraft, agency: v })}/>
              <DateField label="Due on" value={createDraft.due_on} onChange={(v) => setCreateDraft({ ...createDraft, due_on: v })}/>
            </div>
            {createError && <div className="field-error" style={{ margin: '8px 0' }}>{createError}</div>}
            <div className="row">
              <button type="button" className="btn" onClick={() => { setCreateDraft(emptyDraft); setCreateError(null); }}>Clear</button>
              <button
                type="button"
                className="btn primary"
                onClick={handleCreate}
                disabled={createMutation.isPending || createDraft.name.trim() === '' || createDraft.agency.trim() === ''}
              >
                {createMutation.isPending ? 'Saving…' : 'Add permit'}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
