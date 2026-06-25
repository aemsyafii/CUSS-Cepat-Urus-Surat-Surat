'use client';
import { useState, useEffect, useRef } from 'react';
import { useTracking } from '../trackingContext';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { createPortal } from 'react-dom';

const supabase = createBrowserSupabase();

export default function ClientLacak({ listSurat, user }: { listSurat: any[], user: any }) {
  const { selectedSurat, setSelectedSurat } = useTracking();
  const [suratData, setSuratData] = useState<any[]>(listSurat || []);
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isModalOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime_lacak_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Surat', filter: `pemohon_id=eq.${user?.id}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setSuratData((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSuratData((prev) =>
              prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setSuratData((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listSurat]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Masuk': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Diproses': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Selesai': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Ditolak': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const subjekName = (surat: any) => {
    if (surat.subjek?.nama) return surat.subjek.nama;
    return user?.nama || '-';
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-[24px] p-6 md:p-8 space-y-6 animate-pulse relative z-20 border border-[#E5E7EB]">
        <div className="space-y-3 pb-5 border-b border-gray-100">
          <div className="h-8 w-48 bg-gray-200 rounded-xl"></div>
          <div className="h-4 w-64 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100/50 rounded-2xl border border-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-[24px] p-6 md:p-8 relative shadow-[0_20px_50px_-15px_rgba(34,197,94,0.1)] border border-[#E5E7EB] z-20"
      onClick={() => setSelectedSurat(null)}>
      <div className="mb-6 border-b border-gray-100 pb-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[24px] font-bold text-[#1F2937] tracking-tight mb-2">Daftar Pengajuan Saya</h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Pilih salah satu histori pengajuan di bawah ini untuk melihat detailnya<span className="hidden md:inline"> di panel sebelah</span>.
        </p>
      </div>

      {suratData && suratData.length > 0 ? (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          {suratData.map((surat) => {
            const isSelected = selectedSurat?.id === surat.id;
            return (
              <div key={surat.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected && !isModalOpen) setSelectedSurat(null);
                  else { setSelectedSurat(surat); setIsModalOpen(true); }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${isSelected ? 'border-[#23C16B] ring-2 ring-[#23C16B]/20 bg-emerald-50/10' : 'border-gray-100 bg-white hover:border-gray-300'} flex flex-col gap-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`font-bold text-[15px] ${isSelected ? 'text-[#23C16B]' : 'text-gray-900'}`}>{surat.jenis_surat}</h4>
                    <p className="text-[12px] text-gray-400 font-medium mt-1">{formatDate(surat.created_at)}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${getStatusColor(surat.status)}`}>{surat.status.toUpperCase()}</span>
                </div>
                {surat.keperluan && (
                  <div className={`text-[13px] text-gray-600 font-medium py-1 transition-all ${isSelected ? '' : 'line-clamp-2'}`}>
                    <p className="leading-relaxed">{surat.keperluan}</p>
                    {isSelected && surat.dokumen_lampiran && surat.dokumen_lampiran.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 animate-in fade-in duration-500">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-semibold uppercase tracking-tight">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          +{surat.dokumen_lampiran.length} Lampiran
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">Belum ada pengajuan</h4>
          <p className="text-sm text-gray-500 max-w-sm">Anda belum memiliki dokumen yang sedang diproses.</p>
        </div>
      )}

      {mounted && selectedSurat && isModalOpen && createPortal(
        <div className="md:hidden fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}>
          <div className="bg-white rounded-[32px] p-8 shadow-2xl relative w-full max-w-[480px] animate-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}>
            <div className="absolute right-6 top-6">
              <button onClick={() => setIsModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all active:scale-90">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            {/* Scrollable Modal Content */}
            <div className="max-h-[calc(100vh-140px)] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="no-scrollbar">
                <div className="mb-6 pr-12">
                  <p className="text-gray-500 font-semibold text-sm mb-1 uppercase tracking-wider">No. Pengajuan Surat</p>
                  <h3 className="text-[28px] font-black text-gray-900 leading-none">
                    #{selectedSurat.no_pengajuan || selectedSurat.id.split('-')[0].toUpperCase()}
                  </h3>
                  {selectedSurat.is_mewakili && (
                    <p className="mt-1.5 text-[14px] text-gray-500 font-semibold uppercase tracking-wider">
                      Atas Nama: <span className="font-extrabold text-gray-900 leading-none">{selectedSurat.nama_subjek}</span>
                    </p>
                  )}
                  <div className="mt-2.5">
                    <p className="text-xs text-gray-400 font-bold mb-0.5">STATUS TERKINI</p>
                    <p className={`font-bold text-[15px] ${
                      selectedSurat.status === 'Masuk' ? 'text-blue-500' :
                      selectedSurat.status === 'Diproses' ? 'text-amber-500' :
                      selectedSurat.status === 'Selesai' ? 'text-emerald-500' : 'text-red-500'
                    }`}>{selectedSurat.status.toUpperCase()}</p>
                  </div>
                </div>

                {/* Attachments / Lampiran Badge */}
                {selectedSurat.dokumen_lampiran && selectedSurat.dokumen_lampiran.length > 0 && (
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[11px] font-bold border border-emerald-100/60 uppercase tracking-wider">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {selectedSurat.dokumen_lampiran.length} Lampiran Pendukung
                    </span>
                  </div>
                )}

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
                    <div className={`absolute left-[-11px] top-1.5 w-3 h-3 rounded-full z-10 ${['Diproses', 'Selesai', 'Ditolak'].includes(selectedSurat.status) ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-[-6px] top-4 w-px h-[calc(100%+8px)] ${['Selesai', 'Ditolak'].includes(selectedSurat.status) ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
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
                    <div className={`absolute left-[-11px] top-1.5 w-3 h-3 rounded-full z-10 ${['Selesai', 'Ditolak'].includes(selectedSurat.status) ? (selectedSurat.status === 'Selesai' ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-red-500 ring-4 ring-red-50') : 'bg-gray-300'}`}></div>
                    <div className="pl-6 pb-2">
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
                                <span className="block text-red-600 font-semibold text-sm mb-1 uppercase">PENGAJUAN DITOLAK</span>
                                <span className="text-gray-600 leading-normal">{selectedSurat.response_admin || 'Mohon Cek Keterangan'}</span>
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
        </div>, document.body
      )}
    </div>
  );
}
