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
