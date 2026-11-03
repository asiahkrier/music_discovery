import React, { useRef, useState } from 'react';
import { supabase } from './account-client.js';
import { useAccount } from './AccountContext.jsx';

export default function AccountSettings({ onProfile }) {
  const { user, demo } = useAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const submitting = useRef(false);
  async function submit(event, action) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError(''); setMessage('');
    if (demo) { setMessage('Preview only — no account details were changed.'); return; }
    if (action === 'password' && (values.password.length < 12 || values.password !== values.confirm)) {
      setError('Use at least 12 characters and make sure both new passwords match.'); return;
    }
    if (action === 'delete' && values.confirmation !== 'DELETE') { setError('Type DELETE to confirm.'); return; }
    submitting.current = true; setBusy(true);
    try {
      if (action === 'delete') {
        const { data } = await supabase.auth.getSession();
        const response = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ password: values.current, confirmation: values.confirmation }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not delete your account. Please try again.');
        await supabase.auth.signOut({ scope: 'local' });
        setMessage('Your account and saved library have been deleted.');
        return;
      }
      const verified = await supabase.auth.signInWithPassword({ email: user.email, password: values.current });
      if (verified.error || verified.data.user?.id !== user.id) throw new Error('Your current password could not be verified.');
      const attributes = action === 'email' ? { email: values.email.trim() } : { password: values.password };
      const { error: updateError } = await supabase.auth.updateUser(attributes, { emailRedirectTo: `${window.location.origin}/?view=settings` });
      if (updateError) throw updateError;
      form.reset();
      setMessage(action === 'email' ? 'Email change requested. Check your current and new inboxes for confirmation instructions. Your email changes after confirmation.' : 'Your password has been updated.');
    } catch (e) { setError(e.message); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (!user) return <section className="account-panel settings-page"><h1>Account settings</h1>{message && <output>{message}</output>}<p>Log in to manage your account.</p><button type="button" onClick={onProfile}>Go to login</button></section>;
  return <section className="settings-page">
    <p className="eyebrow">YOUR ACCOUNT, YOUR CONTROL</p><h1>Settings</h1><p className="account-muted">Manage how you sign in to Ripple.</p>
    {demo && <p className="notice">Design preview. Changes are not saved.</p>}
    {error && <p role="alert">{error}</p>}{message && <output className="settings-feedback">{message}</output>}
    <section className="account-panel"><h2>Email address</h2><p className="account-muted">Current email: {user.email || 'listener@example.com'}</p>
      <form className="account-form" onSubmit={e => void submit(e, 'email')}><fieldset disabled={busy}>
        <label>New email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
        <label>Current password<input name="current" type="password" autoComplete="current-password" required/></label>
        <button type="submit" className="account-primary">{busy ? 'Please wait…' : 'Change email'}</button>
      </fieldset></form></section>
    <section className="account-panel"><h2>Password</h2><p className="account-muted">Choose a password with at least 12 characters.</p>
      <form className="account-form" onSubmit={e => void submit(e, 'password')}><fieldset disabled={busy}>
        <label>Current password<input name="current" type="password" autoComplete="current-password" required/></label>
        <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required/></label>
        <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={12} required/></label>
        <button type="submit" className="account-primary">{busy ? 'Please wait…' : 'Update password'}</button>
      </fieldset></form></section>
    <section className="account-panel settings-danger"><h2>Delete account</h2><p>This permanently removes your account, profile, uploaded profile pictures, and saved artists and songs. This cannot be undone.</p>
      {!confirmDelete ? <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete my account</button> :
        <form className="account-form" onSubmit={e => void submit(e, 'delete')}><fieldset disabled={busy}>
          <label>Current password<input name="current" type="password" autoComplete="current-password" required/></label>
          <label>Type DELETE to confirm<input name="confirmation" autoComplete="off" pattern="DELETE" required/></label>
          <div className="settings-actions"><button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button><button type="submit" className="account-primary">{busy ? 'Deleting…' : 'Permanently delete account'}</button></div>
        </fieldset></form>}
    </section>
  </section>;
}
