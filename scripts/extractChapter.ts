import fetch from "node-fetch";
import { getTitleByNumber } from "./db/titleDatabaseHelper";
import { Title } from "./model/titlesTypes";
import { fetchTitleAndChapterCounts, TitleChapterCountsResult } from "./fetchTitleChapterCounts";
import { checksumXML, countWords } from "./titleUtils";

interface ECFRNode {
  identifier: string;
  label: string;
  label_level: string;
  label_description: string;
  reserved?: boolean;
  type?: string;
  children?: ECFRNode[];
  [key: string]: any;
}

/**
 * Extract chapter info and section contents from the eCFR API structure.
 *
 * @param titleNumber CFR title number, e.g., 1
 * @param chapterId Chapter identifier, e.g., "I"
 * @param chapterTitle Expected chapter description, e.g., "Administrative Committee of the Federal Register"
 */
export async function extractChapterChecksum(
  titleNumber: number,
  chapterId: string,
  agencySlug: string
): Promise<void> {
  // Implementation intentionally removed.
  // This function previously queried the eCFR API and extracted chapter/section data.
  // Keep as a placeholder for callers; implement as needed.

  const title: Title | undefined = await getTitleByNumber(titleNumber);

  const targetTitle = title ? String(title.number) : String(titleNumber);

  const leafNodes: TitleChapterCountsResult = await fetchTitleAndChapterCounts(
    agencySlug,
    targetTitle,
    chapterId
  );

  console.log(JSON.stringify(leafNodes, null, 2));
  const parts = getPartsFromLeafNodes(leafNodes, titleNumber, chapterId);

  console.log(
    `Extracted parts for Title ${titleNumber} Chapter ${chapterId}:`,
    Array.from(parts)
  );


  const dateString = title.up_to_date_as_of ?? "latest";
  let url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${titleNumber}.xml`;
  console.log(`================================================`);
  
      console.log(`getTitleStats :: Title ${JSON.stringify(title)}`);
  
      const resFull = await fetch(url);
      console.log(
        `getTitleStats :: Fetching full XML for Title ${title.number} (${title.name}) from ${url}`
      );
      if (!resFull.ok) throw new Error(`HTTP error: ${resFull.status}`);
      const xmlFull = await resFull.text();
      console.log(
        `getTitleStats :: Fetch FULL response status: ${xmlFull.length}`
      );

      let checksum = checksumXML(xmlFull);
      let wordCount = countWords(xmlFull);

      console.log(
        `FULL: Title ${titleNumber} Chapter ${chapterId} Checksum: ${checksum}, Word Count: ${wordCount}`
      );

  let xmlBuffer: string = "";
  for (const part of parts) {
    let url = `https://www.ecfr.gov/api/versioner/v1/full/${dateString}/title-${titleNumber}.xml?chapter=${chapterId}&part=${part}`;

    console.log(
      `getTitleStats :: Fetching Chapter XML for Title ${title.number} (${title.name}) from ${url}`
    );
      const res = await fetch(url);
      console.log(`getTitleStats :: Fetching Chapter XML for Title ${JSON.stringify(res)} from ${res.status}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      xmlBuffer += await res.text();
      console.log(`getTitleStats :: ${part} Fetch response status: ${xmlBuffer.length}`);
  }

  checksum = checksumXML(xmlBuffer);
  wordCount = countWords(xmlBuffer);

  console.log(`Title ${titleNumber} Chapter ${chapterId} Checksum: ${checksum}, Word Count: ${wordCount}`);

  // Further processing and checksum calculation would go here.
}

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
  extractChapterChecksum(titleNumber, chapterId, agencySlug).catch(
    console.error
  );
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
