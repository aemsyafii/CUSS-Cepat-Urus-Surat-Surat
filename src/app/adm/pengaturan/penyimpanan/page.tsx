
'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useAdminData } from '@/app/adm/AdminDataContext';
import { Trash2, Database, ShieldCheck, Clock, Settings, HardDrive } from 'lucide-react';

export default function PenyimpananPage() {
  const { 
    setGlobalToast, 
    storageStats: globalStats, 
    storageSettings: globalSettings, 
    loadingStorage: globalLoading,
    refreshStorage 
  } = useAdminData();
  
  const supabase = createBrowserSupabase();
  
  // Local states for form editing
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Sync local states with global context when it loads
  useEffect(() => {
    if (globalSettings) {
      setAutoEnabled(globalSettings.enabled);
      setRetentionDays(globalSettings.retention);
    }
  }, [globalSettings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    const newSettings = { enabled: autoEnabled, retention: retentionDays };
    
    try {
      await supabase.from('PengaturanSistem').upsert({
        kunci: 'cleanup_settings',
        nilai: newSettings as any
      }, { onConflict: 'kunci' });
      
      await refreshStorage(retentionDays);
      setGlobalToast({ show: true, type: 'success', label: 'BERHASIL', message: 'Konfigurasi pembersihan data telah diperbarui.' });
    } catch (err) {
      setGlobalToast({ show: true, type: 'error', label: 'GAGAL', message: 'Gagal menyimpan pengaturan penyimpanan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurge = async () => {
    const totalOld = (globalStats?.oldDokumenCount || 0) + (globalStats?.oldArsipCount || 0);
    if (totalOld === 0) return;
    
    if (!confirm(`Konfirmasi Pembersihan:\nAnda akan menghapus ${totalOld} file fisik (> ${retentionDays} hari) secara permanen.\n\nLanjutkan?`)) return;

    setIsPurging(true);

    try {
      const response = await fetch('/api/admin/purge', { 
        method: 'POST',
        body: JSON.stringify({ retention: retentionDays }),
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      if (result.success && result.purgedCount !== undefined) {
        await refreshStorage(retentionDays);
        setGlobalToast({ show: true, type: 'success', label: 'BERHASIL', message: `Berhasil membersihkan ${result.purgedCount} file lama.` });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setGlobalToast({ show: true, type: 'error', label: 'GAGAL', message: 'Kesalahan: ' + err.message });
    } finally {
      setIsPurging(false);
    }
  };

  const stats = globalStats || { dokumenCount: 0, arsipCount: 0, oldDokumenCount: 0, oldArsipCount: 0 };
  const loading = globalLoading && !globalStats; // Only show loading if no data (cached or fresh)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="border-b border-gray-100 px-8 py-6 relative overflow-hidden bg-white">
        <div className="relative z-10">
          <h2 className="text-[20px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Manajemen Penyimpanan
          </h2>
          <p className="text-[13px] text-gray-500 font-medium mt-1">
            Kelola siklus hidup dokumen fisik untuk menjaga kapasitas database tetap optimal.
          </p>
        </div>
      </div>

      <div className="p-8 space-y-10">
        
        {/* CONFIGURATION FORM */}
        <section>
          <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 rounded-t-xl flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
             <Settings className="w-3 h-3" />
             <span>Konfigurasi Siklus Data</span>
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4">
              <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Otomasi Sistem</label>
              <div 
                onClick={() => setAutoEnabled(!autoEnabled)}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-100/50 transition-all"
              >
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${autoEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${autoEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-[13px] font-bold text-gray-700">{autoEnabled ? 'Aktif' : 'Nonaktif'}</span>
              </div>
            </div>

            <div className="md:col-span-5">
              <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Batas Usia (Hari)</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="1"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 uppercase">HARI</div>
              </div>
            </div>

            <div className="md:col-span-3">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-emerald-500 text-white font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? 'Proses...' : 'Simpan'}
              </button>
            </div>
          </form>
          <p className="mt-4 text-[12px] text-gray-400 font-medium flex items-center gap-2">
            <Clock className="w-3 h-3" />
            File yang lebih tua dari <span className="text-gray-900 font-bold">{retentionDays} hari</span> akan {autoEnabled ? 'dibersihkan otomatis' : 'ditandai untuk dibersihkan manual'}.
          </p>
        </section>

        {/* STATUS & ACTION SECTION */}
        <section>
          <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 rounded-t-xl flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
             <HardDrive className="w-3 h-3" />
             <span>Status Ruang Penyimpanan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lampiran Stat */}
            <div className="p-5 bg-white border border-gray-100 rounded-[24px] flex items-center justify-between hover:border-blue-100 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50/50 text-blue-500 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-blue-50">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-gray-900">Lampiran Warga</h4>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">Total: <span className="text-gray-600 font-bold">{(!stats.dokumenCount && loading) ? '...' : stats.dokumenCount} File</span></p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-8 w-px bg-gray-50"></div>
                <div className="text-right flex flex-col items-center">
                  <div className={`px-3 py-1.5 rounded-[18px] flex flex-col items-center justify-center min-w-[72px] transition-all ${stats.oldDokumenCount > 0 ? 'bg-orange-50/80 border border-orange-100' : 'bg-gray-50/50 border border-gray-50'}`}>
                    <span className={`text-[16px] font-black leading-none ${stats.oldDokumenCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {(!stats.oldDokumenCount && loading) ? '...' : stats.oldDokumenCount}
                    </span>
                    <span className={`text-[7px] font-black uppercase tracking-widest mt-1 ${stats.oldDokumenCount > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                      Kadaluarsa
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Arsip Stat */}
            <div className="p-5 bg-white border border-gray-100 rounded-[24px] flex items-center justify-between hover:border-purple-100 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50/50 text-purple-500 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-purple-50">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-gray-900">Arsip Surat</h4>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">Total: <span className="text-gray-600 font-bold">{(!stats.arsipCount && loading) ? '...' : stats.arsipCount} Berkas</span></p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-8 w-px bg-gray-50"></div>
                <div className="text-right flex flex-col items-center">
                  <div className={`px-3 py-1.5 rounded-[18px] flex flex-col items-center justify-center min-w-[72px] transition-all ${stats.oldArsipCount > 0 ? 'bg-orange-50/80 border border-orange-100' : 'bg-gray-50/50 border border-gray-50'}`}>
                    <span className={`text-[16px] font-black leading-none ${stats.oldArsipCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {(!stats.oldArsipCount && loading) ? '...' : stats.oldArsipCount}
                    </span>
                    <span className={`text-[7px] font-black uppercase tracking-widest mt-1 ${stats.oldArsipCount > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                      Kadaluarsa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PURGE BUTTON */}
          <div className="mt-8 p-8 border-2 border-dashed border-gray-100 rounded-[32px] bg-gray-50/30 flex flex-col items-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${stats.oldDokumenCount + stats.oldArsipCount > 0 ? 'bg-orange-50 text-orange-500 shadow-sm' : 'bg-gray-50 text-gray-200'}`}>
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-1">Pembersihan Manual Sekarang</h3>
            <p className="text-[12px] text-gray-400 font-medium mb-6 text-center max-w-xs">
              Hapus secara fisik {stats.oldDokumenCount + stats.oldArsipCount} file yang sudah melampaui batas waktu untuk mengosongkan ruang.
            </p>
            
            <button
              onClick={handlePurge}
              disabled={isPurging || (stats.oldDokumenCount + stats.oldArsipCount === 0)}
              className={`
                px-10 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest transition-all active:scale-95
                ${stats.oldDokumenCount + stats.oldArsipCount > 0 
                  ? 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200' 
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
              `}
            >
              {isPurging ? 'Sedang Memproses...' : `Bersihkan ${stats.oldDokumenCount + stats.oldArsipCount} File`}
            </button>
          </div>
        </section>

        {/* GUIDELINE */}
        <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-black text-emerald-900 uppercase tracking-wide mb-1">Keamanan Integritas Data</h4>
            <p className="text-[12px] text-emerald-700 font-medium leading-relaxed">
              Proses ini 100% aman bagi laporan administratif Anda. Hanya file fisik gambar/dokumen yang dihapus, 
              sedangkan riwayat pengajuan dan angka pada statistik Dashboard tetap terjaga utuh selamanya.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
