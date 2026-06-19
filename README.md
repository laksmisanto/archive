# NAMS — News Archive Metadata Management System

> Internal archive metadata system for a news channel. Stores and manages references to physical video footage stored on drives.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS, Lucide Icons
- **Backend:** Next.js API Routes (REST)
- **Database:** MongoDB + Mongoose ODM
- **Auth:** JWT in HTTP-only cookies (8h expiry)
- **Theme:** Dark / Light mode (CSS variables, localStorage persisted)

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)

### 2. Install
```bash
npm install
```

### 3. Configure environment
Edit `.env.local` — already pre-filled for local dev:
```
MONGODB_URI=mongodb://localhost:27017/nams
JWT_SECRET=your-super-secret-256-bit-key-change-this-in-production
JWT_EXPIRY=8h
NODE_ENV=development
```

### 4. Seed the database
```bash
node scripts/seed.js
```
Creates:
- **admin** / admin123  (Admin role — full access)
- **operator** / operator123  (User role — own data only)
- Sample reporters: Shanto, Rahim, Karim, Nadia, Sara, Tanvir
- Sample drives: AVECO BACKUP - 01, AVECO BACKUP - 12, etc.

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000

---

## Features
| Feature | Description |
|---------|-------------|
| Real-time duplicate detection | Instant Video ID check as you type (debounced) |
| Draft auto-save | Form state saved to localStorage — survives browser crashes |
| Batch system | Daily batches: OPEN → COMMITTED → ARCHIVED |
| Import | CSV / JSON with per-row validation and summary report |
| Export | CSV / JSON for any batch or full archive |
| Search | Full-text search across Video ID, Metadata, Reporter, Drive |
| Soft delete | Records never permanently deleted — recoverable by admin |
| 6PM warning | Dashboard alert if no records uploaded by 6 PM |
| Dark/Light mode | System preference auto-detected, manually toggleable |
| RBAC | Admin and User roles with strict data isolation (ownerId) |

## Folder Structure
```
app/
  (auth)/login/          Login page
  (dashboard)/           User dashboard + records + batches + import/export
  (admin)/admin/         Admin-only pages
  api/v1/                All API routes
lib/
  auth/                  JWT helpers
  db/models/             Mongoose models
  middleware/            Auth middleware
  utils/                 Response helpers
components/
  ui/                    Button, Input, Modal, Badge, Alert, Spinner, ThemeToggle
  layout/                Sidebar, Topbar
scripts/
  seed.js                Database seeder
```

## Production Deployment (Ubuntu VPS)

```bash
# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Nginx: proxy pass to localhost:3000
# See architecture document for full Nginx config
```

## Import File Format

### CSV
```csv
videoid,reporter,drive,metadata
wc_opening_nws_110626_379,Shanto,AVECO BACKUP - 12,Full news description here
```

### JSON
```json
[
  {
    "videoid": "wc_opening_nws_110626_379",
    "reporter": "Shanto",
    "drive": "AVECO BACKUP - 12",
    "metadata": "Full news description here"
  }
]
```

## Security Notes
- JWT stored in HTTP-only cookie (not localStorage)
- All data scoped to `ownerId` — users cannot see each other's data
- Passwords hashed with bcrypt (12 rounds)
- Soft deletes only — no permanent data loss
