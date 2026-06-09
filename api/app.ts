import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import simulationRoutes from './routes/simulations.js'
import approvalRoutes from './routes/approvals.js'
import exportRoutes from './routes/exports.js'
import dashboardRoutes from './routes/dashboard.js'
import recommendationRoutes from './routes/recommendations.js'
import uploadRoutes from './routes/upload.js'
import { tick } from './simulationEngine.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/simulations', simulationRoutes)
app.use('/api/approvals', approvalRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/recommendations', recommendationRoutes)
app.use('/api/upload', uploadRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

setInterval(() => {
  tick()
}, 30000)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error.message)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
