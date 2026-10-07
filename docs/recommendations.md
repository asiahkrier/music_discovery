# Similar artists

The artist-profile section uses Last.fm artist.getSimilar with the existing server-side LASTFM_API_KEY. Spotify still provides matching profiles, photos and playback. The previous same-name search fallback has been removed: searching Taylor Swift is no longer the source of suggested artists.

The server resolves the selected Spotify ID to a name, requests up to 12 Last.fm candidates with autocorrect disabled, verifies the returned source name, and orders positive similarity scores. It searches Spotify for those recommended names with at most three concurrent requests, accepts only a single exact normalized-name identity, excludes self and duplicates, and returns up to six results in similarity order. Ambiguous or missing matches are skipped. An empty result is displayed when the source is unavailable; the player is independent.

This consumes Last.fm recommendations, not a Ripple-built recommendation algorithm and not a guaranteed genre-only filter. Last.fm and Spotify can contain different artists with the same name; name matching cannot eliminate all cross-catalog ambiguity. Coverage varies by artist. Attribution links lead to Last.fm's similar-artists page.

Results are cached per Spotify ID and country for one hour (one minute for empty results), with up to 200 entries and shared pending requests. Last.fm requests time out after four seconds. Existing Spotify timeout and rate-limit handling applies to matching.

Run npm test and npm run build. Tests cover ranked results, cache sharing, duplicate/self exclusion, no name fallback, missing configuration, provider failures, ambiguous Spotify matches, partial success and concurrency limits. Live provider validation requires the keys configured on Render.

The visible heading is “Other artists to explore”. Source attribution appears below the cards rather than in the heading or introductory copy.
