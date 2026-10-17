import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;

export function validateSignup({ username, password, confirm }) {
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) return 'Use 3–24 letters, numbers, or underscores for your username.';
  if (password.length < 12) return 'Use at least 12 characters for your password.';
  if (password !== confirm) return 'Your passwords do not match.';
  return '';
}


export async function checkUsernameAvailable(client, username) {
  const { data, error } = await client.rpc('ripple_username_available', { requested_username: username.trim().toLowerCase() });
  if (error || typeof data !== 'boolean') throw new Error('We couldn’t check your username right now. Please try again.');
  if (!data) throw new Error('That username is already taken. Please choose another.');
}
