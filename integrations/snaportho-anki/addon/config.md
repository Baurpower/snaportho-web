# SnapOrtho Reviewer settings

- `environment`: `local`, `staging`, or `production`.
- `base_url`: reviewer API origin. Production requires HTTPS; local HTTP is allowed only for loopback hosts.
- `request_timeout_seconds`: 5–60 seconds.
- `diagnostics_enabled`: enables safe metadata diagnostics only.
- `usage_reporting`: when true (default), a linked add-on sends one daily heartbeat with add-on version, Anki version, and OS family. SnapOrtho already records downloads, device linking, BroBot use, and deck updates as part of operating the service. Card text, notes, and review history are never uploaded.

Never put tokens, credentials, reviewer identities, card bodies, or service-role keys here. Restart Anki after changing the backend environment or URL.
