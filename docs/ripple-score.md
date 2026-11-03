# How the Ripple Score works

The Ripple Score is Ripple's own algorithm for ranking similar artists. Last.fm supplies raw data: which artists people listen to together, genre tags, and listener counts. The formula, the weights, and the ranking are Ripple's.

- **Code:** `server/recommendations.js`
- **Tests:** `server/recommendations.test.js`
- **Used by:** the "Other artists to explore" section on artist pages, and **Your Ripple Mix** (see [How the Ripple Mix uses it](#how-the-ripple-mix-uses-it) below)

## The formula

**Ripple Score = 0.5 × Similarity + 0.3 × Shared tags + 0.2 × Discovery**

Each part is a number from 0 to 1, so the Ripple Score is also between 0 and 1.

| Part | Weight | What it measures | Where it comes from |
|---|---|---|---|
| Similarity | 50% | How often people listen to both artists | Last.fm's "match" value, used as is |
| Shared tags | 30% | How much the two artists' genre tags overlap | Calculated by Ripple (Jaccard similarity) |
| Discovery | 20% | How much smaller the candidate is | Calculated by Ripple from Last.fm listener counts |

**Why these weights:** similarity is the strongest signal, so it gets half. Shared tags make results more specific to the sound, including small microgenres. Discovery gives smaller artists a boost, which is the point of Ripple: finding music beyond the most popular names.

## The code, step by step

When someone opens an artist page, the browser calls `GET /api/related-artists?id=…`, which runs `related(id, country)` in `server/recommendations.js`. Here is what happens, in order.

### Step 1: Get up to 30 candidates from Last.fm

In `lookup()`, Ripple turns the Spotify artist ID into a name, then asks Last.fm for similar artists:

```js
const current = await spotify.profile(id);
const params = new URLSearchParams({ method: 'artist.getSimilar', artist: current.name, api_key: apiKey, format: 'json', autocorrect: '0', limit: '30' });
```

`rankedArtists()` cleans up Last.fm's answer. It checks that Last.fm answered about the right artist, skips the artist themselves, skips bad scores, keeps the higher score if a name appears twice, and sorts by Last.fm's match:

```js
if (key === normalize(name) || !Number.isFinite(score) || score <= 0 || score > 1) continue;
if (!unique.has(key) || unique.get(key).score < score) unique.set(key, { name: item.name, score });
...
return [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 30)
```

Each candidate is now `{ name, score }`, where `score` is the **Similarity** part.

### Step 2: Get the current artist's tags and listeners

```js
const currentInfo = await artistInfo(current.name);
```

`artistInfo()` calls Last.fm's `artist.getInfo` and returns `{ tags, listeners }`. If Last.fm fails, it returns `{ tags: [], listeners: 0 }` instead of crashing.

Tags go through `cleanTags()`, which:

- lowercases each tag, removes symbols, and collapses extra spaces
- drops tags that describe the listener instead of the music: "seen live", "favorites", "favourite", "female vocalists", "male vocalists", "all"
- drops decade tags like "90s" and "2010s" (the pattern `/^\d{2,4}s$/`)

Microgenres like "digicore", "rage" and "midwest emo" are kept.

### Step 3: Check each candidate (three at a time)

Three `worker()` functions run at the same time. Each one takes the next candidate from the list until none are left. This keeps the page fast without sending too many requests to Spotify and Last.fm at once.

```js
await Promise.all(Array.from({ length: 3 }, () => worker()));
```

For each candidate, the worker:

**a) Finds it on Spotify** with `matchArtist()`. Only exact name matches count, which filters out knockoff accounts like "Taylor Swift tribute". If several Spotify accounts have the exact same name, it uses Spotify's top-ranked one, preferring an account with a photo:

```js
const exact = results.filter(a => normalize(a.name) === normalize(candidate.name));
const best = exact.find(a => a.image) || exact[0];
if (!best) return null;
```

Candidates not found on Spotify are skipped.

**b) Gets the candidate's tags and listeners:**

```js
const info = await artistInfo(candidate.name);
```

**c) Calculates the three parts and the Ripple Score:**

```js
const overlap = tagOverlap(currentInfo.tags, info.tags);
const discovery = discoveryScore(info.listeners, currentInfo.listeners);
const score = rippleScore(candidate.score, overlap, discovery);
```

These are the three small functions that do the math:

