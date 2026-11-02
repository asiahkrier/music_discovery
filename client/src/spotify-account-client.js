import { supabase } from './account-client.js';
export async function spotifyAccount(path, method, body, signal) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: {} };
  if (!data.session) throw new Error('Log in to Ripple to connect your Spotify account.');
  const response = await fetch(`/api/spotify/${path}`, { method: method || 'GET', signal, headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not reach Spotify. Please try again.');
  return result;
}
