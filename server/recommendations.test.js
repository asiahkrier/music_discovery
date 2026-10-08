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
    calls++; assert.equal(new URL(url).searchParams.get('method'), 'artist.getSimilar');
    return response([{name:'Lorde',match:'0.7'},{name:'Olivia Rodrigo',match:'0.9'},{name:'Lorde',match:'0.5'},{name:'Taylor Swift',match:'1'}]);
  } });
  const [result] = await Promise.all([related('taylor','US'),related('taylor','US')]);
  assert.deepEqual(result.artists.map(a=>a.name), ['Olivia Rodrigo','Lorde']);
  assert.deepEqual(queries.sort(), ['Lorde','Olivia Rodrigo']);
  assert.equal(calls,1); assert.equal(result.method,'lastfm');
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('unmatched, ambiguous and failed Spotify searches are skipped without losing valid peers', async () => {
  const spotify = { configured:true, profile:async()=>({name:'Taylor Swift'}), search:async name=> {
    if(name==='Failed') throw new Error('Unavailable');
    if(name==='Ambiguous') return [{id:'a',name},{id:'b',name}];
    if(name==='Missing') return [{id:'c',name:'Other'}];
    return [{id:'d',name}];
  } };
  const related=createRecommendations({spotify,apiKey:'key',fetchImpl:async()=>response(['Failed','Ambiguous','Missing','Lorde'].map(name=>({name,match:0.8})))});
  assert.deepEqual((await related('taylor','US')).artists.map(a=>a.name),['Lorde']);
});

test('provider failures and absent credentials never fall back to name searches', async () => {
  const spotify={configured:true,profile:async()=>({name:'Taylor Swift'}),search:async()=>{assert.fail('No name fallback');}};
  const fetchers=[async()=>({ok:false}),async()=>{throw new Error('Timeout');},async()=>({ok:true,json:async()=>({error:29})}),async()=>({ok:true,json:async()=>({similarartists:{'@attr':{artist:'Wrong'},artist:[{name:'Lorde',match:1}]}})})];
  const results=await Promise.all(fetchers.map(fetchImpl=>createRecommendations({spotify,apiKey:'key',fetchImpl})('id','US')));
  results.push(await createRecommendations({spotify})('id','US'));
  for(const result of results) assert.deepEqual(result.artists,[]);
});

test('Spotify matching uses at most three concurrent calls and returns six artists',async()=>{
  let active=0,max=0;
  const spotify={configured:true,profile:async()=>({name:'Taylor Swift'}),search:async name=>{
    active++;max=Math.max(max,active);
    await new Promise(resolve=>setTimeout(resolve,5));active--;
    return [{id:name,name}];
  }};
  const related=createRecommendations({spotify,apiKey:'key',fetchImpl:async()=>response(Array.from({length:12},(_,i)=>({name:`Artist ${i}`,match:1-i/20})))});
  assert.equal((await related('id','US')).artists.length,6);assert.equal(max,3);
});
