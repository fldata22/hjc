import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell, type SaveStatus } from './FormShell';
import {
  TextField, TextareaField, PhoneField, NumberField,
  SegmentedField, SelectField, ChecklistField,
} from './fields';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draftStorage';
import { enqueue } from '../../lib/submitQueue';
import { useDebouncedCallback } from '../../lib/useDebouncedCallback';
import type { PCMRecord } from './PCMListScreen';
import './forms.css';

const FORM_SLUG = 'pcm';

const STEPS = [
  { id: 'identification', label: 'Identification' },
  { id: 'contact', label: 'Contact & Location' },
  { id: 'vetting', label: 'Vetting' },
  { id: 'review', label: 'Review' },
];

const DENOMINATIONS = [
  { value: 'pentecostal', label: 'Pentecostal' },
  { value: 'baptist', label: 'Baptist' },
  { value: 'methodist', label: 'Methodist' },
  { value: 'anglican', label: 'Anglican' },
  { value: 'catholic', label: 'Catholic' },
  { value: 'other', label: 'Other' },
];

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const CHARACTERISTICS = [
  'Ordained 5+ years',
  'Active congregation 100+',
  'No prior moral failures',
  'Fluent in local language',
  'Endorsed by district overseer',
  'Available throughout crusade window',
  'Owns transport',
];

const MIN_CHARACTERISTICS = 3;

const emptyForm: PCMRecord = {
  fullName: '', denomination: '', churchName: '', role: '', yearsInMinistry: '',
  phone: '', whatsapp: '', email: '', address: '', zone: '',
  backgroundCheck: 'pending',
  reference1Name: '', reference1Phone: '', reference2Name: '', reference2Phone: '',
  characteristicsMet: [],
  vettingNotes: '',
  attestation: false,
};

type DraftState = { stepId: string; data: PCMRecord };

