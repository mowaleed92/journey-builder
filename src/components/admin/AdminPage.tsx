import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { TrackManager } from './TrackManager';
import { JourneyBuilder } from './JourneyBuilder';
import { AIStudio } from './AIStudio';
import {
  BookOpen,
  Layers,
  TrendingUp,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';

interface AdminPageProps {
  onExit: () => void;
  onSettingsChanged?: () => void;
}

// Helper to get tab from URL path
function getTabFromPath(pathname: string): string {
  if (pathname.startsWith('/admin/builder')) return 'builder';
  if (pathname.startsWith('/admin/tracks')) return 'tracks';
  if (pathname.startsWith('/admin/ai-studio')) return 'ai-studio';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  return 'dashboard';
}

export function AdminPage({ onExit, onSettingsChanged }: AdminPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));
  const [editingJourney, setEditingJourney] = useState<{
    moduleId: string;
    journeyVersionId?: string;
  } | null>(null);

  // Sync tab state with URL changes
  useEffect(() => {
    const tabFromUrl = getTabFromPath(location.pathname);
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.pathname]);

  const handleEditJourney = (moduleId: string, journeyVersionId?: string) => {
    setEditingJourney({ moduleId, journeyVersionId });
    setActiveTab('builder');
    navigate(`/admin/builder/${moduleId}${journeyVersionId ? `?v=${journeyVersionId}` : ''}`);
  };

  const handleBackFromBuilder = () => {
    setEditingJourney(null);
    setActiveTab('tracks');
    navigate('/admin/tracks');
  };

  const renderContent = () => {
    if (editingJourney && activeTab === 'builder') {
      return (
        <JourneyBuilder
          moduleId={editingJourney.moduleId}
          journeyVersionId={editingJourney.journeyVersionId}
          onBack={handleBackFromBuilder}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard onNavigate={setActiveTab} />;
      case 'tracks':
        return <TrackManager onEditJourney={handleEditJourney} />;
      case 'builder':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Layers className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-400 mb-2">Journey Builder</h2>
              <p className="text-slate-500 mb-4">Select a module from Tracks to edit its journey</p>
              <button
                onClick={() => setActiveTab('tracks')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Tracks
              </button>
            </div>
          </div>
        );
      case 'ai-studio':
        return <AIStudio />;
      case 'settings':
        return <AdminSettings onSettingsChanged={onSettingsChanged} />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onExit={onExit}
    >
      {renderContent()}
    </AdminLayout>
  );
}

interface DashboardStats {
  totalTracks: number;
  activeLearners: number;
  avgCompletion: number;
  totalHours: number;
}

function AdminDashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalTracks: 0,
    activeLearners: 0,
    avgCompletion: 0,
    totalHours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const { supabase } = await import('../../lib/supabase');

      // Query total tracks
      const { count: tracksCount } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true });

      // Query unique active learners (users with journey runs)
      const { data: learnerData } = await supabase
        .from('user_journey_runs')
        .select('user_id');
      
      const uniqueLearners = new Set(learnerData?.map(r => r.user_id) || []);

      // Query completion stats
      const { data: runsData } = await supabase
        .from('user_journey_runs')
        .select('status');
      
      const totalRuns = runsData?.length || 0;
      const completedRuns = runsData?.filter(r => r.status === 'completed').length || 0;
      const avgCompletion = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

      // Query total learning hours from completed block states
      const { data: blockStatesData } = await supabase
        .from('user_block_states')
        .select('time_spent_seconds');
      
      const totalSeconds = blockStatesData?.reduce((sum, b) => sum + (b.time_spent_seconds || 0), 0) || 0;
      const totalHours = Math.round(totalSeconds / 3600);

      setStats({
        totalTracks: tracksCount || 0,
        activeLearners: uniqueLearners.size,
        avgCompletion,
        totalHours,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statsDisplay = [
    { label: 'Total Tracks', value: isLoading ? '...' : String(stats.totalTracks), icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Active Learners', value: isLoading ? '...' : String(stats.activeLearners), icon: Users, color: 'bg-emerald-500' },
    { label: 'Avg. Completion', value: isLoading ? '...' : `${stats.avgCompletion}%`, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Total Hours', value: isLoading ? '...' : String(stats.totalHours), icon: Clock, color: 'bg-amber-500' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">Manage your learning content and track performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsDisplay.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-slate-400">{stat.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate('tracks')}
                className="w-full flex items-center gap-3 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">Create New Track</div>
                  <div className="text-sm text-slate-400">Start a new learning path</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('ai-studio')}
                className="w-full flex items-center gap-3 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">AI Content Studio</div>
                  <div className="text-sm text-slate-400">Generate content with AI</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('tracks')}
                className="w-full flex items-center gap-3 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">Edit Existing Journey</div>
                  <div className="text-sm text-slate-400">Modify course content</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[
                { action: 'Track published', item: 'GenAI Fundamentals', time: '2 hours ago' },
                { action: 'Module created', item: 'Advanced Prompting', time: '5 hours ago' },
                { action: 'Quiz updated', item: 'Knowledge Check #3', time: '1 day ago' },
                { action: 'New learner enrolled', item: 'John D.', time: '2 days ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white">{activity.action}</div>
                    <div className="text-xs text-slate-500">{activity.item}</div>
                  </div>
                  <div className="text-xs text-slate-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminSettingsProps {
  onSettingsChanged?: () => void;
}

function AdminSettings({ onSettingsChanged }: AdminSettingsProps) {
  // General settings state
  const [platformName, setPlatformName] = useState('Learning Hub');
  const [language, setLanguage] = useState('English');
  
  // AI settings state
  const [contentModel, setContentModel] = useState('gpt-4o');
  const [helpModel, setHelpModel] = useState('gpt-4o-mini');
  const [aiEnabled, setAiEnabled] = useState(true);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { supabase } = await import('../../lib/supabase');

      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'ai_content_model', 
          'ai_help_model', 
          'platform_name', 
          'default_language',
          'ai_enabled'
        ]);

      if (error) throw error;

      if (data) {
        data.forEach(setting => {
          switch (setting.setting_key) {
            case 'ai_content_model':
              setContentModel(setting.setting_value);
              break;
            case 'ai_help_model':
              setHelpModel(setting.setting_value);
              break;
            case 'platform_name':
              setPlatformName(setting.setting_value);
              break;
            case 'default_language':
              setLanguage(setting.setting_value);
              break;
            case 'ai_enabled':
              setAiEnabled(setting.setting_value === 'true');
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { supabase } = await import('../../lib/supabase');

      const updates = [
        { setting_key: 'ai_content_model', setting_value: contentModel },
        { setting_key: 'ai_help_model', setting_value: helpModel },
        { setting_key: 'platform_name', setting_value: platformName },
        { setting_key: 'default_language', setting_value: language },
        { setting_key: 'ai_enabled', setting_value: String(aiEnabled) }
      ];

      // Use upsert to handle both insert and update
      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(
            { 
              setting_key: update.setting_key, 
              setting_value: update.setting_value,
              category: update.setting_key.startsWith('ai_') ? 'ai' : 'general',
              description: getSettingDescription(update.setting_key)
            },
            { onConflict: 'setting_key' }
          );

        if (error) {
          console.error(`Error saving ${update.setting_key}:`, error);
          throw error;
        }
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
      
      // Notify parent that settings have changed
      if (onSettingsChanged) {
        onSettingsChanged();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      'ai_content_model': 'AI model used for content generation in AI Studio',
      'ai_help_model': 'AI model used for student help and assistance',
      'platform_name': 'Platform display name',
      'default_language': 'Default content language',
      'ai_enabled': 'Whether AI content generation is enabled'
    };
    return descriptions[key] || '';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter platform name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Default Language
              </label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="English">English</option>
                <option value="Arabic">Arabic</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">AI Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Content Generation Model
              </label>
              <div className="text-xs text-slate-500 mb-2">Used for AI Studio and course generation</div>
              <select
                value={contentModel}
                onChange={(e) => setContentModel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4o">GPT-4o (Recommended)</option>
                <option value="gpt-4o-mini">GPT-4o-mini (Faster)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-5.2">GPT-5.2 (Latest)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                AI Help Model
              </label>
              <div className="text-xs text-slate-500 mb-2">Used for student assistance and tutoring</div>
              <select
                value={helpModel}
                onChange={(e) => setHelpModel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4o">GPT-4o (Recommended)</option>
                <option value="gpt-4o-mini">GPT-4o-mini (Faster, Cost-effective)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-5.2">GPT-5.2 (Latest)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-300">Enable AI Content Generation</div>
                <div className="text-xs text-slate-500">Allow AI to generate course content</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.text}
          </div>
        )}

        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
