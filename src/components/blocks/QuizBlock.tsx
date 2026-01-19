import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle, XCircle, ChevronRight, RotateCcw, Award } from 'lucide-react';
import { useTranslation } from '../../contexts';
import type { QuizBlockContent, QuizQuestion } from '../../types/database';

interface QuizBlockProps {
  content: QuizBlockContent;
  onComplete: (result: QuizResult) => void;
  previousAttempt?: QuizResult;
}

export interface QuizResult {
  score: number;
  correctCount: number;
  totalCount: number;
  answers: Record<string, number>;
  weakTopics: string[];
  passed: boolean;
}

export function QuizBlock({ content, onComplete, previousAttempt }: QuizBlockProps) {
  const { t } = useTranslation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    let q = [...content.questions];
    if (content.shuffleQuestions) {
      q = q.sort(() => Math.random() - 0.5);
    }
    setQuestions(q);
  }, [content.questions, content.shuffleQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const passingScore = content.passingScore ?? 50;
  const hasAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;
  const isCorrect = currentQuestion && answers[currentQuestion.id] === currentQuestion.correctIndex;

  const getChoices = () => {
    if (!currentQuestion) return [];
    if (content.shuffleChoices) {
      const indexed = currentQuestion.choices.map((c, i) => ({ choice: c, originalIndex: i }));
      return indexed.sort(() => Math.random() - 0.5);
    }
    return currentQuestion.choices.map((c, i) => ({ choice: c, originalIndex: i }));
  };

  const [shuffledChoices] = useState<{ choice: string; originalIndex: number }[]>([]);
  const choices = content.shuffleChoices ? shuffledChoices : currentQuestion?.choices.map((c, i) => ({ choice: c, originalIndex: i })) || [];

  useEffect(() => {
    if (currentQuestion && content.shuffleChoices) {
      const indexed = currentQuestion.choices.map((c, i) => ({ choice: c, originalIndex: i }));
      shuffledChoices.length = 0;
      shuffledChoices.push(...indexed.sort(() => Math.random() - 0.5));
    }
  }, [currentQuestionIndex, currentQuestion, content.shuffleChoices]);

  const handleAnswer = (originalIndex: number) => {
    if (hasAnswered) return;
    setAnswers({ ...answers, [currentQuestion.id]: originalIndex });
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateResult();
    }
  };

  const calculateResult = () => {
    let correctCount = 0;
    const weakTopicsSet = new Set<string>();

    questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        correctCount++;
      } else {
        q.tags.forEach((tag) => weakTopicsSet.add(tag));
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const quizResult: QuizResult = {
      score,
      correctCount,
      totalCount: questions.length,
      answers,
      weakTopics: Array.from(weakTopicsSet),
      passed: score >= passingScore,
    };

    setResult(quizResult);
    setShowResult(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResult(false);
    setShowExplanation(false);
    setResult(null);
    if (content.shuffleQuestions) {
      setQuestions([...content.questions].sort(() => Math.random() - 0.5));
    }
  };

  const handleContinue = () => {
    if (result) {
      onComplete(result);
    }
  };

  if (showResult && result) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div
              className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                result.passed ? 'bg-success/20' : 'bg-warning/20'
              }`}
            >
              {result.passed ? (
                <Award className="w-12 h-12 text-emerald-600" />
              ) : (
                <HelpCircle className="w-12 h-12 text-warning" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {result.passed ? t('blocks.quiz.result.passed') : t('blocks.quiz.result.failed')}
            </h2>

            <p className="text-slate-600 mb-6">
              {result.passed
                ? t('blocks.quiz.result.passedMessage')
                : t('blocks.quiz.result.failedMessage')}
            </p>

            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <div className="text-5xl font-bold text-slate-900 mb-2">
                {result.score}%
              </div>
              <div className="text-slate-500">
                {result.correctCount} {t('blocks.quiz.of')} {result.totalCount} {t('blocks.quiz.result.correct')}
              </div>
              <div className="mt-4 h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.passed ? 'bg-success' : 'bg-warning'
                  }`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {t('blocks.quiz.result.yourScore')}: {passingScore}%
              </div>
            </div>

            {result.weakTopics.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  Topics to review:
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {result.weakTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-warning/20 text-warning rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {content.allowRetry !== false && !result.passed && (
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t('blocks.quiz.retry')}
                </button>
              )}
              <button
                onClick={handleContinue}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  result.passed
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-warning text-white hover:bg-warning/90'
                }`}
              >
                {result.passed ? t('blocks.continue') : t('blocks.aiHelp.askForHelp')}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{content.title}</h2>
              {content.description && (
                <p className="text-sm text-slate-500">{content.description}</p>
              )}
            </div>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {t('blocks.quiz.question')} {currentQuestionIndex + 1} {t('blocks.quiz.of')} {questions.length}
          </div>
        </div>

        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentQuestionIndex
                  ? answers[questions[i].id] === questions[i].correctIndex
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                  : i === currentQuestionIndex
                  ? 'bg-blue-500'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-slate-900 mb-6">
            {currentQuestion.prompt}
          </h3>

          <div className="space-y-3">
            {(content.shuffleChoices ? getChoices() : currentQuestion.choices.map((c, i) => ({ choice: c, originalIndex: i }))).map(
              ({ choice, originalIndex }) => {
                const isSelected = answers[currentQuestion.id] === originalIndex;
                const isCorrectAnswer = originalIndex === currentQuestion.correctIndex;
                const showCorrectness = hasAnswered;

                let bgColor = 'bg-white hover:bg-slate-50 border-slate-200';
                let textColor = 'text-slate-700';
                let icon = null;

                if (showCorrectness) {
                  if (isCorrectAnswer) {
                    bgColor = 'bg-emerald-50 border-emerald-500';
                    textColor = 'text-emerald-900';
                    icon = <CheckCircle className="w-6 h-6 text-emerald-600" />;
                  } else if (isSelected && !isCorrectAnswer) {
                    bgColor = 'bg-error/10 border-error';
                    textColor = 'text-red-900';
                    icon = <XCircle className="w-6 h-6 text-red-600" />;
                  }
                } else if (isSelected) {
                  bgColor = 'bg-blue-50 border-blue-500';
                  textColor = 'text-blue-900';
                }

                return (
                  <button
                    key={originalIndex}
                    onClick={() => handleAnswer(originalIndex)}
                    disabled={hasAnswered}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${bgColor} ${
                      hasAnswered ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium ${
                        showCorrectness
                          ? isCorrectAnswer
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : isSelected
                            ? 'border-red-500 bg-red-500 text-white'
                            : 'border-slate-300 text-slate-500'
                          : isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-slate-300 text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + originalIndex)}
                    </div>
                    <span className={`flex-1 text-left font-medium ${textColor}`}>
                      {choice}
                    </span>
                    {icon}
                  </button>
                );
              }
            )}
          </div>

          {showExplanation && currentQuestion.explanation && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <h4
                className={`font-medium mb-1 ${isCorrect ? 'text-emerald-800' : 'text-amber-800'}`}
              >
                {isCorrect ? t('blocks.quiz.result.correct') : t('blocks.quiz.result.incorrect')}
              </h4>
              <p className={`text-sm ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>
      </div>

      {hasAnswered && (
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {currentQuestionIndex < questions.length - 1 ? t('blocks.quiz.next') : t('blocks.submit')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
