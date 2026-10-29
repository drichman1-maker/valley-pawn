// Strict value parsers shared by the importer and the demo backend.
// Each returns { ok: true, value, warning? } | { ok: false, error } | { ok: true, blank: true }.
import { CONDITION_SYNONYMS, MAX_PRICE, MAX_PHOTOS_PER_ITEM, STATUSES, TEXT_LIMITS } from './constants.js';

const ok = (value, warning) => (warning ? { ok: true, value, warning } : { ok: true, value });
const fail = (error) => ({ ok: false, error });
const BLANK = Object.freeze({ ok: true, blank: true });

/**
 * Cell shape produced by the parsers:
 * { text: string, raw?: any, kind: 'string'|'number'|'date'|'boolean'|'empty'|'error', leadingZeroFormat?: boolean }
 */
export const textOf = (cell) => (cell?.text ?? '').trim();
export const isBlankCell = (cell) => !cell || cell.kind === 'empty' || textOf(cell) === '';

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function parseItemId(cell) {
  if (isBlankCell(cell)) return BLANK;
  if (cell.kind === 'error') return fail(`Item number cell contains an Excel error (${textOf(cell)}).`);
  let warning;
  if (cell.kind === 'number') {
    if (!Number.isInteger(cell.raw)) return fail(`Item number ${textOf(cell)} is a decimal number. Item numbers must be text.`);
    warning = cell.leadingZeroFormat
      ? `Item number ${textOf(cell)} is a number in Excel that is only displayed with leading zeros by cell formatting. The displayed value was used. Format this column as Text in Excel to remove the ambiguity.`
      : `Item number ${textOf(cell)} is stored as a number in Excel. If the tag had leading zeros, they were already lost in the spreadsheet and cannot be recovered here. Format this column as Text.`;
  }
  const id = textOf(cell);
  if (id.length > TEXT_LIMITS.item_id) return fail(`Item number is longer than ${TEXT_LIMITS.item_id} characters.`);
  if (!ID_RE.test(id)) {
    return fail(`Item number "${id}" may only contain letters, digits, dots, dashes and underscores, and must start with a letter or digit.`);
  }
  return ok(id, warning);
}

const PRICE_RE = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

export function parsePrice(cell) {
  if (isBlankCell(cell)) return BLANK;
  if (cell.kind === 'error') return fail(`Price cell contains an Excel error (${textOf(cell)}).`);
  if (cell.kind === 'number') {
    const n = cell.raw;
    if (typeof n !== 'number' || !Number.isFinite(n)) return fail(`Price ${textOf(cell)} is not a finite number.`);
    if (n < 0) return fail(`Price ${n} is negative. Prices must be zero or more.`);
    const cents = n * 100;
    if (Math.abs(cents - Math.round(cents)) > 1e-6) return fail(`Price ${n} has more than two decimal places.`);
    if (n > MAX_PRICE) return fail(`Price ${n} is above the maximum of ${MAX_PRICE}.`);
    return ok(Math.round(cents) / 100);
  }
  const t = textOf(cell);
  if (/^\$?\s*-/.test(t) || /^\(.*\)$/.test(t)) return fail(`Price "${t}" is negative. Prices must be zero or more.`);
  const m = PRICE_RE.exec(t);
  if (!m) {
    return fail(`Price "${t}" is not a valid amount. Use a number like 129.99 (a leading $ and thousands commas are allowed).`);
  }
  const value = Number(`${m[1].replace(/,/g, '')}.${m[2] ?? '0'}`);
  if (!Number.isFinite(value)) return fail(`Price "${t}" is not a finite number.`);
  if (value > MAX_PRICE) return fail(`Price "${t}" is above the maximum of ${MAX_PRICE}.`);
  return ok(Math.round(value * 100) / 100);
}

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 't']);
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', 'f']);

