// Reads .xlsx, .csv, .tsv and tab/comma-delimited .txt files into a common sheet model:
// { format, sheets: [{ name, hidden, columnCount, rows: [{ rowNumber, cells: Cell[] }] }], notes: string[] }
// rowNumber is the worksheet row number (xlsx) or the record number counting the header (csv).
import Papa from 'papaparse';

export const IMPORT_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024, // 10 MB
  maxRows: 5000, // data rows per import
  maxColumns: 60,
};

export class ImportFileError extends Error {}

const EXT_FORMATS = { xlsx: 'xlsx', csv: 'csv', tsv: 'tsv', txt: 'txt' };

export function detectFormat(fileName) {
  const ext = String(fileName).toLowerCase().split('.').pop();
  if (ext === 'xls') {
    throw new ImportFileError('Old .xls files are not supported. In Excel, choose File > Save As > Excel Workbook (.xlsx) and upload that.');
  }
  if (ext === 'numbers' || ext === 'ods') {
    throw new ImportFileError(`.${ext} files are not supported. Export the sheet as .xlsx or .csv first.`);
  }
  const f = EXT_FORMATS[ext];
  if (!f) throw new ImportFileError('Upload an Excel workbook (.xlsx) or a CSV/TSV file.');
  return f;
}

/** Reads a File/Blob as bytes; FileReader fallback for older browsers without Blob.arrayBuffer. */
export function readBytes(file) {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ImportFileError('The file could not be read. Try choosing it again.'));
    reader.readAsArrayBuffer(file);
  });
}

/** SHA-256 of the uploaded bytes, recorded with the import. Null where Web Crypto is unavailable (non-HTTPS origins). */
export async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {File | { name: string, size: number, arrayBuffer: () => Promise<ArrayBuffer> }} file */
export async function readSpreadsheet(file) {
  const format = detectFormat(file.name);
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    throw new ImportFileError(`This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${IMPORT_LIMITS.maxFileBytes / 1048576} MB.`);
  }
  if (file.size === 0) throw new ImportFileError('This file is empty.');
  const bytes = await readBytes(file);
  const fileSha256 = await sha256Hex(bytes);
  const result = format === 'xlsx' ? await parseXlsx(bytes) : parseDelimited(bytes, format);
  return { ...result, fileName: file.name, fileSize: file.size, fileSha256 };
}

// ---------------------------------------------------------------- xlsx

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function cellFromExcel(cell) {
  let v = cell.value;
  const numFmt = typeof cell.numFmt === 'string' ? cell.numFmt : '';
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('error' in v) return { kind: 'error', text: String(v.error), raw: v };
    if ('result' in v || 'formula' in v || 'sharedFormula' in v) v = v.result;
    else if (Array.isArray(v.richText)) v = v.richText.map((r) => r.text).join('');
    else if ('text' in v) v = typeof v.text === 'string' ? v.text : (v.text?.richText ?? []).map((r) => r.text).join('');
  }
  if (v && typeof v === 'object' && 'error' in v) return { kind: 'error', text: String(v.error), raw: v };
  if (v === null || v === undefined || v === '') return { kind: 'empty', text: '' };
  if (typeof v === 'string') return { kind: 'string', text: v, raw: v };
  if (typeof v === 'boolean') return { kind: 'boolean', text: v ? 'TRUE' : 'FALSE', raw: v };
  if (v instanceof Date) return { kind: 'date', text: Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10), raw: v };
  if (typeof v === 'number') {
    const firstSection = numFmt.split(';')[0];
    const zeros = /^0+$/.exec(firstSection);
    if (zeros && zeros[0].length > 1 && Number.isInteger(v) && v >= 0) {
      return { kind: 'number', text: String(v).padStart(zeros[0].length, '0'), raw: v, leadingZeroFormat: true };
    }
    return { kind: 'number', text: Number.isFinite(v) ? String(v) : '', raw: v };
  }
  return { kind: 'string', text: String(v), raw: v };
}

