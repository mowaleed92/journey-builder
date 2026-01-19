import { useState } from 'react';
import { Target, ExternalLink, CheckCircle, Circle, ChevronRight, Upload, Loader2, XCircle, RotateCcw, Send } from 'lucide-react';
import { useTranslation } from '../../contexts';
import type { MissionBlockContent, MissionStep } from '../../types/database';

interface MissionBlockProps {
  content: MissionBlockContent;
  onComplete: (data: MissionOutputData) => void;
  previousOutput?: MissionOutputData;
}

interface MissionOutputData {
  completedSteps: string[];
  validationHistory?: Record<string, ValidationAttempt[]>;
}

interface ValidationAttempt {
  answer: string;
  correct: boolean;
  feedback: string;
  score: number;
  timestamp: string;
}

interface ValidationResult {
  correct: boolean;
  feedback: string;
  score: number;
}

export function MissionBlock({ content, onComplete, previousOutput }: MissionBlockProps) {
  const { t } = useTranslation();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(previousOutput?.completedSteps || [])
  );
  const [screenshotUploaded, setScreenshotUploaded] = useState(false);
  const [stepInputs, setStepInputs] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult | null>>({});
  const [validationHistory, setValidationHistory] = useState<Record<string, ValidationAttempt[]>>(
    previousOutput?.validationHistory || {}
  );

  const allStepsCompleted = content.steps.every((step) => completedSteps.has(step.id));

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const handleComplete = () => {
    onComplete({ 
      completedSteps: Array.from(completedSteps),
      validationHistory
    });
  };

  const handleInputChange = (stepId: string, value: string) => {
    setStepInputs((prev) => ({ ...prev, [stepId]: value }));
    // Clear any previous validation result when user types
    setValidationResults((prev) => ({ ...prev, [stepId]: null }));
  };

  const handleAIValidation = async (step: MissionStep) => {
    const userAnswer = stepInputs[step.id]?.trim();
    if (!userAnswer) return;

    setValidating(step.id);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mission-validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            question: step.instruction,
            userAnswer,
            expectedCriteria: step.expectedCriteria || 'The answer should demonstrate understanding of the concept.',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result: ValidationResult = await response.json();

      // Store validation result
      setValidationResults((prev) => ({ ...prev, [step.id]: result }));

      // Add to history
      const attempt: ValidationAttempt = {
        answer: userAnswer,
        correct: result.correct,
        feedback: result.feedback,
        score: result.score,
        timestamp: new Date().toISOString(),
      };

      setValidationHistory((prev) => ({
        ...prev,
        [step.id]: [...(prev[step.id] || []), attempt],
      }));

      // If correct, mark step as completed
      if (result.correct) {
        setCompletedSteps((prev) => new Set([...prev, step.id]));
      }
    } catch (error) {
      console.error('AI validation error:', error);
      setValidationResults((prev) => ({
        ...prev,
        [step.id]: {
          correct: false,
          feedback: 'Unable to validate your answer. Please try again.',
          score: 0,
        },
      }));
    } finally {
      setValidating(null);
    }
  };

  const handleRetry = (stepId: string) => {
    setValidationResults((prev) => ({ ...prev, [stepId]: null }));
    setStepInputs((prev) => ({ ...prev, [stepId]: '' }));
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
  };

  const renderVerificationUI = (step: MissionStep) => {
    const isCompleted = completedSteps.has(step.id);
    const isValidating = validating === step.id;
    const result = validationResults[step.id];
    const attempts = validationHistory[step.id]?.length || 0;

    switch (step.verificationMethod) {
      case 'ai_validate':
        return (
          <div className="mt-3 space-y-3">
            {/* Input field */}
            {!isCompleted && (
              <>
                {step.inputType === 'textarea' ? (
                  <textarea
                    value={stepInputs[step.id] || ''}
                    onChange={(e) => handleInputChange(step.id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={4}
                    disabled={isValidating}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                ) : (
                  <input
                    type="text"
                    value={stepInputs[step.id] || ''}
                    onChange={(e) => handleInputChange(step.id, e.target.value)}
                    placeholder="Type your answer here..."
                    disabled={isValidating}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                  />
                )}

                <button
                  onClick={() => handleAIValidation(step)}
                  disabled={isValidating || !stepInputs[step.id]?.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Answer
                    </>
                  )}
                </button>
              </>
            )}

            {/* Validation result */}
            {result && (
              <div
                className={`p-4 rounded-lg ${
                  result.correct
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-error/10 border border-error/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.correct ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-medium ${
                          result.correct ? 'text-success' : 'text-error'
                        }`}
                      >
                        {result.correct ? 'Correct!' : 'Not quite right'}
                      </span>
                      <span
                        className={`text-sm px-2 py-0.5 rounded ${
                          result.correct
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        Score: {result.score}%
                      </span>
                    </div>
                    <p
                      className={`text-sm ${
                        result.correct ? 'text-success' : 'text-error'
                      }`}
                    >
                      {result.feedback}
                    </p>

                    {!result.correct && (
                      <button
                        onClick={() => handleRetry(step.id)}
                        className="mt-3 flex items-center gap-1 text-sm text-error hover:text-error/80 font-medium"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Attempt counter */}
            {attempts > 0 && (
              <div className="text-xs text-slate-500">
                {attempts} attempt{attempts !== 1 ? 's' : ''} made
              </div>
            )}
          </div>
        );

      case 'screenshot':
        return (
          <div className="mt-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-sm text-slate-600 transition-colors w-fit">
              <Upload className="w-4 h-4" />
              {screenshotUploaded ? 'Screenshot uploaded' : 'Upload screenshot'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={() => {
                  setScreenshotUploaded(true);
                  toggleStep(step.id);
                }}
              />
            </label>
          </div>
        );

      case 'url_check':
        return (
          <div className="mt-2">
            <input
              type="url"
              placeholder="Paste URL here..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => {
                if (e.target.value) {
                  toggleStep(step.id);
                }
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-orange-600" />
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
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-orange-900 mb-2">Your Mission</h3>
            <p className="text-orange-800">
              Complete the following steps to proceed. This is a hands-on activity that will help reinforce your learning.
            </p>
          </div>

          {content.externalUrl && (
            <a
              href={content.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-primary-50 border border-primary-200 rounded-xl mb-6 hover:bg-primary-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-primary-900">Open external resource</div>
                <div className="text-sm text-primary-600 truncate">{content.externalUrl}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary-400 group-hover:translate-x-1 transition-transform" />
            </a>
          )}

          <div className="space-y-4">
            {content.steps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);

              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isCompleted
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => {
                        if (step.verificationMethod === 'self_report' || !step.verificationMethod) {
                          toggleStep(step.id);
                        }
                      }}
                      disabled={step.verificationMethod === 'ai_validate'}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-500'
                          : step.verificationMethod === 'ai_validate'
                          ? 'border-slate-200 bg-slate-50 cursor-default'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <Circle className="w-4 h-4 text-transparent" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-500">
                          Step {index + 1}
                        </span>
                        {step.verificationMethod === 'ai_validate' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                            AI Validated
                          </span>
                        )}
                      </div>
                      <p
                        className={`font-medium mt-1 ${
                          isCompleted ? 'text-emerald-800' : 'text-slate-900'
                        }`}
                      >
                        {step.instruction}
                      </p>
                      {renderVerificationUI(step)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {content.completionMessage && allStepsCompleted && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-emerald-800 font-medium">
                {content.completionMessage}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">
            {completedSteps.size} of {content.steps.length} steps completed
          </span>
          <span
            className={`text-sm font-medium ${
              allStepsCompleted ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            {allStepsCompleted ? 'Ready to continue!' : 'Complete all steps'}
          </span>
        </div>

        <button
          onClick={handleComplete}
          disabled={!allStepsCompleted}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            allStepsCompleted
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
