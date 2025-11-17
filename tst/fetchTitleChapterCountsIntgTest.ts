import { expect } from 'chai';
import { fetchTitleAndChapterCounts } from "../scripts/fetchTitleChapterCounts";

// Mocha integration test
describe('fetchTitleAndChapterCounts integration', function () {
  // allow network latency
  this.timeout(20000);

  it('fetches counts for advisory-council-on-historic-preservation Title 36 Chapter VIII', async () => {
    const agencySlug = 'advisory-council-on-historic-preservation';
    const title = '36';
    const chapter = 'VIII';

    const result = await fetchTitleAndChapterCounts(agencySlug, title, chapter);

    expect(result).to.be.an('object');
    expect(result.title).to.equal('36');
    expect(result.chapter).to.equal('VIII');
    expect(result.titleCount).to.equal(60);
    expect(result.chapterCount).to.equal(60);
    expect(result.titleDisplayHeading).to.equal('Title 36 | Parks, Forests, and Public Property');
    expect(result.chapterDisplayHeading).to.equal(' Chapter VIII | Advisory Council on Historic Preservation');

    expect(Array.isArray(result.raw)).to.be.true;
    if (result.raw.length > 0) {
      const firstPath = (result.raw[0] as any).path;
      expect(firstPath).to.equal('Title 36 >  Chapter VIII > Part 800 > Subpart B');
    }
  });
});

// Keep a CLI fallback for manual invocation
if (require.main === module) {
  // Run the same check and print results
  (async () => {
    try {
      const res = await fetchTitleAndChapterCounts('advisory-council-on-historic-preservation', '36', 'VIII');
      console.log(JSON.stringify(res, null, 2));
    } catch (err) {
      console.error(err);
      process.exitCode = 1;
    }
  })();
}