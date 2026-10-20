import React, { useEffect, useState } from 'react';
import { DiscoveryCard } from './Discovery.jsx';
import { nextArtists } from './discovery-shuffle.js';

export default function RelatedArtists({ artist, country, onSelect }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [shown, setShown] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(false); setShown([]);
    fetch(`/api/related-artists?${new URLSearchParams({ id: artist.id, country })}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unavailable');
        const result = await response.json();
        if (!controller.signal.aborted) { setData(result); setShown(result.artists.slice(0, 6)); }
      }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [artist.id, country, retry]);
  return <section aria-label={`Artists to explore based on ${artist.name}`}>
       <div className="section-title"><div><h2>Other artists to explore</h2></div>
      {data?.artists.length >= 12 && <div className="discovery-controls"><button onClick={() => setShown(previous => nextArtists(data.artists, previous).sort((a, b) => b.score - a.score))}>Shuffle ↻</button></div>}
    </div>
    {!data && !error && <output>Finding artists to explore…</output>}
    {error && <output>Recommendations are unavailable right now. <button className="back-results" onClick={() => setRetry(n => n + 1)}>Try again</button></output>}
    {data && <>
      {!data.artists.length && <p className="fine-print">{data.basis}</p>}
      <div className="discovery-cards">{shown.map((a, index) => <DiscoveryCard key={a.id} artist={a} index={index} onSelect={onSelect}/>)}</div>
      {data.sourceUrl && <p className="fine-print"><a className="photo-credit" href={data.sourceUrl} target="_blank" rel="noreferrer">Source: Last.fm ↗</a></p>}
    </>}
  </section>;
}
