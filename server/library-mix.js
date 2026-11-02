import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { buildMix, mixPreferences } from './ripple-mix.js';

const fail = (message, status = 503) => Object.assign(new Error(message), { status });
const checked = result => {
  if (result.error) throw fail('Could not load or save your Ripple Mix. Please try again.');
  return result.data;
};
export function libraryMixPreferences(value = {}) {
  const { adventure, dismissed } = mixPreferences(value);
  return { adventure, dismissed };
}
export function libraryMixRouter({ url, secret, clientFactory = createClient, api, related, builder = buildMix } = {}) {
  const router = express.Router(), locks = new Set(), cooldowns = new Map();
  const admin = url && secret ? clientFactory(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  router.use(express.json({ limit: '4kb' }));
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!admin) return res.status(503).json({ error: 'Ripple Mix is temporarily unavailable.' });
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({ error: 'Log in to Ripple to build your mix.' });
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return res.status(401).json({ error: 'Your Ripple session expired. Please log in again.' });
      req.rippleUser = data.user.id; next();
    } catch { res.status(503).json({ error: 'Could not verify your Ripple session.' }); }
  });
  const read = async user => checked(await admin.from('ripple_mixes').select('*').eq('user_id', user).maybeSingle()) || {};
  const save = async (user, value) => checked(await admin.from('ripple_mixes').upsert({ ...value, user_id: user, updated_at: new Date().toISOString() }));
  function route(method, path, action) {
    router[method](path, async (req, res) => {
      const user = req.rippleUser;
      if (locks.has(user)) return res.status(409).json({ error: 'Your mix is still updating. Please wait.' });
      locks.add(user);
      try { res.json(await action(req, user)); }
      catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'Could not build your mix. Please try again.' }); }
      finally { locks.delete(user); }
    });
  }
  route('get', '/status', async (_req, user) => {
    const row = await read(user);
    return { preferences: libraryMixPreferences(row.preferences), mix: row.mix || null };
  });
  route('put', '/preferences', async (req, user) => {
    const row = await read(user);
    const preferences = libraryMixPreferences({ adventure: req.body?.adventure, dismissed: row.preferences?.dismissed });
    await save(user, { preferences, mix: preferences.adventure === libraryMixPreferences(row.preferences).adventure ? row.mix || null : null });
    return { preferences };
  });
  route('post', '/dismiss', async (req, user) => {
    if (!/^[A-Za-z0-9]{22}$/.test(req.body?.id || '')) throw fail('Choose a valid song.', 400);
    const row = await read(user);
    const preferences = libraryMixPreferences({ ...row.preferences, dismissed: [...(row.preferences?.dismissed || []), req.body.id] });
    const mix = row.mix ? { ...row.mix, tracks: row.mix.tracks.filter(t => t.id !== req.body.id) } : null;
    await save(user, { preferences, mix }); return { mix };
  });
  route('post', '/mix', async (req, user) => {
    const row = await read(user), now = Date.now();
    const week = Math.floor((now - Date.UTC(2026, 0, 5)) / 604800000);
    if (row.mix?.week === week && !req.body?.refresh) return { mix: row.mix };
    for (const [id, until] of cooldowns) if (until <= now) cooldowns.delete(id);
    if (cooldowns.has(user)) throw fail('Please wait one minute before rebuilding your mix.', 429);
    cooldowns.set(user, now + 60000);
    const library = checked(await admin.from('library_items').select('*').eq('user_id', user).order('created_at', { ascending: false }).limit(100)) || [];
    const preferences = libraryMixPreferences(row.preferences);
    const seed = req.body?.refresh ? randomBytes(8).toString('hex') : `${user}:${week}`;
    const result = library.length ? await builder({ api, related, library, preferences, seed }) : { tracks: [], warnings: ['Save artists or songs in Ripple to start your mix.'], generatedAt: new Date().toISOString(), seedCount: 0 };
    const mix = { ...result, week };
    await save(user, { preferences, mix }); return { mix };
  });
  return router;
}
