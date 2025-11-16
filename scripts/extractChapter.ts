import fetch from "node-fetch";
import { getTitleByNumber } from "./db/titleDetailsDatabaseHelper";
import { Title } from "./model/titlesTypes";
import { fetchTitleAndChapterCounts } from "./fetchTitleChapterCounts";

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

  const title : Title = await getTitleByNumber(titleNumber);

  const x = await fetchTitleAndChapterCounts(agencySlug, String(title.number), chapterId);

  console.log(JSON.stringify(x, null, 2));
}

// CLI usage example
if (require.main === module) {
  // npx ts-node scripts/extractChapter.ts 5 LXXXIII "special-inspector-general-for-afghanistan-reconstruction"
  const [titleNumberArg, chapterId, agencySlug] = process.argv.slice(2);
  const titleNumber = Number(titleNumberArg);
  if (!titleNumberArg || !chapterId || !agencySlug) {
    console.error(
      'Usage: npx ts-node scripts/extractChapter.ts <titleNumber> <chapterId> <agencySlug>'
    );
    process.exit(1);
  }
  extractChapterChecksum(titleNumber, chapterId, agencySlug).catch(console.error);
}
