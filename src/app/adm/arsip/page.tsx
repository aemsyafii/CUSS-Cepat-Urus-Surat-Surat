'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useAdminData } from '../AdminDataContext';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { gunzipToText } from '@/lib/compress';
import imageCompression from 'browser-image-compression';
import { 
  Search, 
  RefreshCw, 
  Archive, 
  FileText, 
  Eye, 
  Download, 
  Calendar,
  User,
  Hash,
  ChevronRight,
  ArrowUpDown,
  Filter,
  ExternalLink
} from 'lucide-react';

const supabase = createBrowserSupabase();

function generateNoPengajuan(): string {
  const date = new Date();
  const tzOffset = (date.getTimezoneOffset() + 420) * 60000;
  const localDate = new Date(date.getTime() + tzOffset);
  const dateStr = localDate.toISOString().slice(2, 10).replace(/-/g, '');
  const mapLetter = (digit: string) => {
    const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'J' };
    return map[digit] || digit;
  };
  const prefix = mapLetter(dateStr[0]) + dateStr[1] + mapLetter(dateStr[2]) + dateStr[3] + mapLetter(dateStr[4]) + dateStr[5];
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

export default function ArsipPengajuanPage() {
  const { 
    suratList, 
    loadingSurat, 
    refreshSurat,
    wargaList
  } = useAdminData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurat, setSelectedSurat] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [archivedContent, setArchivedContent] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // States for editing letter number manually
  const [isEditingNoSurat, setIsEditingNoSurat] = useState(false);
  const [editNoSuratValue, setEditNoSuratValue] = useState('');
  const [isSavingNoSurat, setIsSavingNoSurat] = useState(false);

  const handleSaveNoSurat = async () => {
    if (!selectedSurat) return;
    setIsSavingNoSurat(true);
    try {
      const { error } = await supabase
        .from('Surat')
        .update({ no_surat: editNoSuratValue, updated_at: new Date().toISOString() } as any)
        .eq('id', selectedSurat.id);

      if (error) throw error;

      // Update local state and trigger silent sync
      setSelectedSurat((prev: any) => prev ? { ...prev, no_surat: editNoSuratValue } : null);
      await refreshSurat(true);
      setIsEditingNoSurat(false);
    } catch (err) {
      console.error('Gagal memperbarui nomor surat:', err);
    } finally {
      setIsSavingNoSurat(false);
    }
  };

  // Helper to extract numeric number and get next sequential one
  const getNextNoSurat = (list: any[]) => {
    let maxNum = 0;
    let targetLength = 3; // Default padding to 3 digits
    list.forEach(s => {
      if (s.no_surat) {
        const match = s.no_surat.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) {
            maxNum = num;
            targetLength = match[0].length;
          }
        }
      }
    });
    return String(maxNum + 1).padStart(targetLength, '0');
  };

  // State for Add Offline Letter Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [adminUser, setAdminUser] = useState<any | null>(null);

  // Form states for offline letter
  const [offlineJenisSurat, setOfflineJenisSurat] = useState('');
  const [offlineNoSurat, setOfflineNoSurat] = useState('');
  const [offlineWargaType, setOfflineWargaType] = useState<'registered' | 'manual'>('registered');
  const [offlineSelectedWargaId, setOfflineSelectedWargaId] = useState('');
  const [offlineKeperluan, setOfflineKeperluan] = useState('');
  const [offlineTanggal, setOfflineTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [offlineFile, setOfflineFile] = useState<File | null>(null);

  // Manual citizen details
  const [manualNama, setManualNama] = useState('');
  const [manualNik, setManualNik] = useState('');
  const [manualAlamat, setManualAlamat] = useState('');
  const [manualRt, setManualRt] = useState('');
  const [manualRw, setManualRw] = useState('');
  const [manualJenisKelamin, setManualJenisKelamin] = useState('Laki-laki');
  const [manualAgama, setManualAgama] = useState('Islam');
  const [manualPekerjaan, setManualPekerjaan] = useState('');
  const [manualNoTelepon, setManualNoTelepon] = useState('');

  const [isSavingOffline, setIsSavingOffline] = useState(false);

  // Fetch admin and templates when modal opens
  useEffect(() => {
    const loadModalData = async () => {
      // Fetch templates
      const { data: templates } = await supabase
        .from('TemplateSurat')
        .select('nama_template')
        .order('nama_template');
      if (templates) setAvailableTemplates(templates);

      // Fetch current admin DB profile
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('Users')
          .select('id, nama')
          .eq('auth_id', authUser.id)
          .single();
        if (profile) setAdminUser(profile);
      }
    };
    loadModalData();
  }, []);

  // When modal is opened, prefill next sequential number
  const openAddOfflineModal = () => {
    setOfflineNoSurat(getNextNoSurat(suratList));
    setOfflineJenisSurat('');
    setOfflineWargaType('registered');
    setOfflineSelectedWargaId('');
    setOfflineKeperluan('');
    setOfflineTanggal(format(new Date(), 'yyyy-MM-dd'));
    setOfflineFile(null);
    // Reset manual details
    setManualNama('');
    setManualNik('');
    setManualAlamat('');
    setManualRt('');
    setManualRw('');
    setManualJenisKelamin('Laki-laki');
    setManualAgama('Islam');
    setManualPekerjaan('');
    setManualNoTelepon('');
    
    setIsAddModalOpen(true);
  };

  const handleSaveOfflineSurat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineJenisSurat || !offlineNoSurat || !offlineKeperluan) {
      alert('Mohon isi semua data wajib.');
      return;
    }

    if (offlineWargaType === 'registered' && !offlineSelectedWargaId) {
      alert('Mohon pilih warga terdaftar.');
      return;
    }

    if (offlineWargaType === 'manual' && (!manualNama || !manualNik || !manualAlamat)) {
      alert('Mohon isi Nama, NIK, dan Alamat warga.');
      return;
    }

    setIsSavingOffline(true);
    try {
      let uploadedFilePath = null;
      if (offlineFile) {
        let fileToUpload: Blob | File = offlineFile;
        let fileName = `offline_${Date.now()}`;
        
        if (offlineFile.type.startsWith('image/')) {
          try {
            const options = {
              maxSizeMB: 0.4,
              maxWidthOrHeight: 1280,
              useWebWorker: true,
              fileType: 'image/webp'
            };
            const compressedBlob = await imageCompression(offlineFile, options);
            fileToUpload = new File([compressedBlob], `${fileName}.webp`, { type: 'image/webp' });
            fileName = `${fileName}.webp`;
          } catch (err) {
            console.error("Gagal kompresi foto offline admin:", err);
            const fileExt = offlineFile.name.split('.').pop();
            fileName = `${fileName}.${fileExt}`;
          }
        } else {
          const fileExt = offlineFile.name.split('.').pop();
          fileName = `${fileName}.${fileExt}`;
        }

        const { data, error: uploadError } = await supabase.storage
          .from('dokumen_lampiran')
          .upload(fileName, fileToUpload, {
            contentType: fileToUpload.type,
            upsert: true
          });
        if (uploadError) throw uploadError;
        uploadedFilePath = data.path;
      }

      // 1. Persiapkan data pemohon / subjek
      let pemohonId = null;
      let isMewakili = false;
      
      if (offlineWargaType === 'registered') {
        pemohonId = offlineSelectedWargaId;
        isMewakili = false;
      } else {
        // Jika manual/warga baru, pemohon_id diset ke admin yang menginput (sebagai representatif)
        pemohonId = adminUser?.id || null;
        isMewakili = true;
      }

      const selectedDate = new Date(offlineTanggal);

      const insertPayload: any = {
        pemohon_id: pemohonId,
        jenis_surat: offlineJenisSurat,
        keperluan: offlineKeperluan,
        status: 'Selesai',
        no_surat: offlineNoSurat,
        no_pengajuan: generateNoPengajuan(),
        is_mewakili: isMewakili,
        created_at: selectedDate.toISOString(),
        tanggal_diproses: selectedDate.toISOString(),
        tanggal_disetujui: selectedDate.toISOString(),
        dokumen_lampiran: uploadedFilePath ? [uploadedFilePath] : [],
        nama_subjek: isMewakili ? manualNama : null,
        nik_subjek: isMewakili ? manualNik : null,
        alamat_subjek: isMewakili ? manualAlamat : null,
        rt_subjek: isMewakili ? manualRt : null,
        rw_subjek: isMewakili ? manualRw : null,
        jenis_kelamin_subjek: isMewakili ? manualJenisKelamin : null,
      };

      const { data: newSurat, error: insertError } = await supabase
        .from('Surat')
        .insert([insertPayload])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Tambah RiwayatStatus
      await supabase.from('RiwayatStatus').insert([{
        surat_id: newSurat.id,
        status: 'Selesai',
        catatan: 'Dicatat secara offline oleh admin',
        dibuat_oleh: adminUser?.id || null
      }]);

      await refreshSurat(true);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Gagal mencatat surat offline:', err);
      alert('Terjadi kesalahan saat menyimpan data. Silakan coba lagi.');
    } finally {
      setIsSavingOffline(false);
    }
  };

  // Filter only 'Selesai' status for archive
  const arsipList = useMemo(() => {
    return suratList.filter(s => s.status === 'Selesai');
  }, [suratList]);

  const getAtasNama = (surat: any) => {
    if (surat.is_mewakili) {
      return surat.nama_subjek || 'N/A';
    }
    return surat.pemohon?.nama || 'N/A';
  };

  const filteredArsip = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return arsipList.filter(s => {
      const atasNama = getAtasNama(s).toLowerCase();
      const noPengajuan = (s.no_pengajuan || '').toLowerCase();
      const jenisSurat = (s.jenis_surat || '').toLowerCase();
      const noSurat = (s.no_surat || '').toLowerCase();

      return atasNama.includes(query) || 
             noPengajuan.includes(query) || 
             jenisSurat.includes(query) ||
             noSurat.includes(query);
    });
  }, [arsipList, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSurat(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const openArchiveDetail = async (surat: any) => {
    setSelectedSurat(surat);
    setEditNoSuratValue(surat.no_surat || '');
    setIsDrawerOpen(true);
    setIsLoadingContent(true);
    setArchivedContent(null);

    try {
      const { data, error } = await supabase
        .from('ArsipSurat')
        .select('file_path')
        .eq('surat_id', surat.id)
        .maybeSingle();

      if (data?.file_path) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('arsip_surat')
          .download(data.file_path);

        if (fileData) {
          const html = await gunzipToText(fileData);
          setArchivedContent(html);
        }
      }
    } catch (err) {
      console.error('Gagal memuat detail arsip:', err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handlePrint = () => {
    if (!archivedContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Arsip - ${selectedSurat?.no_pengajuan || 'Surat'}</title>
          ${styles}
          <style>
            @page { 
              size: A4; 
              margin: 0 !important; 
            }
            html, body { 
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 210mm !important;
              height: auto !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
                box-sizing: border-box !important;
                box-shadow: none !important;
            }
            .print-container, .docx-wrapper, .docx-render-container {
                background: white !important; 
                padding: 0 !important;
                margin: 0 !important;
                width: 210mm !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
            }
            .docx-render-container div:not(.docx), .docx-wrapper div:not(.docx) {
                background: transparent !important;
                background-color: transparent !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            section.docx {
                background: #ffffff !important;
                padding: 20mm !important;
                margin: 0 auto !important;
                width: 210mm !important;
                min-height: 297mm !important;
                box-shadow: none !important;
                border: none !important;
                position: relative !important;
                display: block !important;
            }
            section.docx:last-child {
                page-break-after: auto;
            }
            img, table {
                max-width: 100% !important;
            }
            .docx-info { display: none !important; }
          </style>
        </head>
        <body>
          <div class="print-container">${archivedContent}</div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-200">
      
      {/* Header Section - Identical to Kelola Pengajuan */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Arsip Pengajuan</h1>
          <p className="text-gray-500 mt-1 text-[15px]">Data riwayat pengajuan surat yang telah selesai diterbitkan.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={openAddOfflineModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 shadow-sm text-white rounded-xl text-[14px] font-bold hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer pointer-events-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            <span>Surat Offline</span>
          </button>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari arsip..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-[14px] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[300px]" 
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Section - Identical to Kelola Pengajuan Structure */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[13px] uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-semibold w-[15%]">Tgl Penerbitan</th>
                <th className="px-6 py-4 font-semibold w-[15%]">No Surat</th>
                <th className="px-6 py-4 font-semibold w-[20%]">Jenis Surat</th>
                <th className="px-6 py-4 font-semibold w-[25%] max-w-[250px]">Atas Nama</th>
                <th className="px-6 py-4 font-semibold w-[15%]">No Pengajuan</th>
                <th className="px-6 py-4 font-semibold text-right w-[10%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingSurat ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-20 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-32 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                        <div className="h-4 w-32 bg-gray-100 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5 text-right"><div className="h-6 w-12 bg-gray-100 rounded-lg ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredArsip.length > 0 ? (
                filteredArsip.map((surat) => (
                  <tr 
                    key={surat.id} 
                    onClick={() => openArchiveDetail(surat)}
                    className="hover:bg-emerald-50/30 transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-5 text-[14px] text-gray-600">
                      {surat.tanggal_disetujui ? format(new Date(surat.tanggal_disetujui), 'dd/MM/yyyy', { locale: localeID }) : '-'}
                    </td>
                    <td className="px-6 py-5 text-[14px] font-semibold text-gray-900">
                      {surat.no_surat || '-'}
                    </td>
                    <td className="px-6 py-5 text-[14px] text-gray-700">
                      {surat.jenis_surat}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[12px] border border-emerald-100">
                          {surat.pemohon?.foto ? (
                            <img src={surat.pemohon.foto} className="w-full h-full rounded-full object-cover" alt="" />
                          ) : (
                            getAtasNama(surat).charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-[14px] font-semibold text-gray-900 truncate">
                          {getAtasNama(surat)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[13px] font-mono font-medium text-gray-500">
                      {surat.no_pengajuan || surat.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => openArchiveDetail(surat)}
                        className="px-4 py-1.5 bg-[#FF7F50] text-white font-bold text-[12px] rounded-lg shadow-sm hover:opacity-90 transition-all active:scale-95"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-gray-400 font-medium">Tidak ada arsip pengajuan ditemukan.</p>
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="mt-2 text-emerald-600 text-sm font-bold hover:underline">Hapus pencarian</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer - Styled like Kelola Pengajuan */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDrawerOpen(false)}></div>
          
          <div className="relative w-full max-w-3xl h-full bg-white shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden flex flex-col">
            {/* Drawer Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-gray-900 uppercase tracking-tight">Arsip Pengajuan</h2>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-gray-500 font-medium">NO. PENGAJUAN:</span>
                    <span className="text-[13px] font-mono font-bold text-gray-700">{selectedSurat?.no_pengajuan || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-gray-500 font-medium">NO. SURAT:</span>
                    {isEditingNoSurat ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          value={editNoSuratValue} 
                          onChange={(e) => setEditNoSuratValue(e.target.value)}
                          className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[12px] font-bold text-gray-800 focus:outline-none focus:border-emerald-500"
                          style={{ width: '120px' }}
                        />
                        <button 
                          onClick={handleSaveNoSurat}
                          disabled={isSavingNoSurat}
                          className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded hover:bg-emerald-700 active:scale-95"
                        >
                          {isSavingNoSurat ? '...' : 'OK'}
                        </button>
                        <button 
                          onClick={() => setIsEditingNoSurat(false)}
                          className="px-2 py-0.5 bg-gray-100 text-gray-500 font-bold text-[10px] rounded hover:bg-gray-200"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-mono font-bold text-gray-700">{selectedSurat?.no_surat || '-'}</span>
                        <button 
                          onClick={() => {
                            setEditNoSuratValue(selectedSurat?.no_surat || '');
                            setIsEditingNoSurat(true);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 text-[11px] font-black uppercase hover:underline cursor-pointer tracking-wider"
                        >
                          [Ubah]
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint}
                  disabled={!archivedContent || isLoadingContent}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  PRINT ARSIP
                </button>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            {/* Drawer Content - Centers the Document Physically */}
            <div className="flex-1 overflow-y-auto bg-[#F1F3F4] custom-scrollbar">
              {isLoadingContent ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-8 h-8 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">Memuat konten arsip...</p>
                </div>
              ) : archivedContent ? (
                <div className="w-full relative py-12 md:py-24 flex flex-col items-center">
                  {/* Physical Paper Shadow effect */}
                  <div 
                    className="docx-render-container bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-gray-200/50 mx-auto transition-all transform scale-[0.85] md:scale-100 origin-top"
                    style={{ width: '210mm', minHeight: '297mm' }}
                    dangerouslySetInnerHTML={{ __html: archivedContent }} 
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-10">
                  <Archive className="w-16 h-16 text-gray-200 mb-6" />
                  <h3 className="text-gray-900 font-bold uppercase tracking-widest mb-2">Arsip Tidak Ditemukan</h3>
                  <p className="text-gray-500 text-sm max-w-[300px] leading-relaxed">Konten fisik surat ini tidak tersedia di server atau telah dihapus secara permanen.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Surat Offline */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsAddModalOpen(false)}></div>
          
          <div className="relative w-full max-w-[650px] max-h-[90vh] bg-white rounded-[32px] p-8 shadow-2xl overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 flex flex-col pointer-events-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Pencatatan Surat Offline</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Catat metadata surat yang dibuat di luar sistem agar nomor surat berurutan.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveOfflineSurat} className="space-y-5 flex-1 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Jenis Surat *</label>
                  <select 
                    value={offlineJenisSurat}
                    onChange={(e) => setOfflineJenisSurat(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Jenis --</option>
                    {availableTemplates.map((t, idx) => (
                      <option key={idx} value={t.nama_template}>{t.nama_template}</option>
                    ))}
                    <option value="Lainnya">Lainnya / Surat Kustom</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Nomor Surat *</label>
                  <input 
                    type="text"
                    value={offlineNoSurat}
                    onChange={(e) => setOfflineNoSurat(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-800 focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: 032"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Metode Data Warga *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="wargaType" 
                      checked={offlineWargaType === 'registered'} 
                      onChange={() => setOfflineWargaType('registered')}
                      className="accent-emerald-600"
                    />
                    Warga Terdaftar (Akun CUSS)
                  </label>
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="wargaType" 
                      checked={offlineWargaType === 'manual'} 
                      onChange={() => setOfflineWargaType('manual')}
                      className="accent-emerald-600"
                    />
                    Warga Baru / Input Manual
                  </label>
                </div>
              </div>

              {offlineWargaType === 'registered' ? (
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Cari Warga Terdaftar *</label>
                  <select
                    value={offlineSelectedWargaId}
                    onChange={(e) => setOfflineSelectedWargaId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Nama Warga --</option>
                    {wargaList.map((w) => (
                      <option key={w.id} value={w.id}>{w.nama} (NIK: {w.nik})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-50 pb-2">Informasi Warga Baru (Manual)</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nama Lengkap *</label>
                      <input 
                        type="text" 
                        value={manualNama} 
                        onChange={(e) => setManualNama(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                        placeholder="Nama Lengkap"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">NIK *</label>
                      <input 
                        type="text" 
                        value={manualNik} 
                        onChange={(e) => setManualNik(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                        placeholder="Nomor NIK"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Alamat Lengkap *</label>
                    <input 
                      type="text" 
                      value={manualAlamat} 
                      onChange={(e) => setManualAlamat(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                      placeholder="Nama jalan, kampung, dusun"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">RT *</label>
                      <input 
                        type="text" 
                        value={manualRt} 
                        onChange={(e) => setManualRt(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                        placeholder="RT"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">RW *</label>
                      <input 
                        type="text" 
                        value={manualRw} 
                        onChange={(e) => setManualRw(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                        placeholder="RW"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Jenis Kelamin *</label>
                      <select 
                        value={manualJenisKelamin} 
                        onChange={(e) => setManualJenisKelamin(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Agama</label>
                      <select 
                        value={manualAgama} 
                        onChange={(e) => setManualAgama(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Khonghucu">Khonghucu</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Pekerjaan</label>
                      <input 
                        type="text" 
                        value={manualPekerjaan} 
                        onChange={(e) => setManualPekerjaan(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                        placeholder="Pekerjaan"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">No. Telepon</label>
                      <input 
                        type="text" 
                        value={manualNoTelepon} 
                        onChange={(e) => setManualNoTelepon(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:border-emerald-500"
                        placeholder="No Telepon"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Keperluan Surat *</label>
                <textarea 
                  value={offlineKeperluan}
                  onChange={(e) => setOfflineKeperluan(e.target.value)}
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Isi keperluan pembuatan surat..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Tanggal Penerbitan *</label>
                  <input 
                    type="date"
                    value={offlineTanggal}
                    onChange={(e) => setOfflineTanggal(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Upload Scan Surat (Gambar/PDF - Opsional)</label>
                  <input 
                    type="file"
                    onChange={(e) => setOfflineFile(e.target.files?.[0] || null)}
                    accept="image/*,application/pdf"
                    className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[13px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-[13px] font-bold hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingOffline}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[13px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingOffline ? 'Menyimpan...' : 'Simpan Arsip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

