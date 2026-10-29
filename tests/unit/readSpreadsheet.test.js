import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { readSpreadsheet, ImportFileError, IMPORT_LIMITS } from '../../src/lib/import/readSpreadsheet.js';
import { guessHeaderRow, readHeaders } from '../../src/lib/import/headers.js';
import { fileFrom } from '../helpers.js';

async function workbookFile() {
  const wb = new ExcelJS.Workbook();
  const notes = wb.addWorksheet('Read me');
  notes.addRow(['This sheet has instructions only']);
  const ws = wb.addWorksheet('Inventory');
  ws.addRow(['Valley inventory export']);
  ws.addRow([]);
  ws.addRow(['Item #', 'Title', 'Category', 'Price', 'Description', 'Added']);
  ws.addRow([491, 'Cordless drill', 'tools', 129.99, 'Two batteries,\ncharger', new Date(Date.UTC(2026, 9, 15))]);
  ws.getCell('A4').numFmt = '00000';
  ws.addRow(['00492', 'Gold chain', 'Jewelry', '$1,250.00', 'Has "14K" stamp', '2026-10-16']);
  ws.addRow([77, 'Guitar', 'Musical Instruments', { formula: 'B1', result: 300 }, '', '']);
  const bytes = await wb.xlsx.writeBuffer();
  return fileFrom('inventory.xlsx', bytes);
}

describe('xlsx', () => {
  it('lists every worksheet and keeps worksheet row numbers', async () => {
    const r = await readSpreadsheet(await workbookFile());
    expect(r.format).toBe('xlsx');
    expect(r.sheets.map((s) => s.name)).toEqual(['Read me', 'Inventory']);
    const inv = r.sheets[1];
    expect(guessHeaderRow(inv)).toBe(3);
    const { headers, dataRows, errors } = readHeaders(inv, 3);
    expect(errors).toEqual([]);
    expect(headers.map((h) => h.name)).toEqual(['Item #', 'Title', 'Category', 'Price', 'Description', 'Added']);
    expect(dataRows.map((d) => d.rowNumber)).toEqual([4, 5, 6]);
    expect(r.fileSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps text IDs and uses formatted leading zeros deliberately', async () => {
    const r = await readSpreadsheet(await workbookFile());
    const rows = r.sheets[1].rows;
    const row4 = rows.find((x) => x.rowNumber === 4);
    const row5 = rows.find((x) => x.rowNumber === 5);
    const row6 = rows.find((x) => x.rowNumber === 6);
    expect(row4.cells[0]).toMatchObject({ kind: 'number', text: '00491', raw: 491, leadingZeroFormat: true });
    expect(row5.cells[0]).toMatchObject({ kind: 'string', text: '00492' });
    expect(row6.cells[0]).toMatchObject({ kind: 'number', text: '77' });
    expect(row6.cells[3]).toMatchObject({ kind: 'number', raw: 300 }); // formula result
    expect(row4.cells[4].text).toBe('Two batteries,\ncharger');
    expect(row4.cells[5]).toMatchObject({ kind: 'date', text: '2026-10-15' });
  });

  it('rejects a file that is not really an xlsx', async () => {
    await expect(readSpreadsheet(fileFrom('fake.xlsx', 'a,b\n1,2'))).rejects.toThrow(/not an Excel workbook/);
  });

  it('rejects legacy .xls with instructions', async () => {
    await expect(readSpreadsheet(fileFrom('old.xls', 'x'))).rejects.toThrow(ImportFileError);
  });

  it('enforces the file size limit', async () => {
    const f = { name: 'big.csv', size: IMPORT_LIMITS.maxFileBytes + 1, arrayBuffer: async () => new ArrayBuffer(1) };
    await expect(readSpreadsheet(f)).rejects.toThrow(/limit is 10 MB/);
  });
});

describe('csv / tsv', () => {
  it('handles quoted commas, escaped quotes, multiline fields and a BOM', async () => {
    const csv = '\uFEFFitem_id,title,description,price\r\n' +
      'PL-1,"Saw, circular","Blade ""7-1/4"" included",149\r\n' +
      'PL-2,Ring,"Line one\nLine two, with comma",80\r\n';
    const r = await readSpreadsheet(fileFrom('inv.csv', csv));
    const sheet = r.sheets[0];
    const { headers, dataRows, errors } = readHeaders(sheet, 1);
    expect(errors).toEqual([]);
    expect(headers[0].name).toBe('item_id'); // BOM stripped
    expect(dataRows).toHaveLength(2);
    expect(dataRows[0].cells[1].text).toBe('Saw, circular');
    expect(dataRows[0].cells[2].text).toBe('Blade "7-1/4" included');
    expect(dataRows[1].cells[2].text).toBe('Line one\nLine two, with comma');
    expect(dataRows[1].rowNumber).toBe(3);
  });

  it('reports an unclosed quote with its row', async () => {
    await expect(readSpreadsheet(fileFrom('bad.csv', 'a,b\n1,"oops\n'))).rejects.toThrow(/never closed/);
  });

  it('reads real tab-separated files', async () => {
    const r = await readSpreadsheet(fileFrom('inv.tsv', 'item_id\ttitle\tprice\nPL-1\tA, B\t5\n'));
    expect(r.sheets[0].rows[1].cells.map((c) => c.text)).toEqual(['PL-1', 'A, B', '5']);
  });

  it('detects the delimiter in .txt exports', async () => {
    const r = await readSpreadsheet(fileFrom('inv.txt', 'item_id\ttitle\nPL-1\tLamp\n'));
    expect(r.sheets[0].rows[1].cells.map((c) => c.text)).toEqual(['PL-1', 'Lamp']);
    expect(r.notes.join(' ')).toMatch(/tab-separated/);
  });

  it('falls back to Windows-1252 for non-UTF-8 exports', async () => {
    const bytes = new Uint8Array([...new TextEncoder().encode('title\nCaf'), 0xe9]);
    const r = await readSpreadsheet(fileFrom('w.csv', bytes));
    expect(r.sheets[0].rows[1].cells[0].text).toBe('Café');
  });
});

describe('headers', () => {
  const sheetOf = (rows) => ({ name: 'S', columnCount: rows[0].length, rows: rows.map((r, i) => ({ rowNumber: i + 1, cells: r.map((t) => (t ? { kind: 'string', text: t } : { kind: 'empty', text: '' })) })) });

  it('rejects duplicate headers (case-insensitive)', () => {
    const { errors } = readHeaders(sheetOf([['ID', 'Price', 'price'], ['1', '2', '3']]), 1);
    expect(errors[0]).toMatch(/Columns B and C both have the heading "price"/);
  });

  it('rejects a blank header over a column with data', () => {
    const { errors } = readHeaders(sheetOf([['ID', '', 'Title'], ['1', 'x', 'y']]), 1);
    expect(errors[0]).toMatch(/Column B has values but no heading/);
  });

  it('ignores a blank header over an empty column', () => {
    const { errors, headers } = readHeaders(sheetOf([['ID', '', 'Title'], ['1', '', 'y']]), 1);
    expect(errors).toEqual([]);
    expect(headers.map((h) => h.letter)).toEqual(['A', 'C']);
  });
});