```js
// Tags both artists have.
function sharedTags(a, b) {
  const setB = new Set(b);
  return [...new Set(a)].filter(t => setB.has(t));
}

// Jaccard similarity: shared tags ÷ all different tags, from 0 to 1.
function tagOverlap(a, b) {
  const all = new Set([...a, ...b]).size;
  return all ? sharedTags(a, b).length / all : 0;
}

// About 1 if much smaller, 0.5 if the same size, close to 0 if much bigger.
function discoveryScore(candidateListeners, currentListeners) {
  if (!candidateListeners || !currentListeners) return 0.5;
  return 1 / (1 + candidateListeners / currentListeners);
}

// Ripple's own formula.
function rippleScore(similarity, overlap, discovery) {
  return 0.5 * similarity + 0.3 * overlap + 0.2 * discovery;
}
```

- `new Set(...)` removes duplicates, so the "all different tags" count is correct.
- If either listener count is missing, `discoveryScore` returns a neutral 0.5 instead of guessing.
- If `all` is 0 (neither artist has tags), `tagOverlap` returns 0 instead of dividing by zero.

**d) Saves the result** with the score rounded to 2 decimals, the top 2 shared tags for the badge, and whether the candidate is smaller (used by the mix):

```js
results[index] = { ...artist, score: Math.round(score * 100) / 100,
  recommendationReason: shared.slice(0, 2).join(', '),
  smallerAudience: info.listeners > 0 && currentInfo.listeners > 0 && info.listeners < currentInfo.listeners, ... };
```

### Step 4: Sort by Ripple Score and keep the top 12

```js
const artists = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 12);
```

This line is what makes it Ripple's ranking instead of Last.fm's. Before it, results were in Last.fm's similarity order.

### Step 5: Show them on the page

`client/src/RelatedArtists.jsx` shows the first 6. **Shuffle ↻** shows another 6 of the 12 without repeating any (using `nextArtists()` from `discovery-shuffle.js`), and each set is sorted by score. Shuffle only appears when there are 12 artists. The **"Shared genre"** badge on each card is `recommendationReason`.

### Caching

`related()` caches each result for one hour per artist and country (one minute if empty), up to 200 entries. Two people opening the same artist at once share one lookup.

## Worked example

You are viewing **Lucy Bedroque**. Lucy's tags and listener count below come from Last.fm during testing. The two candidates are illustrative.

- Lucy's tags: digicore, cloud rap, indietronica, art pop, rage
- Lucy's listeners: 417,062

**Candidate A**, a smaller digicore artist:

- Similarity: 0.70
- Tags: digicore, rage, hyperpop. They share 2 (digicore, rage), and there are 6 different tags in total, so `tagOverlap` = 2 ÷ 6 = 0.33.
- Listeners: 100,000. `discoveryScore` = 1 ÷ (1 + 100,000 ÷ 417,062) = 1 ÷ 1.24 = 0.81.
- **Ripple Score = 0.5 × 0.70 + 0.3 × 0.33 + 0.2 × 0.81 = 0.35 + 0.10 + 0.16 = 0.61**

**Candidate B**, a much bigger pop artist:

- Similarity: 0.90
- Tags: pop, dance pop. No shared tags, so `tagOverlap` = 0.
- Listeners: 4,000,000. `discoveryScore` = 1 ÷ (1 + 4,000,000 ÷ 417,062) = 1 ÷ 10.59 = 0.09.
- **Ripple Score = 0.5 × 0.90 + 0.3 × 0 + 0.2 × 0.09 = 0.45 + 0 + 0.02 = 0.47**

Last.fm alone would rank B first (0.90 vs 0.70). The Ripple Score ranks **A first** because it shares the same microgenres and is a smaller artist. The test `Ripple Score ranks by similarity, shared tags and discovery, and explains the match` in `server/recommendations.test.js` checks exactly this situation.

## Fallbacks

- **Tags or listener counts missing:** Shared tags is 0 and Discovery is a neutral 0.5, so results follow similarity order and nothing breaks.
- **Last.fm unavailable or no API key:** the section shows a short message instead of artists. The rest of the artist page still works.
- **Fewer than 12 matches:** Shuffle is hidden, so it never shows repeats.

## How the Ripple Mix uses it

**Your Ripple Mix** builds a playlist of up to 20 songs from your Ripple saves. It runs the Ripple Score behind the scenes to find new artists, then uses a **second formula** to arrange the songs.

- **Code:** `buildMix()` and `rankMix()` in `server/ripple-mix.js`. `server/library-mix.js` handles login, saving the mix, and the weekly refresh.
- **Tests:** `server/ripple-mix.test.js`, `server/library-mix.test.js`

### Step 1: Pick up to 8 "seed" artists from your saves

```js
rippleArtists.slice(0, 20).forEach(i => addArtist({ id: i.spotify_id, name: i.name }, 5, ...));
// Saved songs add their artists with weight 4
...
const chosen = allSeeds.slice(0, 8);
```

