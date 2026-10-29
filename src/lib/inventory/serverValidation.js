// Validation applied by the trusted side of a publish (the demo backend in JS; the Supabase
// publish_import() function re-implements the same rules in SQL). Never trust the client plan.
import { CONDITIONS, MAX_PHOTOS_PER_ITEM, MAX_PRICE, STATUSES, TEXT_LIMITS } from './constants.js';
import { isValidIsoDate, parseHttpsUrl } from './normalize.js';

const REQUIRED_ON_CREATE = ['title', 'category', 'price', 'status'];

export function validateItemFields(itemId, fields, isNew) {
  const errors = [];
  if (typeof itemId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(itemId)) errors.push('invalid item number');
  if (isNew) for (const f of REQUIRED_ON_CREATE) if (!(f in fields)) errors.push(`${f} is required for new items`);
  for (const [f, v] of Object.entries(fields)) {
    switch (f) {
      case 'title':
      case 'category':
        if (typeof v !== 'string' || !v.trim() || v.length > TEXT_LIMITS[f]) errors.push(`invalid ${f}`);
        break;
      case 'brand':
      case 'model':
      case 'description':
      case 'accessories':
        if (typeof v !== 'string' || v.length > TEXT_LIMITS[f]) errors.push(`invalid ${f}`);
        break;
      case 'price':
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > MAX_PRICE || Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) {
          errors.push('invalid price');
        }
        break;
      case 'status':
        if (!STATUSES.includes(v)) errors.push('invalid status');
        break;
      case 'condition':
        if (v !== '' && !CONDITIONS.includes(v)) errors.push('invalid condition');
        break;
      case 'featured':
        if (typeof v !== 'boolean') errors.push('invalid featured');
        break;
      case 'date_added':
        if (typeof v !== 'string' || !isValidIsoDate(v)) errors.push('invalid date_added');
        break;
      default:
        errors.push(`unknown field ${f}`);
    }
  }
  return errors;
}

export function validateUrlPhotos(urls) {
  if (urls === null || urls === undefined) return [];
  if (!Array.isArray(urls) || urls.length > MAX_PHOTOS_PER_ITEM) return ['invalid photo list'];
  return urls.filter((u) => typeof u !== 'string' || parseHttpsUrl(u) !== u).map((u) => `invalid photo link ${u}`);
}
