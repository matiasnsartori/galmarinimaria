# Plan 3: Consultas 1:1 — Cal.com Integration · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Cal.com para que los alumnos reserven y paguen consultas 1:1 (Coach Ontológico / Coach Educativo) con Mercado Pago integrado en Cal.com. Espejamos las reservas en nuestra DB (tabla `consultas`) para que María las vea en su panel admin.

**Architecture:** Cal.com maneja TODO el flujo público (calendario, reserva, pago, emails de confirmación). Nosotros embebemos su widget en `/consultas` y recibimos webhook con los eventos `BOOKING_*` para espejar los datos en nuestra DB (read-only mirror).

**Tech Stack:** `@calcom/embed-react` + Cal.com webhook + Drizzle ORM.

**Prerequisites:** Plan 1 y 2 completos. Maria configuró su cuenta Cal.com con 2 event types + integración MP.

**Covers:** Fase 3 del spec.

---

## Pre-task checklist (María hace esto antes de arrancar)

- [ ] María crea cuenta Cal.com free tier en cal.com
- [ ] María configura 2 event types:
  - `Coach Ontológico · 60min` (precio: $15.000 ARS, o el que decida)
  - `Coach Educativo · 60min` (precio: $15.000 ARS)
- [ ] María va a Cal.com → Apps → busca "Mercado Pago" → instala y conecta su cuenta MP
- [ ] María va a Cal.com → Apps → Google Calendar → conecta su Google Calendar (para que genere Meet links automáticos)
- [ ] María anota su username Cal.com (ej: `mariangeles-galmarini`)

---

## File Structure

```
features/consultas/
├─ schema.ts                 # CREATE — tabla consultas
├─ webhook.ts                # CREATE — handler de eventos Cal.com
├─ queries.ts                # CREATE — listConsultas
├─ sync.ts                   # CREATE — re-sync manual vía API Cal.com
└─ __tests__/
   └─ webhook.test.ts

lib/integrations/calcom/
├─ verifyWebhookSignature.ts # CREATE — HMAC
├─ client.ts                 # CREATE — fetch wrapper para Cal.com REST API
└─ __tests__/

app/
├─ (public)/consultas/page.tsx    # MODIFY — embed real de Cal.com
├─ api/calcom/webhook/route.ts    # CREATE
└─ (admin)/admin/consultas/
   └─ page.tsx                    # CREATE

drizzle/
└─ 0002_consultas.sql             # generated
```

---

## Task 1: Schema `consultas`

**Files:**
- Create: `features/consultas/schema.ts`
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Create schema**

```typescript
// features/consultas/schema.ts
import { pgTable, uuid, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const consultaTipo = pgEnum('consulta_tipo', ['ontologico', 'educativo']);
export const consultaStatus = pgEnum('consulta_status', ['booked', 'done', 'cancelled']);

export const consultas = pgTable('consultas', {
  id: uuid('id').primaryKey().defaultRandom(),
  calcomBookingId: text('calcom_booking_id').notNull().unique(),
  tipo: consultaTipo('tipo').notNull(),
  nombre: text('nombre').notNull(),
  email: text('email').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMin: integer('duration_min').notNull(),
  status: consultaStatus('status').notNull().default('booked'),
  meetLink: text('meet_link'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Consulta = typeof consultas.$inferSelect;
```

- [ ] **Step 2: Add to `lib/db/schema.ts`**

```typescript
export * from '@/features/consultas/schema';
```

- [ ] **Step 3: Generate + apply migration**

```bash
npm run db:generate -- --name consultas
npm run db:migrate
```

- [ ] **Step 4: Commit**

```bash
git add features/consultas/schema.ts lib/db/schema.ts drizzle/
git commit -m "feat: add consultas schema"
```

---

## Task 2: Cal.com webhook signature verification (TDD)

