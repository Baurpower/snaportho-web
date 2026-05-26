# Workspace Role Split Audit

## Phase 1 Implementation Note

Phase 1 added a centralized workspace access-control layer in
`src/lib/workspace/access-control.ts`.

Current source-of-truth model:

- `program_memberships` proves the SnapOrtho account can access a workspace program.
- `program_roster` identifies the user inside that program.
- `program_roster.isAdmin` is now the primary admin/resident mode signal.
- Membership without a linked roster is treated as limited workspace access, not admin access.

Primary helpers added:

- `getWorkspaceAccessContext(...)`
- `getWorkspacePermissions(...)`
- `requireWorkspaceAccess(...)`
- `requireWorkspacePermission(...)`
- `useWorkspacePermissions()`

Phase 1 route/API hardening focused on the highest-risk mutations:

- call assignment create/update/delete
- call bulk upload and parse flows
- call rule management
- Google sync program-scope controls
- academic calendar create/edit/delete and related subresources
- academic external people and journal article mutation/read guards

Phase 1 also added light gating for shared UI entry points:

- residents no longer see the sidebar settings link
- residents no longer see call edit controls
- residents no longer see call/time-off program upload toggles
- admin-only settings and academic add routes now redirect non-admin users

Still intentionally deferred to later phases:

- resident-specific call day modal/content split
- deeper resident simplification of admin-shaped pages
- broader cleanup of duplicated UI role branching
- additional backend hardening for lower-risk legacy routes

## Phase 2 Admin Workspace Stabilization

Phase 2 formalized the current workspace shell as the admin workspace when
`permissions.mode === "admin"`.

What is now explicitly treated as admin-mode functionality:

- call schedule management and quick assignment editing
- call import / planning workflows
- program-wide call export and Google sync operations
- time-off import / program-entry workflow
- rotation, track, and assignment management
- academic event creation and event editing
- swap approval and other program-operations entry points

Phase 2 UI stabilization changes:

- admin-oriented labels now describe the current workflow more explicitly
- the workspace home now surfaces an admin operations panel with quick links
- sidebar navigation now reflects admin context more clearly
- academic creation and edit affordances are hidden from residents
- call hub actions are labeled as schedule-management tools for admins

Pages now treated as explicit admin-mode pages:

- `/work/settings`
- `/work/academic/add`
- admin sections within `/work/call`
- admin sections within `/work/call/add`
- admin sections within `/work/time-off/add`

Call workflow update:

- the old manual individual call creation flow has been removed from the workspace
- `/work/call/add` now represents the admin import / planning workflow only
- residents do not have a call creation entry point

Shared but still mixed components that remain for Phase 3:

- `src/app/work/call/callhubclient.tsx`
- `src/components/workspace/call/calldaydetailscontent.tsx`
- `src/components/workspace/academic/academiceventdetail.tsx`
- `src/app/work/time-off/timeoffclient.tsx`

Remaining resident redesign work for Phase 3:

- resident-specific dashboard and navigation
- resident call-day modal and coverage-request interaction
- resident-only simplification of call and time-off entry flows
- clearer resident academic event detail mode

## 1. Executive Summary

The current workspace app already behaves mostly like an admin-first product. The top-level workspace shell, navigation, and major route entrypoints are shared across all authenticated users, while deeper role logic is inconsistent and scattered across feature-specific helpers. That makes the current app a solid baseline for the future admin/chief/scheduler experience, but it is not yet a safe or clean foundation for a resident-only mode.

The biggest current issue is not visual clutter. It is uneven authorization:

- Some domains already have server-side edit guards:
  `rotations`, `track management`, `time-off program quick add`, `swap admin actions`
- Some domains rely on coarse membership checks or permissive editor roles:
  `call assignment mutations`, `call rules`, `Google sync scope=program`
- Some academic calendar APIs are effectively only auth-gated and trust `programId` from the client:
  `events`, `event types`, `locations`, `sessions`, `people`, `assignments`

There is also persistent identity drift between `program_roster.id` and `program_memberships.id`. Several endpoints intentionally expose `membershipId` as a compatibility alias for `rosterId`, which is workable today but risky for a role split because resident-specific actions should consistently key off roster identity for schedule ownership and request flows.

Recommended first implementation phase:

- add a central workspace permission model
- make nav and route-level gating role-aware
- harden backend mutations before hiding UI

Do not start by redesigning admin pages. Start by centralizing permissions and removing resident access to admin-only entry points.

## 2. Current App Architecture Overview

### Workspace shell and route model

- Global layout: `src/app/work/layout.tsx`
  Renders `WorkspaceShell` for all `/work/**` routes.
- Shell: `src/components/workspace/workspaceshell.tsx`
  Shared shell with sidebar show/hide state.
- Sidebar: `src/components/workspace/workspacesidebar.tsx`
  Static nav for everyone:
  `Home`, `Call`, `Time Off`, `Academics`, `Profile`, `Settings`

### Access entrypoint

- `src/lib/workspace/require-workspace-access.ts`
  Current route guard checks:
  - authenticated Supabase user
  - active `program_memberships` row
  - claimed `program_roster` row linked to that membership/program
  - updates `workspace_user_state`

This helper confirms workspace membership, but it is not role-aware.

### Workspace data context

- `src/lib/workspace/memberships.ts`
  `getActiveMembershipForUser(userId)` resolves:
  - active membership
  - linked roster
  - fallback roster by `claimed_by_user_id`
