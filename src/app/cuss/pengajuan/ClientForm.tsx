'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import imageCompression from 'browser-image-compression';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useTracking } from '../trackingContext';
import NotificationModal, { NotificationType } from '@/components/NotificationModal';
import { buildFilePath } from '@/lib/storage/path';

// Cache global (Module level) untuk menyimpan file lampiran agar tidak hilang saat pindah halaman (internal navigation)
// Data ini akan otomatis terhapus jika halaman di-refresh (sesuai permintaan "kecuali di refresh")
let attachmentCache: { file: File; processed?: File }[] = [];

export default function ClientForm({ user }: { user: any }) {
  const router = useRouter();
  const { setGlobalToast } = useTracking();
  
  // States initialized from empty (will be synced from localStorage in useEffect)
  const [isMewakili, setIsMewakili] = useState(false);
  const [namaSubjek, setNamaSubjek] = useState('');
  const [nikSubjek, setNikSubjek] = useState('');
  const [alamatSubjek, setAlamatSubjek] = useState('');
  const [rtSubjek, setRtSubjek] = useState('');
  const [rwSubjek, setRwSubjek] = useState('');
  const [jenisSurat, setJenisSurat] = useState('');
  const [jenisLainnya, setJenisLainnya] = useState('');
  const [keperluan, setKeperluan] = useState('');
  const [hubunganSubjek, setHubunganSubjek] = useState('');
  const [jenisKelaminSubjek, setJenisKelaminSubjek] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [opsiLayanan, setOpsiLayanan] = useState<string[]>([]);

  // Stats for Document Upload
  const [attachments, setAttachments] = useState<{ file: File; preview: string; processed?: File }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title: string;
    message: string;
    buttonText?: string;
    onConfirm?: () => void;
    customIcon?: React.ReactNode;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const resetForm = () => {
    setIsMewakili(false);
    setNamaSubjek('');
    setNikSubjek('');
    setAlamatSubjek('');
    setRtSubjek('');
    setRwSubjek('');
    setJenisSurat('');
    setJenisLainnya('');
    setKeperluan('');
    setHubunganSubjek('');
    setJenisKelaminSubjek('');
    setAttachments([]);
    setErrorMsg('');
    setNikTouched(false);
    setKeperluanTouched(false);
    localStorage.removeItem(draftKey);
    attachmentCache = [];
  };

  useEffect(() => { 
    setMounted(true); 
    const loadLayanan = async () => {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.from('PengaturanSistem').select('nilai').eq('kunci', 'jenis_layanan_surat').single();
      if (data && data.nilai) {
        setOpsiLayanan(data.nilai as string[]);
      } else {
        setOpsiLayanan([
          'Surat Keterangan Usaha (SKU)',
          'Surat Keterangan Tidak Mampu (SKTM)',
          'Surat Pengantar SKCK',
          'Surat Pengantar KTP / KK',
          'Surat Keterangan Domisili'
        ]);
      }
    };
    loadLayanan();
  }, []);

  const isProfileComplete = 
    user.alamat && 
    user.rt && 
    user.rw && 
    user.nomor_telepon && 
    user.titik_maps &&
    user.jenis_kelamin &&
    user.agama &&
    user.pekerjaan;

  // Tentukan key draft yang spesifik untuk tiap user agar ganti akun tidak bentrok
  const draftKey = `cuss_draft_${user.id}`;

  // LOAD DRAFT DARI LOCALSTORAGE PADA SAAT MOUNT
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.isMewakili !== undefined) setIsMewakili(d.isMewakili);
        if (d.namaSubjek) setNamaSubjek(d.namaSubjek);
        if (d.nikSubjek) setNikSubjek(d.nikSubjek);
        if (d.alamatSubjek) setAlamatSubjek(d.alamatSubjek);
        if (d.rtSubjek) setRtSubjek(d.rtSubjek);
        if (d.rwSubjek) setRwSubjek(d.rwSubjek);
        if (d.jenisSurat) setJenisSurat(d.jenisSurat);
        if (d.jenisLainnya) setJenisLainnya(d.jenisLainnya);
        if (d.keperluan) setKeperluan(d.keperluan);
        if (d.hubunganSubjek) setHubunganSubjek(d.hubunganSubjek);
        if (d.jenisKelaminSubjek) setJenisKelaminSubjek(d.jenisKelaminSubjek);
      } catch (e) { console.error("Gagal load draft", e); }
    }
    setIsDraftLoaded(true);

    // LOAD ATTACHMENTS DARI CACHE (Jika ada dari navigasi sebelumnya)
    if (attachmentCache.length > 0) {
      const restored = attachmentCache.map(at => ({
        ...at,
        preview: URL.createObjectURL(at.processed || at.file)
      }));
      setAttachments(restored);
    }

    // Event listener untuk hard refresh: Hapus draft jika user memuat ulang halaman
    const handleBeforeUnload = () => {
      localStorage.removeItem(draftKey);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user.id, draftKey]);

  // SIMPAN DRAFT KE LOCALSTORAGE SETIAP PERUBAHAN
  useEffect(() => {
    if (isDraftLoaded) {
      const data = { isMewakili, namaSubjek, nikSubjek, alamatSubjek, rtSubjek, rwSubjek, jenisSurat, jenisLainnya, keperluan, hubunganSubjek, jenisKelaminSubjek };
      localStorage.setItem(draftKey, JSON.stringify(data));
    }
  }, [isDraftLoaded, isMewakili, namaSubjek, nikSubjek, alamatSubjek, rtSubjek, rwSubjek, jenisSurat, jenisLainnya, keperluan, hubunganSubjek, jenisKelaminSubjek, draftKey]);

  // SYNC ATTACHMENTS KE CACHE
  useEffect(() => {
    attachmentCache = attachments.map(({ file, processed }) => ({ file, processed }));
  }, [attachments]);

  const [errorEmail, setErrorEmail] = useState('');
  const [nikTouched, setNikTouched] = useState(false);
  const [errNama, setErrNama] = useState('');
  const [errNik, setErrNik] = useState('');
  const [errRt, setErrRt] = useState('');
  const [errRw, setErrRw] = useState('');
  const [keperluanTouched, setKeperluanTouched] = useState(false);

  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  // Handler Nama
  const handleNamaChange = (val: string) => {
    // Cari karakter terakhir yang baru diketik
    const lastChar = val.slice(-1);
    
    // Jika ada karakter baru dan bukan huruf/tanda petik/spasi
    if (val.length > namaSubjek.length && /[^a-zA-Z\s'.]/.test(lastChar)) {
      setErrNama('Nama hanya boleh huruf dan tanda petik!');
      setTimeout(() => setErrNama(''), 2000);
      return; // Batalkan input
    }
    
    // Jika hapus atau input valid, lakukan filtering (untuk jaga-jaga paste)
    const filtered = val.replace(/[^a-zA-Z\s'.]/g, '');
    setNamaSubjek(toTitleCase(filtered));
  };

  // Handler NIK
  const handleNikChange = (val: string) => {
    const lastChar = val.slice(-1);
    
    if (val.length > nikSubjek.length && /\D/.test(lastChar)) {
      setErrNik('NIK hanya boleh diisi angka!');
      setTimeout(() => setErrNik(''), 2000);
      return;
    }
    
    const filtered = val.replace(/\D/g, '').substring(0, 16);
    setNikSubjek(filtered);
    setNikTouched(false);
  };

  // Handler RT/RW
  const handleRtChange = (val: string) => {
    if (val.length > rtSubjek.length && /\D/.test(val.slice(-1))) {
      setErrRt('Hanya angka!');
      setTimeout(() => setErrRt(''), 1500);
      return;
    }
    setRtSubjek(val.replace(/\D/g, '').substring(0, 3));
  };

  const handleRwChange = (val: string) => {
    if (val.length > rwSubjek.length && /\D/.test(val.slice(-1))) {
      setErrRw('Hanya angka!');
      setTimeout(() => setErrRw(''), 1500);
      return;
    }
    setRwSubjek(val.replace(/\D/g, '').substring(0, 3));
  };

  // Handler Unggah Berkas
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachments.length + files.length > 3) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Batas Maksimal',
        message: 'Maksimal 3 lampiran pendukung saja untuk efisiensi sistem.'
      });
      return;
    }

    setIsCompressing(true);
    const options = {
      maxSizeMB: 0.4, // Target ~400KB agar tajam namun tetap hemat storage
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/webp',
    };

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'Format Berkas Salah',
          message: 'Mohon unggah file gambar saja (.jpg, .jpeg, .png)'
        });
        continue;
      }

      try {
        const compressedBlob = await imageCompression(file, options);
        // Rename file extension to .webp
        const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const webpFileName = `${originalNameWithoutExt}.webp`;
        const webpFile = new File([compressedBlob], webpFileName, { type: 'image/webp' });

        const preview = URL.createObjectURL(webpFile);
        setAttachments(prev => [...prev, { file: webpFile, preview, processed: webpFile }]);
      } catch (err) {
        console.error("Gagal kompresi:", err);
      }
    }
    setIsCompressing(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newArr = [...prev];
      URL.revokeObjectURL(newArr[index].preview);
      newArr.splice(index, 1);
      return newArr;
    });
  };

  const uploadFiles = async (pengajuanId: string) => {
    const supabase = createBrowserSupabase();
    const uploadedPaths: string[] = [];

    for (let idx = 0; idx < attachments.length; idx++) {
      const attachment = attachments[idx];
      const fileToUpload = attachment.processed || attachment.file;
      const filePath = buildFilePath(pengajuanId, fileToUpload.name, idx);

      const { data, error } = await supabase.storage
        .from('dokumen_lampiran')
        .upload(filePath, fileToUpload, {
          contentType: 'image/webp',
          upsert: true
        });

      if (error) {
        console.error("Gagal unggah storage:", error);
        throw new Error("Gagal mengunggah beberapa dokumen.");
      }
      uploadedPaths.push(data.path);
    }
    return uploadedPaths;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileComplete) {
       setNotification({
          isOpen: true,
          type: 'warning',
          title: 'Profil Belum Lengkap!',
          message: 'Demi keperluan validasi data administrasi desa, Anda diwajibkan melengkapi profil sebelum dapat membuat pengajuan.',
          buttonText: 'LENGKAPI PROFIL',
          onConfirm: () => router.push('/cuss/profil')
       });
       return;
    }
    setLoading(true);
    setErrorMsg('');

    // VALIDASI FORM
    if (isMewakili) {
      if (!namaSubjek || namaSubjek.trim().length < 3) {
        setErrorMsg('Nama lengkap penerima terlalu pendek.');
        setLoading(false);
        return;
      }

      // Cek Nama tidak boleh angka
      if (/\d/.test(namaSubjek)) {
        setErrorMsg('Format Nama tidak valid. Nama tidak boleh mengandung angka.');
        setLoading(false);
        return;
      }

      if (nikSubjek.length !== 16) {
        setErrorMsg('NIK harus berjumlah tepat 16 digit angka.');
        setLoading(false);
        return;
      }

      if (!alamatSubjek || alamatSubjek.length < 5) {
        setErrorMsg('Mohon isi alamat lengkap penerima surat.');
        setLoading(false);
        return;
      }

      if (!hubunganSubjek) {
        setErrorMsg('Harap isi hubungan Anda dengan penerima.');
        setLoading(false);
        return;
      }

      if (!jenisKelaminSubjek) {
        setErrorMsg('Harap pilih jenis kelamin penerima.');
        setLoading(false);
        return;
      }
    }

    if (!keperluan || keperluan.trim().length < 5) {
      setErrorMsg('Harap berikan rincian keperluan yang lebih jelas.');
      setLoading(false);
      return;
    }

    // Gabungkan jenis custom ke dalam keperluan untuk disetor ke db
    let finalKeperluan = keperluan;
    if (jenisSurat === 'Lainnya' && jenisLainnya) {
      finalKeperluan = `(Permintaan Khusus: ${jenisLainnya})\n\n${keperluan}`;
    }

      try {
        // PERBAIKAN LOGIKA JAM OPERASIONAL: Gunakan pembanding angka (HHMM) agar lebih akurat & TZ-safe
        let isWithinHours = true;
        let isHoliday = false; // Flag tambahan untuk pesan modal yang lebih spesifik

        try {
          const supabase = createBrowserSupabase();
          const { data: opData } = await supabase.from('PengaturanSistem').select('nilai').eq('kunci', 'operasional_settings').single();
          const settings = opData?.nilai;
          
          if (settings) {
            const op = settings as { days?: any[]; isHoliday?: boolean };
            const now = new Date();
            const currentDay = now.getDay();
            const todaySetting = op.days?.find((d: any) => Number(d.id) === currentDay);
            const nowTime = now.getHours() * 100 + now.getMinutes();
            
            if (op.isHoliday) {
              isWithinHours = false;
              isHoliday = true;
            } else if (todaySetting) {
              if (todaySetting.isOpen === false) {
                isWithinHours = false;
              } else if (todaySetting.openTime && todaySetting.closeTime) {
                const [oh, om] = todaySetting.openTime.split(':').map(Number);
                const [ch, cm] = todaySetting.closeTime.split(':').map(Number);
                const openTime = oh * 100 + om;
                const closeTime = ch * 100 + cm;
                
                if (nowTime < openTime || nowTime > closeTime) {
                  isWithinHours = false;
                }
              }
            }
          }
        } catch (e) {
          console.error("Gagal verifikasi jam operasional:", e);
        }

        // Build subjek JSONB
        const subjekData = isMewakili ? {
          nama: namaSubjek,
          nik: nikSubjek,
          alamat: alamatSubjek,
          rt: rtSubjek,
          rw: rwSubjek,
          hubungan: hubunganSubjek,
          jenis_kelamin: jenisKelaminSubjek,
        } : null;

        // Generate UUID on client side so we can upload files using it as namespace
        const pengajuanId = crypto.randomUUID();

        // Upload files first using the generated UUID
        let dokumenPaths: string[] = [];
        if (attachments.length > 0) {
          dokumenPaths = await uploadFiles(pengajuanId);
        }

        // Create surat with the pre-uploaded file paths and pre-generated ID
        const res = await fetch('/api/surat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pengajuanId,
            jenisSurat,
            keperluan: finalKeperluan,
            isMewakili,
            subjek: subjekData,
            dokumenLampiran: dokumenPaths,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengajukan surat.');

        // OTOMATIS BERSIHKAN FORM SETELAH BERHASIL SIMPAN KE DATABASE
        resetForm();
        
        if (isWithinHours) {
          // JIKA JAM KERJA: LANGSUNG TOAST & REDIRECT
          setGlobalToast({
            show: true,
            type: 'success',
            label: 'BERHASIL',
            message: `Pengajuan ${jenisSurat === 'Lainnya' ? jenisLainnya : jenisSurat} Anda sedang dikirim ke sistem.`
          });
          
          setTimeout(() => {
            router.push('/cuss/lacak');
            router.refresh();
          }, 3000);
        } else {
          // JIKA DI LUAR JAM KERJA / LIBUR: TAMPILKAN MODAL INFORMATIF
          setNotification({
            isOpen: true,
            type: 'info',
            title: isHoliday ? 'LAYANAN LIBUR' : 'BERHASIL TERKIRIM',
            message: isHoliday 
              ? 'Pengajuan Anda telah kami terima. Namun, saat ini layanan sedang ditutup sementara. Surat Anda akan diproses setelah layanan dibuka kembali.'
              : 'Pengajuan Anda telah kami terima. Namun, karena saat ini di luar jam operasional, surat akan diproses oleh petugas pada jam kerja berikutnya.',
            customIcon: (
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            onConfirm: () => {
              router.push('/cuss/lacak');
              router.refresh();
            }
          });
        }
        
        return; // Stop here, completion handled by modal or toast redirect
      } catch (error: any) {
        setErrorMsg('Maaf, pengajuan Anda tidak dapat dikirim saat ini. Silakan periksa koneksi internet Anda atau coba beberapa saat lagi.');
      } finally {
        setLoading(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.getAttribute('type') === 'submit') return;
      
      const form = e.currentTarget;
      const elements = Array.from(form.elements).filter((el: any) => 
        (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') &&
        el.type !== 'hidden' &&
        !el.disabled &&
        !el.readOnly
      ) as HTMLElement[];

      const index = elements.indexOf(target);

      // Jika di textarea dan tekan shift+enter, biarkan baris baru
      if (target.tagName === 'TEXTAREA' && e.shiftKey) return;

      if (index !== -1 && index < elements.length - 1) {
        e.preventDefault();
        elements[index + 1].focus();
      } else if (index === elements.length - 1) {
        // Jika di kolom terakhir
        if (target.tagName === 'TEXTAREA') {
          e.preventDefault();
          form.requestSubmit();
        }
        // Untuk INPUT, browser otomatis submit jika ada tombol submit
      }
    }
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-[24px] p-8 space-y-8 animate-pulse relative z-20 border border-[#E5E7EB]">
        <div className="space-y-3 pb-5 border-b border-gray-100">
          <div className="h-8 w-48 bg-gray-200 rounded-xl"></div>
          <div className="h-4 w-64 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="h-14 bg-emerald-50/50 rounded-2xl border border-emerald-100"></div>
        <div className="h-20 bg-gray-100 rounded-xl"></div>
        <div className="h-14 bg-gray-100 rounded-xl"></div>
        <div className="h-32 bg-gray-100 rounded-xl"></div>
        <div className="h-24 bg-gray-100 rounded-xl border border-dashed border-gray-200"></div>
        <div className="h-14 bg-emerald-500/20 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-[24px] p-6 md:p-8 relative shadow-[0_20px_50px_-15px_rgba(34,197,94,0.1)] border border-[#E5E7EB] z-20">



      {/* Modal Pratinjau Lampiran Pendukung */}
      {mounted && selectedPreview && createPortal(
        <div 
          className="fixed inset-0 z-[110] bg-[#1F2937]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPreview(null)}
        >
          <div 
            className="bg-white rounded-2xl p-2 shadow-2xl relative max-w-[90vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 shadow-md transition-colors z-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            <img src={selectedPreview} alt="Pratinjau Lampiran" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>,
        document.body
      )}

      <div className="mb-5 border-b border-gray-100 pb-4 text-center md:text-left">
        <h3 className="text-[24px] font-bold text-[#1F2937] tracking-tight mb-2">
          Buat Pengajuan Surat
        </h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Pilih jenis dokumen yang Anda butuhkan. Kami akan segera memproses dan menerbitkannya untuk Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
        
        {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] font-medium leading-relaxed">
              {errorMsg}
            </div>
        )}

        {/* Toggle Mewakili Orang Lain */}
        <div className="p-3 md:p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-center justify-between gap-2.5 md:gap-4">
           <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#23C16B] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#23C16B]/20 shrink-0">
                 <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                 </svg>
              </div>
              <div className="flex flex-col">
                 <span className="text-[13px] md:text-[14px] font-bold text-gray-900 leading-tight">Mewakili Orang Lain?</span>
                 <span className="text-[10px] md:text-[11px] text-[#23C16B] font-semibold uppercase tracking-wide md:tracking-wider leading-tight">Aktifkan Jika Bukan Untuk Diri Sendiri</span>
              </div>
           </div>
           
           <button 
             type="button"
             onClick={() => setIsMewakili(!isMewakili)}
             className={`w-12 h-6 md:w-14 md:h-7 rounded-full relative transition-colors duration-300 focus:outline-none shrink-0 ${isMewakili ? 'bg-[#23C16B]' : 'bg-gray-200'}`}
           >
              <div className={`absolute top-0.5 md:top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${isMewakili ? 'translate-x-6 md:translate-x-7' : 'translate-x-0'}`}></div>
           </button>
        </div>

        {/* Form Identitas Penerima (Jika Mewakili Aktif) */}
        {isMewakili && (
           <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 bg-gray-50/50 p-5 rounded-2xl border border-dashed border-gray-200">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-6 bg-[#23C16B] rounded-full"></div>
                 <h4 className="font-bold text-gray-800 text-[14px]">Identitas Penerima Surat</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-500 uppercase ml-1">Nama Lengkap</label>
                    <input 
                       type="text" 
                       value={namaSubjek} 
                       onChange={(e) => handleNamaChange(e.target.value)}
                       onBlur={() => setNamaSubjek(toTitleCase(namaSubjek))}
                       placeholder="Nama sesuai KTP"
                       className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#23C16B] transition-all bg-[#F9FAFB] hover:bg-white text-sm font-semibold text-gray-900 placeholder-gray-400 ${errNama ? 'border-red-500' : 'border-[#D1D5DB] focus:border-[#23C16B]'}`}
                       required={isMewakili}
                    />
                    {errNama && (
                       <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">
                          * {errNama}
                       </p>
                    )}
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-500 uppercase ml-1">NIK (16 Digit)</label>
                    <input 
                       type="text" 
                       value={nikSubjek} 
                       onChange={(e) => handleNikChange(e.target.value)}
                       onBlur={() => setNikTouched(true)}
                       placeholder="Masukkan NIK"
                       className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#23C16B] transition-all bg-[#F9FAFB] hover:bg-white text-sm font-semibold text-gray-900 placeholder-gray-400 ${errNik ? 'border-red-500' : (nikTouched && nikSubjek && nikSubjek.length !== 16 ? 'border-orange-400' : 'border-[#D1D5DB] focus:border-[#23C16B]')}`}
                       required={isMewakili}
                    />
                    {errNik ? (
                       <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">* {errNik}</p>
                    ) : (nikTouched && nikSubjek && nikSubjek.length !== 16 && (
                       <p className="text-[10px] text-orange-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">
                          * NIK harus 16 digit
                       </p>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[12px] font-bold text-gray-500 uppercase ml-1">Jenis Kelamin</label>
                     <select 
                        value={jenisKelaminSubjek}
                        onChange={(e) => setJenisKelaminSubjek(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-sm appearance-none cursor-pointer ${jenisKelaminSubjek ? 'text-gray-900 font-semibold' : 'text-gray-400 font-medium'}`}
                        required={isMewakili}
                     >
                        <option value="" disabled>Pilih Gender</option>
                        <option value="Laki-Laki" className="text-gray-900 font-semibold">Laki-Laki</option>
                        <option value="Perempuan" className="text-gray-900 font-semibold">Perempuan</option>
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[12px] font-bold text-gray-500 uppercase ml-1">Hubungan</label>
                     <select 
                        value={hubunganSubjek}
                        onChange={(e) => setHubunganSubjek(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-sm appearance-none cursor-pointer ${hubunganSubjek ? 'text-gray-900 font-semibold' : 'text-gray-400 font-medium'}`}
                        required={isMewakili}
                     >
                        <option value="" disabled>Pilih Hubungan</option>
                        <option value="Orangtua" className="text-gray-900 font-semibold">Orangtua</option>
                        <option value="Suami/Istri" className="text-gray-900 font-semibold">Suami/Istri</option>
                        <option value="Anak" className="text-gray-900 font-semibold">Anak</option>
                        <option value="Saudara" className="text-gray-900 font-semibold">Saudara</option>
                        <option value="Tetangga" className="text-gray-900 font-semibold">Tetangga</option>
                        <option value="Lainnya" className="text-gray-900 font-semibold">Lainnya</option>
                     </select>
                  </div>
               </div>

               <div className="space-y-2">
                 <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-500 uppercase ml-1">Alamat Lengkap</label>
                    <textarea 
                       rows={2}
                       value={alamatSubjek} 
                       onChange={(e) => setAlamatSubjek(e.target.value)}
                       placeholder="Alamat domisili saat ini"
                       className="w-full px-4 py-3 rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-all bg-[#F9FAFB] hover:bg-white text-sm font-semibold text-gray-900 placeholder-gray-400 resize-none"
                       required={isMewakili}
                    />
                 </div>
  
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-gray-500 uppercase ml-1">RT</label>
                       <input 
                          type="text" 
                          value={rtSubjek} 
                          onChange={(e) => handleRtChange(e.target.value)}
                          onBlur={() => {
                             if(/^\d+$/.test(rtSubjek)) handleRtChange(rtSubjek.padStart(3, '0'));
                          }}
                          placeholder="000"
                          className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#23C16B] transition-all bg-[#F9FAFB] hover:bg-white text-sm font-semibold text-gray-900 placeholder-gray-400 ${errRt ? 'border-red-500' : 'border-[#D1D5DB] focus:border-[#23C16B]'}`}
                          required={isMewakili}
                       />
                       {errRt && (
                          <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">* {errRt}</p>
                       )}
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-gray-500 uppercase ml-1">RW</label>
                       <input 
                          type="text" 
                          value={rwSubjek} 
                          onChange={(e) => handleRwChange(e.target.value)}
                          onBlur={() => {
                             if(/^\d+$/.test(rwSubjek)) handleRwChange(rwSubjek.padStart(3, '0'));
                          }}
                          placeholder="000"
                          className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#23C16B] transition-all bg-[#F9FAFB] hover:bg-white text-sm font-semibold text-gray-900 placeholder-gray-400 ${errRw ? 'border-red-500' : 'border-[#D1D5DB] focus:border-[#23C16B]'}`}
                          required={isMewakili}
                       />
                       {errRw && (
                          <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">* {errRw}</p>
                       )}
                    </div>
                 </div>
               </div>
           </div>
        )}

        {!isMewakili && (
           <div className="space-y-1.5 animate-in fade-in duration-300">
             <label className="block text-[13px] font-bold text-[#374151]">Identitas Pemohon</label>
             <div className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/80 flex flex-col gap-1 cursor-default">
                <span className="text-[13px] text-gray-500 font-semibold">{user.nik}</span>
                <span className="text-[14px] text-gray-900 font-bold">{user.nama}</span>
             </div>
             <p className="text-[11px] text-gray-400 font-medium px-1 mt-1">
               * Data terisi otomatis berdasarkan akun warga terdaftar.
             </p>
           </div>
        )}

        {/* Jenis Surat */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-bold text-[#374151]">
            Jenis Layanan Surat
          </label>
          <select
            value={jenisSurat}
            onChange={(e) => setJenisSurat(e.target.value)}
            className={`w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-sm appearance-none cursor-pointer ${jenisSurat ? 'text-gray-900 font-semibold' : 'text-gray-400 font-medium'}`}
            required
          >
            <option value="" disabled>Pilih Jenis Surat</option>
            {opsiLayanan.map((opsi, idx) => (
              <option key={idx} value={opsi} className="text-gray-900 font-semibold">{opsi}</option>
            ))}
            <option value="Lainnya" className="text-gray-900 font-semibold">Lainnya... (Silakan Sebutkan)</option>
          </select>
        </div>

        {/* Spesifikasi Surat Kustom (Muncul jika Lainnya) */}
        {jenisSurat === 'Lainnya' && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300 border-l-4 border-[#23C16B] pl-4">
            <label className="block text-[13px] font-bold text-[#374151]">
              Sebutkan Jenis Surat
            </label>
            <input
              type="text"
              value={jenisLainnya}
              onChange={(e) => setJenisLainnya(e.target.value)}
              placeholder="Contoh: Surat Izin Keramaian, Surat Pindah, dll"
              className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm placeholder-gray-400 font-medium"
              required={jenisSurat === 'Lainnya'}
            />
          </div>
        )}

        {/* Keperluan */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-bold text-[#374151]">
            Rincian Keperluan
          </label>
          <textarea
            rows={4}
            value={keperluan}
            onChange={(e) => setKeperluan(e.target.value)}
            onBlur={() => setKeperluanTouched(true)}
            placeholder="Jelaskan peruntukan surat ini (Contoh: Syarat pinjaman bank, Beasiswa anak, dll)"
            className={`w-full px-4 py-4 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm font-medium resize-none placeholder-gray-400 leading-relaxed ${keperluanTouched && keperluan.trim().length < 5 ? 'border-red-500' : 'border-[#D1D5DB] focus:border-[#23C16B]'}`}
            required
          ></textarea>
          {keperluanTouched && keperluan.trim().length < 5 && (
            <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">
              * Harap berikan rincian keperluan yang lebih jelas
            </p>
          )}
        </div>

        {/* Unggah Lampiran Pendukung (Opsional) */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-bold text-[#374151]">
            Lampiran Pendukung <span className="text-gray-400 font-medium ml-1">(Opsional, Maks 3 Foto)</span>
          </label>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {attachments.map((at, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedPreview(at.preview)}
                className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm animate-in zoom-in-95 duration-200 cursor-zoom-in"
              >
                <img src={at.preview} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Preview lampiran" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(idx);
                    }}
                    className="w-8 h-8 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {attachments.length < 3 && (
              <label 
                className={`flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer ${isCompressing ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-gray-50/50 border-[#D1D5DB] hover:border-[#23C16B] hover:bg-emerald-50/30'}`}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*"
                  disabled={isCompressing}
                />
                {isCompressing ? (
                  <div className="flex flex-col items-center animate-pulse">
                     <svg className="animate-spin h-5 w-5 text-[#23C16B] mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span className="text-[10px] font-bold text-[#23C16B] uppercase tracking-wider">Sedang...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 mb-2 group-hover:text-[#23C16B] transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-none text-center px-2">Tambah foto</span>
                  </>
                )}
              </label>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-medium ml-1">
            * Lampirkan foto KTP/KK/Surat Pengantar RT jika diminta.
          </p>
        </div>


        <button
          type="submit"
          disabled={loading || !jenisSurat || (jenisSurat === 'Lainnya' && !jenisLainnya)}
          className="w-full py-[15px] px-4 bg-[#23C16B] hover:bg-[#1fa95d] text-white text-[14px] font-bold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)] flex justify-center items-center gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              MENGIRIMKAN...
            </span>
          ) : (
            'AJUKAN SURAT SEKARANG'
          )}
        </button>

      </form>

      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        buttonText={notification.buttonText}
        onConfirm={notification.onConfirm}
      />
    </div>
  );
}
