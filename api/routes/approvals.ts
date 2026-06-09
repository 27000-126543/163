import { Router, type Request, type Response } from 'express'
import {
  getAllApprovals,
  getApprovalById,
  updateApproval,
  getAdjustmentLogsByTaskId,
  type ApprovalStatus,
} from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const approvals = getAllApprovals()
  res.json({ success: true, data: approvals })
})

router.post('/:id/review', (req: Request, res: Response): void => {
  const { status, comment } = req.body
  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: 'status 必须为 approved 或 rejected' })
    return
  }
  const approval = getApprovalById(req.params.id)
  if (!approval) {
    res.status(404).json({ success: false, error: '审批记录未找到' })
    return
  }
  if (approval.status !== 'pending') {
    res.status(400).json({ success: false, error: '该审批已处理' })
    return
  }
  const updated = updateApproval(req.params.id, {
    status: status as ApprovalStatus,
    comment: comment || '',
  })
  res.json({ success: true, data: updated })
})

router.get('/:id/logs', (req: Request, res: Response): void => {
  const logs = getAdjustmentLogsByTaskId(req.params.id)
  res.json({ success: true, data: logs })
})

export default router
