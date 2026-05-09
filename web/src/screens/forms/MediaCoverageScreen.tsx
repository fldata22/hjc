import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, DateField, SelectField, SegmentedField } from './fields';
import {
  useCrusade,
  useMediaMentions,
  useCreateMediaMention,
  useDeleteMediaMention,
  type MediaKind,
  type MediaSentiment,
  type MediaMention,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import { todayISO } from '../../lib/dateHelpers';
import './forms.css';

const KINDS: Array<{ value: MediaKind; label: string }> = [
  { value: 'newspaper', label: 'Newspaper' },
  { value: 'radio', label: 'Radio' },
  { value: 'tv', label: 'TV' },
  { value: 'online', label: 'Online' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const SENTIMENTS: Array<{ value: MediaSentiment; label: string }> = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const SENTIMENT_CLASS: Record<MediaSentiment, string> = {
  positive: 'confirmed',
  neutral: 'pending',
  negative: 'declined',
};

type Draft = {
  mentioned_on: string;
  kind: MediaKind | '';
  outlet: string;
  headline: string;
  url: string;
  sentiment: MediaSentiment | '';
  summary: string;
};

const emptyDraft = (): Draft => ({
  mentioned_on: todayISO(),
  kind: '',
  outlet: '',
  headline: '',
  url: '',
  sentiment: '',
  summary: '',
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

export function MediaCoverageScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: mentions, isLoading, isError, refetch } = useMediaMentions();
  const createMutation = useCreateMediaMention();
  const deleteMutation = useDeleteMediaMention();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saveError, setSaveError] = useState<string | null>(null);

  const list = useMemo(() => mentions ?? [], [mentions]);
  const positiveCount = list.filter((m) => m.sentiment === 'positive').length;

  const handleAdd = async () => {
    if (!crusade || draft.kind === '' || draft.outlet.trim() === '' || draft.headline.trim() === '' || createMutation.isPending) return;
    setSaveError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        mentioned_on: draft.mentioned_on,
        kind: draft.kind,
        outlet: draft.outlet.trim(),
        headline: draft.headline.trim(),
        url: draft.url.trim() || null,
        sentiment: draft.sentiment === '' ? null : draft.sentiment,
        summary: draft.summary.trim() || null,
      });
      setDraft(emptyDraft());
      setShowForm(false);
    } catch (e) {
      setSaveError(extractApiMessage(e));
    }
  };

  const handleDelete = (m: MediaMention) => {
    if (deleteMutation.isPending) return;
    if (!confirm(`Delete this mention from ${m.outlet}?`)) return;
    deleteMutation.mutate(m.id);
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Media <em>Coverage</em></>} pillar="A·all" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Media <em>Coverage</em></>} pillar="A·all" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Media <em>Coverage</em></>} pillar="A·all" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{list.length}</div>
            <div className="lbl">total mentions</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl"><b>{positiveCount}</b> positive</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load mentions.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No media mentions logged yet.</div>
          ) : (
            list.map((m) => {
              const kindLabel = KINDS.find((k) => k.value === m.kind)?.label ?? m.kind;
              return (
                <div key={m.id} className="form-list-row">
                  <div>
                    <div className="name">{m.headline}</div>
                    <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{m.outlet} · {kindLabel} · {m.mentioned_on}</span>
                      {m.url && (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(ev) => ev.stopPropagation()}
                          style={{ color: 'var(--accent)', fontSize: 11, textDecoration: 'none', borderBottom: '1px solid var(--accent)' }}
                        >
                          link ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.sentiment && (
                      <div className={'status ' + SENTIMENT_CLASS[m.sentiment]}>
                        {SENTIMENTS.find((s) => s.value === m.sentiment)?.label}
                      </div>
                    )}
                    <button type="button" onClick={() => handleDelete(m)} aria-label="Delete" style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}>×</button>
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
              setDraft(emptyDraft());
              setSaveError(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? 'Cancel' : 'Log mention'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Mentioned on" required value={draft.mentioned_on} onChange={(v) => setDraft({ ...draft, mentioned_on: v })}/>
              <SelectField
                label="Kind"
                required
                options={KINDS}
                value={draft.kind}
                onChange={(v) => setDraft({ ...draft, kind: v as MediaKind | '' })}
                placeholder="Select…"
              />
              <TextField label="Outlet" required placeholder="e.g. Daily Graphic" value={draft.outlet} onChange={(v) => setDraft({ ...draft, outlet: v })}/>
              <TextField label="Headline" required placeholder="The lead line" value={draft.headline} onChange={(v) => setDraft({ ...draft, headline: v })}/>
              <TextField label="URL" placeholder="optional · https://…" value={draft.url} onChange={(v) => setDraft({ ...draft, url: v })}/>
              <SegmentedField
                label="Sentiment"
                options={[...SENTIMENTS, { value: '', label: 'Skip' } as { value: ''; label: string }]}
                value={draft.sentiment}
                onChange={(v) => setDraft({ ...draft, sentiment: v as MediaSentiment | '' })}
              />
              <TextareaField label="Summary" value={draft.summary} onChange={(v) => setDraft({ ...draft, summary: v })}/>
            </div>

            {saveError && <div className="field-error" style={{ margin: '8px 0' }}>{saveError}</div>}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyDraft()); setSaveError(null); }}>Clear</button>
              <button
                type="button"
                className="btn primary"
                onClick={handleAdd}
                disabled={createMutation.isPending || draft.kind === '' || draft.outlet.trim() === '' || draft.headline.trim() === ''}
              >
                {createMutation.isPending ? 'Saving…' : 'Log mention'}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
