import React, { useEffect, useState } from 'react';

export default function ArtistBiography({ artistId }) {
  const [biography, setBiography] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setBiography(null);
    fetch(`/api/artist-biography?${new URLSearchParams({ id: artistId })}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Biography unavailable');
        return response.json();
      })
      .then(data => { if (!controller.signal.aborted) setBiography(data); })
      .catch(() => { if (!controller.signal.aborted) setBiography({ text: '' }); });
    return () => controller.abort();
  }, [artistId]);
  return <section className="profile-about" aria-label="About this artist">
    <h2>About</h2>
    {!biography && <output>Loading biography…</output>}
    {biography && <p>{biography.text || 'A biography isn’t available for this artist yet.'}</p>}
    {biography?.text && <a href={biography.sourceUrl} target="_blank" rel="noreferrer">Biography from Last.fm · Read more ↗</a>}
  </section>;
}
