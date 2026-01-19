import { Loader2, Trash2, CheckSquare, Square } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  itemName?: string;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onSelectNone,
  onDelete,
  isDeleting = false,
  itemName = 'items',
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-white">
          {selectedCount} of {totalCount} {itemName} selected
        </span>
        
        <div className="flex items-center gap-2">
          {selectedCount < totalCount ? (
            <button
              onClick={onSelectAll}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              Select All
            </button>
          ) : null}
          
          <button
            onClick={onSelectNone}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            <Square className="w-4 h-4" />
            Clear Selection
          </button>
        </div>
      </div>

      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedCount})
          </>
        )}
      </button>
    </div>
  );
}
