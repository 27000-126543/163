import { create } from 'zustand';

export type SimulationStatus =
  | 'pending_validation'
  | 'model_building'
  | 'dust_growth'
  | 'particle_aggregation'
  | 'embryo_formation'
  | 'orbital_evolution'
  | 'completed'
  | 'error_rollback';

export interface PlanetEmbryo {
  id: string;
  taskId: string;
  mass: number;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  formationTime: number;
}

export interface SimulationTask {
  id: string;
  name: string;
  status: SimulationStatus;
  diskMass: number;
  viscosityAlpha: number;
  dustSizeDistFile: string;
  dimension: string;
  userId: string;
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  embryos?: PlanetEmbryo[];
  batchId?: string;
  recommendationSource?: string;
  recommendationConfidence?: number;
  recommendationProfile?: string;
}

export interface SimulationTemplate {
  id: string;
  name: string;
  diskMass: number;
  viscosityAlpha: number;
  dimension: string;
  dustSizeDistFile: string;
  recommendationSource?: string;
  createdAt: string;
}

export interface MonitoringSnapshot {
  id: string;
  taskId: string;
  timestamp: string;
  dustGrowthRate: number;
  toomreQ: number;
  meshRefinementLevel: number;
  adjustedViscosity: number;
}

export interface ApprovalRecord {
  id: string;
  taskId: string;
  reviewerId: string;
  level: number;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  createdAt: string;
}

export interface AlertNotification {
  id: string;
  taskId: string;
  type: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  targetRole: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface DailyStatistic {
  date: string;
  completionRate: number;
  avgEfficiency: number;
  convergenceCount: number;
  totalSimulations: number;
  completedSimulations: number;
}

export interface Recommendation {
  id: string;
  growthMechanism: string;
  confidence: number;
  viscosityProfile: string;
  viscosityParams: Record<string, number>;
  basedOnTaskCount: number;
  createdAt: string;
}

interface AppState {
  simulations: SimulationTask[];
  currentSimulation: SimulationTask | null;
  approvals: ApprovalRecord[];
  recommendations: Recommendation[];
  dailyStats: DailyStatistic[];
  alerts: AlertNotification[];
  monitoringData: MonitoringSnapshot[];
  templates: SimulationTemplate[];
  loading: boolean;
  error: string | null;

  fetchSimulations: () => Promise<void>;
  fetchSimulation: (id: string) => Promise<void>;
  createSimulation: (data: Partial<SimulationTask>) => Promise<SimulationTask>;
  batchCreateSimulations: (data: { namePrefix: string; diskMass: number; viscosityAlpha: number; dustSizeDistFile?: string; dimension?: string; userId: string; count: number; recommendationSource?: string; recommendationConfidence?: number; recommendationProfile?: string }) => Promise<{ batchId: string; tasks: SimulationTask[] }>;
  startSimulation: (id: string) => Promise<void>;
  pauseSimulation: (id: string) => Promise<void>;
  rollbackSimulation: (id: string) => Promise<void>;

  fetchApprovals: () => Promise<void>;
  reviewApproval: (id: string, data: { status: 'approved' | 'rejected'; comment: string }) => Promise<void>;

  fetchRecommendations: () => Promise<void>;
  fetchDailyStats: () => Promise<void>;
  fetchTrends: () => Promise<void>;
  fetchAlerts: () => Promise<void>;

  fetchMonitoring: (taskId: string) => Promise<void>;

  fetchTemplates: () => Promise<void>;
  createTemplate: (data: Omit<SimulationTemplate, 'id' | 'createdAt'>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

const API_BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let errorMsg = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody.error) errorMsg = errBody.error;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }
  const json = await res.json();
  return json.data as T;
}

