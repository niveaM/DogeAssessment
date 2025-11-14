// titleUtils.ts
import fetch from 'node-fetch';
import * as crypto from 'crypto';

// Strip XML tags and count words
export function countWords(xml: string): number {
  const text = xml.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

export function checksumXML(xml: string): string {
  return crypto.createHash('sha256').update(xml).digest('hex');
}

// Core: fetch XML, compute summary, return object
export async function getTitleSummary(titleNumber: number, dateString: string) {
  const url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${titleNumber}.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const xml = await res.text();

  return {
    titleNumber,
    dateString,
    checksum: checksumXML(xml),
    wordCount: countWords(xml)
  };
}

