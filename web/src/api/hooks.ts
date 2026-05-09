import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface MissionControlData {
  top_stats: {
    days_to_go: number;
    financial: { spent: string; total: string; pct: string };
    pastors_won: { n: number; target: number; pct: string };
    awareness_pct: string;
  };
  powers: Array<{ code: string; name: string; order_index: number; value_pct: number | null; status: 'success' | 'warning' | 'danger' | 'muted' }>;
  context: {
    population: number | null;
    pap: number | null;
    zones_count: number;
    conference_registered: number;
    conference_capacity: number;
    convoy_actual: number;
    convoy_target: number;
    makarios_actual: number;
    makarios_target: number;
    permits_approved: number;
    permits_total: number;
  };
  top_risks: Array<{ ordering: number; severity: 'critical' | 'high' | 'medium'; text: string }>;
  crusade: { id: number; name: string; city: string; opens_at: string; closes_at: string };
}

export function useMissionControl() {
  return useQuery({
    queryKey: ['mission-control'],
    queryFn: () => apiFetch<{ data: MissionControlData }>('/mission-control').then((r) => r.data),
  });
}

// === Powers ===
export interface Power { id: number; code: string; name: string; order_index: number; description: string | null; }

export function usePowers() {
  return useQuery({
    queryKey: ['powers'],
    queryFn: () => apiFetch<{ data: Power[] }>('/powers').then((r) => r.data),
  });
}

export function usePower(code: string | undefined) {
  return useQuery({
    queryKey: ['power', code],
    queryFn: () => apiFetch<{ data: Power }>(`/powers/${code}`).then((r) => r.data),
    enabled: !!code,
  });
}

// === Pastors ===
export interface Pastor {
  id: number; crusade_id: number; full_name: string; church_id: number | null; zone_id: number | null;
  phone: string | null; email: string | null; address: string | null;
  pastor_since: number | null;
  pipeline_stage: 'identified' | 'engaged' | 'committed' | 'active' | 'champion';
  last_contact_at: string | null;
}

export interface PastorsResponse {
  data: Pastor[];
  meta: { current_page: number; total: number; per_page: number; last_page: number };
}

export function usePastors(filters: { q?: string; pipeline_stage?: string; per_page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.pipeline_stage) params.set('pipeline_stage', filters.pipeline_stage);
  params.set('per_page', String(filters.per_page ?? 25));
  return useQuery({
    queryKey: ['pastors', filters],
    queryFn: () => apiFetch<PastorsResponse>(`/pastors?${params.toString()}`),
  });
}

export function usePastor(id: string | number | undefined) {
  return useQuery({
    queryKey: ['pastor', id],
    queryFn: () => apiFetch<{ data: Pastor & { identifications: any[]; pledge_totals: Record<string, string> } }>(`/pastors/${id}`).then((r) => r.data),
    enabled: id != null,
  });
}

// === Pastor stage counts ===
export interface PastorStageCounts {
  identified: number; engaged: number; committed: number; active: number; champion: number; total: number;
}

export function usePastorStageCounts() {
  return useQuery({
    queryKey: ['pastor-stage-counts'],
    queryFn: () => apiFetch<{ data: PastorStageCounts }>('/pastors/stage-counts').then((r) => r.data),
  });
}

// === Awareness trajectory ===
export interface AwarenessTrajectoryRow { survey_number: number; surveyed_total: number; attending_yes_total: number; pct: string; }

export function useAwarenessTrajectory() {
  return useQuery({
    queryKey: ['awareness-trajectory'],
    queryFn: () => apiFetch<{ data: AwarenessTrajectoryRow[] }>('/awareness-surveys/trajectory').then((r) => r.data),
  });
}

// === Activity entries ===
export interface ActivityEntry {
  id: number; crusade_id: number; user_id: number; occurred_at: string;
  description: string; status: 'done' | 'running';
  power: { id: number; code: string; name: string };
}

export interface ActivityEntriesResponse {
  data: ActivityEntry[];
  meta: { current_page: number; total: number; per_page: number; last_page: number };
}

export function useActivityEntries(filters: { date?: string; power?: string; per_page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.power) params.set('power', filters.power);
  params.set('per_page', String(filters.per_page ?? 25));
  return useQuery({
    queryKey: ['activity-entries', filters],
    queryFn: () => apiFetch<ActivityEntriesResponse>(`/activity-entries?${params.toString()}`),
  });
}

