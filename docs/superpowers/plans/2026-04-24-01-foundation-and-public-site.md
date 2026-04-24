# Plan 1: Foundation + Sitio Público · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar un sitio público completo de Abriendo Caminos deployado en Vercel con landing, detalle de talleres, consultas, sobre María. Strict TDD para lógica de dominio. Mobile-first, a11y AA.

**Architecture:** Next.js 16 App Router con Server Components por default. Tailwind v4 con design tokens semánticos. Supabase Postgres (solo lectura en esta fase) con Drizzle ORM. Screaming Architecture (`features/`).

**Tech Stack:** Next.js 16.2.4 · React 19.2 · TypeScript strict · Tailwind v4 · Drizzle ORM · Supabase · Vitest · Playwright · class-variance-authority · next/font

**Covers:** Fase 0 (Foundation) + Fase 1 (Sitio público) del spec. Al terminar este plan el sitio está vivo, el negocio todavía NO puede cobrar (eso viene en Plan 2).

---

## File Structure

```
/
├─ next.config.ts             # CREATE (update) — Tailwind v4, cacheComponents, reactCompiler
├─ tsconfig.json              # MODIFY — strict mode + paths
├─ eslint.config.mjs          # MODIFY — a11y + next rules
├─ drizzle.config.ts          # CREATE — Drizzle Kit config
├─ vitest.config.ts           # CREATE — Vitest setup
├─ playwright.config.ts       # CREATE — Playwright e2e
├─ package.json               # MODIFY — scripts + deps
├─ .env.example               # CREATE — template de vars
├─ .env.local                 # CREATE (gitignored) — vars de dev
├─ .github/workflows/ci.yml   # CREATE — GitHub Actions
│
├─ app/
│  ├─ layout.tsx              # MODIFY — fonts, root layout, metadata
│  ├─ globals.css             # MODIFY — @theme tokens Tailwind v4
│  ├─ not-found.tsx           # CREATE — 404
│  ├─ error.tsx               # CREATE — error boundary global
│  ├─ sitemap.ts              # CREATE — sitemap dinámico
│  ├─ robots.ts               # CREATE — robots.txt
│  ├─ opengraph-image.tsx     # CREATE — OG image default
│  ├─ (public)/
│  │  ├─ layout.tsx           # CREATE — wrapper con Navbar + Footer + WhatsappButton
│  │  ├─ page.tsx             # CREATE — landing
│  │  ├─ talleres/[slug]/page.tsx        # CREATE
│  │  ├─ talleres/[slug]/opengraph-image.tsx  # CREATE
│  │  ├─ consultas/page.tsx   # CREATE (CTA a WhatsApp por ahora)
│  │  ├─ sobre-maria/page.tsx # CREATE
│  │  └─ inscripcion/[taller-slug]/page.tsx   # CREATE (stub de form, sin MP aún)
│
├─ features/
│  ├─ talleres/
│  │  ├─ schema.ts            # CREATE — Drizzle schema talleres + ediciones
│  │  ├─ queries.ts           # CREATE — getTallerBySlug, getEdicionesAbiertas
│  │  ├─ domain.ts            # CREATE — puros: formatPrecio, edicionEstaAbierta, tieneCupo
│  │  └─ __tests__/
│  │     └─ domain.test.ts    # CREATE
│
├─ lib/
│  ├─ db/
│  │  ├─ client.ts            # CREATE — Drizzle client
│  │  └─ schema.ts            # CREATE — re-export consolidado
│  └─ utils/
│     ├─ cn.ts                # CREATE — clsx + tailwind-merge
│     └─ __tests__/cn.test.ts # CREATE
│
├─ components/
│  ├─ ui/
│  │  ├─ Button.tsx           # CREATE — cva variants
│  │  ├─ Input.tsx            # CREATE
│  │  ├─ Card.tsx             # CREATE
│  │  ├─ Badge.tsx            # CREATE
│  │  ├─ Dialog.tsx           # CREATE — Radix primitives
│  │  └─ __tests__/Button.test.tsx  # CREATE
│  ├─ layout/
│  │  ├─ Navbar.tsx           # CREATE
│  │  ├─ Footer.tsx           # CREATE
│  │  ├─ SiteContainer.tsx    # CREATE — max-width container
│  │  └─ WhatsappButton.tsx   # CREATE (client, context-aware)
│  └─ sections/
│     ├─ Hero.tsx             # CREATE
│     ├─ TallerSection.tsx    # CREATE
│     ├─ ConsultasSection.tsx # CREATE
│     ├─ TrustSection.tsx     # CREATE (about Maria preview)
│     ├─ TestimoniosSection.tsx  # CREATE
│     └─ CtaSection.tsx       # CREATE
│
├─ drizzle/
│  ├─ meta/                   # auto-generated
│  ├─ 0000_initial.sql        # CREATE — inicial: talleres + ediciones
│  └─ seed.ts                 # CREATE — seed Taller de Coloquio
│
├─ tests/
│  ├─ e2e/
│  │  ├─ home.spec.ts         # CREATE — smoke test
│  │  └─ taller-detail.spec.ts # CREATE
│  └─ setup.ts                # CREATE — global test setup
│
└─ .husky/pre-commit          # CREATE — lint + typecheck
```

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install drizzle-orm pg postgres class-variance-authority clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-slot zod
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D drizzle-kit @types/pg vitest @vitest/coverage-v8 @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom playwright @playwright/test testcontainers @testcontainers/postgresql husky lint-staged eslint-plugin-jsx-a11y
```

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install --with-deps chromium
```

- [ ] **Step 4: Verify package.json has all deps**

Expected `package.json` dependencies include: `drizzle-orm`, `pg`, `class-variance-authority`, `@radix-ui/react-dialog`, `zod`. DevDependencies include: `drizzle-kit`, `vitest`, `@playwright/test`, `testcontainers`, `husky`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install runtime and test dependencies"
```

---

## Task 2: Configure TypeScript strict mode

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Update `tsconfig.json` with strict settings and path aliases**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@/features/*": ["./features/*"],
      "@/lib/*": ["./lib/*"],
      "@/components/*": ["./components/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Run typecheck to verify**

```bash
npx tsc --noEmit
```

Expected: no errors (base project has no code yet).

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable TypeScript strict mode with path aliases"
```

