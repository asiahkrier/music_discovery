import React, { useState } from 'react';

export default function ArtistPlayer({ detail }) {
  const { artist } = detail;
  const [attempt, setAttempt] = useState(0);
  return <section className="artist-top-tracks" aria-label="Top songs">
    <div className="section-title"><h2>Top songs</h2><span>Spotify</span></div>
    {artist.spotifyEmbed ? <>
      <iframe key={`${artist.id}-${attempt}`} className="spotify-artist-embed" title={`${artist.name} — Spotify top songs`} src={artist.spotifyEmbed} width="100%" height="450" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen/>
      <div className="discovery-controls"><button onClick={() => setAttempt(n => n + 1)}>Reload player</button><a className="store-link" href={`https://open.spotify.com/artist/${artist.spotifyId}`} target="_blank" rel="noreferrer">Open in Spotify ↗</a></div>
      <p className="fine-print">Playback and previews are provided by Spotify. If the player is unavailable, open it directly.</p>
    </> : <div className="notice"><p>A verified Spotify profile hasn’t been matched to this artist yet.</p><a className="store-link" href={`https://open.spotify.com/search/${encodeURIComponent(artist.name)}`} target="_blank" rel="noreferrer">Find on Spotify ↗</a></div>}
  </section>;
}
