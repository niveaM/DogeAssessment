// hierarchyTypes.ts
export interface HierarchyNode {
  path: string;              // "Title 36 > Chapter VIII > Part 800 > Subpart B"
  levels: string[];          // ["title", "chapter", "part", "subpart"]
  headings: string[];        // Headings at each level
  type: string;              // The deepest node's level (e.g., "subpart")
  count: number;             // Modification count
  max_score: number;         // Score if you want it
}

