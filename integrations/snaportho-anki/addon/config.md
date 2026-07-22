# SnapOrtho Reviewer settings

- `environment`: `local`, `staging`, or `production`.
- `base_url`: reviewer API origin. Production requires HTTPS; local HTTP is allowed only for loopback hosts.
- `request_timeout_seconds`: 5–60 seconds.
- `diagnostics_enabled`: enables safe metadata diagnostics only.

Never put tokens, credentials, reviewer identities, card bodies, or service-role keys here. Restart Anki after changing the backend environment or URL.