**Files:**
- Create: `lib/integrations/calcom/verifyWebhookSignature.ts`
- Create: `lib/integrations/calcom/__tests__/verifyWebhookSignature.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { verifyCalcomSignature } from '../verifyWebhookSignature';
import crypto from 'node:crypto';

const secret = 'test-secret';

describe('verifyCalcomSignature', () => {
  it('returns true for valid signature', () => {
    const body = JSON.stringify({ triggerEvent: 'BOOKING_CREATED' });
    const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyCalcomSignature({ body, signature: hash, secret })).toBe(true);
  });
  it('returns false when hash mismatches', () => {
    expect(verifyCalcomSignature({ body: 'x', signature: 'bad', secret })).toBe(false);
  });
  it('returns false without signature', () => {
    expect(verifyCalcomSignature({ body: 'x', signature: null, secret })).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fails. Implement:**

```typescript
import crypto from 'node:crypto';

export function verifyCalcomSignature(input: { body: string; signature: string | null; secret: string }): boolean {
  if (!input.signature) return false;
  const expected = crypto.createHmac('sha256', input.secret).update(input.body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(input.signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Run, verify passes**

- [ ] **Step 4: Commit**

```bash
git add lib/integrations/calcom/verifyWebhookSignature.ts lib/integrations/calcom/__tests__/
git commit -m "feat: add Cal.com webhook HMAC verification"
```

---

## Task 3: Cal.com webhook handler

**Files:**
- Create: `features/consultas/webhook.ts`
- Create: `features/consultas/__tests__/webhook.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// features/consultas/__tests__/webhook.test.ts
import { describe, it, expect } from 'vitest';
import { parseCalcomBooking, mapEventTypeToTipo } from '../webhook';

describe('mapEventTypeToTipo', () => {
  it('maps slug variants for ontologico', () => {
    expect(mapEventTypeToTipo('coach-ontologico-60min')).toBe('ontologico');
    expect(mapEventTypeToTipo('ontological-coach-session')).toBe('ontologico');
  });
  it('maps slug variants for educativo', () => {
    expect(mapEventTypeToTipo('coach-educativo-60min')).toBe('educativo');
    expect(mapEventTypeToTipo('educational-coach')).toBe('educativo');
  });
  it('defaults to ontologico on unknown', () => {
    expect(mapEventTypeToTipo('unknown')).toBe('ontologico');
  });
});

describe('parseCalcomBooking', () => {
  it('extracts fields correctly', () => {
    const booking = {
      uid: 'abc-123',
      attendees: [{ name: 'Ana Ruiz', email: 'ana@ex.com' }],
      startTime: '2026-05-10T14:00:00.000Z',
      endTime: '2026-05-10T15:00:00.000Z',
      eventType: { slug: 'coach-ontologico-60min' },
      location: 'integrations:google:meet',
      metadata: { videoCallUrl: 'https://meet.google.com/abc' },
    };
    const parsed = parseCalcomBooking(booking);
    expect(parsed.calcomBookingId).toBe('abc-123');
    expect(parsed.nombre).toBe('Ana Ruiz');
    expect(parsed.email).toBe('ana@ex.com');
    expect(parsed.tipo).toBe('ontologico');
    expect(parsed.durationMin).toBe(60);
    expect(parsed.meetLink).toBe('https://meet.google.com/abc');
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// features/consultas/webhook.ts
import { db } from '@/lib/db/client';
import { consultas } from './schema';
import { eq } from 'drizzle-orm';

export type CalcomTipo = 'ontologico' | 'educativo';

export function mapEventTypeToTipo(slug: string | undefined): CalcomTipo {
  const s = (slug ?? '').toLowerCase();
  if (s.includes('educat')) return 'educativo';
  if (s.includes('ontolog')) return 'ontologico';
  return 'ontologico';
}

export interface ParsedBooking {
  calcomBookingId: string;
  nombre: string;
  email: string;
  tipo: CalcomTipo;
  scheduledAt: Date;
  durationMin: number;
  meetLink: string | null;
}

interface CalcomBookingPayload {
  uid: string;
  attendees: Array<{ name: string; email: string }>;
  startTime: string;
  endTime: string;
  eventType?: { slug?: string };
  metadata?: { videoCallUrl?: string };
}

export function parseCalcomBooking(booking: CalcomBookingPayload): ParsedBooking {
  const attendee = booking.attendees[0];
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
  return {
    calcomBookingId: booking.uid,
    nombre: attendee?.name ?? 'Desconocido',
    email: attendee?.email ?? '',
    tipo: mapEventTypeToTipo(booking.eventType?.slug),
    scheduledAt: start,
    durationMin,
    meetLink: booking.metadata?.videoCallUrl ?? null,
  };
}

export async function upsertConsultaFromBooking(parsed: ParsedBooking): Promise<void> {
  const existing = await db.select().from(consultas).where(eq(consultas.calcomBookingId, parsed.calcomBookingId)).limit(1);
  if (existing.length > 0) {
    await db.update(consultas).set({
      nombre: parsed.nombre,
      email: parsed.email,
      tipo: parsed.tipo,
      scheduledAt: parsed.scheduledAt,
      durationMin: parsed.durationMin,
      meetLink: parsed.meetLink,
    }).where(eq(consultas.calcomBookingId, parsed.calcomBookingId));
  } else {
    await db.insert(consultas).values(parsed);
  }
}

export async function markConsultaCancelled(calcomBookingId: string): Promise<void> {
  await db.update(consultas).set({ status: 'cancelled' }).where(eq(consultas.calcomBookingId, calcomBookingId));
}
```

- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git add features/consultas/webhook.ts features/consultas/__tests__/
git commit -m "feat: add Cal.com booking parser and upsert logic"
```

---

## Task 4: API route `/api/calcom/webhook`

**Files:**
- Create: `app/api/calcom/webhook/route.ts`

- [ ] **Step 1: Implement route**

```typescript
import { NextResponse } from 'next/server';
import { verifyCalcomSignature } from '@/lib/integrations/calcom/verifyWebhookSignature';
import { parseCalcomBooking, upsertConsultaFromBooking, markConsultaCancelled } from '@/features/consultas/webhook';
import { updateTag } from 'next/cache';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-cal-signature-256');
  const secret = process.env.CALCOM_WEBHOOK_SECRET ?? '';

  if (!verifyCalcomSignature({ body: rawBody, signature, secret })) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const { triggerEvent, payload: booking } = payload as { triggerEvent: string; payload: any };

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
      case 'BOOKING_RESCHEDULED':
      case 'BOOKING_PAID': {
        const parsed = parseCalcomBooking(booking);
        await upsertConsultaFromBooking(parsed);
        break;
      }
      case 'BOOKING_CANCELLED': {
        await markConsultaCancelled(booking.uid);
        break;
      }
      default:
        return NextResponse.json({ ignored: triggerEvent });
    }

    updateTag('consultas');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Cal.com webhook error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/calcom/webhook/
git commit -m "feat: add Cal.com webhook API route"
```

---

## Task 5: Replace `/consultas` page with Cal.com embed

**Files:**
- Modify: `app/(public)/consultas/page.tsx`
- Create: `features/consultas/components/CalEmbed.tsx`

- [ ] **Step 1: Install Cal.com embed**

```bash
npm install @calcom/embed-react
```

- [ ] **Step 2: Create Client Component wrapper**

```tsx
// features/consultas/components/CalEmbed.tsx
'use client';
import Cal, { getCalApi } from '@calcom/embed-react';
import { useEffect } from 'react';

interface Props {
  calLink: string;
  theme?: 'light' | 'dark';
}

export function CalEmbed({ calLink, theme = 'light' }: Props) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: calLink });
      cal('ui', {
        theme,
        styles: { branding: { brandColor: '#0d6e5f' } },
        hideEventTypeDetails: false,
        layout: 'month_view',
      });
    })();
  }, [calLink, theme]);

  return (
    <Cal
      namespace={calLink}
      calLink={calLink}
      style={{ width: '100%', height: '100%', overflow: 'scroll' }}
      config={{ layout: 'month_view' }}
    />
  );
}
```

- [ ] **Step 3: Rewrite `/consultas` page**

```tsx
import type { Metadata } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { CalEmbed } from '@/features/consultas/components/CalEmbed';

