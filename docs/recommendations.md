# Similar artists

The artist-profile section "Other artists to explore" is ranked by Ripple's own algorithm, the **Ripple Score**. See [ripple-score.md](ripple-score.md) for the full explanation, formula, and a worked example.

In short: the server resolves the selected Spotify ID to a name, asks Last.fm (`artist.getSimilar`, autocorrect disabled) for up to 30 candidates, verifies the returned source name, and matches each candidate to Spotify by exact normalized name (Spotify's top-ranked exact match, preferring one with a photo). Each match is scored with 50% Last.fm similarity, 30% shared Last.fm tags, and 20% discovery (a boost for smaller artists). The top 12 are returned; the page shows 6 and Shuffle shows the rest.

Spotify provides matching profiles, photos, and playback. Last.fm and Spotify can contain different artists with the same name, so exact-name matching cannot remove all cross-catalog ambiguity. Coverage varies by artist. Attribution links lead to Last.fm's similar-artists page.

Results are cached per Spotify ID and country for one hour (one minute for empty results), with up to 200 entries and shared pending requests. Last.fm requests time out after four seconds, and at most three candidates are checked at once. Existing Spotify timeout and rate-limit handling applies to matching.

Run `npm test` and `npm run build`. Tests cover Ripple Score ranking, junk-tag filtering, the fallback when tags or listeners are missing, cache sharing, duplicate/self exclusion, same-name matching, missing configuration, provider failures, and concurrency limits.