- `src/lib/workspace/use-workspace-info.ts`
  Client hook using `/api/me/info`
  Provides:
  - `activeProgram`
  - `membership.role`
  - `roster.role`
  - `roster.isAdmin`

### Major product domains

- Home dashboard:
  `src/app/work/workspacehomeclient.tsx`
- Call hub:
  `src/app/work/call/callhubclient.tsx`
- Swap dashboard:
  `src/app/work/call/swaps/swapsdashboardclient.tsx`
- Time off:
  `src/app/work/time-off/timeoffclient.tsx`
- Academic calendar:
  `src/app/work/academic/academichomeclient.tsx`
- Rotation/program settings:
  `src/app/work/settings/settingsclient.tsx`
- Profile/account:
  `src/app/work/profile/profileclient.tsx`

## 3. Route Inventory

Legend:

- Audience now: who the current UI is effectively built for
- Future treatment:
  `shared`, `admin-only`, `resident-only`, `shared role-adapted`, `needs backend protection`, `needs UI cleanup`

| File path | URL path | Current purpose | Audience now | Admin see? | Resident see? | Admin edit? | Resident edit? | Major components | Main APIs called | Risky admin-only actions exposed | Recommended future treatment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/app/work/page.tsx` + `workspacehomeclient.tsx` | `/work` | Workspace home dashboard with week/ahead views, rotations, calls, events, coverage | Resident-friendly, but includes program-wide coverage data | Yes | Yes | No | No | `WeekPlannerPanel`, `WeekScheduleView`, `MonthsScheduleView` | `/api/me/summary`, `/api/me/week-lite`, `/api/me/month-lite`, `/api/me/rotations`, `/api/program/calls/month`, `/api/program/coverage` | Program-wide call month + coverage visible to all workspace members | `shared role-adapted` |
| `src/app/work/call/page.tsx` + `callhubclient.tsx` | `/work/call` | Main call hub with month calendar, day detail modal, edit mode, export, Google sync, swaps | Mixed but strongly admin-shaped | Yes | Yes | Yes | Indirectly yes today | `CallMonthCalendar`, `EditCallMonthCalendar`, `CallDayDetailsContent`, `DayDetailsModal`, `NotificationBell`, swap panels, `AdminSwapApprovalQueue` | `/api/program/calls/month`, `/api/program/calls/[callId]`, `/api/program/calls`, `/api/program/calls/swap`, `/api/program/calls/export`, `/api/program/calls/google-sync`, Google integration APIs, swap APIs | Edit toggle, add call, program-wide export, program-wide Google sync, admin approval queue all live on same page | `shared role-adapted`, `needs backend protection`, `needs UI cleanup` |
| `src/app/work/call/add/page.tsx` | `/work/call/add` | Admin call schedule import and planning page | Admin-first | Yes | No | Yes | No | `AddProgramCall` | program `/api/program/calls`, `/api/program/calls/bulk`, `/api/program/calls/parse`, rules/stats/availability APIs | Program upload/import and planning tools live here; manual individual add flow has been removed | `admin-only`, `needs backend protection`, `needs UI cleanup` |
| `src/app/work/call/swaps/page.tsx` + `swapsdashboardclient.tsx` | `/work/call/swaps` | Direct coverage/swap dashboard | Shared | Yes | Yes | Admin only for approval tab | Yes for own requests | incoming/outgoing panels, `AdminSwapApprovalQueue`, `SwapRequestDetailDrawer` | `/api/program/calls/swaps`, `/api/program/calls/swaps/[swapId]`, `/respond`, `/admin-decision`, `/cancel` | Admin queue appears when client-side approval logic says yes | `shared role-adapted` |
| `src/app/work/time-off/page.tsx` + `timeoffclient.tsx` | `/work/time-off` | Time-off planner, stats, list views, editable self detail modal | Resident-friendly with some admin data visibility | Yes | Yes | No program edits here | Yes for own items | `DayDetailsModal`, `TimeOffDayDetailsContent` | `/api/program/time-off/month`, `/api/program/time-off/[id]`, `/api/me/calls/golden-weekends` | None major in this page; self-edit only | `shared` |
| `src/app/work/time-off/add/page.tsx` | `/work/time-off/add` | Add time off with personal mode and program quick-add mode | Mixed; admin quick-add embedded | Yes | Personal flow yes | Yes | Yes for own request | `AddIndividualTimeOffView`, `ProgramTimeOffAddView` | `/api/program/time-off` | Program quick-add/upload chooser visible on shared page; page itself has no server guard | `shared role-adapted`, `needs UI cleanup` |
| `src/app/work/academic/page.tsx` + `academichomeclient.tsx` | `/work/academic` | Academic calendar home with week/list views and event details | Shared, but add/edit ecosystem is admin-capable | Yes | Yes | Yes through linked flows | View only ideally, but APIs currently permissive | `AcademicWeekView`, `AcademicListView`, `AcademicEventDetailDrawer` | `/api/program/academic-calendar/events`, sessions, people | Event detail drawer can expose edit/delete actions depending on component state; backend gaps are larger than UI gaps | `shared role-adapted`, `needs backend protection` |
| `src/app/work/academic/add/page.tsx` | `/work/academic/add` | Create/edit academic event, sessions, people, event type/location creation | Admin-only workflow | Yes | No | Yes | No | large event editor page | `events`, `event-types`, `locations`, `members`, event sessions/people endpoints | Full academic event mutation flow; page has no `requireWorkspaceAccess` gate; APIs do not adequately role-check | `admin-only`, `needs backend protection` |
| `src/app/work/academic/assignments/page.tsx` | `/work/academic/assignments` | My academic assignments list and event detail | Resident-facing | Yes | Yes | Possibly admin could also view | Residents not editing assignments from here | assignment list + `AcademicEventDetailDrawer` | `/api/program/academic-calendar/assignments?mineOnly=true` | Low route risk; depends on academic detail drawer actions | `resident-only` or `shared role-adapted` |
| `src/app/work/settings/page.tsx` + `settingsclient.tsx` | `/work/settings` | Program rotation settings, track management, assignments, academic year controls | Admin-first | Yes | Probably read-only at most | Yes | No | `RotationTracksManager`, `EditProgramRotations`, `ProgramRotations` | `/api/program/rotation-settings/overview`, `/api/me/program`, rotation assignment/track APIs | Track creation, membership replacement, assignment editing, import, generate assignments | `admin-only` for management, maybe later resident read-only fragment elsewhere |
| `src/app/work/profile/page.tsx` + `profileclient.tsx` | `/work/profile` | Account/profile settings | Shared | Yes | Yes | Yes self-only | Yes self-only | profile forms | auth/profile APIs + `useWorkspaceInfo` | None | `shared` |
| `src/app/work/welcome/page.tsx` | `/work/welcome` | Marketing/login entry | Public | N/A | N/A | N/A | N/A | standalone welcome UI | auth links | None | leave as-is |
| `src/app/work/onboarding/page.tsx` + `workspaceonboardingclient.tsx` | `/work/onboarding` | Workspace onboarding and program linking | New users | N/A | N/A | onboarding only | onboarding only | onboarding flow | onboarding and invite APIs | Not part of role split | leave as-is |
| `src/app/work/join/page.tsx` + `joininviteclient.tsx` | `/work/join` | Invite preview entry | Invite recipients | N/A | N/A | N/A | N/A | invite preview UI | `/api/program/invites/preview` | None | leave as-is |

### Route-level observations

- Most top-level routes call `requireWorkspaceAccess()`.
- These routes do not:
  - `/work/call/add`
  - `/work/time-off/add`
  - `/work/academic/add`
  - `/work/academic/assignments`
- Those pages still sit under the shared shell, but they skip the standard server-side workspace gate.

## 4. Component Inventory

### Call domain

| File path | What it does | Used in | Current classification | Mutates program-wide data? | Hide from residents? | Adapt by role? |
| --- | --- | --- | --- | --- | --- | --- |
| `src/app/work/call/callhubclient.tsx` | Main call page, month loading, export, Google sync, edit toggle, swaps, notifications | `/work/call` | `mixed/overloaded` | Yes via child actions | Parts yes | Yes |
| `src/components/workspace/call/callmonthcalendar.tsx` | Read-only program-wide month grid | call hub | `shared` | No | No | Maybe filter emphasis only |
| `src/components/workspace/call/editcallmonthcalendar.tsx` | Drag/drop editing and slot reassignment UI | call hub edit mode | `admin-only` in future | Yes | Yes | No, hide from residents |
| `src/components/workspace/call/calldaydetailscontent.tsx` | Day detail content with optional “Request coverage” CTA | call day modal | `shared role-adaptable` | No direct mutation | No | Yes, strong resident variant candidate |
| `src/components/workspace/shared/daydetailsmodal.tsx` | Generic modal with optional edit/save shell | call and time-off pages | `shared` | Only if passed save handler | No | Yes, but safe shared primitive |
| `src/components/workspace/call/programcallmanager.tsx` | Full program call generation/planning workflow | `/work/call/add` via `AddProgramCall` | `admin-only` | Yes | Yes | No |
| `src/components/workspace/call/programcalladdview.tsx` | Manual program call builder UI | `ProgramCallManager` | `admin-only` | Yes | Yes | No |
| `src/components/workspace/call/programcalleditview.tsx` | Program schedule editing view for builder flow | `ProgramCallManager` | `admin-only` | Yes | Yes | No |
| `src/components/workspace/call/programcalluploadpanel.tsx` | Parse/upload imported call schedule | `/work/call/add` | `admin-only` | Yes | Yes | No |
| `src/components/workspace/call/programrulessheet.tsx` | Call rule editing | `ProgramCallManager` | `admin-only` | Yes | Yes | No |
| `src/components/workspace/call/programcallreviewmodal.tsx` | AI review / validation of generated schedule | `ProgramCallManager` | `admin-only` | No direct write, but part of mutation workflow | Yes | No |
| `src/components/workspace/call/addprogramcall.tsx` | Wrapper for program manager + upload | `/work/call/add` | `admin-only` | Yes | Yes | No |
| `src/components/workspace/call/programtimeoffaddview.tsx` | Program-level time-off quick add by resident | `/work/time-off/add` | `admin-only` | Yes | Yes | No |

### Swap request domain

| File path | What it does | Used in | Current classification | Mutates program-wide data? | Hide from residents? | Adapt by role? |
| --- | --- | --- | --- | --- | --- | --- |
| `src/components/workspace/call-swaps/SwapRequestModal.tsx` | Create direct coverage request | call hub | `resident-facing shared` | Creates request, not schedule | No | Light adaptation only |
| `IncomingSwapRequestsPanel.tsx` | Resident incoming requests | call hub, swaps page | `resident-facing` | Responds to requests | No | No |
| `OutgoingSwapRequestsPanel.tsx` | Resident outgoing/completed requests | call hub, swaps page | `resident-facing` | Cancel actions | No | No |
| `AdminSwapApprovalQueue.tsx` | Admin accepted-request approval queue | call hub, swaps page | `admin-only` | Approves official schedule change | Yes | Yes |
| `SwapRequestDetailDrawer.tsx` | Request detail + audit log | call hub, swaps page | `shared role-adapted` | No direct write itself | No | Yes |

### Time-off domain

| File path | What it does | Used in | Current classification | Mutates program-wide data? | Hide from residents? | Adapt by role? |
| --- | --- | --- | --- | --- | --- | --- |
| `src/app/work/time-off/timeoffclient.tsx` | Main time-off planner and self-edit flow | `/work/time-off` | `shared` | Self edit only | No | Maybe reduce resident clutter later |
| `src/components/workspace/time-off/addindividualtimeoffview.tsx` | Personal request create flow | `/work/time-off/add` | `resident-facing` | Creates self request | No | No |
| `src/components/workspace/time-off/addtimeoffform.tsx` | Shared personal request form logic | add individual view | `resident-facing shared` | Creates self request | No | No |
| `src/components/workspace/time-off/timeoffdaydetailscontent.tsx` | Read-only daily item details | time-off modal | `shared` | No | No | Minimal |
| `src/components/workspace/call/programtimeoffaddview.tsx` | Admin quick-add for any resident | `/work/time-off/add` | `admin-only` | Yes | Yes | No |

### Settings / program setup domain

| File path | What it does | Used in | Current classification | Mutates program-wide data? | Hide from residents? | Adapt by role? |
| --- | --- | --- | --- | --- | --- | --- |
| `src/app/work/settings/settingsclient.tsx` | Settings page orchestrator | `/work/settings` | `admin-only` in future | Yes | Yes | No |
| `programrotations.tsx` | Read view of assignments by resident | settings | `shared-ish admin read view` | No | Probably yes from nav | Could be reused for resident-only rotation summary elsewhere |
| `editprogramrotations.tsx` | Rotation assignment editing | settings | `admin-only` | Yes | Yes | No |
| `rotationtracksmanager.tsx` | Track management shell | settings | `admin-only` | Yes | Yes | No |
| `rotationtrackgrideditor.tsx` | Track block editor | settings | `admin-only` | Yes | Yes | No |
| `rotationtrackmemberspanel.tsx` | Track member assignment | settings | `admin-only` | Yes | Yes | No |
| `generateassignmentsmodal.tsx` | Generate track assignments | settings | `admin-only` | Yes | Yes | No |

### Academic domain

| File path | What it does | Used in | Current classification | Mutates program-wide data? | Hide from residents? | Adapt by role? |
| --- | --- | --- | --- | --- | --- | --- |
| `src/app/work/academic/academichomeclient.tsx` | Academic home orchestration | `/work/academic` | `shared` | No direct write | No | Yes |
| `academicweekview.tsx` | Weekly calendar fetch/display | academic home | `shared` | No | No | Maybe hide add actions |
| `academiclistview.tsx` | List view of events | academic home | `shared` | No | No | Maybe hide add/edit affordances |
| `academiceventdetail.tsx` | Event detail drawer with edit/delete/session actions | academic home, assignments | `mixed/overloaded` | Yes | Parts yes | Yes, likely split detail modes |
| `src/app/work/academic/add/page.tsx` | Full event editor | `/work/academic/add` | `admin-only` | Yes | Yes | No |
| `src/app/work/academic/assignments/page.tsx` | My assignments | `/work/academic/assignments` | `resident-facing` | No direct write | No | Low |

### Notifications

| File path | What it does | Used in | Current classification | Mutates program-wide data? | Hide from residents? | Adapt by role? |
| --- | --- | --- | --- | --- | --- | --- |
| `NotificationBell.tsx` | Bell entrypoint | call hub only today | `shared` | Marks self notifications read | No | Broaden placement maybe |
| `NotificationDropdown.tsx` | Dropdown list | bell | `shared` | Marks self notifications read | No | Minimal |
| `useWorkspaceNotifications.ts`, `useUnreadNotificationCount.ts` | Notification hooks | bell | `shared` | No write except read hooks elsewhere | No | Minimal |

## 5. Permission / Role Audit

### Where roles come from

- Membership role:
  `program_memberships.role`
- Roster role:
  `program_roster.role`
- Extra admin flag:
  `program_roster.isAdmin`
- Main resolver:
  `src/lib/workspace/memberships.ts`
- Route gate resolver:
  `src/lib/workspace/require-workspace-access.ts`
- Client info route:
  `/api/me/info`

### Role values found in code

- `owner`
- `admin`
- `program_admin`
- `coordinator`
- `faculty`
- `faculty_lead`
- `chief`
- `chief_resident`
- `resident`
- `member`

### Existing frontend permission checks

- Swap admin tab:
  `src/app/work/call/swaps/swapsdashboardclient.tsx`
  Uses `canApproveSwapRequest(...)`
- Rotation settings edit/read:
  `src/app/work/settings/settingsclient.tsx`
  Relies on `permissions.canManageRotationSettings`
- Program time off quick add:
  `src/components/workspace/call/programtimeoffaddview.tsx`
  Loads permission from `/api/program/time-off`
- Call hub:
  no true role gating for `Edit`, `Add Call`, `Export`, `Google Sync`
- Sidebar:
  no role gating at all

### Existing backend permission checks

- Rotation settings and tracks:
  `src/lib/workspace/rotations/permissions.ts`
  used by `rotation-settings`, `rotation-tracks`, `rotation-assignments`
- Swap permissions:
  `src/lib/workspace/call-swaps/permissions.ts`
  used by swap list/view/respond/admin/cancel services
- Program time off management:
  `src/lib/workspace/call/time-off.ts`
  `canManageProgramTimeOff(...)`
- Academic calendar:
  helper exists in `src/lib/workspace/academic-calendar/permissions.ts`
  but is not consistently applied in current route handlers

### Duplicated permission logic

- Role normalization duplicated in:
  - `call-swaps/permissions.ts`
  - `rotations/permissions.ts`
  - `call/time-off.ts`
  - `pgy.ts`
- Editor role sets differ by feature instead of sharing a central source.
- Access checks are recomputed independently in client and server.

### Missing permission checks

#### High risk

- `src/app/api/program/academic-calendar/events/route.ts`
  - `GET` trusts `programId` query param after auth
  - `POST` allows creating event for any submitted `program_id`
- `src/app/api/program/academic-calendar/events/[eventId]/route.ts`
  - event fetch/update/delete do not verify membership in event program
- `event-types`, `locations`, `sessions`, `people`, `assignments`
  - same issue pattern

#### High risk

- `src/app/api/program/calls/[callId]/route.ts`
  - `PATCH` and `DELETE` verify only membership in program
  - no role check before mutating official schedule
- `src/app/api/program/calls/google-sync/route.ts`
  - allows `scope === "program"` for any active member
- `src/app/api/program/calls/export/route.ts`
  - allows `scope=program` for any active member
- `src/app/api/program/call-rules/route.ts`
  - `PUT` saves rules with no explicit editor-role check
- `src/app/api/program/call-rule-sets/route.ts`
  - auto-creates default rule set on read if missing

#### Medium risk

- `src/app/api/program/calls/parse/route.ts`
  - parse/upload preview allowed to any active member
- `src/app/api/program/coverage/route.ts`
  - exposes program-wide coverage structure to any member

### UI hidden but API may still allow action

- Residents may not discover some admin actions from nav, but APIs still allow them:
  - call edit/delete
  - call rules save
  - academic event create/edit/delete
  - academic metadata creation
  - program-wide Google sync/export

### API blocks but UI may still show action

- Program time-off quick add:
  UI can render the mode, but the API returns `canManageProgramTimeOff: false`
- Swap admin queue:
  UI requests admin view and hides queue on `403`
- Rotation settings:
  UI receives `canManageRotationSettings` and downgrades some parts to read-only

### Places normal users may currently see admin tools

- Static sidebar includes `Settings` for everyone
- Call hub shows:
  - `Edit`
  - `Add Call`
  - `Export`
  - `Connect/Sync Google`
- `/work/call/add` exposes “Program Upload” mode
- `/work/time-off/add` exposes “Program Upload” mode
- Academic flows can reach admin-grade mutation UIs if linked directly

### Recommended central permission model

Proposed file:

- `src/lib/workspace/permissions.ts`

Recommended server API:

```ts
export type WorkspaceMode = "resident" | "admin";

