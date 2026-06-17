import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, NumberField, DateField, SelectField } from './fields';
import {
  useCrusade,
  useZones,
  useOutreachActivities,
  useCreateOutreachActivity,
  useDeleteOutreachActivity,
  type OutreachKind,
  type OutreachActivity,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { todayISO } from '../../lib/dateHelpers';
import { InlineSheet } from './InlineSheet';
import './forms.css';

type Draft = {
  occurred_on: string;
  zone_id: number | '';
  team_lead_name: string;
  households_reached: number | '';
  conversations_count: number | '';
  pamphlets_distributed: number | '';
  route_summary: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  occurred_on: todayISO(),
  zone_id: '',
  team_lead_name: '',
  households_reached: '',
  conversations_count: '',
  pamphlets_distributed: '',
  route_summary: '',
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

interface Props {
  kind: OutreachKind;
  pillar: string;
  title: React.ReactNode;
  ctaLabel: string;
}

export function OutreachScreen({ kind, pillar, title, ctaLabel }: Props) {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: zones } = useZones();
  const { data: activities, isLoading, isError, refetch } = useOutreachActivities({ kind });
  const createMutation = useCreateOutreachActivity();
  const deleteMutation = useDeleteOutreachActivity();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => activities ?? [], [activities]);
  const totalReached = list.reduce((s, a) => s + (a.households_reached ?? 0), 0);
  const zoneOptions = useMemo(
    () => (zones ?? []).map((z) => ({ value: String(z.id), label: z.name ?? z.code })),
    [zones],
  );
  const zoneById = useMemo(
    () => new Map((zones ?? []).map((z) => [z.id, z] as const)),
    [zones],
  );

  const handleAdd = async () => {
    if (!crusade || draft.occurred_on === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        kind,
        occurred_on: draft.occurred_on,
        zone_id: typeof draft.zone_id === 'number' ? draft.zone_id : null,
        team_lead_name: draft.team_lead_name.trim() || null,
        households_reached: draft.households_reached === '' ? null : Number(draft.households_reached),
        conversations_count: draft.conversations_count === '' ? null : Number(draft.conversations_count),
        pamphlets_distributed: draft.pamphlets_distributed === '' ? null : Number(draft.pamphlets_distributed),
        route_summary: draft.route_summary.trim() || null,
        notes: draft.notes.trim() || null,
      });
      setDraft(emptyDraft());
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleDelete = (a: OutreachActivity) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete this entry from ${a.occurred_on}?`)) return;
    deleteMutation.mutate(a.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={title} pillar={pillar} primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={title} pillar={pillar} primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={title} pillar={pillar} primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{totalReached.toLocaleString()}</div>
            <div className="lbl">households reached</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{list.length}</b> {list.length === 1 ? 'entry' : 'entries'}</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load entries.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No {kind === 'door_to_door' ? 'door-to-door' : 'convoy'} entries yet.</div>
          ) : (
            list.map((a) => {
              const zone = a.zone_id != null ? zoneById.get(a.zone_id) : null;
              const zoneLabel = zone?.name ?? zone?.code ?? null;
              return (
                <div key={a.id} className="form-list-row">
                  <div>
                    <div className="name">{a.occurred_on}{zoneLabel ? ` · ${zoneLabel}` : ''}</div>
                    <div className="sub">
                      {a.team_lead_name ?? '—'}
                      {a.households_reached != null ? ` · ${a.households_reached.toLocaleString()} reached` : ''}
                      {kind === 'door_to_door' && a.conversations_count != null ? ` · ${a.conversations_count} convos` : ''}
                      {kind === 'convoy' && a.route_summary ? ` · ${a.route_summary.slice(0, 40)}${a.route_summary.length > 40 ? '…' : ''}` : ''}
                    </div>
                  </div>
                  <div className="right">
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
          {ctaLabel}
        </button>

        <InlineSheet open={showForm} onClose={() => { setDraft(emptyDraft()); setShowForm(false); setSaveError(null); }}>
          <div className="fields" style={{ padding: 0 }}>
            <DateField label="Occurred on" required value={draft.occurred_on} onChange={(v) => setDraft({ ...draft, occurred_on: v })}/>
            <SelectField
              label="Zone"
              options={zoneOptions}
              value={draft.zone_id === '' ? '' : String(draft.zone_id)}
              onChange={(v) => setDraft({ ...draft, zone_id: v === '' ? '' : Number(v) })}
              placeholder="Optional"
            />
            <TextField label="Team lead" placeholder="optional" value={draft.team_lead_name} onChange={(v) => setDraft({ ...draft, team_lead_name: v })}/>
            <NumberField label="Households reached" value={draft.households_reached} onChange={(v) => setDraft({ ...draft, households_reached: v })}/>
            {kind === 'door_to_door' && (
              <>
                <NumberField label="Conversations" value={draft.conversations_count} onChange={(v) => setDraft({ ...draft, conversations_count: v })}/>
                <NumberField label="Pamphlets distributed" value={draft.pamphlets_distributed} onChange={(v) => setDraft({ ...draft, pamphlets_distributed: v })}/>
              </>
            )}
            {kind === 'convoy' && (
              <TextareaField label="Route summary" placeholder="e.g. Wa-Central → Wa-North radio drops" value={draft.route_summary} onChange={(v) => setDraft({ ...draft, route_summary: v })}/>
            )}
            <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft()); setSaveError(null); }}>Clear</button>
            <button
              type="button"
              className="btn primary"
              onClick={handleAdd}
              disabled={createMutation.isPending || draft.occurred_on === ''}
            >
              {createMutation.isPending ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </InlineSheet>

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}

export function DoorToDoorScreen() {
  return (
    <OutreachScreen
      kind="door_to_door"
      pillar="A·all"
      title={<>Door-to-Door <em>Outreach</em></>}
      ctaLabel="Log a sweep"
    />
  );
}

export function ConvoyOutreachScreen() {
  return (
    <OutreachScreen
      kind="convoy"
      pillar="A·all"
      title={<>Convoy <em>Outreach</em></>}
      ctaLabel="Log convoy run"
    />
  );
}
