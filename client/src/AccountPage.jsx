import React, { useState, useEffect, useRef } from 'react';
import { supabase, validateSignup, checkUsernameAvailable } from './account-client.js';
import SignupArtwork from './SignupArtwork.jsx';
import { SaveButton, useAccount } from './AccountContext.jsx';

function AuthForm() {
  const { startDemo } = useAccount();
  const [login, setLogin] = useState(false); const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setError(''); setMessage('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const validation = login ? '' : validateSignup(values);
    if (validation) { setError(validation); return; }
    if (!supabase) { setError('Account signup is temporarily unavailable. Please try again later.'); return; }
    submitting.current = true;
    setBusy(true);
    try {
      if (!login) {
        await checkUsernameAvailable(supabase, values.username);
      }
      const credentials = { email: values.email.trim(), password: values.password };
      const { data, error: e } = login ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { data: { username: values.username.trim().toLowerCase() }, emailRedirectTo: `${window.location.origin}/?view=account` } });
      if (e) {
        // A concurrent signup may have claimed the username after our first check.
        if (!login && (e.code === 'unexpected_failure' || e.message.includes('Database'))) {
          await checkUsernameAvailable(supabase, values.username);
          throw new Error('We couldn’t create your account right now. Please try again.');
        }
        throw e;
      }
      if (!data.session) {
        setMessage('Check your email to confirm your account. If you already have an account, log in instead.');
      }
      event.target.reset();
    } catch (e) { setError(e.message); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="signup-layout">
    <div className="signup-story"><p className="eyebrow">YOUR SOUND. YOUR SPACE.</p><h1>Your next favorite<br/>starts here<span>.</span></h1><p>Discover new artists. Save the songs that stay with you.</p><SignupArtwork/><div className="signup-benefits"><span>♡ Favorite artists</span><span>＋ Save songs</span><span>◎ Make it yours</span></div></div>
    <section className="account-panel"><p className="eyebrow">WELCOME TO RIPPLE</p><h2>{login ? 'Welcome back' : 'Create your account'}</h2><p className="account-muted">Make room for your next favorite.</p>
      {!supabase && <p className="preview-notice">Design preview · Live account creation is not connected yet.</p>}
      <form onSubmit={e => void submit(e)} className="account-form">
        {!login && <label>Username<input name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" placeholder="Choose your unique username"/><small>3–24 letters, numbers, or underscores.</small></label>}
        <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com"/></label>
        <label>Password<div className="password-field"><input name="password" type={visible ? 'text' : 'password'} required minLength={login ? 1 : 12} autoComplete={login ? 'current-password' : 'new-password'} placeholder="Enter your password"/><button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button></div>{!login && <small>Use at least 12 characters.</small>}</label>
        {!login && <label>Confirm password<input name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" required placeholder="Enter your password again"/></label>}
        {error && <p className="notice error" role="alert">{error}</p>}{message && <output>{message}</output>}
        <button type="submit" className="account-primary" disabled={busy}>{busy ? 'Please wait…' : login ? 'Log in' : 'Create account'}</button>
      </form>
      <p className="auth-switch">{login ? 'New to Ripple?' : 'Already have an account?'} <button type="button" onClick={() => { setLogin(v => !v); setError(''); setMessage(''); }}>{login ? 'Create account' : 'Log in'}</button></p>
      {import.meta.env.DEV && <><button type="button" className="account-button demo-button" onClick={startDemo}>Preview profile with sample content ↗</button><p className="fine-print">Preview mode uses temporary sample data. It does not create an account or store a password.</p></>}
    </section>
  </div>;
}

function Profile() {
  const account = useAccount(); const { profile, library, demo } = account;
  const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''); const [playing, setPlaying] = useState(null);
  async function run(action) { setBusy(true); setError(''); setNotice(''); try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function edit(event) {
    event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => { await account.saveProfile(fields); setEditing(false); setNotice('Profile saved.'); });
  }
  if (!profile) return <div className="account-panel"><h1>Your profile</h1><output>{account.loading ? 'Loading your profile…' : account.error || 'Your profile is not available yet.'}</output><button type="button" className="account-button" onClick={() => void run(account.signOut)}>Log out</button>{error && <p role="alert">{error}</p>}</div>;
  const artists = library.filter(i => i.kind === 'artist');
  const songs = library.filter(i => i.kind === 'song' && `${i.name} ${i.subtitle}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="user-profile">
    {demo && <p className="preview-notice">Preview mode · Sample library. Changes last until you leave or reload this preview.</p>}
    <section className="user-banner"><div className="avatar-column"><div className="user-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile"/> : <span>≋</span>}</div><label className="account-button upload-label">{busy ? 'Please wait…' : 'Change photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) {
        void run(() => account.uploadPhoto(file));
      }
      e.target.value = ''; }}/></label><small>JPG, PNG or WebP · Up to 2 MB</small></div>
      <div className="user-identity"><p className="eyebrow">MY PROFILE</p><h1>{profile.display_name || profile.username}</h1><p className="account-muted">@{profile.username}</p><p>{profile.bio || 'Add a little about your taste in music.'}</p><div className="tags">{[...new Set((profile.genres || '').split(',').map(genre => genre.trim()).filter(Boolean))].map(genre => <span key={genre}>{genre}</span>)}</div><div className="library-counts"><div><strong>{artists.length}</strong><span>favorite artists</span></div><div><strong>{library.filter(i => i.kind === 'song').length}</strong><span>saved songs</span></div></div></div>
      <div className="profile-actions"><button type="button" className="account-button" onClick={() => setEditing(v => !v)}>{editing ? 'Cancel editing' : 'Edit profile'}</button><button type="button" className="account-button" disabled={busy} onClick={() => void run(account.signOut)}>{demo ? 'Exit preview' : 'Log out'}</button></div>
    </section>
    {error && <p className="notice error" role="alert">{error}</p>}{notice && <output>{notice}</output>}
    {editing && <form className="account-panel account-form edit-profile" onSubmit={e => void edit(e)}><h2>Edit your profile</h2><label>Display name<input name="display_name" defaultValue={profile.display_name} maxLength={60} required/></label><label>Short bio<textarea name="bio" defaultValue={profile.bio} maxLength={240} rows={3}/></label><label>Favorite genres<input name="genres" defaultValue={profile.genres} maxLength={120} placeholder="R&B, Pop, K-pop"/></label><button type="submit" className="account-primary" disabled={busy}>Save changes</button></form>}
    <section className="account-panel library-panel"><div className="library-heading"><h2>Favorite artists</h2><span>{artists.length} saved</span></div>{!artists.length && <p className="account-muted">Your next favorites belong here. Open an artist and select Save artist.</p>}<div className="favorite-grid">{artists.map((artist, index) => <article key={artist.spotify_id} className="favorite-card"><a href={`https://open.spotify.com/artist/${artist.spotify_id}`} target="_blank" rel="noreferrer"><div className={`favorite-art art-${index % 3}`}>{artist.image ? <img src={artist.image} alt=""/> : <span>{artist.name.slice(0,2).toUpperCase()}</span>}</div><h3>{artist.name}</h3></a><p>{artist.subtitle}</p><SaveButton item={artist}/></article>)}</div></section>
    <section className="account-panel library-panel"><div className="library-heading"><h2>Saved songs</h2><input aria-label="Search saved songs" placeholder="Search your saved songs" value={query} onChange={e => setQuery(e.target.value)}/></div>{!songs.length && <p className="account-muted">{query ? 'No saved songs match your search.' : 'Search for a song and save it to start your library.'}</p>}{songs.map(song => <div className="saved-song" key={song.spotify_id}><div className="song-icon" aria-hidden="true">♫</div><div><strong>{song.name}</strong><small>{song.subtitle}</small></div><button type="button" className="account-button" onClick={() => setPlaying(playing === song.spotify_id ? null : song.spotify_id)}>{playing === song.spotify_id ? 'Close player' : '▷ Preview'}</button><SaveButton item={song}/>{playing === song.spotify_id && <iframe className="saved-embed" title={`${song.name} Spotify preview`} src={`https://open.spotify.com/embed/track/${song.spotify_id}`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" height="152"/>}</div>)}<p className="fine-print">Spotify controls preview availability. No music plays automatically.</p></section>
  </div>;
}
export default function AccountPage() { const { user, loading, startDemo } = useAccount(); useEffect(() => { if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'profile') { const timer = setTimeout(startDemo, 0); return () => clearTimeout(timer); } }, [startDemo]); if (loading && !user) return <output>Checking your session…</output>; return user ? <Profile/> : <AuthForm/>; }
