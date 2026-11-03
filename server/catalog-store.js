import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

// Only public catalog responses and cooldown timestamps; never login tokens or user libraries.
export function createCatalogStore({ url, secret, clientFactory = createClient } = {}) {
  const admin = url && secret ? clientFactory(url, secret, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(3000) }) } }) : null;
  const key = value => createHash('sha256').update(value).digest('hex');
  return {
    async get(name) {
      if (!admin) return null;
      try {
        const { data, error } = await admin.from('catalog_cache').select('value,expires_at').eq('key', key(name)).maybeSingle();
        return !error && data && Date.parse(data.expires_at) > Date.now() ? data.value : null;
      } catch { return null; }
    },
    async set(name, value, until) {
      if (!admin) return;
      try {
        const { error } = await admin.from('catalog_cache').upsert({ key: key(name), value, expires_at: new Date(until).toISOString() });
        if (error) console.warn('Catalog cache write unavailable. Check the catalog cache migration.');
      } catch { console.warn('Catalog cache write unavailable.'); }
    },
  };
}
