'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useAdminData } from '@/app/adm/AdminDataContext';

export default function OperasionalSettingsPage() {
  const { setGlobalToast } = useAdminData();
  const supabase = createBrowserSupabase();
  const [isSaving, setIsSaving] = useState(false);

  // Default Operational Structure
  const [days, setDays] = useState([
    { id: 1, name: 'Senin', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { id: 2, name: 'Selasa', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { id: 3, name: 'Rabu', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { id: 4, name: 'Kamis', isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { id: 5, name: 'Jumat', isOpen: true, openTime: '08:00', closeTime: '14:30' },
    { id: 6, name: 'Sabtu', isOpen: false, openTime: '00:00', closeTime: '00:00' },
    { id: 0, name: 'Minggu', isOpen: false, openTime: '00:00', closeTime: '00:00' },
  ]);

  const [isHoliday, setIsHoliday] = useState(false);

  useEffect(() => {
    // 1. Prioritaskan ambil dari Database Supabase
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('PengaturanSistem')
          .select('nilai')
          .eq('kunci', 'operasional_settings')
          .single();

        if (!error && data?.nilai) {
          const parsed = data.nilai as any;
          if (parsed.days) setDays(parsed.days);
          if (parsed.isHoliday !== undefined) setIsHoliday(parsed.isHoliday);
          return; // Berhasil ambil dari DB, lewati fallback
        }
      } catch (e) {}

      // 2. Fallback ke localStorage jika DB gagal/kosong
      const saved = localStorage.getItem('cuss_operasional_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.days) setDays(parsed.days);
          if (parsed.isHoliday !== undefined) setIsHoliday(parsed.isHoliday);
        } catch(e) {}
      }
    };

    fetchSettings();
  }, []);

  const handleDayChange = (idx: number, field: string, value: any) => {
    const newDays = [...days];
    newDays[idx] = { ...newDays[idx], [field]: value };
    setDays(newDays);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
       const settings = { days, isHoliday };
       localStorage.setItem('cuss_operasional_settings', JSON.stringify(settings));
       
       try {
         await supabase.from('PengaturanSistem').upsert(
           { kunci: 'operasional_settings', nilai: settings as any },
           { onConflict: 'kunci' }
         );
       } catch {
          // DB save skipped — localStorage fallback aktif
       }

       setGlobalToast({ show: true, type: 'success', label: 'BERHASIL', message: 'Jam operasional berhasil diperbarui!' });
    } catch (err) {
       setGlobalToast({ show: true, type: 'error', label: 'GAGAL', message: 'Gagal memperbarui jam operasional.' });
    } finally {
       setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      {/* HEADER */}
      <div className="border-b border-gray-100 px-8 py-6 relative overflow-hidden bg-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
               Jam Operasional
            </h2>
            <p className="text-[13px] text-gray-500 font-medium mt-1">Atur jadwal layanan operasional digital harian.</p>
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
        {/* Global Holiday Override */}
        <div className={`rounded-2xl border p-6 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 transition-colors ${isHoliday ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-inner shrink-0 ${isHoliday ? 'bg-red-500 text-white shadow-red-700/20' : 'bg-gray-200 text-gray-500'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
               </div>
               <div>
                  <h3 className={`text-[15px] font-bold mb-1 ${isHoliday ? 'text-red-900' : 'text-gray-900'}`}>Mode Libur / Tutup Darurat</h3>
                  <p className={`text-[13px] max-w-sm leading-relaxed ${isHoliday ? 'text-red-700/80' : 'text-gray-500'}`}>
                     Sistem layanan dinyatakan libur. Transaksi pengajuan akan masuk antrean darurat.
                  </p>
               </div>
            </div>

            <button 
               onClick={() => setIsHoliday(!isHoliday)}
               className={`w-14 h-8 rounded-full transition-colors flex items-center p-1 cursor-pointer shrink-0 shadow-inner ${isHoliday ? 'bg-red-500 shadow-red-700/20' : 'bg-gray-300'}`}
            >
               <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isHoliday ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>

        <div className={`transition-opacity duration-300 ${isHoliday ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
           <div className="p-5 border-b border-gray-100 bg-white">
               <h3 className="text-[15px] font-bold text-gray-900 mb-1">Jadwal Operasional Harian</h3>
               <p className="text-[12px] text-gray-500">Tentukan jam pelayanan loket. Di luar jam operasional, status layanan ditandai tutup.</p>
           </div>
           
           <div className="divide-y divide-gray-50 bg-white">
              {days.map((day, idx) => (
                 <div key={day.id} className={`p-4 flex flex-col md:flex-row md:items-center gap-4 transition-colors ${!day.isOpen ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50/20'}`}>
                    {/* Toggle */}
                    <div className="w-36 flex-shrink-0 flex items-center gap-4">
                       <button 
                          onClick={() => handleDayChange(idx, 'isOpen', !day.isOpen)}
                          className={`w-10 h-6 rounded-full transition-colors flex items-center p-1 cursor-pointer ${day.isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}
                       >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${day.isOpen ? 'translate-x-4' : 'translate-x-0'}`} />
                       </button>
                       <span className="font-bold text-[14px] text-gray-800">{day.name}</span>
                    </div>

                    {/* Timeline */}
                     <div className="flex-1 flex items-center gap-4">
                        <div className="relative">
                           <input 
                              type="time" 
                              disabled={!day.isOpen}
                              value={day.openTime}
                              onChange={(e) => handleDayChange(idx, 'openTime', e.target.value)}
                              className="w-28 bg-gray-100 border border-transparent rounded-lg px-3 py-2 text-[12px] font-bold text-gray-700 focus:bg-white focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                           />
                           <p className="absolute -top-2 -left-1 bg-white px-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Buka</p>
                        </div>
                        <div className="w-3 border-b-2 border-gray-200 border-dashed"></div>
                        <div className="relative">
                           <input 
                              type="time" 
                              disabled={!day.isOpen}
                              value={day.closeTime}
                              onChange={(e) => handleDayChange(idx, 'closeTime', e.target.value)}
                              className="w-28 bg-gray-100 border border-transparent rounded-lg px-3 py-2 text-[12px] font-bold text-gray-700 focus:bg-white focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                           />
                           <p className="absolute -top-2 -left-1 bg-white px-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Tutup</p>
                        </div>
                     </div>
                 </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}
