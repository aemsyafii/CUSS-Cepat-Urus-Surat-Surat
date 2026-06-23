'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import NotificationModal, { NotificationType } from '../NotificationModal';
import imageCompression from 'browser-image-compression';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

export default function ClientProfil({ user, title = "Profil Warga", isAdmin = false }: { user: any, title?: string, isAdmin?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  const [alamat, setAlamat] = useState(user.alamat || '');
  const [rt, setRt] = useState(user.rt || '');
  const [rw, setRw] = useState(user.rw || '');
  const [whatsapp, setWhatsapp] = useState(user.nomor_telepon || '');
  const [email, setEmail] = useState(user.email || '');
  const [username, setUsername] = useState(user.username || '');
  const [nama, setNama] = useState(user.nama || '');


  
  // New States
  const [jenisKelamin, setJenisKelamin] = useState(() => {
    if (!user.jenis_kelamin) return '';
    if (user.jenis_kelamin === 'Laki-laki') return 'Laki-Laki';
    return user.jenis_kelamin;
  });
  
  const tempPekerjaan = user.pekerjaan || '';
  const isPekerjaanLainnya = tempPekerjaan && !['Petani', 'Buruh', 'Guru / Dosen', 'Pedagang', 'Pegawai Negeri Sipil', 'TNI / Polri', 'Karyawan Swasta', 'Wiraswasta', 'Pensiunan', 'Pelajar / Mahasiswa', 'Mengurus Rumah Tangga', 'Belum / Tidak Bekerja'].includes(tempPekerjaan);
  const [pekerjaan, setPekerjaan] = useState<string>(
    isPekerjaanLainnya ? 'Lainnya' : tempPekerjaan
  );
  const [pekerjaanLainnya, setPekerjaanLainnya] = useState(
    isPekerjaanLainnya ? tempPekerjaan : ''
  );
  
  const tempAgama = user.agama || '';
  const isAgamaLainnya = tempAgama && !['Islam', 'Kristen', 'Katolik', 'Hindu', 'Budha', 'Konghuchu'].includes(tempAgama);
  const [agama, setAgama] = useState<string>(
    isAgamaLainnya ? 'Lainnya' : tempAgama
  );
  const [agamaLainnya, setAgamaLainnya] = useState(
    isAgamaLainnya ? tempAgama : ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Titik Maps (Bisa format URL awal atau JSON Koordinat)
  const [titikMaps, setTitikMaps] = useState(user.titik_maps || '');
  const [foto, setFoto] = useState<string | null>(user.foto || null);
  
  const [loading, setLoading] = useState(false);
  const [profileToast, setProfileToast] = useState<{show: boolean, type: 'success' | 'error', message: string} | null>(null);
  const [isToastHovered, setIsToastHovered] = useState(false);

  useEffect(() => {
    if (profileToast?.show && !isToastHovered) {
      const isSuccess = profileToast.type === 'success';
      const timer = setTimeout(() => {
        setProfileToast(null);
        if (isSuccess) {
           router.refresh();
        }
      }, isSuccess ? 3000 : 4000);
      return () => clearTimeout(timer);
    }
  }, [profileToast, isToastHovered, router]);

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
  const [errRt, setErrRt] = useState('');
  const [errRw, setErrRw] = useState('');
  const [errWhatsapp, setErrWhatsapp] = useState('');
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  
  // States for Photo Expand & Crop Engine
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [sourcePhoto, setSourcePhoto] = useState<string | null>(null);
  
  // Gesture state untuk drag+pinch langsung di kanvas
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0); // translateX px
  const [ty, setTy] = useState(0); // translateY px
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  // Interactive Map States
  const [showMapModal, setShowMapModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();

    // Helper: tampilkan error dan scroll ke elemen
    const showFieldError = (message: string, fieldId?: string) => {
      setProfileToast({ show: true, type: 'error', message });
      if (fieldId) {
        const el = document.getElementById(fieldId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
    };

    // Validasi satu per satu — panduan bertahap
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('Email wajib diisi dan harus dalam format yang valid.', 'field-email');
      return;
    }

    if (!isAdmin) {
      if (!jenisKelamin) {
        showFieldError('Jenis kelamin belum dipilih.', 'field-jenis-kelamin');
        return;
      }
      if (!alamat) {
        showFieldError('Alamat lengkap belum diisi.', 'field-alamat');
        return;
      }
      if (!rt) {
        showFieldError('RT belum diisi.', 'field-rt');
        return;
      }
      if (!rw) {
        showFieldError('RW belum diisi.', 'field-rw');
        return;
      }
      if (!whatsapp) {
        showFieldError('Nomor WhatsApp belum diisi.', 'field-whatsapp');
        return;
      }
      if (!agama) {
        showFieldError('Agama belum dipilih.', 'field-agama');
        return;
      }
      if (!pekerjaan) {
        showFieldError('Pekerjaan belum dipilih.', 'field-pekerjaan');
        return;
      }
      if (!titikMaps) {
        showFieldError('Titik lokasi rumah belum diisi. Klik "Tandai Lokasi" pada peta.', 'field-maps');
        return;
      }
    }

    let finalAgama = agama;
    if (agama === 'Lainnya') {
      finalAgama = agamaLainnya;
      if (!finalAgama) {
        showFieldError('Mohon isi kolom Agama Lainnya.', 'field-agama-lainnya');
        return;
      }
    }

    let finalPekerjaan = pekerjaan;
    if (pekerjaan === 'Lainnya') {
      finalPekerjaan = pekerjaanLainnya;
      if (!finalPekerjaan) {
        showFieldError('Mohon isi kolom Pekerjaan Lainnya.', 'field-pekerjaan-lainnya');
        return;
      }
    }


    setLoading(true);

    try {
      const sanitizedWhatsapp = whatsapp.replace(/\D/g, '');
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, alamat, rt, rw, whatsapp: sanitizedWhatsapp, foto, titikMaps,
          jenis_kelamin: jenisKelamin, pekerjaan: finalPekerjaan, agama: finalAgama,
          password, username: username.trim() || null,
          ...(isAdmin ? { nama: nama.trim() } : {}),
        }),

      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui profil. Pastikan koneksi stabil.');

      setProfileToast({
        show: true,
        type: 'success',
        message: 'Profil berhasil diperbarui!'
      });
      
    } catch (err: any) {
      setProfileToast({
        show: true,
        type: 'error',
        message: 'Gagal memperbarui profil. Silakan periksa koneksi internet Anda atau coba beberapa saat lagi.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const options = {
          maxSizeMB: 0.2, // Maksimal 200KB untuk foto profil
          maxWidthOrHeight: 1000,
          useWebWorker: true,
          fileType: 'image/webp'
        };
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setSourcePhoto(reader.result as string);
          resetCropTransform();
          setIsPhotoMenuOpen(false);
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        console.error("Gagal kompresi foto:", err);
      }
      setLoading(false);
    }
  };

  // --- GESTURE & CROP ENGINE REFINEMENT ---
  const applyCrop = () => {
    if (!imgRef.current || !cropBoxRef.current) return;

    const canvas = document.createElement('canvas');
    const OUTPUT = 500;
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    
    // Dimensi natural gambar
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    
    // Dimensi "Frame" di layar (kotak crop yang terlihat)
    const cw = cropBoxRef.current.clientWidth;
    const ch = cropBoxRef.current.clientHeight;

    // Hitung scaling dasar agar gambar fits-contain di frame (Sesuai object-fit: contain di UI)
    const baseScale = Math.min(cw / nw, ch / nh);
    const displayW = nw * baseScale;
    const displayH = nh * baseScale;

    // Rasio canvas vs layar untuk membedakan resolusi
    const drawRatio = OUTPUT / cw;

    // Bersihkan canvas dengan latar belakang putih (fallback jika gambar tidak menutupi seluruh kotak)
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);

    // Transformasi Canvas
    ctx.save();
    // 1. Geser ke tengah canvas
    ctx.translate(OUTPUT / 2, OUTPUT / 2);
    // 2. Tambahkan geseran user (di-scale ke resolusi canvas)
    ctx.translate(tx * drawRatio, ty * drawRatio);
    // 3. Tambahkan zoom user
    ctx.scale(scale, scale);
    
    // 4. Gambar di titik tengah (offset -tengah lebar/tinggi displai)
    ctx.drawImage(
      img, 
      -(displayW * drawRatio) / 2, 
      -(displayH * drawRatio) / 2, 
      displayW * drawRatio, 
      displayH * drawRatio
    );
    ctx.restore();

    setFoto(canvas.toDataURL('image/webp', 0.92));
    setSourcePhoto(null);
  };

  // Reset transform saat foto baru dipilih
  const resetCropTransform = () => { setScale(1); setTx(0); setTy(0); };

  // --- Gesture handlers (mouse + touch) ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.isPrimary) {
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !e.isPrimary) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setTx(prev => prev + dx);
    setTy(prev => prev + dy);
  };

  const onPointerUp = () => { isDragging.current = false; lastPinchDist.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    setScale(prev => Math.min(5, Math.max(0.7, prev - delta * 0.005)));
  };

  // Pinch zoom logic (Standard)
  useEffect(() => {
    const el = cropBoxRef.current;
    if (!el || !sourcePhoto) return;

    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist.current !== null) {
          const delta = dist - lastPinchDist.current;
          setScale(prev => Math.min(5, Math.max(0.7, prev + delta * 0.01)));
        }
        lastPinchDist.current = dist;
      }
    };
    const handleTouchEnd = () => { lastPinchDist.current = null; };
    el.addEventListener('touchmove', handleTouch, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchmove', handleTouch);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sourcePhoto]);

  const handleCameraClick = () => {
    if (foto) {
      setIsPhotoMenuOpen(!isPhotoMenuOpen);
    } else {
      fileInputRef.current?.click();
    }
  };

  const parseCoordinate = () => {
    if (!titikMaps) return null;
    try {
       // Cek formating koordinat JSON sederhana misal: {"lat": -6.2, "lng": 106.8}
       if (titikMaps.startsWith('{')) {
          return JSON.parse(titikMaps);
       }
    } catch (e) {
       return null;
    }
    return null;
  };

  const savedPos = parseCoordinate();
  
  // Fitur Navigasi Enter antar kolom
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      
      // Jika sedang fokus di tombol atau textarea yang butuh newline spesifik (misal shift+enter)
      // Namun permintaan user adalah Enter pindah kolom, maka kita ikuti.
      if (target.tagName === 'BUTTON' || target.getAttribute('type') === 'submit') return;
      
      // Di textarea, kita cegah default Enter (newline) agar bisa navigasi, 
      // kecuali jika user menekan Shift+Enter maka biarkan newline.
      if (target.tagName === 'TEXTAREA' && !e.shiftKey) {
        e.preventDefault();
      }

      const form = e.currentTarget;
      // Ambil semua elemen input-like yang aktif/terlihat
      const elements = Array.from(form.elements).filter((el: any) => 
        (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') &&
        el.type !== 'hidden' &&
        !el.disabled &&
        !el.readOnly
      ) as HTMLElement[];

      const index = elements.indexOf(target);
      if (index !== -1 && index < elements.length - 1) {
        if (target.tagName !== 'TEXTAREA' || !e.shiftKey) {
          e.preventDefault();
          elements[index + 1].focus();
        }
      } 
      // Jika sudah di kolom terakhir, biarkan default submit berjalan
    }
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-[24px] p-8 space-y-8 animate-pulse relative z-20 border border-[#E5E7EB]">
        <div className="space-y-3 pb-5 border-b border-gray-100">
          <div className="h-8 w-48 bg-gray-200 rounded-xl"></div>
          <div className="h-4 w-64 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="flex flex-col items-center py-4">
          <div className="w-[160px] h-[160px] bg-gray-100 rounded-full border-[6px] border-white"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-14 bg-gray-100 rounded-xl"></div>
          <div className="h-14 bg-gray-100 rounded-xl"></div>
        </div>
        <div className="h-14 bg-gray-100 rounded-xl"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-14 bg-gray-100 rounded-xl"></div>
          <div className="h-14 bg-gray-100 rounded-xl"></div>
        </div>
        <div className="h-32 bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] p-8 relative shadow-[0_20px_50px_-15px_rgba(34,197,94,0.1)] border border-[#E5E7EB] z-20">

      <div className="mb-8 border-b border-gray-100 pb-5">
        <h3 className="text-[24px] font-bold text-[#1F2937] tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Atur informasi dan setelan spesifik kontak Anda untuk keperluan administrasi desa.
        </p>
      </div>

      <form onSubmit={handleSimpan} onKeyDown={handleKeyDown} className="space-y-6">
        
        {/* Setup Foto Profil */}
        <div className="flex flex-col items-center justify-center pb-8 relative">
           <div className="relative">
             <div 
                onClick={() => foto && setShowFullPhoto(true)}
                className={`w-[160px] h-[160px] bg-gray-50 border-[6px] border-white text-emerald-600 rounded-full flex items-center justify-center font-black text-[48px] shadow-lg overflow-hidden relative z-10 ${foto ? 'cursor-zoom-in hover:brightness-90 transition-all' : ''}`}
                title={foto ? "Klik untuk memperbesar" : ""}
             >
                {foto ? (
                  <img src={foto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user.nama || 'User').substring(0, 2).toUpperCase()
                )}
             </div>
             
             {/* Ikon Kamera Mengambang */}
             <button 
               type="button"
               onClick={handleCameraClick}
               title="Ubah Foto"
               className="absolute bottom-2 right-2 w-10 h-10 bg-[#23C16B] border-[3px] border-white text-white rounded-full flex items-center justify-center shadow-lg z-20 hover:scale-110 transition-transform"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
             </button>

             {/* Menu Dropdown Ganti/Hapus Foto */}
             {isPhotoMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsPhotoMenuOpen(false)}></div>
                  <div className="absolute top-16 left-32 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-40 animate-in fade-in slide-in-from-bottom-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-left px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      Perbarui Foto
                    </button>
                    <div className="h-px bg-gray-100 mx-2"></div>
                    <button 
                      type="button"
                      onClick={() => { setFoto(null); setIsPhotoMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Hapus Foto
                    </button>
                  </div>
                </>
             )}
           </div>

           <input 
             type="file" 
             ref={fileInputRef}
             className="hidden" 
             accept="image/*" 
             onChange={handleFileChange}
           />
        </div>

        {/* Modal Cropper Adjuster – Drag & Pinch-to-Zoom */}
        {mounted && sourcePhoto && createPortal(
           <div 
             className="fixed inset-0 z-[100] bg-[#1F2937]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 touch-none"
             onClick={() => setSourcePhoto(null)}
           >
              <div 
                className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative touch-none"
                onClick={(e) => e.stopPropagation()}
              >
                  <button 
                    type="button"
                    onClick={() => setSourcePhoto(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>

                   <h4 className="text-[18px] font-black text-gray-900 mb-4 text-center tracking-tight mt-2">Sesuaikan Penempatan</h4>
                  <p className="text-[11px] text-gray-400 text-center mb-4 font-medium">Geser foto untuk memindahkan · Gunakan tombol zoom di bawah</p>

                  {/* Kotak Crop Interaktif - Professional Workspace */}
                  <div 
                    ref={cropBoxRef}
                    className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-inner mb-6 cursor-grab active:cursor-grabbing select-none touch-none border border-gray-100"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    onWheel={onWheel}
                  >
                     {/* Background Grid Pattern for Transparency feel */}
                     <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                     <img 
                        ref={imgRef}
                        src={sourcePhoto} 
                        alt="Crop source"
                        draggable={false}
                        onLoad={(e) => {
                           const img = e.currentTarget;
                           const nw = img.naturalWidth;
                           const nh = img.naturalHeight;
                           const cw = cropBoxRef.current?.clientWidth || 1;
                           const ch = cropBoxRef.current?.clientHeight || 1;
                           
                           // STARTING SCALE: Hitung agar foto memenuhi lingkaran (Cover mode)
                           // Jika menggunakan object-fit: contain, kita butuh scale pengali
                           const containScale = Math.min(cw / nw, ch / nh);
                           const coverScale = Math.max(cw / nw, ch / nh);
                           setScale(+(coverScale / containScale).toFixed(2));
                        }}
                        style={{
                           position: 'absolute',
                           top: '50%',
                           left: '50%',
                           transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`,
                           transformOrigin: 'center center',
                           maxWidth: 'none',
                           width: '100%',
                           height: '100%',
                           objectFit: 'contain', 
                           userSelect: 'none',
                           pointerEvents: 'none',
                           transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
                        }}
                     />

                     {/* Professional Mask Overlay (Circular Hole) - SHARP VERSION */}
                     <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden">
                        {/* Area Luar menggunakan Box-Shadow masif agar tajam & solid */}
                        <div className="w-[100%] h-[100%] rounded-full bg-transparent shadow-[0_0_0_1000px_rgba(0,0,0,0.7)] border border-white/30"></div>
                        
                        {/* Center Guidelines */}
                        <div className="absolute w-10 h-px bg-white/40"></div>
                        <div className="absolute h-10 w-px bg-white/40"></div>
                     </div>
                  </div>

                  {/* Kontrol Zoom Tombol */}
                  <div className="flex items-center justify-center gap-3 mb-5">
                     <button
                       type="button"
                       onClick={() => setScale(prev => Math.max(0.5, +(prev - 0.15).toFixed(2)))}
                       className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xl flex items-center justify-center transition-colors active:scale-95"
                       title="Perkecil"
                     >−</button>
                     
                     <div className="flex-1 flex items-center gap-2 px-1">
                       <input
                         type="range"
                         min="0.5"
                         max="5"
                         step="0.01"
                         value={scale}
                         onChange={(e) => setScale(Number(e.target.value))}
                         className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#23C16B]"
                         style={{
                           background: `linear-gradient(to right, #23C16B ${((scale - 0.5) / 4.5) * 100}%, #E5E7EB ${((scale - 0.5) / 4.5) * 100}%)`
                         }}
                       />
                       <span className="text-[11px] font-bold text-gray-400 w-8 text-right tabular-nums">{Math.round(scale * 100)}%</span>
                     </div>

                     <button
                       type="button"
                       onClick={() => setScale(prev => Math.min(5, +(prev + 0.15).toFixed(2)))}
                       className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xl flex items-center justify-center transition-colors active:scale-95"
                       title="Perbesar"
                     >+</button>
                  </div>

                  <div className="flex gap-3">
                     <button type="button" onClick={() => { setSourcePhoto(null); resetCropTransform(); }} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-[14px] hover:bg-gray-200 transition-colors">Batal</button>
                     <button type="button" onClick={applyCrop} className="flex-1 py-3.5 bg-[#23C16B] text-white font-bold rounded-xl text-[14px] hover:bg-[#1fa95d] transition-colors shadow-lg shadow-[#23C16B]/30">Terapkan</button>
                  </div>

              </div>
           </div>,
           document.body
        )}

        {/* Modal Popup Full Screen Foto */}
        {mounted && showFullPhoto && foto && createPortal(
           <div 
             className="fixed inset-0 z-[100] bg-[#1F2937]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
             onClick={() => setShowFullPhoto(false)}
           >
              <div 
                className="bg-white rounded-2xl p-2 shadow-2xl relative max-w-[90vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                 <button 
                   onClick={() => setShowFullPhoto(false)}
                   className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 shadow-md transition-colors z-10"
                 >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>

                 <img src={foto} alt="Full Profile" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
              </div>
           </div>,
           document.body
        )}

        {/* Username & Email — satu baris */}
        <div className="grid grid-cols-2 gap-4">
          {/* Username - Opsional */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#374151]">
              Username <span className="text-gray-400 font-normal text-[12px]">(opsional)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="nama_pengguna"
              className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold"
            />
            <p className="text-[10px] text-gray-400 font-medium ml-1">Huruf kecil, angka, underscore.</p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#374151]">Email</label>
            <input
              id="field-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              className={`w-full px-4 py-[13.5px] rounded-xl border focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold ${!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'border-orange-400' : 'border-[#D1D5DB]'}`}
              required
            />

            {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
              <p className="text-[10px] text-orange-500 font-bold ml-1 animate-in fade-in">* Format tidak valid</p>
            )}
          </div>
        </div>


        {/* NIK & Nama — admin: hanya Nama (editable), warga: NIK + Nama (read-only) */}
        {isAdmin ? (
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#374151]">Nama Lengkap</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap administrator"
              className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 opacity-70">
                <label className="block text-[13px] font-bold text-gray-600">NIK (Nomor Induk)</label>
                <input
                  type="text"
                  value={user.nik}
                  disabled
                  className="w-full px-4 py-[13.5px] rounded-xl border border-gray-300 bg-gray-100 text-gray-700 text-sm font-semibold cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5 opacity-70">
                <label className="block text-[13px] font-bold text-gray-600">Nama Lengkap</label>
                <input
                  type="text"
                  value={user.nama}
                  disabled
                  className="w-full px-4 py-[13.5px] rounded-xl border border-gray-300 bg-gray-100 text-gray-700 text-sm font-semibold cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-[11px] text-orange-500 font-medium px-1 -mt-4">
              * NIK dan Nama Identitas hanya dapat diubah oleh admin secara langsung.
            </p>
          </>
        )}

        {/* Nomor WhatsApp */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-bold text-[#374151]">Nomor WhatsApp Aktif</label>
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => {
               let val = e.target.value;

               if (/[^\d\s]/.test(val)) {
                 setErrWhatsapp('No WhatsApp hanya boleh berisi angka!');
                 setTimeout(() => setErrWhatsapp(''), 2500);
               } else {
                 setErrWhatsapp('');
               }

               let nums = val.replace(/\D/g, '');

               if (nums === '') {
                 setWhatsapp('');
                 return;
               }

               if (nums.startsWith('0')) {
                 nums = '62' + nums.substring(1);
               } else if (!nums.startsWith('62')) {
                 if (nums === '6') {
                   // biarkan
                 } else {
                   nums = '62' + nums;
                 }
               }

               if (nums.length > 14) {
                 nums = nums.substring(0, 14);
               }

               let formatted = nums;
               if (nums.length > 5 && nums.length <= 9) {
                 formatted = nums.substring(0, 5) + ' ' + nums.substring(5);
               } else if (nums.length > 9) {
                 formatted = nums.substring(0, 5) + ' ' + nums.substring(5, 9) + ' ' + nums.substring(9, 14);
               }

               setWhatsapp(formatted);
            }}
            id="field-whatsapp"
            placeholder="628xx xxxx xxxx"
            className={`w-full px-4 py-[13.5px] rounded-xl border focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold ${errWhatsapp ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' : 'border-[#D1D5DB] focus:border-[#23C16B]'}`}
          />
          {errWhatsapp && <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in transition-all">* {errWhatsapp}</p>}
        </div>

        {/* Jenis Kelamin & Agama */}
        <div className={`grid grid-cols-2 gap-5 ${isAdmin ? 'hidden' : ''}`}>
           <div className="space-y-1.5">
             <label className="block text-[13px] font-bold text-[#374151]">Jenis Kelamin</label>
             <select
                id="field-jenis-kelamin"
                value={jenisKelamin}
                onChange={(e) => setJenisKelamin(e.target.value)}
                className={`w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-sm appearance-none cursor-pointer ${jenisKelamin ? 'text-gray-900 font-semibold' : 'text-gray-400 font-medium'}`}
             >
                <option value="" disabled>Pilih Jenis Kelamin</option>
                <option value="Laki-Laki" className="text-gray-900 font-semibold">Laki-Laki</option>
                <option value="Perempuan" className="text-gray-900 font-semibold">Perempuan</option>
             </select>
           </div>

           <div className="space-y-1.5">
             <label className="block text-[13px] font-bold text-[#374151]">Agama</label>
             <select
                id="field-agama"
                value={agama}
                onChange={(e) => setAgama(e.target.value)}
                className={`w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-sm appearance-none cursor-pointer ${agama ? 'text-gray-900 font-semibold' : 'text-gray-400 font-medium'}`}
             >
                <option value="" disabled>Pilih Agama</option>
                <option value="Islam" className="text-gray-900 font-semibold">Islam</option>
                <option value="Kristen" className="text-gray-900 font-semibold">Kristen</option>
                <option value="Katolik" className="text-gray-900 font-semibold">Katolik</option>
                <option value="Hindu" className="text-gray-900 font-semibold">Hindu</option>
                <option value="Budha" className="text-gray-900 font-semibold">Budha</option>
                <option value="Konghuchu" className="text-gray-900 font-semibold">Konghuchu</option>
                <option value="Lainnya" className="text-gray-900 font-semibold">Lainnya...</option>
             </select>
           </div>
        </div>
        
        {agama === 'Lainnya' && (
           <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300 border-l-4 border-[#23C16B] pl-4">
             <label className="block text-[13px] font-bold text-[#374151]">Sebutkan Agama Lainnya</label>
             <input
                id="field-agama-lainnya"
                type="text"
                maxLength={20}
                value={agamaLainnya}
                onChange={(e) => setAgamaLainnya(e.target.value)}
                className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold placeholder-gray-400"
                placeholder="Ketik agama Anda..."
             />
           </div>
        )}

        {/* Pekerjaan */}
        <div className={`space-y-1.5 ${isAdmin ? 'hidden' : ''}`}>
           <label className="block text-[13px] font-bold text-[#374151]">Pekerjaan</label>
           <select
              id="field-pekerjaan"
              value={pekerjaan}
              onChange={(e) => setPekerjaan(e.target.value)}
              className={`w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-sm appearance-none cursor-pointer ${pekerjaan ? 'text-gray-900 font-semibold' : 'text-gray-400 font-medium'}`}
           >
              <option value="" disabled>Pilih Pekerjaan</option>
              <option value="Petani" className="text-gray-900 font-semibold">Petani</option>
              <option value="Buruh" className="text-gray-900 font-semibold">Buruh</option>
              <option value="Guru / Dosen" className="text-gray-900 font-semibold">Guru / Dosen</option>
              <option value="Pedagang" className="text-gray-900 font-semibold">Pedagang</option>
              <option value="Pegawai Negeri Sipil" className="text-gray-900 font-semibold">Pegawai Negeri Sipil</option>
              <option value="TNI / Polri" className="text-gray-900 font-semibold">TNI / Polri</option>
              <option value="Karyawan Swasta" className="text-gray-900 font-semibold">Karyawan Swasta</option>
              <option value="Wiraswasta" className="text-gray-900 font-semibold">Wiraswasta</option>
              <option value="Pensiunan" className="text-gray-900 font-semibold">Pensiunan</option>
              <option value="Pelajar / Mahasiswa" className="text-gray-900 font-semibold">Pelajar / Mahasiswa</option>
              <option value="Mengurus Rumah Tangga" className="text-gray-900 font-semibold">Mengurus Rumah Tangga</option>

              <option value="Belum / Tidak Bekerja" className="text-gray-900 font-semibold">Belum / Tidak Bekerja</option>
              <option value="Lainnya" className="text-gray-900 font-semibold">Lainnya...</option>
           </select>
        </div>

        {pekerjaan === 'Lainnya' && (
           <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300 border-l-4 border-[#23C16B] pl-4">
             <label className="block text-[13px] font-bold text-[#374151]">Sebutkan Pekerjaan Lainnya</label>
             <input
                type="text"
                maxLength={40}
                value={pekerjaanLainnya}
                onChange={(e) => setPekerjaanLainnya(e.target.value)}
                className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold placeholder-gray-400"
                placeholder="Ketik pekerjaan Anda..."
             />
           </div>
        )}

        {/* Alamat */}
        <div className={`space-y-1.5 ${isAdmin ? 'hidden' : ''}`}>
          <label className="block text-[13px] font-bold text-[#374151]">
            Alamat Domisili Lengkap (Tanpa RT/RW)
          </label>
          <textarea
            rows={3}
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            placeholder="Contoh: Jl. Diponegoro No. 12, Pringgasela"
            className="w-full px-4 py-4 rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-medium resize-none placeholder-gray-400"
          ></textarea>
        </div>

        {/* RT & RW Fields (Terpisah) */}
        <div className={`grid grid-cols-2 gap-5 ${isAdmin ? 'hidden' : ''}`}>
            <div className="space-y-1.5">
               <label className="block text-[13px] font-bold text-[#374151]">RT (Rukun Tetangga)</label>
               <input
                   type="text"
                   value={rt}
                   onChange={(e) => {
                      const val = e.target.value;
                      if (val.length > rt.length && /\D/.test(val.slice(-1))) {
                         setErrRt('Hanya angka!');
                         setTimeout(() => setErrRt(''), 1500);
                         return;
                      }
                      setRt(val.replace(/\D/g, '').substring(0, 3));
                   }}
                   onBlur={() => {
                      if(/^\d+$/.test(rt)) setRt(rt.padStart(3, '0'));
                   }}
                   className={`w-full px-4 py-[13.5px] rounded-xl border focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold ${errRt || (rt && !/^\d+$/.test(rt)) ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' : 'border-[#D1D5DB] focus:border-[#23C16B]'}`}
                   placeholder="000"
               />
               {errRt && (
                  <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in">* {errRt}</p>
               )}
            </div>
            
            <div className="space-y-1.5">
               <label className="block text-[13px] font-bold text-[#374151]">RW (Rukun Warga)</label>
               <input
                   type="text"
                   value={rw}
                   onChange={(e) => {
                      const val = e.target.value;
                      if (val.length > rw.length && /\D/.test(val.slice(-1))) {
                         setErrRw('Hanya angka!');
                         setTimeout(() => setErrRw(''), 1500);
                         return;
                      }
                      setRw(val.replace(/\D/g, '').substring(0, 3));
                   }}
                   onBlur={() => {
                      if(/^\d+$/.test(rw)) setRw(rw.padStart(3, '0'));
                   }}
                   className={`w-full px-4 py-[13.5px] rounded-xl border focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-white text-gray-900 text-sm font-semibold ${errRw || (rw && !/^\d+$/.test(rw)) ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' : 'border-[#D1D5DB] focus:border-[#23C16B]'}`}
                   placeholder="000"
               />
               {errRw && (
                  <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in">* {errRw}</p>
               )}
            </div>
        </div>

        {/* Titik Maps (Visual Interactive Picker) */}
        <div className={`space-y-1.5 ${isAdmin ? 'hidden' : ''}`}>
          <label className="block text-[13px] font-bold text-[#374151]">Titik Lokasi Rumah</label>
          
          <div 
             onClick={() => setShowMapModal(true)}
             className="w-full h-[180px] md:h-[240px] relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 cursor-pointer group transition-all hover:border-[#23C16B] shadow-sm"
          >
             {/* Peta Asli dirender dalam mode Pratinjau Mati (Read-Only) */}
             <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none">
                <MapComponent previewOnly={true} initialPos={savedPos} />
             </div>

             {/* Selubung Interaksi & Tombol */}
             <div className="absolute inset-0 z-10 bg-black/5 hover:bg-black/0 transition-colors flex items-center justify-center p-0.5 pointer-events-none">
                {savedPos ? (
                   <div className="flex flex-col items-center translate-y-3">
                      <span className="bg-white/95 backdrop-blur-md text-[#23C16B] text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-md border border-[#23C16B]/20 flex items-center gap-1.5">
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                         Koordinat Tersimpan
                      </span>
                   </div>
                ) : (
                   <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-md border border-gray-200 flex items-center gap-2 text-gray-700 font-extrabold text-[13px] hover:scale-105 transition-transform pointer-events-auto">
                      <svg className="w-4 h-4 text-[#23C16B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      Ketuk Untuk Pin Lokasi
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Kata Sandi (Opsional) */}
        <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/50 mt-4 space-y-3">
           <div className="flex justify-between items-start">
             <div>
               <h4 className="text-[14px] font-bold text-blue-900">Keamanan Akun Tambahan</h4>
               <p className="text-[12px] text-blue-700/80 mt-0.5 leading-relaxed font-medium">
                 {user.password ? 
                   "Anda telah menetapkan kata sandi sebelumnya. Isi kolom ini hanya jika Anda ingin merevisinya." : 
                   "Buat kata sandi opsional untuk keamanan ganda. Jika diatur, setiap log masuk memerlukan sandi ini."}
               </p>
             </div>
           </div>
           
           <div className="space-y-1.5 pt-1">
             <label className="block text-[13px] font-bold text-blue-900/80">Kata Sandi Akses</label>
             <div className="relative">
               <input
                 type={showPassword ? "text" : "password"}
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full px-4 py-[13.5px] rounded-xl border border-blue-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white text-gray-900 text-sm font-semibold placeholder-blue-300"
                 placeholder="Kosongkan jika tidak ingin mengubah/mengatur"
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 focus:outline-none transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   {showPassword ? (
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                   ) : (
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                   )}
                 </svg>
               </button>
             </div>
           </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[15px] bg-[#23C16B] hover:bg-[#1fa95d] text-white text-[14px] font-bold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 mt-4 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)] flex justify-center items-center gap-2"
        >
          {loading ? (
             <>
               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               MEMPERBARUI...
             </>
          ) : 'SIMPAN PERUBAHAN PROFIL'}
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

      {/* Modal Interaktif REAL Maps Pin */}
      {mounted && showMapModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
              
              {/* Header Peringatan Peta */}
              <div className="bg-[#FFF8E7] p-5 border-b border-orange-100 flex gap-4 items-start z-20 shadow-sm relative">
                 <div className="mt-0.5 bg-orange-400 text-white rounded-full w-6 h-6 flex items-center flex-shrink-0 justify-center shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                 </div>
                 <div>
                    <h4 className="text-orange-500 font-bold text-[15px] mb-1">Letakkan pin yang akurat</h4>
                    <p className="text-gray-500 text-[12px] leading-relaxed font-medium pr-2">
                       Titik koordinat digunakan untuk kelengkapan administrasi data Warga. Mohon periksa keakuratan lokasi Anda di peta ini.
                    </p>
                 </div>
              </div>

              {/* Komponen Peta Interaktif — key memaksa Leaflet fresh instance setiap buka modal */}
              <MapComponent 
                 key="map-modal"
                 initialPos={savedPos}
                 onCancel={() => setShowMapModal(false)}
                 onConfirm={(pos) => {
                    setTitikMaps(JSON.stringify(pos));
                    setShowMapModal(false);
                 }}
              />
           </div>
        </div>,
        document.body
      )}

      {/* Floating Profile Toast Notification */}
      {mounted && profileToast?.show && createPortal(
        <div 
          className="fixed top-8 right-8 z-[300] w-[calc(100%-48px)] max-w-[360px] animate-in slide-in-from-top-10 duration-500"
          onMouseEnter={() => setIsToastHovered(true)}
          onMouseLeave={() => setIsToastHovered(false)}
          onTouchStart={() => setIsToastHovered(true)}
          onTouchEnd={() => setIsToastHovered(false)}
        >
           <div className={`group cursor-pointer bg-white rounded-full hover:rounded-2xl active:rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] flex items-center justify-between p-1.5 pl-6 border border-gray-50/50 backdrop-blur-md transition-all gap-2 duration-300 ${isToastHovered ? 'scale-[1.02]' : 'scale-100'}`}>
              <p className="text-[13px] font-normal text-gray-500 line-clamp-1 group-hover:line-clamp-none group-active:line-clamp-none flex-1 transition-all">
                 {profileToast.message}
              </p>
              <div className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-normal border shadow-sm shrink-0 ${
                profileToast.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                 {profileToast.type === 'success' ? 'BERHASIL' : 'GAGAL'}
              </div>
           </div>
        </div>,
        document.body
      )}

    </div>
  );
}

