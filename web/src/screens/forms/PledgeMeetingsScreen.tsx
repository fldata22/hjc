import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, SelectField, DateField, CurrencyField } from './fields';
import {
  useCrusade,
  usePastors,
  usePledgeMeetings,
  useCreatePledgeMeeting,
  useMarkPledgeAttendance,
  useRecordPledges,
  type PledgeMeeting,
  type PledgeResource,
} from '../../api/hooks';
import { ApiError } from '../../api/client';
import './forms.css';

const RESOURCES: Array<{ value: PledgeResource; label: string }> = [
  { value: 'choir', label: 'Choir members' },
  { value: 'prayer', label: 'Prayer warriors' },
  { value: 'ushers', label: 'Ushers' },
  { value: 'counsellors', label: 'Counsellors' },
  { value: 'buses', label: 'Buses' },
  { value: 'money', label: 'Money (₵)' },
];

type MeetingDraft = {
  sequence: string;
  held_on: string;
  venue: string;
  status: 'upcoming' | 'done';
};

const emptyMeeting: MeetingDraft = { sequence: '', held_on: '', venue: '', status: 'upcoming' };

type PledgeDraft = {
  pastor_id: number | '';
  resource: PledgeResource | '';
  quantity: number | '';
};

const emptyPledge: PledgeDraft = { pastor_id: '', resource: '', quantity: '' };

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

