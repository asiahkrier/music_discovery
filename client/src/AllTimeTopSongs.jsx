import React, { useEffect, useState } from 'react';

const duration = ms => ms ? `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}` : '';

// All-time most-listened songs (Last.fm), styled as a player card; each song plays through Spotify.
export default function AllTimeTopSongs({ artist, country }) {
  const [data, setData] = useState(null);
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setCurrent(null);
    fetch(`/api/top-tracks?${new URLSearchParams({ id: artist.id, country })}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error('Top songs unavailable');
        }
        return response.json();
      })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setData({ tracks: [] }); });
    return () => controller.abort();
  }, [artist.id, country]);
  const playable = data?.tracks.filter(track => track.spotifyId) || [];
  const nowPlaying = playable.find(track => track.spotifyId === current);
  return <section className="all-time-songs" aria-label="All-time top songs">
    <div className="section-title"><h2>All-time top songs</h2><span>Ranked by Last.fm listeners</span></div>
    <div className="atp-card">
      <div className="atp-header">
        {artist.image ? <img className="atp-cover" src={artist.image} alt=""/> : <div className="atp-cover atp-cover-empty" aria-hidden="true">♫</div>}
        <div className="atp-heading">
          <strong>{artist.name}</strong>
          <span><em>All-time</em> Top songs</span>
          {nowPlaying && <small>Now playing: {nowPlaying.title}</small>}
        </div>
      </div>
      {nowPlaying && <iframe key={nowPlaying.spotifyId} className="atp-embed" title={`${nowPlaying.title} Spotify preview`} src={`https://open.spotify.com/embed/track/${nowPlaying.spotifyId}`} height="80" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}
      {!data && <output className="atp-status">Loading all-time top songs…</output>}
      {data && !data.tracks.length && <p className="atp-status">All-time rankings aren’t available for this artist yet.</p>}
      {data?.tracks.length > 0 && <ol className="atp-list">{data.tracks.map((track, index) => {
        const active = track.spotifyId && track.spotifyId === current;
        const playbackAction = active ? 'Close' : 'Play';
        const trackLabel = track.spotifyId
          ? `${playbackAction} ${track.title}`
          : `${track.title} is not available on Spotify`;
        return <li key={track.title}>
          <button type="button" className={`atp-row${active ? ' active' : ''}`} disabled={!track.spotifyId}
            onClick={() => setCurrent(active ? null : track.spotifyId)}
            aria-label={trackLabel}>
            <span className="atp-num"><span className="atp-index">{index + 1}</span><span className="atp-play" aria-hidden="true">{active ? '❚❚' : '▶'}</span></span>
            <span className="atp-text"><strong title={track.title}>{track.title}</strong><small>{track.spotifyId ? artist.name : 'Not on Spotify'} · {track.listeners.toLocaleString()} listeners</small></span>
            <span className="atp-time">{duration(track.durationMs)}</span>
          </button>
        </li>;
      })}</ol>}
    </div>
    {data?.sourceUrl && <a className="store-link" href={data.sourceUrl} target="_blank" rel="noreferrer">Rankings from Last.fm ↗</a>}
  </section>;
}
