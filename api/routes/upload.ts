import { Router, type Request, type Response } from 'express'
import multer from 'multer'

const upload = multer({ storage: multer.memoryStorage() })

const router = Router()

router.post('/', upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '未上传文件' })
    return
  }

  const parsedData = {
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    encoding: req.file.encoding,
    parsedRows: Math.floor(Math.random() * 500) + 50,
    columns: ['radius', 'density', 'temperature', 'dust_fraction'],
    sampleData: [
      { radius: 0.5, density: 1.2e-9, temperature: 1200, dust_fraction: 0.01 },
      { radius: 1.0, density: 8.5e-10, temperature: 800, dust_fraction: 0.015 },
      { radius: 5.2, density: 3.2e-10, temperature: 150, dust_fraction: 0.03 },
    ],
  }

  res.json({ success: true, data: parsedData })
})

export default router
