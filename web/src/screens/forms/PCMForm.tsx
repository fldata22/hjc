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
