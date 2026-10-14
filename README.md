<<<<<<< HEAD
# Resergo – Resource Reservation Management System

Resergo is a full-stack web application developed to help organizations manage shared resources such as meeting rooms, conference rooms, projectors, laptops, and other common facilities.

The system allows staff members to check resource availability, create reservations, view booking details, and manage their own reservations. Administrators can manage organizational resources and user accounts.

---

## Overview

In many organizations, shared resources are managed manually through messages, spreadsheets, or informal communication. This can cause scheduling conflicts, overlapping reservations, and uncertainty about resource availability.

Resergo provides a centralized reservation system where users can:

- View available resources
- Check daily availability
- Create reservations
- View who reserved a resource
- View the department of the person who created a reservation
- Update or cancel their own reservations
- Avoid overlapping reservations

The system also includes administrative functionality for managing resources and users.

---

## Features

### Staff Member Features

- Secure login
- View resource library
- View resource details
- Check resource availability
- View daily reservation calendar
- Create a reservation
- View all reservations
- View reservation owner and department
- Edit own upcoming reservations
- Cancel own upcoming reservations
- View personal upcoming reservations
- View department and team information

### Admin Features

- Login as administrator
- View all resources
- Add new resources
- Edit existing resources
- Change resource status
- Manage user accounts
- Add users
- Edit users
- Activate or deactivate users
- Change user department
- Change user role
- View all reservations

> Administrators can view all reservations, but they cannot edit or cancel another user's reservation unless they are the reservation owner.

---

## Technology Stack

### Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS

### Backend
- Next.js App Router
- Server Actions / API Routes
- TypeScript

### Database
- PostgreSQL

### ORM
- Prisma ORM

### Validation
- Zod

### Authentication
- Secure session-based authentication
- HTTP-only cookies
- bcrypt password hashing

### Version Control
- Git
- GitHub

---

## Prerequisites

Before running the project, make sure the following are installed:

- Node.js
- npm
- PostgreSQL
- Git

You can check your Node.js version using:

```bash
node --version
=======
# Resergo — Resource Reservation Management System

Full-stack app: **Next.js (App Router) + TypeScript + PostgreSQL + Prisma**.
Rooms and equipment can be reserved without double-booking, with a live calendar, role-based access and an admin area for resources and people.

---

## 1. Quick start

You need **Node.js 20.19+** and **PostgreSQL 14+** (16 recommended).

```bash
# 1. PostgreSQL — pick ONE
docker compose up -d                       # easiest (uses docker-compose.yml)
#   or create an empty database yourself:  createdb resergo

# 2. Configure
cp .env.example .env                       # then edit DATABASE_URL if needed

# 3. Install (also generates the Prisma client)
npm install

# 4. Create the tables
npm run db:deploy

# 5. Load demo data
npm run db:seed

# 6. Run
npm run dev                                # http://localhost:3000
```

### Demo accounts (local development only)

| Role  | Email               | Password       | Department    |
| ----- | ------------------- | -------------- | ------------- |
| Admin | dilan@company.com   | `Admin@12345`  | Finance       |
| User  | nimal@company.com   | `User@12345`   | IT Department |
| User  | sarah@company.com   | `User@12345`   | Marketing     |

> The seed also clears all reservations and sessions. **Never run it against a production database.**

---

## 2. Roles and rules

There are two roles, but **reservation ownership applies to everyone**.

| Action                                             | USER | ADMIN |
| -------------------------------------------------- | :--: | :---: |
| View dashboard, resources, calendar, people        |  ✔   |   ✔   |
| View any reservation (who booked it, department)   |  ✔   |   ✔   |
| Create a reservation (as themselves)               |  ✔   |   ✔   |
| **Edit / cancel a reservation**                    | only their own | **only their own** |
| Create / edit / remove resources                   |  ✘   |   ✔   |
| Create / edit / deactivate users, change roles     |  ✘   |   ✔   |

* An admin can **view** everybody's reservations but **cannot edit or cancel** someone else's. Admin powers are limited to *resource management* and *user management*.
* Every rule is enforced **on the server**. Hidden buttons are only a convenience: a hand-made request for someone else's reservation gets `403 Forbidden`.
* `userId`, `role` and department are always taken from the signed-in session, never from the request body.
* An admin cannot demote/deactivate themselves, and the last active admin cannot be removed.
* There is no public sign-up. Accounts are created by an admin (Teams & people → *Add employee*).

---

## 3. How double-booking is prevented

Two ACTIVE reservations (status ≠ `CANCELLED`) for the same resource can never overlap
(`newStart < existingEnd AND newEnd > existingStart`; back-to-back bookings are fine).

Three layers protect this:

1. **Server validation** – every create/update re-checks conflicts; the browser's live check is only for convenience.
2. **Transaction + row lock** – creating/updating runs in one database transaction that first locks the resource row (`SELECT … FOR UPDATE`). Simultaneous requests for the same resource queue up, so "check then insert" can't interleave.
3. **PostgreSQL exclusion constraint** – `reservation_no_overlap` (`btree_gist` + `tstzrange`) makes overlapping active rows impossible even if application code is bypassed. It lives in `prisma/migrations/…_prevent_reservation_overlap`.

The end-to-end test fires 12 simultaneous requests at one slot: exactly 1 succeeds, 11 get `409`.

---

## 4. Behaviour worth knowing

* **"Booked" is never stored.** A resource's stored status is `AVAILABLE`, `UNAVAILABLE` or `MAINTENANCE`. Whether it is *Booked right now* is calculated from active reservations.
* **Reservation status is derived from time**: Upcoming → In progress → Completed. Only `CANCELLED` is a stored state, so nobody has to mark reservations "completed".
* **Cancelling is soft.** The row stays in the history (and still shows in *My reservations*) but no longer blocks availability or appears on the calendar.
* **Who can change what, and when:** the owner can *edit* a reservation until it starts, and *cancel* it until it ends.
* **Removing a resource never destroys history.** With upcoming reservations it is refused; with past history it is *deactivated* (hidden, history kept); a never-used resource is deleted.
* **Deactivating a user** signs them out immediately and blocks login. Their old reservations stay.
* **Working hours & time zone** are configured in `src/config/app.ts` (default 09:00–15:00, matching the calendar columns 09–14) and `NEXT_PUBLIC_APP_TIMEZONE`. The reservation form and the server both use these values.

---

## 5. Project structure

```
prisma/
  schema.prisma                 data model
  migrations/                   SQL migrations (incl. the overlap constraint)
  seed.ts                       demo data
