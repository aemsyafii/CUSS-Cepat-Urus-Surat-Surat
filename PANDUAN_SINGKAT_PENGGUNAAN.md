# Panduan Penggunaan Aplikasi CUSS (Cepat Urus Surat-Surat)

Dokumen ini berisi panduan singkat mengenai cara penggunaan aplikasi **CUSS**, baik dari sudut pandang **Warga (User)** maupun **Perangkat Desa (Admin)**.

---

## 📋 Daftar Isi
1. [Panduan untuk Warga (User)](#1-panduan-untuk-warga-user)
   - [Akses & Login](#akses--login)
   - [Pengisian Profil & Peta (Geospasial)](#pengisian-profil--peta-geospasial)
   - [Pengajuan Surat Baru](#pengajuan-surat-baru)
   - [Pelacakan Berkas & Notifikasi](#pelacakan-berkas--notifikasi)
   - [Asisten AI (CUSS Assistant)](#asisten-ai-cuss-assistant)
2. [Panduan untuk Perangkat Desa (Admin)](#2-panduan-untuk-perangkat-desa-admin)
   - [Akses & Login Admin](#akses--login-admin)
   - [Dashboard & Statistik](#dashboard--statistik)
   - [Pengelolaan Pengajuan](#pengelolaan-pengajuan)
   - [Cetak Surat Otomatis](#cetak-surat-otomatis)
   - [Master Data Warga](#master-data-warga)
   - [Pengaturan Sistem & Opsi Lanjutan](#pengaturan-sistem--opsi-lanjutan)

---

## 👤 1. Panduan untuk Warga (User)

Warga dapat menggunakan CUSS untuk mengajukan berbagai surat keterangan desa secara daring tanpa perlu mengantre fisik di balai desa.

### Akses & Login
1. Buka aplikasi CUSS di browser Anda.
2. Masuk menggunakan **Email atau Username** Anda yang telah terdaftar beserta **Kata Sandi** Anda.
   *(Contoh Akun Demo Warga: Email: `1234567890123456@cuss.internal` | Sandi: `warga123`)*

### Pengisian Profil & Peta (Geospasial)
> [!IMPORTANT]
> **Prasyarat Pengajuan:** Anda tidak dapat mengajukan surat jika profil Anda belum lengkap.
1. Navigasi ke menu **Profil**.
2. Lengkapi data diri seperti Alamat, RT, RW, Nomor Telepon, Jenis Kelamin, Agama, dan Pekerjaan.
3. Tentukan **titik koordinat rumah** Anda pada peta interaktif Leaflet yang disediakan di halaman profil.
4. Klik **Simpan Perubahan**.

### Pengajuan Surat Baru
1. Masuk ke menu **Buat Surat** (`/cuss/pengajuan`).
2. Tentukan apakah Anda mengajukan untuk diri sendiri atau **mewakili orang lain** (misalnya keluarga). Jika mewakili orang lain, aktifkan toggle dan lengkapi data penerima (Nama, NIK 16 digit, RT/RW, Hubungan, dan Gender).
3. Pilih **Jenis Surat** yang ingin diajukan:
   - Surat Keterangan Usaha (SKU)
   - Surat Keterangan Tidak Mampu (SKTM)
   - Surat Pengantar SKCK
   - Surat Pengantar KTP / KK
   - Surat Keterangan Domisili
   - Surat Pengantar Nikah
   - Surat Keterangan Kematian
   - Opsi Lainnya (Kustom)
4. Isi kolom **Keperluan** (minimal 5 karakter).
5. **Unggah Lampiran Berkas** (maksimal 3 foto pendukung dengan format `.jpg`, `.jpeg`, atau `.png`).
   *(Sistem akan otomatis mengompres foto Anda ke format `.webp` dengan ukuran di bawah 500KB untuk menghemat kuota Anda).*
6. Klik **Kirim Pengajuan**.
   *(Kemajuan pengisian formulir Anda disimpan secara otomatis sebagai draf lokal agar tidak hilang jika Anda berpindah halaman secara tidak sengaja).*

### Pelacakan Berkas & Notifikasi
1. Masuk ke menu **Lacak Berkas** (`/cuss/lacak`).
2. Anda dapat melihat daftar surat yang pernah Anda ajukan beserta linimasa statusnya yang diperbarui secara langsung (*Real-time*):
   - 📥 **Masuk**: Menunggu verifikasi berkas oleh admin.
   - ⚙️ **Diproses**: Berkas sedang ditinjau, draf surat sedang disiapkan atau disetujui Kepala Desa.
   - 📄 **Selesai**: Dokumen surat siap diunduh secara digital atau diambil langsung di Balai Desa.
   - ❌ **Ditolak**: Pengajuan ditolak dengan alasan/catatan perbaikan dari admin.
3. Anda akan menerima notifikasi *pop-up* (toast) langsung di layar ketika admin mengubah status surat Anda.

### Asisten AI (CUSS Assistant)
- Di pojok kanan bawah, terdapat widget **CUSS Assistant** (didukung oleh Google Gemini 2.5 Flash).
- Warga dapat melakukan chat interaktif untuk menanyakan persyaratan surat, alur pelayanan, atau panduan pengisian data.
- Asisten AI memahami profil Anda dan surat yang sedang Anda lacak sehingga jawaban yang diberikan akan sangat personal dan kontekstual.

---

## 👨‍💼 2. Panduan untuk Perangkat Desa (Admin)

Admin (Perangkat Desa) bertugas untuk memvalidasi berkas, menerbitkan surat resmi, dan mengelola data warga.

### Akses & Login Admin
1. Buka halaman login CUSS.
2. Gunakan kredensial admin Anda untuk masuk.
   *(Contoh Akun Demo Admin: Username: `kepaladesa` | Email: `admin_kepaladesa@cuss.internal` | Sandi: `admin123`)*

### Dashboard & Statistik
- Halaman pertama setelah login menampilkan ringkasan data statistik pelayanan desa.
- Menampilkan jumlah total pengajuan masuk, pengajuan diproses, surat selesai, dan surat ditolak secara grafis.

### Pengelolaan Pengajuan
1. Masuk ke menu **Kelola Pengajuan** (`/adm/pengajuan`).
2. Pilih salah satu pengajuan warga untuk meninjau detailnya:
   - **Verifikasi Data**: Bandingkan informasi pemohon dengan data kependudukan.
   - **Tinjau Dokumen Pendukung**: Lihat lampiran berkas yang diunggah warga.
   - **Lokasi Geospasial**: Periksa lokasi rumah warga pada peta terintegrasi untuk verifikasi domisili.
3. Ubah status pengajuan:
   - Pilih **Proses** untuk mengubah status menjadi *Diproses*.
   - Pilih **Selesai** untuk menerbitkan surat.
   - Pilih **Tolak** dan masukkan **catatan penolakan** jika dokumen tidak sesuai (warga akan mendapat notifikasi instan berisi catatan Anda).

### Cetak Surat Otomatis
1. Pada pengajuan yang berstatus *Diproses*, admin dapat melakukan edit draf data surat secara langsung di panel admin.
2. Sistem secara otomatis mengintegrasikan data tersebut dengan master template `.docx` yang telah diunggah.
3. Admin dapat mengunduh surat yang telah terisi otomatis atau melihat pratampilan (*preview*) dokumen sebelum dicetak.

### Master Data Warga
1. Masuk ke menu **Master Warga** (`/adm/warga`).
2. Admin dapat mengelola status kependudukan digital warga desa:
   - **Tambah Warga**: Mendaftarkan warga baru dengan mengisi NIK, Nama, dan email.
   - **Status Aktif/Nonaktif**: Admin dapat menonaktifkan akun warga tertentu. Jika dinonaktifkan, sesi login warga tersebut akan otomatis terputus (*force log out* secara *real-time* lewat WebSocket).
   - **Reset Kata Sandi**: Mengatur ulang kata sandi warga dan mengirim kredensial login baru langsung ke nomor WhatsApp warga yang bersangkutan.

### Pengaturan Sistem & Opsi Lanjutan
Menu **Opsi Lanjutan** (`/adm/pengaturan`) menyediakan kendali penuh atas sistem CUSS:
1. **Jenis Layanan**: Menambah, mengubah, atau menghapus daftar layanan surat yang dapat diajukan warga.
2. **Jam Operasional**: Mengatur jam kerja dan libur kantor desa. Pengajuan di luar jam operasional akan tetap diterima sistem namun ditandai untuk diverifikasi pada hari kerja berikutnya.
3. **Master Template**: Mengunggah file template dokumen `.docx` untuk kebutuhan pengisian otomatis.
4. **Pembersihan Penyimpanan**: Menghapus file lampiran lama dari Supabase Storage untuk menghemat kapasitas ruang penyimpanan hosting.
