import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, TextareaField, SegmentedField, SelectField, ChecklistField, NumberField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import { todayISO } from '../../lib/dateHelpers';
import './forms.css';

type SurveyResponse = {
  id?: string;
  date: string;
  respondentName: string;
  ageRange: '<18' | '18-30' | '31-50' | '51+' | '';
  gender: 'm' | 'f' | 'prefer-not-to-say' | '';
  zone: string;
  religion: 'christian' | 'muslim' | 'traditional' | 'none' | 'other' | '';
  heardOfHJC: 'yes' | 'no' | '';
  heardOfCrusade: 'yes' | 'no' | '';
  channels: string[];
  planToAttend: 'definitely' | 'maybe' | 'no' | 'unsure' | '';
  bringOthers: number | '';
  concerns: string;
  surveyorNotes: string;
};

const FORM_SLUG = 'awareness-survey';

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const CHANNELS = ['Radio', 'TV', 'Social media', 'Poster', 'Friend', 'Church', 'Other'];

const SEED: SurveyResponse[] = [
  { date: todayISO(), respondentName: '', ageRange: '18-30', gender: 'f', zone: 'wa-central', religion: 'christian', heardOfHJC: 'yes', heardOfCrusade: 'yes', channels: ['Radio', 'Friend'], planToAttend: 'definitely', bringOthers: 3, concerns: '', surveyorNotes: '' },
  { date: todayISO(), respondentName: 'Mr. Issah', ageRange: '31-50', gender: 'm', zone: 'wa-north', religion: 'muslim', heardOfHJC: 'no', heardOfCrusade: 'no', channels: [], planToAttend: 'unsure', bringOthers: '', concerns: '', surveyorNotes: '' },
  { date: todayISO(), respondentName: '', ageRange: '51+', gender: 'f', zone: 'wa-south', religion: 'christian', heardOfHJC: 'yes', heardOfCrusade: 'yes', channels: ['Church'], planToAttend: 'definitely', bringOthers: 5, concerns: '', surveyorNotes: '' },
  { date: todayISO(), respondentName: 'Akosua', ageRange: '18-30', gender: 'f', zone: 'wa-east', religion: 'christian', heardOfHJC: 'yes', heardOfCrusade: 'no', channels: [], planToAttend: 'maybe', bringOthers: '', concerns: '', surveyorNotes: '' },
];

const emptyResponse = (): SurveyResponse => ({
  date: todayISO(),
  respondentName: '',
  ageRange: '',
  gender: '',
  zone: '',
  religion: '',
  heardOfHJC: '',
  heardOfCrusade: '',
  channels: [],
  planToAttend: '',
  bringOthers: '',
  concerns: '',
  surveyorNotes: '',
});

function awarenessSummary(r: SurveyResponse): string {
  if (r.heardOfCrusade === 'yes' && r.planToAttend === 'definitely') return 'Aware · attends';
  if (r.heardOfCrusade === 'yes' && (r.planToAttend === 'maybe' || r.planToAttend === 'unsure')) return 'Aware · maybe';
  if (r.heardOfCrusade === 'yes' && r.planToAttend === 'no') return 'Aware · not attending';
  if (r.heardOfCrusade === 'no') return 'Not aware';
  return '—';
}

