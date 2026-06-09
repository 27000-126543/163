import { Router, type Request, type Response } from 'express'
import { getAllTasks, getTaskById, getEmbryosByTaskId, getSnapshotsByTaskId, addReportArchive, getAllReportArchives, getAllComparisonGroups, getComparisonGroupById } from '../db.js'

const router = Router()

const CSV_COLUMNS = ['id', 'name', 'status', 'diskMass', 'viscosityAlpha', 'dimension', 'dustSizeDistFile', 'userId', 'currentStep', 'totalSteps', 'createdAt', 'batchId', 'recommendationSource', 'recommendationConfidence', 'recommendationProfile', 'recommendationParams', 'lastValidationStatus', 'lastValidationComment', 'lastValidationAt'] as const

router.get('/', (req: Request, res: Response): void => {
  const format = (req.query.format as string) || 'json'
  const minDiskMass = req.query.minDiskMass ? parseFloat(req.query.minDiskMass as string) : undefined
  const maxDiskMass = req.query.maxDiskMass ? parseFloat(req.query.maxDiskMass as string) : undefined
  const timeWindow = req.query.timeWindow as string
  const status = req.query.status as string
  const dimension = req.query.dimension as string
  const recommendationSource = req.query.recommendationSource as string
  const comparisonGroupId = req.query.comparisonGroupId as string

  let tasks = getAllTasks()

  if (comparisonGroupId) {
    const group = getAllComparisonGroups().find(g => g.id === comparisonGroupId)
    if (group) tasks = tasks.filter(t => group.taskIds.includes(t.id))
  }
  if (minDiskMass != null) tasks = tasks.filter(t => t.diskMass >= minDiskMass)
  if (maxDiskMass != null) tasks = tasks.filter(t => t.diskMass <= maxDiskMass)
  if (timeWindow && timeWindow !== 'all') {
    const days = parseInt(timeWindow, 10)
    if (!isNaN(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 86400000).toISOString()
      tasks = tasks.filter(t => t.createdAt >= cutoff)
    }
  }
  if (status) tasks = tasks.filter(t => t.status === status)
  if (dimension) tasks = tasks.filter(t => t.dimension === dimension)
  if (recommendationSource) tasks = tasks.filter(t => t.recommendationSource === recommendationSource)

  if (format.toLowerCase() === 'csv') {
    const header = CSV_COLUMNS.join(',')
    const rows = tasks.map(t =>
      CSV_COLUMNS.map(col => {
        const val = t[col as keyof typeof t]
        if (val == null) return ''
        const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
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

router.get('/reports', (_req: Request, res: Response): void => {
  res.json({ success: true, data: getAllReportArchives() })
})

router.post('/reports/task/:id/generate', (req: Request, res: Response): void => {
  const task = getTaskById(req.params.id)
  if (!task) {
    addReportArchive({ taskId: req.params.id, taskName: '(未知)', status: 'failed', error: '任务未找到', generatedAt: new Date().toISOString() })
    res.status(404).json({ success: false, error: '任务未找到' })
    return
  }
  const archive = addReportArchive({
    taskId: task.id,
    taskName: task.name,
    status: 'generated',
    generatedAt: new Date().toISOString(),
  })
  res.json({ success: true, data: { reportId: archive.id, taskId: task.id, taskName: task.name, status: 'generated', generatedAt: archive.generatedAt } })
})

router.post('/reports/comparison/:groupId/generate', (req: Request, res: Response): void => {
  const group = getComparisonGroupById(req.params.groupId)
  if (!group) {
    res.status(404).json({ success: false, error: '对比组未找到' })
    return
  }
  const archive = addReportArchive({
    taskId: `comparison:${group.id}`,
    taskName: `对比组: ${group.name}`,
    status: 'generated',
    generatedAt: new Date().toISOString(),
    comparisonGroupId: group.id,
    comparisonGroupName: group.name,
  })
  res.json({ success: true, data: { reportId: archive.id, taskId: archive.taskId, taskName: archive.taskName, status: 'generated', generatedAt: archive.generatedAt, comparisonGroupId: group.id } })
})

function strToUtf16BeHex(s: string): string {
  const buf = Buffer.from(s, 'utf16le')
  const hexChars: string[] = []
  for (let i = 0; i < buf.length; i += 2) {
    hexChars.push(buf[i + 1].toString(16).padStart(2, '0'))
    hexChars.push(buf[i].toString(16).padStart(2, '0'))
  }
  return hexChars.join('')
}

function buildPdf(textLines: string[]): Buffer {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const marginX = 50
  const marginTop = 60
  const fontSize = 11
  const lineHeight = 18
  const maxLinesPerPage = Math.floor((pageHeight - 2 * marginTop) / lineHeight)

  const objects: { num: number; content: string | Buffer }[] = []
  let objNum = 1
  const addObj = (content: string | Buffer): number => {
    const n = objNum++
    objects.push({ num: n, content })
    return n
  }

  const cidFontId = addObj('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 1000 >>')

  const type0FontId = addObj(`<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /Identity-H /DescendantFonts [${cidFontId} 0 R] >>`)

  const pagesRef = 2

  const wrappedLines: string[] = []
  for (const line of textLines) {
    if (!line) { wrappedLines.push(''); continue }
    const maxChars = 80
    if (line.length <= maxChars) { wrappedLines.push(line); continue }
    for (let i = 0; i < line.length; i += maxChars) {
      wrappedLines.push(line.slice(i, i + maxChars))
    }
  }

  const pages: number[] = []
  for (let i = 0; i < wrappedLines.length; i += maxLinesPerPage) {
    const chunk = wrappedLines.slice(i, i + maxLinesPerPage)
    const streamParts: string[] = []
    streamParts.push('BT')
    streamParts.push(`/F1 ${fontSize} Tf`)
    chunk.forEach((l, idx) => {
      if (!l) return
      const y = pageHeight - marginTop - idx * lineHeight
      const hexStr = strToUtf16BeHex(l)
      streamParts.push(`1 0 0 1 ${marginX} ${y.toFixed(2)} Tm`)
      streamParts.push(`<${hexStr}> Tj`)
    })
    streamParts.push('ET')
    const streamContent = streamParts.join('\n')
    const streamBuf = Buffer.from(streamContent, 'binary')
    const streamId = addObj(Buffer.concat([
      Buffer.from(`<< /Length ${streamBuf.length} >>\nstream\n`, 'binary'),
      streamBuf,
      Buffer.from('\nendstream', 'binary'),
    ]))
    const pageId = addObj(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${type0FontId} 0 R >> >> >>`)
    pages.push(pageId)
  }

  if (pages.length === 0) {
    const sc = `BT\n/F1 ${fontSize} Tf\n1 0 0 1 ${marginX} ${pageHeight - marginTop} Tm <0020> Tj\nET`
    const scBuf = Buffer.from(sc, 'binary')
    const sid = addObj(Buffer.concat([
      Buffer.from(`<< /Length ${scBuf.length} >>\nstream\n`, 'binary'),
      scBuf,
      Buffer.from('\nendstream', 'binary'),
    ]))
    pages.push(addObj(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${sid} 0 R /Resources << /Font << /F1 ${type0FontId} 0 R >> >> >>`))
  }

  const pagesId = addObj(`<< /Type /Pages /Kids [${pages.map(p => `${p} 0 R`).join(' ')}] /Count ${pages.length} >>`)

  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  objects[pagesRef - 1] = { num: pagesRef, content: `<< /Type /Pages /Kids [${pages.map(p => `${p} 0 R`).join(' ')}] /Count ${pages.length} >>` }

  const buf: number[] = []
  const writeStr = (s: string) => { for (let i = 0; i < s.length; i++) buf.push(s.charCodeAt(i)) }
  const writeBuf = (b: Buffer) => { for (let i = 0; i < b.length; i++) buf.push(b[i]) }

  writeStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const offsets: Record<number, number> = {}

  for (const obj of objects) {
    offsets[obj.num] = buf.length
    const header = `${obj.num} 0 obj\n`
    const footer = '\nendobj\n'
    writeBuf(Buffer.from(header, 'binary'))
    if (Buffer.isBuffer(obj.content)) {
      writeBuf(obj.content)
    } else {
      writeBuf(Buffer.from(obj.content as string, 'binary'))
    }
    writeBuf(Buffer.from(footer, 'binary'))
  }

  const xrefOffset = buf.length
  writeStr('xref\n')
  writeStr(`0 ${objNum}\n`)
  writeStr('0000000000 65535 f \n')
  for (let i = 1; i < objNum; i++) {
    writeStr(`${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`)
  }
  writeStr('trailer\n')
  writeStr(`<< /Size ${objNum} /Root ${catalogId} 0 R >>\n`)
  writeStr('startxref\n')
  writeStr(`${xrefOffset}\n`)
  writeStr('%%EOF\n')

  return Buffer.from(buf)
}

router.get('/reports/:id/download', (req: Request, res: Response): void => {
  const id = req.params.id

  if (id.startsWith('comparison:')) {
    const groupId = id.replace('comparison:', '')
    const group = getComparisonGroupById(groupId)
    if (!group) {
      res.status(404).json({ success: false, error: '对比组未找到' })
      return
    }
    const tasks = getAllTasks().filter(t => group.taskIds.includes(t.id))
    const lines = [
      '============================================================',
      '  ProtoSim 对比组综合报告',
      '============================================================',
      '',
      `对比组名称: ${group.name}`,
      `对比组ID:   ${group.id}`,
      `任务数量:   ${group.taskIds.length}`,
      `生成时间:   ${new Date().toLocaleString('zh-CN')}`,
      '',
      '--- 组内任务对比 ---',
    ]
    tasks.forEach((t, idx) => {
      const snaps = getSnapshotsByTaskId(t.id)
      const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null
      lines.push('')
      lines.push(`[${idx + 1}] ${t.name}`)
      lines.push(`    盘质量: ${t.diskMass} M\u2609    \u03B1粘性: ${t.viscosityAlpha}    维度: ${t.dimension}`)
      lines.push(`    状态: ${t.status}    进度: ${t.currentStep}/${t.totalSteps}`)
      if (latest) {
        lines.push(`    最新 Toomre Q: ${latest.toomreQ}    尘埃生长率: ${latest.dustGrowthRate}`)
      }
      if (t.recommendationSource) {
        lines.push(`    推荐来源: ${t.recommendationSource}`)
      }
      if (t.recommendationParams) {
        lines.push(`    推荐参数: ${Object.entries(t.recommendationParams).map(([k, v]) => `${k}=${v}`).join(', ')}`)
      }
    })
    lines.push('')
    lines.push('============================================================')

    const pdfBuf = buildPdf(lines)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="comparison_${group.id}.pdf"`)
    res.setHeader('Content-Length', pdfBuf.length)
    res.send(pdfBuf)
    return
  }

  const task = getTaskById(id)
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
    `盘初始质量:    ${task.diskMass} M\u2609`,
    `\u03B1粘性参数:     ${task.viscosityAlpha}`,
    `模拟维度:      ${task.dimension}`,
    `尘埃粒径文件:  ${task.dustSizeDistFile}`,
    '',
    '--- 推荐来源 ---',
    task.recommendationSource ? `推荐机制:   ${task.recommendationSource}` : '推荐机制:   (无)',
    task.recommendationConfidence != null ? `置信度:     ${(task.recommendationConfidence * 100).toFixed(1)}%` : '置信度:     (无)',
    task.recommendationProfile ? `粘滞剖面:   ${task.recommendationProfile}` : '粘滞剖面:   (无)',
    '',
    '--- 推荐参数 ---',
    task.recommendationParams && Object.keys(task.recommendationParams).length > 0
      ? Object.entries(task.recommendationParams).map(([k, v]) => `  ${k}: ${v}`).join('\n')
      : '  (无)',
    '',
    '--- 校验记录 ---',
    task.lastValidationStatus ? `校验结果:   ${task.lastValidationStatus === 'approved' ? '通过' : '退回'}` : '校验结果:   (未校验)',
    task.lastValidationComment ? `校验意见:   ${task.lastValidationComment}` : '',
    task.lastValidationAt ? `校验时间:   ${task.lastValidationAt}` : '',
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
    `  报告生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '============================================================',
  ]

  const pdfBuf = buildPdf(lines)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="report_${task.id}.pdf"`)
  res.setHeader('Content-Length', pdfBuf.length)
  res.send(pdfBuf)
})

export default router
