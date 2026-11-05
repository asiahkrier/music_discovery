# How Ripple ranks recommendations

Ripple uses two related rankings: one chooses related artists, and another selects songs for a user's mix. These scores are sorting signals, not probabilities or guarantees that a user will like a song.

## Related artists

Implementation: `server/recommendations.js`.

1. Resolve the selected Spotify artist's name.
2. Ask Last.fm for similar artists, excluding the selected artist and duplicate names.
3. Match candidate names to Spotify identities. Exact names are required; when names are ambiguous, the implementation prefers an exact match with artwork. This is a heuristic, not definitive identity verification.
4. Compare Last.fm genre tags and listener counts, then rank matched candidates.

```text
Ripple Score = 0.50 × similarity + 0.30 × tag overlap + 0.20 × discovery
```

| Signal | Meaning |
|---|---|
| Similarity | Last.fm's match value between 0 and 1. |
| Tag overlap | Shared unique tags divided by all unique tags across both artists (Jaccard similarity). Zero when neither has tags. |
| Discovery | `1 / (1 + candidateListeners / seedListeners)`. Higher for a relatively smaller audience; 0.5 when either count is missing. |

Audience comparisons use Last.fm listeners, not Spotify monthly listeners. Tags describing listener opinions or decades are filtered out. The final artist scores are rounded to two decimals, sorted, and limited to the matched result pool. See [recommendations](recommendations.md) for provider fallbacks.

For an illustrative candidate with similarity 0.70, tag overlap 0.33 and discovery 0.81, the score is approximately **0.61**. A higher score puts that candidate ahead of a lower-scoring candidate in the same pool. It does not mean a 61% chance of liking them.

## Personalized mix

Implementation: `server/ripple-mix.js`; authentication and storage: `server/library-mix.js`.

The mix reads only the signed-in user's Ripple saves. Saved artists contribute weight 5; artists resolved from saved songs contribute weight 4. The implementation rotates a bounded selection of seeds using the mix seed, rather than always selecting the highest-weight artists. It gathers songs from those seeds and their related artists, with exact artist-ID matching for tracks.

```text
Song score = 0.65 × relevance
           + (adventure / 100) × (0.20 × novelty + 0.05 × niche)
           + 0.03 × jitter
```

- **Relevance:** 0.8 for songs fetched from saved artists; the related artist's Ripple Score for discovered songs. Candidates below 0.15 are excluded.
- **Novelty:** 0 for known tracks, 0.4 for known artists, and 1 for new artists in the ranking inputs.
- **Niche:** 1 for an artist with a smaller Last.fm audience than the seed, otherwise 0.
- **Jitter:** deterministic tie variation based on the mix seed and track ID. It still contributes when adventure is zero.

Selection reserves familiar music, smaller-audience discoveries, and other discoveries before filling gaps. At the default adventure value of 60, a full 20-track pool targets 8 familiar, 6 other discoveries and 6 smaller-audience discoveries. Sparse pools can be shorter or have different proportions. Each artist contributes at most two tracks.

Songs and artists from the previous three mixes are excluded before ranking. Dismissed tracks are excluded from the retained dismissal history (bounded to 200 IDs). If refreshing yields no fresh matches, the stored previous mix is preserved instead of silently repeating it as a new mix.

Mixes persist between visits. A new week or preference change can trigger rebuilding when the user opens the mix; this is not a background weekly job. Manual rebuilds are limited to one per minute per user per server process.

## Boundaries

The app does not read personal Spotify listening history or playlists. Cross-user collaborative filtering is not implemented. Provider catalogs and listener counts can be incomplete. The current request budgets and cache behavior are documented in [catalog recovery](catalog-recovery.md); tests for ranking and history are in `server/recommendations.test.js`, `server/ripple-mix.test.js`, and `server/library-mix.test.js`.
