import { useState, useEffect } from 'react';
import { Flag, CheckCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../contexts';
import type { CheckpointBlockContent, Facts } from '../../types/database';

interface CheckpointBlockProps {
  content: CheckpointBlockContent;
  facts: Facts;
  onComplete: (passed: boolean) => void;
  allowRetry?: boolean;
}

export function CheckpointBlock({ content, facts, onComplete, allowRetry = true }: CheckpointBlockProps) {
  const { t } = useTranslation();
  const [evaluation, setEvaluation] = useState<{
    passed: boolean;
    score?: number;
    message: string;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(true);

  useEffect(() => {
    evaluateCheckpoint();
  }, []);

  const evaluateCheckpoint = () => {
    setIsEvaluating(true);

    setTimeout(() => {
      const score = facts['quiz.scorePercent'] as number | undefined;
      const attemptsCount = facts['block.attemptsCount'] as number | undefined;
      const weakTopics = facts['quiz.weakTopics'] as string[] | undefined;

      let passed = true;
      let message = t('blocks.checkpoint.messages.greatProgress');

      if (score !== undefined) {
        if (score >= 70) {
          passed = true;
          message = t('blocks.checkpoint.messages.excellentWork', { score });
        } else if (score >= 50) {
          passed = true;
          message = t('blocks.checkpoint.messages.goodJob', { score });
        } else {
          passed = false;
          message = t('blocks.checkpoint.messages.needsReview', { score });
        }
      }

      if (!passed && attemptsCount && attemptsCount >= 3) {
        message = t('blocks.checkpoint.messages.multipleAttempts', { attempts: attemptsCount });
      }

      if (!passed && weakTopics && weakTopics.length > 0) {
        message += ' ' + t('blocks.checkpoint.messages.focusOn', { topics: weakTopics.join('، ') });
      }

      setEvaluation({ passed, score, message });
      setIsEvaluating(false);
    }, 1500);
  };

  const handleContinue = () => {
    if (evaluation) {
      onComplete(evaluation.passed);
    }
  };

  const handleRetry = () => {
    onComplete(false);
  };

  if (isEvaluating) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
            <Flag className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('blocks.checkpoint.evaluating')}</h2>
          <p className="text-slate-500">{t('blocks.checkpoint.checkingUnderstanding')}</p>

          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div
            className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              evaluation.passed ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {evaluation.passed ? (
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-amber-600" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">{content.title}</h2>

          {content.description && (
            <p className="text-slate-500 mb-4">{content.description}</p>
          )}

          <div
            className={`p-6 rounded-xl mb-6 ${
              evaluation.passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
            }`}
          >
            {evaluation.score !== undefined && (
              <div className="mb-4">
                <div
                  className={`text-4xl font-bold ${
                    evaluation.passed ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {evaluation.score}%
                </div>
                <div className="text-sm text-slate-500 mt-1">{t('blocks.checkpoint.yourScore')}</div>
              </div>
            )}

            <p
              className={`${evaluation.passed ? 'text-emerald-800' : 'text-amber-800'}`}
            >
              {evaluation.message}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                evaluation.passed
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {evaluation.passed ? t('blocks.checkpoint.continue') : t('blocks.checkpoint.getHelp')}
              <ArrowRight className="w-5 h-5" />
            </button>

            {!evaluation.passed && allowRetry && (
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                {t('blocks.checkpoint.tryAgain')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
