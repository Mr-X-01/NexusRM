# Admin CRM Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the admin/settings/AI surfaces so NexusRM works as a real Russian-first CRM with RUB defaults, actionable admin controls, and role-aware workflows.

**Architecture:** Keep the existing compact Nest + React structure. Add missing backend admin endpoints, make workspace settings the source of truth, then wire the React admin/settings views to those endpoints with local optimistic state refresh.

**Tech Stack:** NestJS, Prisma, React, Vite, Vitest/Jest, TypeScript.

---

### Task 1: Workspace Currency And AI Defaults

**Files:**
- Modify: `backend/src/crm/admin.controller.ts`
- Modify: `backend/src/crm/ai.controller.ts`
- Modify: `frontend/src/lib/utils.ts`
- Test: `frontend/src/lib/utils.test.ts`

- [ ] **Step 1: Write the failing frontend currency test**

```ts
import { describe, expect, it } from "vitest";
import { money } from "./utils";

describe("money", () => {
  it("formats CRM amounts in Russian rubles by default", () => {
    expect(money(42000)).toBe("42 000 ₽");
  });
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `npm run test --workspace frontend -- src/lib/utils.test.ts`
Expected: FAIL because `money()` currently formats USD.

- [ ] **Step 3: Change defaults from USD to RUB**

Set backend default workspace `currency` to `RUB`; update `money()` to use `ru-RU` and `RUB` by default.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace frontend -- src/lib/utils.test.ts`
Expected: PASS.

### Task 2: Admin Users API

**Files:**
- Modify: `backend/src/crm/dto.ts`
- Modify: `backend/src/crm/admin.controller.ts`
- Test: `backend/src/crm/admin.controller.spec.ts`

- [ ] **Step 1: Write failing tests for admin user creation and update**

Cover `POST /admin/users` controller behavior by calling `createUser()` with email, name, password, role, status, title, department, and phone; assert password is hashed and returned data excludes `passwordHash`.

- [ ] **Step 2: Run backend test to verify it fails**

Run: `npm run test --workspace backend -- admin.controller.spec.ts`
Expected: FAIL because `CreateUserDto` and `createUser()` do not exist.

- [ ] **Step 3: Implement minimal admin user creation**

Add `CreateUserDto`, create a bcrypt hash, persist user, write an audit log, and return the same public user shape used by `GET /admin/users`.

- [ ] **Step 4: Run backend test to verify it passes**

Run: `npm run test --workspace backend -- admin.controller.spec.ts`
Expected: PASS.

### Task 3: Settings And API Key Toggles In UI

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace decorative toggles with buttons**

Make `Toggle` accept `onToggle`, `disabled`, and `busy` props and render a real button with `aria-pressed`.

- [ ] **Step 2: Wire settings updates**

In `SettingsPage` and `AdminPage`, call `PATCH /api/admin/settings` for `aiEnabled`, `publicApiEnabled`, `registrationEnabled`, and `defaultRole`; update local state from the response.

- [ ] **Step 3: Wire API key status toggles**

Call `PATCH /api/admin/api-keys/:id/toggle` and replace the changed key in local state.

### Task 4: Admin User Management UI

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add create-user form**

Add fields for name, email, password, role, status, title, department, and phone in the admin users card.

- [ ] **Step 2: Add inline role/status/profile editing**

For each user row, use selects/inputs and a save button that calls `PATCH /api/admin/users/:id`.

- [ ] **Step 3: Show role expectations**

Keep admin-only controls in admin panel; make manager/viewer see their role and a read-only settings/profile page instead of broken controls.

### Task 5: Auth Token Recovery And AI Fallback

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `backend/src/crm/ai.controller.ts`

- [ ] **Step 1: Add refresh-on-401 client behavior**

When an authenticated request fails with invalid/expired access token, call `/api/auth/refresh`, persist the new session, and retry once.

- [ ] **Step 2: Make AI usable without a valid external token**

If DeepSeek is not configured or returns auth errors, return a local CRM recommendation response with `model: "local-crm-fallback"` instead of exposing a raw provider token error.

- [ ] **Step 3: Verify manually in Browser**

Run frontend/backend, log in as admin, change settings, add/edit a user, toggle an API key, and send an AI chat message.
