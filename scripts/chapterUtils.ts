import fetch from "node-fetch";
import { getTitleByNumber } from "./db/titleDatabaseHelper";
import { Title } from "./model/titlesTypes";
import { fetchTitleAndChapterCounts, TitleChapterCountsResult } from "./fetchTitleChapterCounts";
import { checksumXML, countWords, titleVersionsResponseToSummary } from "./commonUtils";
import type { TitleVersionsResponse, TitleVersionSummary } from "./model/ecfrTypesTitleVersions";

/**
 * Extract chapter info and section contents from the eCFR API structure.
 *
 * @param titleNumber CFR title number, e.g., 1
 * @param chapterId Chapter identifier, e.g., "I"
 * @param chapterTitle Expected chapter description, e.g., "Administrative Committee of the Federal Register"
 */
export async function extractChapterChecksum(
  title: Title,
  chapterId: string,
  agencySlug: string
): Promise<Title> {
  // Implementation intentionally removed.
  // This function previously queried the eCFR API and extracted chapter/section data.
  // Keep as a placeholder for callers; implement as needed.

  const targetTitle = title ? String(title.number) : String(title.number);

  console.log(`Extracting chapter checksum for Title ${title.number} Chapter ${chapterId} Agency ${agencySlug}`);

  let leafNodes: TitleChapterCountsResult = title.titleChapterCounts;
  if (!leafNodes) {
    console.log(
    `******* Fetching leaf nodes from eCFR API... ${JSON.stringify(leafNodes)}`
  );
    leafNodes = await fetchTitleAndChapterCounts(
      agencySlug,
      targetTitle,
      chapterId
    );
  }

  const parts = getPartsFromLeafNodes(leafNodes, title.number, chapterId);

  console.log(
    `Extracted parts for Title ${title.number} Chapter ${chapterId}:`,
    Array.from(parts)
  );


  const dateString = title.up_to_date_as_of ?? "latest";
  // let url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${title.number}.xml`;
  // console.log(`================================================`);
  
  // console.log(`getTitleStats :: Title ${JSON.stringify(title)}`);

  // const resFull = await fetch(url);
  // console.log(
  //   `getTitleStats :: Fetching full XML for Title ${title.number} (${title.name}) from ${url}`
  // );
  // if (!resFull.ok) throw new Error(`HTTP error: ${resFull.status}`);
  // const xmlFull = await resFull.text();
  // console.log(
  //   `getTitleStats :: Fetch FULL response status: ${xmlFull.length}`
  // );

  // let checksum = checksumXML(xmlFull);
  // let wordCount = countWords(xmlFull);

  // console.log(
  //   `FULL: Title ${title.number} Chapter ${chapterId} Checksum: ${checksum}, Word Count: ${wordCount}`
  // );

  let xmlBuffer: string = "";
  for (const part of parts) {
    let url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${title.number}.xml?chapter=${chapterId}&part=${part}`;
    console.log(
      `getTitleStats :: Fetching Chapter XML for Title ${title.number} (${title.name}) from ${url}`
    );
      const res = await fetch(url);
      console.log(`getTitleStats :: Fetching Chapter XML for Title ${JSON.stringify(res)} from ${res.status}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      xmlBuffer += await res.text();
      console.log(`getTitleStats :: ${part} Fetch response status: ${xmlBuffer.length}`);
  }

  // checksum = checksumXML(xmlBuffer);
  // wordCount = countWords(xmlBuffer);

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

  const url = `https://www.ecfr.gov/api/versioner/v1/versions/title-${title.number}.json?chapter=${encodeURIComponent(chapterId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

  const data: TitleVersionsResponse = await res.json();

  const versionSummary: TitleVersionSummary = titleVersionsResponseToSummary(
    data,
    title.number
  );

  const merged: Title = { ...title };
  // attach summary and agency slug when provided
  merged.versionSummary = versionSummary;
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
        metadata["title"]?.value === titleNumber &&
        metadata["chapter"]?.value === chapterId
      ) {
        const rawPartVal = metadata["part"]?.value;
        if (rawPartVal !== undefined && rawPartVal !== null) {
          parts.add(String(rawPartVal));
        }
      }
    }
  }
  return parts;
}

{
  // CLI usage example
  if (require.main === module) {
    // npx ts-node scripts/extractChapter.ts 5 LXXXIII "special-inspector-general-for-afghanistan-reconstruction"
    const [titleNumberArg, chapterId, agencySlug] = process.argv.slice(2);
    const titleNumber = Number(titleNumberArg);
    if (!titleNumberArg || !chapterId || !agencySlug) {
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
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    })();
  }
}
