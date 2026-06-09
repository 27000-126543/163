import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Orbit,
  Cloud,
  Globe,
  ShieldCheck,
  Download,
  Sparkles,
  BarChart3,
  Bell,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store';

const navItems = [
  { path: '/', label: '模拟控制台', icon: Orbit },
  { path: '/dust-evolution', label: '尘埃演化', icon: Cloud },
  { path: '/planet-tracking', label: '行星追踪', icon: Globe },
  { path: '/approval', label: '审批管理', icon: ShieldCheck },
  { path: '/export', label: '数据导出', icon: Download },
  { path: '/recommendation', label: '智能推荐', icon: Sparkles },
  { path: '/dashboard', label: '综合看板', icon: BarChart3 },
];

const pageTitles: Record<string, string> = {
  '/': '模拟控制台',
  '/dust-evolution': '尘埃演化',
  '/planet-tracking': '行星追踪',
  '/approval': '审批管理',
  '/export': '数据导出',
  '/recommendation': '智能推荐',
  '/dashboard': '综合看板',
};

export default function Layout() {
  const location = useLocation();
  const alerts = useAppStore((s) => s.alerts);
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const currentTitle = pageTitles[location.pathname] || 'ProtoSim';

  return (
    <div className="flex h-screen bg-cosmos-900 font-noto text-gray-100 overflow-hidden">
      <div className="starfield-bg" />

      <aside className="relative z-10 w-64 bg-cosmos-800/90 backdrop-blur-xl border-r border-cosmos-500/30 flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-cosmos-500/30">
          <h1 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-nebula-400 via-plasma-400 to-aurora-400 bg-clip-text text-transparent">
            ProtoSim
          </h1>
          <p className="text-xs text-gray-400 mt-1 tracking-wider">原行星盘模拟平台</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-nebula-500/20 border-l-2 border-nebula-500 text-nebula-300 font-medium'
                    : 'text-gray-400 hover:bg-cosmos-700/50 hover:text-gray-200 border-l-2 border-transparent'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-cosmos-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nebula-500 to-plasma-500 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">研究员</p>
              <span className="cosmos-badge-nebula text-[10px]">高级权限</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-cosmos-800/70 backdrop-blur-md border-b border-cosmos-500/30 flex items-center justify-between px-6 shrink-0">
          <h2 className="font-orbitron text-base font-semibold tracking-wide text-gray-200">
            {currentTitle}
          </h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-cosmos-700/50 transition-colors">
              <Bell size={18} className="text-gray-400" />
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-plasma-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                  {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
