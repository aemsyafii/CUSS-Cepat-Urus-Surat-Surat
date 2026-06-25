'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import GlobalToast from '@/components/GlobalToast';

type Warga = any;
type Surat = any;

interface AdminDataContextType {
  suratList: Surat[];
  wargaList: Warga[];
  statsSurat: any[];
  loadingSurat: boolean;
  loadingWarga: boolean;
  loadingStats: boolean;
  refreshSurat: (silent?: boolean) => Promise<void>;
  refreshWarga: (silent?: boolean) => Promise<void>;
  updateSuratInList: (id: string, updates: any) => void;
  templateCache: Record<string, Blob>;
  setTemplateCache: (name: string, blob: Blob) => void;
  globalToast: { show: boolean; message: string; type: 'success' | 'error' | 'info'; label: string } | null;
  setGlobalToast: (toast: any | null) => void;
  // Storage Management
  storageStats: { dokumenCount: number; arsipCount: number; oldDokumenCount: number; oldArsipCount: number } | null;
  storageSettings: { enabled: boolean; retention: number } | null;
  loadingStorage: boolean;
  refreshStorage: (days?: number) => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [suratList, setSuratList] = useState<Surat[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [statsSurat, setStatsSurat] = useState<any[]>([]);
  const [loadingSurat, setLoadingSurat] = useState(true);
  const [loadingWarga, setLoadingWarga] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [globalToast, setGlobalToast] = useState<any | null>(null);
  const [templateCache, setTemplateCacheState] = useState<Record<string, Blob>>({});
  
  // Storage Management States
  const [storageStats, setStorageStats] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cuss_storage_stats');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [storageSettings, setStorageSettings] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cuss_cleanup_settings');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [loadingStorage, setLoadingStorage] = useState(true);

  const setTemplateCache = (name: string, blob: Blob) => {
    setTemplateCacheState(prev => ({ ...prev, [name]: blob }));
  };

  const supabase = createBrowserSupabase();

  const fetchStatsSurat = async () => {
    // Tidak dipakai lagi — data stats di-derive dari suratList
    // Fungsi ini dipertahankan untuk kompatibilitas interface context
  };

  const refreshSurat = async (silent = false) => {
    if (!silent) setLoadingSurat(true);
    
    const { data, error } = await supabase
      .from('Surat')
      .select(`
        id, pemohon_id, jenis_surat, status, created_at, subjek, no_pengajuan, no_surat, updated_at,
        tanggal_disetujui, is_mewakili, nama_subjek,
        pemohon:Users!pemohon_id(nama, nik, jenis_kelamin, foto)
      `)
      .order('created_at', { ascending: false });


    if (error) {
      console.error('Error fetching Surat:', error.message || error.code || JSON.stringify(error));
      setGlobalToast({ 
        show: true, 
        type: 'error', 
        label: 'GAGAL', 
        message: 'Gagal memuat data terbaru. Silakan muat ulang halaman.' 
      });
    }
    if (!error && data) {
      setSuratList(data);
      setStatsSurat(data);
    }
    setLoadingSurat(false);
    setLoadingStats(false);
  };

  const refreshWarga = async (silent = false) => {
    if (!silent) setLoadingWarga(true);
    
    const { data, error } = await supabase
      .from('Users')
      .select('id, nik, nama, jenis_kelamin, status, role, created_at, foto, alamat, rt, rw, nomor_telepon, agama, pekerjaan, titik_maps')
      .eq('role', 'warga')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWargaList(data.map((w: any) => ({ ...w, status: w.status || 'Aktif' })));
    }
    setLoadingWarga(false);
  };
  
  const updateSuratInList = (id: string, updates: any) => {
    setSuratList(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setStatsSurat(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const refreshStorage = async (providedDays?: number) => {
    setLoadingStorage(true);
    try {
      // 1. Settings
      let days = providedDays;
      if (days === undefined) {
        const { data } = await supabase.from('PengaturanSistem').select('nilai').eq('kunci', 'cleanup_settings').single();
        const setting = data as { nilai: { enabled: boolean; retention: number } } | null;
        if (setting?.nilai) {
          setStorageSettings(setting.nilai);
          localStorage.setItem('cuss_cleanup_settings', JSON.stringify(setting.nilai));
          days = setting.nilai.retention;
        }
      }
      
      const finalDays = days || 30;

      // 2. Stats
      const { data: dokumenFiles } = await supabase.storage.from('dokumen_lampiran').list('');
      const { data: arsipFiles } = await supabase.storage.from('arsip_surat').list('');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - finalDays);

      const oldDokumen = (dokumenFiles || []).filter((f: any) => f.created_at && new Date(f.created_at) < cutoffDate);
      const oldArsip = (arsipFiles || []).filter((f: any) => f.created_at && new Date(f.created_at) < cutoffDate);

      const newStats = {
        dokumenCount: dokumenFiles?.length || 0,
        arsipCount: arsipFiles?.length || 0,
        oldDokumenCount: oldDokumen.length,
        oldArsipCount: oldArsip.length
      };

      setStorageStats(newStats);
      localStorage.setItem('cuss_storage_stats', JSON.stringify(newStats));
    } catch (err) {
      console.error('Failed to refresh storage:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  useEffect(() => {
    Promise.all([
      refreshSurat(),
      refreshWarga(),
      refreshStorage()
    ]);

    // Realtime: satu listener untuk Surat, panggil satu fungsi saja
    const suratChannel = supabase
      .channel('admin_surat_cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Surat' }, () => {
        refreshSurat(true); // ← satu call, sudah include stats
      })
      .subscribe();

    const wargaChannel = supabase
      .channel('admin_warga_cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Users' }, () => refreshWarga(true))
      .subscribe();

    return () => {
      supabase.removeChannel(suratChannel);
      supabase.removeChannel(wargaChannel);
    };
  }, []);

  return (
    <AdminDataContext.Provider value={{ 
      suratList, wargaList, statsSurat, loadingSurat, loadingWarga, loadingStats,
      refreshSurat, refreshWarga, updateSuratInList, templateCache, setTemplateCache, globalToast, setGlobalToast,
      storageStats, storageSettings, loadingStorage, refreshStorage
    }}>
      {children}
      <GlobalToast
        toast={globalToast}
        onClose={() => setGlobalToast(null)}
      />
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}
