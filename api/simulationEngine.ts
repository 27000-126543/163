import { v4 as uuidv4 } from 'uuid'
import {
  type SimulationStatus,
  getTaskById,
  updateTask,
  getEmbryosByTaskId,
  addEmbryo,
  addSnapshot,
  addAdjustmentLog,
  addAlert,
  getActiveTaskIds,
} from './db.js'

const STATUS_ORDER: SimulationStatus[] = [
  'pending_validation',
  'model_building',
  'dust_growth',
  'particle_aggregation',
  'embryo_formation',
  'orbital_evolution',
  'completed',
]

function advanceStatus(taskId: string): boolean {
  const task = getTaskById(taskId)
  if (!task) return false
  if (task.status === 'completed' || task.status === 'error_rollback') return false

  const currentIdx = STATUS_ORDER.indexOf(task.status)
  if (currentIdx === -1) return false

  const nextStatus = STATUS_ORDER[currentIdx + 1]
  if (!nextStatus) return false

  updateTask(taskId, {
    status: nextStatus,
    currentStep: task.currentStep + 1,
  })

  return true
}

function generateMonitoringData(taskId: string): void {
  const task = getTaskById(taskId)
  if (!task) return

  const dustGrowthRate = Math.random() * 0.05 + 0.001
  const toomreQ = Math.random() * 3
  const meshRefinementLevel = Math.floor(Math.random() * 4) + 1
  const deviationFactor = Math.random() * 0.2 - 0.1
  const adjustedViscosity = task.viscosityAlpha * (1 + deviationFactor)

  addSnapshot({
    taskId,
    timestamp: new Date().toISOString(),
    dustGrowthRate,
    toomreQ,
    meshRefinementLevel,
    adjustedViscosity,
    snapshotData: JSON.stringify({ deviationFactor }),
  })

  if (toomreQ < 1) {
    addAlert({
      taskId,
      type: 'gi_triggered',
      level: toomreQ < 0.5 ? 'critical' : 'warning',
      message: `任务${taskId}检测到Toomre Q=${toomreQ.toFixed(2)}<1，引力不稳定性可能触发`,
      targetRole: toomreQ < 0.5 ? 'professor' : 'postdoc',
      acknowledged: false,
    })

    const newViscosity = adjustedViscosity * 1.2
    addAdjustmentLog({
      taskId,
      parameter: 'viscosityAlpha',
      oldValue: adjustedViscosity,
      newValue: newViscosity,
      reason: `Toomre Q=${toomreQ.toFixed(2)}<1，提升粘滞以稳定盘`,
    })
  }

  checkOrbitCrossing(taskId)
}

function checkOrbitCrossing(taskId: string): void {
  const embryos = getEmbryosByTaskId(taskId)
  if (embryos.length < 2) return

  const threshold = 0.5
  for (let i = 0; i < embryos.length; i++) {
    for (let j = i + 1; j < embryos.length; j++) {
      const diff = Math.abs(embryos[i].semiMajorAxis - embryos[j].semiMajorAxis)
      if (diff < threshold) {
        addAlert({
          taskId,
          type: 'orbit_crossing',
          level: diff < 0.2 ? 'critical' : 'warning',
          message: `任务${taskId}中胚胎轨道半长轴接近(${embryos[i].semiMajorAxis} vs ${embryos[j].semiMajorAxis} AU)，可能存在轨道交叉`,
          targetRole: 'postdoc',
          acknowledged: false,
        })
      }
    }
  }
}

function maybeGenerateEmbryo(taskId: string): void {
  const task = getTaskById(taskId)
  if (!task) return

  const activeStatuses: SimulationStatus[] = ['embryo_formation', 'orbital_evolution']
  if (!activeStatuses.includes(task.status)) return

  if (Math.random() > 0.3) return

  const embryos = getEmbryosByTaskId(taskId)
  if (embryos.length >= 5) return

  addEmbryo({
    taskId,
    mass: Math.random() * 2 + 0.05,
    semiMajorAxis: Math.random() * 40 + 0.5,
    eccentricity: Math.random() * 0.1,
    inclination: Math.random() * 3,
    formationTime: Math.random() * 5e5 + 1e4,
  })
}

function tickTask(taskId: string): void {
  const task = getTaskById(taskId)
  if (!task) return

  generateMonitoringData(taskId)

  if (Math.random() < 0.6) {
    advanceStatus(taskId)
  }

  maybeGenerateEmbryo(taskId)
}

export function tick(): void {
  const activeIds = getActiveTaskIds()
  for (const id of activeIds) {
    tickTask(id)
  }
}

export function startSimulation(taskId: string): boolean {
  const task = getTaskById(taskId)
  if (!task) return false
  if (task.status !== 'pending_validation') return false

  updateTask(taskId, { status: 'model_building', currentStep: 1 })
  return true
}

export function pauseSimulation(taskId: string): boolean {
  const task = getTaskById(taskId)
  if (!task) return false
  const activeStatuses: SimulationStatus[] = [
    'model_building', 'dust_growth', 'particle_aggregation',
    'embryo_formation', 'orbital_evolution',
  ]
  if (!activeStatuses.includes(task.status)) return false

  updateTask(taskId, { status: 'pending_validation' })
  return true
}

export function rollbackSimulation(taskId: string): boolean {
  const task = getTaskById(taskId)
  if (!task) return false

  updateTask(taskId, { status: 'error_rollback' })
  return true
}
