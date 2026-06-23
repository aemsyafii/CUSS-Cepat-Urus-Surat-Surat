'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NotificationModal, { NotificationType } from '@/components/NotificationModal';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorHeader, setErrorHeader] = useState('');
  const [loading, setLoading] = useState(false);

  const [notification, setNotification] = useState<{
    isOpen: boolean; type: NotificationType; title: string; message: string;
    buttonText?: string; onConfirm?: () => void;
  }>({ isOpen: false, type: 'info', title: '', message: '' });

  const router = useRouter();

  // Captcha states
  const [captchaCode, setCaptchaCode] = useState('1234'); // Default initial value to prevent hydration mismatch
  const [captchaInput, setCaptchaInput] = useState('');

  const getCharacterStyle = (char: string, index: number) => {
    const charCode = char.charCodeAt(0) || 0;
    const rotation = ((charCode * (index + 1)) % 41) - 20; // -20 to 20
    const offsetY = ((charCode * (index + 2)) % 11) - 5; // -5 to 5
    const fontSize = 19 + ((charCode * (index + 3)) % 5); // 19 to 23 (slightly smaller and cleaner)
    const colors = [
      'text-emerald-700',
      'text-teal-700',
      'text-indigo-900',
      'text-slate-800',
      'text-cyan-800',
      'text-emerald-950',
      'text-blue-900'
    ];
    const colorClass = colors[(charCode + index) % colors.length];
    return {
      transform: `rotate(${rotation}deg) translateY(${offsetY}px)`,
      fontSize: `${fontSize}px`,
      className: `${colorClass} font-bold tracking-widest select-none inline-block filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]`
    };
  };

  // Generate dynamic noise lines based on current captcha code
  const getNoiseLines = () => {
    const codeNum = parseInt(captchaCode) || 1234;
    return [
      {
        style: {
          top: `${12 + (codeNum % 9)}px`,
          left: `${4 + (codeNum % 7)}px`,
          transform: `rotate(${(codeNum % 31) - 15}deg)`,
          width: `${75 + (codeNum % 16)}px`,
        },
        className: 'absolute h-[1px] bg-emerald-600/35 pointer-events-none'
      },
      {
        style: {
          top: `${22 + ((codeNum >> 2) % 9)}px`,
          left: `${2 + ((codeNum >> 1) % 9)}px`,
          transform: `rotate(${((codeNum >> 3) % 31) - 15}deg)`,
          width: `${80 + ((codeNum >> 2) % 16)}px`,
        },
        className: 'absolute h-[1.5px] bg-teal-600/30 pointer-events-none'
      },
      {
        style: {
          top: `${16 + ((codeNum >> 4) % 9)}px`,
          left: `${1 + ((codeNum >> 3) % 9)}px`,
          transform: `rotate(${((codeNum >> 5) % 41) - 20}deg)`,
          width: `${70 + ((codeNum >> 4) % 21)}px`,
        },
        className: 'absolute h-[1px] bg-indigo-600/30 pointer-events-none'
      }
    ];
  };

  // Generate dynamic noise dots based on current captcha code
  const getNoiseDots = () => {
    const codeNum = parseInt(captchaCode) || 1234;
    return Array.from({ length: 15 }).map((_, i) => {
      const x = ((i * 19 + codeNum) % 90) + 5;
      const y = ((i * 23 + codeNum) % 30) + 5;
      const size = 2 + ((i + codeNum) % 2);
      return {
        key: i,
        style: {
          left: `${x}px`,
          top: `${y}px`,
          width: `${size}px`,
          height: `${size}px`,
        },
        className: 'absolute rounded-full bg-gray-400/25 pointer-events-none'
      };
    });
  };

  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
    setCaptchaInput('');
  };

  const toggleMode = (toRegister: boolean) => {
    setIsRegister(toRegister);
    setErrorHeader('');
    setIdentifier('');
    setPassword('');
    generateCaptcha();
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorHeader('');

    if (captchaInput !== captchaCode) {
      setErrorHeader('Kode keamanan (captcha) tidak sesuai.');
      generateCaptcha();
      return;
    }

    if (isRegister) {
      if (!name || name.length < 3) { setErrorHeader('Nama minimal 3 karakter.'); return; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorHeader('Email tidak valid.'); return; }
      if (!regPassword || regPassword.length < 6) { setErrorHeader('Password minimal 6 karakter.'); return; }
    } else {
      if (!identifier) { setErrorHeader('Masukkan email atau username.'); return; }
      if (!password) { setErrorHeader('Masukkan password.'); return; }
    }

    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nik: identifier,
            nama: name,
            email,
            whatsapp: whatsapp.replace(/\D/g, ''),
            password: regPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setErrorHeader(data.error || 'Pendaftaran gagal.'); setLoading(false); return; }

        // Reset semua field form register
        setIdentifier('');
        setName('');
        setEmail('');
        setWhatsapp('');
        setRegPassword('');
        setErrorHeader('');

        // Tampilkan modal sukses, lalu auto-redirect setelah 2.5 detik
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Pendaftaran Berhasil!',
          message: 'Akun Anda telah aktif. Mengalihkan ke dashboard...',
          onConfirm: () => { router.push(data.redirectUrl); router.refresh(); },
        });

        // Auto-redirect: jangan tutup modal dulu
        // Modal akan hilang sendiri saat halaman login unmount setelah navigasi selesai
        setTimeout(() => {
          router.push(data.redirectUrl);
          router.refresh();
        }, 2500);
        return;
      }

      // Login
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal.');

      router.push(data.redirectUrl);
      router.refresh();
    } catch (err: any) {
      setErrorHeader(err.message || 'Terjadi kesalahan.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#fcfcfd] font-sans">
      <header className="w-full flex items-center justify-between px-6 md:px-10 py-5 fixed top-0 left-0 z-50 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-gray-100 w-10 h-10">
            <img src="/logo.webp" alt="Logo CUSS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-[30px] font-black text-[#1F2937] tracking-tighter leading-none mt-1 flex items-baseline">
            CUSS<span className="w-[8px] h-[8px] bg-[#23C16B] rounded-full inline-block ml-0.5 mb-[4px]"></span>
          </h1>
        </div>
      </header>

      {/* Split-screen: kiri fixed, kanan scroll independen */}
      <div className="flex flex-col md:flex-row pt-[72px] min-h-[calc(100vh-72px)]">

        {/* KIRI â€” tidak ikut scroll */}
        <div className="hidden md:flex w-1/2 flex-shrink-0 sticky top-[72px] h-[calc(100vh-72px)] flex-col items-start justify-center px-16 lg:px-24 overflow-hidden">
          <div className="-mb-8 w-full max-w-[450px]">
            <img src="/hero-3d.png" alt="3D Office Architecture" className="w-full h-auto object-contain drop-shadow-xl pointer-events-none select-none" loading="eager" />
          </div>
          <h2 className="text-[4.5rem] leading-none font-black text-[#1F2937] mb-5 tracking-tight -ml-1 relative z-10 flex items-end">
            CUSS<span className="w-[18px] h-[18px] bg-[#23C16B] rounded-full inline-block ml-1.5 mb-[12px]"></span>
          </h2>
          <p className="text-[#4B5563] text-[15px] leading-relaxed max-w-[460px] font-medium relative z-10">
            CUSS (Cepat Urus Surat-Surat) adalah portal layanan digital untuk mengajukan pembuatan dokumen resmi secara online dan melacak proses pengajuan secara real-time tanpa harus antre di Balai Desa.
          </p>
        </div>

        {/* KANAN â€” scroll independen */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 py-10">
          <div className="w-full max-w-[440px]">
            <div className="bg-white/90 backdrop-blur-2xl rounded-[24px] p-8 relative shadow-[0_20px_50px_-15px_rgba(34,197,94,0.1)] border border-[#E5E7EB] z-20">
              <div className="absolute -inset-4 bg-[#23C16B]/10 blur-[80px] -z-10 rounded-full"></div>
              <h3 className="text-[24px] font-bold text-[#1F2937] mb-6 tracking-tight">
                {isRegister ? 'Daftar Akun Baru' : 'Masuk CUSS'}
              </h3>

              {errorHeader && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-[13px] font-medium leading-relaxed">{errorHeader}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister ? (
                  <>
                    <div className="space-y-1 pb-1">
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">NIK (16 Digit)</label>
                      <input type="text" maxLength={16} value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').substring(0, 16))}
                        placeholder="Nomor Induk Kependudukan"
                        className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 font-medium"
                        required />
                    </div>
                    <div className="space-y-1 pb-1">
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Nama Lengkap</label>
                      <input type="text" value={name} onChange={(e) => setName(toTitleCase(e.target.value.replace(/[^a-zA-Z\s']/g, '')))}
                        placeholder="Nama sesuai KTP"
                        className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 font-medium"
                        required />
                    </div>
                    <div className="space-y-1 pb-1">
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="contoh@email.com"
                        className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 font-medium"
                        required />
                    </div>
                    <div className="space-y-1 pb-1">
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">No WhatsApp Aktif</label>
                      <input type="text" value={whatsapp} onChange={(e) => {
                        let nums = e.target.value.replace(/\D/g, '');
                        if (nums.startsWith('0')) nums = '62' + nums.substring(1);
                        else if (!nums.startsWith('62') && nums.length > 0) nums = '62' + nums;
                        nums = nums.substring(0, 14);
                        let formatted = nums;
                        if (nums.length > 5 && nums.length <= 9) formatted = nums.substring(0, 5) + ' ' + nums.substring(5);
                        else if (nums.length > 9) formatted = nums.substring(0, 5) + ' ' + nums.substring(5, 9) + ' ' + nums.substring(9);
                        setWhatsapp(formatted);
                      }} placeholder="628xx xxxx xxxx"
                        className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 font-medium"
                        required />
                    </div>
                    <div className="space-y-1 pb-1">
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Password</label>
                      <div className="relative flex items-center">
                        <input type={showRegPassword ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 pr-12 font-medium"
                          required minLength={6} />
                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-emerald-600">
                          {showRegPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1 pb-1">
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Email atau Username</label>
                      <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Masukkan email atau username"
                        className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 font-medium"
                        required />
                    </div>
                    <div className="space-y-1 pb-1">
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Password</label>
                      <div className="relative flex items-center">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="Masukkan password"
                          className="w-full px-4 py-[13.5px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 pr-12 font-medium"
                          required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-emerald-600">
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                     </div>
                  </>
                )}

                {/* Captcha Section */}
                <div className="space-y-1.5 pb-2">
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">Kode Keamanan</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        maxLength={4}
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="Masukkan 4 digit kode"
                        className="w-full px-4 py-[11px] rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#23C16B] focus:ring-1 focus:ring-[#23C16B] transition-colors bg-[#F9FAFB] hover:bg-white text-gray-900 text-sm placeholder-gray-400 font-medium tracking-wider"
                        required 
                      />
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1 border border-gray-200 select-none">
                      <div className="w-[100px] h-[40px] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center gap-1.5 overflow-hidden relative">
                        {/* Noise lines */}
                        {getNoiseLines().map((line, idx) => (
                          <div key={idx} className={line.className} style={line.style}></div>
                        ))}
                        {/* Noise dots */}
                        {getNoiseDots().map((dot) => (
                          <div key={dot.key} className={dot.className} style={dot.style}></div>
                        ))}
                        {/* Captcha characters */}
                        {captchaCode.split('').map((char, index) => {
                          const style = getCharacterStyle(char, index);
                          return (
                            <span 
                              key={index} 
                              className={style.className} 
                              style={{ transform: style.transform, fontSize: style.fontSize }}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </div>
                      <button 
                        type="button" 
                        onClick={generateCaptcha}
                        className="p-1.5 text-gray-400 hover:text-[#23C16B] transition-colors"
                        title="Refresh Captcha"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-[15px] px-4 bg-[#23C16B] hover:bg-[#1fa95d] text-white text-[14px] font-bold rounded-full transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)] tracking-wide">
                  {loading ? 'MEMPROSES...' : (isRegister ? 'DAFTAR SEKARANG' : 'MASUK')}
                </button>

                <div className="flex items-center justify-between mt-4 text-[13px] px-1">
                  <div>
                    {!isRegister && (
                      <button type="button" onClick={() => setNotification({
                        isOpen: true,
                        type: 'info',
                        title: 'Lupa Kata Sandi?',
                        message: 'Silakan hubungi administrator di Kantor Desa untuk melakukan reset kata sandi atau melalui WhatsApp Official kami.',
                      })} className="text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                        Lupa Kata Sandi?
                      </button>
                    )}
                  </div>
                  <div>
                    {isRegister ? (
                      <span className="text-gray-500 font-medium">
                        Sudah punya akun?{' '}
                        <button type="button" onClick={() => toggleMode(false)}
                          className="text-[#1F2937] font-semibold underline decoration-gray-300 underline-offset-4 hover:text-emerald-600">Masuk</button>
                      </span>
                    ) : (
                      <span className="text-gray-500 font-medium">
                        Belum punya akun?{' '}
                        <button type="button" onClick={() => toggleMode(true)}
                          className="text-[#1F2937] font-semibold underline decoration-gray-300 underline-offset-4 hover:text-emerald-600">Daftar</button>
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        type={notification.type} title={notification.title} message={notification.message}
        buttonText={notification.buttonText} onConfirm={notification.onConfirm} />
    </div>
  );
}