export const metadata: Metadata = {
  title: 'Consultas 1:1',
  description: 'Sesiones individuales de Coach Ontológico y Coach Educativo. Reservá y pagá en un solo paso.',
};

const calUsername = process.env.NEXT_PUBLIC_CALCOM_USERNAME ?? 'mariangeles-galmarini';

export default function ConsultasPage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer>
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Consultas 1:1</h1>
          <p className="mt-4 text-xl text-ink-soft">Elegí el tipo de sesión, una fecha que te quede bien, y pagá con Mercado Pago. Recibís el link de Meet por email.</p>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-display font-bold">Coach Ontológico</h2>
          <p className="mt-2 text-ink-soft">Sesiones para trabajar miedos, posibilidad y propósito. 60 minutos.</p>
          <div className="mt-4 border border-border rounded-xl overflow-hidden min-h-[600px]">
            <CalEmbed calLink={`${calUsername}/coach-ontologico-60min`} />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-display font-bold">Coach Educativo</h2>
          <p className="mt-2 text-ink-soft">Acompañamiento pedagógico y liderazgo docente. 60 minutos.</p>
          <div className="mt-4 border border-border rounded-xl overflow-hidden min-h-[600px]">
            <CalEmbed calLink={`${calUsername}/coach-educativo-60min`} />
          </div>
        </section>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add features/consultas/components/ app/(public)/consultas/page.tsx package.json package-lock.json
