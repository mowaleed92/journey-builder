import { useState } from 'react';
import { Dumbbell, ChevronRight, Eye, EyeOff, Lightbulb, CheckCircle } from 'lucide-react';
import { useTranslation } from '../../contexts';
import type { ExerciseBlockContent } from '../../types/database';

interface ExerciseBlockProps {
  content: ExerciseBlockContent;
  onComplete: (data: { userSolution: string; hintsViewed: number; solutionViewed: boolean }) => void;
  previousOutput?: { userSolution: string; hintsViewed: number; solutionViewed: boolean };
}

export function ExerciseBlock({ content, onComplete, previousOutput }: ExerciseBlockProps) {
  const { t } = useTranslation();
  const [userSolution, setUserSolution] = useState(previousOutput?.userSolution || '');
  const [showSolution, setShowSolution] = useState(previousOutput?.solutionViewed || false);
  const [hintsViewed, setHintsViewed] = useState(previousOutput?.hintsViewed || 0);
  const [showHints, setShowHints] = useState(false);

  const hints = content.hints || [];

  const handleShowNextHint = () => {
    if (hintsViewed < hints.length) {
      setHintsViewed(hintsViewed + 1);
      setShowHints(true);
    }
  };

  const handleToggleSolution = () => {
    setShowSolution(!showSolution);
  };

  const handleComplete = () => {
    onComplete({
      userSolution,
      hintsViewed,
      solutionViewed: showSolution,
    });
  };

  const canComplete = userSolution.trim().length > 0 || showSolution;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
            {content.description && (
              <p className="text-sm text-slate-500">{content.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Problem Statement */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-6">
            <h3 className="font-semibold text-violet-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-200 flex items-center justify-center text-xs font-bold text-violet-700">
                ?
              </span>
              {t('blocks.exercise.problem')}
            </h3>
            <div className="text-violet-800 whitespace-pre-wrap">{content.problem}</div>
          </div>

          {/* Your Solution */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('blocks.exercise.yourSolution')}
            </label>
            <textarea
              value={userSolution}
              onChange={(e) => setUserSolution(e.target.value)}
              rows={8}
              placeholder={t('blocks.exercise.placeholder')}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none font-mono text-sm"
            />
          </div>

          {/* Hints Section */}
          {hints.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-900">
                    {t('blocks.exercise.hints')} ({hintsViewed} / {hints.length})
                  </span>
                </div>
                {hintsViewed < hints.length && (
                  <button
                    onClick={handleShowNextHint}
                    className="px-3 py-1.5 text-sm bg-amber-200 text-amber-800 rounded-lg hover:bg-amber-300 transition-colors font-medium"
                  >
                    {t('blocks.exercise.showHint')}
                  </button>
                )}
              </div>

              {showHints && hintsViewed > 0 && (
                <div className="space-y-2">
                  {hints.slice(0, hintsViewed).map((hint, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 bg-white/50 rounded-lg"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-amber-700">
                        {index + 1}
                      </span>
                      <p className="text-amber-800 text-sm">{hint}</p>
                    </div>
                  ))}
                </div>
              )}

              {hintsViewed > 0 && (
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="mt-2 text-sm text-amber-700 hover:text-amber-900"
                >
                  {showHints ? t('blocks.exercise.hideHints') : t('blocks.exercise.showHints')}
                </button>
              )}
            </div>
          )}

          {/* Solution Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={handleToggleSolution}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-slate-900">{t('blocks.exercise.solution')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {showSolution ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    {t('blocks.exercise.hide')}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    {t('blocks.exercise.show')}
                  </>
                )}
              </div>
            </button>

            {showSolution && (
              <div className="p-4 border-t border-slate-200">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                  <pre className="whitespace-pre-wrap text-emerald-800 font-mono text-sm">
                    {content.solution}
                  </pre>
                </div>

                {content.solutionExplanation && (
                  <div className="mt-4">
                    <h4 className="font-medium text-slate-900 mb-2">{t('blocks.exercise.explanation')}</h4>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">
                      {content.solutionExplanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="text-sm text-slate-500">
            {userSolution.trim()
              ? t('blocks.exercise.solutionWritten')
              : showSolution
              ? t('blocks.exercise.solutionViewed')
              : t('blocks.exercise.writeOrView')}
          </div>
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              canComplete
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {t('blocks.continue')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
