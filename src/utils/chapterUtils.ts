import fetch from "node-fetch";
import { getTitleByNumber } from "../db/titleDatabaseHelper";
import { Title } from "../model/titleTypes";
import { fetchTitleAndChapterCounts } from "../../scripts/fetchTitleChapterCounts";
import type { TitleChapterCountsResult } from "../model/hierarchyTypes";
import { checksumXML, countWords, getTitleVersionSummary } from "./commonUtils";
import { ECFR_VERSIONER_BASE } from "../config";
import type { TitleVersionSummary } from "../model/titleTypes";

/**
 * Extract chapter info and section contents from the eCFR API structure.
 *
 * @param titleNumber CFR title number, e.g., 1
 * @param chapterId Chapter identifier, e.g., "I"
 * @param agencySlug Agency slug string, e.g., "environmental-protection-agency"
 * @returns Title object with checksum and wordCount properties populated.
 */
export async function extractChapterChecksum (
  title: Title,
  chapterId: string,
  agencySlug: string
): Promise<Title> {
  const targetTitle = title ? String(title.number) : String(title.number);
  console.debug(
    `Extracting chapter checksum for Title ${title.number} Chapter ${chapterId} Agency ${agencySlug}`
  );

  let leafNodes: TitleChapterCountsResult = title.titleChapterCounts;
  if (!leafNodes) {
    leafNodes = await fetchTitleAndChapterCounts(
      agencySlug,
      targetTitle,
      chapterId
    );
  }

  const parts = getPartsFromLeafNodes(leafNodes, title.number, chapterId);

  console.debug(
    `Extracted parts for Title ${title.number} Chapter ${chapterId}:`,
    Array.from(parts)
  );

  const dateString = title.up_to_date_as_of ?? "latest";
  
  let xmlBuffer: string = "";
  for (const part of parts) {
    const url = `${ECFR_VERSIONER_BASE}${dateString}/title-${title.number}.xml?chapter=${chapterId}&part=${part}`;
    console.log(
      `extractChapterChecksum :: Fetching Chapter XML for Title ${title.number} (${title.name}) from ${url}`
    );
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    xmlBuffer += await res.text();
    console.log(
      `extractChapterChecksum :: ${part} Fetch response status: ${xmlBuffer.length}`
    );
  }

  const merged: Title = { ...title };
  merged.checksum = checksumXML(xmlBuffer);
  merged.wordCount = countWords(xmlBuffer);

  console.log(
    `Title ${title.number} Chapter ${chapterId} Checksum: ${merged.checksum}, Word Count: ${merged.wordCount}`
  );

  // Further processing and checksum calculation would go here.

  return merged;
}

/**
 * Fetch version information for a specific chapter and produce a
 * TitleVersionSummary attached to the returned Title object.
 */
