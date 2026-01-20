import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks';
import { useTranslation } from '../contexts';
import { findNextBlock, buildFactsFromBlockState } from './conditions';
import { RTLProvider } from '../contexts/RTLContext';
import {
  ReadBlock,
  VideoBlock,
  ImageBlock,
  QuizBlock,
  MissionBlock,
  FormBlock,
  AIHelpBlock,
  CheckpointBlock,
  AnimationBlock,
  CodeBlock,
  ExerciseBlock,
  ResourceBlock,
  type QuizResult,
} from '../components/blocks';
import type {
  GraphDefinition,
  Block,
  UserJourneyRun,
  UserBlockState,
  Facts,
  ReadBlockContent,
  VideoBlockContent,
  ImageBlockContent,
  QuizBlockContent,
  MissionBlockContent,
  FormBlockContent,
  AIHelpBlockContent,
  CheckpointBlockContent,
  AnimationBlockContent,
  CodeBlockContent,
  ExerciseBlockContent,
  ResourceBlockContent,
} from '../types/database';
import { ChevronLeft, Loader2, Trophy, RotateCcw, Home, Star, Sparkles, Clock, Target, AlertCircle } from 'lucide-react';

interface JourneyRunnerProps {
  journeyVersionId: string;
  userId: string;
  graph: GraphDefinition;
  onComplete: (nextModuleInfo?: { versionId: string; moduleTitle: string }) => void;
  onExit: () => void;
  // Optional: can be passed directly if already loaded
  trackDirection?: 'rtl' | 'ltr';
  trackLanguage?: string;
  // Optional: for multi-module progression
  trackIdProp?: string;
  currentModuleIdProp?: string;
}

interface QuizContext {
  wrongQuestions?: {
    prompt: string;
    userAnswer: string;
    correctAnswer: string;
    explanation?: string;
  }[];
  weakTopics?: string[];
}

