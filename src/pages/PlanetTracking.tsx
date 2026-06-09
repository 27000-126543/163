import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store';
import type { PlanetEmbryo } from '@/store';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
  ReferenceLine,
} from 'recharts';

function generateMockEmbryos(): PlanetEmbryo[] {
  const embryos: PlanetEmbryo[] = [];
  const count = 12 + Math.floor(Math.random() * 8);
  const taskId = 'mock';
  for (let i = 0; i < count; i++) {
    const semiMajorAxis = 0.3 + Math.random() * 49.7;
    const mass = 0.001 + Math.random() * 5;
    embryos.push({
      id: `embryo-${i}`,
      taskId,
      mass: parseFloat(mass.toFixed(4)),
      semiMajorAxis: parseFloat(semiMajorAxis.toFixed(2)),
      eccentricity: parseFloat((Math.random() * 0.15).toFixed(4)),
      inclination: parseFloat((Math.random() * 5).toFixed(2)),
      formationTime: parseFloat((Math.random() * 3000).toFixed(1)),
    });
  }
  embryos.sort((a, b) => a.semiMajorAxis - b.semiMajorAxis);
  return embryos;
}

const SOLAR_SYSTEM_REFS = [
  { name: '地球', axis: 1.0, mass: 0.003 },
  { name: '火星', axis: 1.52, mass: 0.0003 },
  { name: '木星', axis: 5.2, mass: 1.0 },
  { name: '土星', axis: 9.54, mass: 0.299 },
];

const ORBIT_COLORS = [
  '#8B5CF6', '#F97316', '#10B981', '#3B82F6',
  '#EF4444', '#F59E0B', '#EC4899', '#06B6D4',
  '#84CC16', '#6366F1', '#14B8A6', '#F43F5E',
  '#A78BFA', '#FB923C', '#6EE7B7', '#93C5FD',
];

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

function findResonance(a1: number, a2: number): string | null {
  const ratio = a2 / a1;
  const resonances = [
    { p: 1, q: 1, val: 1.0 },
    { p: 2, q: 1, val: Math.pow(2, 2 / 3) },
    { p: 3, q: 2, val: Math.pow(1.5, 2 / 3) },
    { p: 3, q: 1, val: Math.pow(3, 2 / 3) },
    { p: 5, q: 2, val: Math.pow(2.5, 2 / 3) },
    { p: 4, q: 3, val: Math.pow(4 / 3, 2 / 3) },
    { p: 5, q: 3, val: Math.pow(5 / 3, 2 / 3) },
    { p: 7, q: 3, val: Math.pow(7 / 3, 2 / 3) },
  ];
  for (const res of resonances) {
    if (Math.abs(ratio - res.val) < 0.08) {
      return `${res.p}:${res.q}`;
    }
  }
  return null;
}

