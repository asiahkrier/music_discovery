# Database migrations

Use the Supabase project belonging to your Ripple deployment. For an existing project, apply only missing migrations. Do not rerun initial setup or delete old tables as a general code cleanup.

For a fresh project, apply the numbered files in ascending order. The numbering gap before 009 is intentional; do not renumber migration history.

| File | Purpose |
|---|---|
| `001_accounts.sql` | Profiles, saved library, avatar storage and access policies. |
| `002_account_safeguards.sql` | Avatar upload restriction to active profiles. |
| `003_defer_account_safeguards.sql` | Compatibility cleanup for the discarded signup safeguards. |
| `004_username_availability.sql` | Username availability lookup. |
| `005_spotify_connection.sql` | Historical Spotify-linking schema; no longer used by current account routes. |
| `006_email_availability.sql` | Server-only email availability lookup. |
| `007_ripple_mixes.sql` | Per-user Ripple mix storage. |
| `009_catalog_cache.sql` | Server-only public catalog cache and provider cooldown persistence. |

Keep historical migrations for reproducibility. Their presence does not mean every historical feature is enabled. Code cleanup must not silently remove existing user data.

Use the publishable key in the browser and the service-role key only on the server. Follow [account setup](../docs/ACCOUNT-SETUP.md) for confirmation URLs and [catalog recovery](../docs/catalog-recovery.md) for cache behavior and expiry cleanup.
