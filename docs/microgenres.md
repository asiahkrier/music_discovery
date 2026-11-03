# Discover microgenres

The **Microgenres** tab (next to Artists and Songs) suggests specific microgenres, like digicore, shoegaze or midwest emo, and shows artists in each one.

## Where the microgenres come from

1. The page sends the names of up to 15 of your most recently saved Ripple artists to `POST /api/microgenres`. The server does not read anyone's library itself; it only uses the names the page sends.
2. For each artist, Ripple gets their top Last.fm tags (`artist.getTopTags`) and keeps the strongest ones (weight 10 or more out of 100, at most 10 per artist).
3. Tags are cleaned the same way as for the Ripple Score (`server/lastfm-tags.js`): lowercase, no symbols, and no junk or decade tags.
4. Only **microgenres** are kept. Broad genres like pop, rock, hip-hop, rap, indie or electronic are skipped, as are tags about places, nationalities or opinions ("american", "london", "love"). The lists are in `server/microgenres.js`.
5. Microgenres are ranked by **how many of your saved artists share them**, then by total tag weight. The top 8 are shown, each with "N of your artists", and the selected one says which of your artists it came from.

If you are logged out, have no saved artists, or Last.fm returns nothing usable, the page shows **starter microgenres** instead: digicore, hyperpop, shoegaze, midwest emo, bedroom pop, cloud rap, dream pop and plugg.

## Artists in a microgenre

Selecting a microgenre calls `GET /api/microgenre-artists?tag=…&country=…`. Ripple gets Last.fm's top 20 artists for that tag (`tag.getTopArtists`) and matches each to Spotify with the same exact-name matching as the Ripple Score. Up to 12 matched artists are shown. Clicking one opens its full Ripple artist page.

## Limits and caching

- At most three Last.fm or Spotify lookups run at once.
- Artist tags and microgenre artist lists are cached for six hours (one minute when a list comes back empty), up to 300 entries each.
- Last.fm requests time out after four seconds. If Last.fm or Spotify is unavailable, the page shows a message and a Try again button instead of breaking.

## Tests

`server/microgenres.test.js` covers what counts as a microgenre, ranking by shared artists, per-artist tag caching, the starter fallback (no saves, no key, Last.fm failure), exact Spotify matching for microgenre artists, and empty results when providers are unavailable.
