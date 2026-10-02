import test from 'node:test';
import assert from 'node:assert/strict';
import { nextArtists } from '../client/src/discovery-shuffle.js';
test('shuffle avoids previous artists when enough fresh candidates exist', () => {
 const pool = Array.from({length:12},(_,i)=>({id:String(i)}));
 const previous = pool.slice(0,6);
 const next = nextArtists(pool,previous,6,()=>0.5);
 assert.equal(new Set(next.map(a=>a.id)).size,6);
 assert.ok(next.every(a=>!previous.includes(a)));
 assert.deepEqual(pool.map(a=>a.id),Array.from({length:12},(_,i)=>String(i)));
});
test('small discovery pools never repeat an artist within the same selection', () => {
 const pool = [{id:'a'},{id:'b'}];
 assert.equal(nextArtists(pool,pool).length,2);
 assert.deepEqual(nextArtists([]),[]);
});
