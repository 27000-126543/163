import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { Sparkles, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mechanismNameMap: Record<string, string> = {
  streaming_instability: '流动不稳定性',
  gravitational_instability: '引力不稳定性',
  pebble_accretion: '卵石吸积',
};

const confidenceColor = (c: number) => {
  if (c > 0.9) return { bar: 'bg-aurora-500', text: 'text-aurora-400', bg: 'bg-aurora-500/20' };
  if (c >= 0.7) return { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/20' };
  return { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/20' };
};

const viscosityProfileData = Array.from({ length: 50 }, (_, i) => {
  const radius = 0.5 + i * 0.5;
  return {
    radius,
    'α-viscosity': 0.001 * Math.pow(radius, -0.5),
    'β-viscosity': 0.002 * Math.exp(-radius / 10),
  };
});

export default function RecommendationEngine() {
  const { recommendations, fetchRecommendations } = useAppStore();

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleApply = (recId: string) => {
    const rec = recommendations.find((r) => r.id === recId);
    if (!rec) return;
    fetch('/api/simulations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        growthMechanism: rec.growthMechanism,
        viscosityProfile: rec.viscosityProfile,
        viscosityParams: rec.viscosityParams,
      }),
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h3 className="cosmos-section-title flex items-center gap-2">
          <Sparkles size={20} className="text-aurora-400" />
          智能推荐引擎
        </h3>
        <p className="text-sm text-gray-400 mt-1">基于历史模拟数据的参数优化与生长机制推荐</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {recommendations.length === 0 ? (
          <div className="col-span-3 cosmos-card p-8 text-center text-gray-500">暂无推荐数据</div>
        ) : (
          recommendations.map((rec) => {
            const colors = confidenceColor(rec.confidence);
            return (
              <div key={rec.id} className="cosmos-card-hover p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-100">
                    {mechanismNameMap[rec.growthMechanism] ?? rec.growthMechanism}
                  </h4>
                  <span className={`cosmos-badge ${colors.bg} ${colors.text} border ${colors.bar.replace('bg-', 'border-').replace('-500', '-500/30')}`}>
                    {(rec.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>置信度</span>
                    <span className={colors.text}>{(rec.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-cosmos-700">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${rec.confidence * 100}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  基于 <span className="text-nebula-300 font-medium">{rec.basedOnTaskCount}</span> 次模拟
                </p>

                <div className="text-xs text-gray-400">
                  <p>粘滞剖面: <span className="text-plasma-300">{rec.viscosityProfile}</span></p>
                </div>

                <div className="space-y-1">
                  {Object.entries(rec.viscosityParams).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{key}</span>
                      <span className="text-gray-300 font-mono">{typeof val === 'number' ? val.toFixed(4) : val}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleApply(rec.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-nebula-500/20 text-nebula-300 border border-nebula-500/30 hover:bg-nebula-500/30 transition-colors"
                >
                  <CheckCircle size={12} />应用此推荐
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="cosmos-card p-5">
        <h4 className="text-sm font-medium text-gray-300 mb-4">粘滞剖面对比</h4>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={viscosityProfileData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.5)" />
            <XAxis
              dataKey="radius"
              type="number"
              domain={[0.5, 25]}
              tickFormatter={(v: number) => `${v}`}
              stroke="#6B7280"
              fontSize={11}
              label={{ value: '半径 (AU)', position: 'insideBottom', offset: -4, style: { fill: '#6B7280', fontSize: 12 } }}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={11}
              tickFormatter={(v: number) => v.toFixed(3)}
              label={{ value: '粘滞系数', angle: -90, position: 'insideLeft', style: { fill: '#6B7280', fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{ background: '#151D36', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 12 }}
              labelFormatter={(label: number) => `半径: ${label} AU`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="α-viscosity" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="β-viscosity" stroke="#F97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
