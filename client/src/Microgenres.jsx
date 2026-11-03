import React, { useEffect, useMemo, useState } from 'react';
import { useAccount } from './AccountContext.jsx';
import { DiscoveryCard } from './Discovery.jsx';

async function readJson(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

// Artist cards open the full artist page through the existing ?artist= link.
const openArtist = artist => window.location.assign(`/?artist=${encodeURIComponent(artist.id)}`);

export default function Microgenres({ country = 'US' }) {
  const { user, library, loading } = useAccount();
  const savedKey = useMemo(() => library.filter(i => i.kind === 'artist').slice(0, 15).map(i => i.name).join('\n'), [library]);
  const [genres, setGenres] = useState(null);
  const [genresError, setGenresError] = useState('');
  const [selected, setSelected] = useState('');
  const [artists, setArtists] = useState(null);
  const [artistsError, setArtistsError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (loading) return undefined;
    const controller = new AbortController();
    setGenres(null); setGenresError('');
    fetch('/api/microgenres', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ artists: savedKey ? savedKey.split('\n') : [] }),
    })
      .then(response => readJson(response, 'Microgenres are unavailable right now.'))
      .then(data => {
        setGenres(data);
        setSelected(current => (data.microgenres.some(g => g.tag === current) ? current : data.microgenres[0]?.tag || ''));
      })
      .catch(e => { if (e.name !== 'AbortError') setGenresError(e.message); });
    return () => controller.abort();
  }, [savedKey, loading, retry]);

  useEffect(() => {
    if (!selected) return undefined;
    const controller = new AbortController();
    setArtists(null); setArtistsError('');
    fetch(`/api/microgenre-artists?${new URLSearchParams({ tag: selected, country })}`, { signal: controller.signal })
      .then(response => readJson(response, 'Artists for this microgenre are unavailable right now.'))
      .then(setArtists)
      .catch(e => { if (e.name !== 'AbortError') setArtistsError(e.message); });
    return () => controller.abort();
  }, [selected, country, retry]);

  const personal = genres?.basis === 'saved';
  const current = genres?.microgenres.find(g => g.tag === selected);
  let intro = 'Popular microgenres to explore. Save artists to Ripple to get microgenres picked from your own taste.';
  if (personal) intro = 'Picked from the Last.fm tags of artists you saved in Ripple. The more of your artists share a microgenre, the higher it ranks.';
  else if (!user) intro = 'Popular microgenres to explore. Log in and save artists to get microgenres picked from your own taste.';

  return <section className="microgenres" aria-label="Discover microgenres">
    <div className="intro"><div><p className="eyebrow">GO DEEPER THAN GENRE</p><h1>Discover microgenres<span>.</span></h1><p>{intro}</p></div><span className="mode">{personal ? 'Based on your saves' : 'Starter picks'}</span></div>
    {!genres && !genresError && <output className="status">Finding microgenres…</output>}
    {genresError && <output className="notice">{genresError} <button className="back-results" onClick={() => setRetry(n => n + 1)}>Try again</button></output>}
    {genres && <div className="microgenre-chips" role="group" aria-label="Microgenres">
      {genres.microgenres.map(g => <button type="button" key={g.tag} aria-pressed={selected === g.tag} onClick={() => setSelected(g.tag)}>
        {g.tag}{personal && <small>{g.count} of your artists</small>}
      </button>)}
    </div>}
    {selected && <>
      <div className="section-title"><div><h2>Artists in {selected}</h2></div></div>
      {personal && current?.artists.length > 0 && <p className="fine-print microgenre-reason">Because you saved {current.artists.join(', ')}.</p>}
      {!artists && !artistsError && <output>Finding {selected} artists…</output>}
      {artistsError && <output>{artistsError} <button className="back-results" onClick={() => setRetry(n => n + 1)}>Try again</button></output>}
      {artists && <>
        {!artists.artists.length && <p className="fine-print">No {selected} artists could be matched to Spotify right now. Try another microgenre.</p>}
        <div className="discovery-cards">{artists.artists.map((a, index) => <DiscoveryCard key={a.id} artist={a} index={index} onSelect={openArtist}/>)}</div>
        <p className="fine-print"><a className="photo-credit" href={artists.sourceUrl} target="_blank" rel="noreferrer">Source: Last.fm top {selected} artists ↗</a></p>
      </>}
    </>}
  </section>;
}
