# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # prisma generate + migrate deploy + next build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm run test         # Vitest (run all tests)
npm run test:ui      # Vitest with UI
npm run format       # Prettier on src/**

# Database
npm run db:push      # Push schema changes (no migration file)
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed demo data
npm run db:reset     # Force reset + re-seed
```

## Architecture

Full-stack ERP platform (Next.js 15 + Prisma 5 + PostgreSQL) targeting professional services companies (engineering, consulting, architecture firms).

**Key patterns:**
- All data mutations use **Next.js Server Actions** (no REST API layer for mutations)
- Multi-tenancy via `companyId` scoped on every model
- Role hierarchy: `SUPERADMIN > ADMIN > MANAGER > WORKER > GUEST`

### Directory Structure

```
src/
├── app/
│   ├── (protected)/     # Auth-required routes — each folder is a module
│   │   ├── admin/       # Company admin panel
│   │   ├── dashboard/   # KPI dashboard
│   │   ├── tasks/       # Task management (Kanban/list/calendar)
│   │   ├── tablero/     # Monday.com-style dynamic boards
│   │   ├── hours/       # Time entry & approval workflow
│   │   ├── calendar/    # Recurring events & holidays
│   │   ├── crm/         # CRM pipeline (SUPERADMIN only)
│   │   ├── hr/          # HR module (absences, payroll)
│   │   ├── my-absences/ # Personal absence tracking
│   │   └── superadmin/  # Platform-level controls
│   └── api/             # Route handlers (auth, uploads, search, cron)
├── components/          # 80+ shared React components
├── lib/                 # Utilities: auth-helpers, permissions, PDF, Excel, rate-limiting
├── hooks/               # React custom hooks
├── types/               # TypeScript types
└── providers/           # React context providers
```

### Auth

NextAuth v5 (beta) with JWT strategy and Credentials provider (bcrypt). Session contains `id`, `role`, `companyId`, `preferences`, `image`.

Middleware at `src/middleware.ts` enforces role-based route access:
- `/superadmin` — SUPERADMIN only
- `/admin` — ADMIN+
- `/crm` — SUPERADMIN only (temporary restriction)
- `/dashboard`, `/settings`, `/notifications` — all roles including GUEST

Helper functions in `src/lib/auth-helpers.ts` and `src/lib/permissions.ts` for server-side checks inside Server Actions.

### Database

30+ Prisma models. Key relationships:
- `Company` → everything (multi-tenant root)
- `User` → `TimeEntry`, `Task`, `Absence`, `PayrollRecord`, `Expense`
- `Project` → `Task`, `TimeEntry`, `Invoice`, `Quote`, `Document`
- `Lead` → `CrmActivity`, `CrmPipelineStage`
- `Board` → `BoardGroup` → `BoardItem` → `BoardSubitem`

Two connection strings required:
- `DATABASE_URL` — pooled (runtime queries)
- `POSTGRES_URL_NON_POOLING` — direct (migrations)

### Key Libraries

| Purpose | Library |
|---------|---------|
| Forms + validation | React Hook Form + Zod |
| PDF generation | jsPDF + jsPDF-autotable |
| Excel | ExcelJS |
| Charts | Chart.js / Recharts |
| File storage | Vercel Blob |
| Drag & drop | @dnd-kit/core, @dnd-kit/sortable |
| Toasts | Sonner |
| AI features | OpenAI SDK |
