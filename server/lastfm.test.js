import test from 'node:test';
import assert from 'node:assert/strict';
import { createLastfm } from './lastfm.js';
const response = data => ({ ok: true, json: async () => data });

test('biographies decode HTML, remove links, use safe attribution and cache requests', async () => {
  let count = 0;
  const biography = createLastfm({ apiKey: 'test-key', fetchImpl: async url => {
    count++;
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'ws.audioscrobbler.com');
    assert.equal(parsed.searchParams.get('autocorrect'), '0');
    assert.equal(parsed.searchParams.get('artist'), 'SZA');
    return response({ artist: { name: 'SZA', url: 'javascript:bad()', bio: { summary: 'Singer &amp; songwriter.<a href="https://last.fm">Read more</a>' } } });
  } });
  const [first, second] = await Promise.all([biography('SZA'), biography('SZA')]);
  assert.equal(count, 1);
  assert.deepEqual(first, second);
  assert.equal(first.text, 'Singer & songwriter.');
  assert.equal(first.sourceUrl, 'https://www.last.fm/music/SZA');
  assert.ok(!JSON.stringify(first).includes('test-key'));
});

test('missing credentials require no network calls', async () => {
  const biography = createLastfm({ fetchImpl: () => { throw new Error('Unexpected call'); } });
  assert.deepEqual(await biography('SZA'), { text: '', sourceUrl: '' });
});

test('missing, mismatched, rate-limited and failing biographies return an empty result', async () => {
  const cases = [
    async () => response({ artist: { name: 'Other', bio: { summary: 'Wrong artist' } } }),
    async () => response({ artist: { name: 'SZA', bio: {} } }),
    async () => response({ error: 29, message: 'Rate limited' }),
    async () => ({ ok: false }),
    async () => { throw new Error('Timeout or network error containing secret'); },
  ];
  const results = await Promise.all(cases.map(fetchImpl => createLastfm({ apiKey: 'test', fetchImpl })('SZA')));
  for (const result of results) assert.deepEqual(result, { text: '', sourceUrl: '' });
});

test('biography endpoint resolves Spotify name and does not expose the key', async t => {
  const { createApp } = await import('./app.js');
  const app = createApp({ lastfmApiKey: 'private-test-key', fetchImpl: async url => {
    if (new URL(url).hostname === 'open.spotify.com') return response({ title: 'SZA' });
    return response({ artist: { name: 'SZA', bio: { summary: 'A singer.' } } });
  } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/artist-biography?id=bad`)).status, 400);
  const result = await fetch(`${base}/api/artist-biography?id=7tYKF4w9nC0nq9CsPZTHyP`);
  assert.equal(result.status, 200);
  const body = await result.text();
  assert.ok(body.includes('A singer.'));
  assert.ok(!body.includes('private-test-key'));
});