---

## Task 3: Configure Next.js 16 features

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Run typegen and build to verify**

```bash
npx next typegen
```

Expected: completes without errors, generates types in `.next/types/`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: enable Next 16 cacheComponents and reactCompiler"
```

---

## Task 4: Configure ESLint flat config with a11y rules

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Update ESLint flat config**

```javascript
import { FlatCompat } from '@eslint/eslintrc';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'jsx-a11y/anchor-is-valid': 'off',
    },
  },
];

export default config;
```

- [ ] **Step 2: Run lint to verify**

```bash
npx eslint .
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: add a11y eslint rules"
```

---

## Task 5: Setup Tailwind v4 with design tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Write `globals.css` with design tokens**

```css
@import "tailwindcss";

@theme {
  /* Brand colors — Abriendo Caminos */
  --color-primary: #0d6e5f;
  --color-primary-hover: #095547;
  --color-accent: #f07b4a;
  --color-accent-hover: #d86a3e;
  --color-surface: #fef9f0;
  --color-mint: #b8e6d1;
  --color-ink: #0d1f1a;
  --color-ink-soft: #2d3f3a;
  --color-muted: #6b7570;

  /* Semantic */
  --color-background: var(--color-surface);
  --color-foreground: var(--color-ink);
  --color-border: #e5dfd3;
  --color-destructive: #c53030;

  /* Typography */
  --font-display: var(--font-cabinet), system-ui, sans-serif;
  --font-body: var(--font-instrument), system-ui, sans-serif;

  /* Spacing base 4 */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
}

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.6;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add Tailwind v4 design tokens for Abriendo Caminos"
```

---

## Task 6: Configure next/font with Cabinet Grotesk + Instrument Sans

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update root layout to load fonts from Fontshare (Cabinet) + Google Fonts (Instrument Sans)**

```tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Instrument_Sans } from 'next/font/google';
import './globals.css';

