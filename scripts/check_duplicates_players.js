const fs = require('fs');
const path = require('path');

function normalize(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function readJsonIfExists(p) {
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Failed to read JSON', p, e.message);
    return [];
  }
}

function readCsvIfExists(p) {
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map((l) => {
      const cols = l.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cols[i] === undefined ? '' : cols[i]; });
      return obj;
    });
    return rows;
  } catch (e) {
    console.error('Failed to read CSV', p, e.message);
    return [];
  }
}

function groupByKey(arr, keyFn) {
  const map = new Map();
  arr.forEach((it) => {
    const k = keyFn(it) || '';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  });
  return map;
}

function reportMap(map, title) {
  console.log('\n== ' + title + ' ==');
  let found = 0;
  for (const [k, items] of map.entries()) {
    if (!k) continue;
    if (items.length > 1) {
      found += 1;
      console.log(`\n- Key: ${k} -> ${items.length} entries`);
      items.forEach((it) => console.log('   ', it.source, it.id || '', it.name || ''));
    }
  }
  if (found === 0) console.log('No duplicates found for', title);
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const jsonPath = path.resolve(root, 'import_output', 'players.seed.json');
  const csvPath = path.resolve(root, 'import_output', 'players.mongo.csv');

  const json = readJsonIfExists(jsonPath).map((p) => ({
    source: 'seed.json',
    id: p.id ? String(p.id).trim() : '',
    name: p.name ? String(p.name).trim() : '',
    nickname: p.nickname ? String(p.nickname).trim() : '',
    raw: p,
  }));

  const csv = readCsvIfExists(csvPath).map((p) => ({
    source: 'mongo.csv',
    id: p.id ? String(p.id).trim() : '',
    name: p.name ? String(p.name).trim() : '',
    nickname: p.nickname ? String(p.nickname).trim() : '',
    raw: p,
  }));

  const all = [...json, ...csv];

  console.log(`Loaded: seed.json=${json.length}, mongo.csv=${csv.length}, total=${all.length}`);

  const byId = groupByKey(all, (it) => normalize(it.id));
  const byName = groupByKey(all, (it) => normalize(it.name));
  const byNameNick = groupByKey(all, (it) => normalize((it.name || '') + '|' + (it.nickname || '')));

  reportMap(byId, 'Duplicates by ID');
  reportMap(byName, 'Duplicates by NAME');
  reportMap(byNameNick, 'Duplicates by NAME|NICKNAME');

  console.log('\nDone');
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
