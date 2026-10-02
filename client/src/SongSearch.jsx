import React, { useEffect, useRef, useState } from 'react';

export default function SongSearch() {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('spotify');
  const [country, setCountry] = useState('US');
  const [providers, setProviders] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/song-providers', { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(data => setProviders(data.providers)).catch(e => {
      if (e.name !== 'AbortError') setError('Could not load connected services. You can still try a search.');
    });
    return () => { controller.abort(); request.current?.abort(); };
  }, []);
  async function search(event) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setResult(null); setError(''); setBusy(true);
    try {
      const response = await fetch(`/api/songs?${new URLSearchParams({ q: query.trim(), provider, country })}`, { signal: controller.signal });
      const data = await response.json();
      if (request.current !== controller) return;
      if (!response.ok) throw new Error(data.error || 'Song search is unavailable.');
      setResult(data);
    } catch (e) {
      if (request.current === controller && e.name !== 'AbortError') setError(e.message === 'Failed to fetch' ? 'Cannot reach song search. Please try again.' : e.message);
    } finally { if (request.current === controller) setBusy(false); }
  }
  return <section className="song-search" aria-label="Song search">
    <p className="eyebrow">FIND YOUR NEXT TRACK</p>
    <h2>Search songs on Spotify</h2>
    <p className="fine-print">Search by song title, artist, or both. Results depend on Spotify availability in the selected country.</p>
    <form onSubmit={search}>
      <div className="song-options">
        <label>Music service<select value={provider} onChange={e => setProvider(e.target.value)}>{providers.map(p => <option key={p.id} value={p.id} disabled={!p.enabled}>{p.name}{!p.enabled && ' — not connected'}</option>)}</select></label>
        <label>Country code<input aria-label="Country code" value={country} onChange={e => setCountry(e.target.value.toUpperCase())} maxLength={2} minLength={2} pattern="[A-Za-z]{2}" required placeholder="US"/></label>
      </div>
      <div className="search"><label className="sr-only" htmlFor="song-query">Song title or artist</label><span aria-hidden="true">⌕</span><input id="song-query" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} required placeholder="Song title or artist…"/><button type="submit">Find songs ↗</button></div>
    </form>
    <p className="fine-print">Connected: {providers.filter(p => p.enabled).map(p => p.name).join(', ') || 'checking…'}. Open a result to listen on its service.</p>
    <div aria-live="polite" aria-busy={busy}>
      {busy && <p className="status">Searching music catalogs…</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {result && <>
        <p className="status">{result.songs.length} results · {result.country}{result.providers.filter(p => p.status !== 'ok').map(p => ` · ${p.name} unavailable`).join('')}</p>
        {!result.songs.length && <p>No matching songs found in the services searched. Try the artist and song title together, or another country.</p>}
        <div className="song-results">{result.songs.map(song => <article className="song-result" key={song.id}>
          <span className="eyebrow">{song.providerName}</span><h3>{song.title}</h3><p>{song.artist}</p>{song.album && <p className="fine-print">{song.album}</p>}
          <a href={song.url} target="_blank" rel="noopener noreferrer">Open in {song.providerName} ↗</a>
        </article>)}</div>
      </>}
    </div>
  </section>;
}
