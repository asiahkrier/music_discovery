import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecommendations } from './recommendations.js';
const response = artists => ({ ok: true, json: async () => ({ similarartists: { '@attr': { artist: 'Taylor Swift' }, artist: artists } }) });

test('Last.fm candidates replace name suggestions, preserve scores, deduplicate and cache', async () => {
  const queries = [];
  let calls = 0;
  const spotify = { configured: true, profile: async () => ({ name: 'Taylor Swift' }), search: async (name, country) => {
    queries.push(name); assert.equal(country, 'US');
    return [{ id: name, name }, { id: 'wrong', name: 'Taylor tribute' }];
  } };
    const related = createRecommendations({ spotify, apiKey: 'secret', fetchImpl: async url => {
    if (new URL(url).searchParams.get('method') === 'artist.getInfo') return { ok: true, json: async () => ({}) };
    calls++; assert.equal(new URL(url).searchParams.get('method'), 'artist.getSimilar');
    return response([{name:'Lorde',match:'0.7'},{name:'Olivia Rodrigo',match:'0.9'},{name:'Lorde',match:'0.5'},{name:'Taylor Swift',match:'1'}]);
  } });
  const [result] = await Promise.all([related('taylor','US'),related('taylor','US')]);
  assert.deepEqual(result.artists.map(a=>a.name), ['Olivia Rodrigo','Lorde']);
  assert.deepEqual(queries.sort(), ['Lorde','Olivia Rodrigo']);
  assert.equal(calls,1); assert.equal(result.method,'lastfm');
  assert.ok(!JSON.stringify(result).includes('secret'));
});

  test('unmatched and failed Spotify searches are skipped, and same-name results use Spotify\'s top exact match', async () => {  
    const spotify = { configured:true, profile:async()=>({name:'Taylor Swift'}), search:async name=> {
    if(name==='Failed') throw new Error('Unavailable');
    if(name==='Ambiguous') return [{id:'a',name},{id:'b',name}];
    if(name==='Missing') return [{id:'c',name:'Other'}];
    return [{id:'d',name}];
  } };
  const related=createRecommendations({spotify,apiKey:'key',fetchImpl:async()=>response(['Failed','Ambiguous','Missing','Lorde'].map(name=>({name,match:0.8})))});
  const result = await related('taylor','US');
  assert.deepEqual(result.artists.map(a=>a.name),['Ambiguous','Lorde']);
  assert.equal(result.artists[0].id,'a');
});

test('provider failures and absent credentials never fall back to name searches', async () => {
  const spotify={configured:true,profile:async()=>({name:'Taylor Swift'}),search:async()=>{assert.fail('No name fallback');}};
  const fetchers=[async()=>({ok:false}),async()=>{throw new Error('Timeout');},async()=>({ok:true,json:async()=>({error:29})}),async()=>({ok:true,json:async()=>({similarartists:{'@attr':{artist:'Wrong'},artist:[{name:'Lorde',match:1}]}})})];
  const results=await Promise.all(fetchers.map(fetchImpl=>createRecommendations({spotify,apiKey:'key',fetchImpl})('id','US')));
  results.push(await createRecommendations({spotify})('id','US'));
  for(const result of results) assert.deepEqual(result.artists,[]);
});

test('Spotify matching uses at most three concurrent calls and returns 12 artists',async()=>{
  let active=0,max=0;
  const spotify={configured:true,profile:async()=>({name:'Taylor Swift'}),search:async name=>{
    active++;max=Math.max(max,active);
    await new Promise(resolve=>setTimeout(resolve,5));active--;
    return [{id:name,name}];
  }};
  const related=createRecommendations({spotify,apiKey:'key',fetchImpl:async()=>response(Array.from({length:12},(_,i)=>({name:`Artist ${i}`,match:1-i/20})))});
  assert.equal((await related('id','US')).artists.length,12);assert.equal(max,3);
});

test('Ripple Score ranks by similarity, shared tags and discovery, and explains the match', async () => {
  const info = {
    'Lucy Bedroque': { tags: ['Digicore', 'rage', 'cloud rap', 'seen live', '2020s'], listeners: 400000 },
    'Big Pop Star': { tags: ['pop', 'seen live'], listeners: 4000000 },
    'Small Digicore': { tags: ['digicore', 'Rage', 'hyperpop'], listeners: 50000 }
  };
  const spotify = { configured: true, profile: async () => ({ name: 'Lucy Bedroque' }), search: async name => [{ id: name, name }] };
  const related = createRecommendations({ spotify, apiKey: 'key', fetchImpl: async url => {
    const params = new URL(url).searchParams;
    if (params.get('method') === 'artist.getSimilar') {
      return { ok: true, json: async () => ({ similarartists: { '@attr': { artist: 'Lucy Bedroque' }, artist: [{ name: 'Big Pop Star', match: '0.9' }, { name: 'Small Digicore', match: '0.7' }] } }) };
    }
    const artist = info[params.get('artist')];
    return { ok: true, json: async () => ({ artist: { stats: { listeners: String(artist.listeners) }, tags: { tag: artist.tags.map(name => ({ name })) } } }) };
  } });
  const result = await related('lucy', 'US');
  // The smaller artist with shared microgenres beats the bigger, more "similar" one.
  assert.deepEqual(result.artists.map(a => a.name), ['Small Digicore', 'Big Pop Star']);
  // Shared tags are lowercased, and junk tags like "seen live" or decades never count as a reason.
  assert.equal(result.artists[0].recommendationReason, 'digicore, rage');
  assert.equal(result.artists[1].recommendationReason, '');
  assert.ok(result.artists[0].score > result.artists[1].score);
});

test('missing Last.fm tags or listeners still return artists in similarity order', async () => {
  const spotify = { configured: true, profile: async () => ({ name: 'Taylor Swift' }), search: async name => [{ id: name, name }] };
  const related = createRecommendations({ spotify, apiKey: 'key', fetchImpl: async url => {
    if (new URL(url).searchParams.get('method') === 'artist.getInfo') throw new Error('Timeout');
    return response([{ name: 'Lorde', match: '0.6' }, { name: 'Olivia Rodrigo', match: '0.9' }]);
  } });
  const result = await related('taylor', 'US');
  assert.deepEqual(result.artists.map(a => a.name), ['Olivia Rodrigo', 'Lorde']);
  assert.ok(result.artists.every(a => a.recommendationReason === ''));
});