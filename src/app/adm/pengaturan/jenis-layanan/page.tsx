'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useAdminData } from '@/app/adm/AdminDataContext';

export default function JenisLayananPage() {
  const { setGlobalToast } = useAdminData();
  const supabase = createBrowserSupabase();
  const [layanan, setLayanan] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newLayanan, setNewLayanan] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
  
  // Load data
  useEffect(() => {
    // 1. Load initial data from DB or cache
    loadData();

    // 2. Setup Real-time Listener
    const channel = supabase
      .channel('layanan-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'PengaturanSistem', filter: 'kunci=eq.jenis_layanan_surat' },
        (payload: any) => {
          if (payload.new && payload.new.nilai) {
            setLayanan(payload.new.nilai as string[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    // Attempt to load from cache first for instant feel
    const cached = localStorage.getItem('cuss_layanan_cache');
    if (cached) {
      setLayanan(JSON.parse(cached));
      setIsLoading(false);
    }

    try {
      const { data, error } = await supabase
        .from('PengaturanSistem')
        .select('*')
        .eq('kunci', 'jenis_layanan_surat')
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data && data.nilai) {
        const freshData = data.nilai as string[];
        setLayanan(freshData);
        localStorage.setItem('cuss_layanan_cache', JSON.stringify(freshData));
      } else if (!cached) {
        // Only set defaults if no cache exists
        const defaults = [
          'Surat Keterangan Usaha (SKU)',
          'Surat Keterangan Domisili',
          'Surat Keterangan Tidak Mampu (SKTM)',
          'Surat Pengantar Nikah',
          'Surat Keterangan Kematian'
        ];
        setLayanan(defaults);
        localStorage.setItem('cuss_layanan_cache', JSON.stringify(defaults));
      }
    } catch (error) {
      console.error('Error loading jenis layanan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedLayanan: string[]) => {
    setIsSaving(true);
    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('PengaturanSistem')
        .select('id')
        .eq('kunci', 'jenis_layanan_surat')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('PengaturanSistem')
          .update({ nilai: updatedLayanan as any, updated_at: new Date().toISOString() })
          .eq('kunci', 'jenis_layanan_surat');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('PengaturanSistem')
          .insert([{ kunci: 'jenis_layanan_surat', nilai: updatedLayanan as any }] as any);
        if (error) throw error;
      }

      setLayanan(updatedLayanan);
      setGlobalToast({ show: true, type: 'success', label: 'BERHASIL', message: 'Jenis layanan surat telah diperbarui.' });
    } catch {
      setGlobalToast({ 
        show: true, 
        type: 'error', 
        label: 'GAGAL', 
        message: 'Tidak dapat menyimpan perubahan. Silakan periksa koneksi internet Anda atau coba beberapa saat lagi.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayanan.trim()) return;
    
    // Prevent duplicates
    if (layanan.includes(newLayanan.trim())) {
      setGlobalToast({ show: true, type: 'error', label: 'DUPLIKAT', message: 'Jenis layanan ini sudah ada dalam daftar.' });
      return;
    }
    
    const updated = [...layanan, newLayanan.trim()];
    setNewLayanan('');
    handleSave(updated);
  };

  const handleDelete = (index: number) => {
    if (!confirm('Hapus jenis layanan ini?')) return;
    const updated = layanan.filter((_, i) => i !== index);
    handleSave(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires some data to be set
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnter = (index: number) => {
    if (draggedItemIndex === index) return;
    setDragOverItemIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedItemIndex !== null && dragOverItemIndex !== null && draggedItemIndex !== dragOverItemIndex) {
      const newLayanan = [...layanan];
      const item = newLayanan.splice(draggedItemIndex, 1)[0];
      newLayanan.splice(dragOverItemIndex, 0, item);
      handleSave(newLayanan);
    }
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="border-b border-gray-100 px-8 py-6 relative overflow-hidden bg-white">
        <div className="relative z-10">
          <h2 className="text-[20px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Jenis Layanan Surat
          </h2>
          <p className="text-[13px] text-gray-500 font-medium mt-1">
            Daftar ini akan ditampilkan di formulir pengajuan warga. Opsi "Lainnya" akan otomatis ditambahkan di aplikasi warga.
          </p>
        </div>
      </div>

      <div className="p-8">
        {/* ADD NEW FORM */}
        <form onSubmit={handleAdd} className="mb-8 relative max-w-lg flex gap-3">
           <input 
              type="text" 
              placeholder="Contoh: Surat Pengantar SKCK" 
              value={newLayanan}
              onChange={(e) => setNewLayanan(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              disabled={isSaving || isLoading}
           />
           <button 
              type="submit"
              disabled={!newLayanan.trim() || isSaving || isLoading}
              className="px-5 py-3 bg-emerald-500 text-white font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <Plus className="w-4 h-4" />
              Tambah
           </button>
        </form>

        {/* LIST SECTION */}
        <div className="space-y-4">
           <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 rounded-t-xl flex items-center justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <span>Daftar Layanan Tersedia</span>
              <span>Aksi</span>
           </div>
           
           <div className="divide-y divide-gray-50 bg-white border border-gray-50 rounded-b-xl shadow-sm">
               {isLoading && layanan.length === 0 ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="p-5 h-16 bg-white relative overflow-hidden">
                       <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gray-50/50 to-transparent"></div>
                       <div className="flex items-center gap-4">
                          <div className="w-5 h-5 bg-gray-50 rounded"></div>
                          <div className="h-4 bg-gray-50 rounded w-1/2"></div>
                       </div>
                    </div>
                  ))
               ) : layanan.length === 0 ? (
                 <div className="p-12 text-center text-gray-400">
                    <p className="text-[13px] font-medium italic">Belum ada jenis layanan yang diatur.</p>
                 </div>
              ) : layanan.map((item, index) => (
                 <div 
                    key={item} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`p-4 flex items-center justify-between gap-4 transition-all group cursor-grab active:cursor-grabbing ${
                       draggedItemIndex === index ? 'opacity-40 bg-gray-100 scale-[0.99]' : 
                       dragOverItemIndex === index ? 'bg-emerald-50 border-t-2 border-emerald-500 shadow-sm z-10' : 'hover:bg-gray-50/50'
                    }`}
                 >
                    <div className="flex items-center gap-4 pointer-events-none">
                       <div className="text-gray-300">
                          <GripVertical className="w-5 h-5" />
                       </div>
                       <h3 className="text-[14px] font-semibold text-gray-800">{item}</h3>
                    </div>

                    <button 
                       onClick={() => handleDelete(index)}
                       disabled={isSaving}
                       className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 pointer-events-auto"
                       title="Hapus"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              ))}
              
              {/* Opsi Lainnya Indicator */}
              {!isLoading && (
                <div className="p-4 flex items-center justify-between gap-4 bg-gray-50/50 border-t border-dashed border-gray-200">
                    <div className="flex items-center gap-4">
                       <div className="w-5 h-5"></div>
                       <div>
                          <h3 className="text-[14px] font-semibold text-gray-500 italic">Lainnya...</h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">Opsi ini otomatis ditambahkan untuk mengakomodasi kebutuhan lain.</p>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
