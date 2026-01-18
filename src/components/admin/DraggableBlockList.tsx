import { useState, useRef, useCallback } from 'react';
import {
  GripVertical,
  BookOpen,
  Video,
  HelpCircle,
  Target,
  MessageSquare,
  CheckCircle,
  Sparkles,
  PlayCircle,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from 'lucide-react';

interface Block {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

interface Edge {
  from: string;
  to: string;
  condition?: unknown;
  priority?: number;
}

interface DraggableBlockListProps {
  blocks: Block[];
  edges: Edge[];
  startBlockId: string;
  onReorder: (blocks: Block[], edges: Edge[]) => void;
  onEditBlock: (block: Block) => void;
  onDeleteBlock: (blockId: string) => void;
  onSetStart: (blockId: string) => void;
}

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  read: <BookOpen className="w-5 h-5 text-blue-400" />,
  video: <Video className="w-5 h-5 text-rose-400" />,
  quiz: <HelpCircle className="w-5 h-5 text-purple-400" />,
  mission: <Target className="w-5 h-5 text-orange-400" />,
  form: <MessageSquare className="w-5 h-5 text-cyan-400" />,
  checkpoint: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  ai_help: <Sparkles className="w-5 h-5 text-amber-400" />,
  animation: <PlayCircle className="w-5 h-5 text-pink-400" />,
};

const BLOCK_LABELS: Record<string, string> = {
  read: 'قراءة',
  video: 'فيديو',
  quiz: 'اختبار',
  mission: 'مهمة',
  form: 'نموذج',
  checkpoint: 'نقطة تفتيش',
  ai_help: 'مساعد ذكي',
  animation: 'رسوم متحركة',
};

export function DraggableBlockList({
  blocks,
  edges,
  startBlockId,
  onReorder,
  onEditBlock,
  onDeleteBlock,
  onSetStart,
}: DraggableBlockListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());

    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '0.5';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(dropIndex, 0, draggedBlock);

    const newEdges = generateSequentialEdges(newBlocks, edges);

    onReorder(newBlocks, newEdges);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, blocks, edges, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggedIndex === null) return;

    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const dropTarget = elements.find(el => el.hasAttribute('data-block-index'));

    if (dropTarget) {
      const targetIndex = parseInt(dropTarget.getAttribute('data-block-index') || '-1');
      if (targetIndex !== -1 && targetIndex !== draggedIndex) {
        setDragOverIndex(targetIndex);
      }
    }
  }, [draggedIndex]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newBlocks = [...blocks];
      const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
      newBlocks.splice(dragOverIndex, 0, draggedBlock);

      const newEdges = generateSequentialEdges(newBlocks, edges);

      onReorder(newBlocks, newEdges);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, blocks, edges, onReorder]);

  const generateSequentialEdges = (orderedBlocks: Block[], existingEdges: Edge[]): Edge[] => {
    const conditionalEdges = existingEdges.filter(edge => edge.condition);

    const newEdges: Edge[] = [];

    for (let i = 0; i < orderedBlocks.length - 1; i++) {
      const currentBlock = orderedBlocks[i];
      const nextBlock = orderedBlocks[i + 1];

      const hasConditionalEdge = conditionalEdges.some(
        edge => edge.from === currentBlock.id
      );

      if (!hasConditionalEdge) {
        newEdges.push({
          from: currentBlock.id,
          to: nextBlock.id,
        });
      }
    }

    return [...newEdges, ...conditionalEdges];
  };

  const toggleExpand = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const getBlockEdges = (blockId: string) => {
    return edges.filter(edge => edge.from === blockId);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];

    const newEdges = generateSequentialEdges(newBlocks, edges);
    onReorder(newBlocks, newEdges);
  };

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const content = block.content as { title?: string };
        const isStart = startBlockId === block.id;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;
        const isExpanded = expandedBlocks.has(block.id);
        const blockEdges = getBlockEdges(block.id);
        const hasConditionalEdges = blockEdges.some(e => e.condition);

        return (
          <div
            key={block.id}
            ref={isDragging ? dragNodeRef : null}
            data-block-index={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
              bg-slate-800 rounded-xl border transition-all
              ${isDragging ? 'dragging border-blue-500' : 'border-slate-700'}
              ${isDragOver ? 'border-blue-500 border-dashed bg-blue-500/10' : ''}
            `}
          >
            <div className="flex items-center gap-3 p-4">
              <div className="drag-handle p-1 text-slate-500 hover:text-slate-300 touch-manipulation">
                <GripVertical className="w-5 h-5" />
              </div>

              <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                {BLOCK_ICONS[block.type] || <BookOpen className="w-5 h-5 text-slate-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">
                    {content?.title || BLOCK_LABELS[block.type] || block.type}
                  </span>
                  {isStart && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex-shrink-0">
                      البداية
                    </span>
                  )}
                  {hasConditionalEdges && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full flex-shrink-0 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      تفرع
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {BLOCK_LABELS[block.type] || block.type}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveBlock(index, 'up')}
                  disabled={index === 0}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="نقل للأعلى"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <button
                  onClick={() => moveBlock(index, 'down')}
                  disabled={index === blocks.length - 1}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="نقل للأسفل"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleExpand(block.id)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="تفاصيل"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => onEditBlock(block)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDeleteBlock(block.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-700 mt-2 pt-4">
                <div className="space-y-3">
                  {!isStart && (
                    <button
                      onClick={() => onSetStart(block.id)}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      تعيين كنقطة بداية
                    </button>
                  )}

                  {blockEdges.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">الاتصالات:</div>
                      <div className="space-y-1">
                        {blockEdges.map((edge, i) => {
                          const targetBlock = blocks.find(b => b.id === edge.to);
                          const targetContent = targetBlock?.content as { title?: string };

                          return (
                            <div
                              key={i}
                              className="text-sm text-slate-400 flex items-center gap-2"
                            >
                              <span className="text-slate-600">→</span>
                              <span>{targetContent?.title || edge.to}</span>
                              {edge.condition && (
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                                  شرطي
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {blocks.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          لا توجد كتل. أضف كتلة للبدء.
        </div>
      )}
    </div>
  );
}
