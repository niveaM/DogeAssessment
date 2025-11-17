const { useState, useEffect } = React;

// helpers to read title metadata from different possible shapes
function getWordCount(t) {
  if (!t) return null;
  if (t.wordCount != null) return t.wordCount;
  if (t.wordcount != null) return t.wordcount;
  if (t.titleChapterCounts && t.titleChapterCounts.wordCount != null)
    return t.titleChapterCounts.wordCount;
  if (t.metadata && (t.metadata.wordCount != null || t.metadata.wordcount != null))
    return t.metadata.wordCount != null ? t.metadata.wordCount : t.metadata.wordcount;
  return null;
}

function getChecksum(t) {
  if (!t) return null;
  if (t.checksum != null) return t.checksum;
  if (t.check_sum != null) return t.check_sum;
  if (t.titleChapterCounts && t.titleChapterCounts.checksum != null)
    return t.titleChapterCounts.checksum;
  if (t.metadata && (t.metadata.checksum != null || t.metadata.check_sum != null))
    return t.metadata.checksum != null ? t.metadata.checksum : t.metadata.check_sum;
  return null;
}

// Agency detail view: fetches search results for a given agency slug and displays them
function AgencyDetail({ slug, shortName, onBack }) {
  const [titles, setTitles] = useState([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(null);
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/details?slug=${encodeURIComponent(slug)}&page=1`
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || res.status);
        }
  const j = await res.json();
  setRaw(j);
  setAgency(j && j.agency ? j.agency : null);
  const titlesArr = Array.isArray(j && j.titles) ? j.titles : [];
  setTitles(titlesArr);
  // auto-select first title when available
  if (titlesArr.length > 0) setSelectedTitleIndex(0);
  else setSelectedTitleIndex(null);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function toggleExpand(k) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function renderCfrReferences(refs) {
    if (!Array.isArray(refs) || refs.length === 0)
      return <div style={{ color: "#777" }}>(no CFR references)</div>;
    return (
      <div className="cfr-subtable-wrap">
        <table className="cfr-table">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>#</th>
              <th>Title / Citation</th>
              <th style={{ width: "160px" }}>Chapter/Part</th>
            </tr>
          </thead>
          <tbody>
            {refs.map((r, i) => (
              <tr key={i}>
                <td style={{ verticalAlign: "top" }}>{i + 1}</td>
                <td style={{ verticalAlign: "top" }}>
                  {r.title || r.citation || JSON.stringify(r)}
                </td>
                <td style={{ verticalAlign: "top" }}>
                  {r.chapter || r.part || r.section || r.citation || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const filtered = titles.filter((t) => {
    if (!query) return true;
    const s = JSON.stringify(t || {}).toLowerCase();
    return s.includes(query.toLowerCase());
  });

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>
          Agency:{" "}
          {agency
            ? agency.name || agency.display_name || agency.title || slug
            : slug}{" "}
          {shortName ? `(${shortName})` : ""}
        </h1>
        {/* back button removed */}
      </div>

      {/* <div className="toolbar" style={{ marginTop: 12 }}>
        <input
          placeholder="Filter titles (search text)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="small-btn" onClick={() => setShowRaw((s) => !s)}>
          {showRaw ? "Hide raw" : "Show raw"}
        </button>
      </div> */}

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">Error: {error}</div>}

      <div
        style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}
      >
        <div className="detail-block" style={{ flex: "1 1 360px" }}>
          <h3 style={{ marginTop: 0 }}>Agency details</h3>
          <div className="kv-list">
            <div>
              <strong>Slug:</strong>{" "}
              {agency && agency.slug ? agency.slug : "(n/a)"}
            </div>
            <div>
              <strong>Name:</strong>{" "}
              {agency && (agency.name || agency.display_name)
                ? agency.name || agency.display_name
                : "(n/a)"}
            </div>
            <div>
              <strong>Short name:</strong>{" "}
              {agency && (agency.short_name || agency.acronym)
                ? agency.short_name || agency.acronym
                : "(n/a)"}
            </div>
            <div>
              <strong>Website:</strong>{" "}
              {agency && agency.website ? (
                <a href={agency.website} target="_blank" rel="noreferrer">
                  {agency.website}
                </a>
              ) : (
                "(n/a)"
              )}
            </div>
            <div>
              <strong>CFR refs:</strong>{" "}
              {Array.isArray(agency && agency.cfr_references)
                ? agency.cfr_references.length
                : 0}
            </div>
          </div>
        </div>

        <div className="detail-block" style={{ flex: "2 1 560px" }}>
          <h3 style={{ marginTop: 0 }}>Titles [#{filtered.length}]</h3>
          {filtered.length === 0 ? (
            <div className="empty">No titles found.</div>
          ) : (
            <div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 14 }}>
                  <b> View title:&nbsp;</b>
                  <select
                    value={selectedTitleIndex == null ? "" : selectedTitleIndex}
                    onChange={(e) =>
                      setSelectedTitleIndex(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  >
                    <option value="">(none)</option>
                    {filtered.map((t, i) => (
                      <option key={i} value={i}>
                        {t.number
                          ? `Title ${t.number} — ${t.name || t.title || ""}`
                          : t.title || t.name || `item ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedTitleIndex != null && filtered[selectedTitleIndex] && (
                <div style={{ marginTop: 8 }}>
                  <TitleDetail
                    number={
                      filtered[selectedTitleIndex].number ||
                      filtered[selectedTitleIndex].title
                    }
                    initialData={filtered[selectedTitleIndex]}
                    onBack={() => setSelectedTitleIndex(null)}
                  />
                </div>
              )}

              {/* list summaries below for quick scanning */}
              {filtered.map((t, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #eee",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 10,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>
                        {t.number
                          ? `Title ${t.number}`
                          : t.title || t.name || "(unnamed)"}
                      </div>
                      <div style={{ color: "#444" }}>
                        {t.name || t.title || t.display_name || ""}
                      </div>
                      <div
                        style={{ marginTop: 6, fontSize: 13, color: "#666" }}
                      >
                        {t.slug ? `slug: ${t.slug}` : ""}{" "}
                        {getChecksum(t) ? ` • checksum: ${getChecksum(t)}` : ""}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      {/* <button className="small-btn" onClick={() => toggleExpand(i)}>
                        {expanded.has(i) ? "Collapse" : "Expand"}
                      </button>
                      <a className="small-btn" href={t.url || (t.number ? `/title/${t.number}` : "#")} target="_blank" rel="noreferrer">
                        Open
                      </a> */}
                    </div>
                  </div>
                  {expanded.has(i) && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Title heading:</strong>{" "}
                        {t.titleChapterCounts &&
                        t.titleChapterCounts.titleDisplayHeading
                          ? t.titleChapterCounts.titleDisplayHeading
                          : "(n/a)"}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Chapter heading:</strong>{" "}
                        {t.titleChapterCounts &&
                        t.titleChapterCounts.chapterDisplayHeading
                          ? t.titleChapterCounts.chapterDisplayHeading
                          : "(n/a)"}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Word count:</strong>{" "}
                        {getWordCount(t) != null ? getWordCount(t) : "(n/a)"}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Summary:</strong>{" "}
                        {t.summary || t.description || "(none)"}
                      </div>
                      {t.versionSummary && (
                        <div style={{ marginBottom: 8 }}>
                          <strong>Version summary</strong>
                          <pre
                            style={{
                              background: "#f7f7f7",
                              padding: 8,
                              overflow: "auto",
                            }}
                          >
                            {JSON.stringify(t.versionSummary, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div style={{ marginBottom: 8 }}>
                        <strong>CFR references</strong>
                        {renderCfrReferences(
                          t.cfr_references || t.refs || t.references || []
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRaw && raw && (
        <div style={{ marginTop: 12 }}>
          <pre
            style={{
              maxHeight: 360,
              overflow: "auto",
              background: "#f5f5f5",
              padding: 8,
            }}
          >
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function App() {
  const [agencies, setAgencies] = useState([]);
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  // track expanded rows by path; use same set for children and docs toggles with suffixes
  const [expanded, setExpanded] = useState(new Set());
  const [showJson, setShowJson] = useState(new Set());

  // Basic client-side router: track pathname so we can render /agency/:slug/:short_name
  const [route, setRoute] = useState(window.location.pathname);
  useEffect(() => {
    const onpop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onpop);
    return () => window.removeEventListener("popstate", onpop);
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agencies");
      if (!res.ok) throw new Error("Failed to load agencies: " + res.status);
      const data = await res.json();
      // API now returns an object: { agencies: [...], titles: [...] }
      if (Array.isArray(data)) {
        setAgencies(data);
        setTitles([]);
      } else if (data && typeof data === "object") {
        setAgencies(Array.isArray(data.agencies) ? data.agencies : []);
        setTitles(Array.isArray(data.titles) ? data.titles : []);
      } else {
        setAgencies([]);
        setTitles([]);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function doRefresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.status);
      }
      await load();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = agencies.filter((a) => {
    if (!filter) return true;
    const s = JSON.stringify(a || {}).toLowerCase();
    return s.includes(filter.toLowerCase());
  });

  function toggle(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleJson(key) {
    setShowJson((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function getName(item) {
    // user said: name is agency name, short_name is acronym
    const name =
      item.name || item.agency_name || item.title || item.display_name || "";
    const acro =
      item.short_name ||
      item.acronym ||
      item.abbrev ||
      item.abbreviation ||
      item.shortName ||
      "";
    return acro ? `${name} (${acro})` : name;
  }

  function navigateToAgency(item) {
    const slug = item && item.slug ? item.slug : "";
    const short = item && item.short_name ? item.short_name : "";
    const href = `/agency/${encodeURIComponent(slug)}/${encodeURIComponent(
      short
    )}`;
    history.pushState({}, "", href);
    setRoute(href);
  }
  // Note: popup behavior removed. Anchor now opens agency details in a new tab
  // via target="_blank" so left-click will open a browser tab and middle-click
  // still works because the href is preserved.

  function renderDocsTable(docs, basePath, agencySlug) {
    if (!Array.isArray(docs) || docs.length === 0) return null;
    // show Title and Chapter columns
    return (
      <div className="cfr-subtable-wrap">
        <table className="cfr-table">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>#</th>
              <th>Title</th>
              <th style={{ width: "160px" }}>Chapter/Part</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => {
              // compute hierarchical number using basePath like '0.2' -> '1.3'
              const parentNum = basePath
                ? basePath
                    .split(".")
                    .map((p) => Number(p) + 1)
                    .join(".")
                : "";
              const num = parentNum ? `${parentNum}.${i + 1}` : String(i + 1);
              return (
                <tr key={i}>
                  <td>{num}</td>
                  <td title={d && d.title ? d.title : JSON.stringify(d)}>
                    {d && d.title ? d.title : d && d.citation ? d.citation : ""}
                    {/* UI-side lookup: search the titles array (from /api/agencies) for a matching title number and agencySlug */}
                    {(() => {
                      try {
                        if (!d || d.title == null || !agencySlug) return null;
                        // titles is in scope from component state
                        const match = titles.find(
                          (t) =>
                            String(t.number) === String(d.title) &&
                            (t.agencySlug === agencySlug ||
                              t.agency === agencySlug)
                        );
                        if (!match) return null;
                        const wc = getWordCount(match);
                        return (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "#333",
                            }}
                          >
                            <div>
                              <strong>Title heading:</strong>{" "}
                              {match.titleChapterCounts && match.titleChapterCounts.titleDisplayHeading ? match.titleChapterCounts.titleDisplayHeading : "(n/a)"}
                            </div>
                            <div>
                              <strong>Chapter heading:</strong>{" "}
                              {match.titleChapterCounts && match.titleChapterCounts.chapterDisplayHeading ? match.titleChapterCounts.chapterDisplayHeading : "(n/a)"}
                            </div>
                            <div>
                              <strong>Title name:</strong>{" "}
                              {match.name || "(unknown)"}
                            </div>
                            <div>
                              <strong>Wordcount:</strong>{" "}
                              {wc != null ? wc : "(n/a)"}
                            </div>
                            <div>
                              <strong>Checksum:</strong>{" "}
                              {getChecksum(match) || "(n/a)"}
                            </div>
                          </div>
                        );
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </td>
                  <td>
                    {d && (d.chapter || d.part || d.section || d.citation)
                      ? d.chapter || d.part || d.section || d.citation
                      : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // recursively render rows; path is a dot-separated index chain
  function renderRows(items, basePath = "") {
    const rows = [];
    items.forEach((item, idx) => {
      const path = basePath === "" ? String(idx) : `${basePath}.${idx}`;
      const number = path
        .split(".")
        .map((p) => Number(p) + 1)
        .join(".");
      const hasChildren =
        Array.isArray(item && item.children) && item.children.length > 0;
      const hasDocs =
        Array.isArray(item && item.cfr_references) &&
        item.cfr_references.length > 0;

      rows.push(
        <React.Fragment key={path}>
          <tr className={path.split(".").length % 2 === 0 ? "row-even" : ""}>
            <td style={{ width: "48px" }}>{number}</td>
            <td>
              <a
                href={`/agency/${encodeURIComponent(
                  item && item.slug ? item.slug : ""
                )}/${encodeURIComponent(
                  item && item.short_name ? item.short_name : ""
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {getName(item)}
              </a>
            </td>
            <td>
              {hasChildren ? (
                <button className="small-btn" onClick={() => toggle(path)}>
                  {expanded.has(path)
                    ? "Collapse"
                    : `Children (${item.children.length})`}
                </button>
              ) : (
                <span style={{ color: "#777" }}>—</span>
              )}
            </td>
            <td>
              {hasDocs ? (
                <button
                  className="small-btn"
                  onClick={() => toggle(path + "|docs")}
                >
                  {expanded.has(path + "|docs")
                    ? "Hide Docs"
                    : `Docs (${item.cfr_references.length})`}
                </button>
              ) : (
                <span style={{ color: "#777" }}>—</span>
              )}
            </td>
            <td>
              <button className="small-btn" onClick={() => toggleJson(path)}>
                {showJson.has(path) ? "Hide JSON" : "View JSON"}
              </button>
            </td>
          </tr>

          {showJson.has(path) && (
            <tr className="expanded-row">
              <td colSpan={5}>
                <pre>{JSON.stringify(item, null, 2)}</pre>
              </td>
            </tr>
          )}

          {expanded.has(path) && hasChildren && (
            <tr className="expanded-row children-row">
              <td colSpan={5} style={{ paddingLeft: 12 }}>
                <div className="child-subtable-wrap">
                  <table className="child-table">
                    <tbody>{renderRows(item.children, path)}</tbody>
                  </table>
                </div>
              </td>
            </tr>
          )}

          {expanded.has(path + "|docs") && hasDocs && (
            <tr className="expanded-row cfr-row">
              <td colSpan={5}>
                {renderDocsTable(
                  item.cfr_references,
                  path,
                  item && item.slug ? item.slug : null
                )}
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
    return rows;
  }

  return (
    <div className="container">
      <h1>ECFR Agencies (local)</h1>
      <div className="toolbar">
        {/* Refresh button removed */}
        <input
          placeholder="Filter (search text)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">Error: {error}</div>}

      <div className="count">
        Showing {visible.length} of {agencies.length}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "48px" }}>#</th>
              <th>Agency (acronym)</th>
              <th style={{ width: "160px" }}>Children</th>
              <th style={{ width: "160px" }}>Documents</th>
              <th style={{ width: "120px" }}>JSON</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  No agencies to show.
                </td>
              </tr>
            ) : (
              renderRows(visible)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Title detail view: shows titleChapterCounts and related breakdown for a given title number
function TitleDetail({ number, onBack, initialData }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    // If `initialData` is supplied (inline usage from AgencyDetail), use it
    // directly and skip the fetch. Otherwise, fetch `/api/title/:number`.
    if (initialData) {
      setData(initialData);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/title/${encodeURIComponent(number)}`);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || res.status);
        }
        const j = await res.json();
        console.log(
          "TitleDetail: loaded data for",
          number,
          j && j.titleChapterCounts && j.titleChapterCounts.raw
            ? j.titleChapterCounts.raw.length
            : "no raw"
        );
        setData(j);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [number]);

  function toggle(i) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const items =
    data &&
    data.titleChapterCounts &&
    Array.isArray(data.titleChapterCounts.raw)
      ? data.titleChapterCounts.raw
      : [];
  // attach original indices so charts/table can reference back to original items
  const itemsWithIndex = items.map((d, i) => Object.assign({ __origIndex: i }, d));
  const filtered = itemsWithIndex.filter((it) => {
    if (!query) return true;
    return JSON.stringify(it).toLowerCase().includes(query.toLowerCase());
  });
  // sorting state for the table: key can be 'count' or 'max_score' or null
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  // Inline SVG bar chart component for counts or scores
  function BarChart({
    dataset,
    valueKey = "count",
    labelKey = "path",
    maxBars = 12,
    onBarClick,
  }) {
    if (!Array.isArray(dataset) || dataset.length === 0)
      return <div style={{ color: "#777" }}>No data for chart</div>;
    // choose top items by value; include original index for expansion
    const itemsToShow = dataset
      .map((d, i) => ({
        d,
        datasetIndex: i,
        v: d[valueKey] == null ? 0 : Number(d[valueKey]),
        origIndex: d.__origIndex != null ? d.__origIndex : i,
      }))
      .sort((a, b) => b.v - a.v)
      .slice(0, maxBars);

    const maxV = Math.max(...itemsToShow.map((x) => x.v), 1);
    const chartWidth = 800;
    const rowHeight = 28;
    const chartHeight = itemsToShow.length * rowHeight + 20;

    return (
      <div style={{ overflow: "auto" }}>
        <svg
          width={Math.min(chartWidth, window.innerWidth - 80)}
          height={chartHeight}
          role="img"
          aria-label="Bar chart"
        >
          {itemsToShow.map((it, idx) => {
            const barWidth = (it.v / maxV) * (chartWidth - 260);
            const y = idx * rowHeight + 10;
            const label = it.d && it.d[labelKey] ? String(it.d[labelKey]) : `item ${it.datasetIndex + 1}`;
            const valueLabel = valueKey === 'max_score' && typeof it.v === 'number' ? it.v.toFixed(4) : String(it.v);
            return (
              <g
                key={idx}
                transform={`translate(0, ${y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onBarClick && onBarClick(it.origIndex)}
              >
                <text x={8} y={18} fontSize={12} fill="#222">
                  {label.length > 60 ? label.slice(0, 60) + "…" : label}
                </text>
                <rect
                  x={260}
                  y={4}
                  width={Math.max(1, barWidth)}
                  height={18}
                  fill="#4a90e2"
                  rx={3}
                  ry={3}
                />
                <text
                  x={260 + Math.max(4, barWidth) + 8}
                  y={18}
                  fontSize={12}
                  fill="#222"
                >
                  {valueLabel}
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
          Showing top {itemsToShow.length} rows by <strong>{valueKey}</strong>.
          Click a bar to expand the row.
        </div>
      </div>
    );
  }

  // Build a breadcrumb string from metadata. Support both array and
  // object shapes. Collect all non-empty displayHeading values in
  // document order and join them with " / ".
  function breadcrumbFromMetadata(metadata) {
    if (!metadata) return "";
    const headings = [];
    if (Array.isArray(metadata)) {
      for (const m of metadata) {
        if (!m) continue;
  const dh = m.displayHeading || m.displayheading || m.display_heading || null;
        if (dh && String(dh).trim()) headings.push(String(dh).trim());
      }
    } else if (typeof metadata === 'object') {
      for (const key of Object.keys(metadata)) {
        const m = metadata[key];
        if (!m) continue;
  const dh = m.displayHeading || m.displayheading || m.display_heading || null;
        if (dh && String(dh).trim()) headings.push(String(dh).trim());
      }
    }
    return headings.join(' / ');
  }

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>
          {data
            ? `Title ${data.number} — ${data.name || data.title || ""}`
            : `Title ${number}`}
        </h1>
      </div>

      <div className="toolbar" style={{ marginTop: 12 }}>
        <input
          placeholder="Filter rows (text)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">Error: {error}</div>}

      {data && data.titleChapterCounts && (
        <div style={{ marginTop: 12 }}>
          <div className="detail-grid">
            <div className="detail-block">
              <div>
                <strong>Title count:</strong>{" "}
                {data.titleChapterCounts.titleCount}
              </div>
              <div>
                <strong>Chapter count:</strong>{" "}
                {data.titleChapterCounts.chapterCount}
              </div>
            </div>
            <div className="detail-block">
              <div>
                <strong>Title heading:</strong>{" "}
                {data.titleChapterCounts.titleDisplayHeading}
              </div>
              <div>
                <strong>Chapter heading:</strong>{" "}
                {data.titleChapterCounts.chapterDisplayHeading}
              </div>
            </div>
            <div className="detail-block">
              <div>
                <strong>Checksum:</strong> {getChecksum(data) || "(n/a)"}
              </div>
              <div>
                <strong>Word count:</strong>{" "}
                {getWordCount(data) != null ? getWordCount(data) : "(n/a)"}
              </div>
            </div>
          </div>

          {/* Top rows by count moved below Version summary */}

          {data && data.versionSummary && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: '8px 0' }}>Version summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Total versions</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{data.versionSummary.totalVersions != null ? data.versionSummary.totalVersions : '—'}</div>
                </div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>First date</div>
                  <div style={{ fontSize: 14 }}>{data.versionSummary.firstDate || '—'}</div>
                </div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Last date</div>
                  <div style={{ fontSize: 14 }}>{data.versionSummary.lastDate || '—'}</div>
                </div>

                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Unique parts</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{data.versionSummary.uniqueParts != null ? data.versionSummary.uniqueParts : 0}</div>
                </div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Unique subparts</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{data.versionSummary.uniqueSubparts != null ? data.versionSummary.uniqueSubparts : 0}</div>
                </div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Parts</div>
                  <div style={{ fontSize: 13 }}>{Array.isArray(data.versionSummary.parts) && data.versionSummary.parts.length > 0 ? data.versionSummary.parts.join(', ') : '—'}</div>
                </div>
              </div>

              {/* typeCounts table */}
              {data.versionSummary.typeCounts && Object.keys(data.versionSummary.typeCounts).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h5 style={{ margin: '6px 0' }}>Type counts</h5>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Type</th>
                        <th style={{ width: 120, textAlign: 'right' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.versionSummary.typeCounts).map(([k, v]) => (
                        <tr key={k}>
                          <td>{k}</td>
                          <td style={{ textAlign: 'right' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* provide raw toggle for the per-part raw array when present */}
              {data.versionSummary.raw && Array.isArray(data.versionSummary.raw) && (
                <div style={{ marginTop: 12 }}>
                  <details>
                    <summary style={{ cursor: 'pointer' }}>Show raw per-part summaries ({data.versionSummary.raw.length})</summary>
                    <pre style={{ background: '#f7f7f7', padding: 8, overflow: 'auto', marginTop: 8 }}>{JSON.stringify(data.versionSummary.raw, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ margin: "8px 0", display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Top rows by count</span>
                <button className="small-btn" onClick={() => { setSortKey('count'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Sort table by count</button>
              </h4>
              <BarChart
                dataset={filtered}
                valueKey="count"
                labelKey="path"
                maxBars={12}
                onBarClick={(origIdx) => toggle(origIdx)}
              />
            </div>
            {/* removed max_score chart per user request */}
          </div>

          <div style={{ marginTop: 8 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Path</th>
                  <th style={{ width: 120 }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      No items.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const displayed = filtered.slice();
                    if (sortKey) {
                      displayed.sort((a, b) => {
                        const va = Number(a[sortKey] == null ? 0 : a[sortKey]);
                        const vb = Number(b[sortKey] == null ? 0 : b[sortKey]);
                        return sortDir === 'asc' ? va - vb : vb - va;
                      });
                    }
                    return displayed.map((it, idx) => (
                      <React.Fragment key={it.__origIndex}>
                            <tr>
                              <td>{idx + 1}</td>
                              <td style={{ whiteSpace: "pre-wrap" }}>
                                {it.path || ""}
                                {(() => {
                                  const bc = breadcrumbFromMetadata(it.metadata || it.metatData || it.metatadata);
                                  return bc ? (
                                    <div style={{ marginTop: 6, fontSize: 12, color: '#444' }}>
                                      <em>{bc}</em>
                                    </div>
                                  ) : null;
                                })()}
                              </td>
                              <td>{it.count != null ? it.count : ""}</td>
                            </tr>

                        {expanded.has(it.__origIndex) && (
                          <tr className="expanded-row">
                            <td colSpan={3}>
                              <div style={{ display: "flex", gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <strong>CFR reference</strong>
                                  <pre style={{ maxHeight: 220, overflow: "auto" }}>{JSON.stringify(it.cfrReference || {}, null, 2)}</pre>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <strong>Raw object</strong>
                                  <pre style={{ maxHeight: 220, overflow: "auto" }}>{JSON.stringify(it, null, 2)}</pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// top-level render with routing: if route matches /agency/:slug/:short render AgencyDetail
function Root() {
  const [route, setRoute] = useState(window.location.pathname);
  useEffect(() => {
    const onpop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onpop);
    return () => window.removeEventListener("popstate", onpop);
  }, []);

  const mt = route.match(/^\/title\/([^\/]+)(?:\/(.*))?/);
  if (mt) {
    const number = decodeURIComponent(mt[1]);
    return (
      <TitleDetail
        number={number}
        onBack={() => {
          history.pushState({}, "", "/");
          setRoute("/");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
      />
    );
  }

  const m = route.match(/^\/agency\/([^\/]+)(?:\/(.*))?/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const shortName = m[2] ? decodeURIComponent(m[2]) : "";
    return (
      <AgencyDetail
        slug={slug}
        shortName={shortName}
        onBack={() => {
          history.pushState({}, "", "/");
          setRoute("/");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
      />
    );
  }

  return <App />;
}

ReactDOM.render(<Root />, document.getElementById("root"));
