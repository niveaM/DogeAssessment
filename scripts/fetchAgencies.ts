// fetchAgencies.ts
import { fetchAgencyList as fetchAgencyKeys, processAgencyByShortName } from "./agencyUtils";
import { DATA_DIR } from "./config";

// Allow passing an optional agency short name as the first CLI argument.
const shortNameArg = process.argv[2];
fetchAndSaveAgencies(shortNameArg).catch((err) => {
  console.error("Error fetching agencies:", err);
});

async function fetchAndSaveAgencies(agencyShortName?: string) {
  
  if (agencyShortName) {
    // processAgencyByShortName may perform I/O, so await it.
    // eslint-disable-next-line no-await-in-loop
    await processAgencyByShortName(agencyShortName);
  } else {
    // Fetch agencies (this persists agencies into the repo DB) and get the
    // list of agency keys. Then load the persisted agencies from the DB and
    // reconstruct a map keyed by short_name for downstream processing.
    const agencyKeys: string[] = await fetchAgencyKeys();

    // No specific agency requested: process all agencies sequentially.
    // Sequential processing avoids overwhelming upstream services or local I/O.
    // Prefer the keys returned by fetchAgencyList (they reflect truncation),
    // but fall back to the reconstructed agenciesMap keys if needed.
    for (const key of agencyKeys) {
      try {
          // eslint-disable-next-line no-await-in-loop
          await processAgencyByShortName(key);
        } catch (err: any) {
          console.error(`Error processing agency '${key}':`, err?.message || err);
        }
    }
  }
}
