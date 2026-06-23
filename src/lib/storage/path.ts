// Helper untuk membangun path file di storage
// Format: {tahun}/{bulan}/{pengajuanId}/{idx}_{originalName}

export function buildFilePath(
  pengajuanId: string,
  originalName: string,
  index: number = 0,
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${year}/${month}/${pengajuanId}/${index}_${sanitizedName}`;
}
