# Owner guide: updating your website inventory

You keep working in Excel as usual. When you want the website to match, upload the file,
check the preview, and publish. Nothing on the website changes until you press **Publish**.

## Signing in

Go to `/owner` on your website (there's also an "Owner sign-in" link at the bottom of every
page) and sign in with the email and password set up for you. Only accounts on the shop's owner
list can make changes.

## Preparing your spreadsheet

Start from **Download Excel template** on the import page, or use your own sheet with these columns:

| Column | Required | Notes |
| --- | --- | --- |
| Item number | Yes | Your tag/SKU. Format this column as **Text** so `00491` keeps its zeros. Never reuse a number for a different item: photos stay attached to the number. |
| Title | Yes | What customers see. |
| Category | Yes | Tools, Jewelry, etc. Capitals don't matter; "jewelry" joins "Jewelry". |
| Price | Yes | `129.99`, `$1,250.00`. No negatives, no text like "OBO". |
| Status | No | `available`, `sold`, `draft` (hidden), `archived` (hidden). |
| Condition | No | Brand New, Like New, Excellent, Good, Fair, For Parts. |
| Description, Brand, Model, Accessories | No | |
| Featured | No | TRUE/FALSE. Featured items appear on the home page. |
| Date added | No | `2026-10-15`. Leave it out to keep existing dates. |
| Photo links | No | `https://` links separated by `|`. |

Columns you don't use (your cost, customer notes, loan details) are fine to keep in the file.
They are never read unless you map them, and only the fields above can ever reach the website.

## Importing

1. **Choose a file.** `.xlsx`, `.csv` or tab-separated text, up to 10 MB / 5,000 items.
   Old `.xls` files must be re-saved as `.xlsx`.
2. **Choose the sheet and heading row.** If your headings aren't on the first row, pick the
   right one. If two columns share a heading, or a column has values but no heading, fix the
   file and upload it again.
3. **Match your columns.** Your choices are remembered for next time. Anything set to
   "Not imported" is left exactly as it is on existing items.
4. **Choose how to import:**
   - **Add and update (recommended):** adds new item numbers, updates matching ones, and leaves
     everything else alone.
   - **This file is my complete inventory:** also archives any listed item that isn't in the
     file. Use this only when the file truly lists everything. It refuses to publish if any row
     has an error, so a typo can never cause an item to be archived.
   - **Blank cells:** "Keep the current value" (default) means an empty cell doesn't change
     anything. "Clear the field" means an empty cell erases that field (title, category, price,
     status and date are never cleared).
5. **Prepare preview** and read it:
   - **Rows with errors** shows the spreadsheet row number and exactly what's wrong.
   - **Check these rows** flags things like item numbers stored as numbers in Excel.
   - **Changes to existing items** shows each field's old and new value.
   - **New items** without a status need you to choose **Draft** (hidden until you're ready)
     or **Available** (shown right away).
6. **Publish.** In "complete inventory" mode you'll see the list of items to be archived and
   must confirm. Large archives ask you to type a confirmation.

If someone else changed the inventory while you were reviewing, publishing is refused and you'll
be asked to **Refresh preview**. This prevents your file from overwriting their newer changes.

## Photos

**Items and photos** lists every item. Choose **manage** next to an item to:

- **Add photos** from your phone (take a picture or pick from the library) or computer.
  JPEG, PNG or WebP up to 15 MB; they're resized automatically.
- **Make cover** to choose the photo shown in the catalog, or move photos **Earlier/Later**.
- **Remove** a photo (asks first; uploaded photos can't be brought back).

Re-importing your spreadsheet never removes uploaded photos. The "Photo links" column only
manages photos that came from links in the spreadsheet.

## Marking an item sold

Change its status on **Items and photos**, or set `sold` in your spreadsheet and import.
Sold items leave the catalog but their page still works for anyone who saved the link, and it
clearly says the item is sold.

## Undoing a change

**History and restore** lists a restore point for every publish. **Restore this version** puts
item details, statuses and spreadsheet photo links back the way they were just before that
import. Items added since then are archived, not deleted. The state you're replacing is saved
as a new restore point, so a restore can itself be undone. Uploaded photos aren't affected.

## Store details

The shop name, address, phone, hours and any statements such as "licensed" or "phone holds
available" are set by your web developer in `src/config/shop.js`. Statements only appear once
you've confirmed they're true.
