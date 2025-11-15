// titleUtils.ts
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import type { Title } from './model/titlesTypes';

// Strip XML tags and count words
export function countWords(xml: string): number {
  const text = xml.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

export function checksumXML(xml: string): string {
  return crypto.createHash('sha256').update(xml).digest('hex');
}

// Core: fetch XML, compute summary, return typed TitleSummary
// Now accepts the raw Title object, fetches the full XML, computes checksum/wordCount
// and returns the merged Title object (original fields + summary fields).
export async function getTitleSummary(titleObj: Title, agencySlug?: string): Promise<Title> {
  const dateString = titleObj.latest_issue_date ?? 'latest';
  const url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${titleObj.number}.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const xml = await res.text();

  const checksum = checksumXML(xml);
  const wordCount = countWords(xml);

  const merged: Title = { ...titleObj };
  merged.checksum = checksum;
  merged.wordCount = wordCount;
  merged.dateString = titleObj.latest_issue_date;
  if (agencySlug) merged.agencySlug = agencySlug;

  if (merged.dateString !== titleObj.latest_issue_date) {
    merged.dateStringMismatch = {
      latest_issue_date: titleObj.latest_issue_date,
      summary_dateString: merged.dateString
    };
  }

  return merged;
}

