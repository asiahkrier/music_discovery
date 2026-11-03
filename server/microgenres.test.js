import test from 'node:test';
import assert from 'node:assert/strict';
import { createMicrogenres, pickMicrogenres, isMicrogenre, STARTER_MICROGENRES } from './microgenres.js';

const json = data => ({ ok: true, json: async () => data });
const topTags = tags => json({ toptags: { tag: tags.map(([name, count]) => ({ name, count })) } });

test('only specific genres count as microgenres', () => {
  for (const tag of ['digicore', 'shoegaze', 'midwest emo', 'cloud rap', 'dream pop']) assert.ok(isMicrogenre(tag), tag);
  for (const tag of ['pop', 'rock', 'hip-hop', 'rap', 'indie', 'electronic', 'american', 'seen live', '2020', '']) assert.ok(!isMicrogenre(tag), tag);
});

test('microgenres are ranked by how many saved artists share them', () => {
  const result = pickMicrogenres([
    { artist: 'Lucy Bedroque', tags: [{ name: 'Digicore', weight: 100 }, { name: 'rage', weight: 60 }, { name: 'Hip-Hop', weight: 90 }] },
    { artist: 'Jane Remover', tags: [{ name: 'digicore', weight: 80 }, { name: 'shoegaze', weight: 100 }, { name: 'seen live', weight: 50 }] },
    { artist: 'Fleshwater', tags: [{ name: 'shoegaze', weight: 100 }, { name: 'Shoegaze', weight: 100 }, { name: 'american', weight: 40 }] },
  ]);
  assert.deepEqual(result.map(r => [r.tag, r.count]), [['shoegaze', 2], ['digicore', 2], ['rage', 1]]);
  assert.deepEqual(result.find(r => r.tag === 'digicore').artists, ['Lucy Bedroque', 'Jane Remover']);
});

test('saved artists produce personal microgenres, with tags fetched once per artist', async () => {
  const requested = [];
  const genres = createMicrogenres({ spotify: { configured: true }, apiKey: 'secret', fetchImpl: async url => {
    const params = new URL(url).searchParams;
    assert.equal(params.get('method'), 'artist.getTopTags');
    assert.equal(params.get('autocorrect'), '0');
    requested.push(params.get('artist'));
    return params.get('artist') === 'Lucy Bedroque'
      ? topTags([['digicore', 100], ['cloud rap', 70], ['pop', 50], ['rage', 5]])
      : topTags([['digicore', 100], ['hyperpop', 80]]);
  } });
  const result = await genres.forArtists(['Lucy Bedroque', 'Jane Remover', 'Lucy Bedroque']);
  assert.equal(result.basis, 'saved');
  assert.deepEqual(result.microgenres.map(r => r.tag), ['digicore', 'hyperpop', 'cloud rap']);
  await genres.forArtists(['Jane Remover']);
  assert.deepEqual(requested.sort(), ['Jane Remover', 'Lucy Bedroque']);
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('no saved artists, no key, or failing Last.fm falls back to starter microgenres', async () => {
  const starter = STARTER_MICROGENRES;
  const failing = createMicrogenres({ spotify: { configured: true }, apiKey: 'key', fetchImpl: async () => { throw new Error('Timeout'); } });
  const cases = [
    await createMicrogenres({ spotify: { configured: true }, apiKey: 'key', fetchImpl: () => assert.fail('No request') }).forArtists([]),
    await createMicrogenres({ spotify: { configured: true }, fetchImpl: () => assert.fail('No request') }).forArtists(['Lucy Bedroque']),
    await failing.forArtists(['Lucy Bedroque']),
  ];
  for (const result of cases) {
    assert.equal(result.basis, 'starter');
    assert.deepEqual(result.microgenres.map(r => r.tag), starter);
  }
});

test('selecting a microgenre returns its artists matched exactly on Spotify', async () => {
  let lastfmCalls = 0;
  const spotify = { configured: true, search: async name => {
    if (name === 'Missing') return [{ id: 'other', name: 'Someone else', tags: [] }];
    return [{ id: `id-${name}`, name, image: 'photo.jpg', tags: [] }];
  } };
  const genres = createMicrogenres({ spotify, apiKey: 'key', fetchImpl: async url => {
    const params = new URL(url).searchParams;
    assert.equal(params.get('method'), 'tag.getTopArtists');
    assert.equal(params.get('tag'), 'digicore');
    lastfmCalls++;
    return json({ topartists: { artist: [{ name: 'Jane Remover' }, { name: 'Missing' }, { name: 'Jane Remover' }, { name: 'Ecco2K' }] } });
  } });
  const result = await genres.artistsForTag('digicore', 'US');
  assert.deepEqual(result.artists.map(a => a.name), ['Jane Remover', 'Ecco2K']);
  assert.deepEqual(result.artists[0].tags, ['digicore']);
  assert.equal(result.sourceUrl, 'https://www.last.fm/tag/digicore/artists');
  await genres.artistsForTag('digicore', 'US');
  assert.equal(lastfmCalls, 1);
});

test('microgenre artists are empty, not errors, when providers are unavailable', async () => {
  const offline = createMicrogenres({ spotify: { configured: false }, apiKey: 'key', fetchImpl: () => assert.fail('No request') });
  assert.deepEqual((await offline.artistsForTag('digicore', 'US')).artists, []);
  const failing = createMicrogenres({ spotify: { configured: true }, apiKey: 'key', fetchImpl: async () => ({ ok: false }) });
  assert.deepEqual((await failing.artistsForTag('digicore', 'US')).artists, []);
});
