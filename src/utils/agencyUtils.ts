// agencyUtils.ts
import fetch from "node-fetch";
import type {
  Agency,
  CFRReference,
  AgenciesResponse,
} from "../model/agencyTypes";
import type { Title } from "../model/titleTypes";
import type { HierarchyNode } from "../model/hierarchyTypes";
import { AGENCIES_TRUNCATE_LIMIT, ECFR_SEARCH_COUNTS_BASE, 
  ECFR_HIERARCHY_COUNTS_BASE, ECFR_AGENCIES_API_URL } from "../config";
import { getTitleByNumber } from "../db/titleDatabaseHelper";
import {
  clearAgencies,
  getDbPath,
  persistAgencies,
  getAgencyByShortName,
} from "../db/agencyDatabaseHelper";
import { fetchAndSaveTitles, loadTitlesMap } from "./titleUtils";
import { walkHierarchy } from "./commonUtils";

// Shared utilities for working with agency hierarchies and maps.
export type AgenciesMap = Record<string, Agency>;

// Fetch agencies from the given API URL, apply truncation per config, persist
// them to the local db, and return an array of keys (short_name) from the
// resulting agencies map. This centralizes fetch+truncate+persist logic so
// callers can operate on the list of agency keys.
export async function fetchAgencyList(): Promise<string[]> {
  if (!ECFR_AGENCIES_API_URL)
    throw new Error("fetchAgencyList requires an apiUrl");
  const res = await fetch(ECFR_AGENCIES_API_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: AgenciesResponse = await res.json();

  const fullAgenciesList =
    data && Array.isArray(data.agencies) ? data.agencies : [];
  // Use the repository-wide AGENCIES_TRUNCATE_LIMIT. A falsy or non-positive
  // value means "no truncation".
  const truncatedAgenciesList =
    AGENCIES_TRUNCATE_LIMIT > 0
      ? fullAgenciesList.slice(0, AGENCIES_TRUNCATE_LIMIT)
      : fullAgenciesList;
  if (truncatedAgenciesList.length !== fullAgenciesList.length) {
    console.log(
      `Truncating agencies list from ${fullAgenciesList.length} to ${truncatedAgenciesList.length} entries for processing`
    );
  }

  const agenciesMap: AgenciesMap = flattenAgencies(truncatedAgenciesList);

  // Clear existing agencies in db.json first, then persist the current
  // agencies derived from the agenciesMap (use Object.values to get an array).
  try {
    await clearAgencies();
    const agenciesToPersist: Agency[] = Object.values(agenciesMap);
    await persistAgencies(agenciesToPersist);
    console.info(
      `Cleared and persisted agencies to ${getDbPath()} (${
        agenciesToPersist.length
      } entries)`
    );
  } catch (err: any) {
    console.error(
      "Failed to clear/persist agencies to db.json:",
      err?.message || err
    );
  }

  // load titles from API
  loadTitlesMap();

  // Return the list of keys (short_name) for callers to use.
  return Object.keys(agenciesMap);
}

// Call ECFR and return an array of { title, count } for the given agency slug.
export async function getTitleCountsArray(
  agency_slug: string
): Promise<Array<{ title: number; count: number }>> {
  const ECFR_SEARCH_COUNTS_URL = `${ECFR_SEARCH_COUNTS_BASE}${encodeURIComponent(
    agency_slug
  )}`;
  const res = await fetch(ECFR_SEARCH_COUNTS_URL);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!data.titles || typeof data.titles !== "object") {
    return [];
  }

  return Object.entries(data.titles).map(([title, modificationCount]) => ({
    title: Number(title),
    count: Number(modificationCount),
  }));
}

// // Process an Agency object: call ECFR to get title counts for the agency's slug.
// export async function processAgency(agency: Agency): Promise<Array<{ title: number; count: number }>> {
//   if (!agency || !agency.slug) throw new Error('Agency object missing slug');
//   return getTitleCountsArray(agency.slug);
// }

// Return the search (modification) count for one title for the given agency.
export async function getSearchCountForTitle(
  agency: Agency,
  titleObj: Title
): Promise<number> {
  if (!agency || !agency.slug) throw new Error("Agency object missing slug");
  if (!titleObj || titleObj.number == null) return 0;
  const counts = await getTitleCountsArray(agency.slug);
  const match = counts.find((c) => Number(c.title) === Number(titleObj.number));
  return match ? Number(match.count) : 0;
}

// Process an agency identified by its `short_name` stored in the DB. The 
// function loads the agency from the DB, loads the titles map, and calls 
// `fetchAndSaveTitles` for each CFR reference.
export async function processAgencyByShortName(
  shortName: string
): Promise<void> {
  if (!shortName || String(shortName).trim().length === 0) {
    console.log(`Agency with short name '${shortName}' not valid.`);
    return;
  }
  const key = String(shortName).trim();
  const agency = await getAgencyByShortName(key);
  if (!agency) {
    console.log(`Agency with short name '${key}' not found.`);
    return;
  }

  console.log(
    `Processing CFR references for agency '${key}' (slug: ${agency.slug})`
  );
  if (Array.isArray(agency.cfr_references)) {
    for (const ref of agency.cfr_references as CFRReference[]) {
      const title = await getTitleByNumber(ref.title);
      try {
        console.log(
          `Fetching ${JSON.stringify(ref)} for agency '${agency.slug}'`
        );
        if (!title) {
          console.warn(
            `Title ${String(ref.title)} not found in titles.json — skipping`
          );
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        await fetchAndSaveTitles(title, ref, agency);
      } catch (err: any) {
        console.error(
          `Error processing title ${ref?.title} for agency ${agency.slug}:`,
          err?.message || err
        );
      }
    }
  } else {
    console.log(`No CFR references found for agency '${key}'.`);
  }
}

// Fetch and persist hierarchy paths for an agency slug.
export async function extractHierarchy(
  agency_slug: string
): Promise<HierarchyNode[]> {
  const api_url = `${ECFR_HIERARCHY_COUNTS_BASE}${encodeURIComponent(
    agency_slug
  )}`;
  const res = await fetch(api_url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.children)) {
    throw new Error("No hierarchy children found in response.");
  }

  const output: HierarchyNode[] = data.children.flatMap((node: any) =>
    walkHierarchy(node)
  );

  return output;
}

// walkHierarchy is provided by commonUtils

// Flatten a hierarchical list of agencies into a map by short_name.
function flattenAgencies(list: Agency[] = []): AgenciesMap {
  const map: AgenciesMap = {};
  function walk(items: Agency[], isChild = false) {
    for (const a of items) {
      a.isChild = isChild;
      const key = a.short_name;
      if (key && key.toString().trim().length > 0) {
        map[key] = a;
      }
      if (Array.isArray(a.children) && a.children.length) {
        walk(a.children, true);
      }
    }
  }
  walk(list, false);
  return map;
}