scripts/e2e.mjs                 end-to-end API test (see §7)
src/
  app/
    (auth)/login/               login route
    (app)/                      signed-in routes: /, /resources, /reservations, /calendar, /teams
    api/…                       REST API (see §6)
  proxy.ts                      redirects signed-out visitors to /login
  features/                     page code, one folder per page
  components/{common,layout,ui}
  context/                      user, toast, reservation & resource dialogs
  lib/
    db.ts                       Prisma client
    auth.ts                     login, sessions, current user
    permissions.ts              admin / ownership rules
    reservation-rules.ts        pure business rules (overlap, validation, status)
    reservations.ts resources.ts users.ts dashboard.ts calendar.ts   data access + rules
    validation.ts               Zod schemas
    http.ts errors.ts           API helpers
  config/app.ts                 time zone, working hours, session settings
  types/                        shared DTO types
```

Authentication is a server-side session: a random token in an **HTTP-only, SameSite=Lax** cookie, with only its SHA-256 hash stored in the `Session` table. Passwords are hashed with bcrypt (cost 12). Nothing is kept in `localStorage`.

---

## 6. API

All responses are JSON: `{ "data": … }` on success, `{ "error": { "code", "message", "details" } }` on failure.
Without a session every endpoint returns `401`.

| Method & path                              | Purpose                                        | Who             |
| ------------------------------------------ | ---------------------------------------------- | --------------- |
| `POST /api/auth/login` · `POST …/logout` · `GET …/me` | session                              | —               |
| `GET /api/resources` · `GET /api/resources/:id`       | list / details (+ upcoming)           | everyone        |
| `POST /api/resources` · `PATCH` · `DELETE …/:id`      | manage resources                      | **admin**       |
| `GET /api/reservations?scope=mine&date=YYYY-MM-DD`    | list                                  | everyone        |
| `POST /api/reservations`                              | create                                | everyone        |
| `GET /api/reservations/:id`                           | details                               | everyone        |
| `PATCH /api/reservations/:id` · `DELETE …/:id`        | edit · cancel (soft)                  | **owner only**  |
| `GET /api/availability?resourceId&date&startTime&endTime[&excludeId]` | conflict check        | everyone        |
| `GET /api/calendar?date=YYYY-MM-DD`                   | calendar data                         | everyone        |
| `GET /api/dashboard`                                  | dashboard numbers                     | everyone        |
| `GET /api/users` · `GET /api/departments`             | directory                             | everyone        |
| `POST /api/users` · `PATCH /api/users/:id`            | create / edit / (de)activate          | **admin**       |

Status codes: `400` validation · `401` signed out · `403` forbidden · `404` not found · `409` conflict · `429` too many login attempts · `503` database unreachable.

Reservation body: `{ "resourceId": 1, "date": "2026-10-12", "startTime": "10:00", "endTime": "11:00", "purpose": "…" }` (times are in the app time zone).

---

## 7. Testing

With the app running on seeded data:

```bash
npm run db:seed
npm run dev                       # in another terminal
npm run test:e2e                  # BASE_URL=http://localhost:3000 by default
```

The script exercises the whole system over HTTP (about 80 checks): login, create/update/cancel, conflicts (including the simultaneous-request race), the 403 ownership rules for users **and admins**, resource and user management, dashboard/calendar consistency, and cookie flags. It cleans up after itself.
If you run `npm start` (production) on plain `http://localhost`, set `SESSION_COOKIE_SECURE=false` first.

---

## 8. Deployment notes

* Run `npm run db:deploy` (applies migrations) — **not** `db:seed`.
* Create real admin users yourself (e.g. a one-off script) instead of using the demo accounts.
* The database user must be allowed to run `CREATE EXTENSION btree_gist` (included in standard PostgreSQL; allowed on Neon, Supabase, RDS, Azure, etc.).
* Serve over HTTPS (session cookies are `Secure` in production builds).
* The login throttle (`src/lib/rate-limit.ts`) is in-memory, which suits one server instance; use a shared store (Redis) if you run several.

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Unable to connect to the database." / `P1001` | PostgreSQL isn't running or `DATABASE_URL` is wrong. |
| `Cannot find module '@/generated/prisma/client'` | Run `npx prisma generate` (it normally runs on `npm install`). |
| Login works in dev but not after `npm start` on http | Set `SESSION_COOKIE_SECURE=false` locally. |
| `prisma migrate dev` asks to create a new migration | Run it once (`npx prisma migrate dev --name sync`). The included migrations were written by hand; `db:deploy` is the safe way to apply them. |
| Times look shifted | Check `NEXT_PUBLIC_APP_TIMEZONE`. |
>>>>>>> 334acbe (Initial Resergo project setup)
