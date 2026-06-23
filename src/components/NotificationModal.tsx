'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  message: string;
  buttonText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  onCancel?: () => void;
  customIcon?: React.ReactNode;
}
export default function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  buttonText,
  onConfirm,
  cancelText,
  onCancel,
  customIcon
}: NotificationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const configurations = {
    success: {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ),
      bgColor: 'bg-emerald-500',
      iconColor: 'text-white',
      titleColor: 'text-emerald-600',
      borderColor: 'border-emerald-100/50',
    },
    error: {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      bgColor: 'bg-rose-500',
      iconColor: 'text-white',
      titleColor: 'text-rose-600',
      borderColor: 'border-rose-100/50',
    },
    warning: {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bgColor: 'bg-amber-500',
      iconColor: 'text-white',
      titleColor: 'text-amber-600',
      borderColor: 'border-amber-100/50',
    },
    info: {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-500',
      iconColor: 'text-white',
      titleColor: 'text-blue-600',
      borderColor: 'border-blue-100/50',
    }
  };

  const config = configurations[type];

  // Fungsi untuk konfirmasi
  const handleConfirmAction = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  // Fungsi untuk sekedar menutup (X, Batal, atau Luar Area)
  const handleCancelAction = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[300] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300"
      onClick={handleCancelAction}
    >
      <div 
        className="bg-white rounded-[40px] w-full max-w-[400px] p-10 pt-16 shadow-2xl relative animate-in zoom-in-95 duration-500 text-center mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup (X) */}
        <button 
          onClick={handleCancelAction}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        {/* Floating Icon Container */}
        <div className={`absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-white rounded-[40px] shadow-2xl flex items-center justify-center border border-gray-50 transform -rotate-12 transition-transform hover:rotate-0 duration-500`}>
          <div className={`w-24 h-24 ${config.bgColor} rounded-[32px] flex items-center justify-center ${config.iconColor} shadow-lg shadow-gray-200`}>
            {customIcon || config.icon}
          </div>
        </div>
        
        <h3 className={`text-2xl font-black ${config.titleColor} tracking-tighter mb-4 uppercase mt-8`}>
          {title}
        </h3>
        <p className="text-[15px] font-medium text-gray-600 leading-relaxed mb-2 px-2 whitespace-pre-wrap">
          {message}
        </p>
        
        <div className="flex flex-col gap-3">
          {buttonText && (
            <button 
              onClick={handleConfirmAction}
              className="w-full py-4 bg-gray-900 hover:bg-black text-white text-[14px] font-bold rounded-2xl shadow-xl shadow-gray-200 transition-all active:scale-95 uppercase tracking-widest"
            >
              {buttonText}
            </button>
          )}

          {cancelText && (
            <button 
              onClick={handleCancelAction}
              className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 text-[14px] font-bold rounded-2xl transition-all active:scale-95 uppercase tracking-widest"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
