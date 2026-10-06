import React, { useEffect, useState } from 'react';
import { DiscoveryCard } from './Discovery.jsx';

export default function RelatedArtists({ artist, country, onSelect }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(false);
    fetch(`/api/related-artists?${new URLSearchParams({ id: artist.id, country })}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unavailable');
        const result = await response.json();
        if (!controller.signal.aborted) setData(result);
      }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [artist.id, country, retry]);
  return <section aria-label={`Artists to explore based on ${artist.name}`}>
    <div className="section-title"><div><h2>{data?.method === 'spotify-search' ? 'Other artists to explore' : 'Similar artists'}</h2></div></div>
    {!data && !error && <output>Finding artists to explore…</output>}
    {error && <output>Recommendations are unavailable right now. <button className="back-results" onClick={() => setRetry(n => n + 1)}>Try again</button></output>}
    {data && <><p className="fine-print">{data.artists.length ? (data.basis || `Based on shared ${data.genre} tags; musical styles may vary.`) : (data.basis || 'No matching genre suggestions are available yet.')}</p><div className="discovery-cards">{data.artists.map((a, index) => <DiscoveryCard key={a.id} artist={a} index={index} onSelect={onSelect}/>)}</div></>}
  </section>;
}