export type WorkspacePermission =
  | "canViewProgramDashboard"
  | "canViewCallSchedule"
  | "canViewProgramCallSchedule"
  | "canRequestCoverage"
  | "canRespondToCoverageRequests"
  | "canApproveSwaps"
  | "canEditCallAssignments"
  | "canCreatePersonalCallEntry"
  | "canUploadCallSchedule"
  | "canManageCallRules"
  | "canExportProgramCallCalendar"
  | "canSyncOwnCalendar"
  | "canSyncProgramCalendar"
  | "canViewTimeOff"
  | "canRequestTimeOff"
  | "canEditOwnTimeOff"
  | "canManageProgramTimeOff"
  | "canUploadTimeOff"
  | "canViewAcademicCalendar"
  | "canCreateAcademicEvents"
  | "canEditAcademicEvents"
  | "canManageAcademicMetadata"
  | "canViewAcademicAssignments"
  | "canManageRotations"
  | "canManageRotationTracks"
  | "canManageRoster"
  | "canManageProgramSettings";

export type WorkspacePermissions = {
  mode: WorkspaceMode;
  role: string | null;
  rosterRole: string | null;
  isRosterAdmin: boolean;
  canViewProgramDashboard: boolean;
  canViewCallSchedule: boolean;
  canViewProgramCallSchedule: boolean;
  canRequestCoverage: boolean;
  canRespondToCoverageRequests: boolean;
  canApproveSwaps: boolean;
  canEditCallAssignments: boolean;
  canCreatePersonalCallEntry: boolean;
  canUploadCallSchedule: boolean;
  canManageCallRules: boolean;
  canExportProgramCallCalendar: boolean;
  canSyncOwnCalendar: boolean;
  canSyncProgramCalendar: boolean;
  canViewTimeOff: boolean;
  canRequestTimeOff: boolean;
  canEditOwnTimeOff: boolean;
  canManageProgramTimeOff: boolean;
  canUploadTimeOff: boolean;
  canViewAcademicCalendar: boolean;
  canCreateAcademicEvents: boolean;
  canEditAcademicEvents: boolean;
  canManageAcademicMetadata: boolean;
  canViewAcademicAssignments: boolean;
  canManageRotations: boolean;
  canManageRotationTracks: boolean;
  canManageRoster: boolean;
  canManageProgramSettings: boolean;
};
```

Recommended helpers:

- server:
  `getWorkspacePermissions(context)`
  `requireWorkspacePermission({ programId, permission })`
- client:
  `useWorkspacePermissions()`
- route guard:
  `requireWorkspaceRoleAccess({ permission: "canManageRotations" })`

## 6. Admin Experience Map

Treat the current app as the baseline admin experience.

| Admin feature | Current location | Current UI quality | Stay where it is? | Regroup under Manage later? | Backend enforcement today | Resident leakage |
| --- | --- | --- | --- | --- | --- | --- |
| Program dashboard | `/work` | Good enough | Yes | Optional later | Read access only | Low |
| Call schedule management | `/work/call` + `/work/call/add` | Strong but overloaded | Yes | Maybe keep under Call, not Manage | Partial only | High |
| Call assignment editing | `/work/call` edit mode | Useful | Yes | No | Weak on `[callId]` mutations | High |
| Call upload/import | `/work/call/add` | Good enough | Yes | Maybe separate admin subview later | Partial | High |
| Call rules management | `ProgramCallManager` | Advanced but admin-specific | Yes | Maybe nested under Call > Rules | Weak | Medium |
| Google calendar sync | `/work/call` | Good enough | Yes | No | Weak for program scope | High |
| Swap approval queue | `/work/call`, `/work/call/swaps` | Good enough | Yes | No | Stronger than most | Low |
| Time-off management / quick add | `/work/time-off/add` | Functional | Probably yes short-term | Maybe `Manage` later | Fairly good | Medium |
| Rotation/block schedule management | `/work/settings` | Good enough | Yes | Could remain under Settings/Manage | Strong | Medium via nav |
| Track membership management | `/work/settings` | Good enough | Yes | Yes | Strong | Medium |
| Roster/member management | fragmented, mostly data APIs not dedicated page | not yet clearly productized | Needs better home later | Yes | Limited | Low UI, medium backend |
| Program settings overview | settings/program APIs | underdeveloped | Needs future productization | Yes | Mixed | Low |
| Academic calendar management | `/work/academic/add`, event drawer | Functional but permissions unsafe | Yes for now | Maybe manage surfaces later | Weak | High |

## 7. Resident Experience Map

Target resident experience:

- Home
- Call schedule
- My call details
- Request coverage
- Incoming/outgoing swap requests
- Time off viewing/requesting
- Academic calendar
- Notifications
- Profile

Resident should not see:

- call upload/import
- schedule generation and rules
- edit call assignments
- program-wide Google sync/export
- time-off quick add for other residents
- rotation track management
- assignment generation
- raw academic event authoring
- program settings

### Reusable existing components

- `WorkspaceHomeClient`
- `CallMonthCalendar`
- `CallDayDetailsContent` as a base
- `SwapRequestModal`
- `IncomingSwapRequestsPanel`
- `OutgoingSwapRequestsPanel`
- `TimeOffHubClient`
- `AddIndividualTimeOffView`
- `AcademicWeekView`
- `AcademicListView`
- `NotificationBell`
- `ProfileClient`

### Components needing role-based branching

- `WorkspaceSidebar`
- `CallHubClient`
- `CallDayDetailsContent`
- `AcademicEventDetailDrawer`
- `/work/call/add`
- `/work/time-off/add`
- maybe `/work/settings` should disappear entirely for residents

### New resident-only components likely needed

- Resident call day modal content
  - my assignment details
  - request coverage CTA
  - active outgoing request status
  - incoming request if someone asked them
  - link to swap dashboard
  - no schedule edit controls
- Resident call header actions
  - maybe no `Edit`, no `Add Call`, no `Export program`, no `Google sync program`
- Resident academic event detail
  - attendance/resources/read-only content
  - no authoring actions

### Recommended resident call modal behavior

- Clicking my call:
  open resident action view
- Clicking someone else’s call:
  open read-only detail view
- Resident never sees `EditCallMonthCalendar`

## 8. API Security Audit

### Call APIs

| Route | Purpose | Who should access | Current enforcement | Recommended enforcement |
| --- | --- | --- | --- | --- |
| `/api/program/calls/month` | program call month read | all members | active membership only | keep shared read |
| `/api/program/calls/[callId]` `PATCH` | edit official call assignment | admin | only same-program membership | require `canEditCallAssignments` |
| `/api/program/calls/[callId]` `DELETE` | delete official call assignment | admin | only same-program membership | require `canEditCallAssignments` |
| `/api/program/calls` `POST` | create program calls | admin, maybe resident self only if intentionally allowed | `CALL_ASSIGNMENT_EDITOR_ROLES` includes `resident` | split personal vs program permissions |
| `/api/program/calls/bulk` | bulk replace/upload calls | admin | `CALL_ASSIGNMENT_EDITOR_ROLES` includes `resident` | require `canUploadCallSchedule` |
| `/api/program/calls/parse` | parse schedule file | admin | active membership only | require `canUploadCallSchedule` |
| `/api/program/calls/export` | ICS export | mine: all members, program: admin | active membership only | gate `scope=program` with `canExportProgramCallCalendar` |
| `/api/program/calls/google-sync` | Google sync | mine: all members, program: admin | active membership only | gate `scope=program` with `canSyncProgramCalendar` |
| `/api/program/calls/google-sync/stop` | stop own sync | all members for own sync | auth only | keep personal |
| `/api/program/calls/swap` | admin-style direct schedule swap | admin | membership in same program only | require `canEditCallAssignments` |

### Swap APIs

| Route | Purpose | Who should access | Current enforcement | Recommended enforcement |
| --- | --- | --- | --- | --- |
| `/api/program/calls/swaps` `GET` | list swaps | participants; admins for admin/completed/all views | good | keep |
| `/api/program/calls/swaps` `POST` | create request | requesting resident only | good roster ownership check | keep |
| `/api/program/calls/swaps/[swapId]` | detail view | participants + approvers | good | keep |
| `/respond` | recipient accept/decline | recipient only | good via service | keep |
| `/admin-decision` | approve/reject accepted request | admins only | good via service | keep |
| `/cancel` | cancel request | requester or admin | good via service | keep |

### Time-off APIs

| Route | Purpose | Who should access | Current enforcement | Recommended enforcement |
| --- | --- | --- | --- | --- |
| `/api/program/time-off/month` | month view | all members | good shared read | keep |
| `/api/program/time-off` `POST` | self request or admin quick add | self for personal; admin for other users | reasonably good | keep but map to central permission helper |
| `/api/program/time-off/[id]` `PATCH` | self edit | owner only | scoped by roster/membership | keep |
| `/api/program/time-off` `GET` | setup for quick add | all auth users but returns canManage flag | okay | keep, maybe move to admin-only route later |

### Rotation/settings APIs

- Overall best-protected domain today.
- Uses `requireRotationSettingsAccess(...)`.
- Recommended change:
  re-express through central workspace permission helper instead of isolated feature helper.

### Academic APIs

| Route group | Current state | Recommended |
| --- | --- | --- |
| `/api/program/academic-calendar/events` | unsafe; auth-only plus client `programId` | require membership in event program for `GET`; require `canCreateAcademicEvents` for `POST` |
| `/api/program/academic-calendar/events/[eventId]` | unsafe; fetch/update/delete do not verify program membership/role | resolve event program, then require view/edit permission |
| `/event-types`, `/locations` | unsafe create/read by `programId` | read by member, mutate by `canManageAcademicMetadata` |
| `/events/[eventId]/sessions`, `/people`, `/resources`, `/attendance` | likely same unsafe pattern | apply resolved-program guard |
| `/assignments` | read path partially resident-safe; create path unsafe | keep mine-only read; gate create/update/delete to academic editors |

### Notifications APIs

- `/api/workspace/notifications*`
  Self-scoped and low risk.
  Good shared resident/admin feature.

## 9. Data Model Considerations

### User -> membership -> roster resolution

Current resolution path:

- auth user
- active `program_memberships` row
- linked `program_roster` row via `program_membership_id`
- fallback roster lookup by `claimed_by_user_id`

This is workable, but it implies the app depends on both:

- all active workspace users having active membership rows
- all usable schedule users having claimed roster rows

### Key data model risks

#### 1. Roster vs membership identity drift

Many endpoints expose compatibility fields where `membershipId` actually contains `rosterId`:

- call month response
- time-off item responses
- rotation assignment responses

This is explicitly documented in comments in multiple files. It is the biggest data-shape risk for a role split because:

- resident schedule ownership is roster-centric
- swap requests use roster ids
- notifications use roster recipients
- some older clients still read `membershipId`

Recommendation:

- standardize all schedule-facing UI around `rosterId`
- keep `programMembershipId` distinct
- stop minting new compatibility aliases once permission refactor begins

#### 2. Roles are stored in two places

- `program_memberships.role`
- `program_roster.role`
- plus `program_roster.isAdmin`

Current features choose different sources. Future permission resolution should define:

- precedence order
- normalization rules
- fallback behavior when one side is missing

#### 3. Resident filtering is inconsistent

- `pgy.ts` treats visible residents as `resident`, `chief_resident`, `chief`
- `members` API often filters only `role === "resident"`
- settings pages use academic-year PGY visibility

This matters for chief residents who are both:

- residents for schedule viewing/requesting
- admin-like for management

#### 4. Graduated/inactive visibility

- some pages use `grad_year` and academic-year logic to filter
- some APIs return all roster rows for program
- some quick-add flows check `is_active`/date overlap

Resident mode should likely hide graduated/inactive roster rows by default.

#### 5. Admins may also be residents

The current codebase already implies this:

- `chief`
- `chief_resident`
- `resident` included in call editor roles

The permission system should support:

- `mode: "admin"` for UI/navigation
- while still preserving self-oriented resident capabilities

## 10. Recommended 3-Phase Development Plan

### Phase 1. Permission foundation + route/nav gating

Objective:

- introduce one central permission model
- make sidebar and top-level routes role-aware
- harden the most dangerous mutation APIs before hiding UI

Likely files affected:

- `src/lib/workspace/permissions.ts` new
- `src/lib/workspace/require-workspace-access.ts`
- `src/lib/workspace/use-workspace-info.ts` or a new permission hook
- `src/app/api/me/info/route.ts`
- `src/components/workspace/workspacesidebar.tsx`
- `src/app/work/call/callhubclient.tsx`
- `src/app/work/time-off/add/page.tsx`
- `src/app/work/call/add/page.tsx`
- `src/app/work/settings/page.tsx`
- high-risk APIs listed above

Backend changes:

- add `getWorkspacePermissions`
- add `requireWorkspacePermission`
- patch call mutation, call export/program sync, academic mutation routes

Frontend changes:

- hide admin nav for residents
- hide admin actions in call hub
- gate `/work/settings` and admin add flows

Permission changes:

- centralize role normalization
- centralize admin/resident mode calculation

Risks:

- breaking existing chiefs if role precedence changes unexpectedly
- compatibility with old `membershipId` consumers

Verification:

- admin sees same workflows as today
- resident no longer sees edit/upload/manage surfaces
- resident cannot hit hardened APIs manually

### Phase 2. Resident call/time-off simplification

Objective:

- make resident workspace feel like “my schedule + my requests”

Likely files affected:

- `src/app/work/call/callhubclient.tsx`
- `src/components/workspace/call/calldaydetailscontent.tsx`
- new resident call modal component
- `src/app/work/call/swaps/swapsdashboardclient.tsx`
- `src/app/work/time-off/timeoffclient.tsx`
- `/work/call/add` and `/work/time-off/add` flows

Backend changes:

- none major beyond phase 1 hardening
- maybe add dedicated resident-focused read payloads if current payloads are too broad

Frontend changes:

- resident day modal branches
- resident-focused action bar
- optional resident-only call add flow separation

Permission changes:

- use central permission hook across call/time-off pages

Risks:

- accidental regression to swap flows
- hidden assumptions in call hub about admin-only controls always existing

Verification:

- resident can view all calls
- resident can request coverage for own calls only
- resident cannot enter edit mode or manage program calendar
- self time-off create/edit still works

### Phase 3. Admin stabilization + backend hardening + polish

Objective:

- preserve current admin workflows while cleaning boundaries and stabilizing weak domains

Likely files affected:

- academic calendar API routes
- call rules/rule sets
- Google sync/export permissions
- settings/roster/program settings surfaces

Backend changes:

- finish academic route guards
- align feature helpers to central permission helper
- reduce identity aliasing in responses where safe

Frontend changes:

- optional “Manage” regrouping for admin-only tools
- clarify admin-specific actions in call/settings/academic areas

Permission changes:

- remove leftover duplicated role sets
- retire ad hoc local checks where central helper is sufficient

Risks:

- academic domain has many endpoints with similar bugs
- rule/rule-set behavior may be depended on by current planners

Verification:

- all program-wide mutations blocked for resident role
- all admin workflows still functional
- no direct-link access to hidden admin pages for residents

## 11. Open Questions / Assumptions

- Is `resident` intentionally included in `CALL_ASSIGNMENT_EDITOR_ROLES`, or is that a legacy artifact?
- Should chiefs/chief residents always use admin mode, or should they be able to switch between resident/admin views?
- Should residents be allowed program-wide read views for:
  - all call assignments
  - all time-off entries
  - coverage-by-rotation data
- Should `/work/settings` disappear entirely for residents, or eventually become a personal training/rotation read-only area?
- Should academic calendar editing be restricted to admin-like roles only, or can faculty/chiefs continue editing?
- Is there a future dedicated roster/member management page planned, or should the current settings area absorb that later?

## 12. High-Risk Files To Be Careful With

- `src/app/work/call/callhubclient.tsx`
  large mixed page with resident and admin concerns tightly coupled
- `src/components/workspace/call/editcallmonthcalendar.tsx`
  dense mutation-heavy admin editor
- `src/components/workspace/call/programcallmanager.tsx`
  orchestrates multiple call planning workflows
- `src/app/api/program/calls/[callId]/route.ts`
  currently under-protected official schedule mutation
- `src/app/api/program/calls/bulk/route.ts`
  bulk schedule replacement
- `src/app/api/program/calls/google-sync/route.ts`
  program-wide sync exposure
- `src/app/api/program/call-rules/route.ts`
  rule mutation without strong explicit permission gating
- `src/app/api/program/academic-calendar/**`
  broad surface area with weak membership/role enforcement
- `src/lib/workspace/memberships.ts`
  foundational identity resolver
- `src/lib/workspace/require-workspace-access.ts`
  foundational workspace gate
- `src/lib/workspace/pgy.ts`
  resident visibility logic
- `src/lib/workspace/call/time-off.ts`
  shared permission and identity mapping for time off
- `src/lib/workspace/rotations/permissions.ts`
  current best feature-specific permission helper, likely migration source

## Bottom Line

The current app can cleanly become the admin experience with relatively small structural changes, but only if permission logic is centralized first. The resident experience should be built mostly by gating and branching the existing shared pages, not by rebuilding the backend or replacing admin workflows.

## Call Workflow Reset Note

- The call hub has been restored to the last pushed admin workflow baseline and now serves as the official admin call mode.
- Preserved admin workflow pieces:
  - previous call hub layout
  - previous edit mode
  - previous day details modal behavior
  - previous add-call entry point
  - previous individual add and program upload page structure
- Preserved newer features:
  - swap request dashboard
  - incoming/outgoing request panels
  - admin approval queue
  - notification bell
  - permission/access-control foundation
- Resident-specific call simplification has been deferred.
  - Residents currently remain on the shared read-only calendar/day-details path until the next resident workflow pass.
