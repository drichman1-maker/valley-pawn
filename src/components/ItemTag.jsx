export function ItemTag({ id, className = '' }) {
  return (
    <span className={`item-tag ${className}`}>
      <span className="sr-only">Item number </span>
      {id}
    </span>
  );
}
