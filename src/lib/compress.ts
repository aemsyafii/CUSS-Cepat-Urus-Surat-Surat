/**
 * compress.ts — Utilitas kompresi file sebelum upload ke Supabase Storage
 *
 * - Image files  → WebP via canvas (kualitas 0.92, hampir tanpa perbedaan visual)
 * - HTML / text  → kompres gambar base64 ke WebP dulu, lalu gzip (lossless)
 *                  Hasilnya bisa turun dari 3MB → ~700KB
 */

// ─────────────────────────────────────────────────────────────
// IMAGE: compress ke WebP menggunakan canvas
// ─────────────────────────────────────────────────────────────

/** Tipe MIME yang dianggap sebagai gambar yang bisa di-compress */
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];

/**
 * Compress sebuah File gambar ke format WebP.
 * Resolusi asli dipertahankan (maksimal 2000px di sisi terpanjang).
 * Kualitas default 0.92 — hampir identik secara visual, ~40-60% lebih kecil dari PNG/JPEG.
 */
export async function compressImageFile(file: File, quality = 0.92): Promise<Blob> {
  if (!IMAGE_TYPES.includes(file.type)) {
    // Bukan gambar — kembalikan apa adanya
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX = 2000;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context tidak tersedia'));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Gagal mengkonversi canvas ke Blob'));
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: kembalikan file asli jika gagal load sebagai gambar
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Compress base64 image data URL ke WebP base64.
 * Digunakan untuk foto profil yang tersimpan sebagai data URL.
 */
export async function compressBase64Image(dataUrl: string, quality = 0.92): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────────────────────
// GZIP: compress/decompress menggunakan CompressionStream API
// ─────────────────────────────────────────────────────────────

/**
 * Compress Blob apapun dengan gzip (lossless).
 * Hasil berupa Blob dengan tipe application/gzip.
 */
export async function gzipBlob(blob: Blob): Promise<Blob> {
  if (typeof CompressionStream === 'undefined') {
    console.warn('[compress] CompressionStream tidak tersedia — file dikirim tanpa kompresi.');
    return blob;
  }

  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(stream).blob();
  return new Blob([compressed], { type: 'application/gzip' });
}

/**
 * Decompress gzip Blob kembali ke teks string.
 * Digunakan setelah download arsip surat dari storage.
 */
export async function gunzipToText(blob: Blob): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    console.warn('[compress] DecompressionStream tidak tersedia — membaca langsung.');
    return blob.text();
  }

  try {
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const decompressed = await new Response(stream).blob();
    return decompressed.text();
  } catch {
    // Fallback: mungkin file belum di-gzip (data lama)
    return blob.text();
  }
}

/**
 * Compress string HTML/teks ke gzip Blob.
 * Shorthand untuk konten teks yang langsung dikompresi.
 */
export async function gzipText(content: string): Promise<Blob> {
  const blob = new Blob([content], { type: 'text/html; charset=utf-8' });
  return gzipBlob(blob);
}

/**
 * Cek apakah sebuah File adalah gambar yang bisa dikompresi.
 */
export function isCompressibleImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}

// ─────────────────────────────────────────────────────────────
// HTML OPTIMIZER: kompres semua base64 gambar di dalam HTML
// ─────────────────────────────────────────────────────────────

/**
 * Konversi satu base64 data URL gambar ke WebP dengan kualitas tertentu.
 * Jika gagal (gambar tidak valid), kembalikan data URL asli.
 */
function compressSingleBase64Image(dataUrl: string, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/webp', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Temukan dan kompres semua embedded base64 gambar dalam HTML string ke WebP.
 * Quality 0.75 memberikan reduksi ukuran signifikan (~50-70%) dengan kualitas visual yang masih baik.
 *
 * Contoh: file HTML 3.2MB dengan embedded PNG logo → ~900KB setelah kompresi gambar.
 */
export async function compressHtmlImages(html: string, quality = 0.75): Promise<string> {
  // Cari semua data URL gambar dalam atribut src
  const imgRegex = /src="(data:image\/(png|jpeg|jpg|gif|bmp);base64,[^"]+)"/g;
  const matches: { original: string; dataUrl: string }[] = [];

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    matches.push({ original: match[0], dataUrl: match[1] });
  }

  if (matches.length === 0) return html; // Tidak ada gambar tertanam

  // Kompres semua gambar secara paralel
  const compressed = await Promise.all(
    matches.map(async ({ original, dataUrl }) => {
      const webpUrl = await compressSingleBase64Image(dataUrl, quality);
      return { original, replacement: `src="${webpUrl}"` };
    })
  );

  // Ganti satu per satu dalam HTML
  let result = html;
  for (const { original, replacement } of compressed) {
    result = result.replace(original, replacement);
  }

  return result;
}

/**
 * Pipeline lengkap untuk menyimpan HTML dokumen:
 * 1. Kompres semua embedded gambar ke WebP (50-70% lebih kecil)
 * 2. Gzip hasil HTML (60-75% lebih kecil lagi)
 *
 * File 3.2MB → biasanya turun ke 600KB–1MB.
 */
export async function gzipHtml(html: string, imageQuality = 0.75): Promise<Blob> {
  const optimizedHtml = await compressHtmlImages(html, imageQuality);
  return gzipText(optimizedHtml);
}
