import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type PledgeMeeting,
  type PledgeResource,
  useCreatePledgeMeeting,
  useCrusade,
  useMarkPledgeAttendance,
  usePastors,
  usePledgeMeetings,
  useRecordPledges,
} from '@/api/hooks';
import { Button, CurrencyField, DateField, NumberField, SelectField, TextField } from '@/components/ui/fields';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space, statusColors } from '@/theme/tokens';

const RESOURCES: { value: PledgeResource; label: string }[] = [
  { value: 'choir', label: 'Choir members' },
  { value: 'prayer', label: 'Prayer warriors' },
  { value: 'ushers', label: 'Ushers' },
  { value: 'counsellors', label: 'Counsellors' },
  { value: 'buses', label: 'Buses' },
  { value: 'money', label: 'Money (₵)' },
];

type MeetingDraft = { sequence: string; held_on: string; venue: string; status: 'upcoming' | 'done' };
const emptyMeeting: MeetingDraft = { sequence: '', held_on: '', venue: '', status: 'upcoming' };
type PledgeDraft = { pastor_id: number | ''; resource: PledgeResource | ''; quantity: number | '' };
const emptyPledge: PledgeDraft = { pastor_id: '', resource: '', quantity: '' };

export function PledgeMeetingsScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: meetingsPage, isLoading } = usePledgeMeetings();
  const { data: pastorsPage } = usePastors({ per_page: 100 });
  const createMeeting = useCreatePledgeMeeting();
  const markAttendance = useMarkPledgeAttendance();
  const recordPledges = useRecordPledges();

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState<MeetingDraft>(emptyMeeting);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [pledge, setPledge] = useState<PledgeDraft>(emptyPledge);
  const [pledgeOk, setPledgeOk] = useState<string | null>(null);

  const meetings = useMemo(() => meetingsPage?.data ?? [], [meetingsPage]);
  const pastors = useMemo(() => pastorsPage?.data ?? [], [pastorsPage]);
  const pastorOptions = useMemo(() => pastors.map((p) => ({ value: String(p.id), label: p.full_name })), [pastors]);

  const resetExpand = () => { setShowAttendance(false); setSelection(new Set()); setPledge(emptyPledge); setPledgeOk(null); };
  const toggleExpand = (m: PledgeMeeting) => { setExpandedId(expandedId === m.id ? null : m.id); resetExpand(); };

  const closeMeeting = () => { setShowMeetingForm(false); setMeetingDraft(emptyMeeting); };
  const addMeeting = async () => {
    if (!crusade || meetingDraft.sequence.trim() === '' || meetingDraft.held_on === '' || meetingDraft.venue.trim() === '' || createMeeting.isPending) return;
    await createMeeting.mutateAsync({
      crusade_id: crusade.id, sequence: meetingDraft.sequence.trim(), held_on: meetingDraft.held_on,
      venue: meetingDraft.venue.trim(), status: meetingDraft.status,
    });
    closeMeeting();
  };

  const togglePastor = (id: number) =>
    setSelection((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const saveAttendance = async () => {
    if (!expandedId || selection.size === 0) return;
    await markAttendance.mutateAsync({ meetingId: expandedId, pastorIds: Array.from(selection) });
    setSelection(new Set());
    setShowAttendance(false);
  };

  const addPledge = async () => {
    if (!expandedId || typeof pledge.pastor_id !== 'number' || pledge.resource === '' || typeof pledge.quantity !== 'number' || pledge.quantity <= 0) return;
    setPledgeOk(null);
    await recordPledges.mutateAsync({
      meetingId: expandedId,
      pledges: [{ pastor_id: pledge.pastor_id, resource: pledge.resource, quantity: pledge.quantity }],
    });
    const name = pastors.find((p) => p.id === pledge.pastor_id)?.full_name ?? '';
    const res = RESOURCES.find((r) => r.value === pledge.resource)?.label ?? pledge.resource;
    setPledgeOk(`Recorded ${pledge.quantity} ${res} from ${name}.`);
    setPledge(emptyPledge);
  };

  const canAddPledge = typeof pledge.pastor_id === 'number' && pledge.resource !== '' && typeof pledge.quantity === 'number' && pledge.quantity > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹ Back to forms</Text></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Pledges</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>P1</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>{meetings.length}</Text>
          <Text style={styles.statLabel}>meetings scheduled</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : meetings.length === 0 ? (
            <Text style={styles.empty}>No pledge meetings scheduled yet.</Text>
          ) : (
            meetings.map((m: PledgeMeeting, i) => {
              const expanded = expandedId === m.id;
              const sc = statusColors[m.status === 'done' ? 'confirmed' : 'pending'];
              return (
                <View key={m.id} style={i > 0 ? styles.divider : undefined}>
                  <Pressable style={styles.row} onPress={() => toggleExpand(m)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{m.sequence} · {m.venue}</Text>
                      <Text style={styles.sub}>{m.held_on}{m.attendees_count != null ? ` · ${m.attendees_count} attended` : ''}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                      <Text style={{ color: sc.fg, fontWeight: '700', fontSize: 11 }}>{m.status === 'done' ? 'Done' : 'Upcoming'}</Text>
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View style={styles.expand}>
                      {/* Attendance */}
                      <Text style={styles.subhead}>ATTENDANCE</Text>
                      {!showAttendance ? (
                        <Button label={`Mark attendees (${pastors.length} pastors)`} variant="ghost" onPress={() => setShowAttendance(true)} />
                      ) : (
                        <View style={styles.attBox}>
                          {pastors.length === 0 ? (
                            <Text style={styles.sub}>No pastors yet. Add via PCM first.</Text>
                          ) : (
                            pastors.map((p) => {
                              const on = selection.has(p.id);
                              return (
                                <Pressable key={p.id} style={styles.checkRow} onPress={() => togglePastor(p.id)}>
                                  <View style={[styles.checkbox, on && styles.checkboxOn]}>
                                    {on ? <Text style={styles.checkmark}>✓</Text> : null}
                                  </View>
                                  <Text style={styles.checkLabel}>{p.full_name}</Text>
                                </Pressable>
                              );
                            })
                          )}
                          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
                            <Button label="Cancel" variant="ghost" onPress={() => { setShowAttendance(false); setSelection(new Set()); }} />
                            <Button label={markAttendance.isPending ? 'Saving…' : `Save (${selection.size})`} onPress={saveAttendance} disabled={selection.size === 0 || markAttendance.isPending} />
                          </View>
                        </View>
                      )}

                      {/* Record a pledge */}
                      <Text style={[styles.subhead, { marginTop: space.lg }]}>RECORD A PLEDGE</Text>
                      <SelectField label="Pastor" options={pastorOptions} value={pledge.pastor_id === '' ? '' : String(pledge.pastor_id)} onChange={(v) => setPledge({ ...pledge, pastor_id: v === '' ? '' : Number(v) })} placeholder="Select…" />
                      <SelectField label="Resource" options={RESOURCES} value={pledge.resource} onChange={(v) => setPledge({ ...pledge, resource: v as PledgeResource | '' })} placeholder="Select…" />
                      {pledge.resource === 'money' ? (
                        <CurrencyField label="Amount" value={pledge.quantity} onChange={(v) => setPledge({ ...pledge, quantity: v })} />
                      ) : (
                        <NumberField label="Quantity" value={pledge.quantity} onChange={(v) => setPledge({ ...pledge, quantity: v })} />
                      )}
                      {pledgeOk ? <Text style={styles.okText}>{pledgeOk}</Text> : null}
                      <View style={{ marginTop: space.sm }}>
                        <Button label={recordPledges.isPending ? 'Saving…' : 'Add pledge'} onPress={addPledge} disabled={!canAddPledge || recordPledges.isPending} />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowMeetingForm(true)}><Text style={styles.addToggleText}>Schedule meeting</Text></Pressable>
      </ScrollView>

      <Sheet open={showMeetingForm} onClose={closeMeeting} title="Schedule meeting">
        <TextField label="Sequence" required placeholder="e.g. P1" value={meetingDraft.sequence} onChange={(v) => setMeetingDraft({ ...meetingDraft, sequence: v })} />
        <DateField label="Held on" required value={meetingDraft.held_on} onChange={(v) => setMeetingDraft({ ...meetingDraft, held_on: v })} />
        <TextField label="Venue" required placeholder="e.g. Wa Central church" value={meetingDraft.venue} onChange={(v) => setMeetingDraft({ ...meetingDraft, venue: v })} />
        <SelectField label="Status" options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'done', label: 'Done' }]} value={meetingDraft.status} onChange={(v) => setMeetingDraft({ ...meetingDraft, status: v as 'upcoming' | 'done' })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={closeMeeting} />
          <Button label={createMeeting.isPending ? 'Saving…' : 'Schedule'} onPress={addMeeting} disabled={createMeeting.isPending || meetingDraft.sequence.trim() === '' || meetingDraft.held_on === '' || meetingDraft.venue.trim() === ''} />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  back: { fontSize: 14, color: sand.ink2, marginBottom: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: sand.ink },
  pillarBadge: { backgroundColor: sand.accentBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillarText: { fontSize: 11, fontWeight: '800', color: sand.accent },
  statStrip: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  statNum: { fontSize: 30, fontWeight: '800', color: sand.ink },
  statLabel: { fontSize: 13, color: sand.ink3 },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 14 },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
  expand: { paddingBottom: space.lg, gap: space.xs },
  subhead: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: sand.ink3, marginBottom: space.sm },
  attBox: { borderWidth: 1, borderColor: sand.line2, borderRadius: radius.md, padding: space.md, maxHeight: 300 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: sand.line2, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: sand.ink, borderColor: sand.ink },
  checkmark: { color: sand.surface, fontSize: 12, fontWeight: '800' },
  checkLabel: { fontSize: 14, color: sand.ink },
  okText: { fontSize: 12, color: sand.ok, marginTop: space.sm },
  addToggle: { marginTop: space.lg, borderWidth: 1.5, borderColor: sand.ink, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  addToggleText: { fontSize: 14, fontWeight: '600', color: sand.ink },
});
