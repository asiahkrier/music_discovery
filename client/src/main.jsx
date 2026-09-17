import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function ArtistArt({ artist, large = false }) {
  if (artist.name === "Radiohead") return <div className={`artist-art photo ${large ? "large" : ""}`}><img src="/images/radiohead.jpg" alt="Radiohead performing at Austin City Limits in 2016"/></div>;
  return <div className={`artist-art ${large ? 'large' : ''}`} style={{ '--art-color': artist.color || '#bdd98b' }} aria-hidden="true">
    <span>{artist.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</span><small>ARTIST / {artist.tags?.[0] || 'DISCOVER'}</small>
  </div>;
}
function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchSource, setSearchSource] = useState('demo');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const request = useRef(null);
  const heading = useRef(null);
  async function load(path, onSuccess) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(path, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load artists.');
      if (request.current !== controller) return;
      setNotice(data.notice || ''); onSuccess(data);
    } catch (error) {
      if (error.name !== 'AbortError') setError(error.message === 'Failed to fetch' ? 'Cannot reach the server. Check that npm run dev is running, then try again.' : error.message);
    } finally { if (request.current === controller) setBusy(false); }
  }
  function select(name, focus = true) {
    setResults(null); setDetail(null);
    load(`/api/artist?name=${encodeURIComponent(name)}`, data => {
      setDetail(data);
      if (focus) setTimeout(() => heading.current?.focus(), 0);
    });
  }
  function search(event) {
    event.preventDefault();
    if (!query.trim()) { setError('Enter an artist name to search.'); return; }
    setDetail(null); setResults(null);
    load(`/api/artists?q=${encodeURIComponent(query.trim())}`, data => { setResults(data.artists); setSearchSource(data.source); });
  }
  useEffect(() => { select('Radiohead', false); return () => request.current?.abort(); }, []);
  const source = detail?.source || searchSource;
  return <div className="app">
    <header><a className="brand" href="/" aria-label="Music Discovery home"><span className="logo">≋</span> music<span>discovery</span></a><span className="edition">THE DISCOVERY SESSION <b>01</b></span></header>
    <main>
      <div className="intro"><div><p className="eyebrow">A NEW WAY TO WANDER</p><h1>Follow your sound<span>.</span></h1><p>Start with an artist you love. Find someone new.</p></div><span className="mode">{source === 'live' ? 'Last.fm · Live data' : 'Demo · Sample catalog'}</span></div>
      <form onSubmit={search} className="search"><label className="sr-only" htmlFor="artist-search">Search for an artist</label><span aria-hidden="true">⌕</span><input id="artist-search" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search for an artist…" autoComplete="off"/><button type="submit">Find artists <span aria-hidden="true">↗</span></button></form>
      <div className="suggestions"><span>Try a starting point</span>{['Radiohead', 'Daft Punk', 'SZA'].map(name => <button key={name} onClick={() => { setQuery(name); select(name); }}>{name}</button>)}</div>
      <div aria-live="polite">{busy && <p className="status">Finding your next sound…</p>}{notice && <p className="notice">{notice}</p>}</div>
      {error && <p role="alert" className="notice error">{error}</p>}
      {results && <section className="results"><p className="eyebrow">SEARCH RESULTS</p><h2>{results.length ? 'Choose your artist' : 'No artists found'}</h2>{!results.length && <p>{searchSource === 'demo' ? 'The demo contains 18 sample artists. Try Radiohead, Daft Punk, or SZA.' : 'Try another name or check the spelling.'}</p>}<div className="result-list">{results.map((artist, index) => <button key={`${artist.name}-${index}`} onClick={() => select(artist.name)}><span>{artist.name}</span><span>Explore artist ↗</span></button>)}</div></section>}
      {detail && <>
        <section className="selected"><ArtistArt artist={detail.artist} large/><div className="artist-info"><p className="eyebrow">YOUR STARTING POINT</p><h2 ref={heading} tabIndex={-1}>{detail.artist.name}</h2><div className="tags">{detail.artist.tags.map(tag => <span key={tag}>{tag}</span>)}</div><p className="bio">{detail.artist.bio || 'Explore the artists connected to this sound.'}</p><span className="data-note">{detail.artist.name === "Radiohead" && <><a href="https://commons.wikimedia.org/wiki/File:ACL_Radiohead_2016_(30123314982).jpg" target="_blank" rel="noreferrer">Photo: ღ ℂℏ℟ḯʂ ღ</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a> · Cropped<br/></>}{detail.source === 'demo' ? 'Curated demo profile' : 'Artist information from Last.fm'}</span></div><span className="index" aria-hidden="true">01 /</span></section>
        <section className="recommendations"><div className="section-title"><div><p className="eyebrow">KEEP EXPLORING</p><h2>If you like {detail.artist.name}</h2></div><span>{detail.similar.length} artists to discover</span></div>
          {detail.similar.length ? <div className="cards">{detail.similar.map((artist, index) => <button className="card" key={artist.name} onClick={() => { setQuery(artist.name); select(artist.name); }} aria-label={`Explore ${artist.name}`}><ArtistArt artist={artist}/><div className="card-name"><h3>{artist.name}</h3><span aria-hidden="true">↗</span></div><p>{artist.tags?.[0] || 'Similar artist'}</p><span className="card-number">0{index + 1}</span></button>)}</div> : <p className="status">No similar artists available right now. Try another artist.</p>}
          <p className="fine-print">{detail.source === 'demo' ? 'Sample recommendations are hand-curated for the demo.' : 'Recommendations provided by Last.fm. Some artists may have fewer than 3 matches.'} Select an artist to keep exploring.</p>
        </section>
      </>}
    </main><footer><span>music discovery <span className="muted">/ Sprint 1</span></span><span>One artist leads to another.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