git commit -m "feat: embed Cal.com booking widgets in consultas page"
```

---

## Task 6: Admin consultas list

**Files:**
- Create: `features/consultas/queries.ts`
- Create: `app/(admin)/admin/consultas/page.tsx`

- [ ] **Step 1: Queries**

```typescript
// features/consultas/queries.ts
import { db } from '@/lib/db/client';
import { consultas } from './schema';
import { desc } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';

export async function listConsultas() {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300 });
  cacheTag('consultas');
  return db.select().from(consultas).orderBy(desc(consultas.scheduledAt)).limit(200);
}
```

- [ ] **Step 2: Admin page**

```tsx
// app/(admin)/admin/consultas/page.tsx
import { listConsultas } from '@/features/consultas/queries';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { resyncConsultasAction } from '@/features/consultas/sync';

export default async function AdminConsultasPage() {
  const rows = await listConsultas();
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Consultas 1:1</h1>
        <form action={resyncConsultasAction}>
          <Button type="submit" variant="outline" size="sm">Re-sync desde Cal.com</Button>
        </form>
      </div>
      <div className="mt-6 grid gap-3">
        {rows.length === 0 && <p className="text-ink-soft">No hay consultas todavía.</p>}
        {rows.map((c) => (
          <Card key={c.id}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{c.nombre}</p>
                <p className="text-sm text-ink-soft">{c.email}</p>
                <p className="mt-1 text-sm">{c.scheduledAt.toLocaleString('es-AR')} · {c.durationMin} min</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="accent">{c.tipo === 'ontologico' ? 'Ontológico' : 'Educativo'}</Badge>
                <Badge variant={c.status === 'cancelled' ? 'muted' : 'default'}>{c.status}</Badge>
              </div>
            </div>
            {c.meetLink && (
              <a href={c.meetLink} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-primary hover:underline">
                {c.meetLink}
              </a>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add features/consultas/queries.ts app/(admin)/admin/consultas/
git commit -m "feat: admin consultas list with re-sync button"
```

---

## Task 7: Re-sync endpoint (fallback si webhook se perdió)

**Files:**
- Create: `features/consultas/sync.ts`
- Create: `lib/integrations/calcom/client.ts`

- [ ] **Step 1: Cal.com REST API client**

```typescript
// lib/integrations/calcom/client.ts
const baseUrl = 'https://api.cal.com/v2';
const apiKey = process.env.CALCOM_API_KEY;

export async function calcomFetch(path: string): Promise<unknown> {
  if (!apiKey) throw new Error('CALCOM_API_KEY not set');
  const resp = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'cal-api-version': '2024-08-13' },
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`Cal.com API ${resp.status}`);
  return resp.json();
}
```

- [ ] **Step 2: Add `CALCOM_API_KEY` to `.env.example`**

```env
# Cal.com
CALCOM_WEBHOOK_SECRET=xxx
CALCOM_API_KEY=cal_xxx                 # para re-sync manual
NEXT_PUBLIC_CALCOM_USERNAME=mariangeles-galmarini
```

- [ ] **Step 3: `features/consultas/sync.ts`**

```typescript
'use server';

import { calcomFetch } from '@/lib/integrations/calcom/client';
import { parseCalcomBooking, upsertConsultaFromBooking } from './webhook';
import { auth } from '@/lib/auth';
import { updateTag } from 'next/cache';
import { revalidatePath } from 'next/cache';

export async function resyncConsultasAction() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const data = await calcomFetch('/bookings?take=50') as { data: { bookings: unknown[] } };
  const bookings = data.data?.bookings ?? [];

  for (const b of bookings) {
    try {
      const parsed = parseCalcomBooking(b as any);
      await upsertConsultaFromBooking(parsed);
    } catch (e) {
      console.warn('skip booking', e);
    }
  }

  updateTag('consultas');
  revalidatePath('/admin/consultas');
}
```

- [ ] **Step 4: Commit**

```bash
git add features/consultas/sync.ts lib/integrations/calcom/client.ts .env.example
git commit -m "feat: add Cal.com re-sync admin action"
```

---

## Task 8: Configure Cal.com webhook (María en dashboard Cal.com)

**Manual setup by María (not a code task):**

- [ ] **Step 1: Go to Cal.com → Settings → Developer → Webhooks**

- [ ] **Step 2: Add webhook**
  - URL: `https://abriendocaminos.com.ar/api/calcom/webhook` (production)
  - Secret: generar random, copiar a `CALCOM_WEBHOOK_SECRET` en Vercel env
  - Events: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, BOOKING_PAID

- [ ] **Step 3: Test con el botón "Test webhook" de Cal.com** — verificar que llega al endpoint

---

## Task 9: E2E test for /consultas page

**Files:**
- Create: `tests/e2e/consultas.spec.ts`

- [ ] **Step 1: Write test**

```typescript
import { test, expect } from '@playwright/test';

test('consultas page renders Cal.com embeds', async ({ page }) => {
  await page.goto('/consultas');
  await expect(page.getByRole('heading', { level: 1, name: 'Consultas 1:1' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Coach Ontológico' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Coach Educativo' })).toBeVisible();
  // Cal.com embed loads an iframe — verify at least one is present
  await page.waitForSelector('iframe', { timeout: 15000 });
});
```

- [ ] **Step 2: Run**

```bash
npm run e2e -- consultas
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/consultas.spec.ts
git commit -m "test: e2e consultas page renders Cal.com embeds"
```

---

## Plan 3 Complete ✅

**Deliverable**: consultas 1:1 en vivo. Los alumnos reservan + pagan en Cal.com. María ve las reservas en admin con opción re-sync manual.

**Next**: Plan 4 — Automation + Launch (crons, emails masivos, SEO, a11y, go-live).