export function useCreateActivityEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { crusade_id: number; occurred_at: string; description: string; power_id?: number; power_code?: string; status?: 'done' | 'running' }) =>
      apiFetch<{ data: ActivityEntry }>('/activity-entries', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-entries'] }),
  });
}

// === Weekly assessment ===
export interface WeeklyAssessment {
  id: number; crusade_id: number; week_number: number; prompted_at: string;
  self_score: number | null; notes: string | null; decisions_needed: string | null; submitted_at: string | null;
  readings?: Array<{ id: number; power_id: number; value_pct: number; power: { id: number; code: string; name: string } }>;
  risks?: Array<{ id: number; ordering: number; severity: 'critical' | 'high' | 'medium'; text: string }>;
}

export function useWeeklyLatest() {
  return useQuery({
    queryKey: ['weekly-latest'],
    queryFn: () => apiFetch<{ data: WeeklyAssessment }>('/weekly-assessments/latest').then((r) => r.data),
    retry: false,
  });
}

export function useReplaceReadings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, readings }: { id: number; readings: Array<{ power_id: number; value_pct: number }> }) =>
      apiFetch(`/weekly-assessments/${id}/readings`, { method: 'PUT', body: JSON.stringify({ readings }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-latest'] }),
  });
}

export function useReplaceRisks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, risks }: { id: number; risks: Array<{ ordering: number; severity: string; text: string }> }) =>
      apiFetch(`/weekly-assessments/${id}/risks`, { method: 'PUT', body: JSON.stringify({ risks }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-latest'] }),
  });
}

// === Crusade (singleton) ===
export interface Crusade {
  id: number; name: string; city: string; opens_at: string; closes_at: string;
  budget_total: string; pastors_target: number; awareness_target_pct: number;
  population: number | null; pap: number | null; convoy_target: number; makarios_target: number;
}

export function useCrusade() {
  return useQuery({
    queryKey: ['crusade'],
    queryFn: () => apiFetch<{ data: Crusade }>('/crusade').then((r) => r.data),
  });
}

// === Zones ===
export interface Zone {
  id: number;
  crusade_id: number;
  code: string;
  name: string | null;
  population: number | null;
  pap: number | null;
}

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: () => apiFetch<{ data: Zone[] }>('/zones').then((r) => r.data),
  });
}

// === Awareness surveys (aggregate rows) ===
export interface AwarenessSurveyRow {
  id: number;
  crusade_id: number;
  zone_id: number;
  survey_number: number;
  surveyed_count: number;
  attending_yes_count: number;
  taken_on: string;
  created_at: string;
  updated_at: string;
}

export function useAwarenessSurveys() {
  return useQuery({
    queryKey: ['awareness-surveys'],
    queryFn: () => apiFetch<{ data: AwarenessSurveyRow[] }>('/awareness-surveys').then((r) => r.data),
  });
}

export function useCreateAwarenessSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      zone_id: number;
      survey_number: number;
      surveyed_count: number;
      attending_yes_count: number;
      taken_on: string;
    }) =>
      apiFetch<{ data: AwarenessSurveyRow }>('/awareness-surveys', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awareness-surveys'] });
      qc.invalidateQueries({ queryKey: ['awareness-trajectory'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}

// === Committee members (BOT + CPC roster) ===
export type CommitteeKind = 'bot' | 'cpc';

export interface CommitteeMember {
  id: number;
  crusade_id: number;
  kind: CommitteeKind;
  name: string;
  role: string;
  org: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCommitteeMembers(kind: CommitteeKind) {
  return useQuery({
    queryKey: ['committee-members', kind],
    queryFn: () =>
      apiFetch<{ data: CommitteeMember[] }>(`/committee-members?kind=${kind}`).then((r) => r.data),
  });
}

export function useCreateCommitteeMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      kind: CommitteeKind;
      name: string;
      role: string;
      org: string | null;
      phone: string | null;
      email: string | null;
      status: string;
      notes: string | null;
    }) =>
      apiFetch<{ data: CommitteeMember }>('/committee-members', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['committee-members', vars.kind] });
    },
  });
}

