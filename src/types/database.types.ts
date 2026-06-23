export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      Users: {
        Row: {
          id: string
          auth_id: string
          nik: string
          email: string | null
          nama: string
          role: 'warga' | 'admin'
          username: string | null
          tanggal_lahir: string | null
          jenis_kelamin: string | null
          alamat: string | null
          rt: string | null
          rw: string | null
          agama: string | null
          pekerjaan: string | null
          nomor_telepon: string | null
          foto: string | null
          titik_maps: string | null
          status: 'Aktif' | 'Nonaktif'
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          nik: string
          email?: string | null
          nama: string
          role: 'warga' | 'admin'
          username?: string | null
          tanggal_lahir?: string | null
          jenis_kelamin?: string | null
          alamat?: string | null
          rt?: string | null
          rw?: string | null
          agama?: string | null
          pekerjaan?: string | null
          nomor_telepon?: string | null
          foto?: string | null
          titik_maps?: string | null
          status?: 'Aktif' | 'Nonaktif'
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          nik?: string
          email?: string | null
          nama?: string
          role?: 'warga' | 'admin'
          username?: string | null
          tanggal_lahir?: string | null
          jenis_kelamin?: string | null
          alamat?: string | null
          rt?: string | null
          rw?: string | null
          agama?: string | null
          pekerjaan?: string | null
          nomor_telepon?: string | null
          foto?: string | null
          titik_maps?: string | null
          status?: 'Aktif' | 'Nonaktif'
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      Surat: {
        Row: {
          id: string
          pemohon_id: string
          jenis_surat: string
          keperluan: string
          keterangan: string | null
          subjek: Json | null
          is_mewakili: boolean
          nama_subjek: string | null
          nik_subjek: string | null
          hubungan_subjek: string | null
          jenis_kelamin_subjek: string | null
          alamat_subjek: string | null
          rt_subjek: string | null
          rw_subjek: string | null
          status: 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak'
          response_admin: string | null
          no_pengajuan: string | null
          no_surat: string | null
          dokumen_lampiran: Json
          tanggal_diproses: string | null
          tanggal_disetujui: string | null
          tanggal_ditolak: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pemohon_id: string
          jenis_surat: string
          keperluan: string
          keterangan?: string | null
          subjek?: Json | null
          is_mewakili?: boolean
          nama_subjek?: string | null
          nik_subjek?: string | null
          hubungan_subjek?: string | null
          jenis_kelamin_subjek?: string | null
          alamat_subjek?: string | null
          rt_subjek?: string | null
          rw_subjek?: string | null
          status?: 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak'
          response_admin?: string | null
          no_pengajuan?: string | null
          no_surat?: string | null
          dokumen_lampiran?: Json
          tanggal_diproses?: string | null
          tanggal_disetujui?: string | null
          tanggal_ditolak?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pemohon_id?: string
          jenis_surat?: string
          keperluan?: string
          keterangan?: string | null
          subjek?: Json | null
          is_mewakili?: boolean
          nama_subjek?: string | null
          nik_subjek?: string | null
          hubungan_subjek?: string | null
          jenis_kelamin_subjek?: string | null
          alamat_subjek?: string | null
          rt_subjek?: string | null
          rw_subjek?: string | null
          status?: 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak'
          response_admin?: string | null
          no_pengajuan?: string | null
          no_surat?: string | null
          dokumen_lampiran?: Json
          tanggal_diproses?: string | null
          tanggal_disetujui?: string | null
          tanggal_ditolak?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      RiwayatStatus: {
        Row: {
          id: string
          surat_id: string
          status: 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak'
          catatan: string | null
          dibuat_oleh: string | null
          created_at: string
        }
        Insert: {
          id?: string
          surat_id: string
          status: 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak'
          catatan?: string | null
          dibuat_oleh?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          surat_id?: string
          status?: 'Masuk' | 'Diproses' | 'Selesai' | 'Ditolak'
          catatan?: string | null
          dibuat_oleh?: string | null
          created_at?: string
        }
        Relationships: []
      }
      PengaturanSistem: {
        Row: {
          id: string
          kunci: string
          nilai: Json
          updated_at: string
        }
        Insert: {
          id?: string
          kunci: string
          nilai: Json
          updated_at?: string
        }
        Update: {
          id?: string
          kunci?: string
          nilai?: Json
          updated_at?: string
        }
        Relationships: []
      }
      TemplateSurat: {
        Row: {
          id: string
          nama_template: string
          identitas_surat: string
          file_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nama_template: string
          identitas_surat: string
          file_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nama_template?: string
          identitas_surat?: string
          file_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ArsipSurat: {
        Row: {
          id: string
          surat_id: string
          file_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          surat_id: string
          file_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          surat_id?: string
          file_path?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
