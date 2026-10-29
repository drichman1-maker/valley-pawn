import { describe, expect, it } from 'vitest';
import { checkPhotoFile } from '../../src/lib/photos/preparePhoto.js';

const f = (type, size, name = 'p') => ({ type, size, name });

describe('photo file checks', () => {
  it('accepts JPEG, PNG and WebP under 15 MB', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp']) expect(checkPhotoFile(f(t, 1000))).toBeNull();
  });
  it('rejects other types, empty files and oversized files', () => {
    expect(checkPhotoFile(f('image/gif', 1000))).toMatch(/JPEG, PNG or WebP/);
    expect(checkPhotoFile(f('application/pdf', 1000))).toMatch(/JPEG, PNG or WebP/);
    expect(checkPhotoFile(f('image/jpeg', 0))).toMatch(/empty/);
    expect(checkPhotoFile(f('image/jpeg', 16 * 1024 * 1024))).toMatch(/under 15 MB/);
  });
});
