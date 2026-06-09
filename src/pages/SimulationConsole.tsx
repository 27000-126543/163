import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import type { SimulationTask } from '@/store';
import StatusFlow from '@/components/StatusFlow';
import MonitoringChart from '@/components/MonitoringChart';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  X,
  Upload,
  ChevronLeft,
  Save,
  Layers,
  Trash2,
} from 'lucide-react';

interface NewSimForm {
  name: string;
  diskMass: string;
  viscosityAlpha: string;
  dustSizeDistFile: File | null;
  dimension: 1 | 2;
  userId: string;
  recommendationSource?: string;
  recommendationConfidence?: number;
  recommendationProfile?: string;
}

const EMPTY_FORM: NewSimForm = {
  name: '',
  diskMass: '0.1',
  viscosityAlpha: '0.01',
  dustSizeDistFile: null,
  dimension: 1,
  userId: 'user-1',
};

const STATUS_LABEL: Record<string, string> = {
  pending_validation: '待校验',
  model_building: '模型构建',
  dust_growth: '尘埃生长',
  particle_aggregation: '粒子聚集',
  embryo_formation: '胚胎形成',
  orbital_evolution: '轨道演化',
  completed: '已完成',
  error_rollback: '错误回滚',
};

export default function SimulationConsole() {
  const {
    simulations,
    currentSimulation,
    monitoringData,
    fetchSimulations,
    fetchSimulation,
    createSimulation,
    batchCreateSimulations,
    startSimulation,
    pauseSimulation,
    rollbackSimulation,
    fetchMonitoring,
    templates,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
  } = useAppStore();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'single' | 'batch' | 'template'>('single');
  const [form, setForm] = useState<NewSimForm>({ ...EMPTY_FORM });
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(highlightId);
  const [batchCount, setBatchCount] = useState(3);
  const [batchPrefix, setBatchPrefix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [templateName, setTemplateName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSimulations();
    fetchTemplates();
  }, [fetchSimulations, fetchTemplates]);

  useEffect(() => {
    if (highlightId && simulations.some(s => s.id === highlightId)) {
      setSelectedId(highlightId);
    }
  }, [highlightId, simulations]);

  useEffect(() => {
    if (selectedId) {
      fetchSimulation(selectedId);
      fetchMonitoring(selectedId);
    }
  }, [selectedId, fetchSimulation, fetchMonitoring]);

  useEffect(() => {
    if (selectedId) {
      intervalRef.current = setInterval(() => {
        fetchMonitoring(selectedId);
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedId, fetchMonitoring]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setCreateError('');
    try {
      if (modalMode === 'batch') {
        const prefix = batchPrefix.trim() || form.name.trim();
        if (!prefix) {
          setCreateError('请填写任务名称前缀');
          setSubmitting(false);
          return;
        }
        await batchCreateSimulations({
          namePrefix: prefix,
          diskMass: Number(form.diskMass),
          viscosityAlpha: Number(form.viscosityAlpha),
          dustSizeDistFile: form.dustSizeDistFile?.name ?? '',
          dimension: form.dimension === 1 ? '1D' : '2D',
          userId: form.userId,
          count: batchCount,
          recommendationSource: form.recommendationSource,
          recommendationConfidence: form.recommendationConfidence,
          recommendationProfile: form.recommendationProfile,
        });
      } else {
        await createSimulation({
          name: form.name,
          diskMass: Number(form.diskMass),
          viscosityAlpha: Number(form.viscosityAlpha),
          dustSizeDistFile: form.dustSizeDistFile?.name ?? '',
          dimension: form.dimension === 1 ? '1D' : '2D',
          userId: form.userId,
          recommendationSource: form.recommendationSource,
          recommendationConfidence: form.recommendationConfidence,
          recommendationProfile: form.recommendationProfile,
        });
      }
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      setCreateError('');
      await fetchSimulations();
    } catch (e) {
      setCreateError((e as Error).message || '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [form, modalMode, batchPrefix, batchCount, createSimulation, batchCreateSimulations, fetchSimulations]);

  const handleSaveTemplate = useCallback(async () => {
    const name = templateName.trim();
    if (!name) return;
    try {
      await createTemplate({
        name,
        diskMass: Number(form.diskMass),
        viscosityAlpha: Number(form.viscosityAlpha),
        dimension: form.dimension === 1 ? '1D' : '2D',
        dustSizeDistFile: form.dustSizeDistFile?.name ?? '',
        recommendationSource: form.recommendationSource,
      });
      setTemplateName('');
    } catch { /* template save failure is non-critical */ }
  }, [templateName, form, createTemplate]);

  const handleLoadTemplate = useCallback((tpl: typeof templates[number]) => {
    setForm(f => ({
      ...f,
      diskMass: String(tpl.diskMass),
      viscosityAlpha: String(tpl.viscosityAlpha),
      dimension: tpl.dimension === '2D' ? 2 : 1,
      dustSizeDistFile: null,
      recommendationSource: tpl.recommendationSource,
    }));
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) setForm((f) => ({ ...f, dustSizeDistFile: file }));
    },
    [],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setForm((f) => ({ ...f, dustSizeDistFile: file }));
    },
    [],
  );

  const filteredSimulations = batchFilter
    ? simulations.filter(s => s.batchId === batchFilter)
    : simulations;

  const batchIds = [...new Set(simulations.filter(s => s.batchId).map(s => s.batchId!))];

  const selectedSim: SimulationTask | undefined = selectedId
    ? simulations.find((s) => s.id === selectedId) ?? (currentSimulation?.id === selectedId ? currentSimulation : undefined)
    : undefined;

  const openModal = (mode: 'single' | 'batch' | 'template' = 'single') => {
    setModalMode(mode);
    setCreateError('');
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="cosmos-section-title">模拟任务列表</h3>
          <p className="text-sm text-gray-400 mt-1">
            管理原行星盘模拟任务的生命周期
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="cosmos-btn-primary flex items-center gap-2"
            onClick={() => openModal('single')}
          >
            <Plus size={16} />
            新建模拟
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-cosmos-700 text-gray-300 border border-cosmos-500/40 hover:border-nebula-500/40 transition-colors"
            onClick={() => openModal('batch')}
          >
            <Layers size={16} />
            批量创建
          </button>
        </div>
      </div>

      {batchIds.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">按批次筛选:</span>
          <button
            className={`px-3 py-1 rounded text-xs transition-colors ${!batchFilter ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/40' : 'bg-cosmos-700 text-gray-400 border border-cosmos-500/30 hover:border-cosmos-500/50'}`}
            onClick={() => setBatchFilter('')}
          >
            全部
          </button>
          {batchIds.map(bid => (
            <button
              key={bid}
              className={`px-3 py-1 rounded text-xs transition-colors ${batchFilter === bid ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/40' : 'bg-cosmos-700 text-gray-400 border border-cosmos-500/30 hover:border-cosmos-500/50'}`}
              onClick={() => setBatchFilter(bid)}
            >
              {bid.replace('batch-', '批次 ')}
            </button>
          ))}
        </div>
      )}

      {selectedId ? (
        <div className="flex gap-4">
          <div className="w-80 shrink-0 space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            <button
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-2 transition-colors"
              onClick={() => setSelectedId(null)}
            >
              <ChevronLeft size={14} />
              返回列表
            </button>
            {filteredSimulations.map((sim) => (
              <TaskCard
                key={sim.id}
                sim={sim}
                active={sim.id === selectedId}
                highlight={sim.id === highlightId}
                onClick={() => setSelectedId(sim.id)}
              />
            ))}
          </div>

          <div className="flex-1 cosmos-card p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {selectedSim ? (
              <TaskDetail
                task={selectedSim}
                onStart={() => startSimulation(selectedSim.id)}
                onPause={() => pauseSimulation(selectedSim.id)}
                onRollback={() => rollbackSimulation(selectedSim.id)}
                monitoringData={monitoringData}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                加载中...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSimulations.length === 0 ? (
            <div className="cosmos-card p-12 text-center">
              <p className="text-gray-400">暂无模拟任务，点击上方按钮创建</p>
            </div>
          ) : (
            filteredSimulations.map((sim) => (
              <TaskCard
                key={sim.id}
                sim={sim}
                highlight={sim.id === highlightId}
                onClick={() => setSelectedId(sim.id)}
              />
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="cosmos-card w-full max-w-lg mx-4 p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="cosmos-section-title text-base">
                {modalMode === 'batch' ? '批量创建模拟任务' : '新建模拟任务'}
              </h3>
              <button
                className="p-1 rounded-md hover:bg-cosmos-600 text-gray-400 hover:text-gray-200 transition-colors"
                onClick={() => {
                  setShowModal(false);
                  setForm({ ...EMPTY_FORM });
                  setCreateError('');
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <button
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${modalMode === 'single' ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/40' : 'bg-cosmos-700 text-gray-400 border border-cosmos-500/30'}`}
                  onClick={() => setModalMode('single')}
                >
                  单个创建
                </button>
                <button
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${modalMode === 'batch' ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/40' : 'bg-cosmos-700 text-gray-400 border border-cosmos-500/30'}`}
                  onClick={() => setModalMode('batch')}
                >
                  批量创建
                </button>
              </div>

              {templates.length > 0 && (
                <div>
                  <label className="cosmos-label">从模板加载</label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(tpl => (
                      <div key={tpl.id} className="flex items-center gap-1">
                        <button
                          className="px-2 py-1 rounded text-xs bg-cosmos-700 text-gray-300 border border-cosmos-500/30 hover:border-nebula-500/40 transition-colors"
                          onClick={() => handleLoadTemplate(tpl)}
                        >
                          {tpl.name}
                        </button>
                        <button
                          className="p-0.5 text-gray-600 hover:text-red-400 transition-colors"
                          onClick={() => deleteTemplate(tpl.id)}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {modalMode === 'single' ? (
                <div>
                  <label className="cosmos-label">任务名称</label>
                  <input
                    className="cosmos-input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="输入模拟任务名称"
                  />
                </div>
              ) : (
                <div>
                  <label className="cosmos-label">任务名称前缀</label>
                  <input
                    className="cosmos-input"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="如：盘演化实验（将生成 盘演化实验-1, 盘演化实验-2...）"
                  />
                  <div className="mt-2">
                    <label className="cosmos-label">创建数量</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="cosmos-input"
                      value={batchCount}
                      onChange={(e) => setBatchCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="cosmos-label">盘初始质量 M☉</label>
                  <input
                    type="number"
                    step="0.01"
                    className="cosmos-input"
                    value={form.diskMass}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, diskMass: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="cosmos-label">α粘性参数</label>
                  <input
                    type="number"
                    step="0.001"
                    className="cosmos-input"
                    value={form.viscosityAlpha}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        viscosityAlpha: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="cosmos-label">尘埃粒径分布文件</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-nebula-400 bg-nebula-500/10'
                      : 'border-cosmos-500/50 hover:border-nebula-500/50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {form.dustSizeDistFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-aurora-400">
                      <Upload size={16} />
                      {form.dustSizeDistFile.name}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      <Upload
                        size={20}
                        className="mx-auto mb-2 text-gray-500"
                      />
                      拖拽文件到此处或点击选择
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="cosmos-label">模拟维度</label>
                <div className="flex gap-2">
                  {([1, 2] as const).map((d) => (
                    <button
                      key={d}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        form.dimension === d
                          ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/50'
                          : 'bg-cosmos-700 text-gray-400 border border-cosmos-500/40 hover:border-cosmos-500/60'
                      }`}
                      onClick={() =>
                        setForm((f) => ({ ...f, dimension: d }))
                      }
                    >
                      {d}D
                    </button>
                  ))}
                </div>
              </div>

              {form.recommendationSource && (
                <div className="bg-nebula-500/10 border border-nebula-500/20 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">推荐来源</span>
                    <span className="text-nebula-300">{form.recommendationSource}</span>
                  </div>
                  {form.recommendationConfidence != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">置信度</span>
                      <span className="text-aurora-300">{(form.recommendationConfidence * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {form.recommendationProfile && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">粘滞剖面</span>
                      <span className="text-plasma-300">{form.recommendationProfile}</span>
                    </div>
                  )}
                </div>
              )}

              {createError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                  创建失败: {createError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  className="cosmos-btn-primary flex-1"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    (modalMode === 'single' ? !form.name.trim() : !batchPrefix.trim() && !form.name.trim())
                  }
                >
                  {submitting
                    ? '创建中...'
                    : modalMode === 'batch'
                      ? `批量创建 ${batchCount} 个任务`
                      : '创建任务'}
                </button>
                <button
                  className="cosmos-btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setForm({ ...EMPTY_FORM });
                    setCreateError('');
                  }}
                >
                  取消
                </button>
              </div>

              <div className="border-t border-cosmos-500/20 pt-3">
                <label className="cosmos-label">保存为模板</label>
                <div className="flex gap-2">
                  <input
                    className="cosmos-input flex-1"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="模板名称"
                  />
                  <button
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs bg-cosmos-700 text-gray-300 border border-cosmos-500/30 hover:border-nebula-500/40 transition-colors disabled:opacity-50"
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim()}
                  >
                    <Save size={12} />保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  sim,
  active,
  highlight,
  onClick,
}: {
  sim: SimulationTask;
  active?: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`cosmos-card-hover p-5 cursor-pointer ${
        active ? 'border-nebula-500/60 shadow-md shadow-nebula-500/10' : ''
      } ${highlight ? 'ring-2 ring-aurora-500/40' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-gray-100">{sim.name}</h4>
          <span
            className={`cosmos-badge ${
              sim.status === 'completed'
                ? 'cosmos-badge-aurora'
                : sim.status === 'error_rollback'
                  ? 'cosmos-badge-danger'
                  : 'cosmos-badge-nebula'
            }`}
          >
            {STATUS_LABEL[sim.status] ?? sim.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <StatusFlow currentStatus={sim.status} />
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span>盘质量: {sim.diskMass} M☉</span>
        <span>α粘滞: {sim.viscosityAlpha}</span>
        <span>维度: {sim.dimension}</span>
        <span>
          步骤: {sim.currentStep}/{sim.totalSteps}
        </span>
        {sim.recommendationSource && (
          <span className="text-nebula-400">推荐: {sim.recommendationSource}</span>
        )}
        {sim.batchId && (
          <span className="text-plasma-400">批次: {sim.batchId.replace('batch-', '')}</span>
        )}
      </div>
    </div>
  );
}

function TaskDetail({
  task,
  onStart,
  onPause,
  onRollback,
  monitoringData,
}: {
  task: SimulationTask;
  onStart: () => void;
  onPause: () => void;
  onRollback: () => void;
  monitoringData: import('@/store').MonitoringSnapshot[];
}) {
  const progress =
    task.totalSteps > 0
      ? Math.round((task.currentStep / task.totalSteps) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-gray-100">{task.name}</h3>
          <span
            className={`cosmos-badge ${
              task.status === 'completed'
                ? 'cosmos-badge-aurora'
                : task.status === 'error_rollback'
                  ? 'cosmos-badge-danger'
                  : 'cosmos-badge-nebula'
            }`}
          >
            {STATUS_LABEL[task.status] ?? task.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-aurora-500/20 text-aurora-400 border border-aurora-500/30 hover:bg-aurora-500/30 transition-colors"
          >
            <Play size={14} />
            启动
          </button>
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-plasma-500/20 text-plasma-400 border border-plasma-500/30 hover:bg-plasma-500/30 transition-colors"
          >
            <Pause size={14} />
            暂停
          </button>
          <button
            onClick={onRollback}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            <RotateCcw size={14} />
            回滚
          </button>
        </div>
      </div>

      <StatusFlow currentStatus={task.status} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ParamCard label="盘初始质量" value={`${task.diskMass} M☉`} />
        <ParamCard label="α粘性参数" value={`${task.viscosityAlpha}`} />
        <ParamCard label="模拟维度" value={task.dimension} />
        <div className="cosmos-card p-4">
          <p className="text-xs text-gray-500 mb-2">模拟进度</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-100">
              {task.currentStep}/{task.totalSteps}
            </span>
            <span className="text-xs text-gray-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-cosmos-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-nebula-500 to-aurora-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {(task.recommendationSource || task.batchId) && (
        <div className="bg-cosmos-700/40 border border-cosmos-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">附加信息</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {task.recommendationSource && (
              <div className="flex justify-between">
                <span className="text-gray-500">推荐机制</span>
                <span className="text-nebula-300">{task.recommendationSource}</span>
              </div>
            )}
            {task.recommendationConfidence != null && (
              <div className="flex justify-between">
                <span className="text-gray-500">置信度</span>
                <span className="text-aurora-300">{(task.recommendationConfidence * 100).toFixed(1)}%</span>
              </div>
            )}
            {task.recommendationProfile && (
              <div className="flex justify-between">
                <span className="text-gray-500">粘滞剖面</span>
                <span className="text-plasma-300">{task.recommendationProfile}</span>
              </div>
            )}
            {task.batchId && (
              <div className="flex justify-between">
                <span className="text-gray-500">批次ID</span>
                <span className="text-plasma-300">{task.batchId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {task.embryos && task.embryos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            行星胚胎
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cosmos-500/30">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">
                    ID
                  </th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">
                    质量 (M⊕)
                  </th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">
                    半长轴 (AU)
                  </th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">
                    离心率
                  </th>
                </tr>
              </thead>
              <tbody>
                {task.embryos.map((emb) => (
                  <tr
                    key={emb.id}
                    className="border-b border-cosmos-500/10 hover:bg-cosmos-700/30 transition-colors"
                  >
                    <td className="py-2 px-3 text-gray-300">{emb.id}</td>
                    <td className="py-2 px-3 text-right text-aurora-400">
                      {emb.mass.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-nebula-300">
                      {emb.semiMajorAxis.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right text-plasma-300">
                      {emb.eccentricity.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">实时监控</h4>
        {monitoringData.length > 0 ? (
          <MonitoringChart data={monitoringData} />
        ) : (
          <div className="cosmos-card p-12 text-center text-gray-500 text-sm">
            暂无监控数据，等待模拟运行后自动获取
          </div>
        )}
      </div>
    </div>
  );
}

function ParamCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="cosmos-card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-100">{value}</p>
    </div>
  );
}
