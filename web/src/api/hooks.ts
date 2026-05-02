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
