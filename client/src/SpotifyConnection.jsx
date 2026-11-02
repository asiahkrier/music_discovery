import React, { useEffect, useRef, useState } from 'react';
import { useAccount } from './AccountContext.jsx';
import { spotifyAccount } from './spotify-account-client.js';

export default function SpotifyConnection() {
  const { user, demo } = useAccount();
  const [status, setStatus] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const guard = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null); setError('');
    if (demo) { setStatus({ connected: false }); return undefined; }
    if (!user) return undefined;
    spotifyAccount('status', 'GET', undefined, controller.signal).then(setStatus).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [user?.id, demo]);
  async function action(disconnect = false) {
    if (guard.current) return;
    guard.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (demo) { setStatus({ connected: !disconnect, displayName: 'Preview listener' }); setMessage('Preview only. No Spotify account was connected or changed.'); return; }
      if (disconnect) {
        await spotifyAccount('connection', 'DELETE'); setStatus({ connected: false });
        setMessage('Disconnected. Your Ripple library and Ripple Mix are unchanged.');
      } else {
        const result = await spotifyAccount('connect', 'POST', {});
        window.location.assign(result.url);
      }
    } catch (e) { setError(e.message); }
    finally { guard.current = false; setBusy(false); }
  }
  const connectionLabel = status?.connected ? 'Disconnect Spotify' : 'Connect Spotify';
  const callback = new URLSearchParams(window.location.search).get('spotify');
  return <section className="account-panel spotify-connection">
    <p className="eyebrow">CONNECTED ACCOUNTS</p><h2>Your music, together.</h2>
    <p>Connect Spotify to save songs directly to your Spotify library.</p>
    <p className="account-muted">Your Ripple Mix uses only your Ripple saves. Spotify handles login; Ripple never receives your Spotify password. Songs are saved to Spotify only when you choose Save to Spotify.</p>
    {callback === 'connected' && <output>Spotify connection completed.</output>}
    {['failed', 'declined'].includes(callback) && <p role="alert">{callback === 'declined' ? 'Spotify connection was canceled. You can try again.' : 'Spotify could not be connected. Please try again and check app access.'}</p>}
    {status?.connected && <p>Connected as <strong>{status.displayName}</strong></p>}
    <button type="button" disabled={busy || !user} onClick={() => void action(Boolean(status?.connected))}>{busy ? 'Please wait…' : connectionLabel}</button>
    {status?.connected && <p className="fine-print">Disconnect removes your stored Spotify connection. To revoke Spotify’s permission too, remove Ripple in <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noreferrer">your Spotify apps</a>.</p>}
    {message && <output>{message}</output>}{error && <p role="alert">{error}</p>}
  </section>;
}

export function SpotifySaveButton({ id }) {
  const { user, demo } = useAccount();
  const [busy, setBusy] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState('');
  const guard = useRef(false);
  if (!user) return null;
  async function save() {
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try {
      if (demo) { setError('Preview only. Connect Spotify on a real account to save this song.'); return; }
      await spotifyAccount('saved-song', 'PUT', { id }); setSaved(true);
    } catch (e) { setError(e.message); }
    finally { guard.current = false; setBusy(false); }
  }
  const saveLabel = saved ? 'Saved to Spotify' : 'Save to Spotify';
  return <div className="spotify-save-action"><button type="button" className="account-button" disabled={busy || saved} onClick={() => void save()}>{busy ? 'Saving…' : saveLabel}</button>{error && <p role="alert">{error}</p>}</div>;
}
