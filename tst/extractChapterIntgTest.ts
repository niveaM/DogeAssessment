import { expect } from 'chai';
import { getTitleByNumber } from '../src/db/titleDatabaseHelper';
import {
  extractChapterChecksum,
  extractChapterVersionSummary,
} from '../src/utils/chapterUtils';

// Integration test for extractChapter helpers
describe('extractChapter integration', function () {
  this.timeout(60000);

  it('processes Title 5 Chapter LXXXIII for SIGAR', async () => {
    const titleNumber = 5;
    const chapterId = 'LXXXIII';
    const agencySlug = 'special-inspector-general-for-afghanistan-reconstruction';

    const title = await getTitleByNumber(titleNumber);
    expect(title, `expected title ${titleNumber} present in local DB`).to.exist;

    // Run checksum extraction — this will fetch the parts and download XML fragments
    const checksumResult = await extractChapterChecksum(title as any, chapterId, agencySlug);
    expect(checksumResult).to.be.an('object');
    expect(checksumResult.checksum, 'checksum should be a non-empty string').to.be.a('string').and.to.have.length.greaterThan(0);
    expect(checksumResult.wordCount, 'wordCount should be a positive number').to.be.a('number').and.to.be.greaterThan(0);

    // Run version summary extraction — should attach a versionSummary and agencySlug
    const versioned = await extractChapterVersionSummary(title as any, chapterId, agencySlug);
    expect(versioned).to.be.an('object');
    expect(versioned.versionSummary, 'versionSummary should be present').to.be.an('object');
    expect(versioned.versionSummary.titleNumber).to.equal(titleNumber);
    expect(versioned.versionSummary.chapterId).to.equal(chapterId);
    // agencySlug should be attached to the returned Title object
    expect(versioned.agencySlug).to.equal(agencySlug);

    // Some basic structure checks on the aggregated summary
    const vs = versioned.versionSummary as any;
    expect(vs.totalVersions).to.be.a('number');
    expect(vs.parts).to.be.an('array');
  });
});
