import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
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
    generateInitialMessage();
  }, []);

  useEffect(() => {
    const loadModelSetting = async () => {
      try {
        const { createClient } = await import('../../lib/supabase');
        const supabase = createClient();

        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'ai_help_model')
          .maybeSingle();

        if (!error && data) {
          setAiModel(data.setting_value);
        }
      } catch (err) {
        console.error('Error loading AI help model setting:', err);
      }
    };

    loadModelSetting();
  }, []);

  const generateInitialMessage = async () => {
    setIsLoading(true);

    let contextMessage = '';

    if (content.mode === 'targeted_remediation' && wrongQuestions && wrongQuestions.length > 0) {
      contextMessage = `I noticed you had trouble with some questions. Let me help explain the concepts:\n\n`;

      wrongQuestions.slice(0, 3).forEach((q, i) => {
        contextMessage += `**Question ${i + 1}:** ${q.prompt}\n`;
        contextMessage += `Your answer: ${q.userAnswer}\n`;
        contextMessage += `Correct answer: ${q.correctAnswer}\n`;
        if (q.explanation) {
          contextMessage += `${q.explanation}\n`;
        }
        contextMessage += '\n';
      });

      if (weakTopics && weakTopics.length > 0) {
        contextMessage += `\nThe main topics we should review: **${weakTopics.join(', ')}**\n\n`;
      }

      contextMessage += `Would you like me to explain any of these concepts in more detail? Feel free to ask questions!`;
    } else if (content.mode === 'guided_explanation') {
      contextMessage = `I'm here to help guide you through this material. What would you like me to explain? You can ask about specific concepts or request examples.`;
    } else {
      contextMessage = `Hi! I'm your AI learning assistant. I'm here to help you understand the material better. What questions do you have?`;
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
          "I apologize, but I'm having trouble connecting right now. Let me provide a brief explanation based on what we've discussed. Please try asking again or continue when ready.",
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
                ? 'Personalized help based on your quiz results'
                : content.mode === 'guided_explanation'
                ? 'Interactive guided learning'
                : 'Ask me anything about the material'}
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
                  <span className="text-slate-400 text-sm">Thinking...</span>
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
                      ? 'Ask a question about the concepts...'
                      : 'Continue the conversation...'
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
                You've reached the conversation limit. Click continue to proceed.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {userTurns} / {maxTurns} messages
              {!hasCompletedMinTurns && (
                <span className="ml-2 text-amber-400">
                  (ask at least {minTurnsRequired - userTurns} more to continue)
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
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
