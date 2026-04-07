# OpenCTEM UI

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Frontend dashboard for the OpenCTEM Continuous Threat Exposure Management platform. Implements the complete Gartner 5-stage CTEM framework: Scoping, Discovery, Prioritization, Validation, and Mobilization.

## Features

### CTEM 5-Stage Process

- **Scoping** - Attack surface definition, asset groups, scope targets/exclusions
- **Discovery** - 24 asset type pages, automated discovery via agents, SCM sync
- **Prioritization** - Risk scoring (0-100), AI-powered triage, finding severity classification
- **Validation** - Pentest campaigns, attack simulation, control testing
- **Mobilization** - Remediation workflows, compliance tracking, SLA enforcement

### Asset Management (24 asset type pages)

- External: Domains, Certificates, IP Addresses
- Applications: Websites, APIs, Mobile Apps, Services
- Cloud: Cloud Accounts, Compute, Storage, Serverless
- Infrastructure: Hosts, Containers, Databases, Networks, Kubernetes, VPCs
- Identity: IAM Users, IAM Roles, Service Accounts
- Code: Repositories
- Recon: HTTP Services, Open Ports, Discovered URLs

### Key Capabilities

- **Server-side pagination** with URL state persistence
- **Real-time findings** per asset (integrated with findings API)
- **Asset relationships** with graph visualization
- **Asset groups** with environment/criticality classification
- **Config builder system** for rapid asset type page creation
- **Multi-tenant** with team switching
- **i18n** support (English, Vietnamese, Arabic with RTL)
- **RBAC** with 126 granular permissions

## Tech Stack

| Category  | Technology                                                     |
| --------- | -------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack, React Compiler)             |
| UI        | React 19, TypeScript 5 (strict), shadcn/ui, Tailwind CSS 4     |
| State     | Zustand (auth), React Context (theme, direction, layout)       |
| Data      | SWR (client fetching), Server Components (SSR)                 |
| Forms     | React Hook Form + Zod validation                               |
| Auth      | Local JWT, OAuth2 (Google, GitHub, Microsoft), OIDC (Keycloak) |
| Testing   | Vitest, React Testing Library, Playwright                      |

## Project Structure

```
ui/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, register, forgot password
│   └── (dashboard)/              # Protected dashboard (172 pages)
│       ├── (discovery)/          # Assets (24 types), scans, components
│       ├── (scoping)/            # Asset groups, scope config, attack surface
│       ├── (mobilization)/       # Remediation, workflows
│       ├── findings/             # Vulnerability findings
│       ├── settings/             # Tenant, users, roles, integrations
│       └── ...
├── features/                     # Business modules (40+)
│   ├── assets/                   # Asset management
│   │   ├── components/           # AssetPage, AssetDetailSheet, etc.
│   │   ├── hooks/                # useAssets, useAssetCRUD, useAssetOwners
│   │   ├── types/                # 34 asset types, page config
│   │   └── lib/                  # Config builder, category templates
│   ├── findings/                 # Findings & vulnerabilities
│   ├── scans/                    # Scan management
│   ├── access-control/           # Roles, permissions, groups
│   ├── pentest/                  # Pentest campaigns
│   ├── compliance/               # Compliance frameworks
│   ├── integrations/             # ITSM, SCM, notifications
│   └── ...                       # 30+ more modules
├── components/                   # Shared components
│   ├── ui/                       # shadcn/ui (50+ components)
│   └── layout/                   # Sidebar, header, footer
├── context/                      # Theme, direction, layout providers
├── stores/                       # Zustand (auth store)
├── lib/                          # API client, utilities, permissions
└── hooks/                        # Global hooks
```

## Quick Start

### Prerequisites

- Node.js 22+
- npm

### Development

```bash
# Install dependencies
npm install

# Copy environment
cp .env.example .env.local

# Start dev server (Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Backend API (required)
BACKEND_API_URL=http://localhost:8080

# Auth provider
NEXT_PUBLIC_AUTH_PROVIDER=local    # local | oidc | hybrid
NEXT_PUBLIC_APP_NAME=OpenCTEM

# Feature flags
NEXT_PUBLIC_ENABLE_AI_TRIAGE=false
NEXT_PUBLIC_ENABLE_LICENSING=false
```

### Production

```bash
# Build
npm run build

# Start
npm start

# Or with Docker
docker compose -f docker-compose.prod.yml up -d
```

## Commands

```bash
npm run dev          # Dev server (Turbopack, port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm run type-check   # TypeScript check
npm run validate     # type-check + lint
npm test             # Vitest
npm run test:coverage # Coverage report
```

## Architecture Highlights

### Asset Page Config Builder

New asset type pages require only ~30 lines using the config builder:

```tsx
// lib/category-templates.tsx
export const newTypeConfig = buildAssetPageConfig({
  type: 'new_type',
  label: 'New Type',
  labelPlural: 'New Types',
  description: '...',
  icon: SomeIcon,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',
  columns: [metadataTextColumn('field', 'Header')],
  formFields: [commonFormFields.provider([...])],
})

// pages/new-type/page.tsx (8 lines)
export default function Page() {
  return <AssetPage config={newTypeConfig} />
}
```

### Performance Optimizations

- SWR with stable string keys (prevents cache bloat)
- Server-side pagination + search (debounced 300ms)
- URL state persistence (filters survive page refresh)
- Lazy data loading (dialogs fetch only when open)
- Blob URL cleanup (prevents memory leaks)
- Permission-gated rendering (skip unauthorized data fetches)

### Security

- Permission-gated UI (AssetsRead/Write/Delete)
- CSV export with formula injection prevention
- CSRF double-submit cookie pattern
- Secure cookies (HttpOnly, Secure, SameSite)
- Input validation via Zod schemas
- OAuth redirect URI validation

## License

MIT License - See [LICENSE](LICENSE) file for details.
