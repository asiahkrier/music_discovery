import express from 'express';
import { createClient } from '@supabase/supabase-js';

const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
export function signupAvailabilityRouter({ url, secret, clientFactory = createClient } = {}) {
  const router = express.Router(), attempts = new Map();
  router.post('/', express.json({ limit: '2kb' }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const now = Date.now();
    for (const [key, record] of attempts) if (record.until <= now) attempts.delete(key);
    const address = req.ip;
    const record = attempts.get(address) || { count: 0, until: now + 60000 };
    if (record.count >= 60 || attempts.size >= 10000 && !attempts.has(address)) return res.status(429).json({ error: 'Please wait a minute before checking again.' });
    record.count++; attempts.set(address, record);
    const field = req.body?.field;
    const value = typeof req.body?.value === 'string' ? req.body.value.trim().toLowerCase() : '';
    const valid = field === 'username' ? /^[a-z0-9_]{3,24}$/.test(value) : field === 'email' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!valid) return res.status(400).json({ error: 'Enter a valid username or email address.' });
    if (!url || !secret) return res.status(503).json({ error: 'Availability checks are temporarily unavailable. Please try again.' });
    try {
      const admin = clientFactory(url, secret, { auth });
      const name = field === 'username' ? 'ripple_username_available' : 'ripple_email_available';
      const { data, error } = await admin.rpc(name, { [`requested_${field}`]: value });
      if (error || typeof data !== 'boolean') throw new Error('Availability lookup failed');
      return res.json({ available: data });
    } catch {
      return res.status(503).json({ error: 'We could not check availability. Please try again shortly.' });
    }
  });
  return router;
}
