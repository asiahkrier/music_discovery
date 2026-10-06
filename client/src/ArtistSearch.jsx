import ArtistBiography from './ArtistBiography.jsx';
import ArtistPlayer from './ArtistPlayer.jsx';
import ArtistPhoto from './ArtistPhoto.jsx';
import RelatedArtists from './RelatedArtists.jsx';
import Discovery from './Discovery.jsx';
import React, { useEffect, useRef, useState } from 'react';

export default function ArtistSearch() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('US');
  const [results, setResults] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const heading = useRef(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  async function load(path, success) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      const response = await fetch(path, { signal: controller.signal }); const data = await response.json();
      if (request.current !== controller) return;
      if (!response.ok) throw new Error(data.error || 'Could not load the music catalog.');
      success(data);
    } catch (e) { if (request.current === controller && e.name !== 'AbortError') setError(e.message === 'Failed to fetch' ? 'Cannot reach Ripple. Please try again.' : e.message); }
    finally { if (request.current === controller) setBusy(false); }
  }
  function search(event) {
    event.preventDefault(); setDetail(null); setResults(null);
    void load(`/api/artists?${new URLSearchParams({ q: query.trim(), country })}`, data => setResults(data));
  }
  function select(artist) {
    setDetail(null);
    void load(`/api/artist?${new URLSearchParams({ id: artist.id, country: artist.country || results?.country || country })}`, data => {
      setDetail(data); setTimeout(() => heading.current?.focus(), 0);
    });
  }
  const artist = detail?.artist;
  return <section aria-label="Live artist discovery">
    {!detail && <><div className="intro"><div><p className="eyebrow">A NEW WAY TO WANDER</p><h1>Follow your sound<span>.</span></h1><p>Mainstream, underground, and everything in between.</p></div><span className="mode">Live artist catalog</span></div>
    <form onSubmit={search}>
      <div className="song-options"><label>Country code<input value={country} onChange={e => setCountry(e.target.value.toUpperCase())} minLength={2} maxLength={2} pattern="[A-Za-z]{2}" required aria-label="Artist catalog country"/></label></div>
      <div className="search"><label className="sr-only" htmlFor="artist-search">Search for an artist</label><span aria-hidden="true">⌕</span><input id="artist-search" value={query} onChange={e => setQuery(e.target.value)} maxLength={200} required placeholder="Artist name or Spotify artist link…"/><button type="submit">Find artists ↗</button></div>
    </form>
    <p className="fine-print">Spotify artists, photos, and playback. You can also paste a Spotify artist link. Availability varies by artist and country.</p>
    </>}
    <div aria-live="polite">{busy && <p className="status">Loading live artist information…</p>}{error && <p className="notice error" role="alert">{error}</p>}</div>
    {!results && !detail && !busy && <Discovery country={country} onSelect={select}/>}
    {results && !detail && !busy && <section className="results"><h2>{results.artists.length ? 'Choose your artist' : 'No matching artists found'}</h2><p className="fine-print">Artists can share a name. Check the genre and catalog profile to choose the right one.</p><div className="result-list">{results.artists.map(a => <button key={a.id} onClick={() => select(a)}><span>{a.name}<small className="artist-result-meta">{a.tags.join(' · ') || 'Genre unavailable'} · ID {a.id}</small></span><span>View profile ↗</span></button>)}</div>{!results.artists.length && <p>Try another spelling or country. An artist appearing on another platform does not guarantee a Spotify listing.</p>}</section>}
    {detail && <>
      <button className="back-results" onClick={() => { setDetail(null); }}>← Back to artists</button>
      <section className="profile-banner"><div className="profile-photo"><ArtistPhoto artist={artist} className="large"/>{artist.imageSource && <a className="photo-credit" href={artist.imageSource} target="_blank" rel="noreferrer">Photo credits ↗</a>}</div><div><p className="eyebrow">ARTIST</p><h1 ref={heading} tabIndex={-1}>{artist.name}</h1><div className="tags">{artist.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><ArtistBiography key={artist.id} artistId={artist.id}/></section>
      <ArtistPlayer key={`${artist.id}-${detail.country}`} detail={detail}/>

      <RelatedArtists key={`${artist.id}-${detail.country}`} artist={artist} country={detail.country} onSelect={select}/>

    </>}
  </section>;
}
