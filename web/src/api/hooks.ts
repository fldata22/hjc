import { useQuery } from '@tanstack/react-query';
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
