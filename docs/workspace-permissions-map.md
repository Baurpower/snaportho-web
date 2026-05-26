# Workspace Permissions Map

## Source Of Truth

- `program_memberships`: account-to-program access
- `program_roster`: in-program identity
- `program_roster.isAdmin`: admin/resident mode

## Permission Helpers

- Server context: `getWorkspaceAccessContext(...)`
- Permission resolution: `getWorkspacePermissions(...)`
- Workspace gate: `requireWorkspaceAccess(...)`
- Action gate: `requireWorkspacePermission(...)`
- Client hook: `useWorkspacePermissions()`

## Current Mode Rules

- `mode = "admin"` only when the linked `program_roster.isAdmin === true`
- `mode = "resident"` for every other workspace member
- membership without a linked roster can enter only safe workspace/profile flows

## Permission Expectations

Admin-only:

- `canEditCallAssignments`
- `canUploadCallSchedule`
- `canManageCallRules`
- `canExportProgramCallCalendar`
- `canSyncProgramCalendar`
- `canApproveSwaps`
- `canApproveTimeOff`
- `canUploadTimeOff`
- `canManageRotations`
- `canManageRoster`
- `canManageProgramSettings`
- `canCreateAcademicEvents`
- `canEditAcademicEvents`
- `canDeleteAcademicEvents`

Roster-linked member actions:

- `canRequestCoverage`
- `canRespondToCoverageRequests`
- `canSyncOwnCalendar`
- `canRequestTimeOff`
- `canEditOwnTimeOff`

Shared view permissions:

- `canViewWorkspace`
- `canViewCallSchedule`
- `canViewTimeOff`
- `canViewAcademicCalendar`

## Route Guard Pattern

Read/shared page:

```ts
await requireWorkspaceAccess({ allowUnlinkedRoster: true });
```

Roster-linked member action:

```ts
await requireWorkspacePermission({
  userId,
  programId,
  permission: "canRequestTimeOff",
});
```

Admin mutation:

```ts
await requireWorkspacePermission({
  userId,
  programId,
  permission: "canEditCallAssignments",
});
```

## Phase 2 Admin Workspace Stabilization

The current workspace shell is now treated as the admin workspace whenever:

```ts
permissions.mode === "admin"
```

Admin-mode pages and actions:

- `/work/settings`
- `/work/academic/add`
- call schedule management actions inside `/work/call`
- program import/planning actions inside `/work/call/add`
- time-off import/program-entry actions inside `/work/time-off/add`
- academic create/edit/delete actions in shared academic surfaces

Shared routes that still need resident-specific redesign in Phase 3:

- `/work`
- `/work/call`
- `/work/time-off`
- `/work/academic`
- `/work/call/swaps`

Phase 2 expectation:

- admins keep the current operational workflows
- residents stay in safe read/request flows
- backend permissions remain the source of truth for admin mutations

## Call Creation Note

- The previous admin add-call workflow has been restored at `/work/call/add`.
- Admins can again use both:
  - individual call entry
  - program upload/import
- Residents should not have admin add-call actions exposed from the main call hub.

## Resident Call TODO

- Admin mode keeps the current call schedule management flow.
- Resident mode is intentionally basic again for now.
  - view call calendar
  - view swap requests
  - no resident-first change-call flow in the call hub yet
- Coverage requests remain requests only.
  - The official schedule still changes only after recipient acceptance and admin approval.
- A future resident workflow can still be built on top of the preserved swap request backend.
