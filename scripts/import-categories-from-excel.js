'use strict';

require('dotenv').config();
const path = require('path');
const XLSX = require('xlsx');
const db = require('../models');

function parseArgs(argv) {
  const args = { file: '', sheet: '', dryRun: false, truncate: false, startRow: 0, debug: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') { args.dryRun = true; continue; }
    if (a === '--truncate') { args.truncate = true; continue; }
    if (a === '--debug') { args.debug = true; continue; }
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) {
      const key = m[1];
      const val = m[2];
      if (key === 'file') args.file = val;
      else if (key === 'sheet') args.sheet = val;
      else if (key === 'startRow') args.startRow = Math.max(0, parseInt(val || '0', 10) || 0);
    }
  }
  return args;
}

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

async function main() {
  const { file, sheet: sheetName, dryRun, truncate, startRow, debug } = parseArgs(process.argv);
  if (!file) {
    console.error('Usage: node scripts/import-categories-from-excel.js --file=./Top 200 Catgory.xlsx [--sheet="Sheet1"] [--truncate] [--dry-run]');
    process.exit(1);
  }

  const absFile = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  console.log(`[CatImporter] Reading: ${absFile}`);

  const wb = XLSX.readFile(absFile);
  const targetSheetNames = sheetName ? [sheetName] : wb.SheetNames;
  const blocks = [];
  for (const sName of targetSheetNames) {
    const s = wb.Sheets[sName];
    if (!s) continue;
    const r = XLSX.utils.sheet_to_json(s, { header: 1, raw: true, defval: '' });
    if (r && r.length) blocks.push({ name: sName, rows: r });
  }
  if (!blocks.length) throw new Error('Empty workbook');
  if (debug) {
    console.log(`[CatImporter] Sheets: ${blocks.map(b => `${b.name}(${b.rows.length})`).join(', ')}`);
  }

  // Build header map if first row looks like a header; otherwise we'll scan all cells
  const header = blocks[0].rows[0] ? blocks[0].rows[0].map(c => String(c || '').toLowerCase().trim()) : [];
  const headers = new Map(header.map((h, i) => [h, i]));
  if (debug) {
    console.log('[CatImporter] Header:', header);
  }

  function findCol(preferred) {
    for (const h of header) {
      for (const pref of preferred) {
        if (h === pref || h.includes(pref)) return headers.get(h);
      }
    }
    return -1;
  }

  // Try common labels; if not found, we'll scan all columns in every row
  let nameCol = findCol(['category', 'categories', 'name', 'category name', 'top 200 category']);
  const codeCol = findCol(['gmb', 'gcid', 'code', 'gmb_code']);

  if (truncate && !dryRun) {
    await db.category.destroy({ where: {}, truncate: true, force: true });
    console.log('[CatImporter] categories table truncated.');
  }

  const seen = new Set();
  let toInsert = [];
  let totalCells = 0;
  let totalParts = 0;
  let nonEmptyRows = 0;

  const begin = Math.max(0, startRow || 0);
  for (const block of blocks) {
    const rows = block.rows;
    for (let r = begin; r < rows.length; r++) {
      const row = rows[r] || [];

      // If we have an identified name column, use it; else scan all cells
      const candidateCells = [];
      if (nameCol >= 0) {
        candidateCells.push(row[nameCol]);
      } else {
        for (let c = 0; c < row.length; c++) candidateCells.push(row[c]);
      }

      let rowHadValue = false;
      for (const cell of candidateCells) {
        if (cell == null) continue;
        const raw = String(cell).trim();
        if (!raw) continue;
        rowHadValue = true;
        totalCells++;
        // Split if cell contains multiple categories separated by commas, pipes, slashes or newlines
        const parts = raw.split(/[\,\n\r\|\/]+/).map(s => s.trim()).filter(Boolean);
        totalParts += parts.length;
        for (const nameRaw of parts) {
          const slug = slugify(nameRaw);
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);
          const gmb_code = codeCol >= 0 ? (String(row[codeCol] || '').trim() || null) : null;
          toInsert.push({ name: nameRaw, slug, gmb_code });
        }
      }
      if (rowHadValue) nonEmptyRows++;
    }
  }

  // Sort for stability
  toInsert.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`[CatImporter] Parsed ${toInsert.length} categories`);
  if (debug) {
    console.log('[CatImporter] Sample:', toInsert.slice(0, 20).map(x => x.name));
    console.log(`[CatImporter] Stats: nonEmptyRows=${nonEmptyRows}, totalCells=${totalCells}, splitParts=${totalParts}`);
  }
  if (dryRun) {
    toInsert.slice(0, 20).forEach(c => console.log(` - ${c.name} (${c.slug}) ${c.gmb_code ? '['+c.gmb_code+']' : ''}`));
    console.log('[CatImporter] Dry-run complete.');
    process.exit(0);
  }

  let inserted = 0, skipped = 0;
  for (const c of toInsert) {
    const existing = await db.category.findOne({ where: { slug: c.slug } });
    if (existing) { skipped++; continue; }
    await db.category.create({ name: c.name, slug: c.slug, gmb_code: c.gmb_code || null });
    inserted++;
  }

  console.log(`[CatImporter] Done. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[CatImporter] Error:', err);
  process.exit(1);
});


