# PCM Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the localStorage-backed PCM 4-step wizard with a 2-step API-backed form that creates a Pastor + a PastorIdentification(category='PCM'). Update PCMListScreen to read from `/pastors`. No backend changes — both endpoints already exist.

**Architecture:** Two new mutation hooks (`useCreatePastor`, `useCreatePastorIdentification`). Submission is a sequential two-call orchestration with explicit partial-failure UX (Retry assignment / Skip). The list switches from `getRecords` to `usePastors` and replaces `backgroundCheck` with `pipeline_stage`.

**Tech Stack:** React 19 + TypeScript strict + @tanstack/react-query v5. No backend changes; no migrations; no test additions on the backend (existing pastor/identification tests cover the contracts we're calling).

**Spec:** `docs/superpowers/specs/2026-05-09-pcm-wiring-design.md`

---

## File map

**Frontend modify:**
- `web/src/api/hooks.ts` — append 1 type + 2 hooks
- `web/src/screens/forms/PCMForm.tsx` — full rewrite
- `web/src/screens/forms/PCMListScreen.tsx` — full rewrite

**Backend:** none.

**Delete:** none (`PCMRecord` type may be unused after rewrite — confirm by grep and drop if so).

---

## Task 1: Pastor + PastorIdentification create hooks

**Files:**
- Modify: `web/src/api/hooks.ts` — append after the budget hooks block

- [ ] **Step 1: Append the hooks block**

Add to the bottom of `/Users/adebimpegodwin/Projects/hjc/web/src/api/hooks.ts`:

```ts
// === Pastor identifications ===
export interface PastorIdentificationRow {
  id: number;
  pastor_id: number;
  category: string;
  sub_role: string | null;
  assigned_at: string;
  assigned_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export function useCreatePastor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      full_name: string;
      zone_id: number | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      pastor_since: number | null;
      pipeline_stage?: 'identified' | 'engaged' | 'committed' | 'active' | 'champion';
    }) =>
      apiFetch<{ data: Pastor }>('/pastors', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pastors'] });
      qc.invalidateQueries({ queryKey: ['pastor-stage-counts'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}

export function useCreatePastorIdentification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pastorId, body }: {
      pastorId: number;
      body: { category: string; sub_role: string | null; assigned_at: string };
    }) =>
      apiFetch<{ data: PastorIdentificationRow }>(
        `/pastors/${pastorId}/identifications`,
        { method: 'POST', body: JSON.stringify(body) },
      ).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['pastor', vars.pastorId] });
      qc.invalidateQueries({ queryKey: ['pastors'] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b 2>&1 | grep -v "PCMForm.tsx\|PCMListScreen.tsx" | grep -E "error|TS\d+" || echo "no other errors"
```

Expected: `no other errors`. (PCMForm.tsx and PCMListScreen.tsx may have transient errors from stale references; they're rewritten in Tasks 2 and 3.)

- [ ] **Step 3: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint 2>&1 | tail -3
```

Expected: same 4 baseline errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/api/hooks.ts && git commit -m "$(cat <<'EOF'
feat(web): useCreatePastor + useCreatePastorIdentification hooks

Two mutations for the PCM submission flow: useCreatePastor posts to
/pastors with pipeline_stage='identified' (default) and invalidates
pastors / stage-counts / mission-control. useCreatePastorIdentification
posts to /pastors/{id}/identifications and invalidates the affected
pastor cache plus the list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: PCMForm rewrite

**Files:**
- Modify: `web/src/screens/forms/PCMForm.tsx` — full rewrite

- [ ] **Step 1: Replace the file contents**

Overwrite `/Users/adebimpegodwin/Projects/hjc/web/src/screens/forms/PCMForm.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell, type SaveStatus } from './FormShell';
import { TextField, TextareaField, PhoneField, NumberField, SelectField } from './fields';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draftStorage';
import { useDebouncedCallback } from '../../lib/useDebouncedCallback';
import {
  useCrusade,
  useZones,
  useCreatePastor,
  useCreatePastorIdentification,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

const FORM_SLUG = 'pcm';

const STEPS = [
  { id: 'basics', label: 'Pastor basics' },
  { id: 'review', label: 'Review' },
];

type Draft = {
  fullName: string;
  role: string;
  yearsInMinistry: number | '';
  phone: string;
  email: string;
  address: string;
  zoneId: number | '';
};

const emptyDraft: Draft = {
  fullName: '',
  role: '',
  yearsInMinistry: '',
  phone: '',
  email: '',
  address: '',
  zoneId: '',
};

type DraftState = { stepId: string; data: Draft };

function newDraftId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

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

export function PCMForm() {
  const navigate = useNavigate();

  const { data: crusade } = useCrusade();
  const { data: zones } = useZones();
  const createPastor = useCreatePastor();
  const createIdentification = useCreatePastorIdentification();

  const [draftId] = useState<string>(() => {
    const stored = sessionStorage.getItem('hjc_active_pcm_draft');
    if (stored) return stored;
    const id = newDraftId();
    sessionStorage.setItem('hjc_active_pcm_draft', id);
    return id;
  });
  const [stepId, setStepId] = useState<string>(STEPS[0].id);
  const [data, setData] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasRestored, setHasRestored] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [partialFailure, setPartialFailure] = useState<{ pastorId: number; pastorName: string; message: string } | null>(null);

  // Restore draft once on mount.
  useEffect(() => {
    const restored = loadDraft<DraftState>(FORM_SLUG, draftId);
    if (restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(restored.data);
      setStepId(restored.stepId);
    }
    setHasRestored(true);
  }, [draftId]);

  const persist = useDebouncedCallback((next: Draft, nextStepId: string) => {
    saveDraft<DraftState>(FORM_SLUG, draftId, { stepId: nextStepId, data: next });
    setSaveStatus('saved');
  }, 500);

  // Autosave once the restore step has run.
  useEffect(() => {
    if (!hasRestored) return;
    persist(data, stepId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveStatus('saving');
  }, [data, stepId, persist, hasRestored]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const zoneOptions = useMemo(
    () => (zones ?? []).map((z) => ({ value: String(z.id), label: z.name ?? z.code })),
    [zones],
  );
  const zoneById = useMemo(
    () => new Map((zones ?? []).map((z) => [z.id, z] as const)),
    [zones],
  );

  const validateBasics = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!data.fullName.trim()) errs.fullName = 'Required';
    if (!data.role.trim()) errs.role = 'Required';
    if (!data.phone.trim()) errs.phone = 'Required';
    if (data.zoneId === '') errs.zoneId = 'Required';
    return errs;
  };

  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const isReview = stepId === 'review';
  const isSubmitting = createPastor.isPending || createIdentification.isPending;

  const handleContinue = () => {
    const errs = validateBasics();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStepId('review');
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepId(STEPS[stepIndex - 1].id);
  };

  const performIdentification = async (pastorId: number, pastorName: string) => {
    try {
      await createIdentification.mutateAsync({
        pastorId,
        body: {
          category: 'PCM',
          sub_role: data.role,
          assigned_at: new Date().toISOString().slice(0, 10),
        },
      });
      // Success path: clear the wizard and head back to the list.
      clearDraft(FORM_SLUG, draftId);
      sessionStorage.removeItem('hjc_active_pcm_draft');
      setPartialFailure(null);
      navigate('/forms/pcm');
    } catch (err) {
      setPartialFailure({ pastorId, pastorName, message: extractApiMessage(err) });
    }
  };

  const handleSubmit = async () => {
    if (!crusade || isSubmitting) return;
    setSubmitError(null);

    const errs = validateBasics();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStepId('basics');
      return;
    }

    try {
      const pastor = await createPastor.mutateAsync({
        crusade_id: crusade.id,
        full_name: data.fullName.trim(),
        zone_id: typeof data.zoneId === 'number' ? data.zoneId : null,
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        address: data.address.trim() || null,
        pastor_since: data.yearsInMinistry === ''
          ? null
          : new Date().getFullYear() - Number(data.yearsInMinistry),
        pipeline_stage: 'identified',
      });
      await performIdentification(pastor.id, pastor.full_name);
    } catch (err) {
      setSubmitError(extractApiMessage(err));
    }
  };

  const handleRetryIdentification = async () => {
    if (!partialFailure) return;
    await performIdentification(partialFailure.pastorId, partialFailure.pastorName);
  };

  const handleSkipIdentification = () => {
    // Pastor exists; let the director resolve from the list. Clear local state.
    clearDraft(FORM_SLUG, draftId);
    sessionStorage.removeItem('hjc_active_pcm_draft');
    setPartialFailure(null);
    navigate('/forms/pcm');
  };

  const handleSaveDraft = () => {
    saveDraft<DraftState>(FORM_SLUG, draftId, { stepId, data });
    setSaveStatus('saved');
  };

  const titleByStep = useMemo(() => STEPS.find((s) => s.id === stepId)?.label ?? '', [stepId]);

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>New PCM · <em>{titleByStep}</em></>}
        pillar="P1"
        steps={STEPS}
        currentStepId={stepId}
        saveStatus={saveStatus}
        backTo="/forms/pcm"
        primaryAction={
          isReview
            ? { label: isSubmitting ? 'Submitting…' : 'Submit PCM', onClick: handleSubmit, disabled: isSubmitting || !!partialFailure }
            : { label: 'Continue →', onClick: handleContinue }
        }
        secondaryAction={
          stepIndex > 0
            ? { label: 'Back', onClick: handleBack }
            : { label: 'Save draft', onClick: handleSaveDraft }
        }
      >
        <div className="fields">
          {stepId === 'basics' && (
            <>
              <TextField label="Full name" required value={data.fullName} onChange={(v) => update('fullName', v)} error={errors.fullName}/>
              <TextField label="Role / title" required placeholder="e.g. Senior Pastor" value={data.role} onChange={(v) => update('role', v)} error={errors.role}/>
              <NumberField label="Years in ministry" suffix="yrs" value={data.yearsInMinistry} onChange={(v) => update('yearsInMinistry', v)}/>
              <PhoneField label="Phone" required value={data.phone} onChange={(v) => update('phone', v)} error={errors.phone}/>
              <TextField label="Email" type="email" value={data.email} onChange={(v) => update('email', v)}/>
              <TextareaField label="Address" value={data.address} onChange={(v) => update('address', v)}/>
              <SelectField
                label="Zone"
                required
                options={zoneOptions}
                value={data.zoneId === '' ? '' : String(data.zoneId)}
                onChange={(v) => update('zoneId', v === '' ? '' : Number(v))}
                placeholder="Select…"
                error={errors.zoneId}
              />
            </>
          )}

          {stepId === 'review' && (
            <>
              <ReviewSection title="Pastor basics" onEdit={() => setStepId('basics')}>
                <ReviewLine label="Full name" value={data.fullName}/>
                <ReviewLine label="Role" value={data.role}/>
                {data.yearsInMinistry !== '' && <ReviewLine label="Years in ministry" value={`${data.yearsInMinistry} yrs`}/>}
                <ReviewLine label="Phone" value={data.phone}/>
                {data.email && <ReviewLine label="Email" value={data.email}/>}
                {data.address && <ReviewLine label="Address" value={data.address}/>}
                <ReviewLine
                  label="Zone"
                  value={
                    typeof data.zoneId === 'number'
                      ? (zoneById.get(data.zoneId)?.name ?? zoneById.get(data.zoneId)?.code ?? '—')
                      : '—'
                  }
                />
              </ReviewSection>

              {partialFailure && (
                <div
                  style={{
                    padding: '14px 16px',
                    margin: '12px 0',
                    background: 'var(--accent-bg)',
                    border: '1px solid var(--accent-soft)',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
                    Pastor "{partialFailure.pastorName}" was saved (id #{partialFailure.pastorId}), but the PCM assignment failed.
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
                    {partialFailure.message}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleRetryIdentification}
                      disabled={isSubmitting}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 999,
                        border: '1px solid var(--accent)',
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {isSubmitting ? 'Retrying…' : 'Retry assignment'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipIdentification}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 999,
                        border: '1px solid var(--line)',
                        background: 'transparent',
                        color: 'var(--ink)',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      Skip — I'll handle it later
                    </button>
                  </div>
                </div>
              )}

              {submitError && !partialFailure && (
                <div className="field-error" style={{ margin: '12px 0' }}>{submitError}</div>
              )}
            </>
          )}
        </div>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}

const ReviewSection = ({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) => (
  <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500 }}>{title}</div>
      <button type="button" onClick={onEdit} style={{ background: 'transparent', border: 0, fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
    </div>
    {children}
  </div>
);

const ReviewLine = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
    <span style={{ color: 'var(--ink-3)' }}>{label}</span>
    <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
  </div>
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b 2>&1 | grep -v "PCMListScreen.tsx" | grep -E "error|TS\d+" || echo "no other errors"
```

Expected: `no other errors`. (PCMListScreen.tsx still uses the old `PCMRecord` shape; rewritten in Task 3.)

- [ ] **Step 3: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint 2>&1 | tail -3
```

Expected: same 4 baseline errors only.

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/screens/forms/PCMForm.tsx && git commit -m "$(cat <<'EOF'
feat(web): wire PCMForm to /pastors + /pastors/{id}/identifications

Replace the 4-step localStorage wizard (identification, contact,
vetting, review) with a 2-step API-backed form (basics, review).
Drop denomination, churchName, whatsapp, backgroundCheck, all
references, characteristicsMet, vettingNotes, attestation. Drop the
disabled photo + GPS placeholder buttons.

Submission is a sequential two-call orchestration:
  POST /pastors  (pipeline_stage='identified')
  POST /pastors/{id}/identifications  (category='PCM', sub_role=role)

If step 2 fails after step 1 succeeds, surface a partial-failure
block with Retry assignment / Skip — no automatic rollback. The
pastor remains in the system at pipeline_stage='identified'.

Zone enum is replaced with a SelectField populated from useZones
(numeric FK). yearsInMinistry maps to pastor_since via current_year
- yearsInMinistry. role becomes pastor_identifications.sub_role.

draftStorage stays — it's local wizard state, not the submitQueue
that we're retiring.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: PCMListScreen rewrite

**Files:**
- Modify: `web/src/screens/forms/PCMListScreen.tsx` — full rewrite

- [ ] **Step 1: Replace the file contents**

Overwrite `/Users/adebimpegodwin/Projects/hjc/web/src/screens/forms/PCMListScreen.tsx` with:

```tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { type Pastor, usePastors, useZones } from '../../api/hooks';
import './forms.css';

const STAGE_LABEL: Record<Pastor['pipeline_stage'], string> = {
  identified: 'Identified',
  engaged: 'Engaged',
  committed: 'Committed',
  active: 'Active',
  champion: 'Champion',
};

const STAGE_CLASS: Record<Pastor['pipeline_stage'], string> = {
  identified: 'pending',
  engaged: 'pending',
  committed: 'confirmed',
  active: 'confirmed',
  champion: 'confirmed',
};

const CONFIRMED_STAGES: Pastor['pipeline_stage'][] = ['committed', 'active', 'champion'];
const FUNNEL_STAGES: Pastor['pipeline_stage'][] = ['identified', 'engaged'];

export function PCMListScreen() {
  const navigate = useNavigate();
  const { data: page, isLoading, isError, refetch } = usePastors({ per_page: 50 });
  const { data: zones } = useZones();

  const pastors = useMemo(() => page?.data ?? [], [page]);
  const zoneById = useMemo(
    () => new Map((zones ?? []).map((z) => [z.id, z] as const)),
    [zones],
  );

  const confirmedCount = pastors.filter((p) => CONFIRMED_STAGES.includes(p.pipeline_stage)).length;
  const funnelCount = pastors.filter((p) => FUNNEL_STAGES.includes(p.pipeline_stage)).length;

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

            <div style={{ padding: '0 20px' }}>
              {pastors.map((p) => {
                const zone = p.zone_id != null ? zoneById.get(p.zone_id) : null;
                const zoneLabel = zone?.name ?? zone?.code ?? null;
                return (
                  <div key={p.id} className="form-list-row">
                    <div>
                      <div className="name">{p.full_name}</div>
                      <div className="sub">{zoneLabel ?? '—'}</div>
                    </div>
                    <div className="right">
                      <div className={'status ' + STAGE_CLASS[p.pipeline_stage]}>{STAGE_LABEL[p.pipeline_stage]}</div>
                      {p.phone && (
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{p.phone}</div>
                      )}
                    </div>
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
```

- [ ] **Step 2: Drop unused PCMRecord type if no longer imported**

```bash
cd /Users/adebimpegodwin/Projects/hjc && grep -rl "PCMRecord" web/src 2>/dev/null
```

Expected: empty (no other files import `PCMRecord`). The new PCMListScreen no longer exports it. Since the type is now dead, this is fine — the rewritten file already removes it.

If the grep finds matches: leave the type in place and note as a follow-up.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npx tsc -b; echo "exit=$?"
```

Expected: exit 0.

- [ ] **Step 4: Verify lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint 2>&1 | tail -3
```

Expected: same 4 baseline errors only.

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc && git add web/src/screens/forms/PCMListScreen.tsx && git commit -m "$(cat <<'EOF'
feat(web): wire PCMListScreen to /pastors

Drop submitQueue/localStorage path (getRecords + subscribe + SEED).
Read pastors from usePastors({ per_page: 50 }). Replace backgroundCheck
status (pending/cleared/flagged) with pipeline_stage
(identified/engaged/committed/active/champion); confirmed pill is
shown for committed+active+champion, gray pending pill for the funnel
stages. Stat strip shows X-of-Y confirmed and N in funnel.

Zone label resolves from useZones (zone.name preferred, falls back to
zone.code). Phone is rendered when present.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

- [ ] **Backend tests still pass (no backend changes, but sanity check)**

```bash
cd /Users/adebimpegodwin/Projects/hjc && php artisan test --filter='PastorApiTest|PastorIdentificationApiTest' 2>&1 | tail -10
```

Expected: existing pastor + identification tests pass unchanged.

- [ ] **Frontend build clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run build 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Frontend lint baseline unchanged**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web && npm run lint 2>&1 | tail -3
```

Expected: same 4 baseline errors only.

- [ ] **End-to-end manual smoke** (browser, run by user)

1. `php artisan migrate:fresh --seed`
2. Start `php artisan serve --port=8001` and `cd web && npm run dev`.
3. Log in.
4. Visit `/forms/pcm`. Confirm seeded pastors appear (whatever the seeder created — check stage pills + zones).
5. Click "Add new PCM". Fill in: full name, role "Senior Pastor", years in ministry 10, phone, optional email/address, zone. Click Continue.
6. On the Review screen, verify all fields render correctly. Click Submit PCM.
7. Network tab: should see `POST /api/pastors` (201) followed by `POST /api/pastors/{id}/identifications` (201). Then navigate to /forms/pcm.
8. New pastor appears in the list at pipeline_stage='identified' (gray "Identified" pill). Stat strip updates.
9. Visit `/`. Confirm Mission Control's pastors-won / stage counts re-fetched.
10. Optional partial-failure smoke: temporarily break the second endpoint (e.g. throw in PastorIdentificationController::store) and re-run the submit. Confirm the partial-failure block appears with Retry/Skip buttons. Restore the controller after.

---

## Self-review notes

**Spec coverage:**
- Decision 1 (two calls) — Tasks 1 + 2 (mutations + sequential await in handleSubmit).
- Decision 2 (partial-failure UX) — Task 2 (`partialFailure` state + Retry/Skip buttons).
- Decision 3 (wizard 4 → 2 steps) — Task 2 (STEPS array reduced; merged contact into basics; review remains).
- Decision 4 (drop fields) — Task 2 (Draft type + form bodies).
- Decisions 5-7 (years/zone/role mapping) — Task 2 (`pastor_since` calc, SelectField from useZones, sub_role at submit).
- Decision 8 (no edit) — no PATCH UI; nothing to enforce.
- Decision 9 (list status) — Task 3 (STAGE_LABEL/STAGE_CLASS by pipeline_stage).
- Decision 10 (show all pastors) — Task 3 (`usePastors` with no category filter).
- Decision 11 (keep draftStorage) — Task 2 (saveDraft/loadDraft/clearDraft retained).

**Type consistency:**
- `Pastor` interface (already defined in hooks.ts) used by Task 2 `useCreatePastor` return type and Task 3 list rendering.
- `Zone` interface used by Task 2 zone select and Task 3 zone label.
- `PastorIdentificationRow` (new in Task 1) used by Task 2 identification mutation return.
- Mutation body types match controller validation: `crusade_id`, `full_name`, `zone_id`, `phone`, `email`, `address`, `pastor_since`, `pipeline_stage` for pastors; `category`, `sub_role`, `assigned_at` for identifications.

**Placeholder scan:** All steps have runnable code or commands. No TBD/TODO. Step 2 of Task 3 has a conditional fallback ("if grep finds matches: leave the type in place") — explicit, not a placeholder.
