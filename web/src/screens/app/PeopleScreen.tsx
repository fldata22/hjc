import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell, AppBar, TabBar, Drawer } from './Shell';
import { getRecords, subscribe } from '../../lib/submitQueue';
import './app.css';

// Minimal local types — only the fields PeopleScreen reads. The forms own
// the canonical types (PCMRecord/BOTRecord/CPCRecord). Lift to a shared
// types file if a third consumer ever needs them.
type PCMRecord = { id?: string; fullName: string; role: string; phone: string };
type BOTRecord = { id?: string; name: string; role: string; phone: string };
type CPCRecord = { id?: string; fullName: string; role: string; phone: string };

type PersonType = 'pcm' | 'bot' | 'cpc';

type Person = {
  name: string;
  role: string;
  phone: string;
  type: PersonType;
  sourceId: string | undefined;
};

type ChipKey = 'all' | PersonType;

export function PeopleScreen() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const [pcmRecords, setPcmRecords] = useState<PCMRecord[]>(() => getRecords<PCMRecord>('pcm'));
  const [botRecords, setBotRecords] = useState<BOTRecord[]>(() => getRecords<BOTRecord>('bot'));
  const [cpcRecords, setCpcRecords] = useState<CPCRecord[]>(() => getRecords<CPCRecord>('cpc'));

  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<ChipKey>('all');

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setPcmRecords(getRecords<PCMRecord>('pcm'));
      setBotRecords(getRecords<BOTRecord>('bot'));
      setCpcRecords(getRecords<CPCRecord>('cpc'));
    });
    return () => { unsubscribe(); };
  }, []);

  const allPeople = useMemo<Person[]>(() => {
    const pcms: Person[] = pcmRecords.map((r) => ({
      name: r.fullName,
      role: r.role,
      phone: r.phone,
      type: 'pcm',
      sourceId: r.id,
    }));
    const bots: Person[] = botRecords.map((r) => ({
      name: r.name,
      role: r.role,
      phone: r.phone,
      type: 'bot',
      sourceId: r.id,
    }));
    const cpcs: Person[] = cpcRecords.map((r) => ({
      name: r.fullName,
      role: r.role,
      phone: r.phone,
      type: 'cpc',
      sourceId: r.id,
    }));
    return [...pcms, ...bots, ...cpcs].sort((a, b) => a.name.localeCompare(b.name));
  }, [pcmRecords, botRecords, cpcRecords]);

  const totalPeople = allPeople.length;
  const pcmCount = pcmRecords.length;
  const botCount = botRecords.length;
  const cpcCount = cpcRecords.length;

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPeople.filter((p) => {
      if (activeChip !== 'all' && p.type !== activeChip) return false;
      if (q === '') return true;
      return p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
    });
  }, [allPeople, search, activeChip]);

  const isEmpty = totalPeople === 0;

  return (
    <ResponsiveShell active="home">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div style={{ padding: '20px 20px 0' }}>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            People · crusade committee
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Directory.
          </h1>
        </div>

        {isEmpty ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            No people yet.<br/>
            Add a{' '}
            <button
              type="button"
              onClick={() => navigate('/forms/pcm')}
              style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}
            >
              PCM
            </button>
            ,{' '}
            <button
              type="button"
              onClick={() => navigate('/forms/bot')}
              style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}
            >
              BOT member
            </button>
            , or{' '}
            <button
              type="button"
              onClick={() => navigate('/forms/cpc')}
              style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}
            >
              CPC member
            </button>
            .
          </div>
        ) : (
          <>
            <div className="stat-strip">
              <div>
                <div className="num">{totalPeople}</div>
                <div className="lbl">people total</div>
              </div>
              <div style={{ flex: 1 }}/>
              <div>
                <div className="lbl">
                  <b>{pcmCount}</b> PCM · <b>{botCount}</b> BOT · <b>{cpcCount}</b> CPC
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px 0' }}>
              <input
                type="search"
                className="input bordered"
                placeholder="Search by name or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="chips">
              <div className={'chip' + (activeChip === 'all' ? ' on' : '')} onClick={() => setActiveChip('all')}>
                All<span className="n">{totalPeople}</span>
              </div>
              <div className={'chip' + (activeChip === 'pcm' ? ' on' : '')} onClick={() => setActiveChip('pcm')}>
                PCM<span className="n">{pcmCount}</span>
              </div>
              <div className={'chip' + (activeChip === 'bot' ? ' on' : '')} onClick={() => setActiveChip('bot')}>
                BOT<span className="n">{botCount}</span>
              </div>
              <div className={'chip' + (activeChip === 'cpc' ? ' on' : '')} onClick={() => setActiveChip('cpc')}>
                CPC<span className="n">{cpcCount}</span>
              </div>
            </div>

            {filteredPeople.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                No matches{search ? ` for "${search}"` : ''}.
              </div>
            ) : (
              <div style={{ padding: '0 20px' }}>
                {filteredPeople.map((p, i) => (
                  <button
                    type="button"
                    key={`${p.type}-${p.sourceId ?? p.name}-${i}`}
                    className="form-list-row"
                    onClick={() => navigate(`/forms/${p.type}`)}
                    style={{
                      background: 'transparent',
                      border: 0,
                      padding: '14px 0',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      width: '100%',
                    }}
                  >
                    <div>
                      <div className="name">{p.name}</div>
                      <div className="sub">{p.role}</div>
                    </div>
                    <div className="right">
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-3)',
                        border: '1px solid var(--line)',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}>
                        {p.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="bot-pad"/>
      </div>
      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
