'use client';
import { useState, useEffect, useMemo } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import NotificationModal, { NotificationType } from '@/components/NotificationModal';
import { useAdminData } from '../AdminDataContext';

const MapComponent = dynamic(() => import('@/components/profil/MapComponent'), { ssr: false });

type Warga = {
  id: string;
  nik: string;
  nama: string;
  jenis_kelamin: string;
  nomor_telepon: string | null;
  alamat: string | null;
  rt: string | null;
  rw: string | null;
  agama: string | null;
  pekerjaan: string | null;
  foto: string | null;
  titik_maps: string | null;
  created_at: string;
  status?: 'Aktif' | 'Nonaktif';
  password?: string | null;
};

export default function AdminWargaPage() {
  const { 
    wargaList, 
    loadingWarga: loadingContext, 
    refreshWarga: fetchWarga
  } = useAdminData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarga, setSelectedWarga] = useState<Warga | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState<'profil' | 'aksi'>('profil');
  const [resettingPwd, setResettingPwd] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Client-side pagination state
  const [displayLimit, setDisplayLimit] = useState(100);
  const [isPaginating, setIsPaginating] = useState(false);
  const loading = loadingContext || isPaginating;

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const [adminToast, setAdminToast] = useState<{ show: boolean, message: string } | null>(null);
  const [isAdminToastHovered, setIsAdminToastHovered] = useState(false);

  useEffect(() => {
    if (adminToast?.show && !isAdminToastHovered) {
      const timer = setTimeout(() => setAdminToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [adminToast, isAdminToastHovered]);
  
  const supabase = createBrowserSupabase();

  const parseCoord = (str: string | undefined | null) => {
    if (!str) return null;
    try {
      if (str.startsWith('{')) return JSON.parse(str);
      const [lat, lng] = str.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    } catch (e) { return null; }
    return null;
  };

  const handleResetPassword = async () => {
    if (!selectedWarga) return;
    setResettingPwd(true);

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wargaId: selectedWarga.id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setNewPassword(data.newPassword);
        fetchWarga(true);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Gagal Reset Sandi',
        message: 'Terjadi kendala saat mengatur ulang kata sandi. Silakan coba lagi.'
      });
    }
    setResettingPwd(false);
  };

  const handleToggleStatus = async () => {
    if (!selectedWarga) return;
    setTogglingStatus(true);
    const nextStatus = selectedWarga.status === 'Nonaktif' ? 'Aktif' : 'Nonaktif';
    
    const { error } = await supabase
      .from('Users')
      .update({ status: nextStatus } as any)
      .eq('id', selectedWarga.id);

    if (!error) {
      setSelectedWarga({ ...selectedWarga, status: nextStatus });
      fetchWarga(true); // Silent refresh
    } else {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memperbarui Status',
        message: 'Maaf, perubahan status tidak dapat disimpan saat ini. Silakan coba beberapa saat lagi.'
      });
    }
    setTogglingStatus(false);
  };

  const sendPasswordToWA = () => {
    if (!selectedWarga || !newPassword) return;
    let phone = selectedWarga.nomor_telepon?.replace(/[^0-9]/g, '') || '';
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    else if (phone.startsWith('8')) phone = '62' + phone;

    const message = `Halo *${selectedWarga.nama}*,\n\nBerikut adalah Kata Sandi (Password) baru Anda untuk masuk ke sistem Cepat Urus Surat-Surat (CUSS):\n\nPassword: *${newPassword}*\n\nSilakan gunakan kata sandi ini untuk login dan segera ubah melalui menu Profil demi keamanan akun Anda.\n\nTerima kasih.`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openDrawer = (warga: Warga) => {
    setSelectedWarga(warga);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedWarga(null);
      setIsImageZoomed(false);
      setActiveTab('profil');
      setNewPassword(null);
      setEditingField(null);
    }, 300);
  };

  const handleSaveEdit = async () => {
    if (!selectedWarga || !editingField) return;
    setSaving(true);
    const { error } = await supabase
      .from('Users')
      .update({ [editingField]: editValue } as any)
      .eq('id', selectedWarga.id);

    if (!error) {
      setSelectedWarga({ ...selectedWarga, [editingField]: editValue });
      setEditingField(null);
      fetchWarga(true); // Silent refresh
    } else {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan Perubahan',
        message: 'Terjadi kendala saat menyimpan data profil. Silakan periksa koneksi internet Anda.'
      });
    }
    setSaving(false);
  };

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return wargaList.filter(w => {
      const rtRw = `rt ${w.rt || '0'} / rw ${w.rw || '0'}`.toLowerCase();
      const rtRwSimple = `${w.rt || '0'} / ${w.rw || '0'}`.toLowerCase();
      
      return (
        w.nama.toLowerCase().includes(q) || 
        w.nik.includes(q) ||
        (w.jenis_kelamin || '').toLowerCase().includes(q) ||
        (w.nomor_telepon || '').includes(q) ||
        (w.alamat || '').toLowerCase().includes(q) ||
        (w.rt || '').includes(q) ||
        (w.rw || '').includes(q) ||
        rtRw.includes(q) ||
        rtRwSimple.includes(q) ||
        (w.agama || '').toLowerCase().includes(q) ||
        (w.pekerjaan || '').toLowerCase().includes(q)
      );
    });
  }, [wargaList, searchQuery]);

  const displayedList = useMemo(() => {
    return filteredList.slice(0, displayLimit);
  }, [filteredList, displayLimit]);

  const hasMoreWarga = displayLimit < filteredList.length;

  const loadMoreWarga = () => {
    setIsPaginating(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 100);
      setIsPaginating(false);
    }, 400);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-200">
      
      {/* Header Section */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Master Data Warga</h1>
          <p className="text-gray-500 mt-1 text-[15px]">Basis data penduduk yang terintegrasi dengan layanan digital desa.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
             <input 
               type="text" 
               placeholder="Cari Data Warga" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-[14px] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full min-w-[300px]" 
             />
             <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <button 
            onClick={() => fetchWarga()} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[13px] uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-semibold w-[20%]">Tgl Registrasi</th>
                <th className="px-6 py-4 font-semibold w-[30%]">Nama Lengkap</th>
                <th className="px-6 py-4 font-semibold w-[15%]">Gender</th>
                <th className="px-6 py-4 font-semibold w-[25%]">Alamat RT / RW</th>
                <th className="px-6 py-4 font-semibold text-right w-[10%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && displayedList.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                        <div className="h-4 w-40 bg-gray-100 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-6 w-20 bg-gray-100 rounded-full"></div></td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-100 rounded-lg"></div>
                        <div className="h-3 w-16 bg-gray-50 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right"><div className="h-8 w-16 bg-gray-100 rounded-lg ml-auto"></div></td>
                  </tr>
                ))
              ) : displayedList.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">Data warga tidak ditemukan.</td>
                </tr>
              ) : (
                displayedList.map((warga) => (
                  <tr 
                    key={warga.id} 
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => openDrawer(warga)}
                  >
                     <td className="px-6 py-4 whitespace-nowrap text-[14px] text-gray-600">
                        {format(new Date(warga.created_at), 'dd MMM yyyy', { locale: localeID })}
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gray-50 text-emerald-600 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-emerald-100 shadow-sm">
                              {warga.foto ? (
                                 <img src={warga.foto} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                 <span className="uppercase">{warga.nama.charAt(0)}</span>
                              )}
                           </div>
                            <div className="flex flex-col">
                               <div className="flex items-center gap-2">
                                  <p className="text-[14px] font-bold text-gray-800 break-words leading-tight">{warga.nama}</p>
                                  {warga.status === 'Nonaktif' && (
                                     <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Akun Dinonaktifkan"></span>
                                  )}
                               </div>
                               {warga.status === 'Nonaktif' && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Nonaktif</span>}
                            </div>
                        </div>
                     </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-tight ${!warga.jenis_kelamin ? 'bg-gray-50 text-gray-400 border border-gray-100' : warga.jenis_kelamin?.toLowerCase() === 'laki-laki' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-pink-50 text-pink-600 border border-pink-100'}`}>
                          {!warga.jenis_kelamin ? '-' : (warga.jenis_kelamin?.toLowerCase() === 'laki-laki' ? 'LAKI-LAKI' : 'PEREMPUAN')}
                        </span>
                      </td>
                     <td className="px-6 py-4">
                        <p className="text-[14px] font-medium text-gray-700 truncate max-w-[200px]" title={warga.alamat || ''}>
                          {warga.alamat || '-'}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          RT {warga.rt || '0'} / RW {warga.rw || '0'}
                        </p>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(warga);
                          }}
                          className="px-4 py-1.5 bg-[#FF7F50] text-white font-bold text-[12px] rounded-lg shadow-sm hover:opacity-90 transition-all active:scale-95"
                        >
                          Detail
                        </button>
                     </td>
                  </tr>
                ))
              )}

              {/* Load More & Skeletons integrated inside Table */}
              {loading && wargaList.length > 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-more-${i}`} className="animate-pulse border-t border-gray-50">
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-gray-50 rounded-lg"></div></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50"></div>
                        <div className="h-4 w-40 bg-gray-50 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-6 w-20 bg-gray-50 rounded-full"></div></td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-50 rounded-lg"></div>
                        <div className="h-3 w-16 bg-gray-50/50 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right"><div className="h-8 w-16 bg-gray-50 rounded-lg ml-auto"></div></td>
                  </tr>
                ))
              ) : hasMoreWarga && filteredList.length > 0 && (
                <tr 
                  className="hover:bg-emerald-50/50 cursor-pointer transition-all duration-300 group border-t border-gray-50"
                  onClick={() => loadMoreWarga()}
                >
                  <td colSpan={5} className="px-6 py-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-[12px] font-bold text-gray-400 group-hover:text-emerald-600 uppercase tracking-[0.2em] transition-colors">Tampilkan 100 Data Berikutnya</span>
                      <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Citizen Detail Drawer */}
      {isDrawerOpen && selectedWarga && createPortal(
        <div className="fixed inset-0 z-[100] flex items-stretch">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={closeDrawer} />
          
          <div className={`ml-auto relative w-full max-w-[500px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300`}>
            
            {/* Header Drawer */}
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-20">
              <div className="flex items-center gap-4">
                <button onClick={closeDrawer} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">Detail Warga</h2>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-8 flex border-b border-gray-50 bg-white sticky top-[80px] z-20">
              <div className="flex gap-6 mt-1.5 px-2">
                 <button 
                   onClick={() => setActiveTab('profil')}
                   className={`flex flex-col items-center gap-2 pb-3 transition-all relative ${activeTab === 'profil' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   <div className={`px-4 py-2 text-[13px] font-bold tracking-tight flex items-center gap-2`}>
                      Profil Warga
                   </div>
                   {activeTab === 'profil' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in duration-300" />}
                 </button>
                 <button 
                   onClick={() => { setActiveTab('aksi'); setNewPassword(null); }}
                   className={`flex flex-col items-center gap-2 pb-3 transition-all relative ${activeTab === 'aksi' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   <div className={`px-4 py-2 text-[13px] font-bold tracking-tight flex items-center gap-2`}>
                      Aksi Lanjutan
                   </div>
                   {activeTab === 'aksi' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full animate-in fade-in zoom-in duration-300" />}
                 </button>
              </div>
            </div>

            {/* Content Drawer */}
            <div className="flex-1 overflow-y-auto bg-gray-50/20">
              <div className="p-8 pb-12">
                
                {activeTab === 'profil' ? (
                  /* SINGLE CONSOLIDATED CARD */
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-emerald-50/50 space-y-8 relative overflow-hidden">
                   {/* Background Glow */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none"></div>
                   
                   {/* 1. Avatar (Circle) with Gender Badge */}
                   <div className="flex flex-col items-center pt-2">
                      <div className="relative group">
                        <div 
                          onClick={() => selectedWarga.foto && setIsImageZoomed(true)}
                           className={`w-[130px] h-[130px] rounded-full bg-gray-50 border-[6px] border-white shadow-lg overflow-hidden flex items-center justify-center relative ${selectedWarga.foto ? 'cursor-zoom-in' : ''}`}
                        >
                           {selectedWarga.foto ? (
                              <img src={selectedWarga.foto} alt="Foto Profil" className="w-full h-full object-cover" />
                           ) : (
                              <span className="text-[48px] font-black text-emerald-600 uppercase">{selectedWarga.nama.charAt(0)}</span>
                           )}
                           {selectedWarga.foto && (
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m4-3H7"></path></svg>
                             </div>
                           )}
                        </div>
                        
                        {/* Gender Badge - Hover-responsive */}
                         <div className={`absolute bottom-1 right-1 px-2.5 py-1.5 rounded-2xl font-black text-[12px] shadow-lg border-4 border-white z-10 ${selectedWarga.jenis_kelamin?.toLowerCase() === 'laki-laki' ? 'bg-white text-blue-600' : 'bg-white text-pink-600'}`}>
                           {selectedWarga.jenis_kelamin?.toLowerCase() === 'laki-laki' ? 'LK' : 'PR'}
                        </div>
                      </div>
                   </div>

                     <div className="flex flex-col gap-6">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                             <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Nama Lengkap</p>
                             {editingField !== 'nama' && (
                                <button 
                                  onClick={() => { setEditingField('nama'); setEditValue(selectedWarga.nama); }}
                                  className="text-gray-300 hover:text-emerald-600 transition-colors"
                                >
                                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                             )}
                          </div>
                          {editingField === 'nama' ? (
                             <div className="flex items-center gap-2">
                                <input 
                                   type="text" 
                                   value={editValue} 
                                   onChange={(e) => setEditValue(e.target.value)}
                                   className="w-full bg-gray-50 border border-emerald-100 rounded-lg px-3 py-1.5 text-[14px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                   autoFocus
                                />
                                <div className="flex items-center gap-1">
                                   <button onClick={handleSaveEdit} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                   </button>
                                   <button onClick={() => setEditingField(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                   </button>
                                </div>
                             </div>
                          ) : (
                             <p className="text-[14px] font-bold text-gray-600 break-words leading-tight">{selectedWarga.nama}</p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                             <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">NIK Warga</p>
                             {editingField !== 'nik' && (
                                <button 
                                  onClick={() => { setEditingField('nik'); setEditValue(selectedWarga.nik); }}
                                  className="text-gray-300 hover:text-emerald-600 transition-colors"
                                >
                                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                             )}
                          </div>
                          {editingField === 'nik' ? (
                             <div className="flex items-center gap-2">
                                <input 
                                   type="text" 
                                   value={editValue} 
                                   onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
                                      setEditValue(val);
                                   }}
                                   className="w-full bg-gray-50 border border-emerald-100 rounded-lg px-3 py-1.5 text-[14px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                   placeholder="Masukkan 16 digit NIK"
                                   autoFocus
                                />
                                <div className="flex items-center gap-1">
                                   <button 
                                     onClick={handleSaveEdit} 
                                     disabled={editValue.length !== 16 || saving}
                                     className={`p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed`}
                                   >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                   </button>
                                   <button onClick={() => setEditingField(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                   </button>
                                </div>
                             </div>
                          ) : (
                             <p className="text-[14px] font-bold text-gray-600 tracking-widest leading-none">{selectedWarga.nik}</p>
                          )}
                        </div>
                     </div>

                   {/* Map Implementation - Clickable */}
                   <div className="space-y-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lokasi Geografis</p>
                      <div 
                        onClick={() => {
                          const pos = parseCoord(selectedWarga.titik_maps);
                          if (pos) window.open(`https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`, '_blank');
                        }}
                        className={`aspect-[16/10] rounded-3xl border border-gray-100 overflow-hidden relative shadow-sm group transition-all duration-500 ${parseCoord(selectedWarga.titik_maps) ? 'cursor-pointer hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-50' : 'bg-gray-50'}`}
                      >
                        {parseCoord(selectedWarga.titik_maps) ? (
                          <div className="absolute inset-0">
                            <MapComponent previewOnly={true} initialPos={parseCoord(selectedWarga.titik_maps)} />
                            <div className="absolute inset-0 bg-transparent group-hover:bg-emerald-600/5 transition-colors pointer-events-none" />
                            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded-lg px-2.5 py-1 shadow-md text-[9px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                Buka Google Maps
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center opacity-40">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Titik Lokasi Kosong</span>
                          </div>
                        )}
                      </div>
                   </div>

                   {/* Domicile Information */}
                   <div className="space-y-6 pt-2">
                       <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Alamat Domisili Terdaftar</p>
                          <p className="text-[14px] font-bold text-gray-600 leading-relaxed">{selectedWarga.alamat || 'Alamat tidak tersedia'}</p>
                       </div>

                       <div className="space-y-5">
                          <div>
                             <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">RT / RW</p>
                             <p className="text-[14px] font-bold text-gray-600">{selectedWarga.rt || '0'} <span className="text-gray-200 mx-1">/</span> {selectedWarga.rw || '0'}</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Agama</p>
                             <p className="text-[14px] font-bold text-gray-600">{selectedWarga.agama || '-'}</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Pekerjaan Utama</p>
                             <p className="text-[14px] font-bold text-gray-600">{selectedWarga.pekerjaan || '-'}</p>
                          </div>
                       </div>
                   </div>

                   {/* WhatsApp Info & Contact Action */}
                   <div className="pt-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Kontak Utama</p>
                      <div className="flex items-center justify-between gap-4">
                         <p className="text-[14px] font-bold text-gray-800 leading-tight">
                            {selectedWarga.nomor_telepon ? (() => {
                               let cleaned = selectedWarga.nomor_telepon.replace(/[^0-9]/g, '');
                               if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
                               else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
                               return `${cleaned.substring(0, 5)} ${cleaned.substring(5, 9)} ${cleaned.substring(9)}`.trim();
                            })() : '-'}
                         </p>
                         <button 
                           onClick={() => window.open(`https://wa.me/${selectedWarga.nomor_telepon?.replace(/[^0-9]/g, '')}`, '_blank')}
                           className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase transition-all active:scale-95 hover:bg-emerald-600 hover:text-white"
                         >
                            Hubungi
                         </button>
                      </div>
                   </div>

                   {/* Footer Info Integrated in Card */}
                   <div className="pt-4 border-t border-gray-50">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center">
                        Terdaftar pada: {format(new Date(selectedWarga.created_at), 'dd MMMM yyyy HH:mm', { locale: localeID })}
                      </p>
                   </div>
                  </div>
                ) : (
                  /* AKSI LANJUTAN SECTION */
                  <div className="space-y-6">
                    {/* Status Akun */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                       <div className="p-6 flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${selectedWarga.status === 'Nonaktif' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                             {selectedWarga.status === 'Nonaktif' ? (
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                             ) : (
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                             )}
                          </div>
                          <div className="flex-1">
                             <div className="flex items-center justify-between mb-1.5">
                                <h3 className="text-[15px] font-bold text-gray-800">Status Akses Akun</h3>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase tracking-tight ${selectedWarga.status === 'Nonaktif' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {selectedWarga.status || 'Aktif'}
                                </span>
                             </div>
                             <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-4">
                               {selectedWarga.status === 'Nonaktif' 
                                 ? 'Akun ini sedang ditangguhkan. Warga tidak dapat masuk ke sistem sampai diaktifkan kembali.' 
                                 : 'Warga memiliki akses penuh ke sistem. Admin dapat membatasi akses jika diperlukan.'}
                             </p>
                             <button 
                                disabled={togglingStatus}
                                onClick={() => {
                                  const isNonaktif = selectedWarga.status === 'Nonaktif';
                                  setNotification({
                                    isOpen: true,
                                    type: isNonaktif ? 'info' : 'warning',
                                    title: isNonaktif ? 'AKTIFKAN AKUN' : 'NONAKTIFKAN AKUN',
                                    message: isNonaktif 
                                      ? `Anda akan membuka kembali akses sistem untuk ${selectedWarga.nama}. Lanjutkan?`
                                      : `Warga ${selectedWarga.nama} tidak akan bisa mengakses sistem selama akun dinonaktifkan. Anda yakin?`,
                                    onConfirm: handleToggleStatus
                                  });
                                }}
                                className={`w-full py-3 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${selectedWarga.status === 'Nonaktif' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 active:scale-95' : 'bg-red-50 text-red-600 hover:bg-red-100 active:scale-95'}`}
                             >
                               {togglingStatus ? (
                                 <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               ) : selectedWarga.status === 'Nonaktif' ? 'Aktifkan Kembali' : 'Nonaktifkan Sekarang'}
                             </button>
                          </div>
                       </div>
                    </div>

                    {/* Keamanan & Sandi */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                       <div className="p-6 flex items-start gap-4">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-gray-200 bg-gray-50 text-gray-500 shadow-sm">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                          </div>
                          <div className="flex-1">
                             <h3 className="text-[15px] font-bold text-gray-800 mb-1.5">Keamanan & Sandi</h3>
                             <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-5">
                               Ganti kata sandi akses 2-step warga. Gunakan fitur ini jika warga lupa password atau untuk keperluan darurat.
                             </p>
                             
                             {newPassword ? (
                               <div className="space-y-4 animate-in zoom-in-95 duration-300">
                                  <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 shadow-inner">
                                    <code className="text-[18px] font-bold text-gray-900 tracking-[0.1em]">{newPassword}</code>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(newPassword);
                                        setAdminToast({ show: true, message: 'Password warga berhasil disalin!' });
                                      }}
                                      className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"
                                      title="Salin Password"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                    </button>
                                  </div>
                                  <button 
                                    onClick={sendPasswordToWA}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.408 0 12.044c0 2.123.555 4.197 1.61 6.011l-1.71 6.244 6.389-1.675a11.85 11.85 0 005.753 1.493h.005c6.635 0 12.046-5.41 12.05-12.046a11.83 11.83 0 00-3.415-8.361" /></svg>
                                    Kirim via WhatsApp
                                  </button>
                                  <p className="text-[10px] text-gray-400 font-bold italic text-center uppercase tracking-wider">Gunakan tombol di atas untuk mengirim akses warga</p>
                                </div>
                              ) : (
                                <button 
                                  disabled={resettingPwd}
                                  onClick={() => {
                                    setNotification({
                                      isOpen: true,
                                      type: 'warning',
                                      title: 'KONFIRMASI RESET',
                                      message: `Anda akan mereset sandi warga ${selectedWarga.nama}.\nKonfirmasi untuk generate sandi baru secara acak.`,
                                      onConfirm: handleResetPassword
                                    });
                                  }}
                                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-[13px] font-bold hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                  {resettingPwd ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  ) : 'Generate Sandi Baru'}
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <NotificationModal 
            isOpen={notification.isOpen}
            onClose={() => setNotification({ ...notification, isOpen: false })}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onConfirm={notification.onConfirm}
            buttonText="KONFIRMASI"
            cancelText="BATAL"
          />

          {/* Floating Toast Notification (Admin) */}
          {adminToast?.show && createPortal(
            <div 
              className="fixed top-8 right-8 z-[300] w-[calc(100%-48px)] max-w-[360px] animate-in slide-in-from-top-10 duration-500"
              onMouseEnter={() => setIsAdminToastHovered(true)}
              onMouseLeave={() => setIsAdminToastHovered(false)}
              onTouchStart={() => setIsAdminToastHovered(true)}
              onTouchEnd={() => setIsAdminToastHovered(false)}
            >
               <div className={`group cursor-pointer bg-white rounded-full hover:rounded-2xl active:rounded-2xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] flex items-center justify-between p-1.5 pl-6 border border-gray-100 backdrop-blur-xl transition-all gap-2 duration-300 ${isAdminToastHovered ? 'scale-[1.02]' : 'scale-100'}`}>
                  <p className="text-[13px] font-normal text-gray-500 line-clamp-1 group-hover:line-clamp-none group-active:line-clamp-none flex-1 transition-all">
                     {adminToast.message}
                  </p>
                  <div className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-normal border border-emerald-100 shrink-0">
                     BERHASIL
                  </div>
               </div>
            </div>,
            document.body
          )}

          {/* Image Zoom Overlay */}
          {isImageZoomed && selectedWarga.foto && (
            <div 
              className="fixed inset-0 z-[110] bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-10 animate-in fade-in duration-300"
              onClick={() => setIsImageZoomed(false)}
            >
              <button className="absolute top-10 right-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <img 
                src={selectedWarga.foto} 
                alt="Zoomed Avatar" 
                className="max-w-full max-h-full rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500 shadow-emerald-900/40"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
