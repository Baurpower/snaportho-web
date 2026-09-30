# SnapOrtho Anki add-on 1.0.8

Released: 2026-09-30

## Identity safety fix

- New SnapOrtho bootstrap packages use SnapOrtho-owned note GUIDs instead of
  GUIDs inherited from the source deck.
- Existing SnapOrtho notes are adopted by their exact `SnapOrtho_ID` marker,
  preserving local scheduling and personal fields without importing into a
  pre-existing Marty McFly parent deck.
- Bootstrap downloads fail closed when only a legacy identity artifact is
  available.
- Sync updates are isolated by identity scheme so a fresh safe installation
  cannot replay legacy-GUID operations.

Learning-progress transfer from a separate Marty McFly installation is not
part of this release; this release prevents new cross-deck merging.
