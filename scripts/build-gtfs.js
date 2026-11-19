#!/usr/bin/env node
/**
 * build-gtfs.js — Converte o GTFS da SPTrans em JSONs compactos para o app.
 *
 * Uso:
 *   node scripts/build-gtfs.js <pasta_gtfs_extraida> [pasta_saida]
 *   ex.: node scripts/build-gtfs.js ./gtfs ./assets/gtfs
 *
 * Sem dependências externas (só Node >= 16). Lê os .txt em streaming,
 * então funciona mesmo com stop_times.txt grande.
 *
 * Saídas (em pasta_saida):
 *   routes.json       [{ id, shortName, longName, color, directions: [{ dir, headsign, shapeId, tripId }] }]
 *   stops.json        [{ id, name, lat, lon }]                (apenas paradas usadas por alguma linha)
 *   routeStops.json   { routeId: { "0": [stopId...], "1": [stopId...] } }  (em ordem)
 *   stopRoutes.json   { stopId: [routeId...] }
 *   shapes.json       { shapeId: [[lat, lon], ...] }          (simplificado com Douglas-Peucker)
 *   frequencies.json  { routeId: { "0": [{ start, end, headwayMin, service }], "1": [...] } }
 *   calendar.json     { serviceId: { days: [seg,ter,qua,qui,sex,sab,dom] (0/1), start, end } }
 *   meta.json         { generatedAt, counts, sizes }
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ---------- Configuração ----------
const COORD_DECIMALS = 5;          // ~1 m de precisão
const SIMPLIFY_TOLERANCE = 0.00005; // graus (~5 m). Aumente se o shapes.json ficar grande.
const SIZE_WARN_MB = 10;

// ---------- Utilidades ----------
const round = (n, d = COORD_DECIMALS) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/** Divide uma linha CSV respeitando aspas (RFC 4180). */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Lê um arquivo GTFS linha a linha e chama onRow(objeto) para cada registro. */
async function readGtfs(dir, file, onRow, { required = true } = {}) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) {
    if (required) throw new Error(`Arquivo obrigatório não encontrado: ${p}`);
    console.warn(`  (aviso) ${file} não encontrado — ignorado`);
    return 0;
  }
  const rl = readline.createInterface({ input: fs.createReadStream(p, 'utf8'), crlfDelay: Infinity });
  let header = null;
  let n = 0;
  for await (let line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCsvLine(line.replace(/^﻿/, '')).map((h) => h.trim());
      continue;
    }
    const cols = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = (cols[i] ?? '').trim();
    onRow(row);
    n++;
  }
  return n;
}

