import { expect } from 'chai';
import {
  countWords,
  checksumXML,
  combineHeading,
  buildUrl,
  walkHierarchy,
} from '../src/utils/commonUtils';

describe('commonUtils unit tests', () => {
  describe('countWords', () => {
    it('strips tags & entities and counts tokens', () => {
      const xml = '<doc>Hello <b>World</b>&amp; &nbsp; 123</doc>';
      // Expect tokens: Hello, World, 123 -> 3
      const n = countWords(xml);
      expect(n).to.equal(3);
    });
  });

  describe('checksumXML', () => {
    it('produces stable SHA256 for a given input', () => {
      const value = 'abc';
      // Known SHA256 for "abc"
      const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
      expect(checksumXML(value)).to.equal(expected);
    });
  });

  describe('combineHeading', () => {
    it('joins two different headings with a separator', () => {
      expect(combineHeading('A', 'B')).to.equal('A | B');
    });
    it('returns the non-empty value when one is empty', () => {
      expect(combineHeading('', 'B')).to.equal('B');
      expect(combineHeading('A', null)).to.equal('A');
    });
    it('returns empty string when both are empty', () => {
      expect(combineHeading('', null)).to.equal('');
    });
  });

  describe('buildUrl', () => {
    it('builds a title versions URL and encodes chapter param when provided', () => {
      const titleObj: any = { number: 5 };
      const urlNoTarget = buildUrl(titleObj as any);
      expect(urlNoTarget).to.equal('https://www.ecfr.gov/api/versioner/v1/versions/title-5.json');

      const target: any = { chapter: 'LXXXIII' };
      const urlWithChapter = buildUrl(titleObj as any, target);
      expect(urlWithChapter).to.equal('https://www.ecfr.gov/api/versioner/v1/versions/title-5.json?chapter=LXXXIII');
    });
  });

  describe('walkHierarchy', () => {
    it('extracts a leaf node and parses CFR reference and metadata', () => {
      const node = {
        level: 'title',
        heading: 'General Provisions',
        hierarchy_heading: 'Title 5',
        children: [
          {
            level: 'chapter',
            heading: 'Special Inspector',
            hierarchy_heading: 'Chapter LXXXIII',
            children: [
              {
                level: 'part',
                heading: 'Protection of Things',
                hierarchy_heading: 'Part 800',
                // leaf node: no children
              },
            ],
          },
        ],
      };

      const out = walkHierarchy(node as any);
      expect(out).to.be.an('array').with.length(1);
      const leaf = out[0] as any;
      expect(leaf.path).to.contain('Title 5');
      expect(leaf.path).to.contain('Chapter LXXXIII');
      expect(leaf.path).to.contain('Part 800');
      // CFR reference should have parsed title number and chapter
      expect(leaf.cfrReference).to.be.an('object');
      expect(leaf.cfrReference.title).to.equal(5);
      expect(leaf.cfrReference.chapter).to.equal('LXXXIII');
      expect(leaf.cfrReference.part).to.equal('800');
      // metadata should include title and chapter entries
      expect(leaf.metadata).to.have.property('title');
      expect(leaf.metadata).to.have.property('chapter');
      expect(leaf.metadata.title.displayHeading).to.be.a('string');
      expect(leaf.metadata.chapter.displayHeading).to.be.a('string');
    });
  });
});
