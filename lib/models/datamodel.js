// Internal data model and mappers for Agency data
// Keep this file small and resilient to varying upstream shapes.

/*
  Internal Agency shape (example):
  {
    id: string | number,
    name: string,
    slug: string,
    shortName: string | null,
    parent: string | null,
    website: string | null,
    description: string | null,
    raw: object // original upstream object for debugging
  }
*/

function safeString(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") return v.trim() || null;
  return String(v);
}

function makeSlug(s) {
  if (!s) return null;
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapAgency(source) {
  if (!source || typeof source !== "object") return null;

  // Try several common field names used in upstream payloads.
  const id = source.id || source._id || source.agency_id || source.code || null;
  const name =
    source.name ||
    source.display_name ||
    source.title ||
    source.agency_name ||
    source.agency_title ||
    null;
  const displayName = source.display_name || source.displayName || null;
  const sortableName = source.sortable_name || source.sortableName || null;
  const slug =
    source.slug ||
    source.agency_slug ||
    source.short_name ||
    (name ? makeSlug(name) : null);
  const shortName = source.short_name || source.acronym || source.short || null;
  const parent = source.parent || source.parent_agency || null;
  const website = source.website || source.url || source.homepage || null;
  const description = source.description || source.desc || source.note || null;

  // cfr references sometimes appear as `cfr_references`
  const cfrReferences = Array.isArray(source.cfr_references)
    ? source.cfr_references
    : Array.isArray(source.cfrReferences)
    ? source.cfrReferences
    : undefined;

  // children may be present; map recursively
  let children = undefined;
  if (Array.isArray(source.children) && source.children.length > 0) {
    children = source.children.map((child) => mapAgency(child)).filter(Boolean);
  }

  return {
    id: id == null ? null : id,
    name: safeString(name),
    displayName: safeString(displayName),
    sortableName: safeString(sortableName),
    slug: safeString(slug),
    shortName: safeString(shortName),
    parent: safeString(parent),
    children: children,
    cfrReferences: cfrReferences,
    website: safeString(website),
    description: safeString(description),
    raw: source,
  };
}

module.exports = {
  mapAgency,
};
