import { Router, type Request, type Response } from 'express'
import { getAllTasks, getEmbryosByTaskId } from '../db.js'

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
  res.json({
    success: true,
    data: {
      reportId: req.params.id,
      status: 'generated',
      generatedAt: new Date().toISOString(),
    },
  })
})

router.get('/reports/:id/download', (req: Request, res: Response): void => {
  res.type('application/pdf')
  res.send(Buffer.from(`Mock PDF report for ${req.params.id}`))
})

export default router
