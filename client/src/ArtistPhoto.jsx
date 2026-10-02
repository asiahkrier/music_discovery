import React, { useEffect, useState } from 'react';
export default function ArtistPhoto({ artist, className = '', onSource }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); onSource?.(artist.imageSource || ''); }, [artist.id, artist.image, artist.imageSource, onSource]);
  return <div className={`artist-photo ${className}`}>
    {artist.image && !failed ? <img src={artist.image} alt={artist.name} loading="lazy" onError={() => setFailed(true)}/> : <><span aria-hidden="true">{artist.name.slice(0,2).toUpperCase()}</span><small>Artist photo unavailable</small></>}
  </div>;
}
