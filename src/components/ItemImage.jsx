import { useState } from 'react';
import { CategoryArt } from './CategoryArt.jsx';

/** Product image with category artwork for missing or broken photos. */
export function ItemImage({ photo, alt, category, variant = 'thumb', eager = false, className = '' }) {
  const [broken, setBroken] = useState(false);
  const src = photo && (variant === 'thumb' ? photo.thumb_url ?? photo.url : photo.url);
  if (!src || broken) {
    return <CategoryArt category={category} label={broken ? 'Photo unavailable' : 'No photo yet'} size={variant === 'full' ? 'lg' : 'md'} className={className} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      width={photo.width ?? undefined}
      height={photo.height ?? undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setBroken(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
