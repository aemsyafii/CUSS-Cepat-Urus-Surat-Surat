'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { createPortal } from 'react-dom';
import { renderAsync } from 'docx-preview';
import NotificationModal, { NotificationType } from '@/components/NotificationModal';
import Toast, { ToastType } from '@/components/Toast';
import { Bold, Italic, Underline } from 'lucide-react';
import { gzipHtml, gunzipToText } from '@/lib/compress';

const MapComponent = dynamic(() => import('@/components/profil/MapComponent'), { ssr: false });

// Buat instance sekali di luar komponen agar tidak re-create setiap render
const supabase = createBrowserSupabase();

type SuratWithUsers = {
  id: string;
  pemohon_id: string;
  jenis_surat: string;
  status: 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak';
  created_at: string;
  updated_at?: string;
  subjek?: any;
  keperluan: string;
  keterangan?: string;
  response_admin?: string;
  dokumen_lampiran?: any[];
  no_pengajuan?: string;
  no_surat?: string;
  // Kolom timestamp status
  tanggal_diproses?: string | null;
  tanggal_disetujui?: string | null;
  tanggal_ditolak?: string | null;
  // Kolom mewakili
  is_mewakili?: boolean;
  nama_subjek?: string | null;
  nik_subjek?: string | null;
  hubungan_subjek?: string | null;
  jenis_kelamin_subjek?: string | null;
  alamat_subjek?: string | null;
  rt_subjek?: string | null;
  rw_subjek?: string | null;
  pemohon: {
    nama: string;
    nik: string;
    jenis_kelamin: string;
    nomor_telepon: string | null;
    alamat: string;
    rt: string;
    rw: string;
    agama?: string;
    pekerjaan?: string;
    titik_maps?: string;
    foto?: string;
    tanggal_lahir?: string;
  } | null;
};

import { useAdminData } from '../AdminDataContext';

