import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;

export function validateSignup({ username, password, confirm }) {
  if (!/^\w{3,24}$/.test(username.trim())) return 'Use 3–24 letters, numbers, or underscores for your username.';
  if (password.length < 12) return 'Use at least 12 characters for your password.';
  if (password !== confirm) return 'Your passwords do not match.';
  return '';
}


export async function checkUsernameAvailable(client, username) {
  const { data, error } = await client.rpc('ripple_username_available', { requested_username: username.trim().toLowerCase() });
  if (error || typeof data !== 'boolean') throw new Error('We couldn’t check your username right now. Please try again.');
  if (!data) throw new Error('That username is already taken. Please choose another.');
}

export function signupEmailFeedback(error, data) {
  if (['user_already_exists', 'email_exists'].includes(error?.code)) {
    return 'That email is already in use. Choose Log in below, or use another email.';
  }
  if (!error && data?.user?.identities?.length === 0) {
    return 'We couldn’t create a new account with this email. It may already be registered. Choose Log in below, or use another email.';
  }
  return '';
}

export async function checkSignupAvailability(field, value, signal, fetchImpl = fetch) {
  const response = await fetchImpl('/api/signup-availability', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, value }), signal,
  });
  const result = await response.json();
  if (!response.ok || typeof result.available !== 'boolean') throw new Error(result.error || 'Could not check availability. Please try again.');
  return result.available;
}
export function takenMessage(field) {
  return field === 'username' ? 'That username is already taken. Please choose another.' : 'That email is already in use. Log in instead, or use another email.';
}