export function PledgeMeetingsScreen() {
  const navigate = useNavigate();
  const { data: crusade, isLoading: crusadeLoading, isError: crusadeError } = useCrusade();
  const { data: meetingsPage, isLoading: meetingsLoading, isError: meetingsError, refetch } = usePledgeMeetings();
  const { data: pastorsPage } = usePastors({ per_page: 100 });
  const createMutation = useCreatePledgeMeeting();
  const markAttendance = useMarkPledgeAttendance();
  const recordPledges = useRecordPledges();

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState<MeetingDraft>(emptyMeeting);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  const [expandedMeetingId, setExpandedMeetingId] = useState<number | null>(null);
  const [attendanceSelection, setAttendanceSelection] = useState<Set<number>>(new Set());
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [pledgeDraft, setPledgeDraft] = useState<PledgeDraft>(emptyPledge);
  const [pledgeError, setPledgeError] = useState<string | null>(null);
  const [pledgeOk, setPledgeOk] = useState<string | null>(null);

  const meetings = useMemo(() => meetingsPage?.data ?? [], [meetingsPage]);
  const pastors = useMemo(() => pastorsPage?.data ?? [], [pastorsPage]);
  const pastorsOptions = useMemo(
    () => pastors.map((p) => ({ value: String(p.id), label: p.full_name })),
    [pastors],
  );

  const handleAddMeeting = async () => {
    if (!crusade || meetingDraft.sequence.trim() === '' || meetingDraft.held_on === '' || meetingDraft.venue.trim() === '' || createMutation.isPending) return;
    setMeetingError(null);
    try {
      await createMutation.mutateAsync({
        crusade_id: crusade.id,
        sequence: meetingDraft.sequence.trim(),
        held_on: meetingDraft.held_on,
        venue: meetingDraft.venue.trim(),
        status: meetingDraft.status,
      });
      setMeetingDraft(emptyMeeting);
      setShowMeetingForm(false);
    } catch (e) {
      setMeetingError(extractApiMessage(e));
    }
  };

  const toggleExpand = (m: PledgeMeeting) => {
    if (expandedMeetingId === m.id) {
      setExpandedMeetingId(null);
      setShowAttendance(false);
      setAttendanceSelection(new Set());
      setPledgeDraft(emptyPledge);
      setPledgeOk(null);
      setPledgeError(null);
    } else {
      setExpandedMeetingId(m.id);
      setShowAttendance(false);
      setAttendanceSelection(new Set());
      setPledgeDraft(emptyPledge);
      setPledgeOk(null);
      setPledgeError(null);
    }
  };

  const togglePastorSelected = (pastorId: number) => {
    setAttendanceSelection((prev) => {
      const next = new Set(prev);
      if (next.has(pastorId)) next.delete(pastorId);
      else next.add(pastorId);
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (!expandedMeetingId || attendanceSelection.size === 0) return;
    setAttendanceError(null);
    try {
      await markAttendance.mutateAsync({
        meetingId: expandedMeetingId,
        pastorIds: Array.from(attendanceSelection),
      });
      setAttendanceSelection(new Set());
      setShowAttendance(false);
    } catch (e) {
      setAttendanceError(extractApiMessage(e));
    }
  };

  const handleAddPledge = async () => {
    if (!expandedMeetingId) return;
    if (typeof pledgeDraft.pastor_id !== 'number' || pledgeDraft.resource === '' || typeof pledgeDraft.quantity !== 'number' || pledgeDraft.quantity <= 0) return;
    setPledgeError(null);
    setPledgeOk(null);
    try {
      await recordPledges.mutateAsync({
        meetingId: expandedMeetingId,
        pledges: [{
          pastor_id: pledgeDraft.pastor_id,
          resource: pledgeDraft.resource,
          quantity: pledgeDraft.quantity,
        }],
      });
      const pastorName = pastors.find((p) => p.id === pledgeDraft.pastor_id)?.full_name ?? '';
      const resourceLabel = RESOURCES.find((r) => r.value === pledgeDraft.resource)?.label ?? pledgeDraft.resource;
      setPledgeOk(`Recorded ${pledgeDraft.quantity} ${resourceLabel} from ${pastorName}.`);
      setPledgeDraft(emptyPledge);
    } catch (e) {
      setPledgeError(extractApiMessage(e));
    }
  };

  if (crusadeError) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Pledge <em>Meetings</em></>} pillar="P1" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>Couldn't load crusade.</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  if (crusadeLoading || !crusade) {
    return (
      <ResponsiveShell active="forms">
        <FormShell title={<>Pledge <em>Meetings</em></>} pillar="P1" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        </FormShell>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell active="forms">
      <FormShell title={<>Pledge <em>Meetings</em></>} pillar="P1" primaryAction={{ label: 'Done', onClick: () => navigate('/forms') }}>
        <div className="stat-strip">
          <div>
            <div className="num">{meetings.length}</div>
            <div className="lbl">meetings scheduled</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {meetingsError ? (
            <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Couldn't load meetings.</span>
              <button type="button" onClick={() => refetch()} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : meetingsLoading ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : meetings.length === 0 ? (
            <div className="empty">No pledge meetings scheduled yet.</div>
          ) : (
            meetings.map((m) => {
              const isExpanded = expandedMeetingId === m.id;
              return (
                <div key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(m)}
                    className="form-list-row"
                    style={{ background: 'transparent', border: 0, padding: '14px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                  >
                    <div>
                      <div className="name">{m.sequence} · {m.venue}</div>
                      <div className="sub">{m.held_on}{m.attendees_count != null ? ` · ${m.attendees_count} attended` : ''}</div>
                    </div>
                    <div className="right">
                      <div className={'status ' + (m.status === 'done' ? 'confirmed' : 'pending')}>
                        {m.status === 'done' ? 'Done' : 'Upcoming'}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Attendance */}
                      <div>
                        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8 }}>
                          Attendance
                        </div>
                        {!showAttendance ? (
                          <button
                            type="button"
                            onClick={() => setShowAttendance(true)}
                            className="btn"
                            style={{ alignSelf: 'flex-start' }}
                          >
                            Mark attendees ({pastors.length} pastors available)
                          </button>
                        ) : (
                          <div style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 12, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {pastors.length === 0 ? (
                              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No pastors yet. Add via PCM first.</div>
                            ) : (
                              pastors.map((p) => (
                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={attendanceSelection.has(p.id)}
                                    onChange={() => togglePastorSelected(p.id)}
                                  />
                                  <span>{p.full_name}</span>
                                </label>
                              ))
                            )}
                            {attendanceError && <div className="field-error" style={{ marginTop: 4 }}>{attendanceError}</div>}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button type="button" className="btn" onClick={() => { setShowAttendance(false); setAttendanceSelection(new Set()); setAttendanceError(null); }}>Cancel</button>
                              <button
                                type="button"
                                className="btn primary"
                                onClick={handleSaveAttendance}
                                disabled={attendanceSelection.size === 0 || markAttendance.isPending}
                              >
                                {markAttendance.isPending ? 'Saving…' : `Save (${attendanceSelection.size})`}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Record a pledge */}
                      <div>
                        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8 }}>
                          Record a pledge
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <SelectField
                            label="Pastor"
                            options={pastorsOptions}
                            value={pledgeDraft.pastor_id === '' ? '' : String(pledgeDraft.pastor_id)}
                            onChange={(v) => setPledgeDraft({ ...pledgeDraft, pastor_id: v === '' ? '' : Number(v) })}
                            placeholder="Select…"
                          />
                          <SelectField
                            label="Resource"
                            options={RESOURCES}
                            value={pledgeDraft.resource}
                            onChange={(v) => setPledgeDraft({ ...pledgeDraft, resource: v as PledgeResource | '' })}
                            placeholder="Select…"
                          />
                          {pledgeDraft.resource === 'money' ? (
                            <CurrencyField label="Amount" value={pledgeDraft.quantity} onChange={(v) => setPledgeDraft({ ...pledgeDraft, quantity: v })}/>
                          ) : (
                            <TextField
                              label="Quantity"
                              placeholder="e.g. 12"
                              value={pledgeDraft.quantity === '' ? '' : String(pledgeDraft.quantity)}
                              onChange={(v) => {
                                const n = Number(v);
                                setPledgeDraft({ ...pledgeDraft, quantity: v === '' || Number.isNaN(n) ? '' : n });
                              }}
                            />
                          )}
                        </div>
                        {pledgeError && <div className="field-error" style={{ marginTop: 8 }}>{pledgeError}</div>}
                        {pledgeOk && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ok, #2a8c4a)' }}>{pledgeOk}</div>}
                        <div style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn primary"
                            onClick={handleAddPledge}
                            disabled={
                              recordPledges.isPending ||
                              typeof pledgeDraft.pastor_id !== 'number' ||
                              pledgeDraft.resource === '' ||
                              typeof pledgeDraft.quantity !== 'number' ||
                              pledgeDraft.quantity <= 0
                            }
                          >
                            {recordPledges.isPending ? 'Saving…' : 'Add pledge'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="add-toggle"
          onClick={() => {
            if (showMeetingForm) {
              setMeetingDraft(emptyMeeting);
              setMeetingError(null);
            }
            setShowMeetingForm((s) => !s);
          }}
        >
          {showMeetingForm ? 'Cancel' : 'Schedule meeting'}
        </button>

        {showMeetingForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Sequence" required placeholder="e.g. P1" value={meetingDraft.sequence} onChange={(v) => setMeetingDraft({ ...meetingDraft, sequence: v })}/>
              <DateField label="Held on" required value={meetingDraft.held_on} onChange={(v) => setMeetingDraft({ ...meetingDraft, held_on: v })}/>
              <TextField label="Venue" required placeholder="e.g. Wa Central church" value={meetingDraft.venue} onChange={(v) => setMeetingDraft({ ...meetingDraft, venue: v })}/>
              <SelectField
                label="Status"
                options={[
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'done', label: 'Done' },
                ]}
                value={meetingDraft.status}
                onChange={(v) => setMeetingDraft({ ...meetingDraft, status: v as 'upcoming' | 'done' })}
              />
            </div>

            {meetingError && (
              <div className="field-error" style={{ margin: '8px 0' }}>{meetingError}</div>
            )}

            <div className="row">
              <button type="button" className="btn" onClick={() => { setMeetingDraft(emptyMeeting); setMeetingError(null); }}>Clear</button>
              <button
                type="button"
                className="btn primary"
                onClick={handleAddMeeting}
                disabled={createMutation.isPending || meetingDraft.sequence.trim() === '' || meetingDraft.held_on === '' || meetingDraft.venue.trim() === ''}
              >
                {createMutation.isPending ? 'Saving…' : 'Schedule meeting'}
              </button>
            </div>
          </div>
        )}

        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
