import React, { useEffect, useRef, useState } from 'react';
import { SaveButton, useAccount } from './AccountContext.jsx';
import SpotifyConnection, { SpotifySaveButton } from './SpotifyConnection.jsx';
import { spotifyAccount } from './spotify-account-client.js';

const defaults = { adventure: 60, saved: true, top: true, recent: true, playlists: [] };
const sampleMix = {
  generatedAt: '2026-10-28T12:00:00Z', warnings: [],
  tracks: [
    { id: 'preview-one', name: 'A new R&B discovery', artist: 'An artist outside your usual rotation', reason: 'Because you saved SZA', newToYou: true, smallerAudience: true },
    { id: 'preview-two', name: 'Your next late-night favorite', artist: 'A related independent artist', reason: 'Inspired by your Spotify favorites', newToYou: true },
    { id: 'preview-three', name: 'A familiar sound', artist: 'An artist from your Ripple library', reason: 'From your saved artists', newToYou: false },
  ],
};
function mixLabel(track) {
  if (!track.newToYou) return 'FROM YOUR ROTATION';
  return track.smallerAudience ? 'SMALLER-AUDIENCE DISCOVERY' : 'A RELATED DISCOVERY';
}
export default function RippleMix(props) {
  const { user } = useAccount();
  return <MixContent key={user?.id || 'guest'} {...props}/>;
}
function MixContent({ onProfile }) {
  const { user, demo, startDemo } = useAccount();
  const [status, setStatus] = useState(null), [mix, setMix] = useState(null), [preferences, setPreferences] = useState(defaults);
  const [playlists, setPlaylists] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [playing, setPlaying] = useState(''), [exported, setExported] = useState(null);
  const guard = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'mix' && !user) startDemo();
  }, [user, startDemo]);
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null); setMix(null); setError(''); setExported(null); setPlaylists([]);
    if (demo) { setStatus({ connected: true }); setMix(sampleMix); return undefined; }
    if (!user) return undefined;
    spotifyAccount('status', 'GET', undefined, controller.signal).then(async data => {
      setStatus(data); setMix(data.mix); setPreferences(data.preferences || defaults);
      if (data.connected && data.mix) {
        const refreshed = await spotifyAccount('mix', 'POST', {}, controller.signal);
        setMix(refreshed.mix);
      }
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [user?.id, demo]);
  async function run(action) {
    if (guard.current) return;
    guard.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e.message); }
    finally { guard.current = false; setBusy(false); }
  }
  async function generate(refresh) {
    if (demo) { setMix(sampleMix); setNotice('Preview only. These example cards show the layout, not real recommendations.'); return; }
    await spotifyAccount('preferences', 'PUT', preferences);
    const result = await spotifyAccount('mix', 'POST', { refresh }); setMix(result.mix); setPlaying(''); setExported(null);
  }
  async function dismiss(id) {
    if (demo) { setMix(current => ({ ...current, tracks: current.tracks.filter(t => t.id !== id) })); return; }
    const result = await spotifyAccount('dismiss', 'POST', { id }); setMix(result.mix);
  }
  async function loadPlaylists() {
    if (demo) { setNotice('Your own Spotify playlists will appear here after connecting a real account.'); return; }
    const result = await spotifyAccount('playlists'); setPlaylists(result.playlists);
    setNotice(result.limited ? 'Showing eligible playlists from the first 50 in your Spotify account.' : result.playlists.length ? 'Choose up to three playlists.' : 'No eligible owned or collaborative playlists were found.');
  }
  async function exportMix() {
    if (demo) { setNotice('Preview only. No Spotify playlist was created.'); return; }
    const result = await spotifyAccount('export', 'POST', {}); setExported(result.playlist);
  }
  if (!user) return <section className="account-panel"><h1>Your Ripple Mix</h1><p>Sign in to blend your Ripple favorites with your Spotify listening.</p><button className="account-button" type="button" onClick={onProfile}>Log in to Ripple</button></section>;
  return <section className="ripple-mix settings-page">
    <div className="mix-heading"><div><p className="eyebrow">FAMILIAR FEELING. NEW DISCOVERIES.</p><h1>Your Ripple Mix</h1><p>Your favorites are the starting point. See where they take you.</p></div><span className="mix-badge">Made for your ears</span></div>
    {demo && <p className="notice">Design preview — example cards only. Spotify is not connected and nothing is saved to Spotify.</p>}
    {error && <p role="alert">{error}</p>}{notice && <output>{notice}</output>}
    {!status && !error && <output>Loading your mix…</output>}
    {!status && error && <button type="button" onClick={() => window.location.reload()}>Try again</button>}
    {status?.connected === false && <SpotifyConnection/>}
    {status?.connected && <>
      <section className="account-panel mix-controls"><h2>Shape your mix</h2><p>Your Ripple saves always guide your mix. These Spotify sources are optional—even an empty Spotify library works:</p>
        <fieldset disabled={busy} className="mix-sources"><legend className="sr-only">Sources for recommendations</legend>{[['saved', 'Saved songs'], ['top', 'Top artists & songs'], ['recent', 'Recent listening']].map(([key, label]) => <label key={key}><input type="checkbox" checked={preferences[key]} onChange={e => setPreferences(p => ({ ...p, [key]: e.target.checked }))}/>{label}</label>)}</fieldset>
        <button type="button" disabled={busy} onClick={() => void run(loadPlaylists)}>Choose Spotify playlists</button>
        {playlists.length > 0 && <fieldset disabled={busy}><legend>Use up to three playlists</legend>{playlists.map(p => <label className="mix-check" key={p.id}><input type="checkbox" checked={preferences.playlists.includes(p.id)} disabled={!preferences.playlists.includes(p.id) && preferences.playlists.length >= 3} onChange={e => setPreferences(current => ({ ...current, playlists: e.target.checked ? [...current.playlists, p.id] : current.playlists.filter(id => id !== p.id) }))}/>{p.name}</label>)}</fieldset>}
        <label className="mix-slider">Discovery level <strong>{preferences.adventure}% adventurous</strong><input type="range" min="0" max="100" step="10" value={preferences.adventure} disabled={busy} onChange={e => setPreferences(p => ({ ...p, adventure: Number(e.target.value) }))}/><span>Familiar <span>Adventurous</span></span></label>
        <details className="mix-explanation"><summary>How your mix works</summary><p className="fine-print">Your mix balances artists you saved or listen to with related discoveries of different audience sizes. More adventurous makes room for more discoveries; it does not mean smaller artists only. The balance depends on available matches. Audience comparisons use Last.fm listener data, not Spotify monthly listeners. Artist names are sent to Last.fm to find related music.</p>
        <p className="fine-print">This first version samples up to 50 saved songs, 50 recent plays, 20 top artists and songs, and 50 songs per selected playlist. Your mix stays here between visits; refresh to include new saves.</p></details>
        <div className="settings-actions"><button type="button" disabled={busy} onClick={() => void run(() => generate(Boolean(mix)))}>{busy ? 'Working…' : mix ? 'Refresh my mix' : 'Build my mix'}</button>{Boolean(mix?.tracks.length) && <button type="button" disabled={busy} onClick={() => void run(exportMix)}>Create private Spotify playlist</button>}</div>
        {exported && <p><a href={exported.url} target="_blank" rel="noreferrer">Open your Spotify playlist ↗</a></p>}
      </section>
      {mix && <><div className="section-title"><h2>A little you. A little unexpected.</h2><span>{mix.tracks.length} songs</span></div>{mix.warnings.map(w => <p className="notice" key={w}>{w}</p>)}
        {!mix.tracks.length && <p>Save some artists or songs, or enable another source, then build your mix again.</p>}
        <div className="mix-grid">{mix.tracks.map((track, index) => <article className="account-panel mix-track" key={track.id}>
          <div className="mix-art">{track.image ? <img src={track.image} alt="" loading="lazy"/> : <span aria-hidden="true">♫</span>}<span className="mix-number">{String(index + 1).padStart(2, '0')}</span></div>
          <p className="eyebrow">{mixLabel(track)}</p><h3>{track.name}</h3><p>{track.artist}</p><p className="fine-print">{track.reason}</p>
          {track.sourceUrl && <a className="fine-print" href={track.sourceUrl} target="_blank" rel="noreferrer">Related music source ↗</a>}
          <div className="mix-track-actions"><button type="button" disabled={demo} onClick={() => setPlaying(playing === track.id ? '' : track.id)}>{playing === track.id ? 'Close preview' : 'Preview song'}</button>
            {!demo && <><SaveButton item={{ kind: 'song', spotify_id: track.id, name: track.name, subtitle: track.artist, image: track.image || '' }}/><SpotifySaveButton id={track.id}/></>}
            <button type="button" disabled={busy} onClick={() => void run(() => dismiss(track.id))}>Not interested</button></div>
          {playing === track.id && !demo && <iframe title={`${track.name} Spotify preview`} src={`https://open.spotify.com/embed/track/${track.id}`} width="100%" height="152" style={{ border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}
        </article>)}</div></>}
    </>}
  </section>;
}
