import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Sparkles, CheckCircle, X } from 'lucide-react';
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

interface ApplyForm {
  diskMass: string;
  dustSizeDistFile: File | null;
  dimension: '1D' | '2D';
}

export default function RecommendationEngine() {
  const { recommendations, fetchRecommendations, createSimulation, fetchSimulations } = useAppStore();

  const [applyModal, setApplyModal] = useState<{
    open: boolean;
    recId: string;
    mechanism: string;
    viscosityProfile: string;
    viscosityAlpha: string;
  }>({ open: false, recId: '', mechanism: '', viscosityProfile: '', viscosityAlpha: '' });
  const [applyForm, setApplyForm] = useState<ApplyForm>({
    diskMass: '0.1',
    dustSizeDistFile: null,
    dimension: '1D',
  });
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleApplyClick = (recId: string) => {
    const rec = recommendations.find((r) => r.id === recId);
    if (!rec) return;
    const alpha = rec.viscosityParams?.alpha ?? rec.viscosityParams?.beta ?? 0.001;
    setApplyModal({
      open: true,
      recId: rec.id,
      mechanism: rec.growthMechanism,
      viscosityProfile: rec.viscosityProfile,
      viscosityAlpha: String(alpha),
    });
    setApplyForm({ diskMass: '0.1', dustSizeDistFile: null, dimension: '1D' });
    setApplyResult('idle');
  };

  const handleApplySubmit = async () => {
    if (!applyForm.diskMass || !applyForm.dustSizeDistFile) return;
    setApplying(true);
    try {
      await createSimulation({
        name: `${mechanismNameMap[applyModal.mechanism] ?? applyModal.mechanism}推荐模拟`,
        diskMass: Number(applyForm.diskMass),
        viscosityAlpha: Number(applyModal.viscosityAlpha),
        dustSizeDistFile: applyForm.dustSizeDistFile.name,
        dimension: applyForm.dimension,
        userId: 'user-1',
      });
      await fetchSimulations();
      setApplyResult('success');
    } catch {
      setApplyResult('error');
    } finally {
      setApplying(false);
    }
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
                  onClick={() => handleApplyClick(rec.id)}
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

      {applyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="cosmos-card w-full max-w-md mx-4 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="cosmos-section-title text-base">应用推荐参数创建模拟</h3>
              <button
                className="p-1 rounded-md hover:bg-cosmos-600 text-gray-400 hover:text-gray-200 transition-colors"
                onClick={() => setApplyModal((p) => ({ ...p, open: false }))}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">推荐机制</span>
                <span className="text-nebula-300 font-medium">{mechanismNameMap[applyModal.mechanism] ?? applyModal.mechanism}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">粘滞剖面</span>
                <span className="text-plasma-300">{applyModal.viscosityProfile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">α粘性参数（自动填充）</span>
                <span className="text-aurora-300 font-mono">{applyModal.viscosityAlpha}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="cosmos-label">盘初始质量 M☉ <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  className="cosmos-input"
                  value={applyForm.diskMass}
                  onChange={(e) => setApplyForm((f) => ({ ...f, diskMass: e.target.value }))}
                  placeholder="0.1"
                />
              </div>

              <div>
                <label className="cosmos-label">尘埃粒径分布文件 <span className="text-red-400">*</span></label>
                <div
                  className="border-2 border-dashed border-cosmos-500/50 hover:border-nebula-500/50 rounded-lg p-4 text-center cursor-pointer transition-colors"
                  onClick={() => document.getElementById('rec-file-input')?.click()}
                >
                  <input
                    id="rec-file-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setApplyForm((f) => ({ ...f, dustSizeDistFile: file }));
                    }}
                  />
                  {applyForm.dustSizeDistFile ? (
                    <span className="text-sm text-aurora-400">{applyForm.dustSizeDistFile.name}</span>
                  ) : (
                    <span className="text-sm text-gray-500">点击选择文件</span>
                  )}
                </div>
              </div>

              <div>
                <label className="cosmos-label">模拟维度</label>
                <div className="flex gap-2">
                  {(['1D', '2D'] as const).map((d) => (
                    <button
                      key={d}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        applyForm.dimension === d
                          ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/50'
                          : 'bg-cosmos-700 text-gray-400 border border-cosmos-500/40 hover:border-cosmos-500/60'
                      }`}
                      onClick={() => setApplyForm((f) => ({ ...f, dimension: d }))}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {applyResult === 'success' && (
              <div className="mt-4 bg-aurora-500/10 border border-aurora-500/30 rounded-lg p-3 text-xs text-aurora-300">
                模拟任务已创建成功！请前往模拟控制台查看。
              </div>
            )}
            {applyResult === 'error' && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                创建失败，请检查参数后重试。
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                className="cosmos-btn-primary flex-1"
                onClick={handleApplySubmit}
                disabled={!applyForm.diskMass || !applyForm.dustSizeDistFile || applying}
              >
                {applying ? '创建中...' : '创建模拟任务'}
              </button>
              <button
                className="cosmos-btn-secondary"
                onClick={() => setApplyModal((p) => ({ ...p, open: false }))}
              >
                {applyResult === 'success' ? '关闭' : '取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
