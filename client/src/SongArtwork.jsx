import React, { useEffect, useState } from 'react';

export default function SongArtwork({ song }) {
  const [image, setImage] = useState(song.image || '');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (song.image) return;
    const controller = new AbortController();
    fetch(`/api/song-artwork?${new URLSearchParams({ id: song.spotify_id })}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Cover art unavailable');
        return response.json();
      })
      .then(data => { if (!controller.signal.aborted) setImage(data.image || ''); })
      .catch(() => { /* Keep the placeholder when artwork is unavailable. */ });
    return () => controller.abort();
  }, [song.spotify_id, song.image]);
  return <div className="song-icon" aria-hidden="true">
    {image && !failed ? <img src={image} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}/> : '♫'}
  </div>;
}