// === Budget categories + transactions + summary ===
export interface BudgetCategory {
  id: number;
  crusade_id: number;
  name: string;
  allocated_amount: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetTransaction {
  id: number;
  crusade_id: number;
  budget_category_id: number | null;
  description: string;
  occurred_on: string;
  kind: 'income' | 'expense';
  amount: string;
  receipt_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetSummary {
  total_budget: string;
  income: string;
  spent: string;
  committed: string;
  gap_to_target: string;
  pct_spent_of_total: string;
  categories: Array<{
    id: number;
    name: string;
    allocated_amount: string;
    spent: string;
    pct_spent: string;
  }>;
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: ['budget-categories'],
    queryFn: () => apiFetch<{ data: BudgetCategory[] }>('/budget-categories').then((r) => r.data),
  });
}

export function useExpenseTransactions(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['budget-transactions', 'expense', dateFrom, dateTo],
    queryFn: () =>
      apiFetch<{
        data: BudgetTransaction[];
        meta: { current_page: number; total: number; per_page: number; last_page: number };
      }>(
        `/budget-transactions?kind=expense&date_from=${dateFrom}&date_to=${dateTo}&per_page=100`,
      ),
  });
}

export function useBudgetSummary() {
  return useQuery({
    queryKey: ['budget-summary'],
    queryFn: () => apiFetch<{ data: BudgetSummary }>('/budget/summary').then((r) => r.data),
  });
}

export function useCreateExpenseTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      crusade_id: number;
      budget_category_id: number | null;
      description: string;
      occurred_on: string;
      amount: number;
      receipt_photo: Blob | null;
    }) => {
      const fd = new FormData();
      fd.set('crusade_id', String(input.crusade_id));
      if (input.budget_category_id != null) fd.set('budget_category_id', String(input.budget_category_id));
      fd.set('description', input.description);
      fd.set('occurred_on', input.occurred_on);
      fd.set('kind', 'expense');
      fd.set('amount', String(input.amount));
      if (input.receipt_photo) fd.set('receipt_photo', input.receipt_photo, 'receipt.jpg');
      return apiFetch<{ data: BudgetTransaction }>('/budget-transactions', {
        method: 'POST',
        body: fd,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-transactions'] });
      qc.invalidateQueries({ queryKey: ['budget-summary'] });
      qc.invalidateQueries({ queryKey: ['mission-control'] });
    },
  });
}

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

// === Town profiles ===
export interface TownProfile {
  id: number;
  zone_id: number;
  language_primary: string | null;
  language_secondary: string | null;
  religion_primary: string | null;
  religion_mix_notes: string | null;
  prior_crusade_year: number | null;
  prior_crusade_notes: string | null;
  key_contacts: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTownProfiles() {
  return useQuery({
    queryKey: ['town-profiles'],
    queryFn: () => apiFetch<{ data: TownProfile[] }>('/town-profiles').then((r) => r.data),
  });
}

export function useCreateTownProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      zone_id: number;
      language_primary?: string | null;
      language_secondary?: string | null;
      religion_primary?: string | null;
      religion_mix_notes?: string | null;
      prior_crusade_year?: number | null;
      prior_crusade_notes?: string | null;
      key_contacts?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: TownProfile }>('/town-profiles', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['town-profiles'] });
    },
  });
}

