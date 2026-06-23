'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PengaturanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuOptions = [
    {
      title: 'Jam Operasional',
      description: 'Kelola jam pelayanan operasional aktif, libur reguler, dan atur hari libur nasional.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: '/adm/pengaturan/operasional'
    },
    {
      title: 'Jenis Layanan Surat',
      description: 'Kelola daftar jenis layanan pembuatan surat yang dapat dipilih oleh warga pada form pengajuan.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      href: '/adm/pengaturan/jenis-layanan'
    },
    {
      title: 'Master Template Surat',
      description: 'Tulis dan desain kerangka cetak (template) kustom untuk berbagai tipe surat pengajuan warga.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: '/adm/pengaturan/template'
    },
    {
      title: 'Manajemen Penyimpanan',
      description: 'Bersihkan dokumen lampiran lama untuk membebaskan ruang tanpa menghapus data statistik.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      href: '/adm/pengaturan/penyimpanan'
    }
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Opsi Lanjutan</h1>
        <p className="text-gray-500 mt-1 text-[15px]">Konfigurasi pengaturan level sistem meliputi sinkronisasi data, jadwal operasional, dan kerangka template surat digital.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Kiri: Daftar Menu Pengaturan */}
        <div className="w-full lg:w-[40%] flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-col divide-y divide-gray-100">
              {menuOptions.map((option, idx) => {
                const isActive = pathname.includes(option.href);

                return (
                  <Link 
                    key={idx} 
                    href={isActive ? '/adm/pengaturan' : option.href}
                    className={`p-6 transition-all group flex items-start gap-4 hover:bg-gray-50/80 ${isActive ? 'bg-emerald-50/30 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
                  >
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border shadow-sm transition-transform group-hover:scale-105 ${isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-gray-200 text-gray-500 group-hover:text-emerald-500 group-hover:border-emerald-100 group-hover:bg-emerald-50/50'}`}>
                        {option.icon}
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                           <h3 className={`text-[15px] font-bold leading-tight ${isActive ? 'text-emerald-700' : 'text-gray-800 group-hover:text-emerald-600'}`}>{option.title}</h3>
                        </div>
                        <p className={`text-[13px] leading-relaxed pr-2 ${isActive ? 'text-emerald-600/80 font-medium' : 'text-gray-500 font-medium'}`}>
                           {option.description}
                        </p>
                     </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Kanan: Area Konten Dinamis */}
        <div className="w-full lg:w-[60%] relative">
          {children}
        </div>
      </div>
    </div>
  );
}
