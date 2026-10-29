import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export function tokenVault(keyText) {
  const key = Buffer.from(keyText || '', 'base64');
  if (key.length !== 32) throw new Error('Spotify token encryption requires a 32-byte key.');
  return {
    seal(value, owner) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(owner));
      const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      return [iv, cipher.getAuthTag(), bytes].map(part => part.toString('base64url')).join('.');
    },
    open(value, owner) {
      const [iv, tag, bytes] = value.split('.').map(part => Buffer.from(part, 'base64url'));
      const cipher = createDecipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(owner)); cipher.setAuthTag(tag);
      return JSON.parse(Buffer.concat([cipher.update(bytes), cipher.final()]).toString('utf8'));
    },
  };
}
