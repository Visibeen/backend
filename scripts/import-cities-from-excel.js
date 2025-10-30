'use strict';

require('dotenv').config();
const path = require('path');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const db = require('../models');

function parseArgs(argv) {
  const args = { file: '', state: '', sheet: '', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') { args.dryRun = true; continue; }
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) {
      const key = m[1];
      const val = m[2];
      if (key === 'file') args.file = val;
      else if (key === 'state') args.state = val;
      else if (key === 'sheet') args.sheet = val;
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
  const { file, state: stateFilter, sheet: sheetName, dryRun } = parseArgs(process.argv);
  if (!file) {
    console.error('Usage: node scripts/import-cities-from-excel.js --file=./Cities-List.xlsx [--state="Maharashtra"] [--sheet="Sheet1"] [--dry-run]');
    process.exit(1);
  }

  const absFile = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  console.log(`[Importer] Reading: ${absFile}`);

  const ext = path.extname(absFile).toLowerCase();
  let worksheet = null;
  let headers = {};
  let isArrayMode = false; // true when using XLSX arrays
  let rows2D = [];

  if (ext === '.xls') {
    // Use SheetJS to support legacy .xls
    const wb = XLSX.readFile(absFile);
    const targetSheetName = sheetName || wb.SheetNames[0];
    const sheet = wb.Sheets[targetSheetName];
    if (!sheet) throw new Error('Worksheet not found');
    rows2D = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    if (!rows2D.length) throw new Error('Empty worksheet');
    const headerRowArr = rows2D[0];
    headers = {};
    for (let i = 0; i < headerRowArr.length; i++) {
      const name = String(headerRowArr[i] || '').toLowerCase().trim();
      if (name) headers[name] = i; // 0-based
    }
    isArrayMode = true;
  } else {
    // Default to ExcelJS for .xlsx
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(absFile);
    worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
    if (!worksheet) throw new Error('Worksheet not found');
    const headerRow = worksheet.getRow(1);
    const colCount = headerRow.cellCount;
    headers = {};
    for (let c = 1; c <= colCount; c++) {
      const name = String(headerRow.getCell(c).value || '').toLowerCase().trim();
      if (name) headers[name] = c; // 1-based for ExcelJS
    }
  }

  function getColIndex(preferredNames) {
    for (const name of Object.keys(headers)) {
      for (const pref of preferredNames) {
        if (name === pref || name.includes(pref)) return headers[name];
      }
    }
    return isArrayMode ? -1 : 0;
  }

  const stateCol = getColIndex(['state', 'region']);
  const cityCol = getColIndex(['city', 'town']);
  if ((isArrayMode && cityCol < 0) || (!isArrayMode && !cityCol)) {
    throw new Error('Could not find a City column in the first row');
  }
  if (((isArrayMode && stateCol < 0) || (!isArrayMode && !stateCol)) && !stateFilter) {
    console.warn('[Importer] No explicit State column found. Proceeding without state filter.');
  }

  // Load states table map (by slug and by lowercased name)
  const allStates = await db.state.findAll();
  const stateBySlug = new Map(allStates.map(s => [s.slug, s]));
  const stateByName = new Map(allStates.map(s => [String(s.name).toLowerCase().trim(), s]));

  let targetStates = [];
  if (stateFilter) {
    const desiredSlug = slugify(stateFilter);
    const s = stateBySlug.get(desiredSlug) || stateByName.get(String(stateFilter).toLowerCase().trim());
    if (!s) throw new Error(`State not found in DB: ${stateFilter}`);
    targetStates = [s];
  } else {
    targetStates = allStates;
  }
  const targetStateSlugs = new Set(targetStates.map(s => s.slug));

  const found = new Map(); // key: stateSlug -> Set(cityName)
  const insertRows = [];

  if (isArrayMode) {
    for (let r = 1; r < rows2D.length; r++) {
      const row = rows2D[r] || [];
      const excelStateName = stateCol >= 0 ? String(row[stateCol] || '').trim() : '';
      const excelCityName = String(row[cityCol] || '').trim();
      if (!excelCityName) continue;

      let matchedState = null;
      if (stateFilter) {
        matchedState = targetStates[0];
      } else if (excelStateName) {
        const slug = slugify(excelStateName);
        matchedState = stateBySlug.get(slug) || stateByName.get(excelStateName.toLowerCase());
      }
      if (!matchedState) continue;
      if (!targetStateSlugs.has(matchedState.slug)) continue;

      const key = matchedState.slug;
      if (!found.has(key)) found.set(key, new Set());
      const set = found.get(key);
      set.add(excelCityName);
    }
  } else {
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const excelStateName = stateCol ? String(row.getCell(stateCol).value || '').trim() : '';
      const excelCityName = String(row.getCell(cityCol).value || '').trim();
      if (!excelCityName) continue;

      let matchedState = null;
      if (stateFilter) {
        matchedState = targetStates[0];
      } else if (excelStateName) {
        const slug = slugify(excelStateName);
        matchedState = stateBySlug.get(slug) || stateByName.get(excelStateName.toLowerCase());
      }
      if (!matchedState) continue;
      if (!targetStateSlugs.has(matchedState.slug)) continue;

      const key = matchedState.slug;
      if (!found.has(key)) found.set(key, new Set());
      const set = found.get(key);
      set.add(excelCityName);
    }
  }

  // Report (and optionally insert)
  for (const [stateSlug, citySet] of found.entries()) {
    const state = stateBySlug.get(stateSlug);
    const cityList = Array.from(citySet).sort((a, b) => a.localeCompare(b));
    console.log(`\n[Importer] State: ${state.name} (${state.slug}) → ${cityList.length} cities`);
    for (const name of cityList) console.log(` - ${name}`);

    if (dryRun) continue;

    for (const name of cityList) {
      const slug = slugify(name);
      // upsert by (state_id + slug)
      const existing = await db.city.findOne({ where: { state_id: state.id, slug } });
      if (existing) continue;
      await db.city.create({ state_id: state.id, name, slug });
    }
  }

  console.log(`\n[Importer] Done. Dry-run: ${dryRun ? 'yes' : 'no'}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[Importer] Error:', err);
  process.exit(1);
});


