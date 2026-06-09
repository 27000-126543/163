import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

function generateHeatmapData() {
  const data: { radius: number; time: number; ratio: number }[] = [];
  const radii = [0.5, 1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const times = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
  for (const r of radii) {
    for (const t of times) {
      const baseRatio = 0.01 * Math.pow(r / 5, -0.5);
      const growth = 1 + (t / 500) * 3 * Math.exp(-r / 20);
      const ratio = Math.min(0.1, Math.max(0.001, baseRatio * growth * (0.8 + Math.random() * 0.4)));
      data.push({ radius: r, time: t, ratio: parseFloat(ratio.toFixed(4)) });
    }
  }
  return data;
}

function generateDensityData() {
  const radii = [0.1, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 30, 40, 50];
  const snapshots = [
    { label: 't=0 kyr', decay: 1.0, offset: 0 },
    { label: 't=100 kyr', decay: 0.85, offset: -0.3 },
    { label: 't=200 kyr', decay: 0.65, offset: -0.6 },
    { label: 't=300 kyr', decay: 0.45, offset: -0.9 },
  ];
  return radii.map((r) => {
    const row: Record<string, number> = { radius: r };
    for (const snap of snapshots) {
      const sigma0 = 1700 * Math.pow(r, -1.5);
      const evolved = sigma0 * snap.decay * (1 + snap.offset * Math.exp(-r / 10));
      row[snap.label] = parseFloat(Math.max(0.1, evolved).toFixed(2));
    }
    return row;
  });
}

function generateSizeDistData() {
  const sizes = [0.1, 0.3, 1, 3, 10, 30, 100, 300, 1000, 3000, 10000];
  const radii = [
    { label: '1 AU', peak: 10, width: 1.5, amp: 1.0 },
    { label: '5 AU', peak: 100, width: 1.8, amp: 0.7 },
    { label: '10 AU', peak: 300, width: 2.0, amp: 0.5 },
    { label: '30 AU', peak: 1000, width: 2.2, amp: 0.3 },
  ];
  return sizes.map((a) => {
    const row: Record<string, number> = { size: a };
    for (const r of radii) {
      const logA = Math.log10(a);
      const logPeak = Math.log10(r.peak);
      const dndloga = r.amp * Math.exp(-0.5 * Math.pow((logA - logPeak) / (r.width * 0.4), 2));
      row[r.label] = parseFloat(dndloga.toFixed(4));
    }
    return row;
  });
}

function ratioToColor(ratio: number) {
  const t = Math.min(1, Math.max(0, (ratio - 0.001) / (0.1 - 0.001)));
  const r = Math.round(t * 255);
  const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 120);
  const b = Math.round((1 - t) * 255);
  return `rgb(${r},${g},${b})`;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15,22,41,0.95)',
  border: '1px solid rgba(124,58,237,0.3)',
  borderRadius: '8px',
  color: '#E5E7EB',
  fontSize: 12,
};

const AXIS_TICK = { fill: '#9CA3AF', fontSize: 11 };
const AXIS_LINE = { stroke: 'rgba(45,58,82,0.3)' };
const GRID_STROKE = 'rgba(45,58,82,0.2)';

const LINE_COLORS = ['#8B5CF6', '#F97316', '#10B981', '#3B82F6'];

export default function DustEvolution() {
  const { simulations, fetchSimulations, loading } = useAppStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const heatmapData = useMemo(() => generateHeatmapData(), []);
  const densityData = useMemo(() => generateDensityData(), []);
  const sizeDistData = useMemo(() => generateSizeDistData(), []);

  const selectedSim = simulations.find((s) => s.id === selectedTaskId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="cosmos-card p-8 text-center">
          <div className="w-8 h-8 border-2 border-nebula-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">加载模拟数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div>
          <h3 className="cosmos-section-title">尘埃演化分析</h3>
          <p className="text-sm text-gray-400 mt-1">尘埃颗粒生长、沉降与径向漂移的可视化追踪</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <label className="text-sm text-gray-400">模拟任务:</label>
          <select
            className="cosmos-input w-64"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
          >
            <option value="">选择任务...</option>
            {simulations.map((sim) => (
              <option key={sim.id} value={sim.id}>
                {sim.name} ({sim.status.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSim && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>盘质量: {selectedSim.diskMass} M☉</span>
          <span>α粘滞: {selectedSim.viscosityAlpha}</span>
          <span>步骤: {selectedSim.currentStep}/{selectedSim.totalSteps}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cosmos-card p-5">
          <h4 className="cosmos-section-title text-base mb-4">尘气比演化热力图</h4>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="radius"
                  type="number"
                  name="半径"
                  unit=" AU"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  label={{ value: '半径 (AU)', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 11 }}
                />
                <YAxis
                  dataKey="time"
                  type="number"
                  name="时间"
                  unit=" kyr"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  label={{ value: '时间 (kyr)', angle: -90, position: 'insideLeft', offset: 10, fill: '#9CA3AF', fontSize: 11 }}
                />
                <ZAxis dataKey="ratio" range={[40, 200]} name="尘气比" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value: number, name: string) => {
                    if (name === '尘气比') return [value.toFixed(4), name];
                    return [value, name];
                  }}
                />
                <Scatter data={heatmapData} fill="#8B5CF6">
                  {heatmapData.map((entry, idx) => (
                    <circle key={idx} fill={ratioToColor(entry.ratio)} fillOpacity={0.85} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-gray-500">低 (0.001)</span>
            <div className="flex h-3 w-40 rounded overflow-hidden">
              {Array.from({ length: 20 }, (_, i) => {
                const t = i / 19;
                const ratio = 0.001 + t * (0.1 - 0.001);
                return <div key={i} className="flex-1" style={{ backgroundColor: ratioToColor(ratio) }} />;
              })}
            </div>
            <span className="text-xs text-gray-500">高 (0.1)</span>
          </div>
        </div>

        <div className="cosmos-card p-5">
          <h4 className="cosmos-section-title text-base mb-4">尘埃径向密度分布</h4>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={densityData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="radius"
                  type="number"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  label={{ value: '半径 (AU)', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 11 }}
                />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  label={{ value: '面密度 (g/cm²)', angle: -90, position: 'insideLeft', offset: 10, fill: '#9CA3AF', fontSize: 11 }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#9CA3AF' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
                {['t=0 kyr', 't=100 kyr', 't=200 kyr', 't=300 kyr'].map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={LINE_COLORS[i]}
                    strokeWidth={2}
                    dot={{ r: 2, fill: LINE_COLORS[i], stroke: '#0F1629', strokeWidth: 1 }}
                    name={key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="cosmos-card p-5">
        <h4 className="cosmos-section-title text-base mb-4">粒径分布演化</h4>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sizeDistData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="size"
                type="number"
                scale="log"
                domain={[0.1, 10000]}
                ticks={[0.1, 1, 10, 100, 1000, 10000]}
                tickFormatter={(v: number) => `${v}`}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                label={{ value: '粒径 (μm)', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 11 }}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                label={{ value: 'dn/dlog(a)', angle: -90, position: 'insideLeft', offset: 10, fill: '#9CA3AF', fontSize: 11 }}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#9CA3AF' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
              {['1 AU', '5 AU', '10 AU', '30 AU'].map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={LINE_COLORS[i]}
                  strokeWidth={2}
                  dot={{ r: 2, fill: LINE_COLORS[i], stroke: '#0F1629', strokeWidth: 1 }}
                  name={key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
