import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Download, FileText, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';

interface PastExport {
  id: string;
  filename: string;
  format: string;
  size: string;
  date: string;
}

const mockPastExports: PastExport[] = [
  { id: '1', filename: 'simulation_results_20260609', format: 'JSON', size: '2.4 MB', date: '2026-06-09 14:20' },
  { id: '2', filename: 'dust_evolution_report', format: 'CSV', size: '1.1 MB', date: '2026-06-08 16:45' },
  { id: '3', filename: 'embryo_tracking_data', format: 'JSON', size: '3.8 MB', date: '2026-06-07 09:30' },
  { id: '4', filename: 'convergence_analysis', format: 'PDF', size: '5.2 MB', date: '2026-06-06 21:15' },
  { id: '5', filename: 'parameter_sensitivity', format: 'CSV', size: '0.8 MB', date: '2026-06-05 11:00' },
];

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
  const { simulations, fetchSimulations } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const diskMassMin = searchParams.get('minDiskMass') || '';
  const diskMassMax = searchParams.get('maxDiskMass') || '';
  const timeWindow = searchParams.get('timeWindow') || '30';
  const exportFormat = (searchParams.get('format') as 'JSON' | 'CSV') || 'JSON';
  const statusFilter = searchParams.get('status') || '';
  const dimensionFilter = searchParams.get('dimension') || '';
  const recSourceFilter = searchParams.get('recommendationSource') || '';

  const [reportTaskId, setReportTaskId] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
  const [reportError, setReportError] = useState('');

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
  }, [fetchSimulations]);

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
    window.open(`/api/export?${params.toString()}`, '_blank');
  };

  const handleGenerateReport = async () => {
    if (!reportTaskId) return;
    setReportStatus('generating');
    setReportError('');
    try {
      const res = await fetch(`/api/export/reports/${reportTaskId}/generate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setReportStatus('error');
        setReportError(json.error || '生成失败');
        return;
      }
      setReportStatus('ready');
    } catch {
      setReportStatus('error');
      setReportError('网络请求失败');
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
              <input
                type="number"
                step="0.01"
                value={diskMassMin}
                onChange={(e) => updateParam('minDiskMass', e.target.value)}
                placeholder="0.01"
                className="cosmos-input"
              />
            </div>
            <div>
              <label className="cosmos-label">盘质量上限 (M☉)</label>
              <input
                type="number"
                step="0.01"
                value={diskMassMax}
                onChange={(e) => updateParam('maxDiskMass', e.target.value)}
                placeholder="0.5"
                className="cosmos-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="cosmos-label">时间窗口</label>
              <select
                value={timeWindow}
                onChange={(e) => updateParam('timeWindow', e.target.value)}
                className="cosmos-input"
              >
                {timeWindowOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="cosmos-label">任务状态</label>
              <select
                value={statusFilter}
                onChange={(e) => updateParam('status', e.target.value)}
                className="cosmos-input"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="cosmos-label">维度</label>
              <select
                value={dimensionFilter}
                onChange={(e) => updateParam('dimension', e.target.value)}
                className="cosmos-input"
              >
                {dimensionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="cosmos-label">推荐来源</label>
              <select
                value={recSourceFilter}
                onChange={(e) => updateParam('recommendationSource', e.target.value)}
                className="cosmos-input"
              >
                <option value="">全部</option>
                {recSources.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="cosmos-label">导出格式</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={exportFormat === 'JSON'}
                  onChange={() => updateParam('format', 'JSON')}
                  className="accent-nebula-500"
                />
                <span className="text-sm text-gray-300">JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={exportFormat === 'CSV'}
                  onChange={() => updateParam('format', 'CSV')}
                  className="accent-nebula-500"
                />
                <span className="text-sm text-gray-300">CSV</span>
              </label>
            </div>
          </div>

          <button onClick={handleExport} className="cosmos-btn-primary flex items-center gap-2 w-full justify-center">
            <Download size={16} />导出数据
          </button>
        </div>

        <div className="cosmos-card p-5 space-y-4">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <FileText size={14} className="text-plasma-400" />报告生成
          </h4>

          <div>
            <label className="cosmos-label">选择模拟任务</label>
            <select
              value={reportTaskId}
              onChange={(e) => { setReportTaskId(e.target.value); setReportStatus('idle'); setReportError(''); }}
              className="cosmos-input"
            >
              <option value="">-- 请选择任务 --</option>
              {simulations.map((sim) => (
                <option key={sim.id} value={sim.id}>{sim.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={reportStatus === 'generating' || !reportTaskId}
            className="cosmos-btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reportStatus === 'generating' ? (
              <>
                <Loader2 size={16} className="animate-spin" />生成中...
              </>
            ) : (
              <>
                <FileText size={16} />生成综合报告PDF
              </>
            )}
          </button>

          {reportStatus === 'generating' && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin text-plasma-400" />
              报告生成中，请稍候...
            </div>
          )}

          {reportStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-300">生成失败: {reportError}</p>
              <button
                onClick={() => setReportStatus('idle')}
                className="mt-1 text-xs text-gray-400 hover:text-gray-200"
              >
                重试
              </button>
            </div>
          )}

          {reportStatus === 'ready' && (
            <div className="bg-aurora-500/10 border border-aurora-500/30 rounded-lg p-3">
              <p className="text-xs text-aurora-300 mb-2">报告已生成</p>
              <a
                href={`/api/export/reports/${reportTaskId}/download`}
                className="inline-flex items-center gap-1.5 text-xs text-plasma-300 hover:text-plasma-200 transition-colors"
              >
                <Download size={12} />下载 PDF 报告
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="cosmos-card p-5">
        <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <FileText size={14} className="text-aurora-400" />近期导出记录
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-cosmos-500/30">
                <th className="pb-2 font-medium">文件名</th>
                <th className="pb-2 font-medium">格式</th>
                <th className="pb-2 font-medium">大小</th>
                <th className="pb-2 font-medium">导出时间</th>
              </tr>
            </thead>
            <tbody>
              {mockPastExports.map((exp) => (
                <tr key={exp.id} className="border-b border-cosmos-500/10 last:border-0">
                  <td className="py-2.5 text-gray-200">{exp.filename}</td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-1.5">
                      {formatIcon(exp.format)}
                      <span className="text-gray-300">{exp.format}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-400">{exp.size}</td>
                  <td className="py-2.5 text-gray-400">{exp.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
