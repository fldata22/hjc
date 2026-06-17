import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SelectField, DateField } from './fields';
import {
  useCrusade,
  useMustDoItems,
  useCreateMustDoItem,
  useUpdateMustDoItem,
  useDeleteMustDoItem,
  type MustDoArea,
  type MustDoStatus,
  type MustDoItem,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { InlineSheet } from './InlineSheet';
import './forms.css';

const AREAS: Array<{ value: MustDoArea; label: string }> = [
  { value: 'venue', label: 'Venue' },
  { value: 'publicity', label: 'Publicity' },
  { value: 'permits', label: 'Permits' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'other', label: 'Other' },
];

const STATUSES: Array<{ value: MustDoStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

const STATUS_CLASS: Record<MustDoStatus, string> = {
  pending: 'pending',
  in_progress: 'pending',
  done: 'confirmed',
};

type Draft = {
  area: MustDoArea | '';
  title: string;
  owner_name: string;
  due_date: string;
  notes: string;
};

const emptyDraft: Draft = { area: '', title: '', owner_name: '', due_date: '', notes: '' };

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

export function MustDoChecklistScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: items, isLoading: itemsLoading, isError: itemsError, refetch } = useMustDoItems();
  const createMutation = useCreateMustDoItem();
  const updateMutation = useUpdateMustDoItem();
  const deleteMutation = useDeleteMustDoItem();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => items ?? [], [items]);
  const doneCount = list.filter((i) => i.status === 'done').length;
  const pct = list.length === 0 ? 0 : Math.round((doneCount / list.length) * 100);

  const grouped = useMemo(() => {
    const map = new Map<MustDoArea, MustDoItem[]>();
    for (const a of AREAS) map.set(a.value, []);
    for (const item of list) {
      const arr = map.get(item.area) ?? [];
      arr.push(item);
      map.set(item.area, arr);
    }
    return map;
  }, [list]);

  const cycleStatus = (current: MustDoStatus): MustDoStatus =>
    current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'done' : 'pending';

  const handleAdd = async () => {
    if (!crusade || draft.area === '' || draft.title.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        area: draft.area,
        title: draft.title.trim(),
        owner_name: draft.owner_name.trim() || null,
        due_date: draft.due_date || null,
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleStatusClick = (item: MustDoItem) => {
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: item.id, body: { status: cycleStatus(item.status) } });
  };

  const handleDelete = (item: MustDoItem) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete "${item.title}"?`)) return;
    deleteMutation.mutate(item.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Must-Do <em>Checklist</em></>}
          pillar="V10"
          primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
        >
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell
          title={<>Must-Do <em>Checklist</em></>}
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
        title={<>Must-Do <em>Checklist</em></>}
        pillar="V10"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{pct}%</div>
            <div className="lbl">{doneCount} of {list.length} done</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {itemsError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load items.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : itemsLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No items yet. Tap "Add item" to get started.</div>
          ) : (
            AREAS.map((area) => {
              const areaItems = grouped.get(area.value) ?? [];
              if (areaItems.length === 0) return null;
              return (
                <div key={area.value} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, padding: '12px 0 8px', borderBottom: '1px solid var(--line)' }}>
                    {area.label} <span style={{ color: 'var(--ink-3)' }}>· {areaItems.filter((i) => i.status === 'done').length}/{areaItems.length}</span>
                  </div>
                  {areaItems.map((item) => (
                    <div key={item.id} className="form-list-row">
                      <div>
                        <div className="name" style={{ textDecoration: item.status === 'done' ? 'line-through' : 'none', color: item.status === 'done' ? 'var(--ink-3)' : 'var(--ink)' }}>{item.title}</div>
                        <div className="sub">
                          {item.owner_name ?? '—'}{item.due_date ? ` · due ${item.due_date}` : ''}
                        </div>
                      </div>
                      <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleStatusClick(item)}
                          className={'status ' + STATUS_CLASS[item.status]}
                          style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                          aria-label="Cycle status"
                        >
                          {STATUSES.find((s) => s.value === item.status)?.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          aria-label="Delete item"
                          style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
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
          Add item
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <SelectField
              label="Area"
              required
              options={AREAS.map((a) => ({ value: a.value, label: a.label }))}
              value={draft.area}
              onChange={(v) => setDraft({ ...draft, area: v as MustDoArea | '' })}
              placeholder="Select…"
            />
            <TextField label="Title" required placeholder="e.g. Confirm sound provider" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })}/>
            <TextField label="Owner" placeholder="optional" value={draft.owner_name} onChange={(v) => setDraft({ ...draft, owner_name: v })}/>
            <DateField label="Due date" value={draft.due_date} onChange={(v) => setDraft({ ...draft, due_date: v })}/>
            <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
          </div>

          {saveError && (
            <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>
          )}

          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setSaveError(null); }}>Clear</button>
            <button
              type="button"
              className="btn primary"
              onClick={handleAdd}
              disabled={createMutation.isPending || draft.area === '' || draft.title.trim() === ''}
            >
              {createMutation.isPending ? 'Saving…' : 'Add item'}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