export function JourneyRunner({
  journeyVersionId,
  userId,
  graph,
  onComplete,
  onExit,
  trackDirection: initialDirection,
  trackLanguage: initialLanguage,
  trackIdProp,
  currentModuleIdProp,
}: JourneyRunnerProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [run, setRun] = useState<UserJourneyRun | null>(null);
  const [currentBlock, setCurrentBlock] = useState<Block | null>(null);
  const [blockState, setBlockState] = useState<UserBlockState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [blockStates, setBlockStates] = useState<Map<string, UserBlockState>>(new Map());
  const [quizContext, setQuizContext] = useState<QuizContext>({});
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [completionStats, setCompletionStats] = useState<{
    totalTime: number;
    blocksCompleted: number;
    averageScore: number;
  } | null>(null);
  const [nextModuleInfo, setNextModuleInfo] = useState<{ versionId: string; moduleTitle: string } | null>(null);
  const [direction, setDirection] = useState<'rtl' | 'ltr'>(initialDirection || 'ltr');
  const [primaryLanguage, setPrimaryLanguage] = useState<string>(initialLanguage || 'en');
  const [trackId, setTrackId] = useState<string | undefined>(trackIdProp);
  const [moduleId, setModuleId] = useState<string | undefined>(currentModuleIdProp);
  const blockStartTime = useRef<number>(Date.now());

  useEffect(() => {
    initializeRun();
    loadTrackSettings();
  }, []);

  const loadTrackSettings = async () => {
    try {
      // Get the track associated with this journey version
      const { data: journeyVersion } = await supabase
        .from('journey_versions')
        .select('module_id')
        .eq('id', journeyVersionId)
        .single();

      if (!journeyVersion) return;

      // Store module ID for glossary
      setModuleId(journeyVersion.module_id);

      const { data: module } = await supabase
        .from('modules')
        .select('track_id')
        .eq('id', journeyVersion.module_id)
        .single();

      if (!module) return;

      // Store track ID for glossary
      setTrackId(module.track_id);

      // If direction was passed in, skip loading track settings
      if (initialDirection) return;

      const { data: track } = await supabase
        .from('tracks')
        .select('direction, primary_language')
        .eq('id', module.track_id)
        .single();

      if (track) {
        setDirection(track.direction || 'ltr');
        setPrimaryLanguage(track.primary_language || 'en');
      }
    } catch (error) {
      console.error('Error loading track settings:', error);
    }
  };

  const initializeRun = async () => {
    setIsLoading(true);
    setInitError(null);

    try {
      const { data: existingRun, error: fetchError } = await supabase
        .from('user_journey_runs')
        .select('*')
        .eq('user_id', userId)
        .eq('journey_version_id', journeyVersionId)
        .neq('status', 'completed')
        .neq('status', 'abandoned')
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to fetch existing run:', fetchError);
        throw new Error(t('journey.error.failed'));
      }

      let journeyRun = existingRun;

      if (!journeyRun) {
        const { data: newRun, error } = await supabase
          .from('user_journey_runs')
          .insert({
            user_id: userId,
            journey_version_id: journeyVersionId,
            current_block_id: graph.startBlockId,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create journey run:', error);
          throw new Error(t('journey.error.failed'));
        }

        journeyRun = newRun;
      }

      setRun(journeyRun);

      const { data: existingBlockStates, error: statesError } = await supabase
        .from('user_block_states')
        .select('*')
        .eq('run_id', journeyRun.id);

      if (statesError) {
        console.error('Failed to load block states:', statesError);
        // Non-critical error, continue without existing states
      }

      if (existingBlockStates) {
        const statesMap = new Map<string, UserBlockState>();
        existingBlockStates.forEach((state) => {
          statesMap.set(state.block_id, state);
        });
        setBlockStates(statesMap);
      }

      const startBlockId = journeyRun.current_block_id || graph.startBlockId;
      await navigateToBlock(startBlockId, journeyRun.id);
    } catch (error) {
      console.error('Journey initialization error:', error);
      const message = error instanceof Error ? error.message : 'Failed to initialize journey';
      setInitError(message);
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToBlock = async (blockId: string, runId: string) => {
    const block = graph.blocks.find((b) => b.id === blockId);
    if (!block) {
      console.error('Block not found:', blockId);
      return;
    }

    setCurrentBlock(block);
    blockStartTime.current = Date.now();

    await supabase
      .from('user_journey_runs')
      .update({ current_block_id: blockId })
      .eq('id', runId);

    let state = blockStates.get(blockId);

    if (!state) {
      // First, check if a block state already exists in the database
      const { data: existingState, error: fetchError } = await supabase
        .from('user_block_states')
        .select('*')
        .eq('run_id', runId)
        .eq('block_id', blockId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching block state:', fetchError);
      }

      if (existingState) {
        // Found existing state in database, use it and update local state
        state = existingState;
        setBlockStates((prev) => new Map(prev).set(blockId, existingState));
      } else {
        // No existing state found, create a new one
        const { data: newState, error } = await supabase
          .from('user_block_states')
          .insert({
            run_id: runId,
            block_id: blockId,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && newState) {
          state = newState;
          setBlockStates((prev) => new Map(prev).set(blockId, newState));
        }
      }
    }

    // Update status to 'in_progress' if it's 'not_started'
    if (state && state.status === 'not_started') {
      const { data: updatedState } = await supabase
        .from('user_block_states')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', state.id)
        .select()
        .single();

      if (updatedState) {
        state = updatedState;
        setBlockStates((prev) => new Map(prev).set(blockId, updatedState));
      }
    }

    setBlockState(state || null);
  };

  const completeBlock = useCallback(
    async (output?: Record<string, unknown>, score?: number, weakTopics?: string[]) => {
      if (!currentBlock || !run || !blockState) return;

      const timeSpent = Math.floor((Date.now() - blockStartTime.current) / 1000);

      const { data: updatedState } = await supabase
        .from('user_block_states')
        .update({
          status: 'completed',
          output_json: output || {},
          score: score ?? null,
          weak_topics: weakTopics || [],
          time_spent_seconds: (blockState.time_spent_seconds || 0) + timeSpent,
          completed_at: new Date().toISOString(),
          attempts_count: (blockState.attempts_count || 0) + 1,
        })
        .eq('id', blockState.id)
        .select()
        .single();

      if (updatedState) {
        setBlockStates((prev) => new Map(prev).set(currentBlock.id, updatedState));
      }

      const facts = buildFactsFromBlockState(
        {
          score,
          weak_topics: weakTopics,
          attempts_count: (blockState.attempts_count || 0) + 1,
          time_spent_seconds: (blockState.time_spent_seconds || 0) + timeSpent,
          status: 'completed',
          output_json: output,
        },
        currentBlock.type === 'quiz' ? (currentBlock.content as QuizBlockContent) : undefined
      );

      const nextBlockId = findNextBlock(currentBlock.id, graph.edges, facts);

      if (nextBlockId) {
        await navigateToBlock(nextBlockId, run.id);
      } else {
        // No next block in current module - mark module as completed
        await supabase
          .from('user_journey_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', run.id);

        const allStates = Array.from(blockStates.values());
        if (updatedState) {
          allStates.push(updatedState);
        }

        const totalTime = allStates.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
        const scores = allStates.filter(s => s.score !== null).map(s => s.score as number);
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        setCompletionStats({
          totalTime,
          blocksCompleted: allStates.filter(s => s.status === 'completed').length,
          averageScore: Math.round(averageScore),
        });

        // Check if there's a next module in the track
        const nextModule = await checkForNextModule();
        setNextModuleInfo(nextModule);
        
        setShowCompletionScreen(true);
      }
    },
    [currentBlock, run, blockState, graph.edges, blockStates]
  );

  const handleQuizComplete = useCallback(
    async (result: QuizResult) => {
      if (!currentBlock) return;

      const quizContent = currentBlock.content as QuizBlockContent;

      if (!result.passed) {
        const wrongQuestions = quizContent.questions
          .filter((q) => result.answers[q.id] !== q.correctIndex)
          .map((q) => ({
            prompt: q.prompt,
            userAnswer: q.choices[result.answers[q.id]] || 'No answer',
            correctAnswer: q.choices[q.correctIndex],
            explanation: q.explanation,
          }));

        setQuizContext({
          wrongQuestions,
          weakTopics: result.weakTopics,
        });
      } else {
        setQuizContext({});
      }

      await completeBlock(
        { answers: result.answers, passed: result.passed },
        result.score,
        result.weakTopics
      );
    },
    [currentBlock, completeBlock]
  );

  const handleCheckpointComplete = useCallback(
    async (passed: boolean) => {
      await completeBlock({ passed }, passed ? 100 : 0);
    },
    [completeBlock]
  );

  const checkForNextModule = async (): Promise<{ versionId: string; moduleTitle: string } | null> => {
    if (!trackId || !moduleId) return null;
    
    try {
      // Get current module's order_index
      const { data: currentModule } = await supabase
        .from('modules')
        .select('order_index')
        .eq('id', moduleId)
        .single();
      
      if (!currentModule) return null;
      
      // Find next module in sequence
      const { data: nextModule } = await supabase
        .from('modules')
        .select('id, title, journey_versions(id, status)')
        .eq('track_id', trackId)
        .eq('order_index', currentModule.order_index + 1)
        .maybeSingle();
      
      if (!nextModule) return null;
      
      const publishedVersion = (nextModule.journey_versions as any[])?.find(
        (v: any) => v.status === 'published'
      );
      
      return publishedVersion ? {
        versionId: publishedVersion.id,
        moduleTitle: nextModule.title,
      } : null;
    } catch (error) {
      console.error('Error checking for next module:', error);
      return null;
    }
  };

  const handleRestartJourney = async () => {
    if (!run) return;

    try {
      const { error: deleteError } = await supabase
        .from('user_block_states')
        .delete()
        .eq('run_id', run.id);

      if (deleteError) {
        console.error('Failed to clear block states:', deleteError);
        throw new Error('Failed to reset progress');
      }

      const { error: updateError } = await supabase
        .from('user_journey_runs')
        .update({
          status: 'in_progress',
          current_block_id: graph.startBlockId,
          completed_at: null,
        })
        .eq('id', run.id);

      if (updateError) {
        console.error('Failed to reset journey run:', updateError);
        throw new Error('Failed to restart journey');
      }

      setBlockStates(new Map());
      setShowCompletionScreen(false);
      setCompletionStats(null);
      showToast('success', t('journey.completion.restart'));
      await navigateToBlock(graph.startBlockId, run.id);
    } catch (error) {
      console.error('Restart journey error:', error);
      showToast('error', t('journey.error.failed'));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const renderBlock = () => {
    if (!currentBlock || !blockState) return null;

    const isCompleted = blockState.status === 'completed';

    switch (currentBlock.type) {
      case 'read':
        return (
          <ReadBlock
            content={currentBlock.content as ReadBlockContent}
            onComplete={() => completeBlock()}
            isCompleted={isCompleted}
            trackId={trackId}
            moduleId={moduleId}
          />
        );

      case 'video':
        return (
          <VideoBlock
            content={currentBlock.content as VideoBlockContent}
            onComplete={() => completeBlock()}
            isCompleted={isCompleted}
          />
        );

      case 'image':
        return (
          <ImageBlock
            content={currentBlock.content as ImageBlockContent}
            onComplete={() => completeBlock()}
            isCompleted={isCompleted}
          />
        );

      case 'quiz':
        return (
          <QuizBlock
            content={currentBlock.content as QuizBlockContent}
            onComplete={handleQuizComplete}
            previousAttempt={
              blockState.output_json?.answers
                ? {
                    score: blockState.score || 0,
                    correctCount: Math.round(
                      ((blockState.score || 0) / 100) *
                        (currentBlock.content as QuizBlockContent).questions.length
                    ),
                    totalCount: (currentBlock.content as QuizBlockContent).questions.length,
                    answers: blockState.output_json.answers as Record<string, number>,
                    weakTopics: blockState.weak_topics || [],
                    passed: (blockState.score || 0) >= ((currentBlock.content as QuizBlockContent).passingScore ?? 50),
                  }
                : undefined
            }
          />
        );

      case 'mission':
        return (
          <MissionBlock
            content={currentBlock.content as MissionBlockContent}
            onComplete={(data) => completeBlock(data)}
            previousOutput={blockState.output_json as { completedSteps: string[] } | undefined}
          />
        );

      case 'form':
        return (
          <FormBlock
            content={currentBlock.content as FormBlockContent}
            onComplete={(data) => completeBlock(data)}
            previousOutput={blockState.output_json}
          />
        );

      case 'ai_help':
        return (
          <AIHelpBlock
            content={currentBlock.content as AIHelpBlockContent}
            weakTopics={quizContext.weakTopics}
            wrongQuestions={quizContext.wrongQuestions}
            onComplete={(data) => completeBlock(data)}
          />
        );

      case 'checkpoint':
        const checkpointFacts: Facts = buildFactsFromBlockState(blockState);
        return (
          <CheckpointBlock
            content={currentBlock.content as CheckpointBlockContent}
            facts={checkpointFacts}
            onComplete={handleCheckpointComplete}
          />
        );

      case 'animation':
        return (
          <AnimationBlock
            content={currentBlock.content as AnimationBlockContent}
            onComplete={() => completeBlock()}
            isCompleted={isCompleted}
          />
        );

      case 'code':
        return (
          <CodeBlock
            content={currentBlock.content as CodeBlockContent}
            onComplete={() => completeBlock()}
            isCompleted={isCompleted}
          />
        );

      case 'exercise':
        return (
          <ExerciseBlock
            content={currentBlock.content as ExerciseBlockContent}
            onComplete={(data) => completeBlock(data)}
            previousOutput={blockState.output_json as { userSolution: string; hintsViewed: number; solutionViewed: boolean } | undefined}
          />
        );

      case 'resource':
        return (
          <ResourceBlock
            content={currentBlock.content as ResourceBlockContent}
            onComplete={(data) => completeBlock(data)}
            previousOutput={blockState.output_json as { viewedResources: string[] } | undefined}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Unknown block type: {currentBlock.type}</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{t('journey.loading')}</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-error/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('journey.error.title')}</h2>
          <p className="text-slate-600 mb-6">{initError}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => initializeRun()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              {t('journey.error.tryAgain')}
            </button>
            <button
              onClick={onExit}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              <Home className="w-5 h-5" />
              {t('journey.error.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCompletionScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {t('journey.completion.title')}
          </h1>
          <p className="text-slate-600 mb-8">
            {t('journey.completion.congratulations')}
          </p>

          {completionStats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 mx-auto mb-2 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{completionStats.blocksCompleted}</div>
                <div className="text-xs text-slate-500">{t('journey.completion.stats.blocksCompleted')}</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 mx-auto mb-2 bg-warning/20 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-warning" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{completionStats.averageScore}%</div>
                <div className="text-xs text-slate-500">{t('journey.completion.stats.averageScore')}</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 mx-auto mb-2 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatTime(completionStats.totalTime)}</div>
                <div className="text-xs text-slate-500">{t('journey.completion.stats.timeSpent')}</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {nextModuleInfo ? (
              <>
                <button
                  onClick={() => onComplete(nextModuleInfo)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  {t('journey.completion.continueToNext', { module: nextModuleInfo.moduleTitle })}
                </button>
                
                <button
                  onClick={() => onComplete()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  {t('journey.completion.backToDashboard')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onComplete()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  {t('journey.completion.backToDashboard')}
                </button>

                <button
                  onClick={handleRestartJourney}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t('journey.completion.restart')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const completedCount = Array.from(blockStates.values()).filter(
    (s) => s.status === 'completed'
  ).length;
  const progress = (completedCount / graph.blocks.length) * 100;

  const isRTL = direction === 'rtl';

  return (
    <RTLProvider direction={direction} primaryLanguage={primaryLanguage}>
      <div className="flex flex-col h-screen bg-slate-100">
        <header className={`bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onExit}
            className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="font-medium">{t('journey.exit')}</span>
          </button>

          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-primary-600 transition-all duration-300 ${isRTL ? 'mr-auto' : ''}`}
                style={{ width: `${progress}%`, marginLeft: isRTL ? 'auto' : undefined, marginRight: isRTL ? '0' : undefined }}
              />
            </div>
            <span className="text-sm text-slate-500 font-medium">
              {completedCount} / {graph.blocks.length}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">{renderBlock()}</main>
      </div>
    </RTLProvider>
  );
}
