import React, { useState, useEffect, useRef } from 'react';
import { supabase, validateSignup, checkUsernameAvailable } from './account-client.js';
import SignupArtwork from './SignupArtwork.jsx';
import { useAccount } from './AccountContext.jsx';

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
      if (!login) await checkUsernameAvailable(supabase, values.username);
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
      if (!data.session) setMessage('Check your email to confirm your account. If you already have an account, log in instead.');
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
        <button className="account-primary" disabled={busy}>{busy ? 'Please wait…' : login ? 'Log in' : 'Create account'}</button>
      </form>
      <p className="auth-switch">{login ? 'New to Ripple?' : 'Already have an account?'} <button onClick={() => { setLogin(v => !v); setError(''); setMessage(''); }}>{login ? 'Create account' : 'Log in'}</button></p>
      {import.meta.env.DEV && <><button className="account-button demo-button" onClick={startDemo}>Preview profile with sample content ↗</button><p className="fine-print">Preview mode uses temporary sample data. It does not create an account or store a password.</p></>}
    </section>
  </div>;
}

function Profile() {
  const account = useAccount(); const { profile, demo } = account;
  const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function run(action) { setBusy(true); setError(''); setNotice(''); try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function edit(event) {
    event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => { await account.saveProfile(fields); setEditing(false); setNotice('Profile saved.'); });
  }
  if (!profile) return <div className="account-panel"><h1>Your profile</h1><output>{account.loading ? 'Loading your profile…' : account.error || 'Your profile is not available yet.'}</output><button className="account-button" onClick={() => void run(account.signOut)}>Log out</button>{error && <p role="alert">{error}</p>}</div>;
  return <div className="user-profile">
    {demo && <p className="preview-notice">Preview mode · Sample profile. Changes last until you leave or reload this preview.</p>}
    <section className="user-banner"><div className="avatar-column"><div className="user-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile"/> : <span>≋</span>}</div><label className="account-button upload-label">{busy ? 'Please wait…' : 'Change photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void run(() => account.uploadPhoto(file)); e.target.value = ''; }}/></label><small>JPG, PNG or WebP · Up to 2 MB</small></div>
      <div className="user-identity"><p className="eyebrow">MY PROFILE</p><h1>{profile.display_name || profile.username}</h1><p className="account-muted">@{profile.username}</p><p>{profile.bio || 'Add a little about your taste in music.'}</p><div className="tags">{(profile.genres || '').split(',').filter(g => g.trim()).map((g, index) => <span key={index}>{g.trim()}</span>)}</div></div>
      <div className="profile-actions"><button className="account-button" onClick={() => setEditing(v => !v)}>{editing ? 'Cancel editing' : 'Edit profile'}</button><button className="account-button" disabled={busy} onClick={() => void run(account.signOut)}>{demo ? 'Exit preview' : 'Log out'}</button></div>
    </section>
    {error && <p className="notice error" role="alert">{error}</p>}{notice && <output>{notice}</output>}
    {editing && <form className="account-panel account-form edit-profile" onSubmit={e => void edit(e)}><h2>Edit your profile</h2><label>Display name<input name="display_name" defaultValue={profile.display_name} maxLength={60} required/></label><label>Short bio<textarea name="bio" defaultValue={profile.bio} maxLength={240} rows={3}/></label><label>Favorite genres<input name="genres" defaultValue={profile.genres} maxLength={120} placeholder="R&B, Pop, K-pop"/></label><button className="account-primary" disabled={busy}>Save changes</button></form>}
  </div>;
}
export default function AccountPage() { const { user, loading, startDemo } = useAccount(); useEffect(() => { if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'profile') { const timer = setTimeout(startDemo, 0); return () => clearTimeout(timer); } }, []); if (loading && !user) return <output>Checking your session…</output>; return user ? <Profile/> : <AuthForm/>; }
