import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { findNextBlock, buildFactsFromBlockState } from './conditions';
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
  QuizBlockContent,
  MissionBlockContent,
  FormBlockContent,
  AIHelpBlockContent,
  CheckpointBlockContent,
  AnimationBlockContent,
} from '../types/database';
import { ChevronLeft, Loader2, Trophy, RotateCcw, Home, Star, Sparkles, Clock, Target } from 'lucide-react';

interface JourneyRunnerProps {
  journeyVersionId: string;
  userId: string;
  graph: GraphDefinition;
  onComplete: () => void;
  onExit: () => void;
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

interface ImageBlockContent {
  title: string;
  url: string;
  caption?: string;
  alt?: string;
}

export function JourneyRunner({
  journeyVersionId,
  userId,
  graph,
  onComplete,
  onExit,
}: JourneyRunnerProps) {
  const [run, setRun] = useState<UserJourneyRun | null>(null);
  const [currentBlock, setCurrentBlock] = useState<Block | null>(null);
  const [blockState, setBlockState] = useState<UserBlockState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockStates, setBlockStates] = useState<Map<string, UserBlockState>>(new Map());
  const [quizContext, setQuizContext] = useState<QuizContext>({});
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [completionStats, setCompletionStats] = useState<{
    totalTime: number;
    blocksCompleted: number;
    averageScore: number;
  } | null>(null);
  const blockStartTime = useRef<number>(Date.now());

  useEffect(() => {
    initializeRun();
  }, []);

  const initializeRun = async () => {
    setIsLoading(true);

    const { data: existingRun } = await supabase
      .from('user_journey_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('journey_version_id', journeyVersionId)
      .neq('status', 'completed')
      .neq('status', 'abandoned')
      .maybeSingle();

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
        setIsLoading(false);
        return;
      }

      journeyRun = newRun;
    }

    setRun(journeyRun);

    const { data: existingBlockStates } = await supabase
      .from('user_block_states')
      .select('*')
      .eq('run_id', journeyRun.id);

    if (existingBlockStates) {
      const statesMap = new Map<string, UserBlockState>();
      existingBlockStates.forEach((state) => {
        statesMap.set(state.block_id, state);
      });
      setBlockStates(statesMap);
    }

    const startBlockId = journeyRun.current_block_id || graph.startBlockId;
    await navigateToBlock(startBlockId, journeyRun.id);

    setIsLoading(false);
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
    } else if (state.status === 'not_started') {
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

  const handleRestartJourney = async () => {
    if (!run) return;

    await supabase
      .from('user_block_states')
      .delete()
      .eq('run_id', run.id);

    await supabase
      .from('user_journey_runs')
      .update({
        status: 'in_progress',
        current_block_id: graph.startBlockId,
        completed_at: null,
      })
      .eq('id', run.id);

    setBlockStates(new Map());
    setShowCompletionScreen(false);
    setCompletionStats(null);
    await navigateToBlock(graph.startBlockId, run.id);
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
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your journey...</p>
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
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Journey Complete!
          </h1>
          <p className="text-slate-600 mb-8">
            Congratulations! You've successfully completed this learning journey.
          </p>

          {completionStats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{completionStats.blocksCompleted}</div>
                <div className="text-xs text-slate-500">Blocks Completed</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 mx-auto mb-2 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{completionStats.averageScore}%</div>
                <div className="text-xs text-slate-500">Average Score</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 mx-auto mb-2 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatTime(completionStats.totalTime)}</div>
                <div className="text-xs text-slate-500">Time Spent</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={onComplete}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5" />
              Back to Dashboard
            </button>

            <button
              onClick={handleRestartJourney}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Restart Journey
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = Array.from(blockStates.values()).filter(
    (s) => s.status === 'completed'
  ).length;
  const progress = (completedCount / graph.blocks.length) * 100;

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Exit</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-slate-500 font-medium">
            {completedCount} / {graph.blocks.length}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{renderBlock()}</main>
    </div>
  );
}
