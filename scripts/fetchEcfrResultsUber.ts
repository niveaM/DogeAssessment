// fetchEcfrResultsUber.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import path from 'path';
import { ECFRResultsUberResponse, UberHierarchy } from './model/ecfrTypesUber';
import { DATA_DIR } from './config';

// Accept agency slugs as a comma-separated CLI argument. Usage:
//   ts-node fetchEcfrResultsUber.ts advisory-council-on-historic-preservation,another-slug
// If no argument is provided, fall back to the original slug used previously.
const DEFAULT_SLUGS = ['advisory-council-on-historic-preservation'];
const rawArg = process.argv[2];
const agencySlugs = rawArg && rawArg.length > 0 ? rawArg.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_SLUGS;

function buildApiUrl(slugs: string[], per_page = 1000, page = 1) {
  const base = 'https://www.ecfr.gov/api/search/v1/results';
  const params = new URLSearchParams();
  slugs.forEach(s => params.append('agency_slugs[]', s));
  params.set('per_page', String(per_page));
  params.set('page', String(page));
  params.set('order', 'relevance');
  params.set('paginate_by', 'results');
  return `${base}?${params.toString()}`;
}

const API_URL = buildApiUrl(agencySlugs);

function concatFields(...fields: (string | null | undefined)[]) {
  return Array.from(new Set(fields.filter(Boolean))).join(' | ');
}

function buildUberHierarchy(
  hierarchy: any,
  hierarchy_headings: any,
  headings: any
): UberHierarchy {
  return {
    title: concatFields(hierarchy?.title, hierarchy_headings?.title, headings?.title),
    subtitle: concatFields(hierarchy?.subtitle, hierarchy_headings?.subtitle, headings?.subtitle),
    chapter: concatFields(hierarchy?.chapter, hierarchy_headings?.chapter, headings?.chapter),
    subchapter: concatFields(hierarchy?.subchapter, hierarchy_headings?.subchapter, headings?.subchapter),
    part: concatFields(hierarchy?.part, hierarchy_headings?.part, headings?.part),
    subpart: concatFields(hierarchy?.subpart, hierarchy_headings?.subpart, headings?.subpart),
    subject_group: concatFields(hierarchy?.subject_group, hierarchy_headings?.subject_group, headings?.subject_group),
    section: concatFields(hierarchy?.section, hierarchy_headings?.section, headings?.section),
    appendix: concatFields(hierarchy?.appendix, hierarchy_headings?.appendix, headings?.appendix),
  };
}

async function fetchResultsUber() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();

    const resultsUber = data.results.map((res: any) => ({
      starts_on: res.starts_on,
      ends_on: res.ends_on,
      type: res.type,
      uber_hierarchy: buildUberHierarchy(res.hierarchy, res.hierarchy_headings, res.headings),
      full_text_excerpt: res.full_text_excerpt,
      score: res.score,
      structure_index: res.structure_index,
      reserved: res.reserved,
      removed: res.removed,
      change_types: res.change_types,
    }));

    const final: ECFRResultsUberResponse = {
      results: resultsUber,
      meta: data.meta,
    };

  // ensure data directory exists and write into it
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, `${agencySlugs.join('_')}_results_uber.json`);
  await fs.writeFile(outPath, JSON.stringify(final, null, 2));
  // Print total_count (from API meta) to stdout for quick access.
  const totalCount = data?.meta?.total_count ?? null;
  console.log(`Uber results written to ${outPath}`);
  console.log(`agency_slugs: ${agencySlugs.join(',')}`);
  console.log(`total_count: ${totalCount}`);
  } catch (err) {
    console.error('Error fetching ECFR results:', err);
  }
}

fetchResultsUber();
