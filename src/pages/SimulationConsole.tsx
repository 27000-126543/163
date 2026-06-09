import { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';

interface NewSimForm {
  name: string;
  diskMass: string;
  viscosityAlpha: string;
  dustSizeDistFile: File | null;
  dimension: 1 | 2;
  userId: string;
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
    startSimulation,
    pauseSimulation,
    rollbackSimulation,
    fetchMonitoring,
  } = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewSimForm>({ ...EMPTY_FORM });
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

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
    await createSimulation({
      name: form.name,
      diskMass: Number(form.diskMass),
      viscosityAlpha: Number(form.viscosityAlpha),
      dustSizeDistFile: form.dustSizeDistFile?.name ?? '',
      dimension: form.dimension,
      userId: form.userId,
    });
    setShowModal(false);
    setForm({ ...EMPTY_FORM });
    fetchSimulations();
  }, [form, createSimulation, fetchSimulations]);

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

  const selectedSim: SimulationTask | undefined = selectedId
    ? simulations.find((s) => s.id === selectedId) ?? (currentSimulation?.id === selectedId ? currentSimulation : undefined)
    : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="cosmos-section-title">模拟任务列表</h3>
          <p className="text-sm text-gray-400 mt-1">
            管理原行星盘模拟任务的生命周期
          </p>
        </div>
        <button
          className="cosmos-btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          新建模拟
        </button>
      </div>

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
            {simulations.map((sim) => (
              <TaskCard
                key={sim.id}
                sim={sim}
                active={sim.id === selectedId}
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
          {simulations.length === 0 ? (
            <div className="cosmos-card p-12 text-center">
              <p className="text-gray-400">暂无模拟任务，点击上方按钮创建</p>
            </div>
          ) : (
            simulations.map((sim) => (
              <TaskCard
                key={sim.id}
                sim={sim}
                onClick={() => setSelectedId(sim.id)}
              />
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="cosmos-card w-full max-w-lg mx-4 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="cosmos-section-title text-base">新建模拟任务</h3>
              <button
                className="p-1 rounded-md hover:bg-cosmos-600 text-gray-400 hover:text-gray-200 transition-colors"
                onClick={() => {
                  setShowModal(false);
                  setForm({ ...EMPTY_FORM });
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
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
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
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

              <div className="flex gap-3 pt-2">
                <button
                  className="cosmos-btn-primary flex-1"
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                >
                  创建任务
                </button>
                <button
                  className="cosmos-btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setForm({ ...EMPTY_FORM });
                  }}
                >
                  取消
                </button>
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
  onClick,
}: {
  sim: SimulationTask;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`cosmos-card-hover p-5 cursor-pointer ${
        active ? 'border-nebula-500/60 shadow-md shadow-nebula-500/10' : ''
      }`}
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
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>盘质量: {sim.diskMass} M☉</span>
        <span>α粘滞: {sim.viscosityAlpha}</span>
        <span>维度: {sim.dimension}D</span>
        <span>
          步骤: {sim.currentStep}/{sim.totalSteps}
        </span>
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
        <ParamCard label="模拟维度" value={`${task.dimension}D`} />
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