export function useUpdateTownProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        language_primary: string | null;
        language_secondary: string | null;
        religion_primary: string | null;
        religion_mix_notes: string | null;
        prior_crusade_year: number | null;
        prior_crusade_notes: string | null;
        key_contacts: string | null;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: TownProfile }>(`/town-profiles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['town-profiles'] });
    },
  });
}

// === Venue inspections ===
export interface VenueInspection {
  id: number;
  crusade_id: number;
  inspected_at: string;
  inspector_name: string;
  capacity_verified: boolean;
  exits_clear: boolean;
  power_tested: boolean;
  sound_tested: boolean;
  permits_status: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useVenueInspections(filters: { date_from?: string; date_to?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  return useQuery({
    queryKey: ['venue-inspections', filters],
    queryFn: () =>
      apiFetch<{ data: VenueInspection[] }>(`/venue-inspections${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateVenueInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      crusade_id: number;
      inspected_at: string;
      inspector_name: string;
      capacity_verified: boolean;
      exits_clear: boolean;
      power_tested: boolean;
      sound_tested: boolean;
      permits_status: string | null;
      notes: string | null;
      photo: Blob | null;
    }) => {
      const fd = new FormData();
      fd.set('crusade_id', String(input.crusade_id));
      fd.set('inspected_at', input.inspected_at);
      fd.set('inspector_name', input.inspector_name);
      fd.set('capacity_verified', input.capacity_verified ? '1' : '0');
      fd.set('exits_clear', input.exits_clear ? '1' : '0');
      fd.set('power_tested', input.power_tested ? '1' : '0');
      fd.set('sound_tested', input.sound_tested ? '1' : '0');
      if (input.permits_status) fd.set('permits_status', input.permits_status);
      if (input.notes) fd.set('notes', input.notes);
      if (input.photo) fd.set('photo', input.photo, 'inspection.jpg');
      return apiFetch<{ data: VenueInspection }>('/venue-inspections', {
        method: 'POST',
        body: fd,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venue-inspections'] });
    },
  });
}

// === Must-do items ===
export type MustDoArea = 'venue' | 'publicity' | 'permits' | 'logistics' | 'other';
export type MustDoStatus = 'pending' | 'in_progress' | 'done';

export interface MustDoItem {
  id: number;
  crusade_id: number;
  area: MustDoArea;
  title: string;
  owner_name: string | null;
  due_date: string | null;
  status: MustDoStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useMustDoItems(filters: { status?: MustDoStatus; area?: MustDoArea } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.area) params.set('area', filters.area);
  const qs = params.toString();
  return useQuery({
    queryKey: ['must-do-items', filters],
    queryFn: () =>
      apiFetch<{ data: MustDoItem[] }>(`/must-do-items${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateMustDoItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      area: MustDoArea;
      title: string;
      owner_name?: string | null;
      due_date?: string | null;
      status?: MustDoStatus;
      notes?: string | null;
    }) =>
      apiFetch<{ data: MustDoItem }>('/must-do-items', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['must-do-items'] });
    },
  });
}

export function useUpdateMustDoItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        area: MustDoArea;
        title: string;
        owner_name: string | null;
        due_date: string | null;
        status: MustDoStatus;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: MustDoItem }>(`/must-do-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['must-do-items'] });
    },
  });
}

export function useDeleteMustDoItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/must-do-items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['must-do-items'] });
    },
  });
}

// === Stakeholders (VIP funnel) ===
export type StakeholderStatus = 'identified' | 'engaged' | 'committed' | 'won';

export interface Stakeholder {
  id: number;
  crusade_id: number;
  name: string;
  org: string;
  role: string;
  pipeline_stage: number;
  status_label: StakeholderStatus;
  last_contact_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const STAKEHOLDER_STAGE: Record<StakeholderStatus, number> = {
  identified: 1,
  engaged: 2,
  committed: 3,
  won: 4,
};

export function useStakeholders() {
  return useQuery({
    queryKey: ['stakeholders'],
    queryFn: () => apiFetch<{ data: Stakeholder[] }>('/stakeholders').then((r) => r.data),
  });
}

export function useCreateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      name: string;
      org: string;
      role: string;
      status_label: StakeholderStatus;
      last_contact_at?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: Stakeholder }>('/stakeholders', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          pipeline_stage: STAKEHOLDER_STAGE[body.status_label],
        }),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stakeholders'] });
    },
  });
}

