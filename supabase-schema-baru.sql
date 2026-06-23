-- ==========================================
-- CUSS — FULL SCHEMA v3 (Production Ready)
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- TABEL USERS (merge Warga + Admin)
-- ==========================================
CREATE TABLE IF NOT EXISTS "Users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "auth_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    "nik" VARCHAR(16) UNIQUE NOT NULL,
    "email" TEXT UNIQUE,
    "nama" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK (role IN ('warga', 'admin')),
    "username" TEXT UNIQUE,
    "tanggal_lahir" DATE,
    "jenis_kelamin" TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan', 'Laki-Laki')),
    "alamat" TEXT,
    "rt" VARCHAR(3),
    "rw" VARCHAR(3),
    "agama" TEXT,
    "pekerjaan" TEXT,
    "nomor_telepon" VARCHAR(20),
    "foto" TEXT,
    "titik_maps" TEXT,
    "status" TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    "deleted_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- TABEL SURAT
-- ==========================================
CREATE TABLE IF NOT EXISTS "Surat" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "pemohon_id" UUID REFERENCES "Users"(id) ON DELETE CASCADE NOT NULL,
    "jenis_surat" TEXT NOT NULL,
    "keperluan" TEXT NOT NULL,
    "keterangan" TEXT,
    "subjek" JSONB,
    "is_mewakili" BOOLEAN DEFAULT FALSE NOT NULL,
    "nama_subjek" TEXT,
    "nik_subjek" VARCHAR(16),
    "hubungan_subjek" TEXT,
    "jenis_kelamin_subjek" TEXT,
    "alamat_subjek" TEXT,
    "rt_subjek" VARCHAR(3),
    "rw_subjek" VARCHAR(3),
    "status" TEXT DEFAULT 'Masuk' CHECK (status IN ('Masuk', 'Diproses', 'Selesai', 'Ditolak')),
    "response_admin" TEXT,
    "no_pengajuan" TEXT UNIQUE,
    "no_surat" TEXT,
    "dokumen_lampiran" JSONB DEFAULT '[]'::jsonb,
    "tanggal_diproses" TIMESTAMP WITH TIME ZONE,
    "tanggal_disetujui" TIMESTAMP WITH TIME ZONE,
    "tanggal_ditolak" TIMESTAMP WITH TIME ZONE,
    "deleted_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- TABEL RIWAYAT STATUS
-- ==========================================
CREATE TABLE IF NOT EXISTS "RiwayatStatus" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "surat_id" UUID REFERENCES "Surat"(id) ON DELETE CASCADE NOT NULL,
    "status" TEXT NOT NULL CHECK (status IN ('Masuk', 'Diproses', 'Selesai', 'Ditolak')),
    "catatan" TEXT,
    "dibuat_oleh" UUID REFERENCES "Users"(id),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- TABEL PENGATURAN SISTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS "PengaturanSistem" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "kunci" VARCHAR UNIQUE NOT NULL,
    "nilai" JSONB NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- TABEL TEMPLATE SURAT
-- ==========================================
CREATE TABLE IF NOT EXISTS "TemplateSurat" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "nama_template" VARCHAR UNIQUE NOT NULL,
    "identitas_surat" VARCHAR UNIQUE NOT NULL,
    "file_path" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- TABEL ARSIP SURAT
-- ==========================================
CREATE TABLE IF NOT EXISTS "ArsipSurat" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "surat_id" UUID REFERENCES "Surat"(id) ON DELETE CASCADE UNIQUE NOT NULL,
    "file_path" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- FUNGSI HELPER (dibuat SEBELUM RLS agar bisa dipakai policy)
-- SECURITY DEFINER = bypass RLS → mencegah infinite recursion
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Users" WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT id FROM "Users" WHERE auth_id = auth.uid();
$$;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Surat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiwayatStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PengaturanSistem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemplateSurat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArsipSurat" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES — USERS
-- ==========================================
DROP POLICY IF EXISTS "Users_select_self" ON "Users";
DROP POLICY IF EXISTS "Users_select_admin" ON "Users";
DROP POLICY IF EXISTS "Users_update_self" ON "Users";
DROP POLICY IF EXISTS "Users_update_admin" ON "Users";
DROP POLICY IF EXISTS "Users_insert_admin" ON "Users";
DROP POLICY IF EXISTS "Users_delete_admin" ON "Users";

