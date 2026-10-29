import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'node:crypto';
import { hash, tokenVault } from './spotify-vault.js';
import { buildMix, mixPreferences } from './ripple-mix.js';

const SCOPES = 'user-library-read user-library-modify user-top-read user-read-recently-played playlist-read-private playlist-read-collaborative playlist-modify-private';
const ID = /^[A-Za-z0-9]{22}$/;
const failure = (message, status = 502) => Object.assign(new Error(message), { status });
const check = result => { if (result.error) throw failure('Could not save your Spotify connection. Please try again.'); return result.data; };
const authOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function spotifyAccountRouter({ url, secret, clientId, clientSecret, redirectUri, encryptionKey, fetchImpl = fetch, clientFactory = createClient, related } = {}) {
  const router = express.Router();
  const configured = Boolean(url && secret && clientId && clientSecret && redirectUri && Buffer.from(encryptionKey || '', 'base64').length === 32);
  const admin = configured ? clientFactory(url, secret, authOptions) : null;
  const vault = configured ? tokenVault(encryptionKey) : null;
  const locks = new Map(), cooldowns = new Map();
  const cookieName = 'ripple_spotify_oauth';
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: redirectUri?.startsWith('https:'), path: '/api/spotify', maxAge: 600000 };
  const connection = user => admin.from('spotify_connections').select('*').eq('user_id', user).maybeSingle();
  const update = (user, changes) => admin.from('spotify_connections').update(changes).eq('user_id', user).select('user_id');
  async function exclusive(user, action) {
    if (locks.has(user)) throw failure('Another Spotify action is still running. Please try again shortly.', 409);
    locks.set(user, true);
    try { return await action(); } finally { locks.delete(user); }
  }
  async function tokenRequest(body) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetchImpl('https://accounts.spotify.com/api/token', { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw failure('Spotify authorization expired or was declined. Connect Spotify again.', 401);
    const data = await response.json();
    if (!data.access_token) throw failure('Spotify did not complete authorization. Please connect again.', 401);
    return data;
  }
  async function apiFor(user, record) {
    let credentials = vault.open(record.credentials, user);
    let refreshing;
    async function refreshToken() {
      const fresh = await tokenRequest({ grant_type: 'refresh_token', refresh_token: credentials.refresh_token });
      credentials = { ...credentials, ...fresh, expires: Date.now() + (fresh.expires_in || 3600) * 1000 };
      // An update, never an upsert: a disconnected account must not be recreated.
      const rows = check(await update(user, { credentials: vault.seal(credentials, user) }));
      if (!rows?.length) throw failure('Spotify was disconnected. Connect again to continue.', 401);
    }
    async function refresh() {
      if (!refreshing) refreshing = refreshToken().finally(() => { refreshing = null; });
      return refreshing;
    }
    if (credentials.expires < Date.now() + 60000) await refresh();
    return async function api(path, options = {}) {
      const request = () => fetchImpl(`https://api.spotify.com/v1/${path}`, { ...options, headers: { Authorization: `Bearer ${credentials.access_token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
      let response = await request();
      if (response.status === 401) { await refresh(); response = await request(); }
      if (response.status === 429) throw failure('Spotify is busy. Please wait a few minutes before trying again.', 429);
      if (response.status === 403) throw failure('Spotify did not allow this action. Check your app access and reconnect to grant permissions.', 403);
      if (!response.ok) throw failure('Spotify could not complete this action. Please try again.', response.status === 401 ? 401 : 502);
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    };
  }
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('Referrer-Policy', 'no-referrer'); next(); });
  // Spotify returns here in the same browser; state is single-use and bound to that browser.
  router.get('/callback', async (req, res) => {
    const finish = status => res.redirect(`${new URL(redirectUri).origin}/?view=settings&spotify=${status}`);
    if (!configured) return res.status(503).send('Spotify connection is not configured. Return to Ripple settings.');
    try {
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const cookie = (req.headers.cookie || '').split('; ').find(c => c.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || '';
      if (!state || !cookie) throw failure('Invalid authorization state.', 400);
      const found = check(await admin.from('spotify_oauth_states').select('user_id').eq('state_hash', hash(state)).eq('browser_hash', hash(cookie)).gt('expires_at', new Date().toISOString()).maybeSingle());
      if (!found) throw failure('Authorization expired.', 400);
      res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
      await exclusive(found.user_id, async () => {
        const rows = check(await admin.from('spotify_oauth_states').delete().eq('user_id', found.user_id).eq('state_hash', hash(state)).eq('browser_hash', hash(cookie)).gt('expires_at', new Date().toISOString()).select('*'));
        const pending = rows?.[0];
        if (!pending) throw failure('Authorization expired.', 400);
        if (req.query.error) return;
        if (typeof req.query.code !== 'string') throw failure('Missing authorization code.', 400);
        const token = await tokenRequest({ grant_type: 'authorization_code', code: req.query.code, redirect_uri: redirectUri, code_verifier: pending.verifier });
        if (!token.refresh_token || SCOPES.split(' ').some(scope => !token.scope?.split(' ').includes(scope))) throw failure('Required permissions were not granted.', 403);
        const response = await fetchImpl('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw failure('Could not identify Spotify account.');
        const profile = await response.json();
        if (!profile.id) throw failure('Missing Spotify account.');
        check(await admin.from('spotify_connections').upsert({ user_id: pending.user_id, spotify_user_id: profile.id, display_name: profile.display_name || 'Spotify listener', credentials: vault.seal({ ...token, expires: Date.now() + (token.expires_in || 3600) * 1000 }, pending.user_id), preferences: mixPreferences(), mix: null, updated_at: new Date().toISOString() }));
      });
      return finish(req.query.error ? 'declined' : 'connected');
    } catch { return finish('failed'); }
  });
  router.use(express.json({ limit: '12kb' }));
  router.use(async (req, res, next) => {
    if (!configured) return res.status(503).json({ error: 'Spotify account linking is not configured yet.' });
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer) return res.status(401).json({ error: 'Log in to Ripple first.' });
    try {
      const { data, error } = await admin.auth.getUser(bearer);
      if (error || !data.user) return res.status(401).json({ error: 'Your Ripple session expired. Please log in again.' });
      req.rippleUser = data.user.id; next();
    } catch { res.status(503).json({ error: 'Could not verify your Ripple session. Try again.' }); }
  });
  function route(method, path, handler) {
    router[method](path, async (req, res) => {
      try { res.json(await exclusive(req.rippleUser, () => handler(req, res))); }
      catch (e) { res.status(e.status || 502).json({ error: e.status ? e.message : 'Could not complete this Spotify action. Please try again.' }); }
    });
  }
  async function connected(user) {
    const row = check(await connection(user));
    if (!row) throw failure('Connect Spotify in Settings first.', 409);
    return row;
  }
  route('get', '/status', async req => {
    const row = check(await connection(req.rippleUser));
    return { connected: Boolean(row), displayName: row?.display_name || '', preferences: mixPreferences(row?.preferences), mix: row?.mix || null };
  });
  route('post', '/connect', async (req, res) => {
    const state = randomBytes(32).toString('base64url'), browser = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
    check(await admin.from('spotify_oauth_states').delete().lt('expires_at', new Date().toISOString()));
    check(await admin.from('spotify_oauth_states').upsert({ user_id: req.rippleUser, state_hash: hash(state), browser_hash: hash(browser), verifier, expires_at: new Date(Date.now() + 600000).toISOString() }));
    res.cookie(cookieName, browser, cookieOptions);
    const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: SCOPES, state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'), show_dialog: 'true' });
    return { url: `https://accounts.spotify.com/authorize?${params}` };
  });
  route('delete', '/connection', async req => {
    check(await admin.from('spotify_oauth_states').delete().eq('user_id', req.rippleUser));
    check(await admin.from('spotify_connections').delete().eq('user_id', req.rippleUser));
    cooldowns.delete(req.rippleUser);
    return { disconnected: true };
  });
  route('get', '/playlists', async req => {
    const row = await connected(req.rippleUser), api = await apiFor(req.rippleUser, row);
    const data = await api('me/playlists?limit=50');
    return { playlists: (data.items || []).filter(p => p && (p.owner?.id === row.spotify_user_id || p.collaborative)).map(p => ({ id: p.id, name: p.name })), limited: Boolean(data.next) };
  });
  route('put', '/preferences', async req => {
    const row = await connected(req.rippleUser);
    const preferences = mixPreferences({ ...req.body, dismissed: row.preferences?.dismissed || [] });
    check(await update(req.rippleUser, { preferences, mix: null }));
    return { preferences };
  });
  route('post', '/dismiss', async req => {
    if (!ID.test(req.body?.id || '')) throw failure('Choose a valid song.', 400);
    const row = await connected(req.rippleUser);
    const preferences = mixPreferences({ ...row.preferences, dismissed: [...(row.preferences?.dismissed || []), req.body.id] });
    const mix = row.mix ? { ...row.mix, tracks: row.mix.tracks.filter(t => t.id !== req.body.id) } : null;
    check(await update(req.rippleUser, { preferences, mix }));
    return { mix };
  });
  route('post', '/mix', async req => {
    const user = req.rippleUser, row = await connected(user), now = Date.now();
    const week = Math.floor((now - Date.UTC(2026, 0, 5)) / 604800000);
    if (row.mix?.week === week && !req.body?.refresh) return { mix: row.mix };
    for (const [id, expiry] of cooldowns) if (expiry <= now) cooldowns.delete(id);
    if (cooldowns.has(user)) throw failure('Please wait one minute before rebuilding your mix.', 429);
    cooldowns.set(user, now + 60000);
    const library = check(await admin.from('library_items').select('*').eq('user_id', user).order('created_at', { ascending: false }).limit(100));
    const api = await apiFor(user, row);
    const seed = req.body?.refresh ? randomBytes(8).toString('hex') : `${user}:${week}`;
    const mix = { ...await buildMix({ api, related, library: library || [], preferences: mixPreferences(row.preferences), seed }), week };
    check(await update(user, { mix, updated_at: new Date().toISOString() }));
    return { mix };
  });
  route('put', '/saved-song', async req => {
    if (!ID.test(req.body?.id || '')) throw failure('Choose a valid song.', 400);
    const api = await apiFor(req.rippleUser, await connected(req.rippleUser));
    const query = new URLSearchParams({ uris: `spotify:track:${req.body.id}` });
    await api(`me/library?${query}`, { method: 'PUT' });
    return { saved: true };
  });
  route('post', '/export', async req => {
    const row = await connected(req.rippleUser);
    if (!row.mix?.tracks?.length) throw failure('Build a mix before creating a playlist.', 400);
    const api = await apiFor(req.rippleUser, row);
    // Reuse the recorded playlist on retry if the add-items request failed.
    let playlist = row.mix.export;
    if (!playlist) {
      const created = await api('me/playlists', { method: 'POST', body: JSON.stringify({ name: 'Your Ripple Mix', public: false, description: 'A personal mix of familiar songs and new discoveries, selected by Ripple.' }) });
      playlist = { id: created.id, url: `https://open.spotify.com/playlist/${created.id}` };
      check(await update(req.rippleUser, { mix: { ...row.mix, export: playlist } }));
    }
    await api(`playlists/${playlist.id}/items`, { method: 'PUT', body: JSON.stringify({ uris: row.mix.tracks.map(t => `spotify:track:${t.id}`) }) });
    return { playlist };
  });
  return router;
}
