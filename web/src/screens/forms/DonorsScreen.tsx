import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, CurrencyField, SelectField, SegmentedField } from './fields';
import {
  useCrusade,
  useDonors,
  useCreateDonor,
  useUpdateDonor,
  useDeleteDonor,
  type Donor,
  type DonorKind,
  type DonorStatus,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

const KINDS: Array<{ value: DonorKind; label: string }> = [
  { value: 'individual', label: 'Individual' },
  { value: 'organization', label: 'Organisation' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'church', label: 'Church' },
];

const STATUSES: Array<{ value: DonorStatus; label: string }> = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'committed', label: 'Committed' },
  { value: 'given', label: 'Given' },
  { value: 'declined', label: 'Declined' },
];

const STATUS_CLASS: Record<DonorStatus, string> = {
  prospect: 'pending',
  engaged: 'pending',
  committed: 'confirmed',
  given: 'confirmed',
  declined: 'declined',
};

type Draft = {
  name: string;
  organization: string;
  kind: DonorKind | '';
  pledge_amount: number | '';
  status: DonorStatus;
  notes: string;
};

const emptyDraft: Draft = { name: '', organization: '', kind: '', pledge_amount: '', status: 'prospect', notes: '' };

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

const fmtCedi = (n: number) => '₵' + (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString());

export function DonorsScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: donorsResp, isLoading, isError, refetch } = useDonors();
  const createMutation = useCreateDonor();
  const updateMutation = useUpdateDonor();
  const deleteMutation = useDeleteDonor();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => donorsResp?.data ?? [], [donorsResp]);
  const totals = donorsResp?.meta.totals;
  const pledged = totals ? Number(totals.pledged) : 0;
  const given = totals ? Number(totals.given) : 0;

  const advanceStatus = (s: DonorStatus): DonorStatus =>
    s === 'prospect' ? 'engaged' :
    s === 'engaged' ? 'committed' :
    s === 'committed' ? 'given' : s;

  const handleAdd = async () => {
    if (!crusade || draft.name.trim() === '' || draft.kind === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        name: draft.name.trim(),
        organization: draft.organization.trim() || null,
        kind: draft.kind,
        pledge_amount: draft.pledge_amount === '' ? null : Number(draft.pledge_amount),
        status: draft.status,
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleStatusClick = (d: Donor) => {
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: d.id, body: { status: advanceStatus(d.status) } });
  };

  const handleDelete = (d: Donor) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete donor "${d.name}"?`)) return;
    deleteMutation.mutate(d.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Donor <em>Roster</em></>} pillar="P8" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Donor <em>Roster</em></>} pillar="P8" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Donor <em>Roster</em></>} pillar="P8" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{fmtCedi(given)}</div>
            <div className="lbl">received · {fmtCedi(pledged)} pledged</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{list.length}</b> {list.length === 1 ? 'donor' : 'donors'}</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load donors.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No donors logged yet.</div>
          ) : (
            list.map((d) => {
              const kindLabel = KINDS.find((k) => k.value === d.kind)?.label ?? d.kind;
              const amount = d.pledge_amount != null ? Number(d.pledge_amount) : null;
              return (
                <div key={d.id} className="form-list-row">
                  <div>
                    <div className="name">{d.name}</div>
                    <div className="sub">
                      {d.organization ? `${d.organization} · ` : ''}{kindLabel}
                      {amount != null ? ` · ${fmtCedi(amount)}` : ''}
                    </div>
                  </div>
                  <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleStatusClick(d)}
                      className={'status ' + STATUS_CLASS[d.status]}
                      style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                      aria-label="Advance status"
                    >
                      {STATUSES.find((s) => s.value === d.status)?.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      aria-label="Delete donor"
                      style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}
                    >
                      ×
                    </button>
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
              setDraft(emptyDraft);
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : 'Add donor'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Name" required placeholder="e.g. Hon. Sarah Mensah" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })}/>
              <TextField label="Organisation" placeholder="optional" value={draft.organization} onChange={(v) => setDraft({ ...draft, organization: v })}/>
              <SelectField
                label="Kind"
                required
                options={KINDS}
                value={draft.kind}
                onChange={(v) => setDraft({ ...draft, kind: v as DonorKind | '' })}
                placeholder="Select…"
              />
              <CurrencyField label="Pledge amount" value={draft.pledge_amount} onChange={(v) => setDraft({ ...draft, pledge_amount: v })}/>
              <SegmentedField
                label="Status"
                required
                options={STATUSES}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as DonorStatus })}
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
                disabled={createMutation.isPending || draft.name.trim() === '' || draft.kind === ''}
              >
                {createMutation.isPending ? 'Saving…' : 'Add donor'}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