-- Warga lihat data diri sendiri
CREATE POLICY "Users_select_self" ON "Users"
    FOR SELECT USING (auth_id = auth.uid());

-- Admin lihat semua — pakai is_admin() bukan subquery langsung
CREATE POLICY "Users_select_admin" ON "Users"
    FOR SELECT USING (public.is_admin());

-- Warga update profil sendiri (dilarang eskalasi role sendiri ke admin atau ubah status)
CREATE POLICY "Users_update_self" ON "Users"
    FOR UPDATE USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid() AND role = 'warga' AND status = 'Aktif');

-- Admin update semua user
CREATE POLICY "Users_update_admin" ON "Users"
    FOR UPDATE USING (public.is_admin());

-- Hanya admin yang bisa tambah user
CREATE POLICY "Users_insert_admin" ON "Users"
    FOR INSERT WITH CHECK (public.is_admin());

-- Hanya admin yang bisa hapus user
CREATE POLICY "Users_delete_admin" ON "Users"
    FOR DELETE USING (public.is_admin());

-- ==========================================
-- RLS POLICIES — SURAT
-- ==========================================
DROP POLICY IF EXISTS "Surat_select_self" ON "Surat";
DROP POLICY IF EXISTS "Surat_select_admin" ON "Surat";
DROP POLICY IF EXISTS "Surat_insert_warga" ON "Surat";
DROP POLICY IF EXISTS "Surat_update_admin" ON "Surat";
DROP POLICY IF EXISTS "Surat_delete_admin" ON "Surat";

-- Warga lihat surat milik sendiri
CREATE POLICY "Surat_select_self" ON "Surat"
    FOR SELECT USING (pemohon_id = public.get_user_id());

-- Admin lihat semua surat
CREATE POLICY "Surat_select_admin" ON "Surat"
    FOR SELECT USING (public.is_admin());

-- Warga submit surat atas nama sendiri
CREATE POLICY "Surat_insert_warga" ON "Surat"
    FOR INSERT WITH CHECK (pemohon_id = public.get_user_id());

-- Admin update surat (proses, tolak, selesai)
CREATE POLICY "Surat_update_admin" ON "Surat"
    FOR UPDATE USING (public.is_admin());

-- Admin hapus surat
CREATE POLICY "Surat_delete_admin" ON "Surat"
    FOR DELETE USING (public.is_admin());

-- ==========================================
-- RLS POLICIES — RIWAYAT STATUS
-- ==========================================
DROP POLICY IF EXISTS "Riwayat_select" ON "RiwayatStatus";
DROP POLICY IF EXISTS "Riwayat_insert_admin" ON "RiwayatStatus";

CREATE POLICY "Riwayat_select" ON "RiwayatStatus"
    FOR SELECT USING (true);

CREATE POLICY "Riwayat_insert_admin" ON "RiwayatStatus"
    FOR INSERT WITH CHECK (public.is_admin());

-- ==========================================
-- RLS POLICIES — PENGATURAN SISTEM
-- ==========================================
DROP POLICY IF EXISTS "PengaturanSistem_select" ON "PengaturanSistem";
DROP POLICY IF EXISTS "PengaturanSistem_all_admin" ON "PengaturanSistem";

CREATE POLICY "PengaturanSistem_select" ON "PengaturanSistem"
    FOR SELECT USING (true);

CREATE POLICY "PengaturanSistem_all_admin" ON "PengaturanSistem"
    FOR ALL USING (public.is_admin());

-- ==========================================
-- RLS POLICIES — TEMPLATE SURAT
-- ==========================================
DROP POLICY IF EXISTS "TemplateSurat_select" ON "TemplateSurat";
DROP POLICY IF EXISTS "TemplateSurat_all_admin" ON "TemplateSurat";

CREATE POLICY "TemplateSurat_select" ON "TemplateSurat"
    FOR SELECT USING (true);

CREATE POLICY "TemplateSurat_all_admin" ON "TemplateSurat"
    FOR ALL USING (public.is_admin());

