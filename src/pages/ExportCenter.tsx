import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import type { ReportArchive } from '@/store';
import { Download, FileText, FileJson, FileSpreadsheet, Loader2, Archive, AlertCircle, ChevronRight, X, Clock, CheckCircle2, XCircle } from 'lucide-react';

const timeWindowOptions = [
  { value: '7', label: '7天' },
  { value: '30', label: '30天' },
  { value: '90', label: '90天' },
  { value: 'all', label: '全部' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending_validation', label: '待校验' },
  { value: 'model_building', label: '模型构建' },
  { value: 'dust_growth', label: '尘埃生长' },
  { value: 'particle_aggregation', label: '粒子聚集' },
  { value: 'embryo_formation', label: '胚胎形成' },
  { value: 'orbital_evolution', label: '轨道演化' },
  { value: 'completed', label: '已完成' },
  { value: 'error_rollback', label: '错误回滚' },
];

const dimensionOptions = [
  { value: '', label: '全部维度' },
  { value: '1D', label: '1D' },
  { value: '2D', label: '2D' },
];

export default function ExportCenter() {
  const { simulations, fetchSimulations, comparisonGroups, fetchComparisonGroups, reportArchives, fetchReportArchives, generateComparisonReport } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const diskMassMin = searchParams.get('minDiskMass') || '';
  const diskMassMax = searchParams.get('maxDiskMass') || '';
  const timeWindow = searchParams.get('timeWindow') || '30';
  const exportFormat = (searchParams.get('format') as 'JSON' | 'CSV') || 'JSON';
  const statusFilter = searchParams.get('status') || '';
  const dimensionFilter = searchParams.get('dimension') || '';
  const recSourceFilter = searchParams.get('recommendationSource') || '';
  const compGroupFilter = searchParams.get('comparisonGroupId') || '';

  const [reportTaskId, setReportTaskId] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
  const [reportError, setReportError] = useState('');

  const [compReportGroupId, setCompReportGroupId] = useState('');
  const [compReportStatus, setCompReportStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
  const [compReportError, setCompReportError] = useState('');

  const [detailArchive, setDetailArchive] = useState<ReportArchive | null>(null);

  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    fetchSimulations();
    fetchComparisonGroups();
    fetchReportArchives();
  }, [fetchSimulations, fetchComparisonGroups, fetchReportArchives]);

  const recSources = [...new Set(simulations.filter(s => s.recommendationSource).map(s => s.recommendationSource!))];

  const handleExport = () => {
    const params = new URLSearchParams({
      format: exportFormat.toLowerCase(),
      timeWindow,
    });
    if (diskMassMin) params.set('minDiskMass', diskMassMin);
    if (diskMassMax) params.set('maxDiskMass', diskMassMax);
    if (statusFilter) params.set('status', statusFilter);
    if (dimensionFilter) params.set('dimension', dimensionFilter);
    if (recSourceFilter) params.set('recommendationSource', recSourceFilter);
    if (compGroupFilter) params.set('comparisonGroupId', compGroupFilter);
    window.open(`/api/export?${params.toString()}`, '_blank');
  };

  const handleGenerateReport = async () => {
    if (!reportTaskId) return;
    setReportStatus('generating');
    setReportError('');
    try {
      const res = await fetch(`/api/export/reports/task/${reportTaskId}/generate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setReportStatus('error');
        setReportError(json.error || '生成失败');
        return;
      }
      setReportStatus('ready');
      fetchReportArchives();
    } catch {
      setReportStatus('error');
      setReportError('网络请求失败');
    }
  };

  const handleGenerateCompReport = async () => {
    if (!compReportGroupId) return;
    setCompReportStatus('generating');
    setCompReportError('');
    try {
      await generateComparisonReport(compReportGroupId);
      setCompReportStatus('ready');
    } catch (e) {
      setCompReportStatus('error');
      setCompReportError((e as Error).message || '生成失败');
    }
  };

  const formatIcon = (fmt: string) => {
    switch (fmt) {
      case 'JSON':
        return <FileJson size={14} className="text-nebula-400" />;
      case 'CSV':
        return <FileSpreadsheet size={14} className="text-aurora-400" />;
      case 'PDF':
        return <FileText size={14} className="text-plasma-400" />;
      default:
        return <FileText size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h3 className="cosmos-section-title flex items-center gap-2">
          <Download size={20} className="text-nebula-300" />
          数据导出中心
        </h3>
        <p className="text-sm text-gray-400 mt-1">模拟数据与可视化结果的批量导出与格式转换</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="cosmos-card p-5 space-y-4">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Download size={14} className="text-nebula-400" />筛选与导出
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="cosmos-label">盘质量下限 (M☉)</label>
              <input type="number" step="0.01" value={diskMassMin} onChange={(e) => updateParam('minDiskMass', e.target.value)} placeholder="0.01" className="cosmos-input" />
            </div>
            <div>
              <label className="cosmos-label">盘质量上限 (M☉)</label>
              <input type="number" step="0.01" value={diskMassMax} onChange={(e) => updateParam('maxDiskMass', e.target.value)} placeholder="0.5" className="cosmos-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="cosmos-label">时间窗口</label>
              <select value={timeWindow} onChange={(e) => updateParam('timeWindow', e.target.value)} className="cosmos-input">
                {timeWindowOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label className="cosmos-label">任务状态</label>
              <select value={statusFilter} onChange={(e) => updateParam('status', e.target.value)} className="cosmos-input">
                {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="cosmos-label">维度</label>
              <select value={dimensionFilter} onChange={(e) => updateParam('dimension', e.target.value)} className="cosmos-input">
                {dimensionOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label className="cosmos-label">推荐来源</label>
              <select value={recSourceFilter} onChange={(e) => updateParam('recommendationSource', e.target.value)} className="cosmos-input">
                <option value="">全部</option>
                {recSources.map(src => (<option key={src} value={src}>{src}</option>))}
              </select>
            </div>
          </div>

          {comparisonGroups.length > 0 && (
            <div>
              <label className="cosmos-label">对比组</label>
              <select value={compGroupFilter} onChange={(e) => updateParam('comparisonGroupId', e.target.value)} className="cosmos-input">
                <option value="">全部</option>
                {comparisonGroups.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.taskIds.length}个任务)</option>))}
              </select>
            </div>
          )}

          <div>
            <label className="cosmos-label">导出格式</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="format" checked={exportFormat === 'JSON'} onChange={() => updateParam('format', 'JSON')} className="accent-nebula-500" />
                <span className="text-sm text-gray-300">JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="format" checked={exportFormat === 'CSV'} onChange={() => updateParam('format', 'CSV')} className="accent-nebula-500" />
                <span className="text-sm text-gray-300">CSV</span>
              </label>
            </div>
          </div>

          <button onClick={handleExport} className="cosmos-btn-primary flex items-center gap-2 w-full justify-center">
            <Download size={16} />导出数据
          </button>
        </div>

        <div className="space-y-6">
          <div className="cosmos-card p-5 space-y-4">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <FileText size={14} className="text-plasma-400" />单任务报告
            </h4>

            <div>
              <label className="cosmos-label">选择模拟任务</label>
              <select value={reportTaskId} onChange={(e) => { setReportTaskId(e.target.value); setReportStatus('idle'); setReportError(''); }} className="cosmos-input">
                <option value="">-- 请选择任务 --</option>
                {simulations.map((sim) => (<option key={sim.id} value={sim.id}>{sim.name}</option>))}
              </select>
            </div>

            <button onClick={handleGenerateReport} disabled={reportStatus === 'generating' || !reportTaskId} className="cosmos-btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {reportStatus === 'generating' ? (<><Loader2 size={16} className="animate-spin" />生成中...</>) : (<><FileText size={16} />生成综合报告PDF</>)}
            </button>

            {reportStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-300">生成失败: {reportError}</p>
                <button onClick={() => setReportStatus('idle')} className="mt-1 text-xs text-gray-400 hover:text-gray-200">重试</button>
              </div>
            )}
          </div>

          {comparisonGroups.length > 0 && (
            <div className="cosmos-card p-5 space-y-4">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <FileText size={14} className="text-aurora-400" />对比组报告
              </h4>

              <div>
                <label className="cosmos-label">选择对比组</label>
                <select value={compReportGroupId} onChange={(e) => { setCompReportGroupId(e.target.value); setCompReportStatus('idle'); setCompReportError(''); }} className="cosmos-input">
                  <option value="">-- 请选择对比组 --</option>
                  {comparisonGroups.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.taskIds.length}个任务)</option>))}
                </select>
              </div>

              <button onClick={handleGenerateCompReport} disabled={compReportStatus === 'generating' || !compReportGroupId} className="cosmos-btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {compReportStatus === 'generating' ? (<><Loader2 size={16} className="animate-spin" />生成中...</>) : (<><FileText size={16} />生成对比组综合报告</>)}
              </button>

              {compReportStatus === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-xs text-red-300">生成失败: {compReportError}</p>
                  <button onClick={() => setCompReportStatus('idle')} className="mt-1 text-xs text-gray-400 hover:text-gray-200">重试</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="cosmos-card p-5">
        <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <Archive size={14} className="text-aurora-400" />报告归档
        </h4>
        {reportArchives.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">暂无报告记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-cosmos-500/30">
                  <th className="pb-2 font-medium">名称</th>
                  <th className="pb-2 font-medium">类型</th>
                  <th className="pb-2 font-medium">生成时间</th>
                  <th className="pb-2 font-medium">状态</th>
                  <th className="pb-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {reportArchives.map((archive) => (
                  <tr key={archive.id} className="border-b border-cosmos-500/10 last:border-0 hover:bg-cosmos-500/5 cursor-pointer" onClick={() => setDetailArchive(archive)}>
                    <td className="py-2.5 text-gray-200">{archive.taskName}</td>
                    <td className="py-2.5">
                      {archive.comparisonGroupId ? (
                        <span className="cosmos-badge bg-aurora-500/20 text-aurora-400 border border-aurora-500/30">对比组</span>
                      ) : (
                        <span className="cosmos-badge bg-nebula-500/20 text-nebula-400 border border-nebula-500/30">单任务</span>
                      )}
                    </td>
                    <td className="py-2.5 text-gray-400">{new Date(archive.generatedAt).toLocaleString('zh-CN')}</td>
                    <td className="py-2.5">
                      {archive.status === 'generated' ? (
                        <span className="cosmos-badge cosmos-badge-aurora">已生成</span>
                      ) : (
                        <span className="cosmos-badge cosmos-badge-danger">失败</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        {archive.status === 'generated' && (
                          <a
                            href={`/api/export/reports/${archive.taskId}/download`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs text-plasma-300 hover:text-plasma-200 transition-colors"
                          >
                            <Download size={12} />下载
                          </a>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                          详情 <ChevronRight size={12} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetailArchive(null)}>
          <div className="cosmos-card w-full max-w-lg mx-4 p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="cosmos-section-title text-base">报告详情</h3>
              <button className="p-1 rounded-md hover:bg-cosmos-600 text-gray-400 hover:text-gray-200 transition-colors" onClick={() => setDetailArchive(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">名称</span>
                <span className="text-gray-200">{detailArchive.taskName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">类型</span>
                <span className={detailArchive.comparisonGroupId ? 'text-aurora-400' : 'text-nebula-400'}>
                  {detailArchive.comparisonGroupId ? `对比组: ${detailArchive.comparisonGroupName || detailArchive.comparisonGroupId}` : '单任务'}
                </span>
              </div>

              {detailArchive.comparisonGroupId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">对比组ID</span>
                  <span className="text-gray-400 font-mono text-xs">{detailArchive.comparisonGroupId}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-500">状态</span>
                {detailArchive.status === 'generated' ? (
                  <span className="flex items-center gap-1.5 text-aurora-400">
                    <CheckCircle2 size={14} />已生成
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-red-400">
                    <XCircle size={14} />失败
                  </span>
                )}
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">生成时间</span>
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Clock size={12} />{new Date(detailArchive.generatedAt).toLocaleString('zh-CN')}
                </span>
              </div>

              {detailArchive.status === 'failed' && detailArchive.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-xs text-red-300">
                    <AlertCircle size={12} className="inline mr-1" />失败原因: {detailArchive.error}
                  </p>
                </div>
              )}
            </div>

            {detailArchive.status === 'generated' && (
              <div className="mt-5 pt-4 border-t border-cosmos-500/30">
                <a
                  href={`/api/export/reports/${detailArchive.taskId}/download`}
                  className="cosmos-btn-primary flex items-center gap-2 w-full justify-center"
                >
                  <Download size={16} />下载 PDF 报告
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