export const useAppStore = create<AppState>((set, get) => ({
  simulations: [],
  currentSimulation: null,
  approvals: [],
  recommendations: [],
  dailyStats: [],
  alerts: [],
  monitoringData: [],
  templates: [],
  loading: false,
  error: null,

  fetchSimulations: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<SimulationTask[]>('/simulations');
      set({ simulations: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchSimulation: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<SimulationTask>(`/simulations/${id}`);
      set({ currentSimulation: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createSimulation: async (data) => {
    set({ loading: true, error: null });
    try {
      const created = await apiFetch<SimulationTask>('/simulations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s) => ({
        simulations: [...s.simulations, created],
        loading: false,
      }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  batchCreateSimulations: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await apiFetch<{ batchId: string; tasks: SimulationTask[] }>('/simulations/batch', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s) => ({
        simulations: [...s.simulations, ...result.tasks],
        loading: false,
      }));
      return result;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  startSimulation: async (id) => {
    try {
      const updated = await apiFetch<SimulationTask>(`/simulations/${id}/start`, {
        method: 'POST',
      });
      set((s) => ({
        simulations: s.simulations.map((sim) => (sim.id === id ? updated : sim)),
        currentSimulation: s.currentSimulation?.id === id ? updated : s.currentSimulation,
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  pauseSimulation: async (id) => {
    try {
      const updated = await apiFetch<SimulationTask>(`/simulations/${id}/pause`, {
        method: 'POST',
      });
      set((s) => ({
        simulations: s.simulations.map((sim) => (sim.id === id ? updated : sim)),
        currentSimulation: s.currentSimulation?.id === id ? updated : s.currentSimulation,
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  rollbackSimulation: async (id) => {
    try {
      const updated = await apiFetch<SimulationTask>(`/simulations/${id}/rollback`, {
        method: 'POST',
      });
      set((s) => ({
        simulations: s.simulations.map((sim) => (sim.id === id ? updated : sim)),
        currentSimulation: s.currentSimulation?.id === id ? updated : s.currentSimulation,
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchApprovals: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<ApprovalRecord[]>('/approvals');
      set({ approvals: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  reviewApproval: async (id, data) => {
    try {
      const updated = await apiFetch<ApprovalRecord>(`/approvals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s) => ({
        approvals: s.approvals.map((a) => (a.id === id ? updated : a)),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchRecommendations: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<Recommendation[]>('/recommendations');
      set({ recommendations: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchDailyStats: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<DailyStatistic[]>('/dashboard/daily');
      set({ dailyStats: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchTrends: async () => {
    set({ loading: true, error: null });
    try {
      const trendsData = await apiFetch<{dates: string[], completionRates: number[], avgEfficiencies: number[], convergenceCounts: number[], totalSimulations: number[], completedSimulations: number[]}>('/dashboard/trends');
      const converted: DailyStatistic[] = trendsData.dates.map((date, i) => ({
        date,
        completionRate: trendsData.completionRates[i],
        avgEfficiency: trendsData.avgEfficiencies[i],
        convergenceCount: trendsData.convergenceCounts[i],
        totalSimulations: trendsData.totalSimulations[i],
        completedSimulations: trendsData.completedSimulations[i],
      }));
      set({ dailyStats: converted, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchMonitoring: async (taskId) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<MonitoringSnapshot[]>(`/simulations/${taskId}/monitor`);
      set({ monitoringData: data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchAlerts: async () => {
    const hardcoded: AlertNotification[] = [
      {
        id: 'alert-1',
        taskId: '',
        type: 'system',
        level: 'warning',
        message: 'Toomre Q 值接近临界阈值，请关注盘面稳定性',
        targetRole: 'researcher',
        acknowledged: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-2',
        taskId: '',
        type: 'simulation',
        level: 'info',
        message: '本月模拟完成率较上月提升 12%',
        targetRole: 'admin',
        acknowledged: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-3',
        taskId: '',
        type: 'resource',
        level: 'error',
        message: '计算节点 Node-03 内存使用率超过 90%',
        targetRole: 'admin',
        acknowledged: false,
        createdAt: new Date().toISOString(),
      },
    ];
    set({ alerts: hardcoded });
  },

  fetchTemplates: async () => {
    try {
      const data = await apiFetch<SimulationTemplate[]>('/simulations/templates');
      set({ templates: data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  createTemplate: async (data) => {
    try {
      const created = await apiFetch<SimulationTemplate>('/simulations/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s) => ({ templates: [...s.templates, created] }));
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  deleteTemplate: async (id) => {
    try {
      await apiFetch<void>(`/simulations/templates/${id}`, { method: 'DELETE' });
      set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
