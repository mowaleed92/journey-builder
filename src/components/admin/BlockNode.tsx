import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  BookOpen,
  Video,
  HelpCircle,
  Target,
  FileText,
  Bot,
  Flag,
  Clapperboard,
  Image,
  Code,
  Dumbbell,
  FolderOpen,
  Trash2,
  Settings2,
  Link2,
} from 'lucide-react';
import type { Block, BlockType } from '../../types/database';

export interface BlockNodeData {
  block: Block;
  isStart: boolean;
  isSelected: boolean;
  isMultiSelected: boolean;
  isConnectionTarget: boolean;
  outgoingEdgesCount: number;
  hasPassEdge: boolean;
  hasFailEdge: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStartConnection: () => void;
}

interface BlockNodeProps {
  data: BlockNodeData;
  selected?: boolean;
}

const BLOCK_TYPE_CONFIG: Record<BlockType, { icon: React.ElementType; color: string; label: string }> = {
  read: { icon: BookOpen, color: 'bg-primary-500', label: 'Read' },
  video: { icon: Video, color: 'bg-rose-500', label: 'Video' },
  image: { icon: Image, color: 'bg-emerald-500', label: 'Image' },
  quiz: { icon: HelpCircle, color: 'bg-purple-500', label: 'Quiz' },
  mission: { icon: Target, color: 'bg-orange-500', label: 'Mission' },
  form: { icon: FileText, color: 'bg-teal-500', label: 'Form' },
  ai_help: { icon: Bot, color: 'bg-cyan-500', label: 'AI Help' },
  checkpoint: { icon: Flag, color: 'bg-yellow-500', label: 'Checkpoint' },
  animation: { icon: Clapperboard, color: 'bg-pink-500', label: 'Animation' },
  code: { icon: Code, color: 'bg-slate-600', label: 'Code' },
  exercise: { icon: Dumbbell, color: 'bg-violet-500', label: 'Exercise' },
  resource: { icon: FolderOpen, color: 'bg-indigo-500', label: 'Resources' },
};

function getBlockDescription(block: Block): string {
  const content = block.content as unknown as Record<string, unknown>;

  switch (block.type) {
    case 'read':
      return `${content.estimatedReadTime || 0} min read`;
    case 'video':
      return content.url ? 'Video attached' : 'No video set';
    case 'image':
      return content.url ? 'Image attached' : 'No image set';
    case 'quiz':
      const questions = (content.questions as unknown[]) || [];
      return `${questions.length} question${questions.length !== 1 ? 's' : ''}`;
    case 'mission':
      const steps = (content.steps as unknown[]) || [];
      return `${steps.length} step${steps.length !== 1 ? 's' : ''}`;
    case 'form':
      const fields = (content.fields as unknown[]) || [];
      return `${fields.length} field${fields.length !== 1 ? 's' : ''}`;
    case 'ai_help':
      return `Mode: ${content.mode || 'remediation'}`;
    case 'checkpoint':
      return 'Progress checkpoint';
    case 'animation':
      return content.animationType as string || 'Animation';
    case 'code':
      return content.language as string || 'Code snippet';
    case 'exercise':
      const hints = (content.hints as unknown[]) || [];
      return `${hints.length} hint${hints.length !== 1 ? 's' : ''}`;
    case 'resource':
      const resources = (content.resources as unknown[]) || [];
      return `${resources.length} resource${resources.length !== 1 ? 's' : ''}`;
    default:
      return '';
  }
}

function BlockNode({ data, selected }: BlockNodeProps) {
  const { block, isStart, isMultiSelected, isConnectionTarget, hasPassEdge, hasFailEdge, onEdit, onDelete, onStartConnection } = data;
  const config = BLOCK_TYPE_CONFIG[block.type as BlockType] || { icon: BookOpen, color: 'bg-slate-600', label: 'Block' };
  const Icon = config.icon;
  const title = (block.content as { title?: string })?.title || `${config.label} Block`;
  const description = getBlockDescription(block);
  const isQuiz = block.type === 'quiz';

  return (
    <div
      className={`
        relative min-w-[240px] max-w-[300px] bg-slate-800 rounded-xl border-2 transition-all shadow-lg
        ${isMultiSelected ? 'border-blue-500 bg-slate-700' : selected ? 'border-primary-500' : 'border-slate-700 hover:border-slate-600'}
        ${isConnectionTarget ? 'ring-2 ring-primary-400 ring-dashed ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-400 hover:!bg-primary-500 hover:!border-primary-400 transition-colors"
      />

      {/* Start Badge */}
      {isStart && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-semibold rounded shadow">
          START
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{config.label}</p>
            {description && (
              <p className="text-xs text-slate-500 mt-1 truncate">{description}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-700">
          <button
            onClick={(e) => { e.stopPropagation(); onStartConnection(); }}
            className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-slate-700 rounded transition-colors"
            title="Connect to another block"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Edit block"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            title="Delete block"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Output Handle(s) */}
      {isQuiz ? (
        <>
          {/* Quiz blocks have Pass/Fail dual handles */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="pass"
            className={`!w-3 !h-3 !border-2 transition-colors ${
              hasPassEdge 
                ? '!bg-emerald-500 !border-emerald-400' 
                : '!bg-emerald-500/50 !border-emerald-400/50 hover:!bg-emerald-500 hover:!border-emerald-400'
            }`}
            style={{ left: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="fail"
            className={`!w-3 !h-3 !border-2 transition-colors ${
              hasFailEdge 
                ? '!bg-red-500 !border-red-400' 
                : '!bg-red-500/50 !border-red-400/50 hover:!bg-red-500 hover:!border-red-400'
            }`}
            style={{ left: '70%' }}
          />
          {/* Handle Labels */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-6 pointer-events-none">
            <span className="text-[10px] font-semibold text-emerald-400">Pass</span>
            <span className="text-[10px] font-semibold text-red-400">Fail</span>
          </div>
        </>
      ) : (
        /* Standard single handle for non-quiz blocks */
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-400 hover:!bg-primary-500 hover:!border-primary-400 transition-colors"
        />
      )}
    </div>
  );
}

export default memo(BlockNode);
