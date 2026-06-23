
'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';

export default function RefreshSettingsPage() {
  const supabase = createBrowserSupabase();
  const [dashboardInterval, setDashboardInterval] = useState(30);
  const [pengajuanInterval, setPengajuanInterval] = useState(60);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Ambil data dari Database (Supabase) dengan fallback ke localStorage
  useEffect(() => {
    const loadSettings = async () => {
      // 1. Coba ambil dari Database
      try {
        const { data, error } = await supabase
          .from('PengaturanSistem')
          .select('nilai')
          .eq('kunci', 'refresh_settings')
          .single();

        if (data && (data as any)?.nilai) {
          const settings = (data as any).nilai;
          setDashboardInterval(settings.dashboard || 30);
          setPengajuanInterval(settings.pengajuan || 60);
          setAutoRefreshEnabled(settings.enabled ?? true);
          // Sync ke localStorage agar modul lain (Dashboard/Pengajuan) bisa langsung pakai tanpa fetch DB tiap saat
          localStorage.setItem('cuss_refresh_settings', JSON.stringify(settings));
          return;
        }
      } catch (err) {
        console.log('Fetching from DB failed, using localStorage', err);
      }

      // 2. Fallback ke localStorage jika DB kosong/error
      const savedSettings = localStorage.getItem('cuss_refresh_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setDashboardInterval(parsed.dashboard || 30);
          setPengajuanInterval(parsed.pengajuan || 60);
          setAutoRefreshEnabled(parsed.enabled ?? true);
        } catch (e) {}
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
       const settings = {
          dashboard: dashboardInterval,
          pengajuan: pengajuanInterval,
          enabled: autoRefreshEnabled
       };

       // 1. Simpan ke Database (Supabase)
       const { error: dbError } = await supabase
         .from('PengaturanSistem')
         .upsert(
           { kunci: 'refresh_settings', nilai: settings as any },
           { onConflict: 'kunci' }
         );
       
       if (dbError) throw dbError;

       // 2. Jika berhasil ke DB, baru simpan ke localStorage untuk penggunaan lokal cepat
       localStorage.setItem('cuss_refresh_settings', JSON.stringify(settings));

       setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
    } catch (err) {
       setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
    } finally {
       setIsSaving(false);
       setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* HEADER COMPONENT */}
      <div className="border-b border-gray-100 px-8 py-6 relative overflow-hidden bg-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h2 className="text-[20px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Refresh Otomatis
             </h2>
             <p className="text-[13px] text-gray-500 font-medium mt-1">Perbarui interval sinkronisasi data dari server.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-shrink-0 px-5 py-2.5 bg-emerald-500 text-white font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 active:scale-95 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <div className="p-8">
        {message && (
           <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 font-medium text-[13px] animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                 {message.type === 'success' ? '✓' : '!'}
              </div>
              {message.text}
           </div>
        )}

        <div className="space-y-10">
           {/* Master Switch */}
           <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div>
                 <h3 className="text-[15px] font-bold text-gray-900 mb-1">Aktifkan Refresh Otomatis</h3>
                 <p className="text-[13px] text-gray-500">Jika dimatikan, semua modul harus direfresh secara manual.</p>
              </div>
              <button 
                 onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                 className={`w-14 h-8 rounded-full transition-colors flex items-center p-1 cursor-pointer ${autoRefreshEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                 <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${autoRefreshEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
           </div>

           <div className={`transition-all duration-500 ${!autoRefreshEnabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <div className="space-y-10">
                 {/* Dashboard Setting */}
                 <div>
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-[14px] font-bold text-gray-800">Interval Refresh Dashboard</h3>
                       <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-[12px] rounded-lg border border-emerald-100">
                          {dashboardInterval} Detik
                       </span>
                    </div>
                    <p className="text-[13px] text-gray-500 mb-6">Seberapa sering parameter grafik dan statistik di Dashboard diperbarui.</p>
                    <input 
                       type="range" 
                       min="10" max="300" step="10"
                       value={dashboardInterval}
                       onChange={(e) => setDashboardInterval(parseInt(e.target.value))}
                       className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    />
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-3 uppercase tracking-wider">
                       <span>Cepat (10s)</span>
                       <span>Lambat (5 Menit)</span>
                    </div>
                 </div>

                 <hr className="border-gray-100" />

                 {/* Pengajuan Setting */}
                 <div>
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-[14px] font-bold text-gray-800">Interval Kelola Pengajuan</h3>
                       <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-[12px] rounded-lg border border-emerald-100">
                          {pengajuanInterval} Detik
                       </span>
                    </div>
                    <p className="text-[13px] text-gray-500 mb-6">Waktu tunggu pengecekan pengajuan dokumen masuk yang baru secara mendadak.</p>
                    <input 
                       type="range" 
                       min="10" max="300" step="10"
                       value={pengajuanInterval}
                       onChange={(e) => setPengajuanInterval(parseInt(e.target.value))}
                       className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                    />
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-3 uppercase tracking-wider">
                       <span>Cepat (10s)</span>
                       <span>Lambat (5 Menit)</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
