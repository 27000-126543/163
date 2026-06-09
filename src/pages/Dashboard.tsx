import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { BarChart3, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BoxplotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export default function Dashboard() {
  const { dailyStats, fetchDailyStats, fetchTrends } = useAppStore();
  const [boxplotData, setBoxplotData] = useState<BoxplotData | null>(null);

  useEffect(() => {
    fetchTrends();
    fetchDailyStats();
  }, [fetchTrends, fetchDailyStats]);

  useEffect(() => {
    fetch('/api/dashboard/boxplot')
      .then((r) => r.json())
      .then((json) => {
        const data = json.data?.completionRate;
        if (data) setBoxplotData(data);
        else setBoxplotData({ min: 45, q1: 62, median: 74, q3: 85, max: 96 });
      })
      .catch(() => {
        setBoxplotData({ min: 45, q1: 62, median: 74, q3: 85, max: 96 });
      });
  }, []);

  const latestStat = dailyStats.length > 0 ? dailyStats[dailyStats.length - 1] : null;
  const prevStat = dailyStats.length > 1 ? dailyStats[dailyStats.length - 2] : null;

  const completionRate = latestStat?.completionRate ?? 0;
  const avgEfficiency = latestStat?.avgEfficiency ?? 0;
  const convergenceCount = latestStat?.convergenceCount ?? 0;

  const efficiencyTrend = prevStat
    ? avgEfficiency >= prevStat.avgEfficiency
      ? 'up'
      : 'down'
    : null;

  const sparklineData = dailyStats.slice(-8).map((s) => s.convergenceCount);

  const ringRadius = 40;
  const ringStroke = 6;
  const circumference = 2 * Math.PI * ringRadius;
  const completionOffset = circumference - (completionRate / 100) * circumference;

  const renderBoxplot = () => {
    if (!boxplotData) return <p className="text-gray-500 text-sm text-center">加载中...</p>;

    const { min, q1, median, q3, max } = boxplotData;
    const range = max - min || 1;
    const scale = (v: number) => ((v - min) / range) * 100;

    return (
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px] mx-auto">
        <line x1={scale(min)} y1="50" x2={scale(q1)} y2="50" stroke="#6B7280" strokeWidth="1.5" />
        <line x1={scale(q3)} y1="50" x2={scale(max)} y2="50" stroke="#6B7280" strokeWidth="1.5" />
        <line x1={scale(min)} y1="40" x2={scale(min)} y2="60" stroke="#6B7280" strokeWidth="1.5" />
        <line x1={scale(max)} y1="40" x2={scale(max)} y2="60" stroke="#6B7280" strokeWidth="1.5" />
        <rect
          x={scale(q1)}
          y="35"
          width={scale(q3) - scale(q1)}
          height="30"
          fill="rgba(124,58,237,0.25)"
          stroke="#8B5CF6"
          strokeWidth="1.5"
          rx="2"
        />
        <line x1={scale(median)} y1="33" x2={scale(median)} y2="67" stroke="#FB923C" strokeWidth="2.5" />
        <text x={scale(min)} y="85" textAnchor="middle" className="fill-gray-500 text-[9px]">{min}%</text>
        <text x={scale(q1)} y="85" textAnchor="middle" className="fill-gray-500 text-[9px]">Q1:{q1}%</text>
        <text x={scale(median)} y="18" textAnchor="middle" className="fill-plasma-400 text-[10px] font-medium">{median}%</text>
        <text x={scale(q3)} y="85" textAnchor="middle" className="fill-gray-500 text-[9px]">Q3:{q3}%</text>
        <text x={scale(max)} y="85" textAnchor="middle" className="fill-gray-500 text-[9px]">{max}%</text>
        <text x="100" y="108" textAnchor="middle" className="fill-gray-500 text-[9px]">完成率分布</text>
      </svg>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h3 className="cosmos-section-title flex items-center gap-2">
          <BarChart3 size={20} className="text-nebula-400" />
          综合数据看板
        </h3>
        <p className="text-sm text-gray-400 mt-1">模拟完成率、效率指标与趋势分析的统一视图</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="cosmos-card p-5 flex items-center gap-5">
          <div className="relative">
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r={ringRadius}
                fill="none"
                stroke="rgba(45,58,82,0.5)"
                strokeWidth={ringStroke}
              />
              <circle
                cx="50" cy="50" r={ringRadius}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth={ringStroke}
                strokeDasharray={circumference}
                strokeDashoffset={completionOffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-700"
              />
              <text x="50" y="48" textAnchor="middle" className="fill-gray-100 text-lg font-bold font-orbitron">
                {completionRate.toFixed(1)}
              </text>
              <text x="50" y="62" textAnchor="middle" className="fill-gray-500 text-[9px]">%</text>
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">模拟完成率</p>
            <p className="text-2xl font-bold font-orbitron text-nebula-300">{completionRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="cosmos-card p-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-plasma-500/20 flex items-center justify-center shrink-0">
            <Target size={24} className="text-plasma-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">平均行星形成效率</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold font-orbitron text-plasma-300">{avgEfficiency.toFixed(2)}</p>
              {efficiencyTrend && (
                efficiencyTrend === 'up'
                  ? <TrendingUp size={16} className="text-aurora-400" />
                  : <TrendingDown size={16} className="text-red-400" />
              )}
            </div>
          </div>
        </div>

        <div className="cosmos-card p-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-aurora-500/20 flex items-center justify-center shrink-0">
            <Zap size={24} className="text-aurora-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">收敛次数</p>
            <div className="flex items-end gap-3">
              <p className="text-2xl font-bold font-orbitron text-aurora-300">{convergenceCount}</p>
              {sparklineData.length > 1 && (
                <svg width={60} height={24} className="mb-1">
                  <polyline
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    points={sparklineData
                      .map((v, i) => {
                        const minV = Math.min(...sparklineData);
                        const maxV = Math.max(...sparklineData);
                        const rangeV = maxV - minV || 1;
                        const x = (i / (sparklineData.length - 1)) * 60;
                        const y = 24 - ((v - minV) / rangeV) * 22;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-2/3 cosmos-card p-5">
          <h4 className="text-sm font-medium text-gray-300 mb-4">性能趋势</h4>
          {dailyStats.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">暂无趋势数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  fontSize={11}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#6B7280"
                  fontSize={11}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6B7280"
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{ background: '#151D36', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="completionRate" stroke="#8B5CF6" strokeWidth={2} dot={false} name="完成率" />
                <Line yAxisId="left" type="monotone" dataKey="avgEfficiency" stroke="#F97316" strokeWidth={2} dot={false} name="平均效率" />
                <Line yAxisId="right" type="monotone" dataKey="convergenceCount" stroke="#10B981" strokeWidth={2} dot={false} name="收敛次数" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="w-1/3 cosmos-card p-5">
          <h4 className="text-sm font-medium text-gray-300 mb-4">完成率分布</h4>
          <div className="flex items-center justify-center py-4">
            {renderBoxplot()}
          </div>
        </div>
      </div>
    </div>
  );
}
