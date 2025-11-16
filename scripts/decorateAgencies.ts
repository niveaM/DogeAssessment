import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { Agency } from './model/agencyTypes';

/**
 * Stub script: read `data/agencies.json`, iterate and "decorate" each agency
 * with display-ready fields, then write a new JSON file.
 *
 * This file is intentionally a stub with helpful TODOs where real logic
 * should be implemented.
 */

// Minimal types — replace or expand to match the real `agencies.json` schema.
// We'll augment and return the project's `Agency` type directly.

const AGENCIES_PATH = path.join(process.cwd(), 'data', 'agencies.json');
const OUT_PATH = path.join(process.cwd(), 'data', 'agencies.decorated.json');

// We trust `agencies.json` is already a map keyed by acronym -> Agency.
export async function loadAgencies(filePath = AGENCIES_PATH): Promise<Record<string, Agency>> {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, Agency>;
  return parsed;
}

/**
 * Convert a raw agency record to the DisplayAgency shape.
 * Replace and expand the logic below to match your UI needs.
 */
export function decorateAgency(raw: Agency, acronymKey: string): Agency {
  // decorate in-place: derive a short summary from CFR refs and attach breadcrumbs/_raw
  const id = raw.slug ?? raw.sortable_name ?? raw.display_name ?? raw.name ?? 'unknown-agency';
  const name = raw.display_name ?? raw.name ?? 'Unknown Agency';

  let summary: string | null = null;
  if (Array.isArray(raw.cfr_references) && raw.cfr_references.length > 0) {
    const first = raw.cfr_references[0];
    const parts = [first.title, first.subtitle, first.subchapter, first.chapter, first.part].filter(Boolean);
    summary = `CFR: ${parts.join(' - ')}`;
  }

  // Ensure short_name reflects the map key (acronym) if it's missing
  const shortName = raw.short_name ?? acronymKey;

  const decorated: Agency = {
    ...raw,
    slug: id,
    display_name: name,
    short_name: shortName,
    summary,
    _raw: raw,
  };

  return decorated;
}

// Not needed: we work with the map directly.
// export async function buildDisplayData(...) { ... }

/**
 * Build a map keyed by agency id. If an id collision or missing id occurs,
 * fall back to a generated key using the index.
 */
export async function buildDecoratedMap(filePath = AGENCIES_PATH) {
  const rawMap = await loadAgencies(filePath);
  const out: Record<string, Agency> = {};
  for (const [key, agency] of Object.entries(rawMap)) {
    // assume `key` is the acronym; normalize it so consumers get consistent keys
    const normalizedKey = String(key).trim().toUpperCase().replace(/\s+/g, '');
    const decorated = decorateAgency(agency, normalizedKey);
    out[normalizedKey] = decorated;
  }
  return out;
}

// We no longer produce an array output; keep writeDecoratedMap only.

export async function writeDecoratedMap(outPath = path.join(process.cwd(), 'data', 'agencies.decorated.map.json'), mapData?: Record<string, Agency>) {
  const payload = mapData ?? (await buildDecoratedMap());
  await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

// CLI entry: run `ts-node scripts/decorateAgencies.ts` or compile and run.
if (require.main === module) {
  (async () => {
    try {
      console.log('Loading agencies from', AGENCIES_PATH);
    //   const outArray = await writeDecorated();
    //   console.log('Wrote decorated agencies (array) to', outArray);
      const outMap = await writeDecoratedMap();
      console.log('Wrote decorated agencies (map) to', outMap);
    } catch (err) {
      console.error('Error decorating agencies:', err);
      process.exit(1);
    }
  })();
}
