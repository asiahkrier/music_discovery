import React, { useEffect, useRef, useState } from 'react';
import { SaveButton, useAccount } from './AccountContext.jsx';
import { rippleMix } from './mix-client.js';

const defaults = { adventure: 60 };
const sampleMix = {
  generatedAt: '2026-10-28T12:00:00Z', warnings: [],
  tracks: [
    { id: 'preview-one', name: 'A new R&B discovery', artist: 'An artist outside your usual rotation', reason: 'Because you saved SZA', newToYou: true, smallerAudience: true },
    { id: 'preview-two', name: 'Your next late-night favorite', artist: 'A related independent artist', reason: 'Inspired by your Ripple favorites', newToYou: true },
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
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [playing, setPlaying] = useState('');
  const guard = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'mix' && !user) startDemo();
  }, [user, startDemo]);
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null); setMix(null); setError('');
    if (demo) { setStatus({}); setMix(sampleMix); return undefined; }
    if (!user) return undefined;
    rippleMix('status', { signal: controller.signal }).then(async data => {
      setStatus(data); setMix(data.mix); setPreferences(data.preferences || defaults);
      if (data.mix) {
        const refreshed = await rippleMix('mix', { method: 'POST', body: {}, signal: controller.signal });
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
    await rippleMix('preferences', { method: 'PUT', body: preferences });
    const result = await rippleMix('mix', { method: 'POST', body: { refresh } }); setMix(result.mix); setPlaying('');
  }
  async function dismiss(id) {
    if (demo) { setMix(current => ({ ...current, tracks: current.tracks.filter(t => t.id !== id) })); return; }
    const result = await rippleMix('dismiss', { method: 'POST', body: { id } }); setMix(result.mix);
  }
  let buildLabel = 'Build my mix';
  if (busy) buildLabel = 'Working…';
  else if (mix) buildLabel = 'Refresh my mix';
  if (!user) return <section className="account-panel"><h1>Your Ripple Mix</h1><p>Sign in to turn your saved Ripple artists and songs into a personal mix.</p><button className="account-button" type="button" onClick={onProfile}>Log in to Ripple</button></section>;
  return <section className="ripple-mix settings-page">
    <div className="mix-heading"><div><p className="eyebrow">FAMILIAR FEELING. NEW DISCOVERIES.</p><h1>Your Ripple Mix</h1><p>Your favorites are the starting point. See where they take you.</p></div><span className="mix-badge">Made for your ears</span></div>
    {demo && <p className="notice">Design preview — example cards only. No account data is changed.</p>}
    {error && <p role="alert">{error}</p>}{notice && <output>{notice}</output>}
    {!status && !error && <output>Loading your mix…</output>}
    {!status && error && <button type="button" onClick={() => window.location.reload()}>Try again</button>}
    {status && <>
      <section className="account-panel mix-controls"><h2>Shape your mix</h2><p>Based only on artists and songs you save in Ripple. No Spotify account connection needed.</p>
        <label className="mix-slider">Discovery level <strong>{preferences.adventure}% adventurous</strong><input type="range" min="0" max="100" step="10" value={preferences.adventure} disabled={busy} onChange={e => setPreferences(p => ({ ...p, adventure: Number(e.target.value) }))}/><span>Familiar <span>Adventurous</span></span></label>
        <details className="mix-explanation"><summary>How your mix works</summary><p className="fine-print">Your mix balances artists from your Ripple saves with related discoveries of different audience sizes. More adventurous makes room for more discoveries; it does not mean smaller artists only. The balance depends on available matches. Audience comparisons use Last.fm listener data, not Spotify monthly listeners. Artist names are sent to Last.fm to find related music.</p>
        <p className="fine-print">Ripple considers your 100 most recent saves, using up to 20 saved artists and 10 saved songs to choose starting artists. Your mix stays here between visits; refresh to include new saves.</p></details>
        <div className="settings-actions"><button type="button" disabled={busy} onClick={() => void run(() => generate(Boolean(mix)))}>{buildLabel}</button></div>

      </section>
      {mix && <><div className="section-title"><h2>A little you. A little unexpected.</h2><span>{mix.tracks.length} songs</span></div>{mix.warnings.map(w => <p className="notice" key={w}>{w}</p>)}
        {!mix.tracks.length && <p>Save artists or songs in Ripple, then refresh your mix.</p>}
        <div className="mix-grid">{mix.tracks.map((track, index) => <article className="account-panel mix-track" key={track.id}>
          <div className="mix-art">{track.image ? <img src={track.image} alt="" loading="lazy"/> : <span aria-hidden="true">♫</span>}<span className="mix-number">{String(index + 1).padStart(2, '0')}</span></div>
          <p className="eyebrow">{mixLabel(track)}</p><h3>{track.name}</h3><p>{track.artist}</p><p className="fine-print">{track.reason}</p>
          {track.sourceUrl && <a className="fine-print" href={track.sourceUrl} target="_blank" rel="noreferrer">Related music source ↗</a>}
          <div className="mix-track-actions"><button type="button" disabled={demo} onClick={() => setPlaying(playing === track.id ? '' : track.id)}>{playing === track.id ? 'Close preview' : 'Preview song'}</button>
          {!demo && <SaveButton item={{ kind: 'song', spotify_id: track.id, name: track.name, subtitle: track.artist, image: track.image || '' }}/>}
            <button type="button" disabled={busy} onClick={() => void run(() => dismiss(track.id))}>Not interested</button></div>
          {playing === track.id && !demo && <iframe title={`${track.name} Spotify preview`} src={`https://open.spotify.com/embed/track/${track.id}`} width="100%" height="152" style={{ border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}
        </article>)}</div></>}
    </>}
  </section>;
}
