import React, { useEffect } from 'react';
import { Check, Trash2, AlertCircle } from 'lucide-react';

export interface ToastData {
  message: string;
  type: 'success' | 'delete' | 'error';
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

const TOAST_STYLES: Record<ToastData['type'], { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <Check className="w-4 h-4 shrink-0" />,
    classes: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  },
  delete: {
    icon: <Trash2 className="w-4 h-4 shrink-0" />,
    classes: 'bg-slate-700/40 border-slate-600/50 text-slate-200',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 shrink-0" />,
    classes: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const style = TOAST_STYLES[toast.type];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-sm pointer-events-none">
      <div
        className={`animate-fadeIn pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-sm font-semibold ${style.classes}`}
      >
        {style.icon}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
