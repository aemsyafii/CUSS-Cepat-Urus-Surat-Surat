'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTracking } from './trackingContext';
import { createBrowserSupabase } from '@/lib/supabase/client';
import NotificationModal from '@/components/NotificationModal';
import GlobalToast from '@/components/GlobalToast';
import CussChatWidget from './CussChatWidget';

const supabase = createBrowserSupabase();

export default function ClientLayout({ children, user }: { children: React.ReactNode, user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedSurat, setSelectedSurat, globalToast, setGlobalToast } = useTracking();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAccountDisabled, setIsAccountDisabled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Cek awal saat mount jika status sudah nonaktif
    if (user?.status === 'Nonaktif') {
      setIsAccountDisabled(true);
    }
  }, [user?.status]);

  // Lock scroll when menu is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDrawerOpen]);

  // Realtime Listener Global
  useEffect(() => {
    const channel = supabase
      .channel(`realtime_global_warga_${user?.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Surat', filter: `pemohon_id=eq.${user?.id}` },
        (payload: any) => {
          const newStatus = (payload.new as any).status;
          const oldStatus = (payload.old as any).status;
          
          if (newStatus !== oldStatus) {
            setGlobalToast({
              show: true,
              type: newStatus === 'Ditolak' ? 'error' : (newStatus === 'Selesai' ? 'success' : 'info'),
              label: newStatus.toUpperCase(),
              message: `Pengajuan ${(payload.new as any).jenis_surat} Anda.`
            });
            
            // Jika sedang di halaman lacak, sinkronkan selectedSurat jika ID-nya sama
            if (pathname.includes('/lacak') && selectedSurat?.id === (payload.new as any).id) {
               setSelectedSurat({ ...selectedSurat, ...payload.new });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, pathname, selectedSurat, setSelectedSurat, setGlobalToast]);

  // Realtime Listener Khusus Akun Warga (Cek Status)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`realtime_account_status_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Users', filter: `id=eq.${user.id}` },
        (payload: any) => {
          const newStatus = (payload.new as any).status;
          if (newStatus === 'Nonaktif') {
            setIsAccountDisabled(true);
          } else if (newStatus === 'Aktif') {
            setIsAccountDisabled(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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

  const handleLogout = () => {
    // Navigasi paksa (hard navigation) ke API Auth Logout untuk memutus sesi secara total dan membersihkan *cache* Next.js
    supabase.auth.signOut().then(() => { window.location.href = '/login'; });
  };

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'W';
  }

  const navItems = [
    {
      href: '/cuss/pengajuan',
      label: 'Buat Surat',
      icon: (
        <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    {
      href: '/cuss/lacak',
      label: 'Lacak Berkas',
      icon: (
        <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#f8faf9] flex flex-col font-sans overflow-x-hidden">

      {/* Header Warga */}
      <header className="w-full h-20 flex items-center justify-between px-6 md:px-10 fixed top-0 left-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">

        {/* Kiri: Logo CUSS */}
        <Link href="/cuss/pengajuan" className="flex items-center gap-3">
          <div className="flex items-center justify-center p-1 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <img src="/logo.webp" alt="Logo CUSS" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-[30px] font-black text-[#1F2937] tracking-tighter leading-none mt-1 flex items-baseline">
            CUSS
            <span className="w-[8px] h-[8px] bg-[#23C16B] rounded-full inline-block ml-0.5 mb-[4px]"></span>
          </h1>
        </Link>

        {/* Tengah: Navigasi Desktop */}
        <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[15px] font-bold transition-all ${pathname?.includes(item.href) ? 'text-[#23C16B]' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Kanan: Profil Trigger (Desktop) / Burger (Mobile) */}
        <div className="md:hidden">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="w-12 h-12 flex flex-col items-center justify-center gap-1.5 rounded-2xl active:scale-90 transition-all"
            >
              <div className="w-6 h-0.5 bg-[#1F2937] rounded-full"></div>
              <div className="w-6 h-0.5 bg-[#1F2937] rounded-full"></div>
              <div className="w-6 h-0.5 bg-[#1F2937] rounded-full"></div>
            </button>
        </div>

        <div className="hidden md:block" ref={dropdownRef}>
          {/* Trigger: Nama + Avatar + Chevron */}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 focus:outline-none hover:opacity-90 transition-opacity"
          >
            <div className="text-right hidden md:block">
              <p className="text-[14px] font-bold text-gray-900 leading-tight" title={user?.nama}>
                {(() => {
                  const name = user?.nama || 'Warga Desa';
                  return name.length > 20 ? name.substring(0, 17) + '...' : name;
                })()}
              </p>
              <p className="text-[12px] text-gray-500 font-medium whitespace-nowrap">Warga Desa</p>
            </div>

            <div className="w-11 h-11 bg-gray-50 border border-gray-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[15px] shadow-sm overflow-hidden flex-shrink-0">
              {user?.foto ? (
                <img src={user.foto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.nama)
              )}
            </div>

            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu Desktop */}
          {isProfileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => { setIsProfileOpen(false); router.push('/cuss/profil'); }}
                className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-2.5"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Perbarui Profil
              </button>

              <div className="h-px bg-gray-100 my-1 mx-3" />

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2.5"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar Akun
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer (Sidepanel Right) */}
      {mounted && isDrawerOpen && createPortal(
         <div className="fixed inset-0 z-[200] overflow-hidden md:hidden" onClick={() => setIsDrawerOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"></div>
            
            <div 
              className="absolute right-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
               <div className="p-8 pb-6 border-b border-gray-100 relative bg-[#f8faf9]">
                  <button onClick={() => setIsDrawerOpen(false)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
 
                  <div className="flex flex-col items-center gap-4 mt-4 text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center text-emerald-600 font-black text-[32px] shadow-sm overflow-hidden shrink-0 border-4 border-white ring-1 ring-gray-100">
                      {user?.foto ? (
                        <img src={user.foto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(user?.nama)
                      )}
                    </div>
                    <div className="w-full">
                      <div className="flex items-center justify-center gap-2 mb-0.5">
                        <h4 className="text-[#1F2937] font-bold text-[26px] leading-tight line-clamp-2">
                          {user?.nama || 'Warga Desa'}
                        </h4>
                      </div>
                      <p className="text-gray-400 text-[14px] font-medium tracking-tight">warga desa</p>
                      
                      <Link 
                        href="/cuss/profil" 
                        onClick={() => setIsDrawerOpen(false)}
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

               <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                  {navItems.map((item) => {
                     const isActive = pathname === item.href;
                     return (
                        <Link 
                           key={item.href}
                           href={item.href}
                           onClick={() => setIsDrawerOpen(false)}
                           className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${isActive ? 'bg-emerald-50 text-[#23C16B]' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                           <div className={`${isActive ? 'text-[#23C16B]' : 'text-gray-400'}`}>{item.icon}</div>
                           <span className="text-[16px] font-bold">{item.label}</span>
                        </Link>
                     );
                  })}
               </nav>

               <div className="p-8 pt-4">
                  <button onClick={handleLogout} className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-bold text-[15px] transition-all active:scale-95 flex items-center justify-center gap-2">
                    KELUAR
                  </button>
               </div>
            </div>
         </div>,
         document.body
      )}

      {mounted && (
        <NotificationModal 
          isOpen={isAccountDisabled}
          onClose={handleLogout}
          type="error"
          title="AKUN DINONAKTIFKAN"
          message={`Mohon maaf ${user?.nama}, akun Anda telah dinonaktifkan oleh administrator.\nSilakan hubungi admin Desa untuk mengaktifkan kembali akses Anda.`}
          buttonText="KELUAR SEKARANG"
          onConfirm={handleLogout}
        />
      )}

      {/* Kontainer Utama Layout Warga */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col md:flex-row items-start z-10 p-6 mt-20 md:px-16 lg:px-24 pb-20 gap-20 relative">

        {/* Kiri: Ilustrasi ATAU Timeline Detail (Truly Frozen via Fixed) */}
        <div className="w-full md:w-1/2 hidden md:block relative">
          <div className="md:fixed md:top-36 md:w-[calc(50%-120px)] lg:md:w-[calc(50%-160px)] max-w-[480px] z-20">

            {pathname.includes('/lacak') && selectedSurat ? (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 pt-2 w-full max-w-[450px] relative">
                
                {/* Tombol Tutup (X) - Tetap Melayang di Tempat */}
                <div className="absolute right-0 top-0 z-[30]">
                  <button
                    onClick={() => setSelectedSurat(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 transition-colors shadow-sm"
                    title="Tutup Detail"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                {/* Kontainer Timeline yang Scrollable tanpa Scrollbar */}
                <div 
                  className="max-h-[calc(100vh-180px)] overflow-y-auto pr-4"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none'
                  }}
                >
                  {/* Hide scrollbar for Chrome/Safari */}
                  <style>{`
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                  `}</style>
                  <div className="no-scrollbar">
                    <div className="mb-8 pr-12">
                      <p className="text-gray-500 font-semibold text-sm mb-1 uppercase tracking-wider">No. Pengajuan Surat</p>
                      <h3 className="text-[28px] font-black text-gray-900 leading-none">
                        #{selectedSurat.no_pengajuan || selectedSurat.id.split('-')[0].toUpperCase()}
                      </h3>

                      {selectedSurat.is_mewakili && (
                        <p className="mt-1.5 text-[14px] text-gray-500 font-semibold uppercase tracking-wider">
                          Atas Nama: <span className="font-extrabold text-gray-900 leading-none">{selectedSurat.nama_subjek}</span>
                        </p>
                      )}

                      <div className="mt-2.5 inline-block">
                        <p className="text-xs text-gray-400 font-bold mb-0.5">STATUS TERKINI</p>
                        <p className={`font-bold text-[15px] ${
                          selectedSurat.status === 'Masuk' ? 'text-blue-500' :
                          selectedSurat.status === 'Diproses' ? 'text-amber-500' : 
                          selectedSurat.status === 'Selesai' ? 'text-emerald-500' : 'text-red-500'
                        }`}>{selectedSurat.status.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Garis Waktu (Timeline Stepper) */}
                    <div className="relative pl-3 mt-8">

                      {/* Node 1: Masuk (Awal) */}
                      <div className="relative pb-8">
                        <div className="absolute left-[-11px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50 z-10"></div>
                        <div className="absolute left-[-6px] top-4 w-px h-[calc(100%+8px)] bg-emerald-500"></div>
                        <div className="pl-6">
                          <p className="text-emerald-600 font-bold text-sm mb-1">
                            {mounted ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSurat.created_at)) : ''} WIB
                          </p>
                          <p className="text-gray-500 text-sm font-medium leading-relaxed uppercase">
                            Berhasil Diajukan<br />
                            <span className="text-xs text-gray-400 normal-case">Menunggu validasi tim aparatur desa.</span>
                          </p>
                        </div>
                      </div>

                      {/* Node 2: Diproses */}
                      <div className="relative pb-8">
                        <div className={`absolute left-[-11px] top-1.5 w-3 h-3 rounded-full z-10 ${['Diproses', 'Selesai', 'Ditolak'].includes(selectedSurat.status) ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-gray-300'
                          }`}></div>
                        <div className={`absolute left-[-6px] top-4 w-px h-[calc(100%+8px)] ${['Selesai', 'Ditolak'].includes(selectedSurat.status) ? 'bg-emerald-500' : 'bg-gray-200'
                          }`}></div>
                        <div className="pl-6">
                          <p className={`font-bold text-sm mb-1 ${['Diproses', 'Selesai', 'Ditolak'].includes(selectedSurat.status) ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {(selectedSurat.tanggal_diproses || (selectedSurat.status === 'Ditolak' && selectedSurat.tanggal_ditolak))
                              ? (mounted ? `${new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSurat.tanggal_diproses || selectedSurat.tanggal_ditolak))} WIB` : '')
                              : (['Diproses', 'Selesai', 'Ditolak'].includes(selectedSurat.status) ? 'Sedang Berlangsung' : 'Menunggu...')}
                          </p>
                          <p className="text-gray-500 text-sm font-medium leading-relaxed uppercase">
                            DIVERIFIKASI & DIPROSES<br />
                            <span className="text-xs text-gray-400 normal-case">Sedang dalam tahap administrasi / persetujuan Kades.</span>
                          </p>
                        </div>
                      </div>

                      {/* Node 3: Keputusan Akhir */}
                      <div className="relative">
                        <div className={`absolute left-[-11px] top-1.5 w-3 h-3 rounded-full z-10 ${['Selesai', 'Ditolak'].includes(selectedSurat.status) ? (selectedSurat.status === 'Selesai' ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-red-500 ring-4 ring-red-50') : 'bg-gray-300'
                          }`}></div>
                        <div className="pl-6 pb-4">
                          <p className={`font-bold text-sm mb-1 ${selectedSurat.status === 'Selesai' ? 'text-emerald-600' : (selectedSurat.status === 'Ditolak' ? 'text-red-500' : 'text-gray-500')}`}>
                            {selectedSurat.status === 'Selesai' 
                              ? (selectedSurat.tanggal_disetujui 
                                ? `${new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSurat.tanggal_disetujui))} WIB`
                                : 'Surat Telah Terbit')
                              : selectedSurat.status === 'Ditolak'
                                ? (selectedSurat.tanggal_ditolak 
                                  ? (mounted ? `${new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSurat.tanggal_ditolak))} WIB` : '')
                                  : 'Pengajuan Ditolak')
                                : 'Validasi Akhir'}
                          </p>
                          <p className={`text-gray-500 text-sm font-medium leading-relaxed ${selectedSurat.status === 'Ditolak' ? '' : 'uppercase'}`}>
                            {selectedSurat.status === 'Selesai' 
                              ? 'SIAP DIAMBIL DI BALAI DESA' 
                              : selectedSurat.status === 'Ditolak' 
                                ? (
                                  <>
                                    <span className="block text-red-600 font-medium text-sm mb-1 uppercase">PENGAJUAN DITOLAK</span>
                                    {selectedSurat.response_admin || 'Mohon Cek Keterangan'}
                                  </>
                                ) 
                                : 'KEPUTUSAN ADMINISTRASI'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <div className="-mb-8 w-full max-w-[450px]">
                  <img
                    src="/hero-3d.png"
                    alt="3D Office Architecture"
                    className="w-full h-auto object-contain drop-shadow-xl pointer-events-none select-none"
                    loading="eager"
                  />
                </div>

                <h2 className="text-[4.5rem] leading-none font-black text-[#1F2937] mb-5 tracking-tight -ml-1 relative z-10 flex items-end">
                  CUSS
                  <span className="w-[18px] h-[18px] bg-[#23C16B] rounded-full inline-block ml-1.5 mb-[12px]"></span>
                </h2>
                <p className="text-[#4B5563] text-[15px] leading-relaxed max-w-[460px] font-medium relative z-10">
                  Selamat datang di Dashboard Warga. Anda dapat mengajukan pembuatan dokumen resmi secara online dan melacak proses berkas Anda secara real-time tanpa harus antre di Balai Desa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Kanan: Dinamis Router (Formulir Pengajuan / List Lacak) */}
        <div className="w-full md:w-1/2">
          <div className="max-w-[520px] ml-auto relative">
            {/* Glow Effect Backdrop - Sama seperti di Halaman Login */}
            <div className="absolute -inset-4 bg-[#23C16B]/10 blur-[80px] -z-10 rounded-full hidden md:block"></div>
            
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </div>

      </div>

      <GlobalToast toast={globalToast} onClose={() => setGlobalToast(null)} />
      <CussChatWidget />
    </div>
  );
}
