'use client';
import { useRef, useState } from 'react';
import { uploadImage, removeImage } from '@/lib/images';
import { useToast } from './Toast';

export function PhotoPicker({ businessId, value, onChange, max = 6 }: { businessId: string; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, max - value.length);
    if (!list.length) return toast(`Máximo ${max} fotos por producto`, 'error');
    setBusy(list.length);
    const urls: string[] = [];
    for (const f of list) {
      try {
        urls.push(await uploadImage(businessId, f));
      } catch (e: any) {
        toast(e.message, 'error');
      }
      setBusy((b) => b - 1);
    }
    onChange([...value, ...urls]);
    if (input.current) input.current.value = '';
  }
  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
    removeImage(url);
  }
  function makeMain(url: string) {
    onChange([url, ...value.filter((u) => u !== url)]);
  }

  return (
    <div className="field">
      <span>Fotos</span>
      <div className="photos">
        {value.map((u, i) => (
          <div className="photo" key={u}>
            <img src={u} alt={`Foto ${i + 1}`} />
            {i === 0 ? <span className="photo-tag">Principal</span> : <button type="button" className="photo-main" onClick={() => makeMain(u)}>Hacer principal</button>}
            <button type="button" className="photo-x" aria-label="Quitar foto" onClick={() => remove(u)}>✕</button>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => <div className="photo skeleton" key={`b${i}`} />)}
        {value.length + busy < max && (
          <button type="button" className="photo add" onClick={() => input.current?.click()}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>Agregar</span>
          </button>
        )}
      </div>
      <small>La primera foto es la que se ve en tu tienda. Usa fotos verticales con buena luz.</small>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
