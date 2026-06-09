import { Check, AlertTriangle } from 'lucide-react';
import type { SimulationStatus } from '@/store';

const STATUS_FLOW: { key: SimulationStatus; label: string }[] = [
  { key: 'pending_validation', label: '待校验' },
  { key: 'model_building', label: '模型构建' },
  { key: 'dust_growth', label: '尘埃生长' },
  { key: 'particle_aggregation', label: '粒子聚集' },
  { key: 'embryo_formation', label: '胚胎形成' },
  { key: 'orbital_evolution', label: '轨道演化' },
  { key: 'completed', label: '完成' },
];

const STATUS_ORDER: SimulationStatus[] = [
  'pending_validation',
  'model_building',
  'dust_growth',
  'particle_aggregation',
  'embryo_formation',
  'orbital_evolution',
  'completed',
];

interface StatusFlowProps {
  currentStatus: SimulationStatus;
}

export default function StatusFlow({ currentStatus }: StatusFlowProps) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isError = currentStatus === 'error_rollback';
  const errorFromIdx = isError ? -1 : -1;

  function getNodeState(index: number): 'completed' | 'current' | 'upcoming' | 'error' {
    if (isError) return index <= currentIdx ? 'error' : 'upcoming';
    if (index < currentIdx) return 'completed';
    if (index === currentIdx) return 'current';
    return 'upcoming';
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-0 overflow-x-auto py-4">
        {STATUS_FLOW.map((step, index) => {
          const state = isError && index <= currentIdx ? 'error' : getNodeState(index);
          return (
            <div key={step.key} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-300
                    ${state === 'completed'
                      ? 'bg-aurora-500/80 text-white shadow-md shadow-aurora-500/30'
                      : state === 'current'
                        ? 'bg-nebula-500 text-white animate-pulse-glow'
                        : state === 'error'
                          ? 'bg-red-500/80 text-white animate-red-flash'
                          : 'bg-cosmos-600 text-gray-500 border border-cosmos-500/50'
                    }
                  `}
                >
                  {state === 'completed' ? <Check size={16} /> : state === 'error' ? <AlertTriangle size={16} /> : index + 1}
                </div>
                <span
                  className={`text-xs whitespace-nowrap ${
                    state === 'completed'
                      ? 'text-aurora-400'
                      : state === 'current'
                        ? 'text-nebula-300 font-medium'
                        : state === 'error'
                          ? 'text-red-400'
                          : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < STATUS_FLOW.length - 1 && (
                <div className="mx-1.5 w-8 h-0.5 flex items-center">
                  <div
                    className={`w-full h-0.5 rounded-full transition-all duration-300 ${
                      index < currentIdx
                        ? 'bg-aurora-500/60'
                        : isError && index <= currentIdx
                          ? 'bg-red-500/60'
                          : 'bg-cosmos-500/40'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isError && (
        <div className="mt-3 flex items-center gap-2 pl-4">
          <div className="w-10 h-0.5 bg-red-500/50" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-red-500/80 text-white flex items-center justify-center animate-red-flash">
              <AlertTriangle size={16} />
            </div>
            <span className="text-xs text-red-400 font-medium">错误回滚</span>
          </div>
          <div className="ml-2 text-xs text-red-400/70">
            模拟过程出现异常，已自动回滚至安全状态
          </div>
        </div>
      )}
    </div>
  );
}