/** Douglas-Peucker iterativo (evita estouro de pilha em shapes longos). */
function simplify(points, tol) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const tol2 = tol * tol;
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d2;
      if (len2 === 0) d2 = (px - ax) ** 2 + (py - ay) ** 2;
      else {
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        d2 = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }
      if (d2 > maxD) { maxD = d2; idx = i; }
    }
    if (maxD > tol2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** "HH:MM:SS" (pode passar de 24h no GTFS) -> "HH:MM" */
const hhmm = (t) => (t || '').split(':').slice(0, 2).map((x) => x.padStart(2, '0')).join(':');

function writeJson(outDir, name, data) {
  const p = path.join(outDir, name);
  fs.writeFileSync(p, JSON.stringify(data));
  return fs.statSync(p).size;
}

// ---------- Pipeline ----------
async function main() {
  const [inDir, outDirArg] = process.argv.slice(2);
  if (!inDir) {
    console.error('Uso: node scripts/build-gtfs.js <pasta_gtfs_extraida> [pasta_saida]');
    process.exit(1);
  }
  const outDir = outDirArg || path.join(process.cwd(), 'assets', 'gtfs');
  fs.mkdirSync(outDir, { recursive: true });
  const t0 = Date.now();

  // 1) routes.txt
  console.log('Lendo routes.txt...');
  const routes = new Map();
  await readGtfs(inDir, 'routes.txt', (r) => {
    routes.set(r.route_id, {
      id: r.route_id,
      shortName: r.route_short_name || r.route_id,
      longName: r.route_long_name || '',
      color: r.route_color ? `#${r.route_color}` : null,
    });
  });

  // 2) trips.txt
  console.log('Lendo trips.txt...');
  const trips = new Map(); // trip_id -> { routeId, dir, headsign, shapeId, service }
  await readGtfs(inDir, 'trips.txt', (t) => {
    if (!routes.has(t.route_id)) return;
    trips.set(t.trip_id, {
      routeId: t.route_id,
      dir: t.direction_id === '1' ? '1' : '0',
      headsign: t.trip_headsign || '',
      shapeId: t.shape_id || null,
      service: t.service_id || '',
    });
  });

  // 3) stop_times.txt (streaming) — guarda a sequência de paradas por trip
  console.log('Lendo stop_times.txt (pode demorar)...');
  const tripStops = new Map(); // trip_id -> [[seq, stopId], ...]
  await readGtfs(inDir, 'stop_times.txt', (st) => {
    if (!trips.has(st.trip_id)) return;
    let arr = tripStops.get(st.trip_id);
    if (!arr) tripStops.set(st.trip_id, (arr = []));
    arr.push([Number(st.stop_sequence), st.stop_id]);
  });

  // 4) Trip representativa por (linha, sentido): a que tem mais paradas
  const rep = new Map(); // `${routeId}|${dir}` -> tripId
  for (const [tripId, stops] of tripStops) {
    const t = trips.get(tripId);
    const key = `${t.routeId}|${t.dir}`;
    const cur = rep.get(key);
    if (!cur || stops.length > tripStops.get(cur).length) rep.set(key, tripId);
  }

  const routeStops = {};
  const stopRoutesSet = new Map();
  const usedStops = new Set();
  const usedShapes = new Set();
  for (const [key, tripId] of rep) {
    const [routeId, dir] = key.split('|');
    const t = trips.get(tripId);
    const seq = tripStops.get(tripId).sort((a, b) => a[0] - b[0]).map(([, s]) => s);
    (routeStops[routeId] ||= {})[dir] = seq;
    for (const s of seq) {
      usedStops.add(s);
      if (!stopRoutesSet.has(s)) stopRoutesSet.set(s, new Set());
      stopRoutesSet.get(s).add(routeId);
    }
    if (t.shapeId) usedShapes.add(t.shapeId);
    const r = routes.get(routeId);
    (r.directions ||= []).push({ dir: Number(dir), headsign: t.headsign, shapeId: t.shapeId, tripId });
  }
  tripStops.clear();

  // 5) stops.txt — só as paradas usadas
  console.log('Lendo stops.txt...');
  const stops = [];
  await readGtfs(inDir, 'stops.txt', (s) => {
    if (!usedStops.has(s.stop_id)) return;
    stops.push({ id: s.stop_id, name: s.stop_name, lat: round(+s.stop_lat), lon: round(+s.stop_lon) });
  });

  // 6) shapes.txt — só os shapes usados, simplificados
  console.log('Lendo shapes.txt...');
  const rawShapes = new Map();
  await readGtfs(inDir, 'shapes.txt', (p) => {
    if (!usedShapes.has(p.shape_id)) return;
    let arr = rawShapes.get(p.shape_id);
    if (!arr) rawShapes.set(p.shape_id, (arr = []));
    arr.push([Number(p.shape_pt_sequence), +p.shape_pt_lat, +p.shape_pt_lon]);
  }, { required: false });
  const shapes = {};
  let ptsBefore = 0, ptsAfter = 0;
  for (const [id, arr] of rawShapes) {
    arr.sort((a, b) => a[0] - b[0]);
    const pts = arr.map(([, lat, lon]) => [lat, lon]);
    const simp = simplify(pts, SIMPLIFY_TOLERANCE).map(([lat, lon]) => [round(lat), round(lon)]);
    ptsBefore += pts.length;
    ptsAfter += simp.length;
    shapes[id] = simp;
  }
  rawShapes.clear();

  // 7) frequencies.txt — agrupado por linha/sentido (todas as trips, com service)
  console.log('Lendo frequencies.txt...');
  const frequencies = {};
  await readGtfs(inDir, 'frequencies.txt', (f) => {
    const t = trips.get(f.trip_id);
    if (!t) return;
    const byDir = (frequencies[t.routeId] ||= {});
    (byDir[t.dir] ||= []).push({
      start: hhmm(f.start_time),
      end: hhmm(f.end_time),
      headwayMin: Math.round(Number(f.headway_secs) / 60),
      service: t.service,
    });
  }, { required: false });
  for (const byDir of Object.values(frequencies)) {
    for (const k of Object.keys(byDir)) {
      // remove duplicados e ordena por serviço/horário
      const seen = new Set();
      byDir[k] = byDir[k]
        .filter((x) => { const s = `${x.service}|${x.start}|${x.end}|${x.headwayMin}`; return seen.has(s) ? false : seen.add(s); })
        .sort((a, b) => (a.service + a.start).localeCompare(b.service + b.start));
    }
  }

  // 8) calendar.txt
  const calendar = {};
  await readGtfs(inDir, 'calendar.txt', (c) => {
    calendar[c.service_id] = {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => Number(c[d] || 0)),
      start: c.start_date,
      end: c.end_date,
    };
  }, { required: false });

  // 9) Monta saídas
  const routesOut = [...routes.values()]
    .filter((r) => r.directions && r.directions.length)
    .map((r) => ({ ...r, directions: r.directions.sort((a, b) => a.dir - b.dir) }))
    .sort((a, b) => a.shortName.localeCompare(b.shortName, 'pt-BR', { numeric: true }));
  const stopRoutes = {};
  for (const [s, set] of stopRoutesSet) stopRoutes[s] = [...set].sort();

  const sizes = {
    'routes.json': writeJson(outDir, 'routes.json', routesOut),
    'stops.json': writeJson(outDir, 'stops.json', stops),
    'routeStops.json': writeJson(outDir, 'routeStops.json', routeStops),
    'stopRoutes.json': writeJson(outDir, 'stopRoutes.json', stopRoutes),
    'shapes.json': writeJson(outDir, 'shapes.json', shapes),
    'frequencies.json': writeJson(outDir, 'frequencies.json', frequencies),
    'calendar.json': writeJson(outDir, 'calendar.json', calendar),
  };
  const counts = {
    routes: routesOut.length,
    stops: stops.length,
    shapes: Object.keys(shapes).length,
    shapePointsBefore: ptsBefore,
    shapePointsAfter: ptsAfter,
  };
  sizes['meta.json'] = writeJson(outDir, 'meta.json', { generatedAt: new Date().toISOString(), counts, sizes });

  // 10) Relatório
  const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
  const total = Object.values(sizes).reduce((a, b) => a + b, 0);
  console.log('\nArquivos gerados em', outDir);
  for (const [k, v] of Object.entries(sizes)) console.log(`  ${k.padEnd(18)} ${mb(v)}`);
  console.log(`  ${'TOTAL'.padEnd(18)} ${mb(total)}`);
  console.log(`\nLinhas: ${counts.routes} | Paradas: ${counts.stops} | Shapes: ${counts.shapes}`);
  if (ptsBefore) console.log(`Pontos de shape: ${ptsBefore} -> ${ptsAfter} (${((1 - ptsAfter / ptsBefore) * 100).toFixed(1)}% a menos)`);
  console.log(`Concluído em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (total > SIZE_WARN_MB * 1024 * 1024) {
    console.warn(`\n(aviso) Total acima de ${SIZE_WARN_MB} MB. Aumente SIMPLIFY_TOLERANCE (ex.: 0.0001).`);
  }
}

main().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});