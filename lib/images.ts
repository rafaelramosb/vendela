'use client';
import { supabaseBrowser } from './supabase/client';

const BUCKET = 'store-media';

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No pudimos leer esa imagen. Prueba con otra foto.'));
    };
    img.src = url;
  });
}

/** Reduce la foto en el celular antes de subirla: máximo `max` px por lado, WebP o JPEG. */
export async function compressImage(file: File, max = 1400, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen');
  const img = await loadImage(file);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
  if (!blob) throw new Error('No pudimos procesar la imagen');
  return blob;
}

export async function uploadImage(businessId: string, file: File, max = 1400): Promise<string> {
  const blob = await compressImage(file, max);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const sb = supabaseBrowser();
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Borra el archivo si la URL es de nuestro bucket. No falla si no puede. */
export async function removeImage(url?: string | null) {
  if (!url) return;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  await supabaseBrowser().storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]).catch(() => {});
}
