# SnapOrtho Anki add-on 1.0.9

Released: 2026-10-07

## Launch poller efficiency

- The web "launch in Anki" endpoint now long-polls: the add-on holds the
  pending-launch request open up to ~50s and the server answers the instant
  a launch is requested, instead of polling every few seconds around the clock.
- The add-on no longer polls for launches while Anki is minimized; pending
  launches are picked up on the next poll after the window is restored.
- Net effect: far fewer background requests from always-on Anki installs
  (this was the dominant driver of the Sep 7-Oct 7 Vercel CDN overage),
  and faster launch delivery: typically seconds, worst case ~1 minute
  (previously up to 5 minutes at the deepest poll backoff).

## Compatibility

- Long-polling activates automatically for add-on 1.0.9+. Older add-on
  versions keep working unchanged against the same server.
