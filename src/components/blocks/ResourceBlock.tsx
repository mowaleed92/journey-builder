import { useState } from 'react';
import {
  FolderOpen,
  ChevronRight,
  ExternalLink,
  Download,
  FileText,
  Video,
  Link as LinkIcon,
  File,
  CheckCircle,
} from 'lucide-react';
import type { ResourceBlockContent, ResourceItem } from '../../types/database';
import { useTranslation } from '../../contexts';

interface ResourceBlockProps {
  content: ResourceBlockContent;
  onComplete: (data: { viewedResources: string[] }) => void;
  previousOutput?: { viewedResources: string[] };
}

const RESOURCE_ICONS: Record<ResourceItem['type'], React.ElementType> = {
  link: LinkIcon,
  download: Download,
  video: Video,
  document: FileText,
};

const RESOURCE_COLORS: Record<ResourceItem['type'], { bg: string; icon: string; hover: string }> = {
  link: { bg: 'bg-blue-100', icon: 'text-blue-600', hover: 'hover:bg-blue-50' },
  download: { bg: 'bg-emerald-100', icon: 'text-emerald-600', hover: 'hover:bg-emerald-50' },
  video: { bg: 'bg-rose-100', icon: 'text-rose-600', hover: 'hover:bg-rose-50' },
  document: { bg: 'bg-amber-100', icon: 'text-amber-600', hover: 'hover:bg-amber-50' },
};

export function ResourceBlock({ content, onComplete, previousOutput }: ResourceBlockProps) {
  const { t } = useTranslation();
  const [viewedResources, setViewedResources] = useState<Set<string>>(
    new Set(previousOutput?.viewedResources || [])
  );

  const handleResourceClick = (resource: ResourceItem) => {
    setViewedResources((prev) => new Set([...prev, resource.id]));
    
    // Open the resource
    if (resource.type === 'download') {
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = resource.url;
      link.download = resource.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleComplete = () => {
    onComplete({ viewedResources: Array.from(viewedResources) });
  };

  const viewedCount = viewedResources.size;
  const totalCount = content.resources.length;
  const progress = totalCount > 0 ? (viewedCount / totalCount) * 100 : 0;
  const remainingCount = totalCount - viewedCount;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
            {content.description && (
              <p className="text-sm text-slate-500">{content.description}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-slate-500">
            {t('blocks.resource.viewedProgress', { viewed: viewedCount, total: totalCount })}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {content.resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <File className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500">{t('blocks.resource.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {content.resources.map((resource) => {
                const Icon = RESOURCE_ICONS[resource.type] || File;
                const colors = RESOURCE_COLORS[resource.type] || RESOURCE_COLORS.link;
                const isViewed = viewedResources.has(resource.id);

                return (
                  <button
                    key={resource.id}
                    onClick={() => handleResourceClick(resource)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${
                      isViewed
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : `border-slate-200 ${colors.hover}`
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isViewed ? 'bg-emerald-100' : colors.bg
                      }`}
                    >
                      {isViewed ? (
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 truncate">
                          {resource.title}
                        </h3>
                        {resource.type === 'download' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                          {t('blocks.resource.download')}
                          </span>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{resource.url}</span>
                      </div>
                    </div>

                    <ExternalLink
                      className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                        isViewed ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="text-sm text-slate-500">
            {viewedCount === totalCount
              ? t('blocks.resource.allViewed')
              : remainingCount === 1
              ? t('blocks.resource.remainingSingle')
              : t('blocks.resource.remainingMultiple', { count: remainingCount })}
          </div>
          <button
            onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {t('blocks.continue')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
