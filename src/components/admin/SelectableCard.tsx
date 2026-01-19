import { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface SelectableCardProps {
  isSelected: boolean;
  onToggleSelect: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SelectableCard({
  isSelected,
  onToggleSelect,
  children,
  className = '',
  disabled = false,
}: SelectableCardProps) {
  return (
    <div
      className={`relative group ${className} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={(e) => {
        // Only toggle selection if clicking on the card itself, not on buttons inside
        const target = e.target as HTMLElement;
        const isButton = target.closest('button');
        const isInput = target.closest('input, textarea, select');
        
        if (!isButton && !isInput && !disabled) {
          onToggleSelect();
        }
      }}
    >
      {/* Checkbox overlay */}
      <div
        className={`absolute top-3 left-3 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-blue-600 border-blue-600'
            : 'bg-slate-700 border-slate-600 group-hover:border-slate-500'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            onToggleSelect();
          }
        }}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
