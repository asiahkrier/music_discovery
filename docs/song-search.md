# Artist and song search

Both search tabs use Spotify exclusively. Artist search accepts a name or full Spotify artist URL. Every result preserves the Spotify artist ID so same-name artists do not get merged. Selecting a card fetches that ID's profile and uses its official Spotify artist embed.

Song search returns up to ten matches with title, artists, album, and a direct Spotify link. Country selects the requested Spotify market; it does not guarantee all tracks are playable. Superseded browser searches are cancelled so older results cannot replace newer results.

No credentials: public artist links can load oEmbed metadata and a player, while catalog searches and discovery show the connection message. Configured credentials: artist and song metadata use the Spotify Web API. Provider errors remain visible; the app never substitutes Apple, YouTube, Wikipedia, Last.fm, or sample artists.

See [API contracts](api.md), [code guide](code-guide.md), and [deployment](deployment.md).
