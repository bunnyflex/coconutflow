import { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';

// -----------------------------------------------------------------------
// Toast store
// -----------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

/** Convenience function to show a toast from anywhere */
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message, duration: 6000 }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message }),
};

// -----------------------------------------------------------------------
// Toast component
// -----------------------------------------------------------------------

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-green-950/80', border: 'border-green-700', icon: '✓' },
  error: { bg: 'bg-red-950/80', border: 'border-red-700', icon: '✕' },
  info: { bg: 'bg-blue-950/80', border: 'border-blue-700', icon: 'ℹ' },
  warning: { bg: 'bg-yellow-950/80', border: 'border-yellow-700', icon: '⚠' },
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-yellow-400',
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const style = TYPE_STYLES[item.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, item.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [item.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-sm ${style.bg} ${style.border} animate-in slide-in-from-right`}
    >
      <span className={`mt-0.5 text-sm font-bold ${ICON_COLORS[item.type]}`}>
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{item.title}</p>
        {item.message && <p className="mt-0.5 text-xs text-gray-400">{item.message}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="ml-2 text-gray-500 hover:text-gray-300"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2" style={{ maxWidth: 360 }}>
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={() => removeToast(item.id)} />
      ))}
    </div>
  );
}
