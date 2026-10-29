import {
  parseBoolean,
  parseCategory,
  parseCondition,
  parseDate,
  parseItemId,
  parsePhotoUrls,
  parsePrice,
  parseStatus,
  parseText,
  textOf,
} from '../inventory/normalize.js';
import { FIELD_LABELS } from '../inventory/constants.js';

const REQUIRED = ['item_id', 'title', 'category', 'price'];

function parseField(field, cell, knownCategories) {
  switch (field) {
    case 'item_id':
      return parseItemId(cell);
    case 'price':
      return parsePrice(cell);
    case 'status':
      return parseStatus(cell);
    case 'condition':
      return parseCondition(cell);
    case 'featured':
      return parseBoolean(cell);
    case 'date_added':
      return parseDate(cell);
    case 'photo_urls':
      return parsePhotoUrls(cell);
    case 'category':
      return parseCategory(cell, knownCategories);
    default:
      return parseText(cell, field);
  }
}

/**
 * Validates every data row against the mapping.
 * Returns rows: { rowNumber, itemId, fields: { [field]: { blank: true } | { value } }, errors, warnings, valid }
 * Fields whose column is unmapped are absent from `fields` (meaning "not provided").
 */
export function validateRows({ dataRows, headers, mapping, existingItems = [], knownCategories = [] }) {
  const indexByHeader = new Map(headers.map((h) => [h.name, h.index]));
  const existingIds = new Set(existingItems.map((i) => i.item_id));
  const existingByLower = new Map(existingItems.map((i) => [i.item_id.toLowerCase(), i.item_id]));

  const rows = dataRows.map((row) => {
    const fields = {};
    const errors = [];
    const warnings = [];
    for (const [field, header] of Object.entries(mapping)) {
      if (!header) continue;
      const cell = row.cells[indexByHeader.get(header)];
      const r = parseField(field, cell, knownCategories);
      if (!r.ok) {
        errors.push(`${FIELD_LABELS[field]}: ${r.error}`);
        continue;
      }
      if (r.warning) warnings.push(r.warning);
      fields[field] = r.blank ? { blank: true } : { value: r.value };
      if (r.blank && REQUIRED.includes(field)) errors.push(`${FIELD_LABELS[field]} is required.`);
    }
    const rawIdCell = row.cells[indexByHeader.get(mapping.item_id)];
    const itemId = fields.item_id?.value ?? (textOf(rawIdCell) || null);
    if (fields.item_id?.value && !existingIds.has(itemId)) {
      const other = existingByLower.get(itemId.toLowerCase());
      if (other) errors.push(`Item number "${itemId}" differs only in letter case from existing item "${other}". Use the exact existing number.`);
    }
    return { rowNumber: row.rowNumber, itemId, fields, errors, warnings };
  });

  // Duplicate IDs: flag EVERY row sharing an ID (case-insensitive), including rows that are
  // already invalid for other reasons, so no single copy is silently accepted.
  const groups = new Map();
  for (const r of rows) {
    if (!r.itemId) continue;
    const key = r.itemId.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const list = group.map((r) => r.rowNumber).join(', ');
    for (const r of group) r.errors.unshift(`Item number "${r.itemId}" appears on rows ${list}. Each item number may appear only once.`);
  }

  for (const r of rows) r.valid = r.errors.length === 0;
  return rows;
}
