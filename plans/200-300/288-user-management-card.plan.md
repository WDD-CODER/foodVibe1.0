---
name: User Management Card — metadata-manager
overview: Admin-only UI card to list registered users and cascade-delete a user with all data across all 22 collections.
todos: []
isProject: false
---

# Goal — User Management Card

Add a User Management card to the metadata-manager page. Admin-only: lists all registered users with name, email, role. Trash button cascade-deletes a user's data across all 22 entity-type collections, then removes the user document. Self-delete is blocked server-side (403) and UI-side (disabled button). Non-admins see no card.

# Atomic Sub-tasks

- [ ] Task 1: `server/constants/all-user-entity-types.js` — create with ALL_USER_ENTITY_TYPES (22 strings)
- [ ] Task 2: `server/routes/admin.js` — create with GET /users and DELETE /users/:userId
- [ ] Task 3: `server/index.js` — mount adminRouter at /api/v1/admin
- [ ] Task 4: `src/app/core/models/admin-user.model.ts` — create AdminUser interface
- [ ] Task 5: `src/app/core/services/user-admin.service.ts` — create with getUsers() and deleteUser()
- [ ] Task 6: `src/app/pages/metadata-manager/components/user-management/user-management.component.ts` — create
- [ ] Task 7: `src/app/pages/metadata-manager/components/user-management/user-management.component.html` — create
- [ ] Task 8: `metadata-manager.page.component.html` — insert <app-user-management />
- [ ] Task 9: `metadata-manager.page.component.ts` — add UserManagementComponent to imports
- [ ] Task 10: ng build gate — zero errors
- [ ] Task 11: `.claude/commands/plan-implementation.md` — fix comprehensive-brief gate

# Rules

- No constructor injection — inject() only
- No any — type HTTP response as AdminUser[]
- requireAdmin from auth.js — do not rewrite
- col() helper replicated locally in admin.js — do not import from generic.js
- Cascade delete uses ALL_USER_ENTITY_TYPES (22 types) not CLONEABLE_TYPES (14)
- __master__ filtered server-side
- Self-delete blocked server-side (403) and UI-side (disabled button)
- No new SCSS classes — reuse .manager-card, .list-stack, .list-item, .c-icon-btn

# Done When

- Admin sees Users card listing all registered users (name + email + role badge)
- Trash button opens confirm → cascade-deletes 22 collections + user doc
- Own row trash disabled
- Non-admin sees no card
- ng build passes zero errors
