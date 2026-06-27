/**
 * COT Free — CFTC Data Pipeline
 * 
 * Downloads COT data from CFTC, parses it, and outputs JSON files for the frontend.
 * Designed to run in GitHub Actions (Node.js 18+) or locally.
 * 
 * Usage:
 *   node scripts/fetch-cftc-data.js              # Downloads current year
 *   node scripts/fetch-cftc-data.js --year 2026   # Specific year
 *   node scripts/fetch-cftc-data.js --output ../data/cftc-data.json
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { Readable } = require('stream');

// --- Configuration ---

const CFTC_BASE = 'https://www.cftc.gov/files/dea/history';
const ZIP_URLS = {
  legacy:        `${CFTC_BASE}/deacot{YEAR}.zip`,
  disaggregated: `${CFTC_BASE}/fut_disagg_txt_{YEAR}.zip`,
  tff:           `${CFTC_BASE}/fut_fin_txt_{YEAR}.zip`,
};

// Target markets with their CFTC Contract Market Codes
const TARGET_MARKETS = [
  { id: 'gold',            symbol: 'GC',  name: 'Gold',                cftcCode: '088691', category: 'Metal' },
  { id: 'silver',          symbol: 'SI',  name: 'Silver',              cftcCode: '084691', category: 'Metal' },
  { id: 'crude-oil',       symbol: 'CL',  name: 'Crude Oil (WTI)',     cftcCode: '06765A', category: 'Energy' },
  { id: 'natural-gas',     symbol: 'NG',  name: 'Natural Gas',         cftcCode: '023651', category: 'Energy' },
  { id: 'copper',          symbol: 'HG',  name: 'Copper',              cftcCode: '085692', category: 'Metal' },
  { id: 'corn',            symbol: 'C',   name: 'Corn',                cftcCode: '002602', category: 'Agriculture' },
  { id: 'wheat',           symbol: 'W',   name: 'Wheat',               cftcCode: '001602', category: 'Agriculture' },
  { id: 'soybeans',        symbol: 'S',   name: 'Soybeans',            cftcCode: '005602', category: 'Agriculture' },
  { id: 'coffee',          symbol: 'KC',  name: 'Coffee',              cftcCode: '083731', category: 'Agriculture' },
  { id: 'sugar',           symbol: 'SB',  name: 'Sugar',               cftcCode: '080732', category: 'Agriculture' },
  { id: 'cotton',          symbol: 'CT',  name: 'Cotton',              cftcCode: '033661', category: 'Agriculture' },
  { id: 'live-cattle',     symbol: 'LC',  name: 'Live Cattle',         cftcCode: '057642', category: 'Agriculture' },
  { id: 'lean-hogs',       symbol: 'LH',  name: 'Lean Hogs',           cftcCode: '054642', category: 'Agriculture' },
  { id: 'euro-fx',         symbol: '6E',  name: 'Euro FX',             cftcCode: '099741', category: 'Currency' },
  { id: 'british-pound',   symbol: '6B',  name: 'British Pound',       cftcCode: '096742', category: 'Currency' },
  { id: 'japanese-yen',    symbol: '6J',  name: 'Japanese Yen',        cftcCode: '097741', category: 'Currency' },  { id: 'australian-dollar', symbol: '6A', name: 'Australian Dollar',    cftcCode: '232741', category: 'Currency' },
  { id: 'canadian-dollar', symbol: '6C',  name: 'Canadian Dollar',     cftcCode: '090741', category: 'Currency' },
  { id: 'swiss-franc',     symbol: '6S',  name: 'Swiss Franc',         cftcCode: '092741', category: 'Currency' },
  { id: 'sp500',           symbol: 'ES',  name: 'S&P 500 E-Mini',      cftcCode: '13874A', category: 'Index' },  { id: 'nasdaq',          symbol: 'NQ',  name: 'Nasdaq 100 E-Mini',    cftcCode: '20974+', category: 'Index' },
  { id: 'dow-jones',       symbol: 'YM',  name: 'Dow Jones E-Mini',    cftcCode: '124603', category: 'Index' },
  { id: 'russell2000',     symbol: 'RTY', name: 'Russell 2000 E-Mini', cftcCode: '239742', category: 'Index' },
  { id: 'vix',             symbol: 'VX',  name: 'VIX',                 cftcCode: '1170E1', category: 'Index' },
  { id: 'ten-year-note',   symbol: 'ZN',  name: '10-Year T-Note',      cftcCode: '043602', category: 'Rate' },  { id: 'thirty-year-bond', symbol: 'ZB', name: '30-Year T-Bond',       cftcCode: '020601', category: 'Rate' },  { id: 'five-year-note',  symbol: 'ZF',  name: '5-Year T-Note',        cftcCode: '044601', category: 'Rate' },  { id: 'two-year-note',   symbol: 'ZT',  name: '2-Year T-Note',        cftcCode: '042601', category: 'Rate' },  { id: 'bitcoin',         symbol: 'BTC', name: 'Bitcoin',               cftcCode: '133741', category: 'Crypto' },  { id: 'ether',           symbol: 'ETH', name: 'Ether',                 cftcCode: '146021', category: 'Crypto' },
];

// Price data (used since CFTC doesn't include prices)
// Approximate prices as fallback — ideally sourced from Yahoo Finance in a future enhancement
const FALLBACK_PRICES = {
  gold: 2350, silver: 28, 'crude-oil': 78, 'natural-gas': 2.5, copper: 4.2,
  corn: 4.5, wheat: 5.5, soybeans: 12, coffee: 2.0, sugar: 0.22, cotton: 0.65,
  'live-cattle': 185, 'lean-hogs': 85, 'euro-fx': 1.08, 'british-pound': 1.28,
  'japanese-yen': 0.007, 'australian-dollar': 0.65, 'canadian-dollar': 1.35,
  'swiss-franc': 0.92, sp500: 5500, nasdaq: 18500, 'dow-jones': 38500,
  russell2000: 2050, vix: 15, 'ten-year-note': 110, 'thirty-year-bond': 118,
  'five-year-note': 108, 'two-year-note': 102, bitcoin: 62000, ether: 3400,
};

// --- Utilities ---

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

// Unzip using Node.js built-in zlib (for .gz) or fall back for .zip
// For ZIP files, we need to parse the ZIP format manually or use a library
// Since GitHub Actions runner has unzip, we'll shell out
function extractZipContent(zipBuffer) {
  // CFTC ZIPs contain a single .txt file
  // Use a simple ZIP parser: look for local file headers (PK\x03\x04)
  const zip = zipBuffer;
  let offset = 0;
  const files = [];
  
  while (offset < zip.length - 30) {
    if (zip[offset] === 0x50 && zip[offset + 1] === 0x4B && 
        zip[offset + 2] === 0x03 && zip[offset + 3] === 0x04) {
      const compressionMethod = zip.readUInt16LE(offset + 8);
      const compressedSize = zip.readUInt32LE(offset + 18);
      const uncompressedSize = zip.readUInt32LE(offset + 22);
      const fileNameLength = zip.readUInt16LE(offset + 26);
      const extraFieldLength = zip.readUInt16LE(offset + 28);
      const fileName = zip.slice(offset + 30, offset + 30 + fileNameLength).toString('ascii');
      const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
      
      if (compressionMethod === 0) {
        // Stored (uncompressed)
        files.push({ name: fileName, data: zip.slice(dataOffset, dataOffset + uncompressedSize) });
      } else if (compressionMethod === 8) {
        // Deflated — needs actual inflate
        const zlib = require('zlib');
        try {
          const deflated = zip.slice(dataOffset, dataOffset + compressedSize);
          const inflated = zlib.inflateRawSync(deflated);
          files.push({ name: fileName, data: inflated });
        } catch (e) {
          // skip this file
        }
      }
      offset = dataOffset + compressedSize;
    } else {
      offset++;
    }
  }
  return files;
}

function parseCSVLine(line) {
  // Handle quoted fields properly
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function safeParseInt(val) {
  if (!val || val.trim() === '' || val.trim() === '-') return 0;
  const cleaned = val.replace(/"/g, '').replace(/,/g, '').trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

function safeParseFloat(val) {
  if (!val || val.trim() === '' || val.trim() === '-') return 0;
  const cleaned = val.replace(/"/g, '').replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Map CFTC market codes to our market IDs
function codeToMarketId(cftcCode) {
  const market = TARGET_MARKETS.find(m => m.cftcCode === cftcCode);
  return market ? market.id : null;
}

// --- Legacy Parser ---
function parseLegacyData(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  const marketData = {};

  for (const line of lines) {
    if (line.startsWith('Market')) continue; // skip header
    const cols = parseCSVLine(line);
    if (cols.length < 17) continue;

    const marketName = cols[0] || '';
    const dateStr = cols[2] ? cols[2].replace(/"/g, '') : '';
    const cftcCode = cols[3] ? cols[3].replace(/"/g, '') : '';
    const marketId = codeToMarketId(cftcCode);
    if (!marketId || !dateStr) continue;

    // Skip seasonal/options-only entries (look for header clues)
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    const oi = safeParseInt(cols[7]);
    const nonCommLong = safeParseInt(cols[8]);
    const nonCommShort = safeParseInt(cols[9]);
    const nonCommSpread = safeParseInt(cols[10]);
    const commLong = safeParseInt(cols[11]);
    const commShort = safeParseInt(cols[12]);
    const nonRepLong = safeParseInt(cols[16]);
    const nonRepShort = safeParseInt(cols[17]);

    if (!marketData[marketId]) marketData[marketId] = [];
    marketData[marketId].push({
      date: dateStr,
      openInterest: oi,
      legacy: {
        commercial: { long: commLong, short: commShort },
        nonCommercial: { long: nonCommLong, short: nonCommShort, spreading: nonCommSpread },
        nonReportable: { long: nonRepLong, short: nonRepShort },
      },
    });
  }

  return marketData;
}

// --- Disaggregated Parser ---
function parseDisaggregatedData(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  const marketData = {};

  for (const line of lines) {
    const cols = parseCSVLine(line);
    if (cols.length < 20) continue;

    const marketName = cols[0] || '';
    const dateStr = cols[2] ? cols[2].replace(/"/g, '') : '';
    const cftcCode = cols[3] ? cols[3].replace(/"/g, '') : '';
    const marketId = codeToMarketId(cftcCode);
    if (!marketId || !dateStr) continue;
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    // Disaggregated columns (exact indices depend on CFTC schema)
    // Based on documentation: 
    // Col 7: OI, 8: ProdMerch Long, 9: ProdMerch Short, 10: ProdMerch Spread,
    // 11: Swap Long, 12: Swap Short, 13: Swap Spread,
    // 14: ManagedMoney Long, 15: ManagedMoney Short, 16: ManagedMoney Spread,
    // 17: OtherReport Long, 18: OtherReport Short, 19: OtherReport Spread
    const oi = safeParseInt(cols[7]);
    const prodMerchLong = safeParseInt(cols[8]);
    const prodMerchShort = safeParseInt(cols[9]);
    const swapLong = safeParseInt(cols[11]);
    const swapShort = safeParseInt(cols[12]);
    const managedMoneyLong = safeParseInt(cols[14]);
    const managedMoneyShort = safeParseInt(cols[15]);
    const otherReportLong = safeParseInt(cols[17]);
    const otherReportShort = safeParseInt(cols[18]);

    if (!marketData[marketId]) marketData[marketId] = [];
    marketData[marketId].push({
      date: dateStr,
      openInterest: oi,
      disaggregated: {
        producerMerchant: { long: prodMerchLong, short: prodMerchShort },
        swapDealers: { long: swapLong, short: swapShort },
        managedMoney: { long: managedMoneyLong, short: managedMoneyShort },
        otherReportable: { long: otherReportLong, short: otherReportShort },
      },
    });
  }

  return marketData;
}

// --- TFF Parser ---
function parseTFFData(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  const marketData = {};

  for (const line of lines) {
    const cols = parseCSVLine(line);
    if (cols.length < 20) continue;

    const marketName = cols[0] || '';
    const dateStr = cols[2] ? cols[2].replace(/"/g, '') : '';
    const cftcCode = cols[3] ? cols[3].replace(/"/g, '') : '';
    const marketId = codeToMarketId(cftcCode);
    if (!marketId || !dateStr) continue;
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    // TFF columns
    const oi = safeParseInt(cols[7]);
    const dealerLong = safeParseInt(cols[8]);
    const dealerShort = safeParseInt(cols[9]);
    const assetManagerLong = safeParseInt(cols[11]);
    const assetManagerShort = safeParseInt(cols[12]);
    const leveragedFundsLong = safeParseInt(cols[14]);
    const leveragedFundsShort = safeParseInt(cols[15]);

    if (!marketData[marketId]) marketData[marketId] = [];
    marketData[marketId].push({
      date: dateStr,
      openInterest: oi,
      tff: {
        dealer: { long: dealerLong, short: dealerShort },
        assetManager: { long: assetManagerLong, short: assetManagerShort },
        leveragedFunds: { long: leveragedFundsLong, short: leveragedFundsShort },
      },
    });
  }

  return marketData;
}

// --- Merge and Output ---
function mergeData(legacyData, disaggData, tffData) {
  const result = {};

  for (const market of TARGET_MARKETS) {
    const id = market.id;
    const legacy = legacyData[id] || [];
    const disagg = disaggData[id] || [];
    const tff = tffData[id] || [];

    // Collect all unique dates
    const allDates = new Set();
    legacy.forEach(d => allDates.add(d.date));
    disagg.forEach(d => allDates.add(d.date));
    tff.forEach(d => allDates.add(d.date));

    const dates = Array.from(allDates).sort().reverse();
    const history = dates.slice(0, 20).map(date => {
      const l = legacy.find(d => d.date === date);
      const di = disagg.find(d => d.date === date);
      const t = tff.find(d => d.date === date);

      // Use OI from any available source
      const oi = l?.openInterest || di?.openInterest || t?.openInterest || 0;
      const price = FALLBACK_PRICES[id] || 100;

      return {
        week: dateToWeekStr(date),
        reportDate: date,
        openInterest: oi,
        price,
        legacy: l ? l.legacy : null,
        disaggregated: di ? di.disaggregated : null,
        tff: t ? t.tff : null,
      };
    });

    if (history.length > 0) {
      result[id] = history;
    }
  }

  return result;
}

function dateToWeekStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = (d - startOfYear + (startOfYear.getTimezoneOffset() - d.getTimezoneOffset()) * 60000) / 86400000;
  const week = Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const year = args.includes('--year') 
    ? args[args.indexOf('--year') + 1] 
    : String(new Date().getFullYear());
  const outputArg = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : null;

  console.log(`📥 Fetching CFTC COT data for year ${year}...`);

  const results = {};
  const reportTypes = ['legacy', 'disaggregated', 'tff'];
  const parsers = {
    legacy: parseLegacyData,
    disaggregated: parseDisaggregatedData,
    tff: parseTFFData,
  };

  for (const type of reportTypes) {
    const url = ZIP_URLS[type].replace('{YEAR}', year);
    console.log(`  📡 Downloading ${type} from ${url}...`);
    
    try {
      const zipBuffer = await fetchURL(url);
      const files = extractZipContent(zipBuffer);
      
      // Find the first .txt file
      const txtFile = files.find(f => f.name.endsWith('.txt'));
      if (!txtFile) {
        console.log(`  ⚠️  No text file found in ${type} ZIP`);
        continue;
      }

      const csvContent = txtFile.data.toString('utf8');
      const parsed = parsers[type](csvContent);
      results[type] = parsed;
      console.log(`  ✅ Parsed ${type}: ${Object.keys(parsed).length} target markets found`);
    } catch (err) {
      console.log(`  ❌ Failed to fetch/parse ${type}: ${err.message}`);
    }
  }

  // Merge and format
  const merged = mergeData(
    results.legacy || {},
    results.disaggregated || {},
    results.tff || {}
  );

  console.log(`\n📊 Total markets with data: ${Object.keys(merged).length}`);

  // Build the output
  const output = {
    meta: {
      source: 'CFTC.gov',
      year: year,
      fetchedAt: new Date().toISOString(),
      marketCount: Object.keys(merged).length,
      weekCounts: Object.fromEntries(
        Object.entries(merged).map(([id, weeks]) => [id, weeks.length])
      ),
    },
    markets: TARGET_MARKETS,
    data: merged,
  };

  // Determine output path
  const outputPath = outputArg || path.join(__dirname, '..', 'data', 'cftc-data.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Data written to ${outputPath}`);

  // Also output as a compact JS module for direct import
  const jsOutputPath = outputPath.replace('.json', '.js');
  const jsContent = `// Auto-generated by fetch-cftc-data.js on ${new Date().toISOString()}\n// Source: CFTC.gov — Commitment of Traders reports\nconst CFTC_DATA = ${JSON.stringify(output)};\n`;
  fs.writeFileSync(jsOutputPath, jsContent);
  console.log(`✅ JS module written to ${jsOutputPath}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
