import { useState } from 'react';
import { Target, ExternalLink, CheckCircle, Circle, ChevronRight, Upload } from 'lucide-react';
import type { MissionBlockContent, MissionStep } from '../../types/database';

interface MissionBlockProps {
  content: MissionBlockContent;
  onComplete: (data: { completedSteps: string[] }) => void;
  previousOutput?: { completedSteps: string[] };
}

export function MissionBlock({ content, onComplete, previousOutput }: MissionBlockProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(previousOutput?.completedSteps || [])
  );
  const [screenshotUploaded, setScreenshotUploaded] = useState(false);

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
    onComplete({ completedSteps: Array.from(completedSteps) });
  };

  const renderVerificationUI = (step: MissionStep) => {
    switch (step.verificationMethod) {
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
              className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6 hover:bg-blue-100 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-blue-900">Open external resource</div>
                <div className="text-sm text-blue-600 truncate">{content.externalUrl}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
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
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-500'
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
              ? 'bg-blue-600 text-white hover:bg-blue-700'
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
