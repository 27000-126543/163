import { v4 as uuidv4 } from 'uuid'

export type SimulationStatus =
  | 'pending_validation'
  | 'model_building'
  | 'dust_growth'
  | 'particle_aggregation'
  | 'embryo_formation'
  | 'orbital_evolution'
  | 'completed'
  | 'error_rollback'

export type Dimension = '1D' | '2D'

export type ApprovalLevel = 'postdoc' | 'professor'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type AlertType = 'orbit_crossing' | 'deviation' | 'gi_triggered'

export type AlertLevel = 'warning' | 'critical'

export type UserRole = 'postdoc' | 'professor' | 'chief_scientist'

export interface SimulationTask {
  id: string
  name: string
  status: SimulationStatus
  diskMass: number
  viscosityAlpha: number
  dustSizeDistFile: string
  dimension: Dimension
  userId: string
  currentStep: number
  totalSteps: number
  createdAt: string
  updatedAt: string
}

export interface PlanetEmbryo {
  id: string
  taskId: string
  mass: number
  semiMajorAxis: number
  eccentricity: number
  inclination: number
  formationTime: number
}

export interface MonitoringSnapshot {
  id: string
  taskId: string
  timestamp: string
  dustGrowthRate: number
  toomreQ: number
  meshRefinementLevel: number
  adjustedViscosity: number
  snapshotData: string
}

export interface ApprovalRecord {
  id: string
  taskId: string
  reviewerId: string
  level: ApprovalLevel
  status: ApprovalStatus
  comment: string
  createdAt: string
}

export interface AdjustmentLog {
  id: string
  taskId: string
  parameter: string
  oldValue: number
  newValue: number
  reason: string
  createdAt: string
}

export interface AlertNotification {
  id: string
  taskId: string
  type: AlertType
  level: AlertLevel
  message: string
  targetRole: UserRole
  acknowledged: boolean
  createdAt: string
}

export interface DailyStatistic {
  date: string
  completionRate: number
  avgEfficiency: number
  convergenceCount: number
  totalSimulations: number
  completedSimulations: number
}

