# CUSS (Cepat Urus Surat Surat)

Aplikasi **CUSS** adalah platform digital berbasis Next.js untuk digitalisasi pengajuan dokumen resmi desa dengan pelacakan _real-time_ dan asisten pintar berbasis AI (Gemini).

## Panduan Memulai (Quickstart)

Ikuti langkah-langkah di bawah ini untuk menjalankan project di lingkungan lokal setelah Anda mengunduh/clone repositori ini.

### Prasyarat

- **Node.js** (versi 18 ke atas disarankan)
- **NPM** (bawaan dari instalasi Node.js)

---

### Langkah 1: Install Dependencies

Jalankan perintah berikut pada terminal di folder project untuk menginstal semua package yang dibutuhkan:

```bash
npm install
```

### Langkah 2: Setup Environment Variables

1. Duplikat file `.env.example` dan ubah namanya menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Buka file `.env.local` baru tersebut, lalu isi nilai variabel berikut sesuai dengan akun Supabase dan API key Gemini Anda:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase Anda.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Kunci anonim dari Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: Kunci service role Supabase (untuk bypass RLS di sisi server).
   - `GEMINI_API_KEY`: API key untuk asisten AI (didapatkan dari Google AI Studio).
   - `SETUP_SECRET`: Token/kunci rahasia bebas untuk verifikasi setup admin.

### Langkah 3: Setup Database (Supabase)

Project ini menggunakan Supabase sebagai database. Jalankan inisialisasi skema dengan langkah berikut:

1. Masuk ke dashboard Supabase Anda.
2. Buka menu **SQL Editor** -> **New Query**.
3. Salin seluruh isi dari file [supabase-schema-baru.sql](file:///e:/02%20Project/00%20Digital/CUSS/supabase-schema-baru.sql) yang ada di root project ini.
4. Tempel (_paste_) ke SQL Editor Supabase dan klik **Run**.
5. Proses ini akan membuat tabel-tabel baru, relasi, fungsi RLS, storage bucket, dan menyemai (_seed_) data akun demo berikut:
   - **Admin**: Username: `kepaladesa` | Password: `admin123`
   - **Warga**: NIK: `1234567890123456` | Password: `warga123`

### Langkah 4: Jalankan Server Development

Setelah dependensi terinstall dan environment variables serta database dikonfigurasi, jalankan server pengembangan:

```bash
npm run dev
```

Aplikasi akan berjalan pada port **3001**. Buka browser Anda dan akses:
[http://localhost:3001](http://localhost:3001)

Link Demo: [https://cuss-cepat.vercel.app/](https://cuss-cepat.vercel.app/)

---