function newDraftId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function PCMForm() {
  const navigate = useNavigate();
  const [draftId] = useState<string>(() => {
    const stored = sessionStorage.getItem('hjc_active_pcm_draft');
    if (stored) return stored;
    const id = newDraftId();
    sessionStorage.setItem('hjc_active_pcm_draft', id);
    return id;
  });
  const [stepId, setStepId] = useState<string>(STEPS[0].id);
  const [data, setData] = useState<PCMRecord>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasRestored, setHasRestored] = useState(false);

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

  const persist = useDebouncedCallback((next: PCMRecord, nextStepId: string) => {
    saveDraft<DraftState>(FORM_SLUG, draftId, { stepId: nextStepId, data: next });
    setSaveStatus('saved');
  }, 500);

  // Autosave once the restore step has run, so we don't overwrite stored
  // drafts with the initial empty form on first mount.
  useEffect(() => {
    if (!hasRestored) return;
    persist(data, stepId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveStatus('saving');
  }, [data, stepId, persist, hasRestored]);

  const update = <K extends keyof PCMRecord>(key: K, value: PCMRecord[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const validateStep = (id: string): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (id === 'identification') {
      if (!data.fullName.trim()) errs.fullName = 'Required';
      if (!data.denomination) errs.denomination = 'Required';
      if (!data.churchName.trim()) errs.churchName = 'Required';
      if (!data.role.trim()) errs.role = 'Required';
    } else if (id === 'contact') {
      if (!data.phone.trim()) errs.phone = 'Required';
      if (!data.zone) errs.zone = 'Required';
    } else if (id === 'vetting') {
      if (!data.backgroundCheck) errs.backgroundCheck = 'Required';
      if (!data.reference1Name.trim()) errs.reference1Name = 'Required';
      if (!data.reference1Phone.trim()) errs.reference1Phone = 'Required';
      if (data.characteristicsMet.length < MIN_CHARACTERISTICS) {
        errs.characteristicsMet = `Select at least ${MIN_CHARACTERISTICS}`;
      }
    } else if (id === 'review') {
      if (!data.attestation) errs.attestation = 'You must attest before submitting';
    }
    return errs;
  };

  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const isReview = stepId === 'review';

  const handleContinue = () => {
    const errs = validateStep(stepId);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (stepIndex < STEPS.length - 1) {
      setStepId(STEPS[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepId(STEPS[stepIndex - 1].id);
  };

  const handleSubmit = () => {
    const errs = validateStep('review');
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    enqueue<PCMRecord>(FORM_SLUG, data);
    clearDraft(FORM_SLUG, draftId);
    sessionStorage.removeItem('hjc_active_pcm_draft');
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
            ? { label: 'Submit PCM', onClick: handleSubmit, disabled: !data.attestation }
            : { label: 'Continue →', onClick: handleContinue }
        }
        secondaryAction={
          stepIndex > 0
            ? { label: 'Back', onClick: handleBack }
            : { label: 'Save draft', onClick: handleSaveDraft }
        }
      >
        <div className="fields">
          {stepId === 'identification' && (
            <>
              <TextField label="Full name" required value={data.fullName} onChange={(v) => update('fullName', v)} error={errors.fullName}/>
              <SelectField label="Denomination" required options={DENOMINATIONS} value={data.denomination} onChange={(v) => update('denomination', v)} placeholder="Select…" error={errors.denomination}/>
              <TextField label="Church name" required value={data.churchName} onChange={(v) => update('churchName', v)} error={errors.churchName}/>
              <TextField label="Role / title" required placeholder="e.g. Senior Pastor" value={data.role} onChange={(v) => update('role', v)} error={errors.role}/>
              <NumberField label="Years in ministry" suffix="yrs" value={data.yearsInMinistry} onChange={(v) => update('yearsInMinistry', v)}/>
              <div className="field">
                <div className="lbl"><span>Photo</span></div>
                <button type="button" className="btn" disabled style={{ opacity: 0.5 }}>+ Add photo (coming soon)</button>
              </div>
            </>
          )}

          {stepId === 'contact' && (
            <>
              <PhoneField label="Phone" required value={data.phone} onChange={(v) => update('phone', v)} error={errors.phone}/>
              <PhoneField label="WhatsApp" value={data.whatsapp} onChange={(v) => update('whatsapp', v)}/>
              <TextField label="Email" type="email" value={data.email} onChange={(v) => update('email', v)}/>
              <TextareaField label="Address" value={data.address} onChange={(v) => update('address', v)}/>
              <SelectField label="Zone" required options={ZONES} value={data.zone} onChange={(v) => update('zone', v)} placeholder="Select…" error={errors.zone}/>
              <div className="field">
                <div className="lbl"><span>GPS coordinates</span></div>
                <button type="button" className="btn" disabled style={{ opacity: 0.5 }}>Use my location (coming soon)</button>
              </div>
            </>
          )}

          {stepId === 'vetting' && (
            <>
              <SegmentedField
                label="Background check status"
                required
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'cleared', label: 'Cleared' },
                  { value: 'flagged', label: 'Flagged' },
                ]}
                value={data.backgroundCheck}
                onChange={(v) => update('backgroundCheck', v as PCMRecord['backgroundCheck'])}
                error={errors.backgroundCheck}
              />
              <TextField label="Reference 1 — name" required value={data.reference1Name} onChange={(v) => update('reference1Name', v)} error={errors.reference1Name}/>
              <PhoneField label="Reference 1 — phone" required value={data.reference1Phone} onChange={(v) => update('reference1Phone', v)} error={errors.reference1Phone}/>
              <TextField label="Reference 2 — name" value={data.reference2Name} onChange={(v) => update('reference2Name', v)}/>
              <PhoneField label="Reference 2 — phone" value={data.reference2Phone} onChange={(v) => update('reference2Phone', v)}/>
              <ChecklistField
                label="Characteristics met"
                items={CHARACTERISTICS}
                value={data.characteristicsMet}
                onChange={(v) => update('characteristicsMet', v)}
                required
                minRequired={MIN_CHARACTERISTICS}
                error={errors.characteristicsMet}
              />
              <TextareaField label="Vetting notes" value={data.vettingNotes} onChange={(v) => update('vettingNotes', v)}/>
            </>
          )}

          {stepId === 'review' && (
            <>
              <ReviewSection title="Identification" onEdit={() => setStepId('identification')}>
                <ReviewLine label="Full name" value={data.fullName}/>
                <ReviewLine label="Denomination" value={DENOMINATIONS.find((d) => d.value === data.denomination)?.label ?? data.denomination}/>
                <ReviewLine label="Church" value={data.churchName}/>
                <ReviewLine label="Role" value={data.role}/>
                {data.yearsInMinistry !== '' && <ReviewLine label="Years in ministry" value={`${data.yearsInMinistry} yrs`}/>}
              </ReviewSection>
              <ReviewSection title="Contact & Location" onEdit={() => setStepId('contact')}>
                <ReviewLine label="Phone" value={data.phone}/>
                {data.whatsapp && <ReviewLine label="WhatsApp" value={data.whatsapp}/>}
                {data.email && <ReviewLine label="Email" value={data.email}/>}
                {data.address && <ReviewLine label="Address" value={data.address}/>}
                <ReviewLine label="Zone" value={ZONES.find((z) => z.value === data.zone)?.label ?? data.zone}/>
              </ReviewSection>
              <ReviewSection title="Vetting" onEdit={() => setStepId('vetting')}>
                <ReviewLine label="Background check" value={data.backgroundCheck}/>
                <ReviewLine label="Reference 1" value={`${data.reference1Name} · ${data.reference1Phone}`}/>
                {data.reference2Name && <ReviewLine label="Reference 2" value={`${data.reference2Name} · ${data.reference2Phone}`}/>}
                <ReviewLine label="Characteristics met" value={`${data.characteristicsMet.length} of ${CHARACTERISTICS.length}`}/>
                {data.vettingNotes && <ReviewLine label="Notes" value={data.vettingNotes}/>}
              </ReviewSection>

              <SegmentedField
                label="Attestation"
                required
                options={[
                  { value: 'no', label: 'Not yet' },
                  { value: 'yes', label: 'I confirm vetted per HJC criteria' },
                ]}
                value={data.attestation ? 'yes' : 'no'}
                onChange={(v) => update('attestation', v === 'yes')}
                error={errors.attestation}
              />
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
