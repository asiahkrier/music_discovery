import express from 'express';
import { createClient } from '@supabase/supabase-js';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export function accountSettingsRouter({ url, secret, publicKey, clientFactory = createClient } = {}) {
  const router = express.Router();
  const attempts = new Map();
  router.delete('/', express.json({ limit: '4kb' }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!url || !secret || !publicKey) return res.status(503).json({ error: 'Account deletion is not available yet. Please try again later.' });
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({ error: 'Please log in again.' });
    if (req.body?.confirmation !== 'DELETE' || typeof req.body?.password !== 'string' || !req.body.password || req.body.password.length > 1024) return res.status(400).json({ error: 'Enter your current password and type DELETE.' });
    try {
      const admin = clientFactory(url, secret, options);
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user?.email) return res.status(401).json({ error: 'Please log in again.' });
      const user = data.user;
      const now = Date.now();
      for (const [key, expiry] of attempts) if (expiry <= now) attempts.delete(key);
      if (attempts.has(user.id)) return res.status(429).json({ error: 'Please wait one minute before trying again.' });
      attempts.set(user.id, now + 60000);
      const verifier = clientFactory(url, publicKey, options);
      const verified = await verifier.auth.signInWithPassword({ email: user.email, password: req.body.password });
      if (verified.error || verified.data.user?.id !== user.id) return res.status(403).json({ error: 'Your current password could not be verified.' });
      // Revoke the temporary verification session; never return its credentials.
      await verifier.auth.signOut({ scope: 'local' });
      await removeAvatars(admin.storage.from('avatars'), user.id);
      const deleted = await admin.auth.admin.deleteUser(user.id);
      if (deleted.error) throw new Error('Deletion failed');
      return res.json({ deleted: true });
    } catch {
      return res.status(502).json({ error: 'Could not finish deleting your account. Some profile pictures may already have been removed. Please try again in a minute.' });
    }
  });
  return router;
}

async function removeAvatars(bucket, userId) {
  const { data, error } = await bucket.list(userId, { limit: 100 });
  if (error) throw new Error('Could not list profile pictures');
  if (!data?.length) return;
  if (data.some(item => !item.id)) throw new Error('Unexpected profile picture folder');
  const result = await bucket.remove(data.map(item => `${userId}/${item.name}`));
  if (result.error) throw new Error('Could not remove profile pictures');
  return removeAvatars(bucket, userId);
}
