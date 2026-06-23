/**
 * Shared types dan konstanta yang dipakai di beberapa bagian aplikasi CUSS.
 * Import dari sini untuk menghindari duplikasi definisi.
 */

// ==========================================
// STATUS SURAT
// ==========================================
export type StatusSurat = 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak';

export const STATUS_SURAT: Record<StatusSurat, { label: string; color: string }> = {
  Masuk: { label: 'Menunggu', color: 'amber' },
  Diproses: { label: 'Diproses', color: 'blue' },
  Selesai: { label: 'Selesai', color: 'emerald' },
  Ditolak: { label: 'Ditolak', color: 'red' },
};

// ==========================================
// JENIS KELAMIN
// ==========================================
export type JenisKelamin = 'Laki-laki' | 'Laki-Laki' | 'Perempuan';

export function normalizeGender(jk: string | null | undefined): 'laki-laki' | 'perempuan' | null {
  if (!jk) return null;
  return jk.toLowerCase() === 'laki-laki' ? 'laki-laki' : 'perempuan';
}

// ==========================================
// GLOBAL TOAST TYPE (sama dengan GlobalToast component)
// ==========================================
export type GlobalToastData = {
  show: boolean;
  type: 'success' | 'error' | 'info';
  label: string;
  message: string;
};

// ==========================================
// SURAT TYPE (dipakai di halaman warga dan admin)
// ==========================================
export type Pemohon = {
  nama: string;
  nik: string;
  jenis_kelamin: string | null;
  nomor_telepon: string | null;
  alamat: string | null;
  rt: string | null;
  rw: string | null;
  agama?: string | null;
  pekerjaan?: string | null;
  titik_maps?: string | null;
  foto?: string | null;
  tanggal_lahir?: string | null;
};

export type SuratBase = {
  id: string;
  pemohon_id: string;
  jenis_surat: string;
  status: StatusSurat;
  created_at: string;
  updated_at?: string;
  subjek?: any;
  keperluan: string;
  keterangan?: string | null;
  response_admin?: string | null;
  dokumen_lampiran?: any[];
  no_pengajuan?: string | null;
  no_surat?: string | null;
  // Timestamp status
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
};

export type SuratWithPemohon = SuratBase & {
  pemohon: Pemohon | null;
};

// ==========================================
// HELPER: Atas nama (mewakili atau pemohon langsung)
// ==========================================
export function getAtasNama(surat: SuratBase & { pemohon?: Pemohon | null }): string {
  if (surat.is_mewakili) return surat.nama_subjek || 'Penerima';
  return surat.pemohon?.nama || 'Pemohon';
}
