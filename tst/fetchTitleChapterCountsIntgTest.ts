import fetch from "node-fetch";
import { fetchTitleAndChapterCounts } from "../scripts/fetchTitleChapterCounts";

// Run this file directly to perform an integration check for advisory-council-on-historic-preservation Title 36 Chapter VIII
if (require.main === module) {
  (async () => {
    const agencySlug = process.argv[2] || 'advisory-council-on-historic-preservation';
    // Explicitly call with Title 36 and Chapter VIII as requested
    const title = process.argv[3] || '36';
    const chapter = process.argv[4] || 'VIII';

    try {
      const result = await fetchTitleAndChapterCounts(agencySlug, title, chapter || '');

      // Print result for visibility
      console.log('Result:', JSON.stringify(result, null, 2));

      // Validate expected values
      const expected = {
        title: '36',
        chapter: 'VIII',
        titleCount: 60,
        chapterCount: 60,
        titleDisplayHeading: 'Title 36 | Parks, Forests, and Public Property',
        chapterDisplayHeading: ' Chapter VIII | Advisory Council on Historic Preservation',
        rawFirstPath: 'Title 36 >  Chapter VIII > Part 800 > Subpart B',
      };

      const checks: Array<{ok: boolean; msg: string}> = [];

      checks.push({ ok: result.title === expected.title, msg: `title expected ${expected.title} got ${result.title}` });
      checks.push({ ok: result.chapter === expected.chapter, msg: `chapter expected ${expected.chapter} got ${result.chapter}` });
      checks.push({ ok: result.titleCount === expected.titleCount, msg: `titleCount expected ${expected.titleCount} got ${result.titleCount}` });
      checks.push({ ok: result.chapterCount === expected.chapterCount, msg: `chapterCount expected ${expected.chapterCount} got ${result.chapterCount}` });
      checks.push({ ok: result.titleDisplayHeading === expected.titleDisplayHeading, msg: `titleDisplayHeading expected "${expected.titleDisplayHeading}" got "${result.titleDisplayHeading}"` });
      checks.push({ ok: result.chapterDisplayHeading === expected.chapterDisplayHeading, msg: `chapterDisplayHeading expected "${expected.chapterDisplayHeading}" got "${result.chapterDisplayHeading}"` });

      // raw is an array; check first element path if present
      const firstRawPath = Array.isArray(result.raw) && result.raw.length > 0 && (result.raw[0] as any).path ? (result.raw[0] as any).path : null;
      checks.push({ ok: firstRawPath === expected.rawFirstPath, msg: `raw[0].path expected "${expected.rawFirstPath}" got "${firstRawPath}"` });

      const failed = checks.filter(c => !c.ok);
      if (failed.length) {
        console.error('Validation FAILED:');
        failed.forEach(f => console.error(' -', f.msg));
        process.exitCode = 2;
        return;
      }

      console.log('Validation PASSED — all expected values matched.');
      process.exitCode = 0;
    } catch (err) {
      console.error('Error running fetchTitleAndChapterCounts:', err);
      process.exitCode = 1;
    }
  })();
}