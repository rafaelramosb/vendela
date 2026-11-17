import { Thumb } from '@/components/Thumb';

/** Foto del producto o, si aún no tiene, una silueta con el color de la prenda. */
export function ProductImage({ src, category, color, alt, priority }: { src?: string | null; category: string; color?: string; alt: string; priority?: boolean }) {
  if (src) return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" />;
  return (
    <div className="st-ph" role="img" aria-label={alt}>
      <Thumb category={category} color={color} size={120} />
    </div>
  );
}
