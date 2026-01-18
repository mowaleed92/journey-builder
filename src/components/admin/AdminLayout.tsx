import { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Settings,
  ChevronLeft,
  Sparkles,
  GraduationCap
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onExit: () => void;
}

export function AdminLayout({ children, activeTab, onTabChange, onExit }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracks', label: 'Tracks', icon: BookOpen },
    { id: 'builder', label: 'Journey Builder', icon: Layers },
    { id: 'ai-studio', label: 'AI Studio', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside
        className={`bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">Admin</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-slate-700">
          <button
            onClick={onExit}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Back to App</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
