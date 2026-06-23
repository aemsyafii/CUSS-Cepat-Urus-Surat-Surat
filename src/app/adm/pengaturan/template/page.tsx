'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useAdminData } from '@/app/adm/AdminDataContext';
import { renderAsync } from 'docx-preview';
import { 
  Plus, Search, FileText, Edit, Trash2, X,
  Eye, Download, Save,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify 
} from 'lucide-react';
import { gzipHtml, gunzipToText } from '@/lib/compress';

type SuratTemplate = {
  id: string;
  nama_template: string;
  identitas_surat: string;
  file_path: string | null;
  created_at: string;
};

export default function TemplateSettingsPage() {
  const { setGlobalToast } = useAdminData();
  const supabase = createBrowserSupabase();
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [layananOptions, setLayananOptions] = useState<string[]>([]);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SuratTemplate | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const [showGuide, setShowGuide] = useState(false);
  
  // Track cursor position for dropdown interactions
  const savedSelection = useRef<Range | null>(null);
  
  const [formData, setFormData] = useState({
    nama: '',
    identitas: '',
    customIdentitas: '',
    file: null as File | null
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);

  // Smooth progress effect
  useEffect(() => {
    if (!isProcessing) {
      setSaveProgress(0);
      setTargetProgress(0);
      return;
    }

    let interval: NodeJS.Timeout;
    if (saveProgress < targetProgress) {
      interval = setInterval(() => {
        setSaveProgress(prev => {
          if (prev >= targetProgress) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 15); // Faster increment for better feel
    }
    return () => clearInterval(interval);
  }, [isProcessing, saveProgress, targetProgress]);
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    fontName: 'Times New Roman',
    fontSize: '12',
    foreColor: '#000000',
    align: 'left'
  });
  
  const loadTemplates = async () => {
    // Attempt to load from cache first
    const cached = localStorage.getItem('cuss_templates_cache');
    if (cached) {
      setTemplates(JSON.parse(cached));
      setIsLoading(false);
    }

    try {
       const { data, error } = await supabase.from('TemplateSurat').select('*').order('created_at', { ascending: false });
       if (error) throw error;
       
       const freshData = data || [];
       setTemplates(freshData);
       localStorage.setItem('cuss_templates_cache', JSON.stringify(freshData));

       // Only fetch options if they are empty
       if (layananOptions.length === 0) {
           const { data: layananData } = await supabase.from('PengaturanSistem').select('nilai').eq('kunci', 'jenis_layanan_surat').single();
           if (layananData) setLayananOptions((layananData as any).nilai || []);
       }
    } catch (error) {
      console.error('Template fetch error:', error);
    } finally {
       setIsLoading(false);
    }
  };

  useEffect(() => {
     loadTemplates();
 
     // REAL-TIME LISTENER
     const channel = supabase
       .channel('template-realtime')
       .on(
         'postgres_changes',
         { event: '*', schema: 'public', table: 'TemplateSurat' },
         (payload) => {
           if (payload.eventType === 'UPDATE') {
             setTemplates(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
           } else if (payload.eventType === 'INSERT') {
             setTemplates(prev => prev.some(t => t.id === payload.new.id) ? prev : [payload.new as SuratTemplate, ...prev]);
           } else if (payload.eventType === 'DELETE') {
             setTemplates(prev => prev.filter(t => t.id === payload.old.id));
           }
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
  }, []);

  const generatePreview = async (filePath: string, container: HTMLElement) => {
    setIsPreviewLoading(true);
    
    try {
      const { data, error } = await supabase.storage.from('templates_surat').download(filePath);
      if (error) throw error;

      if (filePath.endsWith('.html.gz')) {
         const htmlText = await gunzipToText(data);
         const parser = new DOMParser();
         const doc = parser.parseFromString(htmlText, 'text/html');
         container.innerHTML = doc.body.innerHTML;
      } else if (filePath.endsWith('.html')) {
         const htmlText = await data.text();
         const parser = new DOMParser();
         const doc = parser.parseFromString(htmlText, 'text/html');
         container.innerHTML = doc.body.innerHTML;
      } else {
         container.innerHTML = '';
         await renderAsync(data, container, undefined, {
           className: 'docx-view',
           inWrapper: true,
           ignoreWidth: false,
           ignoreHeight: false,
           useBase64URL: true,
           debug: false
         });
      }
    } catch (error) {
      console.error('Preview error:', error);
      if (container) {
        container.innerHTML = '<div class="text-center italic text-red-500 font-bold mt-10">Gagal memproses pratinjau. Pastikan file adalah format .docx yang valid.</div>';
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleOpenPreview = (tpl: SuratTemplate) => {
    setSelectedTemplate(tpl);
    setIsPreviewOpen(true);
    setIsEditingPreview(false);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0);
      updateToolbarState();
    }
  };

  const rgbToHex = (rgb: string) => {
    if (!rgb || !rgb.startsWith('rgb')) return '#000000';
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const updateToolbarState = () => {
    try {
      const sel = window.getSelection();
      let computedSize = '12';
      if (sel && sel.rangeCount > 0) {
        let node = sel.anchorNode;
        if (node) {
          const element = node.nodeType === 3 ? node.parentElement : node as HTMLElement;
          if (element) {
            const computed = window.getComputedStyle(element);
            const sizePx = parseFloat(computed.fontSize);
            computedSize = Math.round(sizePx * 0.75).toString();
          }
        }
      }

      setActiveStyles({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        fontName: document.queryCommandValue('fontName')?.replace(/"/g, '') || 'Times New Roman',
        fontSize: computedSize,
        foreColor: rgbToHex(document.queryCommandValue('foreColor')),
        align: document.queryCommandState('justifyCenter') ? 'center' : 
               document.queryCommandState('justifyRight') ? 'right' : 
               document.queryCommandState('justifyFull') ? 'justify' : 'left'
      });
    } catch (e) {}
  };

  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    restoreSelection();
    try { (document as any).execCommand('styleWithCSS', false, 'true'); } catch (e) {}
    document.execCommand(command, false, value);
    saveSelection();
  };

  const changeFontSizePt = (ptValue: string) => {
    setActiveStyles(prev => ({ ...prev, fontSize: ptValue }));
    if (!ptValue || isNaN(parseInt(ptValue))) return;
    
    restoreSelection();
    try { (document as any).execCommand('styleWithCSS', false, 'true'); } catch (e) {}
    document.execCommand('fontSize', false, '7');
    
    if (previewContainerRef.current) {
      const elements = previewContainerRef.current.querySelectorAll('font[size="7"], span[style*="xxx-large"], span[style*="48px"]');
      elements.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.tagName === 'FONT') htmlEl.removeAttribute('size');
        htmlEl.style.fontSize = `${ptValue}pt`;
        htmlEl.style.lineHeight = '1.2';
      });
    }
    saveSelection();
  };

  const handleSaveTemplateToDB = async () => {
    if (!previewContainerRef.current || !selectedTemplate) return;
    
    setIsProcessing(true);
    setTargetProgress(20);
    try {
      const clone = previewContainerRef.current.cloneNode(true) as HTMLElement;
      const imgs = clone.getElementsByTagName('img');
      const totalImgs = imgs.length;
      const imgPromises = Array.from(imgs).map(async (img, idx) => {
         if (img.src.startsWith('blob:')) {
            try {
               const response = await fetch(img.src);
               const blob = await response.blob();
               return new Promise<void>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                     img.src = reader.result as string;
                     setTargetProgress(20 + Math.round(((idx + 1) / totalImgs) * 40));
                     resolve();
                  };
                  reader.readAsDataURL(blob);
               });
            } catch (e) {
               console.error('Failed to convert image to base64', e);
            }
         } else {
            setTargetProgress(20 + Math.round(((idx + 1) / totalImgs) * 40));
         }
      });
      
      await Promise.all(imgPromises);
      setTargetProgress(65);

      const htmlContent = clone.innerHTML;
      const sourceHTML = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Export</title>
          <style>
            body { font-family: 'Times New Roman', serif; background: white; }
            .docx-wrapper { background: white !important; padding: 0 !important; }
            section.docx { background: white !important; box-shadow: none !important; padding: 20mm !important; }
            p { margin: 0; padding: 0; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="docx-render-container">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;
      
      const blob = await gzipHtml('\ufeff' + sourceHTML);
      const safeName = selectedTemplate.identitas_surat.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fileName = `edited_${safeName}_${Date.now()}.html.gz`;
      
      const { error: uploadError } = await supabase.storage
          .from('templates_surat')
          .upload(fileName, blob, { upsert: true, contentType: 'application/gzip' });
          
      if (uploadError) throw uploadError;
      setTargetProgress(90);
      
      // Delete old file if it exists and is different from new one
      if (selectedTemplate.file_path && selectedTemplate.file_path !== fileName) {
        await supabase.storage.from('templates_surat').remove([selectedTemplate.file_path]);
      }
      
      const { error: dbError } = await supabase.from('TemplateSurat')
          .update({ file_path: fileName })
          .eq('id', selectedTemplate.id);
          
      if (dbError) throw dbError;
      setTargetProgress(100);
      
      setIsEditingPreview(false);
      loadTemplates();
      setSelectedTemplate({ ...selectedTemplate, file_path: fileName });
      setGlobalToast({ show: true, type: 'success', label: 'Simpan', message: 'Perubahan template berhasil disimpan.' });
    } catch (err) {
      console.error(err);
      setGlobalToast({ show: true, type: 'error', label: 'Sistem', message: 'Gagal menyimpan perubahan.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!previewContainerRef.current) return;
    const htmlContent = previewContainerRef.current.innerHTML;
    const sourceHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Export</title>
        <style>
          body { font-family: 'Times New Roman', serif; }
          p { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate?.nama_template || 'Dokumen'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };




  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isPreviewOpen && selectedTemplate?.file_path) {
      timeoutId = setTimeout(() => {
        if (previewContainerRef.current && selectedTemplate.file_path) {
          generatePreview(selectedTemplate.file_path, previewContainerRef.current);
        }
      }, 100);
    }
    return () => clearTimeout(timeoutId);
  }, [isPreviewOpen, selectedTemplate]);

  const handleOpenModal = (mode: 'create' | 'edit', tpl?: SuratTemplate) => {
    setModalMode(mode);
    if (mode === 'edit' && tpl) {
      setSelectedTemplate(tpl);
      setFormData({ nama: tpl.nama_template, identitas: tpl.identitas_surat, customIdentitas: '', file: null });
    } else {
      setSelectedTemplate(null);
      setFormData({ nama: '', identitas: '', customIdentitas: '', file: null });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalIdentitas = formData.identitas === 'Lainnya' 
      ? `LAINNYA-${formData.nama.toUpperCase().replace(/[^A-Z0-9]/g, '-')}` 
      : formData.identitas;
    if (!formData.nama || !finalIdentitas) return;
    if (modalMode === 'create' && !formData.file) {
      setGlobalToast({ show: true, type: 'error', label: 'Lampiran', message: 'Silakan pilih berkas dokumen (.docx) sebagai dasar template.' });
      return;
    }

    setIsProcessing(true);
    setTargetProgress(10);
    try {
      let filePath = selectedTemplate?.file_path || null;
      if (formData.file) {
        setTargetProgress(25);
        const arrayBuffer = await formData.file.arrayBuffer();
        const hiddenDiv = document.createElement('div');
        hiddenDiv.className = 'docx-render-container';
        
        await renderAsync(arrayBuffer, hiddenDiv, undefined, {
          className: 'docx-view',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          useBase64URL: true
        });
        setTargetProgress(50);

        const imgs = hiddenDiv.getElementsByTagName('img');
        const totalImgs = imgs.length;
        const imgPromises = Array.from(imgs).map(async (img, idx) => {
           if (img.src.startsWith('blob:')) {
              try {
                 const response = await fetch(img.src);
                 const blob = await response.blob();
                 return new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                       img.src = reader.result as string;
                       setTargetProgress(50 + Math.round(((idx + 1) / totalImgs) * 20));
                       resolve();
                    };
                    reader.readAsDataURL(blob);
                 });
              } catch (e) {}
           } else {
              setTargetProgress(50 + Math.round(((idx + 1) / totalImgs) * 20));
           }
        });
        await Promise.all(imgPromises);
        setTargetProgress(75);

        const htmlContent = hiddenDiv.innerHTML;
        const sourceHTML = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <title>Template HTML</title>
            <style>
              body { font-family: 'Times New Roman', serif; background: white; }
              .docx-wrapper { background: white !important; padding: 0 !important; }
              section.docx { background: white !important; box-shadow: none !important; padding: 20mm !important; }
              p { margin: 0; padding: 0; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="docx-render-container">
              ${htmlContent}
            </div>
          </body>
          </html>
        `;
        
        const blob = await gzipHtml('\ufeff' + sourceHTML);
        const safeName = formData.identitas.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const fileName = `template_${safeName}_${Date.now()}.html.gz`;
        
        const { error: uploadError } = await supabase.storage.from('templates_surat').upload(fileName, blob, { upsert: true, contentType: 'application/gzip' });
        if (uploadError) throw uploadError;
        setTargetProgress(90);
        
        if (modalMode === 'edit' && filePath) {
          await supabase.storage.from('templates_surat').remove([filePath]);
        }
        filePath = fileName;
      }

      if (modalMode === 'create') {
        const { data: insertedData, error } = await supabase.from('TemplateSurat').insert([{ nama_template: formData.nama, identitas_surat: finalIdentitas, file_path: filePath }] as any).select().single();
        if (error) throw error;
        setTargetProgress(100);
        setTemplates(prev => [insertedData as SuratTemplate, ...prev]);
        setGlobalToast({ show: true, type: 'success', label: 'Berhasil', message: 'Template surat baru telah berhasil dikonfigurasi.' });
      } else {
        const { error } = await supabase.from('TemplateSurat').update({ nama_template: formData.nama, identitas_surat: finalIdentitas, file_path: filePath ?? null, updated_at: new Date().toISOString() } as any).eq('id', selectedTemplate?.id ?? '');
        if (error) throw error;
        setTargetProgress(100);
        setTemplates(prev => prev.map(t => t.id === selectedTemplate?.id ? { ...t, nama_template: formData.nama, identitas_surat: finalIdentitas, file_path: filePath } : t));
        setGlobalToast({ show: true, type: 'success', label: 'Diperbarui', message: 'Perubahan pada konfigurasi template telah berhasil diterapkan.' });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      let errorMsg = 'Terjadi kesalahan saat memproses data template.';
      if (error.code === '23505') {
        errorMsg = `Kode identitas "${finalIdentitas}" sudah digunakan oleh template lain. Mohon gunakan kode yang unik.`;
      }
      setGlobalToast({ show: true, type: 'error', label: 'Peringatan', message: errorMsg });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTemplate = async (tpl: SuratTemplate) => {
    if (!confirm(`Hapus template "${tpl.nama_template}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setIsProcessing(true);
    try {
      if (tpl.file_path) await supabase.storage.from('templates_surat').remove([tpl.file_path]);
      const { error } = await supabase.from('TemplateSurat').delete().eq('id', tpl.id);
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      setGlobalToast({ show: true, type: 'success', label: 'Dihapus', message: 'Template surat telah berhasil dihapus dari sistem.' });
    } catch (error) {
      setGlobalToast({ show: true, type: 'error', label: 'Peringatan', message: 'Gagal menghapus template. Silakan hubungi admin sistem.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.nama_template.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.identitas_surat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="border-b border-gray-100 px-8 py-6 relative overflow-hidden bg-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
               Master Template Surat
            </h2>
            <p className="text-[13px] text-gray-500 font-medium mt-1">Kelola berkas format dokumen desa (.docx) dengan pratinjau presisi.</p>
          </div>

          <button 
             onClick={() => handleOpenModal('create')}
             suppressHydrationWarning
             className="px-5 py-2.5 bg-emerald-500 text-white font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 active:scale-95 shadow-sm transition-all flex items-center justify-center gap-2"
          >
             <Plus className="w-4 h-4" strokeWidth={3} />
             Tambah
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* SEARCH & TOGGLE SECTION */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center gap-4">
           <div className="relative max-w-md w-full">
              <input 
                 type="text" 
                 placeholder="Cari berdasarkan nama atau kode..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 suppressHydrationWarning
                 className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
           </div>

           <button 
              onClick={() => setShowGuide(!showGuide)}
              suppressHydrationWarning
              className={`px-5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${showGuide ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {showGuide ? 'Tutup' : 'Panduan'}
           </button>
        </div>

        {/* PLACEHOLDER GUIDE (Simplified) */}
        {showGuide && (
          <div className="mb-8 p-6 bg-gray-50/50 border border-gray-100 rounded-[20px] animate-in slide-in-from-top-2 duration-300">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { tag: '[nama_pemohon]', label: 'Nama Lengkap' },
                  { tag: '[nik_pemohon]', label: 'Nomor NIK' },
                  { tag: '[tanggal_lahir]', label: 'Tanggal Lahir' },
                  { tag: '[jenis_kelamin]', label: 'L / P' },
                  { tag: '[pekerjaan]', label: 'Pekerjaan' },
                  { tag: '[agama]', label: 'Agama' },
                  { tag: '[nomor_telepon]', label: 'No. Telepon' },
                  { tag: '[alamat]', label: 'Alamat' },
                  { isCombined: true, tag1: '[rt]', tag2: '[rw]', label: 'RT / RW' },
                  { tag: '[tanggal]', label: 'Tgl Sekarang' },
                  { tag: '[bulan]', label: 'Bln Sekarang' },
                  { tag: '[tahun]', label: 'Thn Sekarang' },
                  { tag: '[no_surat]', label: 'No Surat' }
                ].map((item: any, i) => (
                  <div key={i} className="flex flex-col">
                     {item.isCombined ? (
                        <div className="flex items-center gap-1 mb-0.5">
                           <code className="text-[12px] font-bold text-emerald-600">{item.tag1}</code>
                           <span className="text-[12px] font-bold text-gray-300">/</span>
                           <code className="text-[12px] font-bold text-emerald-600">{item.tag2}</code>
                        </div>
                     ) : (
                        <code className="text-[12px] font-bold text-emerald-600 mb-0.5">{item.tag}</code>
                     )}
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        <div className="space-y-4">
           <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 rounded-t-xl flex items-center justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <span>Daftar Template Tersedia</span>
              <span>Aksi & Kontrol</span>
           </div>
           
           <div className="divide-y divide-gray-50 bg-white border border-gray-50 rounded-b-xl shadow-sm">
              {isLoading && templates.length === 0 ? (
                 [1, 2, 3].map(i => (
                   <div key={i} className="p-6 h-20 bg-white relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gray-50/50 to-transparent"></div>
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-gray-50 rounded-2xl"></div>
                         <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-50 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-50 rounded w-1/4"></div>
                         </div>
                      </div>
                   </div>
                 ))
              ) : filteredTemplates.length === 0 ? (
                 <div className="p-12 text-center text-gray-400">
                    <p className="text-[13px] font-medium italic">Belum ada template yang sesuai.</p>
                 </div>
              ) : filteredTemplates.map((tpl) => (
                 <div key={tpl.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 border border-gray-100 shadow-sm shrink-0">
                          <FileText className="w-6 h-6" strokeWidth={1.5} />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <h3 className="text-[15px] font-bold text-gray-900">{tpl.nama_template}</h3>
                          </div>
                          <p className="text-[12px] text-gray-500">Dibuat pada {new Date(tpl.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <button 
                          onClick={() => handleOpenPreview(tpl)}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                       >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                       </button>
                       <button 
                          onClick={() => handleOpenModal('edit', tpl)}
                          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                       >
                          <Edit className="w-5 h-5" />
                       </button>
                       <button 
                          onClick={() => handleDeleteTemplate(tpl)}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                       >
                          <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-gray-900">{modalMode === 'create' ? 'Buat Template' : 'Edit Template'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Jenis Layanan / Kategori</label>
                  <select 
                    value={formData.identitas} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ 
                        ...formData, 
                        identitas: val,
                        nama: val !== 'Lainnya' ? val : (formData.identitas === 'Lainnya' ? formData.nama : '')
                      });
                    }} 
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer appearance-none" 
                    required
                  >
                    <option value="" disabled>Pilih Jenis Layanan</option>
                    {layananOptions.filter(opt => !templates.some(t => t.identitas_surat === opt) || (modalMode === 'edit' && selectedTemplate?.identitas_surat === opt)).map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Tampilan Template</label>
                  <input 
                    type="text" 
                    value={formData.nama} 
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })} 
                    placeholder="Masukkan nama template yang akan tampil di daftar..." 
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Unggah Berkas (.docx)</label>
                  <div onClick={() => createFileInputRef.current?.click()} className={`group border border-gray-100 rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all ${formData.file ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 hover:bg-white hover:border-emerald-200 hover:shadow-sm'}`}>
                    <input type="file" ref={createFileInputRef} className="hidden" accept=".docx" onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })} />
                    
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${formData.file ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white text-gray-400 border border-gray-100 group-hover:text-emerald-500 group-hover:border-emerald-100'}`}>
                      {formData.file ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-bold truncate ${formData.file ? 'text-emerald-700' : (modalMode === 'edit' ? 'text-blue-600' : 'text-gray-600')}`}>
                        {formData.file ? formData.file.name : (modalMode === 'edit' ? 'Gunakan Berkas Saat Ini' : 'Pilih Berkas Master (.docx)')}
                      </p>
                      {!formData.file && (
                        <p className="text-[11px] text-gray-400 font-medium">
                          {modalMode === 'edit' ? 'Klik untuk mengganti dengan berkas baru' : 'Format Microsoft Word didukung'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold text-[13px] uppercase tracking-wider hover:bg-gray-100">Batal</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] px-6 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-[13px] uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50">{isProcessing ? `Menyimpan ${saveProgress}%` : (modalMode === 'create' ? 'Buat' : 'Simpan')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreviewOpen && selectedTemplate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-7xl h-full rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-gray-100">
              <div className="px-8 py-5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 z-10">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                       <FileText className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Editor Sistem Template</h3>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                    {isEditingPreview ? (
                       <button 
                          onClick={handleSaveTemplateToDB} 
                          disabled={isProcessing}
                          className="px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                       >
                          <Save className="w-4 h-4" />
                          {isProcessing ? `Menyimpan ${saveProgress}%` : 'Simpan'}
                       </button>
                    ) : (
                       <button 
                          onClick={() => setIsEditingPreview(true)} 
                          className="px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100"
                       >
                          <Edit className="w-4 h-4" />
                          Edit Teks
                       </button>
                    )}
                    <button onClick={() => setIsPreviewOpen(false)} className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div className="flex-1 flex overflow-hidden bg-gray-50/50">
                 {isEditingPreview && (
                    <div className="w-24 bg-white border-r border-gray-100 flex flex-col items-center py-8 gap-8 overflow-y-auto custom-scrollbar shrink-0 z-20">
                       <div className="flex flex-col gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                          <button onClick={() => execCommand('bold')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeStyles.bold ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Bold"><Bold className="w-4 h-4" /></button>
                          <button onClick={() => execCommand('italic')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeStyles.italic ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Italic"><Italic className="w-4 h-4" /></button>
                          <button onClick={() => execCommand('underline')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeStyles.underline ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Underline"><Underline className="w-4 h-4" /></button>
                       </div>

                       <div className="flex flex-col gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                          <button onClick={() => execCommand('justifyLeft')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeStyles.align === 'left' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                          <button onClick={() => execCommand('justifyCenter')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeStyles.align === 'center' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                          <button onClick={() => execCommand('justifyRight')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeStyles.align === 'right' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Align Right"><AlignRight className="w-4 h-4" /></button>
                          <button onClick={() => execCommand('justifyFull')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeStyles.align === 'justify' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Justify"><AlignJustify className="w-4 h-4" /></button>
                       </div>

                       <div className="flex flex-col items-center gap-6 pt-2">
                          <div className="flex flex-col items-center gap-2">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Warna</span>
                             <input type="color" list="word-colors" value={activeStyles.foreColor} onChange={(e) => execCommand('foreColor', e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm ring-1 ring-gray-100" title="Text Color" />
                             <datalist id="word-colors"><option value="#000000" /><option value="#FF0000" /><option value="#0000FF" /><option value="#008000" /><option value="#FFFF00" /><option value="#800080" /><option value="#808080" /></datalist>
                          </div>

                          <div className="flex flex-col items-center gap-4">
                             <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font</span>
                                <select value={activeStyles.fontName} onChange={(e) => execCommand('fontName', e.target.value)} className="w-16 bg-gray-50 border border-gray-100 rounded-lg py-1.5 text-[10px] font-bold text-gray-600 outline-none cursor-pointer text-center">
                                   <option value="Times New Roman">Times</option><option value="Arial">Arial</option><option value="Calibri">Calibri</option><option value="Verdana">Verdana</option><option value="Courier New">Courier</option>
                                </select>
                             </div>
                             <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Size</span>
                                <select value={activeStyles.fontSize} onChange={(e) => changeFontSizePt(e.target.value)} className="w-16 bg-gray-50 border border-gray-100 rounded-lg py-1.5 text-[10px] font-bold text-gray-600 outline-none cursor-pointer text-center">
                                   {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72].map(size => (<option key={size} value={size.toString()}>{size}</option>))}
                                   {!['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'].includes(activeStyles.fontSize) && (<option value={activeStyles.fontSize}>{activeStyles.fontSize}</option>)}
                                </select>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 <div className="flex-1 overflow-auto bg-[#f1f5f9] custom-scrollbar relative">
                    {isPreviewLoading && (
                       <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[13px] font-black text-gray-600 uppercase tracking-widest px-4 py-2">Sinkronisasi Dokumen...</p>
                       </div>
                    )}
                    <div className="w-full flex md:justify-center justify-start py-12 bg-[#f1f5f9]">
                       <div 
                          ref={previewContainerRef}
                          contentEditable={isEditingPreview}
                          suppressContentEditableWarning
                          onMouseUp={saveSelection}
                          onKeyUp={saveSelection}
                          onKeyDown={(e) => {
                             if (!isEditingPreview) return;
                             if (e.key === 'Tab') {
                                e.preventDefault();
                                const sel = window.getSelection();
                                if (!sel || !sel.rangeCount) return;
                                const range = sel.getRangeAt(0);
                                range.deleteContents();
                                const tabNode = document.createTextNode('\u00A0\u00A0\u00A0\u00A0');
                                range.insertNode(tabNode);
                                range.setStartAfter(tabNode);
                                range.setEndAfter(tabNode);
                                sel.removeAllRanges();
                                sel.addRange(range);
                                saveSelection();
                             }
                          }}
                          className={`docx-render-container min-w-full flex md:justify-center justify-start bg-[#f1f5f9] ${isEditingPreview ? 'outline-none' : ''}`}
                       />
                    </div>
                 </div>
              </div>
              
              <div className="px-8 py-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0 z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Editor Mode: {isEditingPreview ? 'Aktif' : 'Pratinjau Only'}</p>
                 </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleDownloadDoc} className="px-6 py-2.5 bg-gray-50 text-gray-700 font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 border border-gray-100">
                       <Download className="w-4 h-4" />
                       Ekspor
                    </button>
                    <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-2.5 bg-gray-900 text-white font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-black transition-all">Selesai</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .docx-render-container div:not(.docx) {
            background: transparent !important;
            background-color: transparent !important;
        }

        .docx-wrapper {
            background: transparent !important; 
            padding: 40px 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            min-height: 100% !important;
        }
        
        div.docx-render-container section.docx,
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
            div.docx-render-container section.docx,
            section.docx {
                width: 210mm !important;
                min-width: 210mm !important;
                padding: 15mm !important;
                margin: 0 !important;
                border: 1px solid #e2e8f0 !important;
                box-shadow: none !important;
            }
        }

        .docx-render-container, .docx-view {
            overflow: visible !important;
        }
        
        .docx-render-container p,
        .docx-render-container span,
        .docx-render-container td {
            white-space: pre-wrap !important;
        }
        
        .docx-render-container img {
            display: inline-block !important;
            pointer-events: auto !important;
            user-select: auto !important;
            -webkit-user-drag: none !important;
            user-drag: none !important;
            max-width: 100% !important;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #e2e8f0; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
