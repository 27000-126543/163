import { Router, type Request, type Response } from 'express'
import { getAllTasks, getTaskById, getEmbryosByTaskId, getSnapshotsByTaskId } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const format = (req.query.format as string) || 'json'
  const minDiskMass = req.query.minDiskMass ? parseFloat(req.query.minDiskMass as string) : undefined
  const maxDiskMass = req.query.maxDiskMass ? parseFloat(req.query.maxDiskMass as string) : undefined
  const timeWindow = req.query.timeWindow as string

  let tasks = getAllTasks()

  if (minDiskMass != null) {
    tasks = tasks.filter(t => t.diskMass >= minDiskMass)
  }
  if (maxDiskMass != null) {
    tasks = tasks.filter(t => t.diskMass <= maxDiskMass)
  }
  if (timeWindow && timeWindow !== 'all') {
    const days = parseInt(timeWindow, 10)
    if (!isNaN(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 86400000).toISOString()
      tasks = tasks.filter(t => t.createdAt >= cutoff)
    }
  }

  if (format.toLowerCase() === 'csv') {
    const header = 'id,name,status,diskMass,viscosityAlpha,dimension,createdAt'
    const rows = tasks.map(t =>
      `${t.id},"${t.name}",${t.status},${t.diskMass},${t.viscosityAlpha},${t.dimension},${t.createdAt}`
    )
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=simulation_export.csv')
    res.send([header, ...rows].join('\n'))
    return
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=simulation_export.json')
  res.json({ success: true, data: tasks })
})

router.post('/reports/:id/generate', (req: Request, res: Response): void => {
  const task = getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: '任务未找到' })
    return
  }
  res.json({
    success: true,
    data: {
      reportId: req.params.id,
      taskId: task.id,
      taskName: task.name,
      status: 'generated',
      generatedAt: new Date().toISOString(),
    },
  })
})

router.get('/reports/:id/download', (req: Request, res: Response): void => {
  const task = getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: '任务未找到' })
    return
  }
  const embryos = getEmbryosByTaskId(task.id)
  const snapshots = getSnapshotsByTaskId(task.id)

  const lines = [
    '============================================================',
    `  ProtoSim 综合模拟报告`,
    '============================================================',
    '',
    `任务名称: ${task.name}`,
    `任务ID:   ${task.id}`,
    `状态:     ${task.status}`,
    `创建时间: ${task.createdAt}`,
    '',
    '--- 盘参数 ---',
    `盘初始质量:    ${task.diskMass} M_sun`,
    `α粘性参数:     ${task.viscosityAlpha}`,
    `模拟维度:      ${task.dimension}`,
    `尘埃粒径文件:  ${task.dustSizeDistFile}`,
    '',
    '--- 模拟进度 ---',
    `当前步骤: ${task.currentStep} / ${task.totalSteps}`,
    '',
    '--- 行星胚胎 ---',
    embryos.length > 0
      ? embryos.map(e => `  ID=${e.id}  质量=${e.mass} M_earth  半长轴=${e.semiMajorAxis} AU  离心率=${e.eccentricity}`).join('\n')
      : '  暂无行星胚胎数据',
    '',
    '--- 监控快照 ---',
    snapshots.length > 0
      ? snapshots.map(s => `  ${s.timestamp}  生长率=${s.dustGrowthRate}  Toomre Q=${s.toomreQ}  网格级别=${s.meshRefinementLevel}`).join('\n')
      : '  暂无监控数据',
    '',
    '============================================================',
    `  报告生成时间: ${new Date().toISOString()}`,
    '============================================================',
  ]

  const pdfContent = lines.join('\n')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="report_${task.id}.pdf"`)
  res.send(Buffer.from(pdfContent, 'utf-8'))
})

export default router
