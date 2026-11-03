import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotify } from './spotify.js';
import { suggestionKey, readSuggestions, saveSuggestions } from '../client/src/suggestion-cache.js';
const ok = data => ({ ok: true, json: async () => data });
test('verified artist matches survive restart and isolate country and candidate scores', async () => {
  const rows = new Map();
  const store = { get: async key => rows.get(key), set: async (key, value) => { rows.set(key, value); } };
  let searches = 0;
  const options = { store, spotifyId: 'test', spotifySecret: 'test', requestGapMs: 0, fetchImpl: async url => {
    if (url.includes('/api/token')) return ok({ access_token: 'token', expires_in: 3600 });
    searches++;
    return ok({ artists: { items: [{ id: 'a'.repeat(22), name: 'Artist', genres: [], images: [] }] } });
  } };
  const first = createSpotify(options);
  const [a, b] = await Promise.all([first.resolveArtist('Artist', 'US'), first.resolveArtist(' artist ', 'US')]);
  assert.deepEqual(a,b); assert.equal(searches,1);
  assert.deepEqual(await createSpotify(options).resolveArtist('ARTIST','US'),a);
  assert.equal(searches,1);
  await first.resolveArtist('Artist','GB'); assert.equal(searches,2);
  assert.equal(a.score,undefined);
});
test('suggestion cache normalizes queries, expires, and separates types and countries', () => {
  const key = suggestionKey('artist','US',' Ta ');
  saveSuggestions(key,[{id:'a'}],1000);
  assert.deepEqual(readSuggestions(suggestionKey('artist','US','ta'),1001),[{id:'a'}]);
  assert.equal(readSuggestions(suggestionKey('song','US','ta'),1001),null);
  assert.equal(readSuggestions(suggestionKey('artist','GB','ta'),1001),null);
  assert.equal(readSuggestions(key,301001),null);
});
