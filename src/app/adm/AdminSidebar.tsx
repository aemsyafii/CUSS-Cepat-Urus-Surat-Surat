'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminSidebar({ user }: { user?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar area dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cuss_admin_sidebar_expanded');
    if (saved !== null) {
      setIsExpanded(JSON.parse(saved));
    }
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('cuss_admin_sidebar_expanded', JSON.stringify(newState));
  };

  const navItems = [
    {
      href: '/adm/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      label: 'Dashboard'
    },
    {
      href: '/adm/pengajuan',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'Kelola Pengajuan'
    },
    {
      href: '/adm/arsip',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: 'Arsip Pengajuan'
    },
    {
      href: '/adm/warga',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      label: 'Master Warga'
    },
    {
      href: '/adm/pengaturan',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Opsi Lanjutan'
    }
  ];

  // Prevent flicker by hiding content until mounted
  if (!mounted) {
    return (
      <aside className={`w-[260px] bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm py-8 z-50 animate-pulse`}>
        <div className="pl-4 mb-12">
            <div className="w-13 h-13 bg-gray-50 rounded-[20px]"></div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`
      ${isExpanded ? 'w-[260px]' : 'w-[84px]'} 
      bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm py-8 
      transition-all duration-300 ease-in-out
      z-50 opacity-100
    `}>
      {/* Clickable Header Logo (Toggle) */}
      <div 
        onClick={toggleSidebar}
        className="pl-4 mb-12 flex items-center cursor-pointer group transition-all duration-300"
      >
        <div className="w-13 h-13 bg-white rounded-[20px] flex-shrink-0 flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-105 transition-all duration-300 overflow-hidden p-2">
          <img src="/logo.webp" alt="Logo CUSS" className="w-full h-full object-contain" />
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-auto opacity-100 ml-4' : 'w-0 opacity-0 ml-0'}`}>
          <p className="font-bold text-[18px] text-emerald-900 leading-tight whitespace-nowrap">CUSS<span className="text-emerald-500">Admin</span></p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.2em] whitespace-nowrap mt-0.5">Dashboard Panel</p>
        </div>
      </div>

      <nav className="flex-1 w-full space-y-2 flex flex-col items-stretch px-0">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`
                relative group flex items-center h-[52px] transition-all duration-150 pl-[29px]
                ${isActive 
                  ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}
              `}
              title={!isExpanded ? item.label : ''}
            >
              {/* Active Indicator Bar */}
              <div className={`
                absolute w-[6px] h-8 bg-[#23C16B] rounded-r-full shadow-[2px_0_10px_rgba(35,193,107,0.4)] transition-all duration-150 -left-px
                ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}
              `}></div>

              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {item.icon}
              </div>

              <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-auto opacity-100 ml-5' : 'w-0 opacity-0 ml-0'}`}>
                <span className="font-semibold text-[14px] whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Section */}
      <div className="w-full mt-auto mb-4 relative px-0" ref={dropdownRef}>
        {/* Dropdown Menu */}
        {isProfileOpen && (
          <div className={`
            absolute bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150
            ${isExpanded ? 'left-6 bottom-[calc(100%+12px)] w-[212px]' : 'left-[84px] bottom-0 w-44'}
          `}>
            <Link
              href="/adm/profil"
              onClick={() => setIsProfileOpen(false)}
              className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-2.5"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Perbarui Profil
            </Link>

            <div className="h-px bg-gray-100 my-1 mx-3" />

            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                } catch (err) {
                  console.error('Logout failed:', err);
                }
                window.location.replace('/login');
              }}
              className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2.5"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar Akun
            </button>
          </div>
        )}

        {/* Trigger: Profile Info */}
        <div 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`
            flex items-center h-[72px] cursor-pointer transition-all duration-300 group pl-5 pr-5
            ${isProfileOpen ? 'bg-gray-50' : 'hover:bg-gray-50/50'}
          `}
        >
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-11 h-11 bg-gray-50 border border-gray-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[15px] shadow-sm overflow-hidden flex-shrink-0">
              {user?.foto ? (
                <img src={user.foto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (user?.nama || user?.nama_admin || 'A').charAt(0).toUpperCase()
              )}
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-auto opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
              <div className="flex flex-col">
                <p className="text-[14px] font-bold text-gray-900 leading-tight truncate whitespace-nowrap" title={user?.nama || user?.nama_admin || 'Administrator'}>
                  {(() => {
                    const name = user?.nama || user?.nama_admin || 'Administrator';
                    return name.length > 20 ? name.substring(0, 17) + '...' : name;
                  })()}
                </p>
                <p className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Administrator</p>
              </div>
            </div>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