export async function extractChapterVersionSummary(
  title: Title,
  chapterId: string,
  agencySlug: string
): Promise<Title> {
  console.log(`Extracting chapter version summary for Title ${title.number} Chapter ${chapterId} Agency ${agencySlug}`);

  let versionSummary: TitleVersionSummary = await getTitleVersionSummary(
    title.number,
    chapterId
  );

  let leafNodes: TitleChapterCountsResult = title.titleChapterCounts;
  if (!leafNodes) {
    leafNodes = await fetchTitleAndChapterCounts(
      agencySlug,
      title.number ? String(title.number) : '',
      chapterId
    );
  }

  const parts = getPartsFromLeafNodes(leafNodes, title.number, chapterId);
  console.log(
    `Extracted parts for Title ${title.number} Chapter ${chapterId}:`,
    Array.from(parts)
  );

  let summaryList: TitleVersionSummary[] = [];
  for (const part of parts) {
    const versionSummary: TitleVersionSummary = await getTitleVersionSummary(
      title.number,
      chapterId,
      part
    );
    summaryList.push(versionSummary);
  }
  
  // Merge per-part summaries into a single aggregated summary for the chapter.
  // Rules:
  // - titleNumber & chapterId are unique (use the current title/chapter)
  // - totalVersions is the sum of all part summaries' totalVersions
  // - firstDate is the earliest date across summaries
  // - lastDate is the latest date across summaries
  // - uniqueParts is computed as the set of distinct `part` values present
  // - uniqueSubparts is accumulated (sum of per-summary uniqueSubparts)
  // - typeCounts are merged by summing counts per type
  // Start with the chapter-level summary as the default aggregated summary.
  // We'll replace it with a true aggregation if per-part summaries exist.
  let aggregatedSummary: TitleVersionSummary = versionSummary;
  if (summaryList.length > 0) {
    const totalVersions = summaryList.reduce((acc, s) => acc + (s.totalVersions || 0), 0);
    let firstDate = '';
    let lastDate = '';
    const partSet = new Set<string>();
    let uniqueSubpartsSum = 0;
    const typeCounts: Record<string, number> = {};

    for (const s of summaryList) {
      if (s.firstDate) {
        if (!firstDate || s.firstDate < firstDate) firstDate = s.firstDate;
      }
      if (s.lastDate) {
        if (!lastDate || s.lastDate > lastDate) lastDate = s.lastDate;
      }
      if (s.parts && Array.isArray(s.parts)) {
        for (const p of s.parts) partSet.add(p);
      }
      uniqueSubpartsSum += s.uniqueSubparts || 0;
      if (s.typeCounts) {
        for (const [k, v] of Object.entries(s.typeCounts)) {
          typeCounts[k] = (typeCounts[k] || 0) + (v || 0);
        }
      }
    }

    aggregatedSummary = {
      titleNumber: title.number,
      totalVersions,
      firstDate: firstDate || (versionSummary.firstDate ?? ""),
      lastDate: lastDate || (versionSummary.lastDate ?? ""),
      uniqueParts: partSet.size,
      uniqueSubparts: uniqueSubpartsSum,
      typeCounts,
      chapterId,
      // keep raw per-part summaries for debugging/inspection
      raw: summaryList,
      // also provide an aggregated array of part identifiers
      parts: Array.from(partSet),
    };
  }

  const merged: Title = { ...title };
  // attach summary and agency slug when provided
  merged.versionSummary = aggregatedSummary;
  if (agencySlug) merged.agencySlug = agencySlug;

  return merged;
}

function getPartsFromLeafNodes(
  leafNodes: TitleChapterCountsResult,
  titleNumber: number,
  chapterId: string
) {
  const parts = new Set<string>();
  if (leafNodes && leafNodes.raw) {
    for (const node of leafNodes.raw) {
      const metadata = node.metadata;
      if (
        metadata &&
        String(metadata["title"]?.value) === String(titleNumber) &&
        metadata["chapter"]?.value === chapterId
      ) {
        const rawPartVal = metadata["part"]?.value;
        if (rawPartVal !== undefined && rawPartVal !== null) {
          parts.add(String(rawPartVal));
        }
      } else {
        console.error(`${titleNumber} / ${chapterId}`);
        console.error(
          `XXXXXXXXXX Skipping node for title/chapter mismatch: ${metadata["title"]?.value} / ${metadata["chapter"]?.value}`
        );
      }
    }
  }
  return parts;
}

/**
 * Command line interface: extract chapter info and compute checksum and 
 * version summary. This can be invoked directly for manual testing and was 
 * used during development to facilitate quick checks and debugging.
 */
{
  // CLI usage example
  if (require.main === module) {
    // npx ts-node scripts/extractChapter.ts 5 LXXXIII "special-inspector-general-for-afghanistan-reconstruction"
    const [titleNumberArg, chapterIdArg, agencySlugArg] = process.argv.slice(2);
    const titleNumber = Number(titleNumberArg) || 5;
    const chapterId = chapterIdArg || "LXXXIII";
    const agencySlug = agencySlugArg || "special-inspector-general-for-afghanistan-reconstruction";
    if (!titleNumber || !chapterId || !agencySlug) {
      console.error(
        "Usage: npx ts-node scripts/extractChapter.ts <titleNumber> <chapterId> <agencySlug>"
      );
      process.exit(1);
    }
    // Resolve the Title object and then invoke the extraction helper which
    // expects a Title instance as the first argument.
    (async () => {
      try {
        const title = await getTitleByNumber(titleNumber);
        if (!title) {
          console.error(`Title ${titleNumber} not found in local DB`);
          process.exit(1);
        }
        await extractChapterChecksum(title, chapterId, agencySlug);
        await extractChapterVersionSummary(title, chapterId, agencySlug);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    })();
  }
}
