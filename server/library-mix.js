import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { buildMix, mixPreferences } from './ripple-mix.js';
import { requireRippleUser, mixWeek, claimRebuild, mixSeed, withoutTrack } from './mix-shared.js';

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
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(requireRippleUser(admin, {
    unavailable: 'Ripple Mix is temporarily unavailable.',
    login: 'Log in to Ripple to build your mix.',
    unverified: 'Could not verify your Ripple session.',
  }));
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
    await save(user, { preferences, mix: row.mix || null });
    return { preferences };
  });
  route('post', '/dismiss', async (req, user) => {
    if (!/^[A-Za-z0-9]{22}$/.test(req.body?.id || '')) throw fail('Choose a valid song.', 400);
    const row = await read(user);
    const preferences = libraryMixPreferences({ ...row.preferences, dismissed: [...(row.preferences?.dismissed || []), req.body.id] });
    const mix = withoutTrack(row.mix, req.body.id);
    await save(user, { preferences, mix }); return { mix };
  });
  route('post', '/mix', async (req, user) => {
    const row = await read(user), now = Date.now(), week = mixWeek(now);
    if (row.mix?.week === week && row.mix?.adventure === libraryMixPreferences(row.preferences).adventure && !req.body?.refresh) return { mix: row.mix };
    if (!claimRebuild(cooldowns, user, now)) throw fail('Please wait one minute before rebuilding your mix.', 429);
    const library = checked(await admin.from('library_items').select('*').eq('user_id', user).order('created_at', { ascending: false }).limit(100)) || [];
    const preferences = libraryMixPreferences(row.preferences);
    const seed = mixSeed(req.body?.refresh, user, week);
    const history = row.mix ? [{ trackIds: row.mix.tracks.map(t => t.id), artistIds: [...new Set(row.mix.tracks.map(t => t.artistId).filter(Boolean))] }, ...(row.mix.history || [])].slice(0, 3) : [];
    const result = library.length ? await builder({ api, related, library, preferences, seed, history }) : { tracks: [], warnings: ['Save artists or songs in Ripple to start your mix.'], generatedAt: new Date().toISOString(), seedCount: 0 };
    if (history.length && library.length && !result.tracks.length) throw fail('No fresh matches are available right now. Your previous mix is kept. Save more artists or try again later.', 422);
    const mix = { ...result, week, adventure: preferences.adventure, history };
    await save(user, { preferences, mix }); return { mix };
  });
  return router;
}
