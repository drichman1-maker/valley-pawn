import { useState } from 'react';
import { CategoryArt, ItemArt } from './CategoryArt.jsx';
import { SHOP } from '../config/shop.js';

/** Product image with item (or category) artwork for missing or broken photos. */
export function ItemImage({ photo, alt, item, category = item?.category, variant = 'thumb', eager = false, className = '' }) {
  const [broken, setBroken] = useState(false);
  const src = photo && (variant === 'thumb' ? photo.thumb_url ?? photo.url : photo.url);
  if (!src || broken) {
    const label = broken ? 'Photo unavailable' : 'No photo yet';
    const size = variant === 'full' ? 'lg' : 'md';
    return item ? <ItemArt item={item} brandName={SHOP.name} label={label} size={size} className={className} /> : <CategoryArt category={category} label={label} size={size} className={className} />;
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