export default function AdminPengajuanPage() {
  const { 
    suratList, 
    loadingSurat: loadingContext, 
    refreshSurat: fetchSurat,
    updateSuratInList,
    templateCache,
    setTemplateCache,
    wargaList
  } = useAdminData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurat, setSelectedSurat] = useState<SuratWithUsers | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Client-side pagination state
  const [displayLimit, setDisplayLimit] = useState(100);
  const [isPaginating, setIsPaginating] = useState(false);
  const loading = loadingContext || isPaginating;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [templateBlob, setTemplateBlob] = useState<Blob | null>(null);
  const [showFullDoc, setShowFullDoc] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title: string;
    message: string;
    buttonText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [archivedContent, setArchivedContent] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: ToastType;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  const letterRef = useRef<HTMLDivElement>(null);
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false
  });
  const renderBufferRef = useRef<HTMLDivElement | null>(null);
  const isRendering = useRef(false);
  const [isEditingArchive, setIsEditingArchive] = useState(false);
  const [customNoSurat, setCustomNoSurat] = useState('');

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

  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectionSearchQuery, setSelectionSearchQuery] = useState('');

  // PRE-FETCH TEMPLATES - Optimized to run only when list changes and avoid loops
  const preFetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      const uniqueTypes = Array.from(new Set(suratList.slice(0, 15).map(s => s.jenis_surat)));
      uniqueTypes.forEach(async (type) => {
        if (templateCache[type] || type === 'Lainnya' || preFetchedRef.current.has(type)) return;
        
        preFetchedRef.current.add(type);
        try {
          const { data: tpl } = await supabase.from('TemplateSurat').select('file_path').eq('nama_template', type).maybeSingle();
          const tplData = tpl as { file_path: string } | null;
          if (tplData?.file_path) {
            const { data: blob } = await supabase.storage.from('templates_surat').download(tplData.file_path);
            if (blob) setTemplateCache(type, blob);
          }
        } catch (err) {
          console.error(`Gagal pre-fetch template for ${type}:`, err);
        }
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [suratList]); // Remove templateCache from dependencies to avoid re-renders loop

  const updateActiveStyles = () => {
    setActiveStyles({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    });
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    updateActiveStyles();
  };
  
  const parseCoord = (str: string | undefined | null) => {
    if (!str) return null;
    try {
      if (str.startsWith('{')) return JSON.parse(str);
      const [lat, lng] = str.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    } catch (e) { return null; }
    return null;
  };

  const replacePlaceholders = (html: string, surat: SuratWithUsers) => {
    if (!html) return '';
    const warga = surat.pemohon;
    if (!warga) return html;

    const now = new Date();
    const data: Record<string, string> = {
      '[nama_pemohon]': surat.is_mewakili ? (surat.nama_subjek || '') : (warga.nama || ''),
      '[nik_pemohon]': surat.is_mewakili ? (surat.nik_subjek || '') : (warga.nik || ''),
      '[tanggal_lahir]': surat.is_mewakili ? '................' : ((warga as any).tanggal_lahir ? format(new Date((warga as any).tanggal_lahir), 'dd MMMM yyyy', { locale: localeID }) : '-'),
      '[jenis_kelamin]': (surat.is_mewakili ? (surat.jenis_kelamin_subjek || '') : (warga.jenis_kelamin || ''))?.toLowerCase() === 'laki-laki' ? 'Laki-laki' : 'Perempuan',
      '[pekerjaan]': surat.is_mewakili ? '................' : (warga.pekerjaan || '-'),
      '[agama]': surat.is_mewakili ? '................' : (warga.agama || '-'),
      '[alamat]': surat.is_mewakili ? (surat.alamat_subjek || '') : (warga.alamat || ''),
      '[rt]': surat.is_mewakili ? (surat.rt_subjek || '') : (warga.rt || ''),
      '[rw]': surat.is_mewakili ? (surat.rw_subjek || '') : (warga.rw || ''),
      '[tanggal]': format(now, 'dd'),
      '[bulan]': format(now, 'MMMM', { locale: localeID }),
      '[tahun]': format(now, 'yyyy'),
      '[nomor_telepon]': surat.is_mewakili ? '................' : (warga.nomor_telepon || '-'),
      '[no_surat]': surat.no_surat || surat.no_pengajuan || surat.id.split('-')[0].toUpperCase(),
      '[nomor_pengajuan]': surat.no_surat || surat.no_pengajuan || surat.id.split('-')[0].toUpperCase(),
    };

    let result = html;
    Object.entries(data).forEach(([tag, value]) => {
      result = result.split(tag).join(value);
    });
    return result;
  };

  const currentPos = parseCoord((selectedSurat as any)?.pemohon?.titik_maps);
  
  useEffect(() => {
    // Setup local listener only for updating selectedSurat details if active
    const channel = supabase
      .channel('admin_surat_details_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Surat' },
        (payload: any) => {
          // 1. The list (suratList) is already kept in sync by AdminDataContext's internal listener.
          // We only need to ensure the CURRENTLY SELECTED record in the drawer is updated.

          // 2. If the currently opened surat is changed, update its specific details
          if (selectedSurat && (payload.new?.id === selectedSurat.id || payload.old?.id === selectedSurat.id)) {
             if (payload.eventType === 'DELETE') {
                setIsDrawerOpen(false);
                setSelectedSurat(null);
                return;
             }

             const updateDetails = async () => {
                 const { data, error } = await supabase
                   .from('Surat')
                   .select(`
                     id, pemohon_id, jenis_surat, status, created_at, subjek,
                     keperluan, response_admin, dokumen_lampiran, no_pengajuan, no_surat, updated_at,
                     pemohon:Users!pemohon_id(nama, nik, jenis_kelamin, nomor_telepon, alamat, rt, rw, agama, pekerjaan, titik_maps, foto, tanggal_lahir)
                   `)
                   .eq('id', selectedSurat.id)
                   .single();

                  
                if (!error && data) {
                  setSelectedSurat(data as unknown as SuratWithUsers);
                }
             };
             updateDetails();
          }
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
    };
  }, [selectedSurat]);

  // TRIGGER RENDERING WHEN PANEL IS SHOWN
  useEffect(() => {
    if (showResult && selectedSurat && activeTemplate?.file_path && !archivedContent) {
      const timer = setTimeout(() => {
        generateDocxPreview(selectedSurat, activeTemplate.file_path, customNoSurat);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [showResult, activeTemplate, archivedContent, customNoSurat]);

  // Manually set archived content to avoid re-render clearing
  useEffect(() => {
    if (letterRef.current && archivedContent) {
      letterRef.current.innerHTML = archivedContent;
    }
  }, [archivedContent, showResult]);

  const openDrawer = async (surat: SuratWithUsers) => {
    setSelectedSurat(surat);
    setArchivedContent(null);
    setTemplateBlob(null);
    setShowResult(false);
    setIsDrawerOpen(true);
    setActiveTemplate(null);
    setIsLoadingTemplate(true);
    setIsLoadingDetail(true);
    setIsEditingArchive(false);

    // 1. Prioritaskan pengambilan FULL DATA & TEMPLATE secara paralel
    const fetchFullData = async () => {
      const { data, error } = await supabase
        .from('Surat')
        .select(`
          id, pemohon_id, jenis_surat, status, created_at, is_mewakili, 
          nama_subjek, nik_subjek, hubungan_subjek, rt_subjek, rw_subjek, alamat_subjek, jenis_kelamin_subjek,
          keperluan, keterangan, response_admin, dokumen_lampiran, tanggal_diproses, tanggal_disetujui, tanggal_ditolak, no_pengajuan, no_surat, updated_at,
          pemohon:Users!pemohon_id(nama, nik, jenis_kelamin, nomor_telepon, alamat, rt, rw, agama, pekerjaan, titik_maps, foto, tanggal_lahir)
        `)
        .eq('id', surat.id)
        .single();
      if (!error && data) {
        setSelectedSurat(data as unknown as SuratWithUsers);
        return data as unknown as SuratWithUsers;
      }
      return surat;

    };

    const fetchTemplateInfo = async () => {
      let { data: tpl } = await supabase
        .from('TemplateSurat')
        .select('*')
        .eq('nama_template', surat.jenis_surat)
        .maybeSingle();
      
      if (tpl) {
        setActiveTemplate(tpl);
        // Gunakan cache jika ada
        if (templateCache[surat.jenis_surat]) {
          setTemplateBlob(templateCache[surat.jenis_surat]);
        } else if (tpl.file_path && surat.status !== 'Selesai') {
           // Jika tidak ada di cache, download dan simpan ke cache
           supabase.storage.from('templates_surat').download((tpl as any).file_path).then(({ data }: any) => {
              if (data) {
                setTemplateBlob(data);
                setTemplateCache(surat.jenis_surat, data);
              }
           });
        }
        return tpl;
      }
      return null;
    };

    // Jalankan fetch secara paralel
    Promise.all([fetchFullData(), fetchTemplateInfo()]).then(([updatedSurat, tpl]) => {
      setIsLoadingDetail(false);
       
      // Initialize customNoSurat state
      let initialNo = "";
      if (updatedSurat.no_surat) {
        initialNo = updatedSurat.no_surat;
      } else {
        initialNo = getNextNoSurat(suratList);
      }
      setCustomNoSurat(initialNo);

      // Jika status Selesai, ambil arsipnya
      if (updatedSurat.status === 'Selesai') {
        supabase.from('ArsipSurat')
          .select('file_path')
          .eq('surat_id', updatedSurat.id)
          .single()
          .then(async ({ data, error }: any) => {
            if (!error && data?.file_path) {
              const { data: fileData } = await supabase.storage.from('arsip_surat').download(data.file_path);
              if (fileData) {
                const html = await gunzipToText(fileData);
                setArchivedContent(html);
              }
            }
            setIsLoadingTemplate(false);
          });
      } else {
        setIsLoadingTemplate(false);
      }

      // Pre-fetch templates for 'Lainnya' category if needed
      if ((!tpl || updatedSurat.jenis_surat === 'Lainnya') && updatedSurat.status !== 'Selesai') {
        supabase.from('TemplateSurat')
          .select('*')
          .ilike('identitas_surat', 'LAINNYA-%')
          .order('nama_template', { ascending: true })
          .then(({ data: allTpls }: any) => {
            if (allTpls) setAvailableTemplates(allTpls);
          });
      }
    });
  };

  const generateDocxPreview = async (surat: SuratWithUsers, filePath: string, customNo?: string) => {
    if (!letterRef.current) return;
    if (isRendering.current) return;
    isRendering.current = true;
    setIsLoadingTemplate(true);
    try {
      let fileBlob = templateBlob || templateCache[surat.jenis_surat];
      if (!fileBlob) {
        const { data, error } = await supabase.storage.from('templates_surat').download(filePath);
        if (error) throw error;
        fileBlob = data;
        setTemplateBlob(data);
        if (data) setTemplateCache(surat.jenis_surat, data);
      }

      if (!fileBlob) throw new Error("Gagal mengunduh file template.");
      
      if (filePath.endsWith('.html.gz')) {
         const htmlText = await gunzipToText(fileBlob);
         if (letterRef.current) {
            letterRef.current.innerHTML = replacePlaceholders(htmlText, surat);
            setTimeout(() => setIsFullyLoaded(true), 150);
         }
      } else if (filePath.endsWith('.html') || fileBlob.type === 'text/html') {
         const htmlText = await fileBlob.text();
         if (letterRef.current) {
            letterRef.current.innerHTML = replacePlaceholders(htmlText, surat);
            setTimeout(() => setIsFullyLoaded(true), 150);
         }

      } else {
         const arrayBuffer = await fileBlob.arrayBuffer();
         const zip = new PizZip(arrayBuffer);
         const doc = new Docxtemplater(zip, {
           paragraphLoop: true,
           linebreaks: true,
           delimiters: { start: '[', end: ']' }
         });

         const tglHariIni = format(new Date(), 'dd MMMM yyyy', { locale: localeID });
         const now = new Date();
         const dataReplacement = {
           nama_pemohon: surat.is_mewakili ? surat.nama_subjek : surat.pemohon?.nama,
           nik_pemohon: surat.is_mewakili ? surat.nik_subjek : surat.pemohon?.nik,
           tanggal_lahir: surat.is_mewakili ? '................' : (surat.pemohon?.tanggal_lahir ? format(new Date(surat.pemohon.tanggal_lahir), 'dd MMMM yyyy', { locale: localeID }) : '-'),
           jenis_kelamin: (surat.is_mewakili ? (surat.jenis_kelamin_subjek || '') : (surat.pemohon?.jenis_kelamin || ''))?.toLowerCase() === 'laki-laki' ? 'Laki-laki' : 'Perempuan',
           alamat: surat.is_mewakili ? (surat.alamat_subjek || '') : (surat.pemohon?.alamat || ''),
           alamat_pemohon: surat.is_mewakili 
             ? `RT ${surat.rt_subjek} / RW ${surat.rw_subjek}, ${surat.alamat_subjek}`
             : `RT ${surat.pemohon?.rt} / RW ${surat.pemohon?.rw}, ${surat.pemohon?.alamat}`,
           rt: surat.is_mewakili ? surat.rt_subjek : surat.pemohon?.rt,
           rw: surat.is_mewakili ? surat.rw_subjek : surat.pemohon?.rw,
           pekerjaan: surat.is_mewakili ? '................' : (surat.pemohon?.pekerjaan || '-'),
           agama: surat.is_mewakili ? '................' : (surat.pemohon?.agama || '-'),
           nomor_telepon: surat.is_mewakili ? '................' : (surat.pemohon?.nomor_telepon || '-'),
           keperluan_surat: surat.keperluan,
           tanggal_hari_ini: tglHariIni,
           tanggal: format(now, 'dd'),
          bulan: format(now, 'MMMM', { locale: localeID }),
           tahun: format(now, 'yyyy'),
           pekerjaan_pemohon: surat.pemohon?.pekerjaan || '-',
           nama_warga: surat.pemohon?.nama,
           nik_warga: surat.pemohon?.nik,
           id_pengajuan: customNo || surat.no_surat || surat.no_pengajuan || surat.id.split('-')[0].toUpperCase(),
           no_surat: customNo || surat.no_surat || surat.no_pengajuan || surat.id.split('-')[0].toUpperCase(),
           nomor_pengajuan: customNo || surat.no_surat || surat.no_pengajuan || surat.id.split('-')[0].toUpperCase()
         };

         doc.render(dataReplacement);
         const out = doc.getZip().generate({ type: 'blob' });

         // DOUBLE BUFFERING: Render to hidden div first to avoid flicker
         if (!renderBufferRef.current) {
           renderBufferRef.current = document.createElement('div');
         }
         const buffer = renderBufferRef.current;
         buffer.innerHTML = '';
         
         await renderAsync(out, buffer, undefined, {
           className: 'docx-view',
           inWrapper: false,
           ignoreHeight: true,
           ignoreWidth: false,
         });

         // Swap content only when fully ready
         if (letterRef.current) {
           letterRef.current.innerHTML = buffer.innerHTML;
           setTimeout(() => setIsFullyLoaded(true), 150);
         }
      }
    } catch (err) {
      console.error('Docx preview error:', err);
    } finally {
      setIsLoadingTemplate(false);
      isRendering.current = false;
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setShowResult(false);
    setIsFullyLoaded(false);
    setTimeout(() => {
      setSelectedSurat(null);
      setArchivedContent(null);
      setShowResult(false);
    }, 300);
  };

  const handlePrint = () => {
    const content = archivedContent || letterRef.current?.innerHTML;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Surat - ${selectedSurat?.no_pengajuan || selectedSurat?.id.split('-')[0].toUpperCase()}</title>
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
          <div class="print-container">${content}</div>
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


  const handleUpdateStatus = async (status: 'Diproses' | 'Selesai' | 'Ditolak', reason?: string) => {
    if (!selectedSurat) return;
    setIsProcessing(true);
    
    try {
    // 1. Simpan Arsip jika Selesai (Simpan konten HTML yang sudah diedit)
    if (status === 'Selesai' && letterRef.current) {
        const finalHtml = letterRef.current.innerHTML;
        const fileName = `archive_${selectedSurat.id}_${Date.now()}.html.gz`;
        const blob = await gzipHtml(finalHtml);
        
        const { error: uploadError } = await supabase.storage
          .from('arsip_surat')
          .upload(fileName, blob, { contentType: 'application/gzip' });

        if (!uploadError) {
          const { error: archiveError } = await supabase
            .from('ArsipSurat')
            .upsert(
              { surat_id: selectedSurat.id, file_path: fileName } as any,
              { onConflict: 'surat_id' }
            );
          
          if (archiveError) {
            console.error("Gagal mengarsipkan surat:", archiveError);
          } else {
            setArchivedContent(finalHtml);
            setShowResult(true);
          }
        } else {
          console.error("Gagal upload arsip ke storage:", uploadError);
        }
    }

    // Create payload with timestamps using Date objects for better Supabase compatibility
    const now = new Date();
    const updatePayload: any = { 
      status,
      updated_at: now
    };
    
    if (status === 'Diproses') updatePayload.tanggal_diproses = now;
    if (status === 'Selesai') {
      updatePayload.tanggal_disetujui = now;
      updatePayload.no_surat = customNoSurat;
    }
    if (status === 'Ditolak') {
      updatePayload.tanggal_ditolak = now;
      if (reason) updatePayload.response_admin = reason;
    }

    const { error } = await supabase
      .from('Surat')
      .update(updatePayload)
      .eq('id', selectedSurat.id);

      if (error) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'Gagal Menyimpan Perubahan',
          message: 'Maaf, permintaan Anda tidak dapat diproses saat ini. Pastikan koneksi internet Anda stabil dan coba beberapa saat lagi.'
        });
      } else {
        // INSTANT UI UPDATE (Local & Context)
        setSelectedSurat(prev => prev ? { ...prev, ...updatePayload } : null);
        updateSuratInList(selectedSurat.id, updatePayload);
        
        if (status === 'Diproses') setShowResult(true);
        
        // Background tasks
        fetchSurat(true); // Silent refresh to ensure sync
      }
      setIsProcessing(false);
      setIsRejectModalOpen(false);
      setRejectionReason('');
    } catch (err) {
      console.error("Critical update error:", err);
      setIsProcessing(false);
    }
  };



  const getAtasNama = (surat: SuratWithUsers) => {
    // Logic: Jika is_mewakili true -> nama subjek. Jika false -> nama akun warga.
    if (surat.is_mewakili) {
      return surat.nama_subjek || 'Penerima';
    }
    return surat.pemohon?.nama || 'Pemohon';
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Masuk': return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[12px] font-semibold rounded-full border border-amber-100">Menunggu</span>;
      case 'Diproses': return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[12px] font-semibold rounded-full border border-blue-100">Diproses</span>;
      case 'Selesai': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[12px] font-semibold rounded-full border border-emerald-100">Selesai</span>;
      default: return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 text-[12px] font-semibold rounded-full border border-gray-100">{status}</span>;
    }
  };

  // Optimized lookup for citizen data
  const wargaMap = useMemo(() => {
    const map = new Map();
    wargaList.forEach(w => map.set(w.id, w));
    return map;
  }, [wargaList]);

  // Enrich suratList with warga data from wargaList for fast client-side display
  const enrichedSuratList = useMemo(() => {
    return suratList.map(s => ({
      ...s,
      warga: wargaMap.get(s.pemohon_id)
    }));
  }, [suratList, wargaMap]);

  const filteredList = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return enrichedSuratList.filter(s => {
      const name = getAtasNama(s).toLowerCase();
      const id = (s.no_pengajuan || s.id).toLowerCase();
      const status = s.status.toLowerCase();
      const statusDisplay = status === 'masuk' ? 'menunggu' : status;
      
      return name.includes(query) || 
             id.includes(query) || 
             status.includes(query) || 
             statusDisplay.includes(query) ||
             s.jenis_surat.toLowerCase().includes(query);
    });
  }, [enrichedSuratList, searchQuery]);

  const displayedList = useMemo(() => {
    return filteredList.slice(0, displayLimit);
  }, [filteredList, displayLimit]);

  const hasMoreSurat = displayLimit < filteredList.length;

  const loadMoreSurat = () => {
    setIsPaginating(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 100);
      setIsPaginating(false);
    }, 400);
  };

  const handleUpdateArchive = async () => {
    if (!selectedSurat || !letterRef.current) return;
    setIsProcessing(true);
    try {
      const newHtml = letterRef.current.innerHTML;
      const fileName = `archive_${selectedSurat.id}_${Date.now()}.html.gz`;
      const blob = await gzipHtml(newHtml);
      
      const { error: uploadError } = await supabase.storage
        .from('arsip_surat')
        .upload(fileName, blob, { contentType: 'application/gzip' });

      if (uploadError) throw uploadError;

      const { data: oldArchive } = await supabase.from('ArsipSurat').select('file_path').eq('surat_id', selectedSurat.id).single();
      const oldArchiveData = oldArchive as { file_path: string } | null;

      const { error } = await supabase
        .from('ArsipSurat')
        .update({ file_path: fileName } as any)
        .eq('surat_id', selectedSurat.id);
      
      if (error) throw error;

      // Update Surat no_surat in database
      const { error: suratError } = await supabase
        .from('Surat')
        .update({ no_surat: customNoSurat, updated_at: new Date().toISOString() } as any)
        .eq('id', selectedSurat.id);

      if (suratError) throw suratError;

      if (oldArchiveData?.file_path) {
        const { error: removeError } = await supabase.storage.from('arsip_surat').remove([oldArchiveData.file_path]);
        if (removeError) console.error('Gagal hapus arsip lama:', removeError);
      }
      
      setSelectedSurat((prev: any) => prev ? { ...prev, no_surat: customNoSurat } : null);
      updateSuratInList(selectedSurat.id, { no_surat: customNoSurat });
      setArchivedContent(newHtml);
      setIsEditingArchive(false);
      setToast({
        isOpen: true,
        type: 'success',
        title: 'Arsip Diperbarui',
        message: 'Konten surat dan nomor surat berhasil diperbarui dalam sistem.'
      });
    } catch (err) {
      console.error("Gagal perbarui arsip:", err);
      setToast({
        isOpen: true,
        type: 'error',
        title: 'Gagal Perbarui',
        message: 'Terjadi kesalahan saat menyimpan perubahan arsip.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-200">
      
      {/* Header Section - Styled like /adm/warga */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kelola Pengajuan Surat</h1>
          <p className="text-gray-500 mt-1 text-[15px]">Tinjau dan proses permohonan surat yang diajukan oleh warga desa.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
             <input 
               type="text" 
               placeholder="Cari Nama / No Tracking / Status" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-[14px] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[300px]" 
               suppressHydrationWarning
             />
             <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <button onClick={() => fetchSurat()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors" suppressHydrationWarning>
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>

      {/* Table Section - Styled like /adm/warga */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[13px] uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-semibold w-[15%]">Tgl Pengajuan</th>
                <th className="px-6 py-4 font-semibold w-[15%]">No Pengajuan</th>
                <th className="px-6 py-4 font-semibold w-[25%] max-w-[250px]">Atas Nama</th>
                <th className="px-6 py-4 font-semibold w-[20%]">Jenis Surat</th>
                <th className="px-6 py-4 font-semibold w-[15%]">Status</th>
                <th className="px-6 py-4 font-semibold text-right w-[10%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingContext && displayedList.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-20 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                        <div className="h-4 w-32 bg-gray-100 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-4 w-28 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-6 w-20 bg-gray-100 rounded-full"></div></td>
                    <td className="px-6 py-5 text-right"><div className="h-8 w-16 bg-gray-100 rounded-lg ml-auto"></div></td>
                  </tr>
                ))
              ) : displayedList.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">Tidak ada pengajuan ditemukan.</td>
                </tr>
              ) : (
                displayedList.map((surat) => (
                  <tr 
                    key={surat.id} 
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => openDrawer(surat)}
                  >
                     <td className="px-6 py-4 whitespace-nowrap text-[14px] text-gray-600">
                        {format(new Date(surat.created_at), 'dd MMM yyyy', { locale: localeID })}
                     </td>
                     <td className="px-6 py-4">
                        <span className="text-[13px] font-mono font-bold text-gray-500">#{surat.no_pengajuan || surat.id.split('-')[0].toUpperCase()}</span>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gray-50 text-emerald-600 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-emerald-100 shadow-sm">
                              {surat.pemohon?.foto ? (
                                 <img src={surat.pemohon.foto} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                 <span className="uppercase">{getAtasNama(surat).charAt(0)}</span>
                              )}
                           </div>
                           <p className="text-[14px] font-semibold text-gray-800">{getAtasNama(surat)}</p>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <p className="text-[14px] font-medium text-gray-700">{surat.jenis_surat}</p>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(surat.status)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(surat);
                          }}
                          className="px-4 py-1.5 bg-[#FF7F50] text-white font-bold text-[12px] rounded-lg shadow-sm hover:opacity-90 transition-all active:scale-95"
                        >
                          Kelola
                        </button>
                     </td>
                  </tr>
                ))
              )}

              {/* Load More & Skeletons integrated inside Table */}
              {loading && suratList.length > 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-more-surat-${i}`} className="animate-pulse border-t border-gray-50">
                    <td className="px-6 py-5"><div className="h-4 w-20 bg-gray-50 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 bg-gray-50 rounded-lg"></div></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50"></div>
                        <div className="h-4 w-32 bg-gray-50 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-4 w-28 bg-gray-50 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-6 w-20 bg-gray-50 rounded-full"></div></td>
                    <td className="px-6 py-5 text-right"><div className="h-8 w-16 bg-gray-50 rounded-lg ml-auto"></div></td>
                  </tr>
                ))
              ) : hasMoreSurat && filteredList.length > 0 && (
                <tr 
                  className="hover:bg-emerald-50/50 cursor-pointer transition-all duration-300 group border-t border-gray-50"
                  onClick={() => loadMoreSurat()}
                >
                  <td colSpan={6} className="px-6 py-6 text-center">
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

      {/* Hyper-Modern Management Interface - Dashboard Style */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden flex items-stretch">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={closeDrawer} />
          
          <div className={`relative w-full h-full bg-white shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500`}>
            
            {/* Top Navigation & Stepper */}
            <div className="px-10 py-5 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-6">
                <button onClick={closeDrawer} className="w-11 h-11 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 group">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div>
                   <div className="flex items-center gap-3">
                      <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">Detail Pengajuan</h2>
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[11px] font-bold rounded-lg uppercase tracking-wider">
                        #{selectedSurat?.no_pengajuan || selectedSurat?.id.split('-')[0].toUpperCase()}
                      </span>
                   </div>
                   <p className="hidden lg:block text-[13px] text-gray-400 font-medium mt-0.5">{selectedSurat?.jenis_surat}</p>
                </div>
              </div>

              {/* Refined Stepper */}
              <div className="hidden lg:flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                {[
                  { id: 'Masuk', label: 'Baru' },
                  { id: 'Diproses', label: 'Validasi' },
                  { id: 'Selesai', label: 'Selesai' }
                ].map((step, idx) => {
                  const isActive = selectedSurat?.status === step.id;
                  const isPast = (selectedSurat?.status === 'Diproses' && idx === 0) || (selectedSurat?.status === 'Selesai' && idx < 2);
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={`px-4 py-2 rounded-[14px] font-bold text-[12px] transition-all duration-300 flex items-center gap-2.5 ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : isPast ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${isActive ? 'bg-white text-emerald-600 border-white font-black' : isPast ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-200'}`}>
                          {isPast ? '✓' : idx + 1}
                        </div>
                        {step.label}
                      </div>
                      {idx < 2 && <div className={`w-6 h-[2px] mx-1 rounded-full ${isPast ? 'bg-emerald-200' : 'bg-gray-100'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

              {/* BODY CONTENT (Refined Style) */}
              <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
                
                {/* LEFT SIDEBAR: Validation (Refined Style) */}
                <div className="w-full lg:w-[380px] border-r border-gray-100 p-6 lg:p-8 lg:overflow-y-auto space-y-8 bg-gray-50/50">
                  {/* TIMELINE SECTION */}
                  {(selectedSurat?.status === 'Selesai' || selectedSurat?.status === 'Ditolak') && (
                    <div className="relative group">
                       <div className="absolute -inset-1 bg-[#23C16B]/12 blur-[25px] rounded-full"></div>
                       <div className="bg-white rounded-[32px] p-8 shadow-sm border border-emerald-50/50 flex flex-col relative z-10">
                          <div className="flex items-center gap-2.5 mb-6">
                             <div className="w-1.5 h-5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200"></div>
                             <p className="text-[14px] font-bold text-gray-900 uppercase tracking-widest leading-none">Status Timeline</p>
                          </div>
                          
                          {isLoadingDetail ? (
                            <div className="space-y-8 animate-pulse relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-100">
                               {[1, 2, 3].map(i => (
                                 <div key={i} className="relative flex items-center gap-4 pl-8">
                                   <div className="absolute left-0 w-6 h-6 rounded-full bg-gray-100 border-4 border-white"></div>
                                   <div className="space-y-2">
                                     <div className="h-2 w-16 bg-gray-100 rounded"></div>
                                     <div className="h-3 w-24 bg-gray-100 rounded"></div>
                                   </div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-blue-500 before:to-gray-200">
                               {/* Step 1: Created */}
                               <div className="relative flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                     <div className="absolute left-0 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-sm flex items-center justify-center"></div>
                                     <div className="pl-8">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1 tracking-wider">Pengajuan Masuk</p>
                                        <p className="text-[14px] font-bold text-gray-700 leading-none">
                                           {selectedSurat?.created_at ? format(new Date(selectedSurat.created_at), 'dd MMM, HH:mm', { locale: localeID }) : '-'}
                                        </p>
                                     </div>
                                  </div>
                               </div>

                               {/* Step 2: Processing */}
                               <div className="relative flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                     <div className={`absolute left-0 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${selectedSurat?.tanggal_diproses ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                                     <div className="pl-8">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1 tracking-wider">Diproses</p>
                                        <p className={`text-[14px] font-bold leading-none ${selectedSurat?.tanggal_diproses ? 'text-gray-700' : 'text-gray-300'}`}>
                                           {selectedSurat?.tanggal_diproses 
                                              ? format(new Date(selectedSurat.tanggal_diproses), 'dd MMM, HH:mm', { locale: localeID }) 
                                              : '-'}
                                        </p>
                                     </div>
                                  </div>
                               </div>

                               {/* Step 3: Result (Selesai or Ditolak) */}
                               <div className="relative flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                     <div className={`absolute left-0 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${selectedSurat?.status === 'Selesai' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                     <div className="pl-8">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1 tracking-wider">
                                           {selectedSurat?.status === 'Selesai' ? 'Selesai & Disetujui' : 'Pengajuan Ditolak'}
                                        </p>
                                        <p className={`text-[14px] font-bold leading-none ${selectedSurat?.status === 'Selesai' ? 'text-gray-700' : 'text-red-500'}`}>
                                           {selectedSurat?.status === 'Selesai' 
                                              ? (selectedSurat?.tanggal_disetujui ? format(new Date(selectedSurat.tanggal_disetujui), 'dd MMM, HH:mm', { locale: localeID }) : '-')
                                              : (selectedSurat?.tanggal_ditolak ? format(new Date(selectedSurat.tanggal_ditolak), 'dd MMM, HH:mm', { locale: localeID }) : '-')
                                           }
                                        </p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                  {((selectedSurat?.status === 'Diproses' && showResult) || (selectedSurat?.status === 'Selesai' && isEditingArchive)) ? (
                     <div className="relative group">
                        <div className="absolute -inset-1 bg-[#23C16B]/12 blur-[25px] rounded-full"></div>
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-emerald-50/50 flex flex-col space-y-6 relative z-10">
                           <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-1.5 h-5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200"></div>
                              <p className="text-[14px] font-bold text-gray-900 uppercase tracking-widest leading-none">Rincian Keperluan</p>
                           </div>
                           
                           {isLoadingDetail ? (
                             <div className="space-y-4 animate-pulse">
                               <div className="h-20 bg-gray-50 rounded-2xl border border-gray-100"></div>
                               <div className="space-y-3 pt-4">
                                 <div className="h-3 w-32 bg-gray-100 rounded"></div>
                                 <div className="flex gap-4">
                                   <div className="w-20 h-20 bg-gray-100 rounded-2xl"></div>
                                   <div className="w-20 h-20 bg-gray-100 rounded-2xl"></div>
                                 </div>
                               </div>
                             </div>
                           ) : (
                             <>
                               <div className="text-[14px] font-medium text-gray-700 leading-relaxed bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                                 {selectedSurat?.keperluan}
                               </div>

                               {/* EDITABLE LETTER NUMBER (NOMOR SURAT) */}
                               <div className="pt-4 border-t border-gray-100 space-y-2">
                                 <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Nomor Surat (No. Surat)</label>
                                 <input 
                                   type="text" 
                                   value={customNoSurat}
                                   onChange={(e) => setCustomNoSurat(e.target.value)}
                                   className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold text-gray-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all pointer-events-auto"
                                   placeholder="Contoh: 032"
                                 />
                                 <p className="text-[10px] text-gray-400 font-medium italic leading-relaxed">Nilai ini menggantikan tag <code className="text-emerald-600 font-bold">[no_surat]</code> di template.</p>
                               </div>

                               {selectedSurat?.dokumen_lampiran && Array.isArray(selectedSurat.dokumen_lampiran) && selectedSurat.dokumen_lampiran.length > 0 && (
                                 <div className="pt-2 border-t border-gray-50 mt-4">
                                   <p className="text-[10px] font-semibold text-gray-400 uppercase mb-3 tracking-wider mt-4">Lampiran Pendukung ({selectedSurat.dokumen_lampiran.length})</p>
                                   <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                                      {selectedSurat.dokumen_lampiran.map((doc, idx) => {
                                        const rawPath = typeof doc === 'string' ? doc : doc.path;
                                        const fullUrl = `/api/files?bucket=dokumen_lampiran&path=${encodeURIComponent(rawPath)}`;
                                        const isImage = rawPath.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                                        return (
                                           <div 
                                             key={idx} 
                                             onClick={() => setShowFullDoc(fullUrl)}
                                             className="group relative w-20 h-20 shrink-0 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 cursor-zoom-in hover:shadow-md hover:border-emerald-500 transition-all"
                                           >
                                             {isImage ? (
                                               <img src={fullUrl} alt="Lampiran" className="w-full h-full object-cover" />
                                             ) : (
                                               <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-[10px]">DOC</div>
                                             )}
                                           </div>
                                        )
                                      })}
                                   </div>
                                 </div>
                               )}
                             </>
                           )}
                        </div>
                     </div>
                  ) : (
                  <div className="relative group">
                     {/* Glow Backdrop */}
                     <div className="absolute -inset-1 bg-[#23C16B]/12 blur-[25px] rounded-full"></div>
                     
                     <div className="bg-white rounded-[32px] p-8 shadow-sm border border-emerald-50/50 flex flex-col space-y-6 relative z-10">
                        <div className="flex items-center gap-2.5 mb-8">
                           <div className="w-1.5 h-5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200"></div>
                           <p className="text-[14px] font-bold text-gray-900 uppercase tracking-widest leading-none">Profil & Domisili</p>
                        </div>

                        {isLoadingDetail ? (
                          <div className="space-y-8 animate-pulse">
                            <div className="flex flex-col items-center mb-10">
                              <div className="w-[100px] h-[100px] rounded-full bg-gray-100 border-[4px] border-white shadow-lg"></div>
                            </div>
                            <div className="space-y-4">
                              <div className="h-3 w-20 bg-gray-100 rounded"></div>
                              <div className="h-5 w-48 bg-gray-100 rounded"></div>
                            </div>
                            <div className="space-y-4">
                              <div className="h-3 w-16 bg-gray-100 rounded"></div>
                              <div className="h-5 w-32 bg-gray-100 rounded"></div>
                            </div>
                            <div className="space-y-3 pt-2">
                               <div className="h-3 w-24 bg-gray-100 rounded"></div>
                               <div className="aspect-[16/10] rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg"></div>
                               </div>
                            </div>
                            <div className="space-y-6 pt-2">
                              <div className="space-y-2">
                                <div className="h-3 w-32 bg-gray-100 rounded"></div>
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                              </div>
                              <div className="flex justify-between">
                                <div className="space-y-2"><div className="h-3 w-12 bg-gray-100 rounded"></div><div className="h-4 w-16 bg-gray-100 rounded"></div></div>
                                <div className="space-y-2 text-right"><div className="h-3 w-12 bg-gray-100 rounded"></div><div className="h-4 w-16 bg-gray-100 rounded"></div></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col items-center mb-10 text-center">
                               <div className="relative">
                                  <div 
                                     onClick={() => selectedSurat?.pemohon?.foto && setShowFullDoc(selectedSurat.pemohon.foto)}
                                     className={`w-[100px] h-[100px] rounded-full bg-gray-50 border-[4px] border-white shadow-lg overflow-hidden flex items-center justify-center shrink-0 transition-all ${selectedSurat?.pemohon?.foto ? 'cursor-zoom-in hover:brightness-90 active:scale-95' : ''}`}
                                  >
                                     {selectedSurat?.pemohon?.foto ? (
                                        <img src={selectedSurat.pemohon.foto} alt="Avatar" className="w-full h-full object-cover" />
                                     ) : (
                                        <span className="text-[32px] font-black text-emerald-600 capitalize">
                                           {selectedSurat?.pemohon?.nama?.charAt(0) || '?'}
                                        </span>
                                     )}
                                  </div>
                                  {/* Gender Badge */}
                                  <div className="absolute -bottom-1 -right-1 bg-white border border-gray-100 px-2 py-0.5 rounded-lg shadow-sm flex items-center justify-center">
                                     <span className={`text-[10px] font-black ${!selectedSurat?.pemohon?.jenis_kelamin ? 'text-gray-400' : selectedSurat?.pemohon?.jenis_kelamin?.toLowerCase() === 'laki-laki' ? 'text-blue-600' : 'text-pink-600'}`}>
                                        {!selectedSurat?.pemohon?.jenis_kelamin ? '-' : (selectedSurat?.pemohon?.jenis_kelamin?.toLowerCase() === 'laki-laki' ? 'LK' : 'PR')}
                                     </span>
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-4">
                               <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Nama Lengkap</p>
                                  <p className="text-[16px] font-bold text-gray-800 break-words leading-tight">{selectedSurat?.pemohon?.nama || 'N/A'}</p>
                               </div>
                               <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">NIK</p>
                                  <p className="text-[14px] font-bold text-gray-600">{selectedSurat?.pemohon?.nik || '-'}</p>
                               </div>
                            </div>

                            <div className="space-y-3 pt-2">
                               <p className="text-[10px] font-semibold text-gray-400 uppercase mb-3 tracking-wider">Lokasi Geografis</p>
                               <div 
                                  onClick={() => currentPos && window.open(`https://www.google.com/maps/search/?api=1&query=${currentPos.lat},${currentPos.lng}`, '_blank')}
                                  className={`aspect-[16/10] rounded-2xl border border-gray-100 overflow-hidden relative group flex flex-col items-center justify-center transition-all duration-500 shadow-sm ${currentPos ? 'cursor-pointer hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-50' : 'bg-gray-50 cursor-not-allowed'}`}
                               >
                                  {currentPos ? (
                                     <div className="absolute inset-0 z-0">
                                        <MapComponent previewOnly={true} initialPos={currentPos} />
                                        <div className="absolute inset-0 bg-transparent group-hover:bg-emerald-600/5 transition-colors pointer-events-none" />
                                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded-lg px-2.5 py-1 shadow-md text-[9px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                           Buka Google Maps
                                        </div>
                                     </div>
                                  ) : (
                                     <div className="flex flex-col items-center opacity-40">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-300 shadow-sm border border-gray-100">
                                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3">Peta Kosong</span>
                                     </div>
                                  )}
                               </div>
                            </div>
                            
                            <div className="space-y-4 pt-2">
                               <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Alamat Domisili Terdaftar</p>
                                  <p className="text-[14px] font-bold text-gray-600">{selectedSurat?.pemohon?.alamat || 'Alamat tidak tersedia'}</p>
                               </div>

                                <div className="pt-2">
                                   <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">RT / RW</p>
                                   <p className="text-[14px] font-bold text-gray-600">{selectedSurat?.pemohon?.rt || '0'} <span className="text-gray-200 mx-1">/</span> {selectedSurat?.pemohon?.rw || '0'}</p>
                                </div>

                                <div className="pt-2">
                                   <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Agama</p>
                                   <p className="text-[14px] font-bold text-gray-600">{selectedSurat?.pemohon?.agama || '-'}</p>
                                </div>

                               <div className="pt-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Pekerjaan Utama</p>
                                  <p className="text-[14px] font-bold text-gray-600">{selectedSurat?.pemohon?.pekerjaan || '-'}</p>
                               </div>

                               {/* WhatsApp Info & Contact Action */}
                               <div className="pt-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2 tracking-wider">Kontak Utama</p>
                                  <div className="flex items-center justify-between gap-4">
                                     <p className="text-[14px] font-bold text-gray-800 leading-tight">
                                        {selectedSurat?.pemohon?.nomor_telepon ? (() => {
                                          let cleaned = selectedSurat.pemohon.nomor_telepon?.replace(/[^0-9]/g, '') ?? '';
                                          if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
                                          else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
                                          return `${cleaned.substring(0, 5)} ${cleaned.substring(5, 9)} ${cleaned.substring(9)}`.trim();
                                        })() : '-'}
                                     </p>
                                     <button 
                                       onClick={() => window.open(`https://wa.me/${selectedSurat?.pemohon?.nomor_telepon?.replace(/[^0-9]/g, '')}`, '_blank')}
                                       className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase transition-all active:scale-95 hover:bg-emerald-600 hover:text-white"
                                     >
                                         Hubungi
                                     </button>
                                  </div>
                               </div>
                            </div>
                          </>
                        )}
                     </div>
                  </div>
                  )}
                </div>

                {/* MAIN PANEL (Refined Style) */}
                <div className="flex-1 lg:overflow-y-auto bg-white flex flex-col">
                  {showResult ? (
                     <div className="flex-1 w-full bg-white overflow-y-auto flex flex-col items-center">
                        <div className="relative w-full flex-1 flex flex-col items-center">
                            {/* Skeleton (Overlays the content) */}
                            {/* Sticky Formatting Toolbar (Only when processing or editing archive) */}
                            {((selectedSurat?.status === 'Diproses' && !isLoadingTemplate && !archivedContent && activeTemplate) || isEditingArchive) && showResult && (
                              <div className="sticky top-8 z-30 flex justify-center pointer-events-none w-full mb-[-60px]">
                                <div className="flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto animate-in slide-in-from-top-4 duration-500">
                                  <button 
                                    onClick={() => execCommand('bold')} 
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${activeStyles.bold ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}
                                    title="Bold"
                                  >
                                    <Bold className="w-4.5 h-4.5" />
                                  </button>
                                  <button 
                                    onClick={() => execCommand('italic')} 
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${activeStyles.italic ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}
                                    title="Italic"
                                  >
                                    <Italic className="w-4.5 h-4.5" />
                                  </button>
                                  <button 
                                    onClick={() => execCommand('underline')} 
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${activeStyles.underline ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}
                                    title="Underline"
                                  >
                                    <Underline className="w-4.5 h-4.5" />
                                  </button>
                                  <div className="w-[1px] h-6 bg-gray-100 mx-1" />
                                  <div className="px-3 py-1 bg-gray-50 rounded-lg">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Editor</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* UPDATE/SAVE BUTTON FOR ARCHIVE (Top Right) */}
                            {selectedSurat?.status === 'Selesai' && showResult && (
                              <div className="absolute top-8 right-8 z-30">
                                {isEditingArchive ? (
                                  <button 
                                    onClick={handleUpdateArchive}
                                    disabled={isProcessing}
                                    className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-[12px] uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    {isProcessing ? 'Menyimpan...' : 'Simpan'}
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => setIsEditingArchive(true)}
                                    className="px-6 py-3 bg-white text-gray-700 border border-gray-100 rounded-2xl font-bold text-[12px] uppercase tracking-widest shadow-lg hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 121 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Perbarui
                              </button>
                                )}
                              </div>
                            )}

                            {/* Balanced Document Skeleton (Stays visible if no template found) */}
                            {(isLoadingTemplate || (!isFullyLoaded && showResult && selectedSurat?.status === 'Diproses')) && !archivedContent && (
                               <div className={`absolute inset-0 py-10 md:py-20 flex flex-col items-center w-full z-20 pointer-events-none transition-all duration-700 ${isFullyLoaded ? 'opacity-0 scale-95' : 'opacity-100'}`}>
                                 <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-[15mm] md:p-[25mm] flex flex-col gap-12 relative overflow-hidden">
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-50/10 to-transparent animate-shimmer"></div>
                                    
                                    {/* Header hint */}
                                    <div className="flex items-start justify-between border-b border-gray-100 pb-8">
                                       <div className="w-16 h-16 bg-gray-50 rounded-xl"></div>
                                       <div className="flex-1 flex flex-col items-end gap-2 pt-2">
                                          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                          <div className="h-3 bg-gray-50 rounded w-1/3"></div>
                                       </div>
                                    </div>

                                    {/* Body content skeleton */}
                                    <div className="flex-1 flex flex-col gap-10">
                                       <div className="flex flex-col items-center gap-3 py-4">
                                          {(isLoadingTemplate || activeTemplate) && (
                                             <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                                          )}
                                          
                                          {/* Status Integrated Below Title */}
                                          <div className="flex flex-col items-center gap-4 w-full">
                                             {isLoadingTemplate ? (
                                               <div className="flex flex-col items-center gap-1.5">
                                                  <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.35em] animate-pulse">Menyiapkan Dokumen</p>
                                                  <div className="h-0.5 w-8 bg-gray-100 rounded-full animate-pulse"></div>
                                               </div>
                                             ) : !activeTemplate && selectedSurat?.status === 'Diproses' ? (
                                               selectedSurat.jenis_surat === 'Lainnya' ? (
                                                 <div className="flex flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-top-2 py-8 w-full">
                                                    <div className="w-32 h-24 flex items-center justify-center mb-6 relative">
                                                       {/* Document Outline (Dashed) */}
                                                       <div className="absolute top-0 right-4 w-16 h-20 border-2 border-dashed border-gray-100 rounded-lg -rotate-12 translate-x-4"></div>
                                                       
                                                       {/* Curled Document Silhouette */}
                                                       <svg className="w-16 h-20 text-gray-50 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                                                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                                          <path d="M14 2v6h6" className="text-gray-200" />
                                                       </svg>

                                                       {/* Magnifying Glass (Emerald for active choice) */}
                                                       <div className="absolute bottom-2 right-6 w-14 h-14 text-emerald-500 drop-shadow-md transform rotate-12">
                                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                             <circle cx="10" cy="10" r="7" className="fill-white/90" />
                                                             <line x1="21" y1="21" x2="15" y2="15" />
                                                          </svg>
                                                       </div>
                                                    </div>

                                                   <div className="space-y-6 w-full max-w-3xl">
                                                     <div className="flex flex-col items-center gap-1.5 mb-2">
                                                       <h4 className="text-[18px] font-black text-gray-900 uppercase tracking-widest">Pilih Template Layanan</h4>
                                                       <p className="text-[13px] text-gray-400 font-medium">Format dokumen untuk kategori "Lainnya"</p>
                                                     </div>

                                                     <div className="bg-white border border-gray-100 rounded-[28px] shadow-2xl shadow-gray-200/50 overflow-hidden text-left animate-in zoom-in-95 duration-500">
                                                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50 flex justify-between items-center gap-4">
                                                           <span className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.2em] whitespace-nowrap">Daftar Layanan</span>
                                                           <div className="relative flex-1 max-w-[240px]">
                                                              <input 
                                                                type="text"
                                                                placeholder="Cari template..."
                                                                value={selectionSearchQuery}
                                                                onChange={(e) => setSelectionSearchQuery(e.target.value)}
                                                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all pointer-events-auto cursor-text"
                                                              />
                                                              <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                                           </div>
                                                        </div>
                                                        <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-2">
                                                           {/* Filter the templates based on search query */}
                                                           {(() => {
                                                              const filtered = availableTemplates.filter(t => t.nama_template.toLowerCase().includes(selectionSearchQuery.toLowerCase()));
                                                              return (
                                                                <div 
                                                                  className="grid gap-x-6 gap-y-1"
                                                                  style={{ 
                                                                    gridTemplateColumns: filtered.length > 0 ? 'repeat(2, 1fr)' : '1fr',
                                                                    gridAutoFlow: 'column',
                                                                    gridTemplateRows: `repeat(${Math.ceil(filtered.length / 2)}, minmax(0, 1fr))` 
                                                                  }}
                                                                >
                                                                  {filtered.map((tpl, idx) => (
                                                                     <button 
                                                                       key={tpl.id}
                                                                       onClick={() => setActiveTemplate(tpl)}
                                                                       className="px-5 py-4 flex items-center gap-4 hover:bg-emerald-50 rounded-2xl transition-all group border border-transparent hover:border-emerald-100 active:scale-[0.98] cursor-pointer pointer-events-auto"
                                                                     >
                                                                        <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-gray-50 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all text-[12px] font-bold text-gray-600">
                                                                           {String(idx + 1).padStart(2, '0')}
                                                                        </div>
                                                                        <span className="text-[13px] font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors line-clamp-1">{tpl.nama_template}</span>
                                                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0">
                                                                           <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                                        </div>
                                                                     </button>
                                                                  ))}
                                                                  {filtered.length === 0 && (
                                                                     <div className="col-span-2 p-12 text-center">
                                                                        <p className="text-[13px] text-gray-400 italic">Tidak ada template yang cocok dengan pencarian "{selectionSearchQuery}"</p>
                                                                     </div>
                                                                  )}
                                                                </div>
                                                              );
                                                           })()}
                                                        </div>
                                                     </div>
                                                   </div>
                                                 </div>
                                               ) : (
                                                 <div className="flex flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-top-2 py-8">
                                                    <div className="w-32 h-24 flex items-center justify-center mb-6 relative">
                                                       {/* Document Outline (Dashed) */}
                                                       <div className="absolute top-0 right-4 w-16 h-20 border-2 border-dashed border-gray-200 rounded-lg -rotate-12 translate-x-4"></div>
                                                       
                                                       {/* Curled Document Silhouette */}
                                                       <svg className="w-16 h-20 text-gray-100 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                                                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                                          <path d="M14 2v6h6" className="text-gray-200" />
                                                          <path d="M18 22c-3 0-5-2-5-5s2-5 5-5" className="text-gray-300" fill="none" stroke="currentColor" strokeWidth="1" />
                                                       </svg>

                                                       {/* Magnifying Glass */}
                                                       <div className="absolute bottom-2 right-6 w-14 h-14 text-gray-500 drop-shadow-md transform rotate-12">
                                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                             <circle cx="10" cy="10" r="7" className="fill-white/80" />
                                                             <line x1="21" y1="21" x2="15" y2="15" />
                                                          </svg>
                                                       </div>
                                                    </div>
                                                   <div className="space-y-3">
                                                     <h4 className="text-[18px] font-black text-gray-900 uppercase tracking-widest">Template Tidak Ditemukan</h4>
                                                     <p className="text-[14px] text-gray-500 font-medium max-w-[350px] mx-auto leading-relaxed">
                                                       Silakan unggah template master untuk layanan <br />
                                                       <span className="text-gray-900 font-bold">"{selectedSurat.jenis_surat}"</span> <br />
                                                       di menu Pengaturan.
                                                     </p>
                                                   </div>
                                                 </div>
                                               )
                                             ) : (
                                               <div className="h-0.5 w-8 bg-gray-100 rounded-full opacity-50"></div>
                                             )}
                                          </div>
                                       </div>

                                       <div className="space-y-4">
                                          <div className="h-2.5 bg-gray-50 rounded-full w-full"></div>
                                          <div className="h-2.5 bg-gray-50 rounded-full w-full opacity-80"></div>
                                          <div className="h-2.5 bg-gray-50 rounded-full w-4/5 opacity-60"></div>
                                       </div>

                                       <div className="space-y-4 pt-10">
                                          <div className="h-2.5 bg-gray-50 rounded-full w-full opacity-40"></div>
                                          <div className="h-2.5 bg-gray-50 rounded-full w-2/3 opacity-20"></div>
                                       </div>
                                    </div>

                                    {/* Footer hint */}
                                    <div className="mt-auto ml-auto w-48 space-y-4">
                                       <div className="h-3 bg-gray-50 rounded w-full"></div>
                                       <div className="h-16 bg-gray-50/50 rounded-xl w-full border border-dashed border-gray-100"></div>
                                       <div className="h-3 bg-gray-100 rounded w-2/3 ml-auto"></div>
                                    </div>
                                 </div>
                              </div>
                            )}

                            {/* Real Content */}
                            <div className={`w-full docx-wrapper relative py-10 md:py-20 flex flex-col items-center bg-white ${(!activeTemplate || isLoadingTemplate) && !archivedContent ? 'invisible h-0 overflow-hidden' : 'visible block'}`}>
                               <div 
                                  ref={letterRef}
                                  contentEditable={selectedSurat?.status === 'Diproses' || isEditingArchive} 
                                  suppressContentEditableWarning 
                                  onMouseUp={updateActiveStyles}
                                  onKeyUp={updateActiveStyles}
                                  className={`docx-render-container outline-none bg-white mx-auto transition-all ${isEditingArchive ? 'ring-4 ring-emerald-500/10' : ''}`}
                                  style={{ width: '210mm', minHeight: '297mm' }}
                               />
                            </div>

                        </div>
                     </div>
                  ) : (
                  <div className="flex-1 max-w-5xl mx-auto w-full p-8 lg:p-12 space-y-12">
                    {isLoadingDetail ? (
                      <div className="animate-pulse space-y-12">
                        {/* Header Skeleton */}
                        <div className="flex justify-between items-end border-b border-gray-100 pb-8">
                          <div className="space-y-4">
                            <div className="h-3 w-32 bg-gray-100 rounded"></div>
                            <div className="h-8 w-64 bg-gray-100 rounded"></div>
                          </div>
                          <div className="w-64 h-24 bg-gray-50 rounded-2xl"></div>
                        </div>
                        {/* Details Skeleton */}
                        <div className="space-y-4">
                          <div className="h-3 w-40 bg-gray-100 rounded"></div>
                          <div className="h-32 bg-gray-50 rounded-2xl"></div>
                        </div>
                        {/* Attachments Skeleton */}
                        <div className="space-y-6">
                          <div className="h-3 w-48 bg-gray-100 rounded"></div>
                          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-2xl"></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* SECTION 1: Subject Header */}
                        <section className="space-y-6">
                          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-3">
                                <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Atas Nama</span>
                                <span className="text-[12px] font-semibold tracking-widest bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                  {selectedSurat?.is_mewakili ? selectedSurat.nik_subjek : selectedSurat?.pemohon?.nik}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-800 break-words leading-tight">
                                  {selectedSurat?.is_mewakili ? selectedSurat.nama_subjek : selectedSurat?.pemohon?.nama}
                                </h2>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight border ${!(selectedSurat?.is_mewakili ? selectedSurat?.jenis_kelamin_subjek : selectedSurat?.pemohon?.jenis_kelamin) ? 'bg-gray-50 text-gray-400 border-gray-100' : (selectedSurat?.is_mewakili ? selectedSurat?.jenis_kelamin_subjek : selectedSurat?.pemohon?.jenis_kelamin)?.toLowerCase() === 'laki-laki' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                                   {!(selectedSurat?.is_mewakili ? selectedSurat?.jenis_kelamin_subjek : selectedSurat?.pemohon?.jenis_kelamin) ? '-' : ((selectedSurat?.is_mewakili ? selectedSurat?.jenis_kelamin_subjek : selectedSurat?.pemohon?.jenis_kelamin)?.toLowerCase() === 'laki-laki' ? 'LK' : 'PR')}
                                </span>
                              </div>

                              {selectedSurat?.is_mewakili && (
                                 <div className="text-[13px] font-semibold text-gray-400 mt-0.5 flex items-center gap-2">
                                    <span>RT {selectedSurat?.rt_subjek} / RW {selectedSurat?.rw_subjek}, {selectedSurat?.alamat_subjek}</span>
                                 </div>
                              )}
                            </div>

                            {selectedSurat?.is_mewakili && (
                              <div className="bg-gray-50 rounded-2xl p-5 px-8 border border-gray-100 flex items-center gap-4 md:min-w-[320px]">
                                <div>
                                  <p className="text-[12px] font-semibold text-gray-400 uppercase mb-1.5 tracking-wider">Diajukan Oleh</p>
                                  <p className="text-md font-bold text-gray-700 leading-tight break-words">{selectedSurat?.pemohon?.nama}</p>
                                  <p className="text-[11px] font-bold text-emerald-600 uppercase mt-2 bg-emerald-50 border border-emerald-100 w-fit px-2 rounded">Hubungan: {selectedSurat?.hubungan_subjek}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </section>

                        {/* SECTION 2: Keperluan & Alasan Penolakan (if exists) */}
                        <section className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-12">
                          <div className="flex-1 flex flex-col">
                            <h3 className="text-[12px] font-semibold text-gray-400 uppercase mb-3 tracking-wider">
                              Rincian Keperluan
                            </h3>
                            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-7 relative overflow-hidden h-full">
                              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/10"></div>
                              <div className="text-[15px] font-medium text-gray-700 leading-relaxed">
                                {(() => {
                                  const text = selectedSurat?.keperluan || '';
                                  const jenis = selectedSurat?.jenis_surat || '';
                                  const lastParen = text.lastIndexOf(')');
                                  
                                  if (text.startsWith('(') && lastParen !== -1) {
                                    let header = text.substring(0, lastParen + 1).trim();
                                    const body = text.substring(lastParen + 1).trim();
                                    
                                    if (header.startsWith('(') && header.endsWith(')')) {
                                      header = header.substring(1, header.length - 1);
                                    }

                                    return (
                                      <>
                                        <p className="font-bold text-emerald-600 mb-2">{header}</p>
                                        {body && <p>{body}</p>}
                                      </>
                                    );
                                  }

                                  return (
                                    <>
                                      <p className="font-bold text-emerald-600 mb-2">{jenis}</p>
                                      {text && <p>{text}</p>}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {selectedSurat?.status === 'Ditolak' && selectedSurat?.response_admin && (
                            <div className="flex flex-col shrink-0">
                              <h3 className="text-[12px] font-semibold text-red-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                 Alasan Penolakan
                              </h3>
                              <div className="bg-red-50/50 rounded-2xl p-5 px-8 border border-red-100 flex items-start gap-4 w-full md:w-[320px] h-full min-h-[100px]">
                                <p className="text-[15px] font-medium text-gray-700 leading-relaxed break-words w-full">{selectedSurat.response_admin}</p>
                              </div>
                            </div>
                          )}
                        </section>

                        {selectedSurat?.dokumen_lampiran && Array.isArray(selectedSurat.dokumen_lampiran) && selectedSurat.dokumen_lampiran.length > 0 && (
                          <section className="flex flex-col pt-6">
                            <h3 className="text-[12px] font-semibold text-gray-400 uppercase mb-3 tracking-wider">
                              Lampiran Pendukung ({selectedSurat.dokumen_lampiran.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
                              {selectedSurat.dokumen_lampiran.map((doc, idx) => {
                                const rawPath = typeof doc === 'string' ? doc : doc.path;
                                const fullUrl = `/api/files?bucket=dokumen_lampiran&path=${encodeURIComponent(rawPath)}`;
                                const isImage = rawPath.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                                
                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => setShowFullDoc(fullUrl)}
                                    className="group relative aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 cursor-zoom-in hover:shadow-xl hover:border-emerald-500 transition-all"
                                  >
                                    {isImage ? (
                                      <img src={fullUrl} alt="Lampiran" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                        <span className="text-[10px] font-black uppercase">Document</span>
                                      </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                      <p className="text-[10px] text-white font-bold truncate">Lampiran {idx + 1}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                  )}

                  {/* SECTION 4: Action Footer */}
                  {selectedSurat && (
                     <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-8 py-6 flex items-center justify-between">
                        {selectedSurat.status === 'Selesai' ? (
                           <>
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                 </div>
                                 <p className="hidden md:block text-[14px] font-bold text-gray-700 uppercase tracking-wider">Pengajuan Telah Selesai</p>
                              </div>
                               <div className="flex items-center gap-3">
                                 <button 
                                    onClick={() => {
                                      if (!showResult) {
                                        setShowResult(true);
                                      } else {
                                        handlePrint();
                                      }
                                    }}
                                    className={`px-10 py-4 rounded-2xl font-bold text-[14px] uppercase tracking-[0.15em] transition-all active:scale-95 flex items-center gap-3 shadow-xl ${
                                      showResult 
                                        ? 'bg-gray-900 text-white hover:bg-black shadow-gray-200/50' 
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200/50'
                                    }`}
                                 >
                                    {showResult ? 'Cetak Surat' : 'Lihat Surat'}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                 </button>
                               </div>
                           </>
                        ) : selectedSurat.status === 'Ditolak' ? (
                           <>
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                 </div>
                                 <p className="hidden md:block text-[14px] font-bold text-gray-700 uppercase tracking-wider">Pengajuan Ditolak</p>
                              </div>
                              <button 
                                 onClick={() => openDrawer(selectedSurat)}
                                 className="px-10 py-4 rounded-2xl font-bold text-[13px] uppercase tracking-widest bg-gray-100 text-gray-500 cursor-not-allowed"
                                 disabled
                              >
                                 Sudah Selesai
                              </button>
                           </>
                        ) : (
                           <>
                              <div className="flex items-center gap-4">
                                 <button 
                                    onClick={() => setIsRejectModalOpen(true)}
                                    className="px-6 md:px-8 py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-bold text-[13px] uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95 whitespace-nowrap"
                                 >
                                    Tolak <span className="hidden md:inline">Pengajuan</span>
                                 </button>
                              </div>

                              <div className="flex items-center gap-4">
                                 <button 
                                    onClick={() => {
                                      if (selectedSurat.status === 'Masuk') {
                                        handleUpdateStatus('Diproses');
                                      } else if (selectedSurat.status === 'Diproses') {
                                        if (!showResult) {
                                          setShowResult(true);
                                        } else {
                                          handleUpdateStatus('Selesai');
                                        }
                                      }
                                    }}
                                    disabled={isProcessing}
                                    className={`py-4 rounded-2xl font-bold uppercase transition-all active:scale-95 flex items-center gap-3 shadow-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200/50 disabled:opacity-50 whitespace-nowrap ${
                                      (selectedSurat.status === 'Diproses' && !showResult)
                                        ? 'px-6 md:px-8 text-[13px] tracking-widest'
                                        : 'px-8 md:px-10 text-[14px] tracking-[0.15em]'
                                    }`}
                                 >
                                    {isProcessing ? 'Memproses...' : (
                                       <>
                                          <span className="hidden md:inline">
                                             {selectedSurat.status === 'Masuk' ? 'Proses Pengajuan' : (showResult ? 'Selesaikan Pengajuan' : 'Lanjut Proses')}
                                          </span>
                                          <span className="md:hidden">
                                             {selectedSurat.status === 'Masuk' ? 'Proses' : (showResult ? 'Selesaikan' : 'Lanjut')}
                                          </span>
                                       </>
                                    )}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                 </button>
                              </div>
                           </>
                        )}
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Full Screen Document Lightbox (Profile Style) */}
      {showFullDoc && createPortal(
         <div 
           className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-6 lg:p-10 animate-in fade-in duration-300"
           onClick={() => setShowFullDoc(null)}
         >
            <div 
              className="bg-white rounded-[32px] p-2 shadow-2xl relative max-w-[95vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
               <button 
                 onClick={() => setShowFullDoc(null)}
                 className="absolute -top-3 -right-3 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 shadow-xl transition-all z-10 hover:scale-110 active:scale-95"
               >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
               {(showFullDoc?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || (showFullDoc && showFullDoc.startsWith('data:image/'))) ? (
                 <img src={showFullDoc} alt="Expanded Document" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
               ) : (
                 <div className="bg-gray-50 p-20 rounded-2xl flex flex-col items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-lg">
                       <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div className="text-center">
                       <h3 className="text-xl font-bold text-gray-900">Lampiran Non-Gambar</h3>
                       <p className="text-gray-500 mt-2">Pratinjau langsung hanya tersedia untuk format gambar.</p>
                       <a 
                          href={showFullDoc || ''} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-6 inline-flex px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                       >
                          Unduh / Buka File
                       </a>
                    </div>
                 </div>
               )}
            </div>
         </div>,
         document.body
      )}

      {/* Simple Rejection Modal */}
      {isRejectModalOpen && createPortal(
         <div className="fixed inset-0 z-[300] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-[500px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </div>
                  <div>
                     <h3 className="text-[18px] font-bold text-gray-900">Alasan Penolakan</h3>
                     <p className="text-[12px] text-gray-500 font-medium italic">Berikan alasan jelas mengapa pengajuan ini ditolak</p>
                  </div>
               </div>

               <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Dokumen lampiran tidak sesuai atau NIK tidak terdaftar..."
                  className="w-full h-32 p-4 rounded-2xl bg-gray-50 text-gray-900 border-none outline-none focus:ring-2 focus:ring-red-100 transition-all text-sm font-medium resize-none mb-6"
               />

               <div className="flex items-center gap-3">
                  <button 
                     onClick={() => setIsRejectModalOpen(false)}
                     className="flex-1 py-3.5 bg-gray-100 rounded-2xl text-[13px] font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                     Batal
                  </button>
                  <button 
                     onClick={() => handleUpdateStatus('Ditolak', rejectionReason)}
                     disabled={!rejectionReason.trim() || isProcessing}
                     className="flex-1 py-3.5 bg-red-500 rounded-2xl text-[13px] font-bold text-white uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-100"
                  >
                     Konfirmasi Tolak
                  </button>
               </div>
            </div>
         </div>,
         document.body
      )}

      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        buttonText={notification.buttonText}
        onConfirm={notification.onConfirm}
      />

      <Toast 
        isOpen={toast.isOpen}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
   );
}

const styles = `
  .docx-render-container div:not(.docx) {
      background: transparent !important;
      background-color: transparent !important;
  }

  .docx-wrapper {
      background: white !important; 
      padding: 40px 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      width: 100% !important;
      min-height: 100% !important;
  }
  
  section.docx {
      background: #ffffff !important;
      background-color: #ffffff !important;
      box-shadow: none !important;
      border: none !important;
      padding: 20mm !important;
      margin: 0 auto !important;
      width: 210mm !important;
      min-height: 297mm !important;
      position: relative !important;
      display: block !important;
      box-sizing: border-box !important;
  }

  @media (max-width: 768px) {
      .docx-wrapper {
          padding: 10px !important;
          align-items: flex-start !important;
          width: max-content !important;
      }
      section.docx {
          width: 210mm !important;
          min-width: 210mm !important;
          padding: 15mm !important;
          margin: 0 !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: none !important;
      }
  }

  .docx-view {
      overflow: visible !important;
  }
`;

if (typeof document !== 'undefined') {
  const styleTag = document.getElementById('docx-preview-styles') || document.createElement('style');
  styleTag.id = 'docx-preview-styles';
  styleTag.innerHTML = styles;
  if (!document.getElementById('docx-preview-styles')) {
    document.head.appendChild(styleTag);
  }
}
