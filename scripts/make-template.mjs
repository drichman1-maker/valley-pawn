// Generates public/inventory-template.xlsx and public/inventory-template.csv.
// Run with: npm run template
import ExcelJS from 'exceljs';
import { writeFileSync } from 'node:fs';

const headers = ['item_id', 'title', 'category', 'price', 'status', 'condition', 'description', 'brand', 'model', 'accessories', 'featured', 'date_added', 'photo_urls'];
const examples = [
  ['00491', 'DeWalt 20V cordless drill kit', 'Tools', 129.99, 'available', 'Excellent', 'Tested. Two batteries and charger.', 'DeWalt', 'DCK280C2', '2 batteries, charger, bag', 'TRUE', '2026-10-15', ''],
  ['PL-9002', '10K gold band, size 10', 'Jewelry', 320, 'draft', 'Good', 'Solid 10K yellow gold, 8 g.', '', '', 'Gift box', 'FALSE', '', ''],
];

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Inventory', { views: [{ state: 'frozen', ySplit: 1 }] });
ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 4) }));
ws.getColumn('item_id').numFmt = '@'; // Text, so 00491 keeps its zeros
ws.getColumn('date_added').numFmt = '@';
ws.getColumn('price').numFmt = '0.00';
ws.getColumn('title').width = 34;
ws.getColumn('description').width = 40;
ws.getColumn('photo_urls').width = 40;
for (const r of examples) ws.addRow(r);
ws.getRow(1).font = { name: 'Arial', bold: true };
ws.eachRow((row, n) => { if (n > 1) row.font = { name: 'Arial' }; });
ws.getCell('A2').note = 'Example rows: replace them with your inventory.';

const help = wb.addWorksheet('How to use');
help.getColumn(1).width = 18;
help.getColumn(2).width = 90;
const lines = [
  ['Column', 'What to enter'],
  ['item_id', 'Required. Your tag or SKU. Keep this column formatted as Text so numbers like 00491 keep their leading zeros. Never reuse a number for a different item.'],
  ['title', 'Required. Public listing name.'],
  ['category', 'Required. For example Tools, Jewelry, Electronics. Spelling is matched to existing categories regardless of capitals.'],
  ['price', 'Required. A number like 129.99. A leading $ and thousands commas are allowed. No negative numbers or text.'],
  ['status', 'available (shown), sold (shown as sold by direct link), draft (hidden), archived (hidden). Blank on a new item: you choose draft or available during import.'],
  ['condition', 'Brand New, Like New, Excellent, Good, Fair or For Parts.'],
  ['featured', 'TRUE/FALSE, yes/no or 1/0. Featured items appear on the home page.'],
  ['date_added', 'YYYY-MM-DD. Leave blank or unmapped to keep existing dates; new items use the import date.'],
  ['photo_urls', 'Optional https:// links separated by |. Photos uploaded in the owner portal are never changed by an import.'],
  ['Blank cells', 'Choose during import whether blank cells keep the current value (default) or clear optional fields.'],
  ['Unused columns', 'Columns you do not map are ignored; extra columns (like your cost) are never published.'],
];
lines.forEach((l, i) => {
  const row = help.addRow(l);
  row.font = { name: 'Arial', bold: i === 0 };
  row.alignment = { wrapText: true, vertical: 'top' };
});

writeFileSync('public/inventory-template.xlsx', Buffer.from(await wb.xlsx.writeBuffer()));
const csvField = (v) => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync('public/inventory-template.csv', [headers, ...examples].map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n');
console.log('Wrote public/inventory-template.xlsx and public/inventory-template.csv');
