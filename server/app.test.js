import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotify } from './spotify.js';
const id = '7tYKF4w9nC0nq9CsPZTHyP';
const other = '4V8LLVI7PbaPR0K2TGSxFF';
const response = data => ({ ok: true, status: 200, json: async () => data });
function fixture(handler) {
 const calls = [];
 const client = createSpotify({ spotifyId: 'test', spotifySecret: 'secret', fetchImpl: async (url, options) => {
  calls.push(String(url));
  assert.ok(['accounts.spotify.com','api.spotify.com'].includes(new URL(url).hostname));
  if (String(url).includes('/api/token')) return response({ access_token: 'token', expires_in: 3600 });
  assert.equal(options.headers.Authorization, 'Bearer token');
  return handler(new URL(url));
 }});
 return { client, calls };
}
test('missing credentials fail clearly without catalog network calls', async () => {
 const client = createSpotify({ fetchImpl: () => { throw new Error('Unexpected network'); } });
 await assert.rejects(client.search('SZA','US'), e => e.status === 503);
});
test('concurrent searches share credentials and preserve Spotify identities', async () => {
 const {client,calls} = fixture(url => { assert.equal(url.searchParams.get('limit'),'10'); return response({ artists: { items: [{id,name:'SZA',genres:['r&b'],images:[{url:'https://i.scdn.co/photo'}]}] } }); });
 const results = await Promise.all([client.search('SZA','US'),client.search('SZA','US')]);
 assert.equal(calls.filter(url => url.includes('/api/token')).length,1);
 assert.equal(results[0][0].spotifyId,id);
 assert.ok(results[0][0].spotifyEmbed.includes(id));
 assert.equal(results[0][0].image,'https://i.scdn.co/photo');
});
test('public artist link profile uses only Spotify oEmbed without credentials', async () => {
 const client = createSpotify({fetchImpl: async url => { assert.equal(new URL(url).hostname,'open.spotify.com'); return response({title:'SZA',thumbnail_url:'https://i.scdn.co/photo'}); }});
 const artist = await client.profile(id);
 assert.equal(artist.name,'SZA'); assert.equal(artist.spotifyId,id); assert.equal(artist.bio,undefined);
});
test('rate limits stop subsequent upstream calls during cooldown', async () => {
 let count=0; const {client} = fixture(() => {count++; return {ok:false,status:429,headers:{get:()=> '60'}};});
 await assert.rejects(client.search('SZA','US'),e=>e.status===429);
 await assert.rejects(client.search('IVE','US'),e=>e.status===429); assert.equal(count,1);
});
test('discovery caches and deduplicates Spotify results', async () => {
 const {client,calls} = fixture(() => response({artists:{items:[{id,name:'SZA',genres:['pop']}]}}));
 assert.equal((await client.discover('US')).length,1); const count=calls.length;
 await client.discover('US'); assert.equal(calls.length,count);
});

test('HTTP routes validate input and serve Spotify-only contracts without secrets', async t => {
 const { createApp } = await import('./app.js');
 const app = createApp({ fetchImpl: async url => {
  assert.equal(new URL(url).hostname, 'open.spotify.com');
  return response({ title: 'SZA', thumbnail_url: 'https://i.scdn.co/photo' });
 }});
 const server = app.listen(0, '127.0.0.1');
 await new Promise((resolve,reject) => { server.once('listening',resolve); server.once('error',reject); });
 t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
 const base = `http://127.0.0.1:${server.address().port}`;
 for (const path of ['/api/artist', '/api/artist?id=123', '/api/artists?q=', '/api/artists?q=a&country=USA', '/api/songs']) {
  assert.equal((await fetch(base + path)).status,400,path);
 }
 assert.equal((await fetch(base + '/api/unknown')).status,404);
 assert.equal((await fetch(base + '/api/artists?q=SZA')).status,503);
 const profile = await (await fetch(base + `/api/artist?id=${id}`)).json();
 assert.equal(profile.artist.name,'SZA');
 const result = await (await fetch(base + '/api/artists?' + new URLSearchParams({q:`https://open.spotify.com/artist/${id}?si=test`}))).json();
 assert.equal(result.artists[0].id,id);
 const providers = await (await fetch(base + '/api/song-providers')).json();
 assert.deepEqual(providers,{providers:[{id:'spotify',name:'Spotify',enabled:false}]});
 assert.ok(!JSON.stringify(profile).includes('secret'));
});

test('discovery overlaps independent searches and keeps offsets within five pages', async () => {
 let active = 0, peak = 0;
 const { client } = fixture(async url => {
  const offset = Number(url.searchParams.get('offset'));
  assert.ok([0,10,20,30,40].includes(offset));
  active++; peak = Math.max(peak, active);
  await new Promise(resolve => setTimeout(resolve, 5));
  active--;
  return response({ artists: { items: [{id,name:'SZA',genres:['pop']}] } });
 });
 const artists = await client.discover('US');
 assert.equal(artists.length, 1);
 assert.ok(peak > 1);
});