const cabinet = localFont({
  src: [
    { path: '../public/fonts/CabinetGrotesk-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/CabinetGrotesk-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-cabinet',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Abriendo Caminos', template: '%s · Abriendo Caminos' },
  description: 'Preparación integral para el coloquio de ascenso y acompañamiento a docentes.',
  openGraph: { type: 'website', locale: 'es_AR' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${cabinet.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Download Cabinet Grotesk fonts from Fontshare**

```bash
mkdir -p public/fonts
# Download woff2 files manually from https://www.fontshare.com/fonts/cabinet-grotesk
# Place: CabinetGrotesk-Medium.woff2 and CabinetGrotesk-Bold.woff2 in public/fonts/
```

NOTE for executor: Fontshare requires a manual download since they don't provide a direct CDN URL with content-type headers. Download weights 500 and 700 as woff2. This is a one-time manual step.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx public/fonts/
git commit -m "feat: load Cabinet Grotesk and Instrument Sans"
```

---

## Task 7: Setup Supabase Postgres connection

**Files:**
- Create: `.env.example`
- Create: `.env.local` (gitignored)
- Create: `lib/db/client.ts`

- [ ] **Step 1: Create `.env.example`**

```bash
# Database (Supabase Postgres)
DATABASE_URL=postgres://postgres:[password]@[project-ref].supabase.co:6543/postgres

# Public
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=541126132412
```

- [ ] **Step 2: Create `.env.local` with actual Supabase URL (dev-only)**

User provides actual `DATABASE_URL` from Supabase dashboard → Project Settings → Database → Connection String (Transaction pooler, port 6543).

- [ ] **Step 3: Create `lib/db/client.ts`**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const queryClient = postgres(connectionString, { prepare: false });
export const db = drizzle(queryClient);
```

- [ ] **Step 4: Verify connection**

```bash
npx tsx -e "import('./lib/db/client').then(({ db }) => db.execute('SELECT 1 as ok')).then(r => console.log(r))"
```

Expected: `[{ ok: 1 }]`.

- [ ] **Step 5: Commit**

```bash
git add .env.example lib/db/client.ts
git commit -m "feat: wire Supabase Postgres client with Drizzle"
```

---

## Task 8: Drizzle schema for talleres + ediciones

**Files:**
- Create: `features/talleres/schema.ts`
- Create: `lib/db/schema.ts`

- [ ] **Step 1: Create `features/talleres/schema.ts`**

```typescript
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum, time } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const edicionStatus = pgEnum('edicion_status', ['draft', 'open', 'closed', 'done']);

export const talleres = pgTable('talleres', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull(),
  description: text('description').notNull(),
  programa: jsonb('programa').notNull(),
  priceArs: integer('price_ars').notNull(),
  capacityMin: integer('capacity_min').notNull(),
  capacityMax: integer('capacity_max').notNull(),
  durationMin: integer('duration_min').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  heroImageUrl: text('hero_image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ediciones = pgTable('ediciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  groupName: text('group_name').notNull(),
  dates: jsonb('dates').notNull(),
  timeStart: time('time_start').notNull(),
  timeEnd: time('time_end').notNull(),
  meetLink: text('meet_link'),
  capacityOverride: integer('capacity_override'),
  inscripcionesOpenAt: timestamp('inscripciones_open_at').notNull(),
  inscripcionesCloseAt: timestamp('inscripciones_close_at').notNull(),
  status: edicionStatus('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const talleresRelations = relations(talleres, ({ many }) => ({
  ediciones: many(ediciones),
}));

export const edicionesRelations = relations(ediciones, ({ one }) => ({
  taller: one(talleres, { fields: [ediciones.tallerId], references: [talleres.id] }),
}));

export type Taller = typeof talleres.$inferSelect;
export type Edicion = typeof ediciones.$inferSelect;
export type NewTaller = typeof talleres.$inferInsert;
export type NewEdicion = typeof ediciones.$inferInsert;
```

- [ ] **Step 2: Create `lib/db/schema.ts` consolidando schemas**

```typescript
export * from '@/features/talleres/schema';
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

- [ ] **Step 4: Generate initial migration**

```bash
npx drizzle-kit generate --name initial
```

Expected: creates `drizzle/0000_*.sql` with CREATE TABLE statements.

- [ ] **Step 5: Apply migration**

```bash
npx drizzle-kit migrate
```

Expected: tables created in Supabase. Verify in Supabase Dashboard → Table Editor.

- [ ] **Step 6: Commit**

```bash
git add features/talleres/schema.ts lib/db/schema.ts drizzle.config.ts drizzle/
git commit -m "feat: add talleres and ediciones schema"
```

---

## Task 9: Domain logic for talleres (TDD)

**Files:**
- Create: `features/talleres/domain.ts`
- Create: `features/talleres/__tests__/domain.test.ts`

- [ ] **Step 1: Write failing tests for `formatPrecio`**

```typescript
// features/talleres/__tests__/domain.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrecio, edicionEstaAbierta, tieneCupo } from '../domain';

describe('formatPrecio', () => {
  it('formats ARS with thousand separators', () => {
    expect(formatPrecio(30000)).toBe('$30.000');
  });
  it('handles zero as free', () => {
    expect(formatPrecio(0)).toBe('Gratis');
  });
  it('handles large amounts', () => {
    expect(formatPrecio(1500000)).toBe('$1.500.000');
  });
});

describe('edicionEstaAbierta', () => {
  const now = new Date('2026-04-24T12:00:00Z');

  it('returns true when status open and within window', () => {
    expect(edicionEstaAbierta({
      status: 'open',
      inscripcionesOpenAt: new Date('2026-04-20T00:00:00Z'),
      inscripcionesCloseAt: new Date('2026-04-30T00:00:00Z'),
    }, now)).toBe(true);
  });

  it('returns false when status draft', () => {
    expect(edicionEstaAbierta({
      status: 'draft',
      inscripcionesOpenAt: new Date('2026-04-20T00:00:00Z'),
      inscripcionesCloseAt: new Date('2026-04-30T00:00:00Z'),
    }, now)).toBe(false);
  });

  it('returns false when before open window', () => {
    expect(edicionEstaAbierta({
      status: 'open',
      inscripcionesOpenAt: new Date('2026-05-01T00:00:00Z'),
      inscripcionesCloseAt: new Date('2026-05-10T00:00:00Z'),
    }, now)).toBe(false);
  });

  it('returns false when after close window', () => {
    expect(edicionEstaAbierta({
      status: 'open',
      inscripcionesOpenAt: new Date('2026-04-01T00:00:00Z'),
      inscripcionesCloseAt: new Date('2026-04-20T00:00:00Z'),
    }, now)).toBe(false);
  });
});

describe('tieneCupo', () => {
  it('returns true when inscritos less than capacity', () => {
    expect(tieneCupo({ capacityMax: 12, capacityOverride: null }, 5)).toBe(true);
  });
  it('returns false when inscritos equal to capacity', () => {
    expect(tieneCupo({ capacityMax: 12, capacityOverride: null }, 12)).toBe(false);
  });
  it('uses capacityOverride when set', () => {
    expect(tieneCupo({ capacityMax: 12, capacityOverride: 20 }, 15)).toBe(true);
    expect(tieneCupo({ capacityMax: 12, capacityOverride: 8 }, 8)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

```bash
npx vitest run features/talleres/__tests__/domain.test.ts
```

Expected: FAIL with "Cannot find module '../domain'".

- [ ] **Step 3: Implement `features/talleres/domain.ts`**

```typescript
export type EdicionStatus = 'draft' | 'open' | 'closed' | 'done';

export interface EdicionAbiertaInput {
  status: EdicionStatus;
  inscripcionesOpenAt: Date;
  inscripcionesCloseAt: Date;
}

export interface CupoInput {
  capacityMax: number;
  capacityOverride: number | null;
}

export function formatPrecio(ars: number): string {
  if (ars === 0) return 'Gratis';
  return '$' + ars.toLocaleString('es-AR');
}

export function edicionEstaAbierta(edicion: EdicionAbiertaInput, now: Date = new Date()): boolean {
  if (edicion.status !== 'open') return false;
  return now >= edicion.inscripcionesOpenAt && now <= edicion.inscripcionesCloseAt;
}

export function tieneCupo(edicion: CupoInput, inscritos: number): boolean {
  const cap = edicion.capacityOverride ?? edicion.capacityMax;
  return inscritos < cap;
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx vitest run features/talleres/__tests__/domain.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add features/talleres/domain.ts features/talleres/__tests__/
git commit -m "feat: add taller domain helpers with tests"
```

---

## Task 10: Queries for talleres + ediciones

**Files:**
- Create: `features/talleres/queries.ts`

- [ ] **Step 1: Implement queries with cache directives**

```typescript
// features/talleres/queries.ts
import { db } from '@/lib/db/client';
import { talleres, ediciones } from './schema';
import { eq, and } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';

export async function getTallerBySlug(slug: string) {
  'use cache';
  cacheLife('max');
  cacheTag('talleres', `taller:${slug}`);

  const rows = await db.select().from(talleres).where(eq(talleres.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getAllTalleres() {
  'use cache';
  cacheLife('max');
  cacheTag('talleres');

  return db.select().from(talleres).where(eq(talleres.isActive, true));
}

export async function getEdicionesAbiertas(tallerId: string) {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300 });
  cacheTag('ediciones', `taller:${tallerId}`);

  return db
    .select()
    .from(ediciones)
    .where(and(eq(ediciones.tallerId, tallerId), eq(ediciones.status, 'open')));
}
```

- [ ] **Step 2: Commit**

```bash
git add features/talleres/queries.ts
git commit -m "feat: add taller queries with cache tags"
```

---

## Task 11: Seed script for Taller de Coloquio

**Files:**
- Create: `drizzle/seed.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Create `drizzle/seed.ts`**

```typescript
import 'dotenv/config';
import { db } from '../lib/db/client';
import { talleres, ediciones } from '../lib/db/schema';

async function seed() {
  console.log('Seeding talleres...');

  const [tallerColoquio] = await db.insert(talleres).values({
    slug: 'coloquio',
    name: 'Taller de Coloquio',
    tagline: 'Gestioná tus miedos, estudiá desde la posibilidad, caminá hacia el éxito.',
    description: 'Preparación integral para el coloquio de ascenso, con el acompañamiento de María de los Ángeles Galmarini.',
    programa: [
      {
        encuentro: 1,
        titulo: 'Coloquio — ideas principales',
        bullets: [
          'Qué es un coloquio',
          'Momentos de su desarrollo',
          'Características del coloquio',
          'Claves para la resolución exitosa',
        ],
      },
      {
        encuentro: 2,
        titulo: 'Problemáticas: lectura consciente y facilitadores',
        bullets: [
          'Qué es una problemática en coloquio',
          'Desglose e interpretación',
          'Temas comunes',
          'Práctica',
        ],
      },
      {
        encuentro: 3,
        titulo: 'Desarrolla confianza',
        bullets: [
          'Relajación y concentración',
          'Tema de base',
          'Comunicación verbal y no verbal',
          'Manejo de la interacción',
          'Práctica',
        ],
      },
    ],
    priceArs: 30000,
    capacityMin: 3,
    capacityMax: 12,
    durationMin: 90,
    isActive: true,
    heroImageUrl: null,
  }).returning();

  console.log('Seeding ediciones...');

  await db.insert(ediciones).values([
    {
      tallerId: tallerColoquio.id,
      label: 'Mayo 2026',
      groupName: 'Grupo mañana',
      dates: ['2026-05-02', '2026-05-09', '2026-05-16'],
      timeStart: '08:30:00',
      timeEnd: '10:00:00',
      meetLink: null,
      capacityOverride: null,
      inscripcionesOpenAt: new Date('2026-04-20T00:00:00-03:00'),
      inscripcionesCloseAt: new Date('2026-04-30T23:59:00-03:00'),
      status: 'open',
    },
    {
      tallerId: tallerColoquio.id,
      label: 'Mayo 2026',
      groupName: 'Grupo tarde',
      dates: ['2026-05-02', '2026-05-09', '2026-05-16'],
      timeStart: '10:30:00',
      timeEnd: '12:00:00',
      meetLink: null,
      capacityOverride: null,
      inscripcionesOpenAt: new Date('2026-04-20T00:00:00-03:00'),
      inscripcionesCloseAt: new Date('2026-04-30T23:59:00-03:00'),
      status: 'open',
    },
  ]);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add script to `package.json`**

```json
{
  "scripts": {
    "db:seed": "tsx drizzle/seed.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 3: Run seed**

```bash
npm run db:seed
```

Expected: prints "Seed complete." Verify in Supabase dashboard that 1 taller + 2 ediciones exist.

- [ ] **Step 4: Commit**

```bash
git add drizzle/seed.ts package.json
git commit -m "feat: seed Taller de Coloquio"
```

---

## Task 12: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 2: Create `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add scripts**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: existing domain tests pass.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json
git commit -m "chore: configure Vitest with jsdom"
```

---

## Task 13: `cn` utility with tests

**Files:**
- Create: `lib/utils/cn.ts`
- Create: `lib/utils/__tests__/cn.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/utils/__tests__/cn.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('handles conditional', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
  it('dedupes tailwind classes with later winning', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
```

- [ ] **Step 2: Run, verify fails**

```bash
npx vitest run lib/utils/__tests__/cn.test.ts
```

- [ ] **Step 3: Implement `lib/utils/cn.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Run, verify passes**

- [ ] **Step 5: Commit**

```bash
git add lib/utils/cn.ts lib/utils/__tests__/
git commit -m "feat: add cn utility for class merging"
```

---

## Task 14: Button UI primitive with cva

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/__tests__/Button.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// components/ui/__tests__/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });
  it('applies accent variant when specified', () => {
    render(<Button variant="accent">Accent</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-accent');
  });
  it('applies disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('has 44x44 min touch target', () => {
    render(<Button>T</Button>);
    expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement Button**

```tsx
// components/ui/Button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-surface hover:bg-primary-hover',
        accent: 'bg-accent text-ink hover:bg-accent-hover',
        ghost: 'bg-transparent text-ink hover:bg-ink/5',
        outline: 'border-2 border-ink text-ink hover:bg-ink hover:text-surface',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = 'Button';
```

- [ ] **Step 4: Run, verify passes**

- [ ] **Step 5: Commit**

```bash
git add components/ui/Button.tsx components/ui/__tests__/
git commit -m "feat: add Button primitive with cva variants"
```

---

## Task 15: Input, Card, Badge primitives

**Files:**
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`

- [ ] **Step 1: Write `Input.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full min-h-[44px] px-4 py-2 rounded-md border border-border bg-surface text-ink placeholder:text-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
```

- [ ] **Step 2: Write `Card.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl bg-surface border border-border p-6 shadow-sm', className)} {...props} />
  )
);
Card.displayName = 'Card';
```

- [ ] **Step 3: Write `Badge.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-mint text-primary',
      accent: 'bg-accent/15 text-accent-hover',
      muted: 'bg-ink/10 text-ink-soft',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/Input.tsx components/ui/Card.tsx components/ui/Badge.tsx
git commit -m "feat: add Input Card and Badge primitives"
```

---

## Task 16: WhatsappButton client component

**Files:**
- Create: `components/layout/WhatsappButton.tsx`

- [ ] **Step 1: Write test for buildWhatsappUrl (pure helper)**

```typescript
// components/layout/__tests__/whatsapp.test.ts
import { describe, it, expect } from 'vitest';
import { buildWhatsappUrl } from '../whatsappUrl';

describe('buildWhatsappUrl', () => {
  it('builds url with encoded message', () => {
    expect(buildWhatsappUrl('541126132412', 'Hola María')).toBe(
      'https://wa.me/541126132412?text=Hola%20Mar%C3%ADa'
    );
  });
  it('strips leading + from number', () => {
    expect(buildWhatsappUrl('+541126132412', 'hi')).toBe('https://wa.me/541126132412?text=hi');
  });
});
```

- [ ] **Step 2: Run, verify fails. Then implement `components/layout/whatsappUrl.ts`**

```typescript
export function buildWhatsappUrl(phone: string, message: string): string {
  const clean = phone.replace(/^\+/, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 3: Run, verify passes**

- [ ] **Step 4: Create `components/layout/WhatsappButton.tsx`**

```tsx
'use client';

import { buildWhatsappUrl } from './whatsappUrl';

interface WhatsappButtonProps {
  phone: string;
  message: string;
}

export function WhatsappButton({ phone, message }: WhatsappButtonProps) {
  const href = buildWhatsappUrl(phone, message);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
      </svg>
    </a>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/WhatsappButton.tsx components/layout/whatsappUrl.ts components/layout/__tests__/
git commit -m "feat: add floating WhatsApp button with context-aware messages"
```

---

## Task 17: Navbar and Footer

**Files:**
- Create: `components/layout/Navbar.tsx`
- Create: `components/layout/Footer.tsx`
- Create: `components/layout/SiteContainer.tsx`

- [ ] **Step 1: Create `SiteContainer.tsx`**

```tsx
import { cn } from '@/lib/utils/cn';

export function SiteContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
```

- [ ] **Step 2: Create `Navbar.tsx`**

```tsx
import Link from 'next/link';
import { SiteContainer } from './SiteContainer';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <SiteContainer className="flex items-center justify-between py-4">
        <Link href="/" className="font-display text-xl font-bold text-ink">Abriendo Caminos</Link>
        <nav aria-label="Principal" className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/talleres/coloquio" className="text-ink-soft hover:text-ink">Taller</Link>
          <Link href="/consultas" className="text-ink-soft hover:text-ink">Consultas</Link>
          <Link href="/sobre-maria" className="text-ink-soft hover:text-ink">Sobre María</Link>
        </nav>
        <Button size="sm" asChild>
          <Link href="/talleres/coloquio">Inscribirme</Link>
        </Button>
      </SiteContainer>
    </header>
  );
}
```

- [ ] **Step 3: Create `Footer.tsx`**

```tsx
import Link from 'next/link';
import { SiteContainer } from './SiteContainer';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-ink text-surface">
      <SiteContainer className="py-12 grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">Abriendo Caminos</p>
          <p className="mt-2 text-sm opacity-80">
            María de los Ángeles Galmarini — Coach Ontológico y Educativo. 19 años de experiencia en dirección de nivel inicial.
          </p>
        </div>
        <div>
          <p className="font-display text-sm uppercase tracking-wider opacity-70">Navegación</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/" className="hover:underline">Home</Link></li>
            <li><Link href="/talleres/coloquio" className="hover:underline">Taller de Coloquio</Link></li>
            <li><Link href="/consultas" className="hover:underline">Consultas 1:1</Link></li>
            <li><Link href="/sobre-maria" className="hover:underline">Sobre María</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-display text-sm uppercase tracking-wider opacity-70">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>WhatsApp: +54 9 11 2613 2412 (L-J de 10 a 15h)</li>
          </ul>
          <p className="mt-6 text-xs opacity-60">G.E.P · Gestión Educativa Práctica</p>
        </div>
      </SiteContainer>
      <div className="border-t border-surface/10">
        <SiteContainer className="py-4 text-xs opacity-60">
          © {new Date().getFullYear()} Abriendo Caminos. Todos los derechos reservados.
        </SiteContainer>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/
git commit -m "feat: add Navbar Footer and SiteContainer"
```

---

## Task 18: Public route group layout with Navbar + Footer + WhatsappButton

**Files:**
- Create: `app/(public)/layout.tsx`

- [ ] **Step 1: Create layout**

```tsx
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsappButton } from '@/components/layout/WhatsappButton';

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '541126132412';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
      <WhatsappButton phone={whatsappNumber} message="Hola María, llegué desde tu sitio y me interesa saber más." />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/layout.tsx
git commit -m "feat: add public route group layout"
```

---

## Task 19: Hero section

**Files:**
- Create: `components/sections/Hero.tsx`

- [ ] **Step 1: Create Hero**

```tsx
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function Hero() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <SiteContainer>
        <div className="max-w-3xl">
          <Badge variant="default">Próximo taller · Mayo 2026</Badge>
          <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-display font-bold text-ink leading-[1.05]">
            Gestioná tus miedos. <span className="text-primary">Caminá hacia el éxito.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-soft max-w-2xl">
            Preparación integral para el coloquio de ascenso a cargos directivos, con el acompañamiento de María de los Ángeles Galmarini — 19 años de experiencia en dirección de nivel inicial.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/talleres/coloquio">Inscribirme al taller</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/consultas">Reservar consulta 1:1</Link>
            </Button>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/sections/Hero.tsx
git commit -m "feat: add Hero section"
```

---

## Task 20: TallerSection listing current open editions

**Files:**
- Create: `components/sections/TallerSection.tsx`

- [ ] **Step 1: Create component (Server Component — fetches data)**

```tsx
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getTallerBySlug, getEdicionesAbiertas } from '@/features/talleres/queries';
import { formatPrecio } from '@/features/talleres/domain';

export async function TallerSection() {
  const taller = await getTallerBySlug('coloquio');
  if (!taller) return null;
  const ediciones = await getEdicionesAbiertas(taller.id);

  return (
    <section className="py-16 bg-mint/20" id="taller-coloquio">
      <SiteContainer>
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ink">{taller.name}</h2>
          <p className="mt-3 text-lg text-ink-soft">{taller.tagline}</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="text-xl font-display font-semibold">Programa</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              {(taller.programa as { encuentro: number; titulo: string }[]).map((e) => (
                <li key={e.encuentro}><strong className="text-ink">Encuentro {e.encuentro}</strong> — {e.titulo}</li>
              ))}
            </ul>
            <Button className="mt-6" asChild>
              <Link href={`/talleres/${taller.slug}`}>Ver detalle completo</Link>
            </Button>
          </Card>

          <Card>
            <h3 className="text-xl font-display font-semibold">Ediciones abiertas</h3>
            {ediciones.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">No hay ediciones abiertas por el momento.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {ediciones.map((ed) => (
                  <li key={ed.id} className="p-3 rounded-lg border border-border">
                    <p className="font-medium">{ed.label} · {ed.groupName}</p>
                    <p className="text-sm text-ink-soft">
                      {ed.timeStart.slice(0, 5)} a {ed.timeEnd.slice(0, 5)} hs
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-lg font-bold">{formatPrecio(taller.priceArs)}</p>
          </Card>
        </div>
      </SiteContainer>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/sections/TallerSection.tsx
git commit -m "feat: add TallerSection with dynamic editions"
```

---

## Task 21: ConsultasSection, TrustSection, CtaSection, TestimoniosSection

**Files:**
- Create: `components/sections/ConsultasSection.tsx`
- Create: `components/sections/TrustSection.tsx`
- Create: `components/sections/CtaSection.tsx`
- Create: `components/sections/TestimoniosSection.tsx`

- [ ] **Step 1: ConsultasSection**

```tsx
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ConsultasSection() {
  return (
    <section className="py-16" id="consultas">
      <SiteContainer>
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ink">Consultas 1:1</h2>
          <p className="mt-3 text-lg text-ink-soft">Sesiones individuales para acompañarte en tu proceso personal o profesional.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="text-xl font-display font-semibold">Coach Ontológico</h3>
            <p className="mt-3 text-sm text-ink-soft">Reconciliación con tu ser, manejo de miedos y claridad en tus objetivos.</p>
          </Card>
          <Card>
            <h3 className="text-xl font-display font-semibold">Coach Educativo</h3>
            <p className="mt-3 text-sm text-ink-soft">Acompañamiento en tu práctica docente y desarrollo de liderazgo pedagógico.</p>
          </Card>
        </div>
        <div className="mt-8">
          <Button variant="accent" asChild>
            <Link href="/consultas">Reservar una sesión</Link>
          </Button>
        </div>
      </SiteContainer>
    </section>
  );
}
```

- [ ] **Step 2: TrustSection**

```tsx
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export function TrustSection() {
  return (
    <section className="py-16 bg-surface border-y border-border" id="sobre-maria">
      <SiteContainer>
        <div className="grid gap-10 md:grid-cols-[2fr_3fr] items-start">
          <div className="aspect-square bg-mint/40 rounded-2xl" aria-hidden />
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Sobre María</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold">María de los Ángeles Galmarini</h2>
            <p className="mt-4 text-lg text-ink-soft">
              Profesora de Nivel Inicial con 19 años como directora. Coach Ontológico y Coach Educativo certificada. Acompaño el camino de docentes que quieren crecer.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <Link href="/sobre-maria">Conocé más sobre mi trayectoria</Link>
            </Button>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
```

- [ ] **Step 3: TestimoniosSection (stub — reemplazable cuando haya testimonios reales)**

```tsx
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';

const testimonios = [
  { nombre: 'A.M.', texto: 'El taller me dio claridad y confianza. Pasé el coloquio con más seguridad de la que esperaba.' },
  { nombre: 'C.R.', texto: 'La forma en que María desarma el miedo es única. Gracias infinitas.' },
];

export function TestimoniosSection() {
  return (
    <section className="py-16" id="testimonios">
      <SiteContainer>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-ink">Lo que dicen quienes pasaron por el taller</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {testimonios.map((t) => (
            <Card key={t.nombre}>
              <p className="text-ink-soft italic">"{t.texto}"</p>
              <p className="mt-4 text-sm font-medium">— {t.nombre}</p>
            </Card>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
```

- [ ] **Step 4: CtaSection**

```tsx
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export function CtaSection() {
  return (
    <section className="py-16 bg-primary text-surface">
      <SiteContainer className="text-center max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-display font-bold">¿Listas para el próximo paso?</h2>
        <p className="mt-4 text-lg opacity-90">Sumate al Taller de Coloquio o reservá una consulta 1:1. Yo te acompaño.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="accent" size="lg" asChild>
            <Link href="/talleres/coloquio">Inscribirme al taller</Link>
          </Button>
          <Button variant="outline" size="lg" className="border-surface text-surface hover:bg-surface hover:text-primary" asChild>
            <Link href="/consultas">Reservar consulta</Link>
          </Button>
        </div>
      </SiteContainer>
    </section>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/sections/
git commit -m "feat: add Consultas Trust Testimonios and CTA sections"
```

---

## Task 22: Home page (landing)

**Files:**
- Create: `app/(public)/page.tsx`

- [ ] **Step 1: Implement home page**

```tsx
import { Hero } from '@/components/sections/Hero';
import { TallerSection } from '@/components/sections/TallerSection';
import { ConsultasSection } from '@/components/sections/ConsultasSection';
import { TrustSection } from '@/components/sections/TrustSection';
import { TestimoniosSection } from '@/components/sections/TestimoniosSection';
import { CtaSection } from '@/components/sections/CtaSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <TallerSection />
      <ConsultasSection />
      <TrustSection />
      <TestimoniosSection />
      <CtaSection />
    </>
  );
}
```

- [ ] **Step 2: Run dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:3000` and check: hero renders, taller section shows Coloquio + 2 ediciones from seed, all buttons link correctly, WhatsApp button floats, Navbar + Footer present.

- [ ] **Step 3: Commit**

```bash
git add app/(public)/page.tsx
git commit -m "feat: assemble landing page"
```

---

## Task 23: Taller detail page `/talleres/[slug]`

**Files:**
- Create: `app/(public)/talleres/[slug]/page.tsx`

- [ ] **Step 1: Implement page with async params (Next 16)**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getTallerBySlug, getEdicionesAbiertas } from '@/features/talleres/queries';
import { formatPrecio } from '@/features/talleres/domain';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const taller = await getTallerBySlug(slug);
  if (!taller) return { title: 'Taller no encontrado' };
  return {
    title: taller.name,
    description: taller.tagline,
    openGraph: { title: taller.name, description: taller.tagline, type: 'article' },
  };
}

export default async function TallerPage({ params }: Props) {
  const { slug } = await params;
  const taller = await getTallerBySlug(slug);
  if (!taller) notFound();
  const ediciones = await getEdicionesAbiertas(taller.id);

  return (
    <article className="py-12 md:py-16">
      <SiteContainer>
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">← Volver</Link>

        <div className="mt-6 max-w-3xl">
          <Badge variant="default">Taller</Badge>
          <h1 className="mt-3 text-4xl md:text-5xl font-display font-bold">{taller.name}</h1>
          <p className="mt-4 text-xl text-ink-soft">{taller.tagline}</p>
          <p className="mt-4 text-base text-ink-soft">{taller.description}</p>
        </div>

        <section className="mt-12 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-2xl font-display font-bold">Programa</h2>
            <div className="mt-6 space-y-5">
              {(taller.programa as { encuentro: number; titulo: string; bullets: string[] }[]).map((e) => (
                <Card key={e.encuentro}>
                  <p className="text-sm text-primary font-medium">Encuentro {e.encuentro}</p>
                  <h3 className="mt-1 text-lg font-semibold">{e.titulo}</h3>
                  <ul className="mt-3 list-disc list-inside text-sm text-ink-soft space-y-1">
                    {e.bullets.map((b, i) => (<li key={i}>{b}</li>))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <p className="text-sm text-ink-soft">Inversión</p>
              <p className="text-3xl font-display font-bold">{formatPrecio(taller.priceArs)}</p>
              <p className="mt-2 text-sm text-ink-soft">Duración: {taller.durationMin} min por encuentro · Modalidad: virtual (Meet)</p>
            </Card>

            <Card>
              <p className="font-semibold">Ediciones abiertas</p>
              {ediciones.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">No hay ediciones abiertas por el momento.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {ediciones.map((ed) => (
                    <li key={ed.id} className="border-t border-border pt-3">
                      <p className="font-medium">{ed.label} · {ed.groupName}</p>
                      <p className="text-sm text-ink-soft">{ed.timeStart.slice(0, 5)} a {ed.timeEnd.slice(0, 5)} hs</p>
                      <Button size="sm" className="mt-3 w-full" asChild>
                        <Link href={`/inscripcion/${taller.slug}?edicion=${ed.id}`}>Inscribirme</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </section>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 2: Verify manually**

Navigate to `http://localhost:3000/talleres/coloquio` → should render.
Navigate to `http://localhost:3000/talleres/nonexistent` → 404.

- [ ] **Step 3: Commit**

```bash
git add app/(public)/talleres/
git commit -m "feat: add taller detail page with dynamic metadata"
```

---

## Task 24: Consultas page with WhatsApp CTA (Cal.com embed en Plan 3)

**Files:**
- Create: `app/(public)/consultas/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buildWhatsappUrl } from '@/components/layout/whatsappUrl';

export const metadata: Metadata = {
  title: 'Consultas 1:1',
  description: 'Sesiones individuales de Coach Ontológico y Coach Educativo con María de los Ángeles Galmarini.',
};

const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '541126132412';

export default function ConsultasPage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer>
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Consultas 1:1</h1>
          <p className="mt-4 text-xl text-ink-soft">Un espacio de acompañamiento individual, a tu ritmo y en tu contexto.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-display font-semibold">Coach Ontológico</h2>
            <p className="mt-3 text-sm text-ink-soft">Sesiones para trabajar tu relación con los miedos, la posibilidad y el propósito. 60 minutos.</p>
            <Button className="mt-5" asChild>
              <a href={buildWhatsappUrl(whatsapp, 'Hola María, quiero consultar por una sesión de Coach Ontológico.')} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
            </Button>
          </Card>
          <Card>
            <h2 className="text-xl font-display font-semibold">Coach Educativo</h2>
            <p className="mt-3 text-sm text-ink-soft">Acompañamiento pedagógico para docentes en ejercicio o aspirantes a cargos directivos. 60 minutos.</p>
            <Button className="mt-5" asChild>
              <a href={buildWhatsappUrl(whatsapp, 'Hola María, quiero consultar por una sesión de Coach Educativo.')} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
            </Button>
          </Card>
        </div>

        <p className="mt-8 text-sm text-ink-soft">
          Próximamente podrás reservar tu sesión y pagar directamente desde esta página.
        </p>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/consultas/
git commit -m "feat: add consultas page with WhatsApp CTAs"
```

---

## Task 25: Sobre María page

**Files:**
- Create: `app/(public)/sobre-maria/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Metadata } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';

export const metadata: Metadata = {
  title: 'Sobre María',
  description: 'María de los Ángeles Galmarini — 19 años de experiencia en dirección de nivel inicial y coach certificada.',
};

export default function SobreMariaPage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer>
        <div className="grid gap-10 md:grid-cols-[2fr_3fr]">
          <div className="aspect-square bg-mint/40 rounded-2xl md:sticky md:top-24 self-start" aria-label="Foto de María" />
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Sobre María</p>
            <h1 className="mt-2 text-4xl md:text-5xl font-display font-bold">María de los Ángeles Galmarini</h1>
            <p className="mt-6 text-lg text-ink-soft">
              Profesora de Nivel Inicial con <strong>19 años como directora</strong> en jardines de infantes y muchos otros como maestra.
            </p>
            <p className="mt-4 text-lg text-ink-soft">
              Certificada como <strong>Coach Ontológico</strong> y <strong>Coach Educativo</strong>, combino la trayectoria de gestión con herramientas del coaching para acompañar a quienes están en el camino de crecimiento profesional en educación.
            </p>

            <h2 className="mt-10 text-2xl font-display font-bold">Mi camino</h2>
            <p className="mt-4 text-ink-soft">
              Después de dos décadas al frente de instituciones educativas, descubrí que lo que más valor agrega no son las técnicas — son las personas. Entender qué las moviliza, qué las frena, y acompañarlas a gestionarlo.
            </p>

            <h2 className="mt-10 text-2xl font-display font-bold">Mi propuesta</h2>
            <p className="mt-4 text-ink-soft">
              "Acompaño tu camino." No entreno para aprobar coloquios — entreno para que te encuentres con tu mejor versión docente y directiva.
            </p>
          </div>
        </div>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/sobre-maria/
git commit -m "feat: add Sobre María page"
```

---

## Task 26: Inscripción page stub (Plan 2 completes with MP)

**Files:**
- Create: `app/(public)/inscripcion/[taller-slug]/page.tsx`

- [ ] **Step 1: Create placeholder page that explains inscription will be enabled**

```tsx
import { notFound } from 'next/navigation';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getTallerBySlug } from '@/features/talleres/queries';
import { buildWhatsappUrl } from '@/components/layout/whatsappUrl';

interface Props {
  params: Promise<{ 'taller-slug': string }>;
  searchParams: Promise<{ edicion?: string }>;
}

const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '541126132412';

export default async function InscripcionPage({ params }: Props) {
  const { 'taller-slug': slug } = await params;
  const taller = await getTallerBySlug(slug);
  if (!taller) notFound();

  return (
    <article className="py-12 md:py-16">
      <SiteContainer className="max-w-2xl">
        <Card>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Inscripción al {taller.name}</h1>
          <p className="mt-4 text-ink-soft">
            Estamos terminando de integrar el pago en línea con Mercado Pago. Mientras tanto, escribinos por WhatsApp y coordinamos tu inscripción.
          </p>
          <Button className="mt-6" asChild>
            <a
              href={buildWhatsappUrl(whatsapp, `Hola María, quiero inscribirme al ${taller.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >Inscribirme por WhatsApp</a>
          </Button>
        </Card>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/inscripcion/
git commit -m "feat: add inscription stub page routing to WhatsApp until Plan 2"
```

---

## Task 27: 404 + error boundary + sitemap + robots

**Files:**
- Create: `app/not-found.tsx`
- Create: `app/error.tsx`
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

- [ ] **Step 1: `app/not-found.tsx`**

```tsx
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <SiteContainer className="py-24 max-w-xl text-center">
      <p className="text-6xl font-display font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-display font-bold">Página no encontrada</h1>
      <p className="mt-2 text-ink-soft">El contenido que buscás no existe o fue movido.</p>
      <Button className="mt-6" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </SiteContainer>
  );
}
```

- [ ] **Step 2: `app/error.tsx`**

```tsx
'use client';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SiteContainer className="py-24 max-w-xl text-center">
      <p className="text-6xl font-display font-bold text-accent">Uy</p>
      <h1 className="mt-4 text-2xl font-display font-bold">Algo salió mal</h1>
      <p className="mt-2 text-ink-soft">Probá recargar la página o volvé al inicio.</p>
      {error.digest && <p className="mt-4 text-xs text-muted">ID: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Reintentar</Button>
    </SiteContainer>
  );
}
```

- [ ] **Step 3: `app/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next';
import { getAllTalleres } from '@/features/talleres/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const talleres = await getAllTalleres();

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/consultas`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/sobre-maria`, changeFrequency: 'monthly', priority: 0.7 },
    ...talleres.map((t) => ({
      url: `${base}/talleres/${t.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];
}
```

- [ ] **Step 4: `app/robots.ts`**

```typescript
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add app/not-found.tsx app/error.tsx app/sitemap.ts app/robots.ts
git commit -m "feat: add 404 error boundary sitemap and robots"
```

---

## Task 28: E2E smoke test for home

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/home.spec.ts`

- [ ] **Step 1: `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 2: Add scripts**

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  }
}
```

- [ ] **Step 3: `tests/e2e/home.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('home renders hero and taller section', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Gestioná tus miedos');
  await expect(page.getByText('Taller de Coloquio')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abriendo Caminos' })).toBeVisible();
});

test('whatsapp button is present and has correct link', async ({ page }) => {
  await page.goto('/');
  const wa = page.getByRole('link', { name: 'Contactar por WhatsApp' });
  await expect(wa).toBeVisible();
  await expect(wa).toHaveAttribute('href', /wa\.me\/541126132412/);
});

test('navigating to taller detail works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Ver detalle completo' }).click();
  await expect(page).toHaveURL(/\/talleres\/coloquio/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Taller de Coloquio');
});
```

- [ ] **Step 4: Run e2e**

```bash
npm run e2e
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/ package.json
git commit -m "test: add Playwright e2e smoke tests"
```

---

## Task 29: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint .
      - run: npm test
```

- [ ] **Step 2: Commit and push to trigger CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add typecheck lint and test workflow"
git push origin main
```

Expected: CI runs and passes on GitHub.

---

## Task 30: Husky + lint-staged

**Files:**
- Create: `.husky/pre-commit`
- Modify: `package.json`

- [ ] **Step 1: Initialize Husky**

```bash
npx husky init
```

- [ ] **Step 2: Write `.husky/pre-commit`**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

- [ ] **Step 3: Add lint-staged config to `package.json`**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .husky/ package.json
git commit -m "chore: add husky pre-commit with lint-staged"
```

---

## Task 31: Deploy to Vercel preview

- [ ] **Step 1: Install Vercel CLI and login**

```bash
npm install -g vercel
vercel login
```

- [ ] **Step 2: Link project**

```bash
vercel link
```

- [ ] **Step 3: Set environment variables on Vercel (Dashboard or CLI)**

```bash
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production
vercel env add NEXT_PUBLIC_WHATSAPP_NUMBER production
```

- [ ] **Step 4: Deploy preview**

```bash
vercel
```

Expected: deployment succeeds, preview URL returned.

- [ ] **Step 5: Smoke test preview URL**

Open preview URL → verify home, taller detail, consultas, sobre-maria all render.

- [ ] **Step 6: Commit any config changes**

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment config" || true
```

---

## Plan 1 Complete ✅

**Deliverable**: sitio público deployado. María puede compartir el link de preview. Todo el negocio se sigue operando por WhatsApp hasta que Plan 2 (pagos + admin) esté listo.

**Next**: Plan 2 — Inscripciones + Pagos + Admin.
