import { headerKey } from './headers.js';

export const SCHEMA_FIELDS = [
  { key: 'item_id', label: 'Item number', required: true, hint: 'Your tag or SKU. Kept as text, e.g. 00491.' },
  { key: 'title', label: 'Title', required: true, hint: 'Public listing name.' },
  { key: 'category', label: 'Category', required: true, hint: 'Tools, Jewelry, Electronics…' },
  { key: 'price', label: 'Price', required: true, hint: 'Like 129.99. $ and thousands commas allowed.' },
  { key: 'status', label: 'Status', required: false, hint: 'available, sold, draft or archived.' },
  { key: 'condition', label: 'Condition', required: false, hint: 'Brand New, Like New, Excellent, Good, Fair, For Parts.' },
  { key: 'description', label: 'Description', required: false, hint: 'Details shown on the item page.' },
  { key: 'brand', label: 'Brand', required: false, hint: '' },
  { key: 'model', label: 'Model', required: false, hint: '' },
  { key: 'accessories', label: 'Accessories', required: false, hint: 'What comes with it.' },
  { key: 'featured', label: 'Featured', required: false, hint: 'TRUE/FALSE, yes/no or 1/0.' },
  { key: 'date_added', label: 'Date added', required: false, hint: 'YYYY-MM-DD. Leave unmapped to keep existing dates.' },
  { key: 'photo_urls', label: 'Photo links', required: false, hint: 'https:// links separated by |. Uploaded photos are never affected.' },
];

// Exact (normalized) heading matches only. No substring matching, which would map
// e.g. "acquisition price" to the public price.
const SYNONYMS = {
  item_id: ['item_id', 'item id', 'item #', 'item number', 'item no', 'id', 'sku', 'tag', 'tag #', 'tag number', 'stock #', 'stock number'],
  title: ['title', 'item name', 'name', 'listing title', 'product name'],
  category: ['category', 'department', 'dept'],
  price: ['price', 'retail price', 'sale price', 'asking price', 'price ($)', 'list price'],
  status: ['status', 'listing status'],
  condition: ['condition'],
  description: ['description', 'details', 'notes for listing'],
  brand: ['brand', 'manufacturer', 'make', 'mfr'],
  model: ['model', 'model number', 'model #', 'model no'],
  accessories: ['accessories', 'included accessories', 'includes'],
  featured: ['featured', 'feature'],
  date_added: ['date_added', 'date added', 'added', 'date listed'],
  photo_urls: ['photo_urls', 'photo urls', 'photos', 'photo links', 'image urls', 'images'],
};

const norm = (s) => headerKey(s).replace(/_/g, ' ');

export function autoMap(headers) {
  const mapping = {};
  const used = new Set();
  for (const field of SCHEMA_FIELDS) {
    const options = SYNONYMS[field.key].map(norm);
    const match = headers.find((h) => options.includes(norm(h.name)) && !used.has(h.name));
    if (match) {
      mapping[field.key] = match.name;
      used.add(match.name);
    }
  }
  return mapping;
}

/**
 * Combines a remembered mapping with the current file's headers.
 * Remembered entries whose heading isn't in this file are dropped and reported.
 */
export function reconcileMapping(saved, headers) {
  const names = new Set(headers.map((h) => h.name));
  const mapping = {};
  const dropped = [];
  for (const [field, header] of Object.entries(saved ?? {})) {
    if (!SCHEMA_FIELDS.some((f) => f.key === field) || !header) continue;
    if (names.has(header)) mapping[field] = header;
    else dropped.push({ field, header });
  }
  const used = new Set(Object.values(mapping));
  for (const [field, header] of Object.entries(autoMap(headers))) {
    if (!mapping[field] && !used.has(header) && !dropped.some((d) => d.field === field)) {
      mapping[field] = header;
      used.add(header);
    }
  }
  return { mapping, dropped };
}

export function validateMapping(mapping, headers) {
  const errors = [];
  const names = new Set(headers.map((h) => h.name));
  for (const f of SCHEMA_FIELDS) {
    if (f.required && !mapping[f.key]) errors.push(`Choose a column for ${f.label}.`);
    if (mapping[f.key] && !names.has(mapping[f.key])) errors.push(`${f.label} is mapped to "${mapping[f.key]}", which isn't in this file.`);
  }
  const byHeader = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (!header) continue;
    (byHeader[header] ??= []).push(SCHEMA_FIELDS.find((f) => f.key === field)?.label ?? field);
  }
  for (const [header, fields] of Object.entries(byHeader)) {
    if (fields.length > 1) errors.push(`Column "${header}" is mapped to more than one field (${fields.join(', ')}).`);
  }
  return errors;
}