export function useUpdateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        name: string;
        org: string;
        role: string;
        status_label: StakeholderStatus;
        last_contact_at: string | null;
        notes: string | null;
      }>;
    }) => {
      const payload: Record<string, unknown> = { ...body };
      if (body.status_label) {
        payload.pipeline_stage = STAKEHOLDER_STAGE[body.status_label];
      }
      return apiFetch<{ data: Stakeholder }>(`/stakeholders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stakeholders'] });
    },
  });
}

export function useDeleteStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/stakeholders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stakeholders'] });
    },
  });
}

// === Pledge meetings ===
export type PledgeMeetingStatus = 'upcoming' | 'done';
export type PledgeResource = 'choir' | 'prayer' | 'ushers' | 'counsellors' | 'buses' | 'money';

export interface PledgeMeeting {
  id: number;
  crusade_id: number;
  sequence: string;
  held_on: string;
  venue: string;
  status: PledgeMeetingStatus;
  attendees_count?: number;
  created_at: string;
  updated_at: string;
}

export function usePledgeMeetings() {
  return useQuery({
    queryKey: ['pledge-meetings'],
    queryFn: () =>
      apiFetch<{
        data: PledgeMeeting[];
        meta: { current_page: number; total: number; per_page: number; last_page: number };
      }>('/pledge-meetings?per_page=100'),
  });
}

export function usePledgeMeeting(id: number | undefined) {
  return useQuery({
    queryKey: ['pledge-meeting', id],
    queryFn: () =>
      apiFetch<{ data: PledgeMeeting }>(`/pledge-meetings/${id}`).then((r) => r.data),
    enabled: id != null,
  });
}

export function useCreatePledgeMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      sequence: string;
      held_on: string;
      venue: string;
      status?: PledgeMeetingStatus;
    }) =>
      apiFetch<{ data: PledgeMeeting }>('/pledge-meetings', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pledge-meetings'] });
    },
  });
}

export function useUpdatePledgeMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{ sequence: string; held_on: string; venue: string; status: PledgeMeetingStatus }>;
    }) =>
      apiFetch<{ data: PledgeMeeting }>(`/pledge-meetings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['pledge-meetings'] });
      qc.invalidateQueries({ queryKey: ['pledge-meeting', vars.id] });
    },
  });
}

export function useMarkPledgeAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, pastorIds }: { meetingId: number; pastorIds: number[] }) =>
      apiFetch<{ data: { attendees_count: number } }>(`/pledge-meetings/${meetingId}/attendances`, {
        method: 'POST',
        body: JSON.stringify({ pastor_ids: pastorIds }),
      }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['pledge-meetings'] });
      qc.invalidateQueries({ queryKey: ['pledge-meeting', vars.meetingId] });
    },
  });
}

export function useRecordPledges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, pledges }: {
      meetingId: number;
      pledges: Array<{ pastor_id: number; resource: PledgeResource; quantity: number }>;
    }) =>
      apiFetch<{ data: { created: number } }>(`/pledge-meetings/${meetingId}/pledges`, {
        method: 'POST',
        body: JSON.stringify({ pledges }),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pledges-summary'] });
    },
  });
}

// === Pledges summary ===
export interface PledgeSummary {
  totals: Record<PledgeResource, string>;
}

export function usePledgesSummary() {
  return useQuery({
    queryKey: ['pledges-summary'],
    queryFn: () => apiFetch<{ data: PledgeSummary }>('/pledges/summary').then((r) => r.data),
  });
}

// === Workers (umbrella roster) ===
export type WorkerGroup =
  | 'choir' | 'ushers' | 'security' | 'counsellors' | 'prayer_warriors'
  | 'hospitality' | 'technical' | 'medical' | 'childrens' | 'general';
export type WorkerStatus = 'active' | 'inactive';

