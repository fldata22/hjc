import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { getRecords, subscribe } from '../../lib/submitQueue';
import './forms.css';

export type PCMRecord = {
  id?: string;
  fullName: string;
  denomination: string;
  churchName: string;
  role: string;
  yearsInMinistry: number | '';
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  zone: string;
  backgroundCheck: 'pending' | 'cleared' | 'flagged';
  reference1Name: string;
  reference1Phone: string;
  reference2Name: string;
  reference2Phone: string;
  characteristicsMet: string[];
  vettingNotes: string;
  attestation: boolean;
  syncedAt?: string;
};

const FORM_SLUG = 'pcm';

const SEED: PCMRecord[] = [
  { fullName: 'Pst. Bernard Anchebah', denomination: 'pentecostal', churchName: 'Fountain Gate Wa', role: 'Senior Pastor', yearsInMinistry: 12, phone: '+233 24 555 0200', whatsapp: '', email: '', address: '', zone: 'wa-central', backgroundCheck: 'cleared', reference1Name: 'Bp. Lovell Asare', reference1Phone: '+233 24 555 9000', reference2Name: '', reference2Phone: '', characteristicsMet: ['Ordained 5+ years', 'Active congregation 100+', 'Endorsed by district overseer'], vettingNotes: '', attestation: true },
  { fullName: 'Rev. Kofi Adjei', denomination: 'methodist', churchName: 'Living Word Wa', role: 'Senior Pastor', yearsInMinistry: 8, phone: '+233 24 555 0201', whatsapp: '', email: '', address: '', zone: 'wa-north', backgroundCheck: 'cleared', reference1Name: 'Bp. Lovell Asare', reference1Phone: '+233 24 555 9000', reference2Name: '', reference2Phone: '', characteristicsMet: ['Ordained 5+ years', 'Active congregation 100+', 'Fluent in local language'], vettingNotes: '', attestation: true },
];

const STATUS_LABEL: Record<PCMRecord['backgroundCheck'], string> = {
  cleared: 'Confirmed',
  pending: 'Vetting',
  flagged: 'Flagged',
};

const STATUS_CLASS: Record<PCMRecord['backgroundCheck'], string> = {
  cleared: 'confirmed',
  pending: 'pending',
  flagged: 'declined',
};

export function PCMListScreen() {
  const navigate = useNavigate();
  const [pcms, setPcms] = useState<PCMRecord[]>(() => {
    const stored = getRecords<PCMRecord>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<PCMRecord>(FORM_SLUG);
      if (stored.length > 0) setPcms(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const confirmedCount = pcms.filter((p) => p.backgroundCheck === 'cleared').length;
  const vettingCount = pcms.filter((p) => p.backgroundCheck === 'pending').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>PCM <em>Primary Committee</em></>}
        pillar="P1"
        primaryAction={{ label: 'Add new PCM', onClick: () => navigate('/forms/pcm/new') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{confirmedCount}</div>
            <div className="lbl">of {pcms.length} confirmed</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{vettingCount}</b> in vetting</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {pcms.map((p, i) => (
            <div key={p.id ?? `${p.fullName}-${i}`} className="form-list-row">
              <div>
                <div className="name">{p.fullName}</div>
                <div className="sub">{p.churchName}{p.role && ` · ${p.role}`}</div>
              </div>
              <div className="right">
                <div className={'status ' + STATUS_CLASS[p.backgroundCheck]}>{STATUS_LABEL[p.backgroundCheck]}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{p.phone}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
