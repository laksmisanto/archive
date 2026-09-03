# NAMS — News Archive Metadata Management System

> Internal archive metadata system for a news channel. Stores and manages references to physical video footage stored on drives.

## Current Project Status

The application is running locally with Next.js 16 and MongoDB. The main archive workflow is available, and the Edit Card Records workflow currently supports:

- Excel, CSV, JSON, and TXT imports with headered or headerless rows
- Date, ID, Drive, Metadata, Reporter, Asset Type, Category, and Quality fields
- Existing Drive and Reporter master-data selection and validation
- Standard asset types `GVW`, `EDC`, `DOC`, and `GFX`, plus custom three-character codes
- Categories `SPORT`, `BUSINESS`, `WEATHER`, `SCIENCE`, `POLITICAL`, `CRIME`, and `OTHER`
- Quality values `SD`, `HD`, `FHD`, `2K`, `4K`, and `8K`
- Search and filtering by Edit Card asset type and category
- Edit Card CSV, JSON, XLSX, and XLS export

Archive batches remain separate from Edit Card records. A dedicated Edit Card batch history/download workflow is not yet implemented.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons
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
| Batch system | Daily archive batches: OPEN → COMMITTED → ARCHIVED |
| Import | Archive CSV / JSON and Edit Card CSV / JSON / XLSX / XLS / TXT with per-row validation and summary report |
| Export | CSV / JSON / XLSX / XLS for archive batches, full archive, and Edit Card records |
| Edit Card records | Dedicated records table with date, ID, drive, metadata, reporter, asset type, category, and quality |
| Edit Card master data | Drives and Reporters are loaded from existing configured records |
| Edit Card filters | Search plus Asset Type and Category query filters |
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

## Archive Import File Format

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

## Edit Card Import File Format

The preferred column order is:

```text
Date, ID, Drive, Metadata, Reporter, Asset Type, Quality, Category
```

Header names are matched case-insensitively and common aliases such as `description`, `entryId`, `driveLabel`, and `reporterName` are accepted. Headerless files must use the same column order. ID is required for Edit Card imports and is stored exactly as supplied; rows whose ID already exists are skipped while the remaining rows continue importing. Older files without Category are accepted and use `OTHER`. Drive and Reporter values must already exist in the configured master-data lists.

Example CSV:

```csv
Date,ID,Drive,Metadata,Reporter,Asset Type,Quality,Category
2026-09-03,bnp__edc_040926_001,AVECO BACKUP - 12,Evening sports bulletin,Shanto,EDC,HD,SPORT
```

IDs are generated automatically from the metadata, asset type, date, and daily sequence. The generator uses the first free sequence from `000` through `999`, so deleted or unused slots are reusable. Uploads are blocked only when all 1,000 slots for that asset type and date are in use.

## Security Notes
- JWT stored in HTTP-only cookie (not localStorage)
- All data scoped to `ownerId` — users cannot see each other's data
- Passwords hashed with bcrypt (12 rounds)
- Soft deletes only — no permanent data loss