export async function parseXlsx(bytes) {
  const head = new Uint8Array(bytes.slice(0, 4));
  if (!ZIP_MAGIC.every((b, i) => head[i] === b)) {
    throw new ImportFileError('This file has an .xlsx name but is not an Excel workbook. Re-save it from Excel as .xlsx.');
  }
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(bytes);
  } catch (e) {
    throw new ImportFileError(`Excel could not be read: ${e.message}. If the workbook is password-protected, remove the password and try again.`);
  }
  const sheets = [];
  wb.eachSheet((ws) => {
    const columnCount = Math.min(ws.columnCount, IMPORT_LIMITS.maxColumns);
    const rows = [];
    let tooManyRows = false;
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rows.length > IMPORT_LIMITS.maxRows + 20) {
        tooManyRows = true;
        return;
      }
      const cells = [];
      for (let c = 1; c <= columnCount; c++) cells.push(cellFromExcel(row.getCell(c)));
      rows.push({ rowNumber, cells });
    });
    sheets.push({
      name: ws.name,
      hidden: ws.state && ws.state !== 'visible',
      columnCount,
      truncatedColumns: ws.columnCount > IMPORT_LIMITS.maxColumns,
      tooManyRows,
      rows,
    });
  });
  if (!sheets.length) throw new ImportFileError('This workbook has no worksheets.');
  return { format: 'xlsx', sheets, notes: [] };
}

// ---------------------------------------------------------------- csv / tsv / txt

export function decodeText(bytes) {
  let text = new TextDecoder('utf-8').decode(bytes);
  let note;
  if (text.includes('\uFFFD')) {
    // Older Excel "CSV" exports are Windows-1252, not UTF-8.
    text = new TextDecoder('windows-1252').decode(bytes);
    note = 'The file was not UTF-8, so it was read as Windows-1252 (common for older Excel CSV exports). Check accented characters in the preview.';
  }
  return { text: text.replace(/^\uFEFF/, ''), note };
}

/** Picks the separator that occurs most often (outside quotes) in the header line. */
export function guessDelimiter(text) {
  const counts = { '\t': 0, ',': 0, ';': 0 };
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? best : ',';
}

export function parseDelimited(bytes, format) {
  const { text, note } = decodeText(bytes);
  const notes = note ? [note] : [];
  const options = { skipEmptyLines: false };
  if (format === 'csv') options.delimiter = ',';
  else if (format === 'tsv') options.delimiter = '\t';
  else options.delimiter = guessDelimiter(text);
  const parsed = Papa.parse(text, options);
  const fatal = parsed.errors.find((e) => e.type === 'Quotes');
  if (fatal) {
    throw new ImportFileError(`Row ${fatal.row + 1} has a quote (") that is never closed. Fix that row in the spreadsheet and export again.`);
  }
  if (format === 'txt') {
    const name = { '\t': 'tab', ',': 'comma', ';': 'semicolon' }[parsed.meta.delimiter] ?? parsed.meta.delimiter;
    notes.push(`Columns were detected as ${name}-separated.`);
  }
  const data = parsed.data;
  if (data.length > IMPORT_LIMITS.maxRows + 20) {
    throw new ImportFileError(`This file has ${data.length} rows. The limit is ${IMPORT_LIMITS.maxRows} items per import.`);
  }
  const columnCount = Math.min(Math.max(0, ...data.map((r) => r.length)), IMPORT_LIMITS.maxColumns);
  const rows = data
    .map((r, i) => ({
      rowNumber: i + 1,
      cells: Array.from({ length: columnCount }, (_, c) => {
        const t = r[c] ?? '';
        return t === '' ? { kind: 'empty', text: '' } : { kind: 'string', text: t, raw: t };
      }),
    }))
    .filter((r) => r.cells.some((c) => c.kind !== 'empty'));
  return {
    format,
    sheets: [{ name: format.toUpperCase(), hidden: false, columnCount, truncatedColumns: false, tooManyRows: false, rows }],
    notes,
  };
}
