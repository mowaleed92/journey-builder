import { Clock, BookOpen, ChevronRight, Play, CheckCircle } from 'lucide-react';

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

export function TrackCard({
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
  const levelColors = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-rose-100 text-rose-700',
  };

  const isCompleted = progress === 100;
  const isStarted = progress > 0 && progress < 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-10 h-10 text-white/80" />
            </div>
          </div>
        )}

        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${levelColors[level]}`}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
        </div>

        {isCompleted && (
          <div className="absolute top-4 right-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{description}</p>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{estimatedDuration} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>{moduleCount} {moduleCount === 1 ? 'module' : 'modules'}</span>
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={disabled}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            disabled
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {disabled ? (
            'Not Available'
          ) : isCompleted ? (
            <>
              Review
              <ChevronRight className="w-5 h-5" />
            </>
          ) : isStarted ? (
            <>
              Continue
              <Play className="w-5 h-5" />
            </>
          ) : (
            <>
              Start Learning
              <Play className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
