import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { MonitoringSnapshot } from '@/store';

interface MonitoringChartProps {
  data: MonitoringSnapshot[];
}

export default function MonitoringChart({ data }: MonitoringChartProps) {
  const chartData = data.map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    dustGrowthRate: s.dustGrowthRate,
    toomreQ: s.toomreQ,
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="qDangerArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,58,82,0.2)" />

          <XAxis
            dataKey="time"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(45,58,82,0.3)' }}
            tickLine={false}
          />

          <YAxis
            yAxisId="left"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(45,58,82,0.3)' }}
            tickLine={false}
            label={{
              value: '尘埃生长率',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: '#A78BFA',
              fontSize: 11,
            }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(45,58,82,0.3)' }}
            tickLine={false}
            label={{
              value: 'Toomre Q',
              angle: 90,
              position: 'insideRight',
              offset: 10,
              fill: '#FB923C',
              fontSize: 11,
            }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,22,41,0.95)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '8px',
              color: '#E5E7EB',
              fontSize: 12,
            }}
            labelStyle={{ color: '#9CA3AF' }}
          />

          <Legend
            wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }}
            iconType="line"
          />

          <ReferenceLine
            yAxisId="right"
            y={1}
            stroke="#EF4444"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: 'Q=1 临界',
              position: 'right',
              fill: '#EF4444',
              fontSize: 10,
            }}
          />

          <Area
            yAxisId="right"
            type="monotone"
            dataKey="toomreQ"
            fill="url(#qDangerArea)"
            stroke="none"
            fillOpacity={1}
            baseValue={0}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="dustGrowthRate"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#8B5CF6', stroke: '#0F1629', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#A78BFA', stroke: '#0F1629', strokeWidth: 2 }}
            name="尘埃生长率"
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="toomreQ"
            stroke="#FB923C"
            strokeWidth={2}
            dot={{ r: 3, fill: '#FB923C', stroke: '#0F1629', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#FDBA74', stroke: '#0F1629', strokeWidth: 2 }}
            name="Toomre Q"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
