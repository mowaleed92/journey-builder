import { useState } from 'react';
import { Code, Copy, Check, ChevronRight } from 'lucide-react';
import type { CodeBlockContent } from '../../types/database';

interface CodeBlockProps {
  content: CodeBlockContent;
  onComplete: () => void;
  isCompleted?: boolean;
}

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: 'bg-yellow-500',
  typescript: 'bg-blue-500',
  python: 'bg-green-500',
  java: 'bg-orange-500',
  csharp: 'bg-purple-500',
  cpp: 'bg-pink-500',
  c: 'bg-gray-500',
  ruby: 'bg-red-500',
  go: 'bg-cyan-500',
  rust: 'bg-orange-600',
  php: 'bg-indigo-500',
  swift: 'bg-orange-400',
  kotlin: 'bg-purple-400',
  sql: 'bg-blue-400',
  html: 'bg-orange-500',
  css: 'bg-blue-500',
  json: 'bg-gray-400',
  bash: 'bg-green-600',
  shell: 'bg-green-600',
  markdown: 'bg-slate-500',
};

export function CodeBlock({ content, onComplete, isCompleted }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const showLineNumbers = content.showLineNumbers ?? true;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const lines = content.code.split('\n');
  const highlightLines = new Set(content.highlightLines || []);
  const languageColor = LANGUAGE_COLORS[content.language.toLowerCase()] || 'bg-slate-500';

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <Code className="w-5 h-5 text-slate-200" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 ${languageColor} text-white text-xs font-medium rounded`}>
                {content.language}
              </span>
              {content.description && (
                <span className="text-sm text-slate-500">{content.description}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl overflow-hidden bg-slate-900 shadow-lg">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-slate-400 ml-2">{content.language}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Code content */}
            <div className="overflow-x-auto">
              <pre className="p-4 text-sm">
                <code>
                  {lines.map((line, index) => {
                    const lineNumber = index + 1;
                    const isHighlighted = highlightLines.has(lineNumber);

                    return (
                      <div
                        key={index}
                        className={`flex ${isHighlighted ? 'bg-yellow-500/10 -mx-4 px-4' : ''}`}
                      >
                        {showLineNumbers && (
                          <span className="select-none text-slate-500 text-right pr-4 min-w-[3rem]">
                            {lineNumber}
                          </span>
                        )}
                        <span className={`flex-1 ${isHighlighted ? 'text-yellow-200' : 'text-slate-100'}`}>
                          {line || ' '}
                        </span>
                      </div>
                    );
                  })}
                </code>
              </pre>
            </div>
          </div>

          {content.description && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-slate-700 text-sm">{content.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button
            onClick={onComplete}
            disabled={isCompleted}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isCompleted ? 'Completed' : 'Continue'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