export interface Recommendation {
  id: string
  growthMechanism: string
  confidence: number
  viscosityProfile: string
  viscosityParams: Record<string, number>
  basedOnTaskCount: number
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

const users: User[] = [
  { id: 'user-1', name: '张博后', email: 'postdoc@disklab.org', role: 'postdoc' },
  { id: 'user-2', name: '李教授', email: 'professor@disklab.org', role: 'professor' },
  { id: 'user-3', name: '王首席', email: 'chief@disklab.org', role: 'chief_scientist' },
]

const now = new Date().toISOString()
const dayMs = 86400000

const simulationTasks: SimulationTask[] = [
  {
    id: 'task-1',
    name: '原行星盘α=1e-3标准模型',
    status: 'completed',
    diskMass: 0.05,
    viscosityAlpha: 0.001,
    dustSizeDistFile: 'mrn_distribution.dat',
    dimension: '2D',
    userId: 'user-1',
    currentStep: 6,
    totalSteps: 6,
    createdAt: new Date(Date.now() - 5 * dayMs).toISOString(),
    updatedAt: now,
  },
  {
    id: 'task-2',
    name: '低粘滞盘尘埃生长模拟',
    status: 'dust_growth',
    diskMass: 0.08,
    viscosityAlpha: 0.0001,
    dustSizeDistFile: 'power_law_s2p5.dat',
    dimension: '2D',
    userId: 'user-1',
    currentStep: 2,
    totalSteps: 6,
    createdAt: new Date(Date.now() - 3 * dayMs).toISOString(),
    updatedAt: now,
  },
  {
    id: 'task-3',
    name: '1D径向演化快速验证',
    status: 'orbital_evolution',
    diskMass: 0.03,
    viscosityAlpha: 0.005,
    dustSizeDistFile: 'single_size_1mm.dat',
    dimension: '1D',
    userId: 'user-2',
    currentStep: 5,
    totalSteps: 6,
    createdAt: new Date(Date.now() - 7 * dayMs).toISOString(),
    updatedAt: now,
  },
  {
    id: 'task-4',
    name: '引力不稳定性触发测试',
    status: 'pending_validation',
    diskMass: 0.15,
    viscosityAlpha: 0.0005,
    dustSizeDistFile: 'mrn_distribution.dat',
    dimension: '2D',
    userId: 'user-2',
    currentStep: 0,
    totalSteps: 6,
    createdAt: new Date(Date.now() - 1 * dayMs).toISOString(),
    updatedAt: now,
  },
  {
    id: 'task-5',
    name: '粒子聚集阶段异常回滚',
    status: 'error_rollback',
    diskMass: 0.1,
    viscosityAlpha: 0.002,
    dustSizeDistFile: 'power_law_s3p0.dat',
    dimension: '2D',
    userId: 'user-1',
    currentStep: 3,
    totalSteps: 6,
    createdAt: new Date(Date.now() - 4 * dayMs).toISOString(),
    updatedAt: now,
  },
]

const planetEmbryos: PlanetEmbryo[] = [
  { id: 'embryo-1', taskId: 'task-1', mass: 0.8, semiMajorAxis: 5.2, eccentricity: 0.048, inclination: 1.3, formationTime: 3.2e5 },
  { id: 'embryo-2', taskId: 'task-1', mass: 0.3, semiMajorAxis: 1.0, eccentricity: 0.017, inclination: 0.5, formationTime: 2.1e5 },
  { id: 'embryo-3', taskId: 'task-3', mass: 0.1, semiMajorAxis: 2.5, eccentricity: 0.02, inclination: 0.8, formationTime: 1.5e5 },
  { id: 'embryo-4', taskId: 'task-3', mass: 0.05, semiMajorAxis: 2.7, eccentricity: 0.03, inclination: 1.0, formationTime: 1.8e5 },
]

const monitoringSnapshots: MonitoringSnapshot[] = [
  {
    id: 'snap-1', taskId: 'task-1', timestamp: new Date(Date.now() - 4 * dayMs).toISOString(),
    dustGrowthRate: 0.012, toomreQ: 1.8, meshRefinementLevel: 3, adjustedViscosity: 0.001, snapshotData: '{}',
  },
  {
    id: 'snap-2', taskId: 'task-1', timestamp: new Date(Date.now() - 2 * dayMs).toISOString(),
    dustGrowthRate: 0.025, toomreQ: 0.85, meshRefinementLevel: 4, adjustedViscosity: 0.0012, snapshotData: '{}',
  },
  {
    id: 'snap-3', taskId: 'task-2', timestamp: new Date(Date.now() - 1 * dayMs).toISOString(),
    dustGrowthRate: 0.018, toomreQ: 2.1, meshRefinementLevel: 3, adjustedViscosity: 0.0001, snapshotData: '{}',
  },
  {
    id: 'snap-4', taskId: 'task-3', timestamp: new Date(Date.now() - 3 * dayMs).toISOString(),
    dustGrowthRate: 0.008, toomreQ: 0.6, meshRefinementLevel: 2, adjustedViscosity: 0.005, snapshotData: '{}',
  },
  {
    id: 'snap-5', taskId: 'task-3', timestamp: new Date(Date.now() - 1 * dayMs).toISOString(),
    dustGrowthRate: 0.015, toomreQ: 1.2, meshRefinementLevel: 3, adjustedViscosity: 0.0055, snapshotData: '{}',
  },
]

const approvalRecords: ApprovalRecord[] = [
  {
    id: 'approval-1', taskId: 'task-1', reviewerId: 'user-2', level: 'postdoc',
    status: 'approved', comment: '参数合理，结果收敛', createdAt: new Date(Date.now() - 3 * dayMs).toISOString(),
  },
  {
    id: 'approval-2', taskId: 'task-3', reviewerId: 'user-2', level: 'postdoc',
    status: 'approved', comment: '演化趋势正常', createdAt: new Date(Date.now() - 5 * dayMs).toISOString(),
  },
  {
    id: 'approval-3', taskId: 'task-4', reviewerId: 'user-3', level: 'professor',
    status: 'pending', comment: '', createdAt: now,
  },
]

const adjustmentLogs: AdjustmentLog[] = [
  {
    id: 'adj-1', taskId: 'task-1', parameter: 'viscosityAlpha',
    oldValue: 0.001, newValue: 0.0012, reason: 'Toomre Q降至0.85，提升粘滞以稳定盘',
    createdAt: new Date(Date.now() - 2 * dayMs).toISOString(),
  },
  {
    id: 'adj-2', taskId: 'task-3', parameter: 'viscosityAlpha',
    oldValue: 0.005, newValue: 0.0055, reason: '引力不稳定性触发，调整粘滞参数',
    createdAt: new Date(Date.now() - 3 * dayMs).toISOString(),
  },
]

const alertNotifications: AlertNotification[] = [
  {
    id: 'alert-1', taskId: 'task-1', type: 'gi_triggered', level: 'warning',
    message: '任务task-1检测到Toomre Q=0.85<1，引力不稳定性可能触发',
    targetRole: 'postdoc', acknowledged: true,
    createdAt: new Date(Date.now() - 2 * dayMs).toISOString(),
  },
  {
    id: 'alert-2', taskId: 'task-3', type: 'gi_triggered', level: 'critical',
    message: '任务task-3检测到Toomre Q=0.6<1，盘可能发生碎裂',
    targetRole: 'professor', acknowledged: false,
    createdAt: new Date(Date.now() - 3 * dayMs).toISOString(),
  },
  {
    id: 'alert-3', taskId: 'task-3', type: 'orbit_crossing', level: 'warning',
    message: '任务task-3中embryo-3与embryo-4轨道半长轴接近(2.5 vs 2.7 AU)，可能存在轨道交叉',
    targetRole: 'postdoc', acknowledged: false,
    createdAt: new Date(Date.now() - 1 * dayMs).toISOString(),
  },
]

const dailyStatistics: DailyStatistic[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(Date.now() - (6 - i) * dayMs)
  const dateStr = date.toISOString().split('T')[0]
  return {
    date: dateStr,
    completionRate: 30 + Math.random() * 50,
    avgEfficiency: 0.5 + Math.random() * 0.4,
    convergenceCount: Math.floor(Math.random() * 5) + 1,
    totalSimulations: Math.floor(Math.random() * 5) + 3,
    completedSimulations: Math.floor(Math.random() * 3) + 1,
  }
})