export function AwarenessSurveyForm() {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<SurveyResponse[]>(() => {
    const stored = getRecords<SurveyResponse>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<SurveyResponse>(emptyResponse());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<SurveyResponse>(FORM_SLUG);
      if (stored.length > 0) setResponses(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const todayCount = responses.filter((r) => r.date === todayISO()).length;
  const awarenessPct = responses.length > 0
    ? Math.round(responses.filter((r) => r.heardOfCrusade === 'yes').length / responses.length * 100)
    : 0;

  const canSave =
    draft.ageRange !== '' &&
    draft.gender !== '' &&
    draft.zone !== '' &&
    draft.religion !== '' &&
    draft.heardOfHJC !== '' &&
    draft.heardOfCrusade !== '' &&
    draft.planToAttend !== '';

  const handleSave = () => {
    enqueue<SurveyResponse>(FORM_SLUG, { ...draft, date: todayISO() });
    setDraft(emptyResponse());
    // Keep form open for rapid-fire surveys.
  };

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>Awareness <em>Survey</em></>}
        pillar="A9"
        primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{todayCount}</div>
            <div className="lbl">surveys today</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{responses.length > 0 ? `${awarenessPct}%` : '—'}</b> aware overall</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {responses.slice(0, 10).map((r, i) => (
            <div key={r.id ?? `${r.respondentName}-${i}`} className="form-list-row">
              <div>
                <div className="name">{r.respondentName.trim() || 'Anon'}</div>
                <div className="sub">{r.ageRange || '—'} · {awarenessSummary(r)}</div>
              </div>
              <div className="right">
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{r.zone || '—'}</div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add survey'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="cat-head" style={{ padding: '8px 0', marginBottom: 4 }}>
              <span>Respondent</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Respondent name" placeholder="Optional" value={draft.respondentName} onChange={(v) => setDraft({ ...draft, respondentName: v })}/>
              <SegmentedField
                label="Age range"
                required
                options={[
                  { value: '<18', label: '<18' },
                  { value: '18-30', label: '18–30' },
                  { value: '31-50', label: '31–50' },
                  { value: '51+', label: '51+' },
                ]}
                value={draft.ageRange}
                onChange={(v) => setDraft({ ...draft, ageRange: v as SurveyResponse['ageRange'] })}
              />
              <SegmentedField
                label="Gender"
                required
                options={[
                  { value: 'm', label: 'M' },
                  { value: 'f', label: 'F' },
                  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                ]}
                value={draft.gender}
                onChange={(v) => setDraft({ ...draft, gender: v as SurveyResponse['gender'] })}
              />
              <SelectField label="Zone" required options={ZONES} value={draft.zone} onChange={(v) => setDraft({ ...draft, zone: v })} placeholder="Select zone…"/>
              <SegmentedField
                label="Religion"
                required
                options={[
                  { value: 'christian', label: 'Christian' },
                  { value: 'muslim', label: 'Muslim' },
                  { value: 'traditional', label: 'Traditional' },
                  { value: 'none', label: 'None' },
                  { value: 'other', label: 'Other' },
                ]}
                value={draft.religion}
                onChange={(v) => setDraft({ ...draft, religion: v as SurveyResponse['religion'] })}
              />
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Awareness</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <SegmentedField
                label="Heard of HJC?"
                required
                options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                value={draft.heardOfHJC}
                onChange={(v) => setDraft({ ...draft, heardOfHJC: v as SurveyResponse['heardOfHJC'] })}
              />
              <SegmentedField
                label="Heard of upcoming crusade?"
                required
                options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                value={draft.heardOfCrusade}
                onChange={(v) => setDraft({ ...draft, heardOfCrusade: v as SurveyResponse['heardOfCrusade'] })}
              />
              <ChecklistField
                label="How did you hear?"
                items={CHANNELS}
                value={draft.channels}
                onChange={(v) => setDraft({ ...draft, channels: v })}
              />
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Engagement</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <SegmentedField
                label="Plan to attend?"
                required
                options={[
                  { value: 'definitely', label: 'Definitely' },
                  { value: 'maybe', label: 'Maybe' },
                  { value: 'no', label: 'No' },
                  { value: 'unsure', label: 'Unsure' },
                ]}
                value={draft.planToAttend}
                onChange={(v) => setDraft({ ...draft, planToAttend: v as SurveyResponse['planToAttend'] })}
              />
              <NumberField label="Likely to bring others" suffix="people" value={draft.bringOthers} onChange={(v) => setDraft({ ...draft, bringOthers: v })}/>
              <TextareaField label="Concerns / barriers" value={draft.concerns} onChange={(v) => setDraft({ ...draft, concerns: v })}/>
            </div>

            <div className="cat-head" style={{ padding: '20px 0 8px', marginBottom: 4 }}>
              <span>Worker observations</span>
            </div>
            <div className="fields" style={{ padding: 0 }}>
              <TextareaField label="Surveyor notes" value={draft.surveyorNotes} onChange={(v) => setDraft({ ...draft, surveyorNotes: v })}/>
            </div>

            <div className="row">
              <button type="button" className="btn" onClick={() => setDraft(emptyResponse())}>Clear</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>Save survey</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
