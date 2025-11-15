// fetchEcfrCorrectionsWithSummary.ts
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import path from 'path';
import {
  ECFRCorrectionsResponse,
  ECFRCorrectionsSummary
} from './model/ecfrCorrectionsTypes';
import { DATA_DIR } from './config';

export async function fetchCorrectionsWithSummary(titleNumber: number): Promise<{data: ECFRCorrectionsResponse; summary: ECFRCorrectionsSummary}> {
  const url = `https://www.ecfr.gov/api/admin/v1/corrections/title/${titleNumber}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: ECFRCorrectionsResponse = await res.json();

  const corrections = data.ecfr_corrections;
  const totalCorrections = corrections.length;
  const yearsCovered = Array.from(new Set(corrections.map(c => c.year))).sort();
  const sortedByDate = [...corrections].sort((a, b) => a.error_corrected.localeCompare(b.error_corrected));
  const firstCorrection = sortedByDate[0]?.error_corrected ?? null;
  const lastCorrection = sortedByDate[totalCorrections - 1]?.error_corrected ?? null;

  const actionsCount: Record<string, number> = {};
  const uniqueSectionsSet = new Set<string>();

  corrections.forEach(c => {
    actionsCount[c.corrective_action] = (actionsCount[c.corrective_action] || 0) + 1;
    c.cfr_references.forEach(ref => {
      if (ref.hierarchy.section) uniqueSectionsSet.add(ref.hierarchy.section);
    });
  });

  const summary: ECFRCorrectionsSummary = {
    title: titleNumber,
    totalCorrections,
    yearsCovered: yearsCovered as number[],
    firstCorrection,
    lastCorrection,
    actionsCount,
    uniqueSections: uniqueSectionsSet.size
  };

  return { data, summary };
}

async function main() {
  const titleNumber = Number(process.argv[2]) || 7;
  const { data, summary } = await fetchCorrectionsWithSummary(titleNumber);

  const output = {
    api: data,
    summary
  };

  // const fileName = path.join(DATA_DIR, `ecfr_title${titleNumber}_corrections_with_summary.json`);
  const fileName = path.join(DATA_DIR, `${titleNumber}__corrections_with_summary.json`);
  await fs.writeFile(path.join('.', fileName), JSON.stringify(output, null, 2));
  console.log(`Saved output to ${fileName}`);
  console.log('Summary:', summary);
}

main().catch(console.error);

