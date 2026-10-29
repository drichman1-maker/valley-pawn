// Validates and resizes photos in the browser before upload: a ~1600px main image and a
// ~480px thumbnail, both JPEG (encodable in every browser, including Safari).
export const PHOTO_RULES = {
  types: ['image/jpeg', 'image/png', 'image/webp'],
  maxInputBytes: 15 * 1024 * 1024,
  maxEdge: 1600,
  thumbEdge: 480,
  quality: 0.85,
};

export function checkPhotoFile(file) {
  if (!PHOTO_RULES.types.includes(file.type)) {
    return `${file.name}: use a JPEG, PNG or WebP photo. (iPhone photos are converted to JPEG automatically when picked from the photo library.)`;
  }
  if (file.size > PHOTO_RULES.maxInputBytes) return `${file.name}: photos must be under 15 MB.`;
  if (file.size === 0) return `${file.name}: this file is empty.`;
  return null;
}

async function encode(bitmap, edge) {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // flatten transparent PNGs
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_RULES.quality));
  if (!blob || blob.type !== 'image/jpeg') throw new Error('This browser could not process the photo.');
  return { blob, width: w, height: h };
}

export async function preparePhoto(file) {
  const error = checkPhotoFile(file);
  if (error) throw new Error(error);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`${file.name}: this image could not be read. Try exporting it as JPEG.`);
  }
  try {
    const full = await encode(bitmap, PHOTO_RULES.maxEdge);
    const thumb = await encode(bitmap, PHOTO_RULES.thumbEdge);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    bitmap.close?.();
  }
}
