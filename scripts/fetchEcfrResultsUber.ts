// fetchEcfrResultsUber.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import { ECFRResultsUberResponse, UberHierarchy } from './model/ecfrTypesUber';

const API_URL =
  'https://www.ecfr.gov/api/search/v1/results?agency_slugs%5B%5D=advisory-council-on-historic-preservation&per_page=20&page=1&order=relevance&paginate_by=results';

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
    const outPath = '../data/acph_results_uber.json';
    await fs.writeFile(outPath, JSON.stringify(final, null, 2));
    console.log(`Uber results written to ${outPath}`);
  } catch (err) {
    console.error('Error fetching ECFR results:', err);
  }
}

fetchResultsUber();
