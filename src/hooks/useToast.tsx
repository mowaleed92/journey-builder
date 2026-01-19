import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Check, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast icon mapping
function getToastIcon(type: ToastType) {
  switch (type) {
    case 'success':
      return <Check className="w-5 h-5" />;
    case 'error':
      return <AlertCircle className="w-5 h-5" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5" />;
    case 'info':
    default:
      return <Info className="w-5 h-5" />;
  }
}

// Toast styling based on type
function getToastStyles(type: ToastType) {
  switch (type) {
    case 'success':
      return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
    case 'error':
      return 'bg-red-500/20 border-red-500/30 text-red-300';
    case 'warning':
      return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
    case 'info':
    default:
      return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
  }
}

// Individual Toast component
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-200 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      } ${getToastStyles(toast.type)}`}
    >
      {getToastIcon(toast.type)}
      <span className="font-medium flex-1">{toast.message}</span>
      <button
        onClick={handleDismiss}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast Container - renders all active toasts
export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Standalone toast component for components that can't use context
// (e.g., components rendered outside the provider)
export function StandaloneToast({ 
  toast, 
  onDismiss 
}: { 
  toast: { type: ToastType; message: string } | null; 
  onDismiss: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 200);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`fixed top-4 right-4 z-[9999] transition-all duration-200 ${
      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
    }`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${getToastStyles(toast.type)}`}>
        {getToastIcon(toast.type)}
        <span className="font-medium">{toast.message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 200);
          }}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
