import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { ShieldCheck, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface AdjustmentLog {
  id: string;
  timestamp: string;
  paramName: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

const mockAdjustmentLogs: AdjustmentLog[] = [
  { id: '1', timestamp: '2026-06-09 14:32:10', paramName: 'viscosityAlpha', oldValue: 0.001, newValue: 0.003, reason: '模拟偏差过大，调整粘滞系数' },
  { id: '2', timestamp: '2026-06-09 13:15:44', paramName: 'diskMass', oldValue: 0.05, newValue: 0.08, reason: '盘质量估算修正' },
  { id: '3', timestamp: '2026-06-09 11:08:22', paramName: 'dustToGasRatio', oldValue: 0.01, newValue: 0.015, reason: '尘埃气体比例校正' },
  { id: '4', timestamp: '2026-06-08 22:45:00', paramName: 'viscosityAlpha', oldValue: 0.002, newValue: 0.001, reason: '收敛性优化' },
];

const mockDeviation = 35.2;

const levelMap: Record<number, string> = {
  1: '博士后验证',
  2: '教授确认',
};

export default function ApprovalCenter() {
  const { approvals, simulations, fetchApprovals, fetchSimulations, reviewApproval } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'approved' | 'rejected'>('approved');
  const [modalApprovalId, setModalApprovalId] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchApprovals();
    fetchSimulations();
  }, [fetchApprovals, fetchSimulations]);

  const getTaskName = (taskId: string) => {
    const sim = simulations.find((s) => s.id === taskId);
    return sim?.name ?? taskId;
  };

  const openModal = (approvalId: string, action: 'approved' | 'rejected') => {
    setModalApprovalId(approvalId);
    setModalAction(action);
    setComment('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    await reviewApproval(modalApprovalId, { status: modalAction, comment });
    setModalOpen(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="cosmos-badge bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <Clock size={12} className="mr-1" />待审批
          </span>
        );
      case 'approved':
        return (
          <span className="cosmos-badge-aurora">
            <CheckCircle size={12} className="mr-1" />已通过
          </span>
        );
      case 'rejected':
        return (
          <span className="cosmos-badge-danger">
            <XCircle size={12} className="mr-1" />已拒绝
          </span>
        );
      default:
        return null;
    }
  };

  const deviationStatus =
    mockDeviation > 30 ? { label: '暂停', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' } :
    mockDeviation > 15 ? { label: '预警', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' } :
    { label: '正常', color: 'text-aurora-400', bg: 'bg-aurora-500/20', border: 'border-aurora-500/30' };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h3 className="cosmos-section-title flex items-center gap-2">
          <ShieldCheck size={20} className="text-plasma-400" />
          审批管理中心
        </h3>
        <p className="text-sm text-gray-400 mt-1">多级审批流程，确保模拟参数与结论的可靠性</p>
      </div>

      <div className="flex gap-6">
        <div className="w-1/2 space-y-4">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Clock size={14} className="text-nebula-400" />审批队列
          </h4>
          {approvals.length === 0 ? (
            <div className="cosmos-card p-8 text-center text-gray-500">暂无审批记录</div>
          ) : (
            approvals.map((a) => (
              <div key={a.id} className="cosmos-card-hover p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-gray-100">{getTaskName(a.taskId)}</h5>
                  {statusBadge(a.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="cosmos-badge bg-cosmos-700 text-plasma-300 border border-plasma-500/30">
                    {levelMap[a.level] ?? `Level ${a.level}`}
                  </span>
                  <span>审核人: {a.reviewerId}</span>
                  <span>{new Date(a.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                {a.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => openModal(a.id, 'approved')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-aurora-500/20 text-aurora-300 border border-aurora-500/30 hover:bg-aurora-500/30 transition-colors"
                    >
                      <CheckCircle size={12} />通过
                    </button>
                    <button
                      onClick={() => openModal(a.id, 'rejected')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                    >
                      <XCircle size={12} />拒绝
                    </button>
                  </div>
                )}
                {a.comment && (
                  <p className="text-xs text-gray-500 border-t border-cosmos-500/20 pt-2">
                    评论: {a.comment}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="w-1/2 space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <ShieldCheck size={14} className="text-nebula-400" />调整日志
            </h4>
            <div className="cosmos-card p-4 space-y-4 max-h-72 overflow-y-auto">
              {mockAdjustmentLogs.map((log, idx) => (
                <div key={log.id} className="relative pl-5 pb-4 last:pb-0">
                  {idx < mockAdjustmentLogs.length - 1 && (
                    <div className="absolute left-[5px] top-3 bottom-0 w-px bg-cosmos-500/40" />
                  )}
                  <div className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full bg-nebula-500/60 border-2 border-cosmos-800" />
                  <p className="text-[10px] text-gray-500 mb-1">{log.timestamp}</p>
                  <p className="text-xs text-gray-300">
                    <span className="text-nebula-300 font-medium">{log.paramName}</span>:{' '}
                    <span className="text-red-400">{log.oldValue}</span>
                    <span className="mx-1 text-gray-500">→</span>
                    <span className="text-aurora-400">{log.newValue}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{log.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-plasma-400" />参数偏差监控
            </h4>
            <div className="cosmos-card p-5 space-y-4">
              <div className="flex items-center justify-center">
                <svg width="160" height="90" viewBox="0 0 160 90">
                  <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="rgba(45,58,82,0.5)" strokeWidth="10" strokeLinecap="round" />
                  <path
                    d="M 10 80 A 70 70 0 0 1 150 80"
                    fill="none"
                    stroke={mockDeviation > 30 ? '#EF4444' : mockDeviation > 15 ? '#F97316' : '#10B981'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(mockDeviation / 100) * 219.9} 219.9`}
                  />
                  <text x="80" y="65" textAnchor="middle" className="fill-gray-100 text-xl font-bold font-orbitron">
                    {mockDeviation.toFixed(1)}%
                  </text>
                  <text x="80" y="82" textAnchor="middle" className="fill-gray-500 text-[10px]">
                    偏差率
                  </text>
                </svg>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${deviationStatus.bg} ${deviationStatus.color}`} />
                <span className={`text-sm font-medium ${deviationStatus.color}`}>{deviationStatus.label}</span>
              </div>

              {mockDeviation > 30 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">
                    该参数组已连续三次模拟偏差超过30%，已自动暂停新任务
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="cosmos-card p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="cosmos-section-title text-base">
              {modalAction === 'approved' ? '通过审批' : '拒绝审批'}
            </h4>
            <div>
              <label className="cosmos-label">审批意见</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="请输入审批意见..."
                rows={3}
                className="cosmos-input resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="cosmos-btn-secondary text-sm">
                取消
              </button>
              <button
                onClick={handleSubmit}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                  modalAction === 'approved'
                    ? 'bg-aurora-500/20 text-aurora-300 border border-aurora-500/30 hover:bg-aurora-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                }`}
              >
                确认{modalAction === 'approved' ? '通过' : '拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