export function parseBoolean(cell) {
  if (isBlankCell(cell)) return BLANK;
  if (cell.kind === 'boolean') return ok(Boolean(cell.raw));
  const t = textOf(cell).toLowerCase();
  if (TRUE_WORDS.has(t)) return ok(true);
  if (FALSE_WORDS.has(t)) return ok(false);
  return fail(`"${textOf(cell)}" is not a recognized yes/no value. Use TRUE/FALSE, yes/no, or 1/0.`);
}

export function parseStatus(cell) {
  if (isBlankCell(cell)) return BLANK;
  const t = textOf(cell).toLowerCase();
  if (STATUSES.includes(t)) return ok(t);
  return fail(`Unknown status "${textOf(cell)}". Allowed: ${STATUSES.join(', ')}.`);
}

export function parseCondition(cell) {
  if (isBlankCell(cell)) return BLANK;
  const key = textOf(cell).toLowerCase().replace(/\s+/g, ' ');
  const canonical = CONDITION_SYNONYMS[key];
  if (canonical) return ok(canonical);
  return fail(`Unknown condition "${textOf(cell)}". Allowed: Brand New, Like New, Excellent, Good, Fair, For Parts.`);
}

export function isValidIsoDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 1900 && y <= 2200;
}

export function parseDate(cell) {
  if (isBlankCell(cell)) return BLANK;
  if (cell.kind === 'date' && cell.raw instanceof Date && !Number.isNaN(cell.raw.getTime())) {
    const iso = cell.raw.toISOString().slice(0, 10);
    return isValidIsoDate(iso) ? ok(iso) : fail(`Date ${iso} is out of range.`);
  }
  const t = textOf(cell);
  if (isValidIsoDate(t)) return ok(t);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (us) {
    const iso = `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
    if (isValidIsoDate(iso)) return ok(iso);
  }
  return fail(`"${t}" is not a valid date. Use YYYY-MM-DD (for example 2026-10-15) or M/D/YYYY.`);
}

export function parseText(cell, field) {
  if (isBlankCell(cell)) return BLANK;
  if (cell.kind === 'error') return fail(`Cell contains an Excel error (${textOf(cell)}).`);
  const multiline = field === 'description' || field === 'accessories';
  const value = multiline ? textOf(cell).replace(/\r\n?/g, '\n') : textOf(cell).replace(/\s+/g, ' ');
  const limit = TEXT_LIMITS[field];
  if (limit && value.length > limit) return fail(`Text is longer than ${limit} characters.`);
  return ok(value);
}

/** Category labels: collapse whitespace, reuse an existing label case-insensitively, else Title Case. */
export function categoryKey(label) {
  return String(label).trim().replace(/\s+/g, ' ').toLowerCase();
}

export function titleCase(s) {
  return s.replace(/\S+/g, (w) =>
    w === w.toUpperCase() && w.length <= 4 && /[A-Z]/.test(w) ? w : w[0].toUpperCase() + w.slice(1).toLowerCase(),
  );
}

export function parseCategory(cell, knownLabels = []) {
  const r = parseText(cell, 'category');
  if (!r.ok || r.blank) return r;
  const key = categoryKey(r.value);
  const known = knownLabels.find((l) => categoryKey(l) === key);
  return ok(known ?? titleCase(r.value));
}

export function parseHttpsUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && u.hostname ? u.href : null;
  } catch {
    return null;
  }
}

export function parsePhotoUrls(cell) {
  if (isBlankCell(cell)) return BLANK;
  const parts = textOf(cell)
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = parts.filter((p) => !parseHttpsUrl(p));
  if (bad.length) return fail(`Photo links must be full https:// addresses. Not accepted: ${bad.slice(0, 3).join(', ')}`);
  const unique = [...new Set(parts.map(parseHttpsUrl))];
  if (unique.length > MAX_PHOTOS_PER_ITEM) return fail(`At most ${MAX_PHOTOS_PER_ITEM} photo links per item.`);
  return ok(unique);
}

export const priceCents = (p) => Math.round(Number(p) * 100);
