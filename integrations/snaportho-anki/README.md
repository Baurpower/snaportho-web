# SnapOrtho Reviewer Anki add-on MVP

This is a source MVP and fake-tested Anki integration boundary. The workspace contained no recoverable add-on, so live Anki/Qt behavior is not claimed. The reviewer package waits for Anki lifecycle hooks, uses the existing device token over scoped HTTPS APIs, resolves GUID plus ordinal without trusting the native ID hint, and never silently changes a local note. Tokens belong in an OS credential-store implementation; the SQLite draft store rejects credential fields.

The separate `learner/` package imports no reviewer code. Package and live disposable-profile smoke testing remain release gates.

Phase 2 adds one shared card workspace across study mode, Browse, and the reviewer dashboard; profile-scoped restart-safe drafts; active KG search; missing-card/KG-expansion proposals; and immutable adjudication. Approval remains `approved_for_incorporation` only and never mutates the master deck or KG.
