import { Router, type Request, type Response } from 'express'
import { getAllTasks, getTaskById, getEmbryosByTaskId, getSnapshotsByTaskId } from '../db.js'

const router = Router()

const CSV_COLUMNS = ['id', 'name', 'status', 'diskMass', 'viscosityAlpha', 'dimension', 'dustSizeDistFile', 'userId', 'currentStep', 'totalSteps', 'createdAt', 'batchId', 'recommendationSource', 'recommendationConfidence', 'recommendationProfile'] as const

router.get('/', (req: Request, res: Response): void => {
  const format = (req.query.format as string) || 'json'
  const minDiskMass = req.query.minDiskMass ? parseFloat(req.query.minDiskMass as string) : undefined
  const maxDiskMass = req.query.maxDiskMass ? parseFloat(req.query.maxDiskMass as string) : undefined
  const timeWindow = req.query.timeWindow as string
  const status = req.query.status as string
  const dimension = req.query.dimension as string
  const recommendationSource = req.query.recommendationSource as string

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
  if (status) {
    tasks = tasks.filter(t => t.status === status)
  }
  if (dimension) {
    tasks = tasks.filter(t => t.dimension === dimension)
  }
  if (recommendationSource) {
    tasks = tasks.filter(t => t.recommendationSource === recommendationSource)
  }

  if (format.toLowerCase() === 'csv') {
    const header = CSV_COLUMNS.join(',')
    const rows = tasks.map(t =>
      CSV_COLUMNS.map(col => {
        const val = t[col as keyof typeof t]
        if (val == null) return ''
        const s = String(val)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(',')
    )
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=simulation_export.csv')
    res.send('\uFEFF' + [header, ...rows].join('\n'))
    return
  }

  const exportData = tasks.map(t => {
    const obj: Record<string, unknown> = {}
    for (const col of CSV_COLUMNS) {
      obj[col] = t[col as keyof typeof t] ?? null
    }
    return obj
  })
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=simulation_export.json')
  res.json({ success: true, data: exportData })
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

function buildPdf(textLines: string[]): Buffer {
  const lines = textLines.map(l => l || ' ')
  const objects: string[] = []
  let objNum = 0

  const addObj = (content: string): number => {
    objNum++
    objects.push(`${objNum} 0 obj\n${content}\nendobj`)
    return objNum
  }

  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>')
  const pageWidth = 595.28
  const pageHeight = 841.89
  const marginX = 50
  const marginTop = 50
  const lineHeight = 14
  const maxCharsPerLine = 80
  const maxLinesPerPage = Math.floor((pageHeight - 2 * marginTop) / lineHeight)

  const wrappedLines: string[] = []
  for (const line of lines) {
    if (line.length <= maxCharsPerLine) {
      wrappedLines.push(line)
    } else {
      for (let i = 0; i < line.length; i += maxCharsPerLine) {
        wrappedLines.push(line.slice(i, i + maxCharsPerLine))
      }
    }
  }

  const pages: number[] = []
  for (let i = 0; i < wrappedLines.length; i += maxLinesPerPage) {
    const chunk = wrappedLines.slice(i, i + maxLinesPerPage)
    const streamLines = chunk.map((l, idx) => {
      const escaped = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
      return `${marginX} ${pageHeight - marginTop - idx * lineHeight} Td (${escaped}) Tj 0 ${-lineHeight} Td`
    })
    const streamContent = `BT\n/F1 10 Tf\n${streamLines.join('\n')}\nET`
    const streamId = addObj(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`)
    const pageId = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`)
    pages.push(pageId)
  }

  const pagesId = addObj(`<< /Type /Pages /Kids [${pages.map(p => `${p} 0 R`).join(' ')}] /Count ${pages.length} >>`)

  objects[1] = `${2} 0 obj\n<< /Type /Pages /Kids [${pages.map(p => `${p} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj`

  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId > 2 ? pagesId : 2} 0 R >>`)

  const buf: number[] = []
  const write = (s: string) => {
    for (let i = 0; i < s.length; i++) buf.push(s.charCodeAt(i))
  }
  const writeBin = (b: Buffer) => {
    for (let i = 0; i < b.length; i++) buf.push(b[i])
  }

  write('%PDF-1.4\n')
  const offsets: number[] = []
  for (let i = 0; i < objects.length; i++) {
    const objIdx = i + 1
    offsets[objIdx] = buf.length
    writeBin(Buffer.from(`${objIdx} 0 obj\n${objects[i].split('\n').slice(1, -1).join('\n')}\nendobj\n`))
  }

  const xrefOffset = buf.length
  write('xref\n')
  write(`0 ${objects.length + 1}\n`)
  write('0000000000 65535 f \n')
  for (let i = 1; i <= objects.length; i++) {
    write(`${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`)
  }
  write('trailer\n')
  write(`<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`)
  write('startxref\n')
  write(`${xrefOffset}\n`)
  write('%%EOF\n')

  return Buffer.from(buf)
}

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
    '  ProtoSim 综合模拟报告',
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
    '--- 推荐来源 ---',
    task.recommendationSource ? `推荐机制:   ${task.recommendationSource}` : '推荐机制:   (无)',
    task.recommendationConfidence != null ? `置信度:     ${(task.recommendationConfidence * 100).toFixed(1)}%` : '置信度:     (无)',
    task.recommendationProfile ? `粘滞剖面:   ${task.recommendationProfile}` : '粘滞剖面:   (无)',
    '',
    '--- 模拟进度 ---',
    `当前步骤: ${task.currentStep} / ${task.totalSteps}`,
    `完成率:   ${task.totalSteps > 0 ? Math.round((task.currentStep / task.totalSteps) * 100) : 0}%`,
    '',
    '--- 行星胚胎 ---',
    embryos.length > 0
      ? embryos.map(e => `  ID=${e.id}  质量=${e.mass}M_earth  半长轴=${e.semiMajorAxis}AU  离心率=${e.eccentricity}`).join('\n')
      : '  暂无行星胚胎数据',
    '',
    '--- 监控快照 ---',
    snapshots.length > 0
      ? snapshots.map(s => `  ${s.timestamp}  生长率=${s.dustGrowthRate}  Toomre Q=${s.toomreQ}  网格=${s.meshRefinementLevel}`).join('\n')
      : '  暂无监控数据',
    '',
    '============================================================',
    `  报告生成时间: ${new Date().toISOString()}`,
    '============================================================',
  ]

  const pdfBuf = buildPdf(lines)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="report_${task.id}.pdf"`)
  res.setHeader('Content-Length', pdfBuf.length)
  res.send(pdfBuf)
})

export default router
