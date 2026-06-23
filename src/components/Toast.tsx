'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

export default function Toast({
  isOpen,
  onClose,
  type,
  title,
  message,
  duration = 3000
}: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  useEffect(() => {
    if (isOpen && !isHovered) {
      setIsClosing(false);
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, isHovered, handleClose]);

  if (!mounted || !isOpen) return null;

  const configurations = {
    success: {
      label: 'BERHASIL',
      labelStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    error: {
      label: 'GAGAL',
      labelStyle: 'bg-red-50 text-red-600 border-red-200',
    },
    warning: {
      label: 'PERINGATAN',
      labelStyle: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    info: {
      label: 'INFO',
      labelStyle: 'bg-amber-50 text-amber-600 border-amber-200',
    }
  };

  const config = configurations[type];

  return createPortal(
    <div className="fixed top-8 right-8 z-[500] pointer-events-none w-[calc(100%-48px)] max-w-[360px] font-sans">
      <div 
        className={`
          pointer-events-auto
          group cursor-pointer bg-white rounded-full hover:rounded-2xl active:rounded-2xl 
          shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] flex items-center justify-between 
          p-1.5 pl-6 border border-gray-50/50 backdrop-blur-md 
          transition-all duration-500 transform
          ${isClosing ? 'opacity-0 translate-y-[-20px] scale-95' : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-top-10'}
          ${isHovered ? 'scale-[1.02]' : 'scale-100'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
        onClick={handleClose}
      >
        <p className="text-[13px] font-normal text-gray-500 line-clamp-1 group-hover:line-clamp-none transition-all flex-1">
          {message}
        </p>
        
        <button 
          className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-normal border transition-all active:scale-95 shadow-sm shrink-0 ${config.labelStyle}`}
        >
          {title || config.label}
        </button>
      </div>
    </div>,
    document.body
  );
}