-- ==========================================
-- RLS POLICIES — ARSIP SURAT
-- ==========================================
DROP POLICY IF EXISTS "ArsipSurat_select" ON "ArsipSurat";
DROP POLICY IF EXISTS "ArsipSurat_insert_admin" ON "ArsipSurat";
DROP POLICY IF EXISTS "ArsipSurat_update_admin" ON "ArsipSurat";
DROP POLICY IF EXISTS "ArsipSurat_delete_admin" ON "ArsipSurat";

CREATE POLICY "ArsipSurat_select" ON "ArsipSurat"
    FOR SELECT USING (true);

CREATE POLICY "ArsipSurat_insert_admin" ON "ArsipSurat"
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "ArsipSurat_update_admin" ON "ArsipSurat"
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "ArsipSurat_delete_admin" ON "ArsipSurat"
    FOR DELETE USING (public.is_admin());



-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('dokumen_lampiran', 'dokumen_lampiran', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('arsip_surat', 'arsip_surat', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('templates_surat', 'templates_surat', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('foto_profil', 'foto_profil', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- STORAGE POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Lampiran upload warga" ON storage.objects;
DROP POLICY IF EXISTS "Lampiran read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Arsip read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Arsip write admin" ON storage.objects;
DROP POLICY IF EXISTS "Template read public" ON storage.objects;
DROP POLICY IF EXISTS "Template write admin" ON storage.objects;
DROP POLICY IF EXISTS "FotoProfil upload self" ON storage.objects;
DROP POLICY IF EXISTS "FotoProfil read public" ON storage.objects;

CREATE POLICY "Lampiran upload warga" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'dokumen_lampiran' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Lampiran read authenticated" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'dokumen_lampiran' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Arsip read authenticated" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'arsip_surat' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Arsip write admin" ON storage.objects
    FOR ALL USING (
        bucket_id = 'arsip_surat' AND
        EXISTS (SELECT 1 FROM "Users" WHERE auth_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Template read public" ON storage.objects
    FOR SELECT USING (bucket_id = 'templates_surat');

CREATE POLICY "Template write admin" ON storage.objects
    FOR ALL USING (
        bucket_id = 'templates_surat' AND
        EXISTS (SELECT 1 FROM "Users" WHERE auth_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "FotoProfil upload self" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'foto_profil' AND auth.role() = 'authenticated'
    );

CREATE POLICY "FotoProfil read public" ON storage.objects
    FOR SELECT USING (bucket_id = 'foto_profil');

-- ==========================================
-- TRIGGER: Auto-update updated_at pada Surat
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_surat_updated_at ON "Surat";
CREATE TRIGGER trigger_surat_updated_at
    BEFORE UPDATE ON "Surat"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- TRIGGER: Cleanup file saat Surat dihapus
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_dokumen_lampiran()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  file_path TEXT;
BEGIN
  IF OLD.dokumen_lampiran IS NOT NULL AND jsonb_array_length(OLD.dokumen_lampiran) > 0 THEN
    FOR file_path IN
      SELECT value->>'path'
      FROM jsonb_array_elements(OLD.dokumen_lampiran)
      WHERE value->>'path' IS NOT NULL
    LOOP
      PERFORM storage.delete_object('dokumen_lampiran', file_path);
    END LOOP;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_surat_files ON "Surat";
CREATE TRIGGER trigger_cleanup_surat_files
  AFTER DELETE ON "Surat"
  FOR EACH ROW EXECUTE FUNCTION cleanup_dokumen_lampiran();

-- ==========================================
-- SUPABASE REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE "Surat";
ALTER PUBLICATION supabase_realtime ADD TABLE "Users";

-- ==========================================
-- FUNGSI HELPER
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM "Users" WHERE auth_id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM "Users" WHERE auth_id = auth.uid();
$$;

-- ==========================================
-- SEED DATA
-- ==========================================
-- Cara kerja seed:
-- 1. Buat auth user di auth.users
-- 2. Buat identitas di auth.identities (WAJIB agar signInWithPassword bekerja)
-- 3. Insert ke tabel Users dengan auth_id yang benar
-- ==========================================

DO $$
DECLARE
  admin_auth_id UUID;
  warga_auth_id UUID;
BEGIN

  -- ── ADMIN ──────────────────────────────────────────────────
  -- Cek apakah sudah ada
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin_kepaladesa@cuss.internal'
  LIMIT 1;

  IF admin_auth_id IS NULL THEN
    -- Buat auth user admin
    admin_auth_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      admin_auth_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'admin_kepaladesa@cuss.internal',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","nama":"Pak Kades"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    -- WAJIB: Buat entry di auth.identities
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_auth_id,
      'admin_kepaladesa@cuss.internal',
      jsonb_build_object('sub', admin_auth_id::text, 'email', 'admin_kepaladesa@cuss.internal'),
      'email',
      NOW(), NOW(), NOW()
    );
  ELSE
    -- Sudah ada, update password saja
    UPDATE auth.users
    SET
      encrypted_password = crypt('admin123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = admin_auth_id;
  END IF;

  -- Insert ke Users jika belum ada
  INSERT INTO "Users" (auth_id, nik, nama, role, username, email, tanggal_lahir)
  VALUES (admin_auth_id, '0000000000000000', 'Pak Kades', 'admin', 'kepaladesa', 'admin_kepaladesa@cuss.internal', '1990-01-01')
  ON CONFLICT (username) DO UPDATE SET auth_id = EXCLUDED.auth_id, email = EXCLUDED.email;

  -- ── WARGA DEMO ─────────────────────────────────────────────
  SELECT id INTO warga_auth_id
  FROM auth.users
  WHERE email = '1234567890123456@cuss.internal'
  LIMIT 1;

  IF warga_auth_id IS NULL THEN
    warga_auth_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      warga_auth_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      '1234567890123456@cuss.internal',
      crypt('warga123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"warga","nama":"Budi Santoso"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    -- WAJIB: Buat entry di auth.identities
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      warga_auth_id,
      '1234567890123456@cuss.internal',
      jsonb_build_object('sub', warga_auth_id::text, 'email', '1234567890123456@cuss.internal'),
      'email',
      NOW(), NOW(), NOW()
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt('warga123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = warga_auth_id;
  END IF;

  INSERT INTO "Users" (
    auth_id, nik, nama, role, email, tanggal_lahir,
    nomor_telepon, alamat, rt, rw,
    jenis_kelamin, agama, pekerjaan
  ) VALUES (
    warga_auth_id, '1234567890123456', 'Budi Santoso', 'warga', '1234567890123456@cuss.internal', '1990-01-01',
    '081234567890', 'Jl. Merdeka No. 1', '001', '001',
    'Laki-laki', 'Islam', 'Pedagang'
  )
  ON CONFLICT (nik) DO UPDATE SET auth_id = EXCLUDED.auth_id, email = EXCLUDED.email;

END $$;

-- ==========================================
-- SEED DATA — PENGATURAN SISTEM (Default)
-- ==========================================
INSERT INTO "PengaturanSistem" (kunci, nilai)
VALUES ('cleanup_settings', '{"enabled": false, "retention": 30}'::jsonb)
ON CONFLICT (kunci) DO NOTHING;

-- ==========================================
-- VERIFIKASI AKHIR
-- Jalankan ini setelah script di atas untuk
-- memastikan semua data seed berhasil masuk
-- ==========================================
/*
SELECT
  a.email,
  a.email_confirmed_at IS NOT NULL as auth_confirmed,
  i.provider as identity_provider,
  u.nama, u.role, u.username
FROM auth.users a
LEFT JOIN auth.identities i ON i.user_id = a.id
LEFT JOIN "Users" u ON u.auth_id = a.id
WHERE a.email IN (
  'admin_kepaladesa@cuss.internal',
  '1234567890123456@cuss.internal'
);
*/

-- ==========================================
-- CATATAN PENGGUNAAN
-- ==========================================
-- 1. RESET SUPABASE DULU:
--    Supabase Dashboard → Project Settings → General → "Pause project"
--    Atau hapus semua tabel manual, lalu jalankan file ini.
--
-- 2. Jalankan file ini di SQL Editor → New Query → Run
--
-- 3. Verifikasi dengan menjalankan query di blok komentar di atas
--    Harus ada 2 baris dengan identity_provider = 'email'
--
-- 4. Login credentials:
--    Admin   → username: kepaladesa   | password: admin123
--    Warga   → NIK: 1234567890123456  | password: warga123
