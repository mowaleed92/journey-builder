import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import { useAIEnabled } from '../../hooks/useAIEnabled';
import { useTranslation } from '../../contexts';
import type { AIHelpBlockContent } from '../../types/database';

interface AIHelpBlockProps {
  content: AIHelpBlockContent;
  weakTopics?: string[];
  wrongQuestions?: { prompt: string; userAnswer: string; correctAnswer: string; explanation?: string }[];
  onComplete: (data: { conversationHistory: Message[] }) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIHelpBlock({ content, weakTopics, wrongQuestions, onComplete }: AIHelpBlockProps) {
  const { t } = useTranslation();
  const { enabled: aiEnabled, helpModel, isLoading: aiSettingsLoading } = useAIEnabled();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasCompletedMinTurns, setHasCompletedMinTurns] = useState(false);
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const maxTurns = content.maxTurns ?? 5;
  const minTurnsRequired = 2;
  const userTurns = messages.filter((m) => m.role === 'user').length;

  useEffect(() => {
    if (userTurns >= minTurnsRequired) {
      setHasCompletedMinTurns(true);
    }
  }, [userTurns]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Only generate initial message when AI settings have loaded
    if (!aiSettingsLoading) {
      generateInitialMessage();
    }
  }, [aiSettingsLoading]);

  // Update aiModel when settings load from hook
  useEffect(() => {
    if (!aiSettingsLoading && helpModel) {
      setAiModel(helpModel);
    }
  }, [aiSettingsLoading, helpModel]);

  const generateInitialMessage = async () => {
    setIsLoading(true);

    let contextMessage = '';

    if (content.mode === 'targeted_remediation' && wrongQuestions && wrongQuestions.length > 0) {
      contextMessage = `لاحظت أنك واجهت صعوبة في بعض الأسئلة. دعني أساعدك في شرح المفاهيم:\n\n`;

      wrongQuestions.slice(0, 3).forEach((q, i) => {
        contextMessage += `**السؤال ${i + 1}:** ${q.prompt}\n`;
        contextMessage += `إجابتك: ${q.userAnswer}\n`;
        contextMessage += `الإجابة الصحيحة: ${q.correctAnswer}\n`;
        if (q.explanation) {
          contextMessage += `${q.explanation}\n`;
        }
        contextMessage += '\n';
      });

      if (weakTopics && weakTopics.length > 0) {
        contextMessage += `\nالمواضيع الرئيسية التي يجب مراجعتها: **${weakTopics.join('، ')}**\n\n`;
      }

      contextMessage += `هل تريد مني شرح أي من هذه المفاهيم بمزيد من التفصيل؟ لا تتردد في طرح الأسئلة!`;
    } else if (content.mode === 'guided_explanation') {
      contextMessage = `أنا هنا لمساعدتك في فهم هذه المادة. ماذا تريد مني أن أشرح لك؟ يمكنك السؤال عن مفاهيم محددة أو طلب أمثلة.`;
    } else {
      contextMessage = `مرحباً! أنا مساعدك الذكي للتعلم. أنا هنا لمساعدتك على فهم المادة بشكل أفضل. ما هي أسئلتك؟`;
    }

    const assistantMessage: Message = {
      role: 'assistant',
      content: contextMessage,
    };

    setMessages([assistantMessage]);
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || userTurns >= maxTurns) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-help`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            mode: content.mode,
            weakTopics,
            wrongQuestions,
            model: aiModel,
            language: 'ar', // Request Arabic responses from AI
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content:
          'أعتذر، ولكنني أواجه مشكلة في الاتصال الآن. يرجى المحاولة مرة أخرى أو المتابعة عندما تكون جاهزاً.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleComplete = () => {
    onComplete({ conversationHistory: messages });
  };

  // Loading state
  if (aiSettingsLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-900 items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-400 mt-4">{t('blocks.aiHelp.loadingAssistant')}</p>
      </div>
    );
  }

  // AI disabled state - allow user to skip this block
  if (!aiEnabled) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="border-b border-slate-700 px-6 py-4 bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{content.title}</h2>
              <p className="text-sm text-slate-400">{t('blocks.aiHelp.aiPowered')}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('blocks.aiHelp.unavailable')}</h3>
            <p className="text-slate-400 mb-6">
              {t('blocks.aiHelp.unavailableMessage')}
            </p>
            <button
              onClick={() => onComplete({ conversationHistory: [] })}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors mx-auto"
            >
              {t('blocks.aiHelp.continue')}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="border-b border-slate-700 px-6 py-4 bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{content.title}</h2>
            <p className="text-sm text-slate-400">
              {content.mode === 'targeted_remediation'
                ? t('blocks.aiHelp.personalizedHelp')
                : content.mode === 'guided_explanation'
                ? t('blocks.aiHelp.guidedLearning')
                : t('blocks.aiHelp.askAnything')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                  message.role === 'assistant'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-400'
                    : 'bg-slate-600'
                }`}
              >
                {message.role === 'assistant' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>

              <div
                className={`flex-1 max-w-[80%] rounded-2xl px-5 py-4 ${
                  message.role === 'assistant'
                    ? 'bg-slate-800 text-slate-100'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <div className="text-sm max-w-none">
                  {message.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <p key={i} className="font-semibold text-white mb-2">
                          {line.slice(2, -2)}
                        </p>
                      );
                    }
                    if (line.includes('**')) {
                      const parts = line.split(/\*\*(.+?)\*\*/g);
                      return (
                        <p key={i} className="mb-2">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? (
                              <strong key={j} className="text-white">
                                {part}
                              </strong>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      );
                    }
                    return line ? (
                      <p key={i} className="mb-2">
                        {line}
                      </p>
                    ) : (
                      <br key={i} />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-slate-800 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  <span className="text-slate-400 text-sm">{t('blocks.aiHelp.thinking')}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-700 px-6 py-4 bg-slate-800">
        <div className="max-w-3xl mx-auto">
          {userTurns < maxTurns ? (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    userTurns === 0
                      ? t('blocks.aiHelp.askQuestion')
                      : t('blocks.aiHelp.continueConversation')
                  }
                  rows={1}
                  className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 mb-4">
              <p className="text-slate-400 text-sm">
                {t('blocks.aiHelp.reachedLimit')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {userTurns} / {maxTurns} {t('blocks.aiHelp.messages')}
              {!hasCompletedMinTurns && (
                <span className="mx-2 text-amber-400">
                  ({t('blocks.aiHelp.askMoreToontinue', { count: minTurnsRequired - userTurns })})
                </span>
              )}
            </div>

            <button
              onClick={handleComplete}
              disabled={!hasCompletedMinTurns}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                hasCompletedMinTurns
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {t('blocks.aiHelp.continue')}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
