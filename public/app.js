const { useState, useEffect } = React;

// Agency detail view: fetches search results for a given agency slug and displays them
function AgencyDetail({ slug, shortName, onBack }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  // per-result json toggles
  const [showItemJson, setShowItemJson] = useState(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/search?slug=${encodeURIComponent(slug)}&page=1`);
        if (!res.ok) {
          const t = await res.text(); throw new Error(t || res.status);
        }
  const j = await res.json();
  setRaw(j);
        // search API typically returns an object with results array
  const items = Array.isArray(j.results) ? j.results : (Array.isArray(j.data) ? j.data : (Array.isArray(j) ? j : []));
        setResults(items);
      } catch (e) { setError(e.message); }
      setLoading(false);
    }
    load();
  }, [slug]);

  function guessTitle(item) {
    return item.title || item.headline || item.name || item.document_title || JSON.stringify(item).slice(0, 120);
  }

  function guessCitation(item) {
    return item.citation || item.cfr_citation || item.section || item.chapter || '';
  }

  function guessUrl(item) {
    // try several known fields
    if (!item) return null;
    if (item.url) return item.url.startsWith('http') ? item.url : `https://www.ecfr.gov${item.url}`;
    if (item.document_url) return item.document_url;
    if (item.link) return item.link;
    return null;
  }

  function toggleItemJson(idx) {
    setShowItemJson(prev => {
      const next = new Set(prev);
      const k = String(idx);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  function renderPrimitive(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    return JSON.stringify(v);
  }

  function renderArray(a) {
    if (!Array.isArray(a)) return null;
    if (a.length === 0) return <span style={{color:'#777'}}>(empty)</span>;
    // if array of primitives
    if (a.every(x => typeof x !== 'object')) return <div>{a.join(', ')}</div>;
    // array of objects -> render each as small key/value table
    return (
      <div>
        {a.map((it, i) => (
          <div key={i} style={{marginBottom:8, borderLeft:'2px solid #eee', paddingLeft:8}}>
            <div style={{fontSize:12, color:'#444', marginBottom:6}}>Item {i + 1}</div>
            {renderObject(it)}
          </div>
        ))}
      </div>
    );
  }

  function renderObject(obj) {
    if (!obj || typeof obj !== 'object') return <div>{renderPrimitive(obj)}</div>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return <div style={{color:'#777'}}>(empty object)</div>;
    return (
      <table className="kv-table">
        <tbody>
          {keys.map(k => (
            <tr key={k}>
              <td style={{verticalAlign:'top', paddingRight:12, width:160}}><strong>{k}</strong></td>
              <td style={{verticalAlign:'top'}}>
                {Array.isArray(obj[k]) ? renderArray(obj[k]) : (obj[k] && typeof obj[k] === 'object' ? renderObject(obj[k]) : renderPrimitive(obj[k]))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderCfrReferences(refs) {
    if (!Array.isArray(refs) || refs.length === 0) return <div style={{color:'#777'}}>(no CFR references)</div>;
    return (
      <div className="cfr-subtable-wrap">
        <table className="cfr-table">
          <thead>
            <tr>
              <th style={{width:'60px'}}>#</th>
              <th>Title / Citation</th>
              <th style={{width:'160px'}}>Chapter/Part</th>
            </tr>
          </thead>
          <tbody>
            {refs.map((r, i) => (
              <tr key={i}>
                <td style={{verticalAlign:'top'}}>{i + 1}</td>
                <td style={{verticalAlign:'top'}}>{r.title || r.citation || JSON.stringify(r)}</td>
                <td style={{verticalAlign:'top'}}>{r.chapter || r.part || r.section || r.citation || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Search results for {slug} {shortName ? `(${shortName})` : ''}</h1>
      <div className="toolbar">
        <button onClick={() => { if (onBack) onBack(); else { history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); } }}>Back</button>
      </div>

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">Error: {error}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:'60px'}}>#</th>
              <th>Title / Headline</th>
              <th style={{width:'220px'}}>Citation</th>
              <th style={{width:'120px'}}>Type</th>
              <th style={{width:'120px'}}>Starts</th>
              <th style={{width:'120px'}}>Ends</th>
              <th style={{minWidth:'220px'}}>Hierarchy / Headings</th>
              <th style={{width:'100px'}}>Link</th>
              <th style={{width:'120px'}}>JSON</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr><td colSpan={9} className="empty">No results.</td></tr>
            ) : (
              results.map((r, i) => {
                const key = String(i);
                const title = guessTitle(r);
                const citation = guessCitation(r);
                const url = guessUrl(r);
                return (
                  <React.Fragment key={key}>
                    <tr>
                      <td style={{verticalAlign:'top'}}>{i + 1}</td>
                      <td title={title} style={{textAlign:'left', verticalAlign:'top'}}>{title}</td>
                      <td style={{verticalAlign:'top'}}>{citation}</td>
                      <td style={{verticalAlign:'top'}}>{r.type || ''}</td>
                      <td style={{verticalAlign:'top'}}>{r.starts_on || r.start_date || ''}</td>
                      <td style={{verticalAlign:'top'}}>{r.ends_on || r.end_date || ''}</td>
                      <td style={{verticalAlign:'top', whiteSpace:'pre-wrap', lineHeight:1.3}}>
                        {(() => {
                          const parts = [];
                          if (Array.isArray(r.hierarchy)) {
                            r.hierarchy.forEach(h => { if (!h) return; parts.push(h.title || h.name || h.display_name || h.citation || (h.part || h.chapter || h.type) || JSON.stringify(h)); });
                          }
                          if (Array.isArray(r.hierarchy_headings)) {
                            r.hierarchy_headings.forEach(hh => { if (hh === null || hh === undefined) return; if (typeof hh === 'string') parts.push(hh); else if (typeof hh === 'object') parts.push(hh.title || hh.name || hh.display_name || hh.citation || JSON.stringify(hh)); });
                          }
                          if (Array.isArray(r.headings)) r.headings.forEach(hh => { if (hh !== null && hh !== undefined) parts.push(String(hh)); });
                          return parts.length ? parts.join(' | ') : <span style={{color:'#777'}}>(no data)</span>;
                        })()}
                      </td>
                      <td style={{verticalAlign:'top'}}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">View</a> : ''}</td>
                      <td style={{verticalAlign:'top'}}>
                        <button className="small-btn" onClick={() => toggleItemJson(i)}>{showItemJson.has(key) ? 'Hide JSON' : 'View JSON'}</button>
                      </td>
                    </tr>

                    {showItemJson.has(key) && (
                      <tr className="expanded-row">
                        <td colSpan={9}><pre style={{maxHeight:320, overflow:'auto'}}>{JSON.stringify(r, null, 2)}</pre></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:12}}>
        <div style={{color:'#444', marginBottom:6}}>Results: {results.length} (total pages: {raw && raw.meta ? raw.meta.total_pages : 'n/a'}, total_count: {raw && raw.meta ? raw.meta.total_count : 'n/a'})</div>
        <button className="small-btn" onClick={() => setShowRaw(s => !s)}>{showRaw ? 'Hide raw response' : 'Show raw response'}</button>
        {showRaw && raw && (
          <pre style={{maxHeight:360, overflow:'auto', background:'#f5f5f5', padding:8, marginTop:8}}>{JSON.stringify(raw, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

function App() {
  const [agencies, setAgencies] = useState([]);
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  // track expanded rows by path; use same set for children and docs toggles with suffixes
  const [expanded, setExpanded] = useState(new Set());
  const [showJson, setShowJson] = useState(new Set());

  // Basic client-side router: track pathname so we can render /agency/:slug/:short_name
  const [route, setRoute] = useState(window.location.pathname);
  useEffect(() => {
    const onpop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onpop);
    return () => window.removeEventListener('popstate', onpop);
  }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/agencies');
      if (!res.ok) throw new Error('Failed to load agencies: ' + res.status);
      const data = await res.json();
      // API now returns an object: { agencies: [...], titles: [...] }
      if (Array.isArray(data)) {
        setAgencies(data);
        setTitles([]);
      } else if (data && typeof data === 'object') {
        setAgencies(Array.isArray(data.agencies) ? data.agencies : []);
        setTitles(Array.isArray(data.titles) ? data.titles : []);
      } else {
        setAgencies([]);
        setTitles([]);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function doRefresh() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (!res.ok) { const t = await res.text(); throw new Error(t || res.status); }
      await load();
    } catch (e) { setError(e.message); setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const visible = agencies.filter(a => {
    if (!filter) return true;
    const s = JSON.stringify(a || {}).toLowerCase();
    return s.includes(filter.toLowerCase());
  });

  function toggle(key) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleJson(key) {
    setShowJson(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function getName(item) {
    // user said: name is agency name, short_name is acronym
    const name = item.name || item.agency_name || item.title || item.display_name || '';
    const acro = item.short_name || item.acronym || item.abbrev || item.abbreviation || item.shortName || '';
    return acro ? `${name} (${acro})` : name;
  }

  function navigateToAgency(item) {
    const slug = item && item.slug ? item.slug : '';
    const short = item && item.short_name ? item.short_name : '';
    const href = `/agency/${encodeURIComponent(slug)}/${encodeURIComponent(short)}`;
    history.pushState({}, '', href);
    setRoute(href);
  }

  function renderDocsTable(docs, basePath, agencySlug) {
    if (!Array.isArray(docs) || docs.length === 0) return null;
    // show Title and Chapter columns
    return (
      <div className="cfr-subtable-wrap">
        <table className="cfr-table">
          <thead>
            <tr>
              <th style={{width:'60px'}}>#</th>
              <th>Title</th>
              <th style={{width:'160px'}}>Chapter/Part</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => {
              // compute hierarchical number using basePath like '0.2' -> '1.3'
              const parentNum = basePath ? basePath.split('.').map(p => Number(p) + 1).join('.') : '';
              const num = parentNum ? `${parentNum}.${i + 1}` : String(i + 1);
              return (
                  <tr key={i}>
                    <td>{num}</td>
                    <td title={d && d.title ? d.title : JSON.stringify(d)}>
                      {d && d.title ? d.title : (d && d.citation ? d.citation : '')}
                      {/* UI-side lookup: search the titles array (from /api/agencies) for a matching title number and agencySlug */}
                      {(() => {
                        try {
                          if (!d || d.title == null || !agencySlug) return null;
                          // titles is in scope from component state
                          const match = titles.find(t => String(t.number) === String(d.title) && (t.agencySlug === agencySlug || t.agency === agencySlug));
                          if (!match) return null;
                          const wc = match.wordCount != null ? match.wordCount : (match.wordcount != null ? match.wordcount : null);
                          return (
                            <div style={{marginTop:6, fontSize:12, color:'#333'}}>
                              <div><strong>Title name:</strong> {match.name || '(unknown)'}</div>
                              <div><strong>Wordcount:</strong> {wc != null ? wc : '(n/a)'}</div>
                              <div><strong>Checksum:</strong> {match.checksum || '(n/a)'}</div>
                            </div>
                          );
                        } catch (e) { return null; }
                      })()}
                    </td>
                    <td>{d && (d.chapter || d.part || d.section || d.citation) ? (d.chapter || d.part || d.section || d.citation) : ''}</td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // recursively render rows; path is a dot-separated index chain
  function renderRows(items, basePath = '') {
    const rows = [];
    items.forEach((item, idx) => {
      const path = basePath === '' ? String(idx) : `${basePath}.${idx}`;
      const number = path.split('.').map(p => Number(p) + 1).join('.');
      const hasChildren = Array.isArray(item && item.children) && item.children.length > 0;
      const hasDocs = Array.isArray(item && item.cfr_references) && item.cfr_references.length > 0;

      rows.push(
        <React.Fragment key={path}>
          <tr className={path.split('.').length % 2 === 0 ? 'row-even' : ''}>
            <td style={{width:'48px'}}>{number}</td>
            <td>
              <a
                href={`/agency/${encodeURIComponent(item && item.slug ? item.slug : '')}/${encodeURIComponent(item && item.short_name ? item.short_name : '')}`}
                onClick={(e) => { e.preventDefault(); navigateToAgency(item); }}
              >
                {getName(item)}
              </a>
            </td>
            <td>
              {hasChildren ? (
                <button className="small-btn" onClick={() => toggle(path)}>
                  {expanded.has(path) ? 'Collapse' : `Children (${item.children.length})`}
                </button>
              ) : <span style={{color:'#777'}}>—</span>}
            </td>
            <td>
              {hasDocs ? (
                <button className="small-btn" onClick={() => toggle(path + '|docs')}>
                  {expanded.has(path + '|docs') ? 'Hide Docs' : `Docs (${item.cfr_references.length})`}
                </button>
              ) : <span style={{color:'#777'}}>—</span>}
            </td>
            <td>
              <button className="small-btn" onClick={() => toggleJson(path)}>{showJson.has(path) ? 'Hide JSON' : 'View JSON'}</button>
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
              <td colSpan={5} style={{paddingLeft:12}}>
                <div className="child-subtable-wrap">
                  <table className="child-table">
                    <tbody>
                      {renderRows(item.children, path)}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          )}

          {expanded.has(path + '|docs') && hasDocs && (
            <tr className="expanded-row cfr-row">
              <td colSpan={5}>
                {renderDocsTable(item.cfr_references, path, item && item.slug ? item.slug : null)}
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
        <button onClick={doRefresh} disabled={loading}>Refresh from ECFR</button>
        <input placeholder="Filter (search text)" value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">Error: {error}</div>}

      <div className="count">Showing {visible.length} of {agencies.length}</div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:'48px'}}>#</th>
              <th>Agency (acronym)</th>
              <th style={{width:'160px'}}>Children</th>
              <th style={{width:'160px'}}>Documents</th>
              <th style={{width:'120px'}}>JSON</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={5} className="empty">No agencies to show.</td></tr>
            ) : (
              renderRows(visible)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// top-level render with routing: if route matches /agency/:slug/:short render AgencyDetail
function Root() {
  const [route, setRoute] = useState(window.location.pathname);
  useEffect(() => {
    const onpop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onpop);
    return () => window.removeEventListener('popstate', onpop);
  }, []);

  const m = route.match(/^\/agency\/([^\/]+)(?:\/(.*))?/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const shortName = m[2] ? decodeURIComponent(m[2]) : '';
    return <AgencyDetail slug={slug} shortName={shortName} onBack={() => { history.pushState({}, '', '/'); setRoute('/'); window.dispatchEvent(new PopStateEvent('popstate')); }} />;
  }

  return <App />;
}

ReactDOM.render(<Root />, document.getElementById('root'));
