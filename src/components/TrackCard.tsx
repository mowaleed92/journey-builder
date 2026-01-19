import { memo } from 'react';
import { Clock, BookOpen, ChevronRight, Play, CheckCircle } from 'lucide-react';
import { useTranslation } from '../contexts';

interface TrackCardProps {
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  moduleCount: number;
  coverImage?: string;
  progress?: number;
  onStart: () => void;
  disabled?: boolean;
}

export const TrackCard = memo(function TrackCard({
  title,
  description,
  level,
  estimatedDuration,
  moduleCount,
  coverImage,
  progress = 0,
  onStart,
  disabled = false,
}: TrackCardProps) {
  const { t } = useTranslation();
  
  const levelColors = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-rose-100 text-rose-700',
  };

  const isCompleted = progress === 100;
  const isStarted = progress > 0 && progress < 100;

  const buttonLabel = disabled 
    ? t('track.notAvailable')
    : isCompleted 
      ? `${t('track.review')}: ${title}` 
      : isStarted 
        ? `${t('track.continue')}: ${title}` 
        : `${t('track.startLearning')}: ${title}`;

  return (
    <article 
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
      aria-labelledby={`track-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            className="w-full h-full object-cover opacity-80"
            aria-hidden="true"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-10 h-10 text-white/80" />
            </div>
          </div>
        )}

        {progress > 0 && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-1 bg-black/30"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress: ${progress}%`}
          >
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${levelColors[level]}`}>
            {t(`track.levels.${level}`)}
          </span>
        </div>

        {isCompleted && (
          <div className="absolute top-4 right-4" aria-label="Completed">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 
          id={`track-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors"
        >
          {title}
        </h3>
        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{description}</p>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4" aria-label="Track details">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{estimatedDuration} {t('track.min')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>{moduleCount} {moduleCount === 1 ? t('track.module') : t('track.modules')}</span>
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={disabled}
          aria-label={buttonLabel}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            disabled
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {disabled ? (
            t('track.notAvailable')
          ) : isCompleted ? (
            <>
              {t('track.review')}
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </>
          ) : isStarted ? (
            <>
              {t('track.continue')}
              <Play className="w-5 h-5" aria-hidden="true" />
            </>
          ) : (
            <>
              {t('track.startLearning')}
              <Play className="w-5 h-5" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </article>
  );
});
