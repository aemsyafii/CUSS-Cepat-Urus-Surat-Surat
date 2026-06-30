import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildFilePath } from './path';

describe('buildFilePath', () => {
  beforeEach(() => {
    // Lock system time to June 15, 2026 (Note: month 5 is June in 0-indexed JS Date)
    vi.useFakeTimers();
    const date = new Date(2026, 5, 15);
    vi.setSystemTime(date);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format file path correctly with default index', () => {
    const path = buildFilePath('pengajuan-123', 'document.pdf');
    expect(path).toBe('2026/06/pengajuan-123/0_document.pdf');
  });

  it('should use the provided index', () => {
    const path = buildFilePath('pengajuan-123', 'photo.jpg', 2);
    expect(path).toBe('2026/06/pengajuan-123/2_photo.jpg');
  });

  it('should sanitize the original filename by replacing special characters with underscores', () => {
    const path = buildFilePath('pengajuan-abc', 'surat pengantar (final) #1.pdf');
    expect(path).toBe('2026/06/pengajuan-abc/0_surat_pengantar__final___1.pdf');
  });

  it('should handle alphanumeric and basic allowed punctuation without modification', () => {
    const path = buildFilePath('pengajuan-xyz', 'my-file_v1.2.png', 1);
    expect(path).toBe('2026/06/pengajuan-xyz/1_my-file_v1.2.png');
  });
});
