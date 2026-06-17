import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar, useDrawer } from './Shell';
import {
  type Contact,
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useCrusade,
  useZones,
  useChurches,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { useToast } from '../../lib/toast-context';
import { TextField, PhoneField, TextareaField, SelectField } from '../forms/fields';
import { InlineSheet } from '../forms/InlineSheet';
import '../forms/forms.css';
import './app.css';

type Draft = {
  full_name: string;
  title: string;
  phone: string;
  email: string;
  zoneId: number | '';
  churchId: number | '';
  notes: string;
};

const emptyDraft: Draft = { full_name: '', title: '', phone: '', email: '', zoneId: '', churchId: '', notes: '' };

const draftFromContact = (c: Contact): Draft => ({
  full_name: c.full_name,
  title: c.title ?? '',
  phone: c.phone ?? '',
  email: c.email ?? '',
  zoneId: c.zone_id ?? '',
  churchId: c.church_id ?? '',
  notes: c.notes ?? '',
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

export function PeopleScreen() {
  const drawer = useDrawer();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const { data: contacts, isLoading } = useContacts({ q: search.trim() || undefined });
  const { data: crusade } = useCrusade();
  const { data: zones } = useZones();
  const { data: churches } = useChurches();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => contacts ?? [], [contacts]);
  const zoneById = useMemo(() => new Map((zones ?? []).map((z) => [z.id, z] as const)), [zones]);
  const churchById = useMemo(() => new Map((churches ?? []).map((c) => [c.id, c] as const)), [churches]);
  const zoneOptions = useMemo(
    () => (zones ?? []).map((z) => ({ value: String(z.id), label: z.name ?? z.code })),
    [zones],
  );
  const churchOptions = useMemo(
    () =>
      (churches ?? [])
        .filter((c) => draft.zoneId === '' || c.zone_id === draft.zoneId)
        .map((c) => ({ value: String(c.id), label: c.name })),
    [churches, draft.zoneId],
  );

  const sheetOpen = showAdd || editingId !== null;
  const editing = editingId !== null;

  const openAdd = () => {
    setDraft(emptyDraft);
    setError(null);
    setEditingId(null);
    setShowAdd(true);
  };

  const openEdit = (c: Contact) => {
    setDraft(draftFromContact(c));
    setError(null);
    setShowAdd(false);
    setEditingId(c.id);
  };

  const close = () => {
    setShowAdd(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  };

  const canSave = draft.full_name.trim() !== '';
  const pending = createContact.isPending || updateContact.isPending;

  const subLine = (c: Contact): string => {
    const parts: string[] = [];
    if (c.title) parts.push(c.title);
    const zoneName = c.zone_id != null ? (zoneById.get(c.zone_id)?.name ?? zoneById.get(c.zone_id)?.code) : null;
    const churchName = c.church_id != null ? churchById.get(c.church_id)?.name : null;
    if (zoneName) parts.push(zoneName);
    if (churchName) parts.push(churchName);
    return parts.join(' · ') || '—';
  };

  const handleSave = async () => {
    if (!canSave || pending) return;
    setError(null);
    const body = {
      full_name: draft.full_name.trim(),
      title: draft.title.trim() || null,
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
      zone_id: typeof draft.zoneId === 'number' ? draft.zoneId : null,
      church_id: typeof draft.churchId === 'number' ? draft.churchId : null,
      notes: draft.notes.trim() || null,
    };
    try {
      if (editing && editingId != null) {
        await updateContact.mutateAsync({ id: editingId, body });
        toast.show('Contact updated.', 'success');
      } else {
        if (!crusade) return;
        await createContact.mutateAsync({ crusade_id: crusade.id, ...body });
        toast.show(`${body.full_name} added.`, 'success');
      }
      close();
    } catch (e) {
      setError(extractApiMessage(e));
    }
  };

  const handleDelete = async () => {
    if (editingId == null || deleteContact.isPending) return;
    if (!confirm('Delete this contact? They will be removed from the People list.')) return;
    try {
      await deleteContact.mutateAsync(editingId);
      toast.show('Contact deleted.', 'success');
      close();
    } catch (e) {
      setError(extractApiMessage(e));
    }
  };

  return (
    <ResponsiveShell active="home">
      <AppBar title="People" sub="contacts directory" onMenu={drawer.show}/>
      <div className="search-bar" style={{ display: 'flex', gap: 10 }}>
        <input
          className="search-input"
          type="search"
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={openAdd}
          style={{
            flexShrink: 0,
            padding: '0 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: '1px solid var(--ink)',
            background: 'var(--ink)',
            color: 'var(--surface)',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      <div className="scroll">
        {isLoading ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 20px', textAlign: 'center', lineHeight: 1.6 }}>
            {search ? `No people match “${search}”.` : 'No people added yet. Tap + Add to create your first contact.'}
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 20px 6px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              {list.length} {list.length === 1 ? 'person' : 'people'}
            </div>
            <div style={{ padding: '0 20px' }}>
              {list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="form-list-row"
                  onClick={() => openEdit(c)}
                  style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                >
                  <div>
                    <div className="name">{c.full_name}</div>
                    <div className="sub">{subLine(c)}</div>
                  </div>
                  {c.phone && (
                    <div className="right" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{c.phone}</div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="bot-pad"/>
      </div>

      <InlineSheet open={sheetOpen} onClose={close}>
        <div style={{ padding: '4px 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', borderBottom: '1px solid var(--line)' }}>
          {editing ? 'Edit contact' : 'New contact'}
        </div>
        <div className="fields" style={{ padding: 0 }}>
          <TextField label="Full name" required placeholder="e.g. Rev. Edmund Asare" value={draft.full_name} onChange={(v) => setDraft({ ...draft, full_name: v })}/>
          <TextField label="Title / role" placeholder="optional — e.g. Senior Pastor" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })}/>
          <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })}/>
          <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
          <SelectField
            label="Zone"
            options={zoneOptions}
            value={draft.zoneId === '' ? '' : String(draft.zoneId)}
            onChange={(v) => setDraft({ ...draft, zoneId: v === '' ? '' : Number(v), churchId: '' })}
            placeholder="Select zone…"
          />
          <SelectField
            label="Church"
            options={churchOptions}
            value={draft.churchId === '' ? '' : String(draft.churchId)}
            onChange={(v) => setDraft({ ...draft, churchId: v === '' ? '' : Number(v) })}
            placeholder={draft.zoneId === '' ? 'Select church…' : 'Select church in zone…'}
          />
          <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
        </div>
        {error && <div className="field-error" style={{ margin: '4px 0' }}>{error}</div>}
        <div className="row">
          {editing ? (
            <button type="button" className="btn" onClick={handleDelete} disabled={deleteContact.isPending} style={{ color: 'var(--risk)', borderColor: 'var(--risk)' }}>
              {deleteContact.isPending ? 'Deleting…' : 'Delete'}
            </button>
          ) : (
            <button type="button" className="btn" onClick={close}>Cancel</button>
          )}
          <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave || pending}>
            {pending ? 'Saving…' : editing ? 'Save' : 'Add contact'}
          </button>
        </div>
      </InlineSheet>

      <TabBar active="home"/>
      {drawer.open && <Drawer active="home" onClose={drawer.hide}/>}
    </ResponsiveShell>
  );
}
