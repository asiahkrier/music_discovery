import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGenre, normalizeTags } from './genres.js';

test('normalizes provider codes and everyday spellings to the same category', () => {
 for (const [input, expected] of [
  ['MZGenre.Music.KPop','K-Pop'],['kpop','K-Pop'],['K-Pop','K-Pop'],
  ['MZGenre.Music.HipHopRap','Hip-Hop'],['Hip-Hop/Rap','Hip-Hop'],['hiphop','Hip-Hop'],
  ['MZGenre.Music.RBSoul','R&B'],['R&B/Soul','R&B'],['neo-soul','R&B'],
  ['MZGenre.Music.Electronic.House','House'],['Deep House','House'],['Electronica','EDM'],
  ['Dream pop','Pop'],['Dance','Dance']
 ]) assert.equal(normalizeGenre(input),expected,input);
});
test('removes duplicate aliases and unknown non-genre tags without exposing provider codes', () => {
 assert.deepEqual(normalizeTags(['Pop','Dream Pop','MZGenre.Music.Pop','Music','seen live',null,'MZGenre.Music.Unknown','R&B/Soul']),['Pop','R&B']);
});
