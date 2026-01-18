import { useState, useRef, useEffect } from 'react';
import { Loader2, BookOpen } from 'lucide-react';

interface GlossaryTermProps {
  term: string;
  contextSnippet: string;
  trackId?: string;
  moduleId?: string;
}

interface PopupPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom';
}

export function GlossaryTerm({ term, contextSnippet, trackId, moduleId }: GlossaryTermProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const termRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && termRef.current) {
      const rect = termRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const popupHeight = 150;

      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < popupHeight && rect.top > popupHeight;

      setPosition({
        top: showAbove ? rect.top - popupHeight - 8 : rect.bottom + 8,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 280)),
        arrowPosition: showAbove ? 'bottom' : 'top',
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        termRef.current &&
        !termRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [isOpen]);

  const fetchExplanation = async () => {
    if (explanation) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/glossary-explain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            term,
            contextSnippet,
            trackId,
            moduleId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch explanation');
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      setError('تعذر تحميل الشرح');
      console.error('Glossary fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && !explanation) {
      fetchExplanation();
    }
  };

  return (
    <>
      <span
        ref={termRef}
        className="english-term"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {term}
      </span>

      {isOpen && position && (
        <div
          ref={popupRef}
          className="glossary-popup fixed"
          style={{
            top: position.top,
            left: position.left,
            width: '260px',
          }}
          role="dialog"
          aria-label={`شرح ${term}`}
        >
          <div
            className="glossary-popup-arrow"
            style={{
              [position.arrowPosition === 'top' ? 'top' : 'bottom']: '-6px',
              left: '20px',
              transform: position.arrowPosition === 'top' ? 'rotate(45deg)' : 'rotate(225deg)',
            }}
          />

          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="font-english text-blue-300 font-medium">{term}</span>
          </div>

          <div className="arabic-content text-sm">
            {loading && (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

            {explanation && !loading && (
              <p className="text-slate-200 leading-relaxed">{explanation}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
