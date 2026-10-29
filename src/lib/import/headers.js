import { IMPORT_LIMITS } from './readSpreadsheet.js';
import { textOf } from '../inventory/normalize.js';

export function columnLetter(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const headerKey = (h) => String(h).trim().replace(/\s+/g, ' ').toLowerCase();

/** Rows (within the first 15) that could be the header row: at least two non-blank text cells. */
export function headerRowCandidates(sheet) {
  return sheet.rows
    .slice(0, 15)
    .filter((r) => r.cells.filter((c) => textOf(c) !== '').length >= 2)
    .map((r) => r.rowNumber);
}

export function guessHeaderRow(sheet) {
  return headerRowCandidates(sheet)[0] ?? sheet.rows[0]?.rowNumber ?? null;
}

/**
 * Reads headers from the chosen row and validates them.
 * Blank headers on columns that contain data, and duplicate headers, are errors the owner must fix.
 */
export function readHeaders(sheet, headerRowNumber) {
  const errors = [];
  const headerRow = sheet.rows.find((r) => r.rowNumber === headerRowNumber);
  if (!headerRow) return { headers: [], dataRows: [], errors: ['Choose the row that contains your column headings.'] };
  const dataRows = sheet.rows.filter((r) => r.rowNumber > headerRowNumber && r.cells.some((c) => textOf(c) !== ''));

  const headers = [];
  const seen = new Map();
  headerRow.cells.forEach((cell, index) => {
    const name = textOf(cell);
    const letter = columnLetter(index);
    if (!name) {
      const hasData = dataRows.some((r) => textOf(r.cells[index]) !== '');
      if (hasData) errors.push(`Column ${letter} has values but no heading. Add a heading in row ${headerRowNumber} or delete the column.`);
      return;
    }
    const key = headerKey(name);
    if (seen.has(key)) {
      errors.push(`Columns ${seen.get(key)} and ${letter} both have the heading "${name}". Rename one of them in your file before mapping.`);
      return;
    }
    seen.set(key, letter);
    headers.push({ index, name, letter });
  });

  if (!headers.length) errors.push(`Row ${headerRowNumber} has no column headings.`);
  if (!dataRows.length) errors.push('There are no item rows below the heading row.');
  if (dataRows.length > IMPORT_LIMITS.maxRows) {
    errors.push(`This sheet has ${dataRows.length} item rows. The limit is ${IMPORT_LIMITS.maxRows} per import; split the file.`);
  }
  if (sheet.truncatedColumns) errors.push(`Only the first ${IMPORT_LIMITS.maxColumns} columns are read. Remove unused columns.`);
  return { headers, dataRows, errors };
}
