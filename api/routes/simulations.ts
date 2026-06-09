import { Router, type Request, type Response } from 'express'
import {
  getAllTasks,
  getTaskById,
  createTask,
  getEmbryosByTaskId,
  getSnapshotsByTaskId,
  type SimulationTask,
  type Dimension,
} from '../db.js'
import { startSimulation, pauseSimulation, rollbackSimulation } from '../simulationEngine.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const tasks = getAllTasks()
  res.json({ success: true, data: tasks })
})

router.get('/:id', (req: Request, res: Response): void => {
  const task = getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: '任务未找到' })
    return
  }
  const embryos = getEmbryosByTaskId(task.id)
  const snapshots = getSnapshotsByTaskId(task.id)
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  res.json({
    success: true,
    data: { ...task, embryos, latestMonitoring: latestSnapshot },
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { name, diskMass, viscosityAlpha, dustSizeDistFile, dimension, userId } = req.body
  if (!name || diskMass == null || viscosityAlpha == null || !userId) {
    res.status(400).json({ success: false, error: '缺少必填字段: name, diskMass, viscosityAlpha, userId' })
    return
  }
  const dimValue = String(dimension ?? '1D')
  if (!['1D', '2D'].includes(dimValue)) {
    res.status(400).json({ success: false, error: 'dimension 必须为 1D 或 2D' })
    return
  }
  const task = createTask({
    name,
    status: 'pending_validation',
    diskMass: Number(diskMass),
    viscosityAlpha: Number(viscosityAlpha),
    dustSizeDistFile: dustSizeDistFile || 'default_distribution.dat',
    dimension: dimValue as Dimension,
    userId,
    currentStep: 0,
    totalSteps: 6,
  })
  res.status(201).json({ success: true, data: task })
})

router.post('/:id/start', (req: Request, res: Response): void => {
  const ok = startSimulation(req.params.id)
  if (!ok) {
    res.status(400).json({ success: false, error: '无法启动，任务不存在或状态不允许' })
    return
  }
  const task = getTaskById(req.params.id)
  res.json({ success: true, data: task })
})

router.post('/:id/pause', (req: Request, res: Response): void => {
  const ok = pauseSimulation(req.params.id)
  if (!ok) {
    res.status(400).json({ success: false, error: '无法暂停，任务不存在或状态不允许' })
    return
  }
  const task = getTaskById(req.params.id)
  res.json({ success: true, data: task })
})

router.post('/:id/rollback', (req: Request, res: Response): void => {
  const ok = rollbackSimulation(req.params.id)
  if (!ok) {
    res.status(400).json({ success: false, error: '无法回滚，任务不存在' })
    return
  }
  const task = getTaskById(req.params.id)
  res.json({ success: true, data: task })
})

router.get('/:id/monitor', (req: Request, res: Response): void => {
  const task = getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: '任务未找到' })
    return
  }
  const snapshots = getSnapshotsByTaskId(req.params.id)
  res.json({ success: true, data: snapshots })
})

export default router
