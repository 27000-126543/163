import { Router, type Request, type Response } from 'express'
import { getAllRecommendations } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const recommendations = getAllRecommendations()
  res.json({ success: true, data: recommendations })
})

export default router
