import { Router, type Request, type Response } from 'express'
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  getEmbryosByTaskId,
  getSnapshotsByTaskId,
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  getAllComparisonGroups,
  createComparisonGroup,
  deleteComparisonGroup,
  addValidationRecord,
  type SimulationTask,
  type Dimension,
} from '../db.js'
import { startSimulation, pauseSimulation, rollbackSimulation } from '../simulationEngine.js'

const router = Router()

router.get('/templates', (_req: Request, res: Response): void => {
  res.json({ success: true, data: getAllTemplates() })
})

router.post('/templates', (req: Request, res: Response): void => {
  const { name, diskMass, viscosityAlpha, dimension, dustSizeDistFile, recommendationSource } = req.body
  if (!name || diskMass == null || viscosityAlpha == null) {
    res.status(400).json({ success: false, error: '缺少必填字段: name, diskMass, viscosityAlpha' })
    return
  }
  const dimValue = String(dimension ?? '1D')
  const tpl = createTemplate({
    name,
    diskMass: Number(diskMass),
    viscosityAlpha: Number(viscosityAlpha),
    dimension: dimValue as Dimension,
    dustSizeDistFile: dustSizeDistFile || 'default_distribution.dat',
    recommendationSource: recommendationSource || undefined,
  })
  res.status(201).json({ success: true, data: tpl })
})

router.delete('/templates/:id', (req: Request, res: Response): void => {
  const ok = deleteTemplate(req.params.id)
  if (!ok) {
    res.status(404).json({ success: false, error: '模板未找到' })
    return
  }
  res.json({ success: true })
})

router.get('/comparisons', (_req: Request, res: Response): void => {
  res.json({ success: true, data: getAllComparisonGroups() })
})

router.post('/comparisons', (req: Request, res: Response): void => {
  const { name, taskIds } = req.body
  if (!name || !Array.isArray(taskIds) || taskIds.length < 2) {
    res.status(400).json({ success: false, error: '缺少必填字段: name, taskIds (至少2个)' })
    return
  }
  const group = createComparisonGroup(name, taskIds)
  res.status(201).json({ success: true, data: group })
})

router.delete('/comparisons/:id', (req: Request, res: Response): void => {
  const ok = deleteComparisonGroup(req.params.id)
  if (!ok) {
    res.status(404).json({ success: false, error: '对比组未找到' })
    return
  }
  res.json({ success: true })
})

router.post('/validate/batch', (req: Request, res: Response): void => {
  const { taskIds, action, comment, operatorId } = req.body
  if (!Array.isArray(taskIds) || taskIds.length === 0 || !action || !operatorId) {
    res.status(400).json({ success: false, error: '缺少必填字段: taskIds, action, operatorId' })
    return
  }
  if (!['approve', 'reject'].includes(action)) {
    res.status(400).json({ success: false, error: 'action 必须为 approve 或 reject' })
    return
  }
  const updated: SimulationTask[] = []
  for (const tid of taskIds) {
    const task = getTaskById(tid)
    if (!task || task.status !== 'pending_validation') continue
    const newStatus = action === 'approve' ? 'model_building' : 'error_rollback'
    const t = updateTask(tid, {
      status: newStatus as SimulationTask['status'],
      lastValidationStatus: action === 'approve' ? 'approved' : 'rejected',
      lastValidationComment: comment || '',
      lastValidationAt: new Date().toISOString(),
    })
    if (t) updated.push(t)
  }
  addValidationRecord({ taskIds, action, comment: comment || '', operatorId })
  res.json({ success: true, data: { updated, count: updated.length } })
})

router.post('/batch', (req: Request, res: Response): void => {
  const { namePrefix, diskMass, viscosityAlpha, dustSizeDistFile, dimension, userId, count, recommendationSource, recommendationConfidence, recommendationProfile } = req.body
  if (!namePrefix || diskMass == null || viscosityAlpha == null || !userId || !count) {
    res.status(400).json({ success: false, error: '缺少必填字段: namePrefix, diskMass, viscosityAlpha, userId, count' })
    return
  }
  const n = Math.min(Math.max(Number(count), 1), 20)
  const dimValue = String(dimension ?? '1D')
  if (!['1D', '2D'].includes(dimValue)) {
    res.status(400).json({ success: false, error: 'dimension 必须为 1D 或 2D' })
    return
  }
  const batchId = `batch-${Date.now()}`
  const tasks: SimulationTask[] = []
  for (let i = 0; i < n; i++) {
    const task = createTask({
      name: `${namePrefix}-${i + 1}`,
      status: 'pending_validation',
      diskMass: Number(diskMass),
      viscosityAlpha: Number(viscosityAlpha),
      dustSizeDistFile: dustSizeDistFile || 'default_distribution.dat',
      dimension: dimValue as Dimension,
      userId,
      currentStep: 0,
      totalSteps: 6,
      batchId,
      recommendationSource: recommendationSource || undefined,
      recommendationConfidence: recommendationConfidence != null ? Number(recommendationConfidence) : undefined,
      recommendationProfile: recommendationProfile || undefined,
    })
    tasks.push(task)
  }
  res.status(201).json({ success: true, data: { batchId, tasks } })
})

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
  const { name, diskMass, viscosityAlpha, dustSizeDistFile, dimension, userId, batchId, recommendationSource, recommendationConfidence, recommendationProfile, recommendationParams } = req.body
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
    batchId: batchId || undefined,
    recommendationSource: recommendationSource || undefined,
    recommendationConfidence: recommendationConfidence != null ? Number(recommendationConfidence) : undefined,
    recommendationProfile: recommendationProfile || undefined,
    recommendationParams: recommendationParams || undefined,
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
