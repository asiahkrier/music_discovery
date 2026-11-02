import { randomBytes } from 'node:crypto';

// Shared by the Ripple-only mix and the Spotify-connected routes.

// Checks the Ripple login token and stores the user's ID on the request.
export function requireRippleUser(admin, messages) {
  return async (req, res, next) => {
    if (!admin) return res.status(503).json({ error: messages.unavailable });
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({ error: messages.login });
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return res.status(401).json({ error: 'Your Ripple session expired. Please log in again.' });
      req.rippleUser = data.user.id;
      return next();
    } catch {
      return res.status(503).json({ error: messages.unverified });
    }
  };
}

// Weeks counted from Monday, January 5, 2026 (UTC).
export const mixWeek = now => Math.floor((now - Date.UTC(2026, 0, 5)) / 604800000);

// Allows one rebuild per user per minute. Returns false if the user must wait.
export function claimRebuild(cooldowns, user, now) {
  for (const [id, until] of cooldowns) {
    if (until <= now) cooldowns.delete(id);
  }
  if (cooldowns.has(user)) return false;
  cooldowns.set(user, now + 60000);
  return true;
}

// Same seed all week; a manual refresh gets a random one.
export const mixSeed = (refresh, user, week) => (refresh ? randomBytes(8).toString('hex') : `${user}:${week}`);

export const withoutTrack = (mix, id) => (mix ? { ...mix, tracks: mix.tracks.filter(t => t.id !== id) } : null);