export interface Worker {
  id: number;
  crusade_id: number;
  group_type: WorkerGroup;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  status: WorkerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkers(filters: { group_type?: WorkerGroup; status?: WorkerStatus } = {}) {
  const params = new URLSearchParams();
  if (filters.group_type) params.set('group_type', filters.group_type);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return useQuery({
    queryKey: ['workers', filters],
    queryFn: () =>
      apiFetch<{ data: Worker[] }>(`/workers${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      group_type: WorkerGroup;
      name: string;
      role?: string | null;
      phone?: string | null;
      email?: string | null;
      status?: WorkerStatus;
      notes?: string | null;
    }) =>
      apiFetch<{ data: Worker }>('/workers', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        group_type: WorkerGroup;
        name: string;
        role: string | null;
        phone: string | null;
        email: string | null;
        status: WorkerStatus;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: Worker }>(`/workers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useDeleteWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/workers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

// === Permits ===
export type PermitStatus = 'in_review' | 'approved' | 'rejected';

export interface Permit {
  id: number;
  crusade_id: number;
  name: string;
  agency: string;
  status: PermitStatus;
  due_on: string | null;
  signed_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermitsResponse {
  data: Permit[];
  meta: {
    status_counts: Record<PermitStatus, number>;
  };
}

export function usePermits() {
  return useQuery({
    queryKey: ['permits'],
    queryFn: () => apiFetch<PermitsResponse>('/permits'),
  });
}

export function useCreatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      name: string;
      agency: string;
      status?: PermitStatus;
      due_on?: string | null;
      signed_on?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: Permit }>('/permits', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permits'] });
    },
  });
}

export function useUpdatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        name: string;
        agency: string;
        status: PermitStatus;
        due_on: string | null;
        signed_on: string | null;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: Permit }>(`/permits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permits'] });
    },
  });
}

export function useDeletePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/permits/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permits'] });
    },
  });
}

// === Sound & Lighting Plan (singleton) ===
export interface SoundLightingPlan {
  id: number;
  crusade_id: number;
  sound_provider: string | null;
  sound_capacity_notes: string | null;
  lighting_provider: string | null;
  lighting_setup_notes: string | null;
  generator_provider: string | null;
  generator_kva: number | null;
  has_backup_power: boolean;
  power_notes: string | null;
  equipment_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSoundLightingPlan() {
  return useQuery({
    queryKey: ['sound-lighting-plan'],
    queryFn: () =>
      apiFetch<{ data: SoundLightingPlan | null }>('/sound-lighting-plan').then((r) => r.data),
  });
}

export function useUpsertSoundLightingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<{
      sound_provider: string | null;
      sound_capacity_notes: string | null;
      lighting_provider: string | null;
      lighting_setup_notes: string | null;
      generator_provider: string | null;
      generator_kva: number | null;
      has_backup_power: boolean;
      power_notes: string | null;
      equipment_notes: string | null;
    }>) =>
      apiFetch<{ data: SoundLightingPlan }>('/sound-lighting-plan', {
        method: 'PUT',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sound-lighting-plan'] });
    },
  });
}

// === Seating Plan (singleton) ===
export interface SeatingPlan {
  id: number;
  crusade_id: number;
  estimated_capacity: number | null;
  vip_seating_count: number | null;
  general_seating_count: number | null;
  counsellor_area_count: number | null;
  chair_source: string | null;
  layout_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSeatingPlan() {
  return useQuery({
    queryKey: ['seating-plan'],
    queryFn: () =>
      apiFetch<{ data: SeatingPlan | null }>('/seating-plan').then((r) => r.data),
  });
}

export function useUpsertSeatingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<{
      estimated_capacity: number | null;
      vip_seating_count: number | null;
      general_seating_count: number | null;
      counsellor_area_count: number | null;
      chair_source: string | null;
      layout_notes: string | null;
    }>) =>
      apiFetch<{ data: SeatingPlan }>('/seating-plan', {
        method: 'PUT',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seating-plan'] });
    },
  });
}

// === Daily attendance ===
export interface DailyAttendance {
  id: number;
  crusade_id: number;
  counted_on: string;
  count: number;
  estimation_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDailyAttendance(filters: { date_from?: string; date_to?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  return useQuery({
    queryKey: ['daily-attendance', filters],
    queryFn: () =>
      apiFetch<{ data: DailyAttendance[] }>(`/daily-attendance${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateDailyAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      counted_on: string;
      count: number;
      estimation_method?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: DailyAttendance }>('/daily-attendance', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-attendance'] });
    },
  });
}

export function useDeleteDailyAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/daily-attendance/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-attendance'] });
    },
  });
}

