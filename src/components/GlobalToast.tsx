'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type GlobalToastData = {
  show: boolean;
  type: 'success' | 'error' | 'info';
  label: string;
  message: string;
};

type Props = {
  toast: GlobalToastData | null;
  onClose: () => void;
};

export default function GlobalToast({ toast, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auto-hide setelah 5 detik, pause saat hover
  useEffect(() => {
    if (toast?.show && !isHovered) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, isHovered, onClose]);

  if (!mounted || !toast?.show) return null;

  const badgeClass =
    toast.type === 'error'
      ? 'bg-red-50 text-red-600 border-red-200'
      : toast.type === 'success'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-amber-50 text-amber-600 border-amber-200';

  return createPortal(
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      className="fixed top-8 right-8 z-[300] w-[calc(100%-48px)] max-w-[360px] animate-in slide-in-from-top-10 duration-500"
    >
      <div
        className={`group cursor-pointer bg-white rounded-full hover:rounded-2xl active:rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] flex items-center justify-between p-1.5 pl-6 border border-gray-50/50 backdrop-blur-md transition-all duration-300 gap-2 ${
          isHovered ? 'scale-[1.02]' : 'scale-100'
        }`}
      >
        <p className="text-[13px] font-normal text-gray-500 line-clamp-1 group-hover:line-clamp-none group-active:line-clamp-none flex-1 transition-all">
          {toast.message}
        </p>
        <button
          onClick={onClose}
          className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-normal border transition-all active:scale-95 shadow-sm shrink-0 ${badgeClass}`}
        >
          {toast.label}
        </button>
      </div>
    </div>,
    document.body
  );
}
