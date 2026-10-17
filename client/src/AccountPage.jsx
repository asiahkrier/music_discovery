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
  const account = useAccount();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true); setError('');
    try { await account.signOut(); } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <section className="account-panel">
    <p className="eyebrow">MY ACCOUNT</p>
    <h1>{account.profile ? `Welcome, ${account.profile.username}` : 'Your account'}</h1>
    {account.demo && <p className="preview-notice">Preview mode · Temporary sample account.</p>}
    <output>{account.loading ? 'Loading your profile…' : account.error || 'You are signed in.'}</output>
    <button type="button" className="account-button" disabled={busy} onClick={() => void logout()}>{account.demo ? 'Exit preview' : 'Log out'}</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
export default function AccountPage() { const { user, loading, startDemo } = useAccount(); useEffect(() => { if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'profile') { const timer = setTimeout(startDemo, 0); return () => clearTimeout(timer); } }, [startDemo]); if (loading && !user) return <output>Checking your session…</output>; return user ? <Profile/> : <AuthForm/>; }
