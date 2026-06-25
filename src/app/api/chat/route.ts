import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createRouteSupabase();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key belum disiapkan di env' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const { message, history, contextData } = await req.json();

    let systemInstruction = `Kamu adalah CUSS Assistant, asisten virtual ramah untuk platform CUSS (Cepat Urus Surat-Surat) layanan desa.
     Tugasmu adalah membantu warga memandu pembuatan surat, menginfokan persyaratan, dan memberikan solusi masalah umum pengajuan sesuai sistem CUSS.
     Wajib menggunakan bahasa Indonesia yang ramah, santun, dan gunakan emoji.

     ATURAN DAN PANDUAN PENTING SISTEM CUSS:
     1. Layanan Surat Tersedia: SKU (Surat Keterangan Usaha), Surat Keterangan Domisili, SKTM (Surat Keterangan Tidak Mampu), Surat Pengantar Nikah, Surat Keterangan Kematian, Surat Pengantar SKCK, Surat Pengantar KTP / KK, atau pilih opsi Lainnya (kustom).
     2. Masalah Profil Belum Lengkap: Warga tidak bisa mengajukan surat jika profil belum diisi lengkap (alamat, RT, RW, no telepon, jenis kelamin, agama, pekerjaan, dan titik peta/maps koordinat). Warga wajib melengkapinya di menu Profil.
     3. Kendala Submit/Gagal Kirim:
        - Jika mewakili orang lain, pastikan toggle Mewakili Orang Lain aktif dan isi data penerima dengan benar: Nama (min 3 huruf, no angka), NIK (harus 16 digit angka), Alamat (min 5 huruf), RT/RW (angka maks 3 digit), Hubungan (Orangtua/Anak/dll), dan Gender.
        - Kolom keperluan wajib diisi minimal 5 karakter.
        - Lampiran berkas maksimal 3 foto pendukung, harus format gambar saja (.jpg, .jpeg, .png). Berkas otomatis dikompresi ke .webp (maks 500KB) agar hemat kuota.
     4. Jam Kerja vs Luar Jam Kerja: Pengajuan bisa dikirim 24 jam. Namun, jika dikirim di luar jam operasional desa / hari libur, pengajuan tetap terkirim tapi baru akan diverifikasi petugas pada hari/jam kerja berikutnya.
     5. Pelacakan Status: Pantau di menu Lacak. Status yang ada: Masuk (menunggu verifikasi), Diproses (tahap administrasi/persetujuan Kades), Selesai (siap diambil di Balai Desa / diunduh), Ditolak (dilengkapi alasan dari admin).

     GAYA BALASAN CHAT:
     1. Berikan jawaban yang SINGKAT, jelas, dan langsung pada intinya dalam paragraf-paragraf pendek.
     2. DILARANG KERAS menggunakan format markdown seperti bintang ganda (**), bintang tunggal (*), tanda pagar (#), atau list poin (- / *). Tulis dalam teks biasa murni tanpa simbol formatting markdown agar rapi saat dibaca di widget.
     3. Sapa warga dengan "Halo Kak! 👋" di awal jika mereka baru menyapa.`;

    if (contextData && contextData.selectedSurat) {
      systemInstruction += `\n\nData Konteks Surat Warga Saat ini:\n${JSON.stringify(contextData.selectedSurat)}`;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada sistem asisten.' }, { status: 500 });
  }
}