Every saved artist adds 5 points, and every saved song adds 4 points to its artists. The 8 artists with the most points become the seeds.

### Step 2: Get familiar songs from your seed artists

For each seed, Ripple searches Spotify for that artist's songs and keeps up to 2 exact matches. These songs get a fixed **relevance of 0.8**:

```js
await inPairs(chosen, artist => songsForArtist(artist, 'From an artist you saved on Ripple', 0.8, knownSongs));
```

### Step 3: Find new artists with the Ripple Score

For each seed, Ripple calls the same `related()` function the artist page uses:

```js
const results = await inPairs(chosen, async artist => ({ artist, response: await related(artist.id, 'US') }));
```

From each seed's results, `balancedArtists()` keeps 5 artists: about half bigger and half smaller ("smallerAudience" from the Ripple Score). Across all seeds, it then keeps the best 14 the same way. That way the mix isn't only big names or only tiny ones.

### Step 4: Get songs from the new artists

Up to 2 songs per new artist. **Each song's relevance is that artist's Ripple Score**:

```js
songsForArtist(candidate, `Because you like ${basedOn}`, candidate.score, discovered, { smallerAudience: ... })
```

The reason shown on the card ("Because you like Lucy Bedroque") comes from here.

### Step 5: Score every song with the mix formula

`rankMix()` gives every song a mix score:

```js
const score = 0.65 * relevance + (adventure / 100) * (0.2 * novelty + 0.05 * niche) + 0.03 * jitter;
```

**Mix score = 0.65 × relevance + (adventure ÷ 100) × (0.2 × novelty + 0.05 × niche) + 0.03 × jitter**

| Part | Value |
|---|---|
| relevance | 0.8 for songs by your seed artists. For new artists, their Ripple Score. Songs below 0.15 are dropped. |
| adventure | The **Familiar ↔ Adventurous** slider, 0 to 100 (default 60) |
| novelty | 0 if the exact song is already saved, 0.4 if you saved the artist, 1 if the artist is new to you |
| niche | 1 if the artist is smaller (from the Ripple Score), otherwise 0 |
| jitter | A small fixed "random" number from 0 to 1, made from a hash of the song ID and your weekly seed, so ties break differently each week (or after Refresh) but stay the same in between |

Moving the slider toward Adventurous makes novelty and niche count more. At 0, only relevance matters.

**Example at adventure 60:**
- A song by a **new, smaller** artist with Ripple Score 0.61: 0.65 × 0.61 + 0.6 × (0.2 × 1 + 0.05 × 1) = 0.40 + 0.15 = **0.55**, plus up to 0.03 jitter.
- A song by an artist **you saved** (relevance 0.8): 0.65 × 0.8 + 0.6 × (0.2 × 0.4 + 0) = 0.52 + 0.05 = **0.57**, plus up to 0.03 jitter.

### Step 6: Balance familiar and new songs

So the mix isn't all new or all familiar, `rankMix()` reserves slots before filling the rest by score:

```js
const familiarTarget = Math.round(limit * (0.6 - 0.3 * adventure / 100));
const smallerTarget = Math.round(limit * (0.2 + 0.2 * adventure / 100));
take(familiar, familiarTarget);
take(discoveries.filter(item => !item.smallerAudience), limit - familiarTarget - smallerTarget);
take(discoveries.filter(item => item.smallerAudience), smallerTarget);
```

- Familiar songs: from 60% of the mix (slider at Familiar) down to 30% (slider at Adventurous)
- Smaller-artist discoveries: from 20% up to 40%
- Other discoveries: the rest

At the default adventure of 60 and 20 songs, that's **8 familiar, 6 related discoveries and 6 smaller-artist discoveries**. No artist gets more than 2 songs. If there aren't enough songs of one kind, the leftover slots are filled with the best remaining songs. The final list is sorted by mix score.

### Step 7: Weekly mix and refresh

The mix is saved and stays the same for the week. A new one is built automatically the next week. **Refresh my mix** builds a new one right away, at most once a minute. Songs you mark **Not interested** never come back.

### Where the two formulas fit

1. The **Ripple Score** decides which new artists are good matches, and how good (their relevance).
2. The **mix formula** decides how to arrange familiar songs and new songs into a playlist, based on your slider.

Improving the Ripple Score improves both the artist pages and the mix, without changing the mix code.

## Planned: Ripple users' saved artists

A fourth signal will count how often artists are saved together by different Ripple users:

**Final score = (1 − w) × Ripple Score + w × Ripple users score**

The weight `w` grows with the amount of data and is capped. With no data, `w` is 0 and the result is exactly the Ripple Score above. Only totals are used, and pairs saved by fewer than 3 users are ignored for privacy. This section will be updated when that work is finished.