// === Daily decisions ===
export interface DailyDecision {
  id: number;
  crusade_id: number;
  decided_on: string;
  salvations: number;
  rededications: number;
  healings: number;
  counselled: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDailyDecisions(filters: { date_from?: string; date_to?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  return useQuery({
    queryKey: ['daily-decisions', filters],
    queryFn: () =>
      apiFetch<{ data: DailyDecision[] }>(`/daily-decisions${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateDailyDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      decided_on: string;
      salvations?: number;
      rededications?: number;
      healings?: number;
      counselled?: number;
      notes?: string | null;
    }) =>
      apiFetch<{ data: DailyDecision }>('/daily-decisions', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-decisions'] });
    },
  });
}

export function useDeleteDailyDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/daily-decisions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-decisions'] });
    },
  });
}

// === Daily programs ===
export interface DailyProgram {
  id: number;
  crusade_id: number;
  occurred_on: string;
  speaker: string | null;
  topic: string | null;
  duration_minutes: number | null;
  key_moments: string | null;
  narrative: string | null;
  created_at: string;
  updated_at: string;
}

export function useDailyPrograms(filters: { date_from?: string; date_to?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  return useQuery({
    queryKey: ['daily-programs', filters],
    queryFn: () =>
      apiFetch<{ data: DailyProgram[] }>(`/daily-programs${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateDailyProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      occurred_on: string;
      speaker?: string | null;
      topic?: string | null;
      duration_minutes?: number | null;
      key_moments?: string | null;
      narrative?: string | null;
    }) =>
      apiFetch<{ data: DailyProgram }>('/daily-programs', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-programs'] });
    },
  });
}

export function useDeleteDailyProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/daily-programs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-programs'] });
    },
  });
}

// === Incidents (security + medical) ===
export type IncidentKind = 'security' | 'medical';
export type IncidentSeverity = 'low' | 'medium' | 'high';

export interface Incident {
  id: number;
  crusade_id: number;
  kind: IncidentKind;
  occurred_on: string;
  occurred_at_time: string | null;
  severity: IncidentSeverity;
  location: string | null;
  description: string;
  response_taken: string | null;
  transported_to: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export function useIncidents(filters: { kind?: IncidentKind; severity?: IncidentSeverity } = {}) {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.severity) params.set('severity', filters.severity);
  const qs = params.toString();
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: () =>
      apiFetch<{ data: Incident[] }>(`/incidents${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      kind: IncidentKind;
      occurred_on: string;
      occurred_at_time?: string | null;
      severity?: IncidentSeverity;
      location?: string | null;
      description: string;
      response_taken?: string | null;
      transported_to?: string | null;
      resolution?: string | null;
    }) =>
      apiFetch<{ data: Incident }>('/incidents', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/incidents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

// === Publicity assets ===
export type PublicityKind = 'radio_spot' | 'poster' | 'billboard' | 'social_post' | 'flyer' | 'banner' | 'video' | 'other';
export type PublicityStatus = 'planned' | 'in_production' | 'produced' | 'deployed';

export interface PublicityAsset {
  id: number;
  crusade_id: number;
  kind: PublicityKind;
  title: string;
  status: PublicityStatus;
  produced_on: string | null;
  deployed_on: string | null;
  quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function usePublicityAssets(filters: { status?: PublicityStatus; kind?: PublicityKind } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.kind) params.set('kind', filters.kind);
  const qs = params.toString();
  return useQuery({
    queryKey: ['publicity-assets', filters],
    queryFn: () =>
      apiFetch<{ data: PublicityAsset[] }>(`/publicity-assets${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreatePublicityAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      kind: PublicityKind;
      title: string;
      status?: PublicityStatus;
      produced_on?: string | null;
      deployed_on?: string | null;
      quantity?: number | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: PublicityAsset }>('/publicity-assets', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publicity-assets'] });
    },
  });
}

export function useUpdatePublicityAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        kind: PublicityKind;
        title: string;
        status: PublicityStatus;
        produced_on: string | null;
        deployed_on: string | null;
        quantity: number | null;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: PublicityAsset }>(`/publicity-assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publicity-assets'] });
    },
  });
}

export function useDeletePublicityAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/publicity-assets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publicity-assets'] });
    },
  });
}

// === Outreach activities (door-to-door + convoy) ===
export type OutreachKind = 'door_to_door' | 'convoy';

export interface OutreachActivity {
  id: number;
  crusade_id: number;
  kind: OutreachKind;
  occurred_on: string;
  zone_id: number | null;
  team_lead_name: string | null;
  households_reached: number | null;
  conversations_count: number | null;
  pamphlets_distributed: number | null;
  route_summary: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useOutreachActivities(filters: { kind?: OutreachKind } = {}) {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  const qs = params.toString();
  return useQuery({
    queryKey: ['outreach-activities', filters],
    queryFn: () =>
      apiFetch<{ data: OutreachActivity[] }>(`/outreach-activities${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateOutreachActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      kind: OutreachKind;
      occurred_on: string;
      zone_id?: number | null;
      team_lead_name?: string | null;
      households_reached?: number | null;
      conversations_count?: number | null;
      pamphlets_distributed?: number | null;
      route_summary?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: OutreachActivity }>('/outreach-activities', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-activities'] });
    },
  });
}

