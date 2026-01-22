import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, Clapperboard } from 'lucide-react';
import { useTranslation } from '../../contexts';
import type { AnimationBlockContent } from '../../types/database';

interface AnimationBlockProps {
  content: AnimationBlockContent;
  onComplete: () => void;
  isCompleted: boolean;
}

export function AnimationBlock({ content, onComplete, isCompleted }: AnimationBlockProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(content.autoplay ?? true);
  const [hasWatched, setHasWatched] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (!content.loop) {
              setIsPlaying(false);
              setHasWatched(true);
            }
            return content.loop ? 0 : 100;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isPlaying, content.loop]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  const renderAnimation = () => {
    switch (content.animationType) {
      case 'lottie':
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <div className="w-48 h-48 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-3xl flex items-center justify-center animate-pulse">
                <Clapperboard className="w-20 h-20 text-white" />
              </div>
              <p className="text-slate-500 text-sm">
                {t('blocks.animation.lottieLabel', { url: content.url })}
              </p>
            </div>
          </div>
        );

      case 'video':
        return (
          <video
            className="w-full h-full object-contain bg-black"
            src={content.url}
            autoPlay={content.autoplay}
            loop={content.loop}
            muted
            playsInline
            onEnded={() => setHasWatched(true)}
          />
        );

      case 'interactive':
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="text-center text-white">
              <div
                className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-blue-400 flex items-center justify-center"
                style={{
                  background: `conic-gradient(from 0deg, #3b82f6 ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`,
                }}
              >
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="text-2xl font-bold">{Math.round(progress)}%</span>
                </div>
              </div>
              <p className="text-slate-300">{t('blocks.animation.interactiveLabel')}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="border-b border-slate-700 px-6 py-4 bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{content.title}</h2>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {renderAnimation()}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && progress === 0 && content.animationType !== 'video' && (
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl pointer-events-auto hover:bg-white transition-colors"
            >
              <Play className="w-10 h-10 text-slate-900 ml-1" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-800 border-t border-slate-700">
        {content.animationType !== 'video' && (
          <div className="px-6 py-3 border-b border-slate-700">
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={restart}
                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-4">
          <button
            onClick={onComplete}
            disabled={!hasWatched && !isCompleted && content.animationType !== 'interactive'}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              hasWatched || isCompleted || content.animationType === 'interactive'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isCompleted ? t('blocks.continue') : t('blocks.markComplete')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
