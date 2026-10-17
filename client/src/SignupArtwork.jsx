import React, { useEffect, useState } from 'react';

function choosePhotos(pool, previous = []) {
  const previousIds = new Set(previous.map(artist => artist.id));
  const fresh = pool.filter(artist => !previousIds.has(artist.id));
  const candidates = [...(fresh.length >= 3 ? fresh : pool)];
  for (let index = candidates.length - 1; index > 0; index--) {
    const value = crypto.getRandomValues(new Uint32Array(1))[0];
    const other = Math.floor((value / 4294967296) * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  return candidates.slice(0, 3);
}

export default function SignupArtwork() {
  const [pool, setPool] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [status, setStatus] = useState('Loading artist photos…');
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/discover?country=US', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Artist photos are temporarily unavailable.');
      const data = await response.json();
      const unique = new Map();
      for (const artist of data.artists || []) {
        if (/^[A-Za-z0-9]{22}$/.test(artist.id) && artist.image?.startsWith('https://')) unique.set(artist.id, artist);
      }
      if (controller.signal.aborted) return;
      const available = [...unique.values()];
      setPool(available); setPhotos(choosePhotos(available));
      setStatus(available.length ? '' : 'Artist photos are temporarily unavailable.');
    }).catch(error => { if (!controller.signal.aborted) setStatus('Artist photos are temporarily unavailable.'); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (paused || reduced || interacting || pool.length <= 3) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) setPhotos(previous => choosePhotos(pool, previous));
    }, 3000);
    return () => clearInterval(timer);
  }, [pool, paused, reduced, interacting]);
  function failed(id) {
    setPool(current => current.filter(artist => artist.id !== id));
    setPhotos(current => current.filter(artist => artist.id !== id));
  }
  return <section className="signup-artwork" aria-label="Artists on Spotify" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <div className="signup-photo-stage">
      {[0, 1, 2].map(slot => {
        const artist = photos[slot];
        return <div className={`signup-photo-slot signup-photo-slot-${slot}`} key={slot}>
          {artist ? <a key={artist.id} href={`https://open.spotify.com/artist/${artist.id}`} target="_blank" rel="noreferrer" aria-label={`${artist.name} on Spotify`}><img src={artist.image} alt={artist.name} onError={() => failed(artist.id)}/><span>{artist.name}<small>Spotify ↗</small></span></a> : <div className="signup-photo-placeholder" aria-hidden="true">≋</div>}
        </div>;
      })}
    </div>
    <div className="signup-artwork-controls"><p>{status || 'Artist photos from Spotify'}</p>{pool.length > 3 && <button type="button" className="account-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume photos' : 'Pause photos'}</button>}</div>
    {reduced && <p className="fine-print">Automatic photo changes are off for reduced motion.</p>}
  </section>;
}
