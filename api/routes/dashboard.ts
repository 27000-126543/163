import { Router, type Request, type Response } from 'express'
import { getDailyStatistics } from '../db.js'

const router = Router()

router.get('/daily', (_req: Request, res: Response): void => {
  const stats = getDailyStatistics()
  res.json({ success: true, data: stats })
})

router.get('/trends', (_req: Request, res: Response): void => {
  const stats = getDailyStatistics()
  const last7 = stats.slice(-7)
  const trends = {
    dates: last7.map(s => s.date),
    completionRates: last7.map(s => s.completionRate),
    avgEfficiencies: last7.map(s => s.avgEfficiency),
    convergenceCounts: last7.map(s => s.convergenceCount),
    totalSimulations: last7.map(s => s.totalSimulations),
    completedSimulations: last7.map(s => s.completedSimulations),
  }
  res.json({ success: true, data: trends })
})

router.get('/boxplot', (_req: Request, res: Response): void => {
  const stats = getDailyStatistics()
  const completionRates = stats.map(s => s.completionRate)
  const efficiencies = stats.map(s => s.avgEfficiency)
  const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b)
  const q = (arr: number[], p: number) => {
    const idx = (arr.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo)
  }

  const buildBox = (values: number[]) => {
    const s = sorted(values)
    return {
      min: s[0],
      q1: q(s, 0.25),
      median: q(s, 0.5),
      q3: q(s, 0.75),
      max: s[s.length - 1],
    }
  }

  res.json({
    success: true,
    data: {
      completionRate: buildBox(completionRates),
      efficiency: buildBox(efficiencies),
    },
  })
})

export default router
