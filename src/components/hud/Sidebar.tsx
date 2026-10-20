import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  Wrench,
  Search,
  CheckSquare,
  Cpu,
  Sliders,
  ShieldAlert,
  Gamepad2,
  Heart
} from 'lucide-react';

export type ActiveView = 
  | 'dashboard' 
  | 'chat' 
  | 'games'
  | 'memory' 
  | 'tools' 
  | 'research' 
  | 'tasks' 
  | 'providers' 
  | 'personality' 
  | 'security';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  unreadAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  unreadAlertCount = 0
}) => {
  const navItems: Array<{ id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'dashboard', label: 'Command HUD', icon: LayoutDashboard },
    { id: 'chat', label: 'Voice & Chat', icon: MessageSquare },
    { id: 'games', label: 'Playable Games', icon: Gamepad2 },
    { id: 'personality', label: 'Companion & Voice', icon: Heart },
    { id: 'memory', label: 'Memory Vault', icon: Brain },
    { id: 'tools', label: 'Tools Registry', icon: Wrench },
    { id: 'research', label: 'Web Research', icon: Search },
    { id: 'tasks', label: 'Tasks & Alerts', icon: CheckSquare, badge: unreadAlertCount },
    { id: 'providers', label: 'AI Providers', icon: Cpu },
    { id: 'security', label: 'Security & Audit', icon: ShieldAlert }
  ];


  return (
    <aside className="w-56 bg-[#040713]/80 border-r border-cyan-950/40 flex flex-col justify-between p-3 select-none backdrop-blur-md">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono tracking-widest text-cyan-500/70 uppercase flex items-center justify-between">
          <span>NAVIGATION RAIL</span>
          <span className="text-[9px] text-zinc-600">SYS-NAV</span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition-all duration-150 relative group focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                isActive
                  ? 'bg-cyan-950/50 text-cyan-300 font-semibold shadow-[inset_0_0_12px_rgba(0,240,255,0.08)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              {/* Active left indicator accent notch */}
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-cyan-400 rounded-r shadow-[0_0_8px_#00f0ff]" />
              )}

              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && item.badge > 0 ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-red-950/80 border border-red-700/60 text-red-300">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Aerospace Telemetry Footer Widget */}
      <div className="p-3 rounded bg-black/50 border border-cyan-950/50 text-[11px] font-mono space-y-1">
        <div className="text-zinc-300 font-semibold flex items-center justify-between">
          <span className="tracking-wider text-[10px] text-cyan-400">JARVIS KERNEL</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff] animate-pulse" />
        </div>
        <div className="text-[10px] text-zinc-500">POLICY: ₹0 AUTHORITATIVE</div>
        <div className="text-[10px] text-zinc-500">DPAPI VAULT: ENCRYPTED</div>
      </div>
    </aside>
  );
};
