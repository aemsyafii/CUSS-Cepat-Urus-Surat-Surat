'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';

export default function MobileAdminHeader({ user }: { user?: any }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navItems = [
    {
      href: '/adm/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      href: '/adm/pengajuan',
      label: 'Kelola Pengajuan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      href: '/adm/warga',
      label: 'Master Warga',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      href: '/adm/pengaturan',
      label: 'Opsi Lanjutan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <>
      <header className="md:hidden sticky top-0 z-[100] bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-5 py-4">
        <Link href="/adm/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-1.5">
            <img src="/logo.webp" alt="Logo CUSS" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-[16px] text-emerald-900 leading-none">CUSS Admin</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Dashboard Panel</p>
          </div>
        </Link>

        {/* Veggie Burger Button */}
        <button 
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 flex flex-col items-center justify-center gap-1.5 rounded-2xl active:scale-90 transition-all"
        >
          <div className="w-6 h-0.5 bg-emerald-600 rounded-full"></div>
          <div className="w-6 h-0.5 bg-emerald-600 rounded-full"></div>
          <div className="w-6 h-0.5 bg-emerald-600 rounded-full"></div>
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mounted && isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[200] overflow-hidden md:hidden"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"></div>
          
          {/* Side Panel */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with Profile - Clean Gray Style */}
            <div className="p-8 pb-6 border-b border-gray-100 relative bg-[#f8faf9]">
               <button 
                  onClick={() => setIsOpen(false)}
                  className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>

               <div className="flex flex-col items-center gap-4 mt-4 text-center">
                  {/* Avatar */}
                  <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center text-emerald-600 font-black text-[32px] shadow-sm overflow-hidden shrink-0 border-4 border-white ring-1 ring-gray-100">
                    {user?.foto ? (
                      <img src={user.foto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      (user?.nama || user?.nama_admin || 'A').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="w-full">
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <h4 className="text-[#1F2937] font-bold text-[26px] leading-tight line-clamp-2">
                        {user?.nama || user?.nama_admin || 'Administrator'}
                      </h4>
                    </div>
                    <p className="text-gray-400 text-[14px] font-medium tracking-tight">administrator</p>
                    
                      <Link 
                        href="/adm/profil" 
                        onClick={() => setIsOpen(false)}
                        className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-900 rounded-full font-bold text-[13px] transition-all active:scale-95 border border-gray-100 shadow-sm"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Perbarui Profil
                    </Link>
                  </div>
               </div>
            </div>

            {/* Nav Menu */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
               {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                     <Link 
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
                           isActive 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : 'text-gray-600 hover:bg-gray-50'
                        }`}
                     >
                        <div className={`${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                           {item.icon}
                        </div>
                        <span className="text-[16px] font-bold">
                           {item.label}
                        </span>
                     </Link>
                  );
               })}
            </nav>

            {/* Logout Footer */}
            <div className="p-8 pt-4">
               <button
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                    } catch (err) {}
                    window.location.replace('/login');
                  }}
                  className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-bold text-[15px] transition-all active:scale-95 flex items-center justify-center gap-2"
               >
                  KELUAR
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
