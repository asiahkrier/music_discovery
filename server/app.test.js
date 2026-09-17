import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
async function withApp(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const get = async path => { const r = await fetch(`http://127.0.0.1:${server.address().port}${path}`); return { status: r.status, data: await r.json() }; };
  try { await run(get); } finally { await new Promise(resolve => server.close(resolve)); }
}
test('demo search, validation, empty results and five navigable recommendations', () => withApp({}, async get => {
  assert.equal((await get('/api/artists?q=%20')).status, 400);
  assert.equal((await get('/api/artists?q=RADIO')).data.artists[0].name, 'Radiohead');
  assert.deepEqual((await get('/api/artists?q=unknownxyz')).data.artists, []);
  const { data } = await get('/api/artist?name=Radiohead');
  assert.equal(data.source, 'demo'); assert.equal(data.similar.length, 5);
  for (const artist of data.similar) assert.equal((await get(`/api/artist?name=${encodeURIComponent(artist.name)}`)).status, 200);
  assert.equal((await get('/api/artist?name=unknownxyz')).status, 404);
}));
test('upstream errors fall back only to matching sample data without leaking secrets', () => withApp({ apiKey: 'SECRET', fetchImpl: async () => { throw new Error('SECRET'); } }, async get => {
  const result = await get('/api/artists?q=Radiohead');
  assert.equal(result.data.source, 'demo'); assert.ok(result.data.notice);
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.equal((await get('/api/artist?name=unknownxyz')).status, 404);
}));
test('live mapping removes duplicate and self recommendations and caps at five', () => withApp({ apiKey: 'test', fetchImpl: async url => ({ ok: true, json: async () => {
  const method = url.searchParams.get('method');
  if (method === 'artist.getInfo') return { artist: { name: 'Artist', tags: { tag: [{ name: 'Rock' }] }, bio: { summary: 'Bio <a href="x">Read more</a>' } } };
  return { similarartists: { artist: ['Artist','One','One','Two','Three','Four','Five','Six'].map(name => ({name})) } };
} }) }, async get => {
  const { data } = await get('/api/artist?name=Artist');
  assert.equal(data.source, 'live'); assert.equal(data.artist.bio, 'Bio');
  assert.deepEqual(data.similar.map(a => a.name), ['One','Two','Three','Four','Five']);
}));
test('similar service failure preserves a live artist and explains missing results', () => withApp({ apiKey: 'test', fetchImpl: async url => {
  if (url.searchParams.get('method') === 'artist.getSimilar') throw new Error('Unavailable');
  return {ok:true,json:async()=>({artist:{name:'Artist'}})};
} }, async get => {
  const { data } = await get('/api/artist?name=Artist');
  assert.equal(data.source,'live'); assert.deepEqual(data.similar,[]); assert.ok(data.notice);
}));
