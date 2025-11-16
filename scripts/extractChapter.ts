import fetch from "node-fetch";

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
  titleNumber: string | number,
  chapterId: string,
  chapterTitle: string
): Promise<void> {
  const url = `https://www.ecfr.gov/api/versioner/v1/structure/2025-09-30/title-${titleNumber}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const parsed: { children: ECFRNode[] } = await res.json();
  const chapters = parsed.children || [];

  // Find the matching chapter node
  const chapter = chapters.find(
    (c) =>
      c.identifier === chapterId &&
      (c.label_description
        ?.toLowerCase()
        .includes(chapterTitle.toLowerCase()) ||
        c.label?.toLowerCase().includes(chapterTitle.toLowerCase()))
  );

  if (!chapter) {
    console.log(`Chapter ${chapterId} with title "${chapterTitle}" not found.`);
    return;
  }

  // Display outputs
  const chapterText = chapter.label_level.trim();
  const descText = chapter.label_description.trim();

  console.log("Chapter text:", chapterText);
  console.log("Description text:", descText);

  // Recursively collect all descendant sections under this chapter
  function collectSections(node: ECFRNode): ECFRNode[] {
    let sections: ECFRNode[] = [];
    if (node.type === "section") {
      sections.push(node);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        sections = sections.concat(collectSections(child));
      }
    }
    return sections;
  }
  const allSections = collectSections(chapter);

  allSections.forEach((sec) => {
    console.log("\nSection:", sec.label);
    if (sec.label_description)
      console.log("Description:", sec.label_description);
    if (sec.received_on) console.log("Received on:", sec.received_on);
    // Display other fields as needed
  });
}

// CLI usage example
if (require.main === module) {
  // npx ts-node extractChapter.ts 1 I "Administrative Committee of the Federal Register"
  const [titleNumber, chapterId, ...chapterTitleParts] = process.argv.slice(2);
  const chapterTitle = chapterTitleParts.join(" ") || "";
  extractChapter(titleNumber, chapterId, chapterTitle).catch(console.error);
}
