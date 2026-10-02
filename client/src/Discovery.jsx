import ArtistPhoto from './ArtistPhoto.jsx';
import React, { useEffect, useState } from 'react';
import { nextArtists } from './discovery-shuffle.js';

export function DiscoveryCard({ artist: a, index, onSelect }) {
  const [source, setSource] = useState('');
  return <div className="discovery-tile"><button className="discovery-card" onClick={() => onSelect(a)} aria-label={`View ${a.name} profile`} style={{'--tile-hue':`${80 + index * 34}`}}>
    <ArtistPhoto artist={a} className="discovery-art" onSource={setSource}/>
    <div className="card-name"><h3>{a.name}</h3><span>↗</span></div><p>{a.tags.join(' · ') || 'Explore artist'}</p>
    <span className="discovery-badge">{a.recommendationReason ? `Shared genre: ${a.recommendationReason}` : 'Discover on Spotify'}</span><span className="discovery-cta">View artist</span>
  </button>{source && <a className="photo-credit" href={source} target="_blank" rel="noreferrer">Photo source & credits ↗</a>}</div>;
}

export default function Discovery({ country, onSelect }) {
  const [notice, setNotice] = useState('');
  const [pool, setPool] = useState([]);
  const [shown, setShown] = useState([]);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setPool([]); setShown([]); setError('');
    fetch(`/api/discover?${new URLSearchParams({country})}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load discovery.');
      if (!controller.signal.aborted) { setNotice(data.notice || ''); setPool(data.artists); setShown(nextArtists(data.artists)); }
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message || 'Discovery is unavailable right now.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [country, retry]);
  useEffect(() => {
    if (paused || interacting || pool.length < 2) return;
    const timer = setInterval(() => {
      if (!document.hidden) setShown(previous => nextArtists(pool, previous));
    }, 10000);
    return () => clearInterval(timer);
  }, [pool, paused, interacting]);
  return <section className="discovery" aria-label="Random artist discovery">
    <div className="section-title"><div><p className="eyebrow">LET CHANCE PICK YOUR NEXT SOUND</p><h2>Discover someone new</h2></div><div className="discovery-controls"><button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'Resume shuffle' : 'Pause shuffle'}</button><button onClick={() => setShown(previous => nextArtists(pool, previous))} disabled={!pool.length}>Shuffle now ↻</button></div></div>
    <p className="fine-print">{paused ? 'Shuffle paused.' : 'A new mix every 10 seconds. Pauses while you hover or use the cards.'} {notice}</p>
    {loading && <p className="status" role="status">Finding live artists for you…</p>}
    {error && <p className="notice" role="status">{error} <button onClick={() => setRetry(n => n + 1)}>Retry</button></p>}
    {!loading && !error && !shown.length && <p>No discovery artists are available for this country.</p>}
    <div className="discovery-cards" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}>
      {shown.map((a,index) => <DiscoveryCard key={a.id} artist={a} index={index} onSelect={onSelect}/>)}
    </div>
  </section>;
}
