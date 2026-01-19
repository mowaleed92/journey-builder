import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Settings,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onExit: () => void;
}

export function AdminLayout({ children, activeTab, onTabChange, onExit }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'tracks', label: 'Tracks', icon: BookOpen, path: '/admin/tracks' },
    { id: 'builder', label: 'Journey Builder', icon: Layers, path: '/admin/builder' },
    { id: 'ai-studio', label: 'AI Studio', icon: Sparkles, path: '/admin/ai-studio' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    // Update URL
    navigate(item.path);
    // Also notify parent for state sync
    onTabChange(item.id);
  };

  // Determine active tab from URL
  const getActiveFromPath = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/builder')) return 'builder';
    if (path.startsWith('/admin/tracks')) return 'tracks';
    if (path.startsWith('/admin/ai-studio')) return 'ai-studio';
    if (path.startsWith('/admin/settings')) return 'settings';
    return 'dashboard';
  };

  const currentActive = getActiveFromPath();

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
              <img
                src="https://res.cloudinary.com/dujh5xuoi/image/upload/v1754423073/%D8%AA%D8%B9%D9%84%D9%91%D9%85_AIFinal_edvr4e.png"
                alt="Platform logo"
                className="max-h-8 w-auto object-contain"
              />
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

        <nav className="flex-1 p-2 space-y-1" role="navigation" aria-label="Admin navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentActive === item.id || activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
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
