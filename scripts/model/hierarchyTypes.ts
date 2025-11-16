// hierarchyTypes.ts
import type { CFRReference } from './agencyTypes';

// NOTE: `levels` and `headings` intentionally removed to avoid redundant
// payload. Consumers can reconstruct the list of level headings from the
// `metadata` field when necessary.
export interface HierarchyNode {
  path: string; // "Title 36 > Chapter VIII > Part 800 > Subpart B"
  type: string; // The deepest node's level (e.g., "subpart")
  count: number; // Modification count
  max_score: number; // Score if you want it
  // Optional top-level title associated with this hierarchy path (used by ecfrSummary)
  title?: string;
  // Parsed CFR reference extracted from the path segments (if available)
  cfrReference?: CFRReference;
  // Optional metadata map keyed by the level name. Each value is an
  // object capturing the level name, the heading at that level, the
  // raw path segment, and the parsed CFR value (if present). This
  // allows consumers to reconstruct levels/headings in order.
  metadata?: Record<
    string,
    {
      level: string;
      heading: string;
      path: string;
      value?: string | number;
    }
  >;
}
      // max_score: number; // Score if you want it

      // Optional top-level title associated with this hierarchy path (used by ecfrSummary)
