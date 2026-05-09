import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextareaField, SelectField, SegmentedField } from './fields';
import {
  useCrusade,
  usePowers,
  useActivityEntries,
  useCreateActivityEntry,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

type Status = 'done' | 'running';

type Draft = {
  description: string;
  power_id: number | '';
  status: Status;
};

const emptyDraft: Draft = { description: '', power_id: '', status: 'done' };

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

export function ActivityQuickLogScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: powers } = usePowers();
  const { data: recent } = useActivityEntries({ per_page: 10 });
  const createMutation = useCreateActivityEntry();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const powerOptions = useMemo(
    () => (powers ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` })),
    [powers],
  );

  const recentList = useMemo(() => recent?.data?.slice(0, 5) ?? [], [recent]);

  const handleSubmit = async () => {
    if (!crusade || draft.description.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    setSaveOk(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        occurred_at: new Date().toISOString(),
        description: draft.description.trim(),
        power_id: typeof draft.power_id === 'number' ? draft.power_id : undefined,
        status: draft.status,
      });
      setDraft(emptyDraft);
      setSaveOk('Logged.');
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Activity <em>Quick-Log</em></>} pillar="D19" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Activity <em>Quick-Log</em></>} pillar="D19" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Activity <em>Quick-Log</em></>} pillar="D19" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Drop a one-line note about something you just did. Examples:
          <ul style={{ margin: '8px 0 0 18px', padding: 0, fontSize: 12 }}>
            <li>"Met with 4 PCM pastors at Wa Central; 2 confirmed"</li>
            <li>"Convoy team finished Wa-North radio drops"</li>
            <li>"Permits desk at city council closed early"</li>
          </ul>
        </div>

        <div style={{ padding: '0 20px' }}>
          <div className="fields" style={{ padding: 0 }}>
            <TextareaField
              label="What happened?"
              required
              placeholder="One or two sentences."
              value={draft.description}
              onChange={(v) => setDraft({ ...draft, description: v })}
            />
            <SelectField
              label="Power tag"
              options={powerOptions}
              value={draft.power_id === '' ? '' : String(draft.power_id)}
              onChange={(v) => setDraft({ ...draft, power_id: v === '' ? '' : Number(v) })}
              placeholder="Optional · which pillar?"
            />
            <SegmentedField
              label="Status"
              options={[
                { value: 'done', label: 'Done' },
                { value: 'running', label: 'In progress' },
              ]}
              value={draft.status}
              onChange={(v) => setDraft({ ...draft, status: v as Status })}
            />
          </div>

          {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}
          {saveOk && <div style={{ margin: '8px 0', fontSize: 12, color: 'var(--ok, #2a8c4a)' }}>{saveOk}</div>}

          <div className="row">
            <button type="button" className="btn" onClick={() => { setDraft(emptyDraft); setSaveError(null); setSaveOk(null); }}>Clear</button>
            <button
              type="button"
              className="btn primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending || draft.description.trim() === ''}
            >
              {createMutation.isPending ? 'Logging…' : 'Log it'}
            </button>
          </div>

          {recentList.length > 0 && (
            <>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, padding: '24px 0 8px', borderBottom: '1px solid var(--line)' }}>
                Recent · last 5
              </div>
              {recentList.map((e) => (
                <div key={e.id} className="form-list-row">
                  <div>
                    <div className="name" style={{ fontSize: 13 }}>{e.description}</div>
                    <div className="sub">
                      {e.power.code} · {new Date(e.occurred_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="right">
                    <div className={'status ' + (e.status === 'done' ? 'confirmed' : 'pending')}>
                      {e.status === 'done' ? 'Done' : 'Running'}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
