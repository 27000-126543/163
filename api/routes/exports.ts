import { Router, type Request, type Response } from 'express'
import { getAllTasks } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const format = (req.query.format as string) || 'json'
  const minDiskMass = req.query.minDiskMass ? parseFloat(req.query.minDiskMass as string) : undefined
  const maxDiskMass = req.query.maxDiskMass ? parseFloat(req.query.maxDiskMass as string) : undefined
  const days = req.query.timeWindow ? parseInt(req.query.timeWindow as string, 10) : undefined

  let tasks = getAllTasks()

  if (minDiskMass != null) {
    tasks = tasks.filter(t => t.diskMass >= minDiskMass)
  }
  if (maxDiskMass != null) {
    tasks = tasks.filter(t => t.diskMass <= maxDiskMass)
  }
  if (days != null) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString()
    tasks = tasks.filter(t => t.createdAt >= cutoff)
  }

  if (format === 'csv') {
    const header = 'id,name,status,diskMass,viscosityAlpha,dimension,createdAt'
    const rows = tasks.map(t =>
      `${t.id},${t.name},${t.status},${t.diskMass},${t.viscosityAlpha},${t.dimension},${t.createdAt}`
    )
    res.type('text/csv').send([header, ...rows].join('\n'))
    return
  }

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
