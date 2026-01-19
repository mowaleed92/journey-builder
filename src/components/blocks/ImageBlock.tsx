import { useState } from 'react';
import { Image, ZoomIn, ZoomOut, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from '../../contexts';

interface ImageBlockContent {
  title: string;
  url: string;
  caption?: string;
  alt?: string;
}

interface ImageBlockProps {
  content: ImageBlockContent;
  onComplete: () => void;
  isCompleted?: boolean;
}

export function ImageBlock({ content, onComplete, isCompleted }: ImageBlockProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-slate-900">{content.title}</h2>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {content.url ? (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              )}

              {hasError ? (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-100 rounded-xl">
                  <Image className="w-12 h-12 text-slate-400 mb-4" />
                  <p className="text-slate-500">Failed to load image</p>
                </div>
              ) : (
                <div className="relative group">
                  <img
                    src={content.url}
                    alt={content.alt || content.title}
                    className={`w-full rounded-xl shadow-lg transition-transform cursor-pointer ${
                      isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    onClick={() => setIsZoomed(!isZoomed)}
                  />

                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isZoomed ? (
                      <ZoomOut className="w-5 h-5" />
                    ) : (
                      <ZoomIn className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}

              {content.caption && (
                <p className="mt-4 text-center text-slate-600 italic">
                  {content.caption}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-100 rounded-xl">
              <Image className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-500">No image set</p>
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
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isCompleted ? t('blocks.complete') : t('blocks.continue')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
