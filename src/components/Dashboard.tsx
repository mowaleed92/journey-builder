import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks';
import { TrackCard } from './TrackCard';
import { JourneyRunner } from '../engine/JourneyRunner';
import { sampleJourneyGraph } from '../data/sampleJourney';
import { TrendingUp, Target, Sparkles, BookOpen, Settings, RefreshCw } from 'lucide-react';
import type { Track, Module, JourneyVersion, GraphDefinition } from '../types/database';

interface DashboardProps {
  userId: string;
  onLogout: () => void;
  onOpenAdmin: () => void;
  settingsKey?: number; // Used to trigger settings reload when changed
}

interface TrackWithProgress extends Track {
  modules?: (Module & { journey_versions?: JourneyVersion[] })[];
  progress: number;
  journeyVersionId?: string;
  graphJson?: GraphDefinition;
}

export function Dashboard({ userId, onLogout, onOpenAdmin, settingsKey }: DashboardProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tracks, setTracks] = useState<TrackWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeJourney, setActiveJourney] = useState<{
    journeyVersionId: string;
    graph: GraphDefinition;
  } | null>(null);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalInProgress: 0,
    streakDays: 0,
  });
  const [platformName, setPlatformName] = useState('Learning Hub');

  useEffect(() => {
    loadTracks();
    loadStats();
  }, []);

  // Load platform settings (and reload when settingsKey changes)
  useEffect(() => {
    loadSettings();
  }, [settingsKey]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'platform_name')
        .maybeSingle();

      if (!error && data) {
        setPlatformName(data.setting_value);
      }
    } catch (err) {
      console.error('Error loading platform settings:', err);
    }
  };

  const loadTracks = async () => {
    setIsLoading(true);

    const { data: tracksData, error } = await supabase
      .from('tracks')
      .select(`
        *,
        modules (
          id,
          title,
          order_index,
          journey_versions (
            id,
            version,
            status,
            graph_json
          )
        )
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading tracks:', error);
      setIsLoading(false);
      return;
    }

    if (tracksData && tracksData.length > 0) {
      const tracksWithProgress = await Promise.all(
        tracksData.map(async (track) => {
          const modules = track.modules || [];
          let journeyVersionId: string | undefined;
          let graphJson: GraphDefinition | undefined;

          if (modules.length > 0) {
            const firstModule = modules[0];
            const publishedVersion = firstModule.journey_versions?.find(
              (v: JourneyVersion) => v.status === 'published'
            );
            if (publishedVersion) {
              journeyVersionId = publishedVersion.id;
              graphJson = publishedVersion.graph_json as GraphDefinition;
            }
          }

          let progress = 0;
          if (journeyVersionId && graphJson) {
            const { data: runs } = await supabase
              .from('user_journey_runs')
              .select('id, status')
              .eq('user_id', userId)
              .eq('journey_version_id', journeyVersionId)
              .order('created_at', { ascending: false })
              .limit(1);

            if (runs && runs.length > 0) {
              const latestRun = runs[0];
              if (latestRun.status === 'completed') {
                progress = 100;
              } else {
                const { data: blockStates } = await supabase
                  .from('user_block_states')
                  .select('status')
                  .eq('run_id', latestRun.id);

                if (blockStates && graphJson.blocks) {
                  const completedBlocks = blockStates.filter(
                    (s) => s.status === 'completed'
                  ).length;
                  progress = Math.round(
                    (completedBlocks / graphJson.blocks.length) * 100
                  );
                }
              }
            }
          }

          return {
            ...track,
            modules,
            progress,
            journeyVersionId,
            graphJson,
          };
        })
      );

      setTracks(tracksWithProgress);
    }

    setIsLoading(false);
  };

  const loadStats = async () => {
    const { data: completedRuns } = await supabase
      .from('user_journey_runs')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const { data: inProgressRuns } = await supabase
      .from('user_journey_runs')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'in_progress');

    setStats({
      totalCompleted: completedRuns?.length || 0,
      totalInProgress: inProgressRuns?.length || 0,
      streakDays: Math.floor(Math.random() * 7) + 1,
    });
  };

  const seedSampleData = async () => {
    setIsSeeding(true);

    try {
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .insert({
          title: 'GenAI Fundamentals',
          description: 'Learn the core concepts of Generative AI, including how language models work, tokens, prompts, and practical applications.',
          level: 'beginner',
          tags: JSON.stringify(['AI', 'Fundamentals', 'LLM']),
          estimated_duration_minutes: 20,
        })
        .select()
        .single();

      if (trackError || !track) {
        throw new Error(trackError?.message || 'Failed to create track');
      }

      const { data: module, error: moduleError } = await supabase
        .from('modules')
        .insert({
          track_id: track.id,
          title: 'Introduction to GenAI',
          description: 'Your first steps into the world of Generative AI',
          order_index: 0,
          estimated_duration_minutes: 20,
        })
        .select()
        .single();

      if (moduleError || !module) {
        throw new Error(moduleError?.message || 'Failed to create module');
      }

      const { data: journeyVersion, error: journeyError } = await supabase
        .from('journey_versions')
        .insert({
          module_id: module.id,
          version: 1,
          status: 'published',
          graph_json: sampleJourneyGraph,
        })
        .select()
        .single();

      if (journeyError || !journeyVersion) {
        throw new Error(journeyError?.message || 'Failed to create journey version');
      }

      const { error: updateError } = await supabase
        .from('tracks')
        .update({ published_version_id: journeyVersion.id })
        .eq('id', track.id);

      if (updateError) {
        console.error('Failed to update track with published version:', updateError);
        // Non-critical error, track is still usable
      }

      showToast('success', 'Sample track created successfully! You can now start learning.');
      await loadTracks();
    } catch (err) {
      console.error('Seeding error:', err);
      showToast('error', 'Failed to create sample track. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleStartJourney = (track: TrackWithProgress) => {
    if (track.journeyVersionId) {
      // Navigate to journey URL - enables browser back button and shareable links
      navigate(`/journey?v=${track.journeyVersionId}`);
    }
  };

  const handleJourneyComplete = () => {
    setActiveJourney(null);
    loadTracks();
    loadStats();
  };

  const handleJourneyExit = () => {
    setActiveJourney(null);
    loadTracks();
  };

  if (activeJourney) {
    return (
      <JourneyRunner
        journeyVersionId={activeJourney.journeyVersionId}
        userId={userId}
        graph={activeJourney.graph}
        onComplete={handleJourneyComplete}
        onExit={handleJourneyExit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://res.cloudinary.com/dujh5xuoi/image/upload/v1754423073/%D8%AA%D8%B9%D9%84%D9%91%D9%85_AIFinal_edvr4e.png"
                alt="Platform logo"
                className="max-h-10 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">{platformName}</h1>
                <p className="text-sm text-slate-500">Your AI-powered learning journey</p>
              </div>
            </div>

            <nav className="flex items-center gap-2" role="navigation" aria-label="User actions">
              <button
                onClick={onOpenAdmin}
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Open Admin Panel"
              >
                <Settings className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                aria-label="Sign out of your account"
              >
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalCompleted}</div>
              <div className="text-sm text-slate-500">Completed</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalInProgress}</div>
              <div className="text-sm text-slate-500">In Progress</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.streakDays} days</div>
              <div className="text-sm text-slate-500">Learning Streak</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Continue Learning</h2>
          <p className="text-slate-600">Pick up where you left off or start a new track</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tracks available</h3>
            <p className="text-slate-500 mb-6">Get started by creating your first learning track</p>
            <button
              onClick={seedSampleData}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSeeding ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isSeeding ? 'Creating...' : 'Create Sample Track'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                title={track.title}
                description={track.description || ''}
                level={track.level}
                estimatedDuration={track.estimated_duration_minutes}
                moduleCount={track.modules?.length || 1}
                coverImage={track.cover_image_url || undefined}
                progress={track.progress}
                onStart={() => handleStartJourney(track)}
                disabled={!track.journeyVersionId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