export function useDeleteOutreachActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/outreach-activities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-activities'] });
    },
  });
}

// === Media mentions ===
export type MediaKind = 'newspaper' | 'radio' | 'tv' | 'online' | 'social' | 'other';
export type MediaSentiment = 'positive' | 'neutral' | 'negative';

export interface MediaMention {
  id: number;
  crusade_id: number;
  mentioned_on: string;
  kind: MediaKind;
  outlet: string;
  headline: string;
  url: string | null;
  sentiment: MediaSentiment | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export function useMediaMentions(filters: { kind?: MediaKind; sentiment?: MediaSentiment } = {}) {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.sentiment) params.set('sentiment', filters.sentiment);
  const qs = params.toString();
  return useQuery({
    queryKey: ['media-mentions', filters],
    queryFn: () =>
      apiFetch<{ data: MediaMention[] }>(`/media-mentions${qs ? '?' + qs : ''}`).then((r) => r.data),
  });
}

export function useCreateMediaMention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      mentioned_on: string;
      kind: MediaKind;
      outlet: string;
      headline: string;
      url?: string | null;
      sentiment?: MediaSentiment | null;
      summary?: string | null;
    }) =>
      apiFetch<{ data: MediaMention }>('/media-mentions', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-mentions'] });
    },
  });
}

export function useDeleteMediaMention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/media-mentions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-mentions'] });
    },
  });
}

// === Land elders (Fathers of the Land) ===
export type LandElderStatus = 'identified' | 'courted' | 'blessed' | 'neutral' | 'opposed';

export interface LandElder {
  id: number;
  crusade_id: number;
  name: string;
  title: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  status: LandElderStatus;
  last_contact_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useLandElders() {
  return useQuery({
    queryKey: ['land-elders'],
    queryFn: () => apiFetch<{ data: LandElder[] }>('/land-elders').then((r) => r.data),
  });
}

export function useCreateLandElder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      name: string;
      title?: string | null;
      region?: string | null;
      phone?: string | null;
      email?: string | null;
      status?: LandElderStatus;
      last_contact_at?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: LandElder }>('/land-elders', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['land-elders'] });
    },
  });
}

export function useUpdateLandElder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        name: string;
        title: string | null;
        region: string | null;
        phone: string | null;
        email: string | null;
        status: LandElderStatus;
        last_contact_at: string | null;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: LandElder }>(`/land-elders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['land-elders'] });
    },
  });
}

export function useDeleteLandElder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/land-elders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['land-elders'] });
    },
  });
}

// === Donors ===
export type DonorKind = 'individual' | 'organization' | 'foundation' | 'church';
export type DonorStatus = 'prospect' | 'engaged' | 'committed' | 'given' | 'declined';

export interface Donor {
  id: number;
  crusade_id: number;
  name: string;
  organization: string | null;
  kind: DonorKind;
  pledge_amount: string | null;
  status: DonorStatus;
  last_contact_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonorsResponse {
  data: Donor[];
  meta: { totals: { pledged: string; given: string } };
}

export function useDonors() {
  return useQuery({
    queryKey: ['donors'],
    queryFn: () => apiFetch<DonorsResponse>('/donors'),
  });
}

export function useCreateDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crusade_id: number;
      name: string;
      organization?: string | null;
      kind: DonorKind;
      pledge_amount?: number | null;
      status?: DonorStatus;
      last_contact_at?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<{ data: Donor }>('/donors', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
    },
  });
}

export function useUpdateDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id: number;
      body: Partial<{
        name: string;
        organization: string | null;
        kind: DonorKind;
        pledge_amount: number | null;
        status: DonorStatus;
        last_contact_at: string | null;
        notes: string | null;
      }>;
    }) =>
      apiFetch<{ data: Donor }>(`/donors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
    },
  });
}

export function useDeleteDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/donors/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
    },
  });
}
