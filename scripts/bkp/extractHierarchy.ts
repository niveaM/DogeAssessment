// extractHierarchy.ts
import * as fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './../config';

// Get agency_slug from CLI args, default to "advisory-council-on-historic-preservation"
const agency_slug = process.argv[2] || 'advisory-council-on-historic-preservation';

(async () => {
  // try {
  //   const output = await extractHierarchy(agency_slug);
  //   await fs.mkdir(DATA_DIR, { recursive: true });
  //   const fileName = path.join(DATA_DIR, `${agency_slug}_hierarchy_paths.json`);
  //   await fs.writeFile(fileName, JSON.stringify(output, null, 2));
  //   console.log(`Extracted ${output.length} hierarchy paths (see ${fileName}).`);
  // } catch (err) {
  //   console.error('Error extracting hierarchy:', err);
  //   process.exitCode = 1;
  // }
})();