const recommendations: Recommendation[] = [
  {
    id: 'rec-1',
    growthMechanism: 'streaming_instability',
    confidence: 0.87,
    viscosityProfile: 'alpha_viscosity',
    viscosityParams: { alpha: 0.001, scaleHeight: 0.05, taperRadius: 50 },
    basedOnTaskCount: 12,
    createdAt: new Date(Date.now() - 2 * dayMs).toISOString(),
  },
  {
    id: 'rec-2',
    growthMechanism: 'gravitational_instability',
    confidence: 0.72,
    viscosityProfile: 'beta_viscosity',
    viscosityParams: { beta: 0.0005, coolingTime: 10, omegaFrame: 0.01 },
    basedOnTaskCount: 8,
    createdAt: new Date(Date.now() - 5 * dayMs).toISOString(),
  },
  {
    id: 'rec-3',
    growthMechanism: 'pebble_accretion',
    confidence: 0.93,
    viscosityProfile: 'alpha_viscosity',
    viscosityParams: { alpha: 0.0001, pebbleFlux: 1e-4, hillRadius: 0.01 },
    basedOnTaskCount: 15,
    createdAt: new Date(Date.now() - 1 * dayMs).toISOString(),
  },
]

export function getAllUsers(): User[] {
  return users
}

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function getAllTasks(): SimulationTask[] {
  return simulationTasks
}

export function getTaskById(id: string): SimulationTask | undefined {
  return simulationTasks.find(t => t.id === id)
}

export function createTask(data: Omit<SimulationTask, 'id' | 'createdAt' | 'updatedAt'>): SimulationTask {
  const task: SimulationTask = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  simulationTasks.push(task)
  return task
}

