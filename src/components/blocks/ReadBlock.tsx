import { useEffect, useState } from 'react';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import type { ReadBlockContent } from '../../types/database';

interface ReadBlockProps {
  content: ReadBlockContent;
  onComplete: () => void;
  isCompleted: boolean;
}

export function ReadBlock({ content, onComplete, isCompleted }: ReadBlockProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  useEffect(() => {
    const scrollContainer = document.getElementById('read-content-scroll');
    if (!scrollContainer) return;

    const checkContentFit = () => {
      if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
        setHasScrolledToEnd(true);
        setScrollProgress(100);
      }
    };

    const handleScroll = () => {
      const scrollableHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      if (scrollableHeight <= 0) {
        setHasScrolledToEnd(true);
        setScrollProgress(100);
        return;
      }
      const scrollPercent = (scrollContainer.scrollTop / scrollableHeight) * 100;
      setScrollProgress(Math.min(100, scrollPercent));

      if (scrollPercent >= 90) {
        setHasScrolledToEnd(true);
      }
    };

    checkContentFit();
    scrollContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkContentFit);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkContentFit);
    };
  }, [content.markdown]);

  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono">
              <code>{codeContent}</code>
            </pre>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLanguage = line.slice(3);
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += (codeContent ? '\n' : '') + line;
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-lg font-semibold text-slate-800 mt-6 mb-3">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-xl font-bold text-slate-900 mt-8 mb-4">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-2xl font-bold text-slate-900 mt-8 mb-4">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="text-slate-700 ml-4 mb-2 list-disc">
            {renderInlineMarkdown(line.slice(2))}
          </li>
        );
      } else if (line.match(/^\d+\. /)) {
        const text = line.replace(/^\d+\. /, '');
        elements.push(
          <li key={index} className="text-slate-700 ml-4 mb-2 list-decimal">
            {renderInlineMarkdown(text)}
          </li>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={index} className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-slate-700 italic">
            {renderInlineMarkdown(line.slice(2))}
          </blockquote>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={index} className="h-4" />);
      } else {
        elements.push(
          <p key={index} className="text-slate-700 leading-relaxed mb-4">
            {renderInlineMarkdown(line)}
          </p>
        );
      }
    });

    return elements;
  };

  const renderInlineMarkdown = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/\*(.+?)\*/);
      const codeMatch = remaining.match(/`(.+?)`/);
      const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);

      const matches = [
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
        linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const first = matches[0]!;

      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }

      switch (first.type) {
        case 'bold':
          parts.push(<strong key={keyIndex++} className="font-semibold text-slate-900">{first.match![1]}</strong>);
          remaining = remaining.slice(first.index + first.match![0].length);
          break;
        case 'italic':
          parts.push(<em key={keyIndex++} className="italic">{first.match![1]}</em>);
          remaining = remaining.slice(first.index + first.match![0].length);
          break;
        case 'code':
          parts.push(
            <code key={keyIndex++} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800">
              {first.match![1]}
            </code>
          );
          remaining = remaining.slice(first.index + first.match![0].length);
          break;
        case 'link':
          parts.push(
            <a
              key={keyIndex++}
              href={first.match![2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {first.match![1]}
            </a>
          );
          remaining = remaining.slice(first.index + first.match![0].length);
          break;
      }
    }

    return parts;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
            {content.estimatedReadTime && (
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>{content.estimatedReadTime} min read</span>
              </div>
            )}
          </div>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      <div
        id="read-content-scroll"
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="max-w-3xl mx-auto">
          {renderMarkdown(content.markdown)}
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
        <button
          onClick={onComplete}
          disabled={!hasScrolledToEnd && !isCompleted}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
            ${hasScrolledToEnd || isCompleted
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {isCompleted ? 'Continue' : hasScrolledToEnd ? 'Mark as Complete' : 'Scroll to continue'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