function OrbitalResonanceChart({ embryos }: { embryos: PlanetEmbryo[] }) {
  const sorted = [...embryos].sort((a, b) => a.semiMajorAxis - b.semiMajorAxis);
  const maxAxis = Math.max(...sorted.map((e) => e.semiMajorAxis), 1);
  const maxR = 140;
  const cx = 160;
  const cy = 160;
  const scale = maxR / maxAxis;

  const resonantPairs: { i: number; j: number; label: string }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const res = findResonance(sorted[i].semiMajorAxis, sorted[i + 1].semiMajorAxis);
    if (res) {
      resonantPairs.push({ i, j: i + 1, label: res });
    }
  }

  return (
    <svg viewBox="0 0 320 320" className="w-full h-full">
      {sorted.map((e, i) => {
        const orbitR = e.semiMajorAxis * scale;
        return (
          <circle
            key={`orbit-${i}`}
            cx={cx}
            cy={cy}
            r={orbitR}
            fill="none"
            stroke={ORBIT_COLORS[i % ORBIT_COLORS.length]}
            strokeWidth={0.8}
            strokeOpacity={0.4}
            strokeDasharray="4 2"
          />
        );
      })}

      {resonantPairs.map((pair, idx) => {
        const r1 = sorted[pair.i].semiMajorAxis * scale;
        const r2 = sorted[pair.j].semiMajorAxis * scale;
        const angle = (idx * 137.5 * Math.PI) / 180;
        const midR = (r1 + r2) / 2;
        const labelX = cx + midR * Math.cos(angle);
        const labelY = cy + midR * Math.sin(angle);
        const x1 = cx + r1 * Math.cos(angle);
        const y1 = cy + r1 * Math.sin(angle);
        const x2 = cx + r2 * Math.cos(angle);
        const y2 = cy + r2 * Math.sin(angle);
        return (
          <g key={`res-${idx}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F59E0B" strokeWidth={1} strokeOpacity={0.6} />
            <rect
              x={labelX - 14}
              y={labelY - 8}
              width={28}
              height={16}
              rx={4}
              fill="rgba(15,22,41,0.85)"
              stroke="rgba(245,158,11,0.4)"
              strokeWidth={0.5}
            />
            <text x={labelX} y={labelY + 4} textAnchor="middle" fill="#F59E0B" fontSize={8} fontFamily="Orbitron, sans-serif">
              {pair.label}
            </text>
          </g>
        );
      })}

      {sorted.map((e, i) => {
        const orbitR = e.semiMajorAxis * scale;
        const angle = (i * 137.5 + 30) * (Math.PI / 180);
        const px = cx + orbitR * Math.cos(angle);
        const py = cy + orbitR * Math.sin(angle);
        const planetR = Math.max(3, Math.min(10, 3 + Math.log10(e.mass + 0.001) * 3));
        return (
          <g key={`planet-${i}`}>
            <circle
              cx={px}
              cy={py}
              r={planetR}
              fill={ORBIT_COLORS[i % ORBIT_COLORS.length]}
              stroke="#0F1629"
              strokeWidth={1}
              opacity={0.9}
            />
            <text
              x={px}
              y={py - planetR - 4}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize={7}
            >
              {e.semiMajorAxis}AU
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={6} fill="#FDBA74" stroke="#F97316" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={10} fill="none" stroke="#FDBA74" strokeWidth={0.5} strokeOpacity={0.3} />
    </svg>
  );
}

function FinalSystemChart({ embryos }: { embryos: PlanetEmbryo[] }) {
  const sorted = [...embryos].sort((a, b) => a.semiMajorAxis - b.semiMajorAxis);
  const maxAxis = Math.max(...sorted.map((e) => e.semiMajorAxis), 1);
  const svgW = 400;
  const svgH = 320;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const maxR = Math.min(cx, cy) - 40;
  const scale = maxR / maxAxis;

  const scaleBarAU = 10;
  const scaleBarPx = scaleBarAU * scale;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full">
      {sorted.map((e, i) => {
        const orbitR = e.semiMajorAxis * scale;
        return (
          <circle
            key={`orbit-${i}`}
            cx={cx}
            cy={cy}
            r={orbitR}
            fill="none"
            stroke={ORBIT_COLORS[i % ORBIT_COLORS.length]}
            strokeWidth={0.6}
            strokeOpacity={0.3}
          />
        );
      })}

      {sorted.map((e, i) => {
        const orbitR = e.semiMajorAxis * scale;
        const angle = (i * 137.5 + 60) * (Math.PI / 180);
        const px = cx + orbitR * Math.cos(angle);
        const py = cy + orbitR * Math.sin(angle);
        const planetR = Math.max(4, Math.min(14, 4 + Math.log10(e.mass + 0.001) * 4));
        return (
          <g key={`planet-${i}`}>
            <circle cx={px} cy={py} r={planetR + 2} fill={ORBIT_COLORS[i % ORBIT_COLORS.length]} opacity={0.15} />
            <circle
              cx={px}
              cy={py}
              r={planetR}
              fill={ORBIT_COLORS[i % ORBIT_COLORS.length]}
              stroke="#0F1629"
              strokeWidth={1.5}
            />
            <text
              x={px}
              y={py + planetR + 12}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize={8}
            >
              {e.mass >= 0.01 ? `${e.mass.toFixed(2)} Mj` : `${(e.mass * 318).toFixed(1)} M⊕`}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={8} fill="#FDBA74" stroke="#F97316" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={14} fill="none" stroke="#FDBA74" strokeWidth={0.5} strokeOpacity={0.2} />

      <g transform={`translate(20, ${svgH - 25})`}>
        <line x1={0} y1={0} x2={scaleBarPx} y2={0} stroke="#9CA3AF" strokeWidth={1.5} />
        <line x1={0} y1={-4} x2={0} y2={4} stroke="#9CA3AF" strokeWidth={1} />
        <line x1={scaleBarPx} y1={-4} x2={scaleBarPx} y2={4} stroke="#9CA3AF" strokeWidth={1} />
        <text x={scaleBarPx / 2} y={14} textAnchor="middle" fill="#9CA3AF" fontSize={9}>
          {scaleBarAU} AU
        </text>
      </g>
    </svg>
  );
}

export default function PlanetTracking() {
  const { simulations, currentSimulation, fetchSimulations, fetchSimulation, loading } = useAppStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchSimulation(selectedTaskId);
    }
  }, [selectedTaskId, fetchSimulation]);

  const embryos = useMemo(() => {
    if (currentSimulation?.embryos && currentSimulation.embryos.length > 0) {
      return currentSimulation.embryos;
    }
    return generateMockEmbryos();
  }, [currentSimulation]);

  const scatterData = useMemo(
    () =>
      embryos.map((e) => ({
        semiMajorAxis: e.semiMajorAxis,
        mass: e.mass,
        formationTime: e.formationTime,
        id: e.id,
      })),
    [embryos],
  );

  const maxFormationTime = useMemo(
    () => Math.max(...embryos.map((e) => e.formationTime), 1),
    [embryos],
  );

  const selectedSim = simulations.find((s) => s.id === selectedTaskId);

  if (loading && simulations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="cosmos-card p-8 text-center">
          <div className="w-8 h-8 border-2 border-aurora-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">加载模拟数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div>
          <h3 className="cosmos-section-title">行星胚胎追踪</h3>
          <p className="text-sm text-gray-400 mt-1">监测行星胚胎的形成位置、质量增长与轨道演化</p>
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
          <span>胚胎数: {embryos.length}</span>
        </div>
      )}

      <div className="cosmos-card p-5">
        <h4 className="cosmos-section-title text-base mb-4">胚胎质量-半长轴分布</h4>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="semiMajorAxis"
                type="number"
                name="半长轴"
                unit=" AU"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                label={{ value: '半长轴 (AU)', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 11 }}
              />
              <YAxis
                dataKey="mass"
                type="number"
                name="质量"
                unit=" Mj"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                label={{ value: '质量 (M_Jupiter)', angle: -90, position: 'insideLeft', offset: 10, fill: '#9CA3AF', fontSize: 11 }}
              />
              <ZAxis dataKey="formationTime" range={[60, 300]} name="形成时间" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(value: number, name: string) => {
                  if (name === '质量') return [`${value.toFixed(4)} Mj`, name];
                  if (name === '半长轴') return [`${value.toFixed(2)} AU`, name];
                  if (name === '形成时间') return [`${value.toFixed(1)} kyr`, name];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
              {SOLAR_SYSTEM_REFS.map((ref) => (
                <ReferenceLine
                  key={ref.name}
                  x={ref.axis}
                  stroke="rgba(107,114,128,0.4)"
                  strokeDasharray="4 4"
                  label={{
                    value: ref.name,
                    position: 'top',
                    fill: '#6B7280',
                    fontSize: 10,
                  }}
                />
              ))}
              <Scatter data={scatterData} fill="#8B5CF6" name="胚胎">
                {scatterData.map((entry, idx) => {
                  const t = entry.formationTime / maxFormationTime;
                  const r = Math.round(139 + t * 116);
                  const g = Math.round(92 - t * 60);
                  const b = Math.round(246 - t * 200);
                  return <circle key={idx} fill={`rgb(${r},${g},${b})`} fillOpacity={0.85} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs text-gray-500">早期形成</span>
          <div className="flex h-3 w-32 rounded overflow-hidden">
            {Array.from({ length: 16 }, (_, i) => {
              const t = i / 15;
              const r = Math.round(139 + t * 116);
              const g = Math.round(92 - t * 60);
              const b = Math.round(246 - t * 200);
              return <div key={i} className="flex-1" style={{ backgroundColor: `rgb(${r},${g},${b})` }} />;
            })}
          </div>
          <span className="text-xs text-gray-500">晚期形成</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cosmos-card p-5">
          <h4 className="cosmos-section-title text-base mb-4">轨道共振结构图</h4>
          <div className="w-full h-80 flex items-center justify-center">
            <OrbitalResonanceChart embryos={embryos} />
          </div>
        </div>

        <div className="cosmos-card p-5">
          <h4 className="cosmos-section-title text-base mb-4">最终行星系统构型</h4>
          <div className="w-full h-80 flex items-center justify-center">
            <FinalSystemChart embryos={embryos} />
          </div>
        </div>
      </div>
    </div>
  );
}