export function updateTask(id: string, updates: Partial<SimulationTask>): SimulationTask | undefined {
  const idx = simulationTasks.findIndex(t => t.id === id)
  if (idx === -1) return undefined
  simulationTasks[idx] = { ...simulationTasks[idx], ...updates, updatedAt: new Date().toISOString() }
  return simulationTasks[idx]
}

export function getEmbryosByTaskId(taskId: string): PlanetEmbryo[] {
  return planetEmbryos.filter(e => e.taskId === taskId)
}

export function addEmbryo(embryo: Omit<PlanetEmbryo, 'id'>): PlanetEmbryo {
  const newEmbryo: PlanetEmbryo = { ...embryo, id: uuidv4() }
  planetEmbryos.push(newEmbryo)
  return newEmbryo
}

export function getSnapshotsByTaskId(taskId: string): MonitoringSnapshot[] {
  return monitoringSnapshots.filter(s => s.taskId === taskId)
}

export function addSnapshot(snapshot: Omit<MonitoringSnapshot, 'id'>): MonitoringSnapshot {
  const newSnapshot: MonitoringSnapshot = { ...snapshot, id: uuidv4() }
  monitoringSnapshots.push(newSnapshot)
  return newSnapshot
}

export function getAllApprovals(): ApprovalRecord[] {
  return approvalRecords
}

export function getApprovalsByTaskId(taskId: string): ApprovalRecord[] {
  return approvalRecords.filter(a => a.taskId === taskId)
}

export function getApprovalById(id: string): ApprovalRecord | undefined {
  return approvalRecords.find(a => a.id === id)
}

export function addApproval(approval: Omit<ApprovalRecord, 'id' | 'createdAt'>): ApprovalRecord {
  const newApproval: ApprovalRecord = { ...approval, id: uuidv4(), createdAt: new Date().toISOString() }
  approvalRecords.push(newApproval)
  return newApproval
}

export function updateApproval(id: string, updates: Partial<ApprovalRecord>): ApprovalRecord | undefined {
  const idx = approvalRecords.findIndex(a => a.id === id)
  if (idx === -1) return undefined
  approvalRecords[idx] = { ...approvalRecords[idx], ...updates }
  return approvalRecords[idx]
}

export function getAdjustmentLogsByTaskId(taskId: string): AdjustmentLog[] {
  return adjustmentLogs.filter(l => l.taskId === taskId)
}

export function addAdjustmentLog(log: Omit<AdjustmentLog, 'id' | 'createdAt'>): AdjustmentLog {
  const newLog: AdjustmentLog = { ...log, id: uuidv4(), createdAt: new Date().toISOString() }
  adjustmentLogs.push(newLog)
  return newLog
}

export function getAllAlerts(): AlertNotification[] {
  return alertNotifications
}

export function getAlertsByTaskId(taskId: string): AlertNotification[] {
  return alertNotifications.filter(a => a.taskId === taskId)
}

export function addAlert(alert: Omit<AlertNotification, 'id' | 'createdAt'>): AlertNotification {
  const newAlert: AlertNotification = { ...alert, id: uuidv4(), createdAt: new Date().toISOString() }
  alertNotifications.push(newAlert)
  return newAlert
}

export function acknowledgeAlert(id: string): AlertNotification | undefined {
  const alert = alertNotifications.find(a => a.id === id)
  if (alert) alert.acknowledged = true
  return alert
}

export function getDailyStatistics(): DailyStatistic[] {
  return dailyStatistics
}

export function addDailyStatistic(stat: DailyStatistic): void {
  const idx = dailyStatistics.findIndex(s => s.date === stat.date)
  if (idx !== -1) {
    dailyStatistics[idx] = stat
  } else {
    dailyStatistics.push(stat)
  }
}

export function getAllRecommendations(): Recommendation[] {
  return recommendations
}

export function getActiveTaskIds(): string[] {
  const activeStatuses: SimulationStatus[] = [
    'model_building', 'dust_growth', 'particle_aggregation',
    'embryo_formation', 'orbital_evolution',
  ]
  return simulationTasks
    .filter(t => activeStatuses.includes(t.status))
    .map(t => t.id)
}
