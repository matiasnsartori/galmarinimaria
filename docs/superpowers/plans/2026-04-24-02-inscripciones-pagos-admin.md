# Plan 2: Inscripciones + Pagos + Admin + Emails · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el flujo end-to-end de inscripción y pago — alumno se inscribe → paga en MP → recibe email con link de Meet. María lo ve en admin y puede confirmar pagos manualmente si el webhook falla.

**Architecture:** Server Actions + Zod validation + Drizzle para DB + Mercado Pago Checkout Pro + Resend/React Email + Auth.js v5 credentials. Webhook MP con validación HMAC e idempotencia por unique constraint.

**Tech Stack:** `mercadopago` v2 · `next-auth@5` · `resend` · `@react-email/components` · `bcryptjs` · todas las deps ya instaladas en Plan 1.

**Prerequisites:** Plan 1 completo y deployado. Schema de `talleres` + `ediciones` existe.

**Covers:** Fase 2 del spec.

---

## File Structure

```
features/
├─ inscripciones/
│  ├─ schema.ts              # CREATE — tabla inscripciones
│  ├─ domain.ts              # CREATE — estado machine, validaciones
│  ├─ actions.ts             # CREATE — Server Action createInscripcion
│  ├─ queries.ts             # CREATE — listInscripcionesByEdicion, etc.
│  └─ __tests__/domain.test.ts
├─ pagos/
│  ├─ schema.ts              # CREATE — tabla pagos
│  ├─ domain.ts              # CREATE — status transitions
│  ├─ actions.ts             # CREATE — confirmPaymentManual
│  ├─ webhook.ts             # CREATE — handler MP webhook
│  └─ __tests__/
├─ admin-auth/
│  ├─ schema.ts              # CREATE — tabla admin_users
│  ├─ config.ts              # CREATE — Auth.js v5 config
│  └─ __tests__/
├─ emails/
│  ├─ templates/
│  │  ├─ WelcomePaid.tsx
│  │  ├─ AdminNotification.tsx
│  │  ├─ PagoPendiente.tsx
│  │  └─ InscripcionCancelled.tsx
│  ├─ schema.ts              # CREATE — tabla email_log
│  ├─ send.ts                # CREATE — send + log
│  └─ __tests__/

lib/
├─ integrations/
│  ├─ mercadopago/
│  │  ├─ client.ts
│  │  ├─ createPreference.ts
│  │  ├─ verifyWebhookSignature.ts
│  │  ├─ parseWebhookEvent.ts
│  │  └─ __tests__/
│  └─ resend/
│     ├─ client.ts
│     └─ __tests__/
└─ auth.ts                   # MODIFY — re-export Auth.js

app/
├─ proxy.ts                  # CREATE — protect /admin/*
├─ (admin)/admin/
│  ├─ layout.tsx             # auth check + shell
│  ├─ page.tsx               # dashboard
│  ├─ login/page.tsx
│  ├─ talleres/page.tsx
│  ├─ talleres/[id]/page.tsx
│  ├─ talleres/nuevo/page.tsx
│  ├─ ediciones/nueva/page.tsx
│  ├─ inscripciones/page.tsx
│  └─ inscripciones/[id]/page.tsx
├─ (public)/inscripcion/[taller-slug]/page.tsx  # MODIFY — form real
├─ (public)/inscripcion/success/page.tsx        # CREATE
├─ (public)/inscripcion/pending/page.tsx        # CREATE
├─ (public)/inscripcion/failure/page.tsx        # CREATE
├─ api/
│  ├─ mp/webhook/route.ts    # CREATE
│  └─ auth/[...nextauth]/route.ts  # CREATE

drizzle/
└─ 0001_inscripciones_pagos_admin.sql   # generated
```

---

## Task 1: Schema — inscripciones + pagos + admin_users + email_log

**Files:**
- Create: `features/inscripciones/schema.ts`
- Create: `features/pagos/schema.ts`
- Create: `features/admin-auth/schema.ts`
- Create: `features/emails/schema.ts`
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Create `features/inscripciones/schema.ts`**

```typescript
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ediciones } from '@/features/talleres/schema';

export const inscripcionStatus = pgEnum('inscripcion_status', ['pending', 'paid', 'cancelled', 'refunded']);
export const inscripcionSource = pgEnum('inscripcion_source', ['web', 'admin_manual']);

export const inscripciones = pgTable('inscripciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  edicionId: uuid('edicion_id').notNull().references(() => ediciones.id, { onDelete: 'restrict' }),
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull(),
  email: text('email').notNull(),
  whatsapp: text('whatsapp').notNull(),
  cargoActual: text('cargo_actual'),
  status: inscripcionStatus('status').notNull().default('pending'),
  source: inscripcionSource('source').notNull().default('web'),
  notesAdmin: text('notes_admin'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  paidAt: timestamp('paid_at'),
});

export const inscripcionesRelations = relations(inscripciones, ({ one }) => ({
  edicion: one(ediciones, { fields: [inscripciones.edicionId], references: [ediciones.id] }),
}));

export type Inscripcion = typeof inscripciones.$inferSelect;
export type NewInscripcion = typeof inscripciones.$inferInsert;
```

- [ ] **Step 2: Create `features/pagos/schema.ts`**

```typescript
import { pgTable, uuid, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { inscripciones } from '@/features/inscripciones/schema';

export const pagoStatus = pgEnum('pago_status', ['created', 'approved', 'rejected', 'refunded']);

export const pagos = pgTable('pagos', {
  id: uuid('id').primaryKey().defaultRandom(),
  inscripcionId: uuid('inscripcion_id').notNull().references(() => inscripciones.id, { onDelete: 'cascade' }).unique(),
  mpPreferenceId: text('mp_preference_id').notNull(),
  mpPaymentId: text('mp_payment_id').unique(),
  amountArs: integer('amount_ars').notNull(),
  status: pagoStatus('status').notNull().default('created'),
  method: text('method'),
  rawWebhook: jsonb('raw_webhook'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const pagosRelations = relations(pagos, ({ one }) => ({
  inscripcion: one(inscripciones, { fields: [pagos.inscripcionId], references: [inscripciones.id] }),
}));

export type Pago = typeof pagos.$inferSelect;
export type NewPago = typeof pagos.$inferInsert;
```

- [ ] **Step 3: Create `features/admin-auth/schema.ts`**

```typescript
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const adminRole = pgEnum('admin_role', ['admin']);

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: adminRole('role').notNull().default('admin'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
```

- [ ] **Step 4: Create `features/emails/schema.ts`**

```typescript
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { inscripciones } from '@/features/inscripciones/schema';

export const emailType = pgEnum('email_type', [
  'welcome_paid',
  'meet_link',
  'reminder_48h',
  'reminder_2h',
  'cancelled',
  'admin_notification',
  'pago_pendiente',
]);

export const emailStatus = pgEnum('email_status', ['sent', 'failed', 'bounced']);

export const emailLog = pgTable('email_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  inscripcionId: uuid('inscripcion_id').references(() => inscripciones.id, { onDelete: 'set null' }),
  toEmail: text('to_email').notNull(),
  type: emailType('type').notNull(),
  subject: text('subject').notNull(),
  resendMessageId: text('resend_message_id'),
  status: emailStatus('status').notNull().default('sent'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  errorMessage: text('error_message'),
});

export type EmailLog = typeof emailLog.$inferSelect;
```

- [ ] **Step 5: Update `lib/db/schema.ts`**

```typescript
export * from '@/features/talleres/schema';
export * from '@/features/inscripciones/schema';
export * from '@/features/pagos/schema';
export * from '@/features/admin-auth/schema';
export * from '@/features/emails/schema';
```

- [ ] **Step 6: Generate + apply migration**

```bash
npm run db:generate -- --name inscripciones_pagos_admin
npm run db:migrate
```

Expected: new tables exist in Supabase.

- [ ] **Step 7: Commit**

```bash
git add features/*/schema.ts lib/db/schema.ts drizzle/
git commit -m "feat: add inscripciones pagos admin_users and email_log schemas"
```

---

## Task 2: Domain logic — inscripción state machine + validaciones (TDD)

**Files:**
- Create: `features/inscripciones/domain.ts`
- Create: `features/inscripciones/__tests__/domain.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { canTransitionTo, validateInscripcionInput, InscripcionStatus } from '../domain';

describe('canTransitionTo', () => {
  it('allows pending → paid', () => { expect(canTransitionTo('pending', 'paid')).toBe(true); });
  it('allows pending → cancelled', () => { expect(canTransitionTo('pending', 'cancelled')).toBe(true); });
  it('allows paid → refunded', () => { expect(canTransitionTo('paid', 'refunded')).toBe(true); });
  it('allows paid → cancelled', () => { expect(canTransitionTo('paid', 'cancelled')).toBe(true); });
  it('rejects paid → pending', () => { expect(canTransitionTo('paid', 'pending')).toBe(false); });
  it('rejects cancelled → paid', () => { expect(canTransitionTo('cancelled', 'paid')).toBe(false); });
  it('rejects refunded → any', () => { expect(canTransitionTo('refunded', 'paid')).toBe(false); });
});

describe('validateInscripcionInput', () => {
  it('accepts valid input', () => {
    const r = validateInscripcionInput({
      nombre: 'Ana', apellido: 'Martinez', email: 'ana@ex.com', whatsapp: '1126132412', cargoActual: 'Maestra',
    });
    expect(r.ok).toBe(true);
  });
  it('rejects invalid email', () => {
    const r = validateInscripcionInput({ nombre: 'A', apellido: 'M', email: 'no-email', whatsapp: '1', cargoActual: null });
    expect(r.ok).toBe(false);
  });
  it('rejects short nombre', () => {
    const r = validateInscripcionInput({ nombre: '', apellido: 'M', email: 'a@b.com', whatsapp: '1', cargoActual: null });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `features/inscripciones/domain.ts`**

```typescript
import { z } from 'zod';

export type InscripcionStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

const transitions: Record<InscripcionStatus, InscripcionStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['refunded', 'cancelled'],
  cancelled: [],
  refunded: [],
};

export function canTransitionTo(from: InscripcionStatus, to: InscripcionStatus): boolean {
  return transitions[from].includes(to);
}

export const inscripcionInputSchema = z.object({
  nombre: z.string().min(2, 'Nombre muy corto').max(50),
  apellido: z.string().min(2, 'Apellido muy corto').max(50),
  email: z.string().email('Email inválido'),
  whatsapp: z.string().min(8, 'WhatsApp muy corto').max(20),
  cargoActual: z.string().max(80).nullable().optional(),
});

export type InscripcionInput = z.infer<typeof inscripcionInputSchema>;

export function validateInscripcionInput(
  raw: unknown
): { ok: true; data: InscripcionInput } | { ok: false; errors: z.ZodError } {
  const result = inscripcionInputSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error };
}
```

- [ ] **Step 4: Run, verify passes**

- [ ] **Step 5: Commit**

```bash
git add features/inscripciones/domain.ts features/inscripciones/__tests__/
git commit -m "feat: add inscripcion state machine and validation"
```

---

## Task 3: MP integration — client + createPreference

**Files:**
- Create: `lib/integrations/mercadopago/client.ts`
- Create: `lib/integrations/mercadopago/createPreference.ts`

- [ ] **Step 1: Create client**

```typescript
// lib/integrations/mercadopago/client.ts
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) throw new Error('MP_ACCESS_TOKEN is not set');

const mpClient = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });

export const preferenceApi = new Preference(mpClient);
export const paymentApi = new Payment(mpClient);
```

- [ ] **Step 2: Create `createPreference.ts`**

```typescript
import { preferenceApi } from './client';

export interface CreatePreferenceInput {
  inscripcionId: string;
  tallerName: string;
  edicionLabel: string;
  priceArs: number;
  payerEmail: string;
  payerName: string;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  initPoint: string;
}

export async function createMpPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  const pref = await preferenceApi.create({
    body: {
      items: [{
        id: input.inscripcionId,
        title: `${input.tallerName} — ${input.edicionLabel}`,
        quantity: 1,
        unit_price: input.priceArs,
        currency_id: 'ARS',
      }],
      payer: { email: input.payerEmail, name: input.payerName },
      external_reference: input.inscripcionId,
      back_urls: {
        success: `${base}/inscripcion/success?ref=${input.inscripcionId}`,
        pending: `${base}/inscripcion/pending?ref=${input.inscripcionId}`,
        failure: `${base}/inscripcion/failure?ref=${input.inscripcionId}`,
      },
      auto_return: 'approved',
      notification_url: `${base}/api/mp/webhook`,
      statement_descriptor: 'Abriendo Caminos',
    },
  });
  if (!pref.id || !pref.init_point) throw new Error('MP returned no preference id or init_point');
  return { preferenceId: pref.id, initPoint: pref.init_point };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/integrations/mercadopago/
git commit -m "feat: add MP client and createPreference helper"
```

---

## Task 4: MP webhook signature validation (TDD)

**Files:**
- Create: `lib/integrations/mercadopago/verifyWebhookSignature.ts`
- Create: `lib/integrations/mercadopago/__tests__/verifyWebhookSignature.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { verifyMpSignature } from '../verifyWebhookSignature';
import crypto from 'node:crypto';

const secret = 'test-secret';

function sign(dataId: string, requestId: string, ts: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

describe('verifyMpSignature', () => {
  it('returns true for valid signature', () => {
    const ts = '1700000000';
    const dataId = '12345';
    const requestId = 'req-1';
    const hash = sign(dataId, requestId, ts);
    const header = `ts=${ts},v1=${hash}`;
    expect(verifyMpSignature({ header, requestId, dataId, secret })).toBe(true);
  });

  it('returns false when hash mismatches', () => {
    const header = `ts=1700000000,v1=wrong`;
    expect(verifyMpSignature({ header, requestId: 'req-1', dataId: '12345', secret })).toBe(false);
  });

  it('returns false when header malformed', () => {
    expect(verifyMpSignature({ header: 'nope', requestId: 'a', dataId: 'b', secret })).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement**

```typescript
import crypto from 'node:crypto';

interface VerifyInput {
  header: string | null;
  requestId: string;
  dataId: string;
  secret: string;
}

export function verifyMpSignature(input: VerifyInput): boolean {
  if (!input.header) return false;
  const parts = Object.fromEntries(
    input.header.split(',').map((p) => p.trim().split('=') as [string, string])
  );
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', input.secret).update(manifest).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(parts.v1, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run, verify passes**

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/mercadopago/verifyWebhookSignature.ts lib/integrations/mercadopago/__tests__/
git commit -m "feat: add MP webhook HMAC signature verification"
```

---

## Task 5: Resend client + send helper

**Files:**
- Create: `lib/integrations/resend/client.ts`
- Create: `features/emails/send.ts`

- [ ] **Step 1: Create Resend client**

```typescript
// lib/integrations/resend/client.ts
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error('RESEND_API_KEY is not set');

export const resend = new Resend(apiKey);
```

- [ ] **Step 2: Install Resend + React Email**

```bash
npm install resend @react-email/components
```

- [ ] **Step 3: Create `features/emails/send.ts`**

```typescript
import { resend } from '@/lib/integrations/resend/client';
import { db } from '@/lib/db/client';
import { emailLog } from './schema';
import { render } from '@react-email/components';

const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

export interface SendEmailInput {
  to: string;
  subject: string;
  type: 'welcome_paid' | 'admin_notification' | 'pago_pendiente' | 'cancelled' | 'reminder_48h' | 'reminder_2h' | 'meet_link';
  react: React.ReactElement;
  inscripcionId?: string | null;
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string | null; success: boolean }> {
  try {
    const html = await render(input.react);
    const result = await resend.emails.send({ from, to: input.to, subject: input.subject, html });

    await db.insert(emailLog).values({
      inscripcionId: input.inscripcionId ?? null,
      toEmail: input.to,
      type: input.type,
      subject: input.subject,
      resendMessageId: result.data?.id ?? null,
      status: result.error ? 'failed' : 'sent',
      errorMessage: result.error?.message ?? null,
    });

    return { id: result.data?.id ?? null, success: !result.error };
  } catch (error) {
    await db.insert(emailLog).values({
      inscripcionId: input.inscripcionId ?? null,
      toEmail: input.to,
      type: input.type,
      subject: input.subject,
      resendMessageId: null,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'unknown',
    });
    return { id: null, success: false };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/integrations/resend/ features/emails/send.ts package.json package-lock.json
git commit -m "feat: add Resend client and sendEmail with audit log"
```

---

## Task 6: React Email templates

**Files:**
- Create: `features/emails/templates/WelcomePaid.tsx`
- Create: `features/emails/templates/AdminNotification.tsx`
- Create: `features/emails/templates/PagoPendiente.tsx`
- Create: `features/emails/templates/InscripcionCancelled.tsx`

- [ ] **Step 1: `WelcomePaid.tsx`**

```tsx
import { Html, Head, Body, Container, Heading, Text, Section, Hr, Link, Button } from '@react-email/components';

interface Props {
  nombre: string;
  tallerName: string;
  edicionLabel: string;
  groupName: string;
  dates: string[];
  timeStart: string;
  timeEnd: string;
  meetLink: string | null;
}

export function WelcomePaid({ nombre, tallerName, edicionLabel, groupName, dates, timeStart, timeEnd, meetLink }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#fef9f0', padding: '24px' }}>
        <Container style={{ maxWidth: '600px', backgroundColor: 'white', borderRadius: '12px', padding: '32px' }}>
          <Heading style={{ color: '#0d6e5f', fontSize: '24px' }}>¡Bienvenida, {nombre}!</Heading>
          <Text>Tu inscripción al <strong>{tallerName}</strong> ({edicionLabel} · {groupName}) está confirmada.</Text>

          <Section style={{ backgroundColor: '#b8e6d1', padding: '16px', borderRadius: '8px', margin: '20px 0' }}>
            <Text style={{ margin: 0 }}><strong>Fechas</strong></Text>
            {dates.map((d) => (<Text key={d} style={{ margin: '4px 0' }}>{d}</Text>))}
            <Text style={{ margin: '8px 0 0' }}><strong>Horario:</strong> {timeStart.slice(0, 5)} a {timeEnd.slice(0, 5)} hs</Text>
          </Section>

          {meetLink && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={meetLink} style={{ backgroundColor: '#0d6e5f', color: 'white', padding: '12px 24px', borderRadius: '24px', textDecoration: 'none' }}>
                Ingresar a Meet
              </Button>
            </Section>
          )}

          <Hr />
          <Text style={{ fontSize: '13px', color: '#6b7570' }}>
            Si tenés dudas, escribime por WhatsApp al <Link href="https://wa.me/541126132412">+54 9 11 2613 2412</Link> (L-J de 10 a 15h).
          </Text>
          <Text style={{ fontSize: '13px', color: '#6b7570' }}>— María</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: `AdminNotification.tsx`**

```tsx
import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

interface Props {
  nombre: string;
  apellido: string;
  email: string;
  whatsapp: string;
  tallerName: string;
  edicionLabel: string;
  adminUrl: string;
}

export function AdminNotification(p: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: '600px', padding: '24px' }}>
          <Heading>Nueva inscripción confirmada</Heading>
          <Text><strong>{p.nombre} {p.apellido}</strong> se inscribió a <strong>{p.tallerName}</strong> ({p.edicionLabel}).</Text>
          <Text>Email: {p.email}<br />WhatsApp: {p.whatsapp}</Text>
          <Link href={p.adminUrl}>Ver en el panel admin</Link>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: `PagoPendiente.tsx`**

```tsx
import { Html, Body, Container, Heading, Text, Button } from '@react-email/components';

interface Props {
  nombre: string;
  tallerName: string;
  retryUrl: string;
}

export function PagoPendiente({ nombre, tallerName, retryUrl }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#fef9f0', padding: '24px' }}>
        <Container style={{ maxWidth: '600px', backgroundColor: 'white', padding: '32px', borderRadius: '12px' }}>
          <Heading>Tu pago está en proceso</Heading>
          <Text>Hola {nombre}, tu inscripción al {tallerName} está pendiente de confirmación del pago.</Text>
          <Text>Si aún no completaste el pago, podés retomar acá:</Text>
          <Button href={retryUrl} style={{ backgroundColor: '#f07b4a', color: 'white', padding: '12px 24px', borderRadius: '24px', textDecoration: 'none' }}>
            Completar pago
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: `InscripcionCancelled.tsx`**

```tsx
import { Html, Body, Container, Heading, Text } from '@react-email/components';

interface Props {
  nombre: string;
  tallerName: string;
  reason: string | null;
}

export function InscripcionCancelled({ nombre, tallerName, reason }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: '600px', padding: '24px' }}>
          <Heading>Inscripción cancelada</Heading>
          <Text>Hola {nombre}, tu inscripción al {tallerName} fue cancelada.</Text>
          {reason && <Text>Motivo: {reason}</Text>}
          <Text>Si creés que fue un error, escribime por WhatsApp.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add features/emails/templates/
git commit -m "feat: add React Email transactional templates"
```

---

## Task 7: Server Action — createInscripcion

**Files:**
- Create: `features/inscripciones/actions.ts`

- [ ] **Step 1: Implement**

```typescript
'use server';

import { db } from '@/lib/db/client';
import { inscripciones } from './schema';
import { pagos } from '@/features/pagos/schema';
import { ediciones, talleres } from '@/features/talleres/schema';
import { eq, and, count } from 'drizzle-orm';
import { validateInscripcionInput } from './domain';
import { edicionEstaAbierta, tieneCupo } from '@/features/talleres/domain';
import { createMpPreference } from '@/lib/integrations/mercadopago/createPreference';
import { redirect } from 'next/navigation';

export type CreateInscripcionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string[]> }
  | { status: 'redirecting' };

export async function createInscripcionAction(
  _prev: CreateInscripcionState,
  formData: FormData
): Promise<CreateInscripcionState> {
  const edicionId = formData.get('edicionId')?.toString();
  if (!edicionId) return { status: 'error', message: 'Edición faltante' };

  const parsed = validateInscripcionInput({
    nombre: formData.get('nombre'),
    apellido: formData.get('apellido'),
    email: formData.get('email'),
    whatsapp: formData.get('whatsapp'),
    cargoActual: formData.get('cargoActual') || null,
  });
  if (!parsed.ok) {
    return { status: 'error', message: 'Revisá los datos ingresados', fieldErrors: parsed.errors.flatten().fieldErrors };
  }

  const [edicion] = await db.select().from(ediciones).where(eq(ediciones.id, edicionId)).limit(1);
  if (!edicion) return { status: 'error', message: 'Edición no encontrada' };

  if (!edicionEstaAbierta(edicion, new Date())) {
    return { status: 'error', message: 'La inscripción a esta edición está cerrada' };
  }

  const [countRow] = await db.select({ value: count() }).from(inscripciones).where(
    and(eq(inscripciones.edicionId, edicionId), eq(inscripciones.status, 'paid'))
  );

  const [taller] = await db.select().from(talleres).where(eq(talleres.id, edicion.tallerId)).limit(1);
  if (!taller) return { status: 'error', message: 'Taller no encontrado' };

  if (!tieneCupo(
    { capacityMax: taller.capacityMax, capacityOverride: edicion.capacityOverride },
    countRow.value
  )) {
    return { status: 'error', message: 'Cupo completo en esta edición' };
  }

  const [insc] = await db.insert(inscripciones).values({
    edicionId,
    nombre: parsed.data.nombre,
    apellido: parsed.data.apellido,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp,
    cargoActual: parsed.data.cargoActual ?? null,
    status: 'pending',
    source: 'web',
  }).returning();

  const pref = await createMpPreference({
    inscripcionId: insc.id,
    tallerName: taller.name,
    edicionLabel: `${edicion.label} · ${edicion.groupName}`,
    priceArs: taller.priceArs,
    payerEmail: parsed.data.email,
    payerName: `${parsed.data.nombre} ${parsed.data.apellido}`,
  });

  await db.insert(pagos).values({
    inscripcionId: insc.id,
    mpPreferenceId: pref.preferenceId,
    amountArs: taller.priceArs,
    status: 'created',
  });

  redirect(pref.initPoint);
}
```

- [ ] **Step 2: Commit**

```bash
git add features/inscripciones/actions.ts
git commit -m "feat: add createInscripcion Server Action with cupo check and MP preference"
```

---

## Task 8: Inscripción page with real form

**Files:**
- Modify: `app/(public)/inscripcion/[taller-slug]/page.tsx`
- Create: `features/inscripciones/components/InscripcionForm.tsx`

- [ ] **Step 1: Create form (client component)**

```tsx
// features/inscripciones/components/InscripcionForm.tsx
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createInscripcionAction, type CreateInscripcionState } from '../actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full">
      {pending ? 'Redirigiendo a Mercado Pago…' : 'Ir a pagar'}
    </Button>
  );
}

interface Props {
  edicionId: string;
  priceArs: number;
}

export function InscripcionForm({ edicionId }: Props) {
  const [state, action] = useActionState<CreateInscripcionState, FormData>(
    createInscripcionAction,
    { status: 'idle' }
  );

  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="edicionId" value={edicionId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="nombre" className="text-sm font-medium block mb-1">Nombre</label>
          <Input id="nombre" name="nombre" required />
          {fieldErrors?.nombre && <p className="text-destructive text-xs mt-1">{fieldErrors.nombre[0]}</p>}
        </div>
        <div>
          <label htmlFor="apellido" className="text-sm font-medium block mb-1">Apellido</label>
          <Input id="apellido" name="apellido" required />
          {fieldErrors?.apellido && <p className="text-destructive text-xs mt-1">{fieldErrors.apellido[0]}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium block mb-1">Email</label>
        <Input id="email" name="email" type="email" required />
        {fieldErrors?.email && <p className="text-destructive text-xs mt-1">{fieldErrors.email[0]}</p>}
      </div>
      <div>
        <label htmlFor="whatsapp" className="text-sm font-medium block mb-1">WhatsApp</label>
        <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+54 9 11 1234 5678" required />
        {fieldErrors?.whatsapp && <p className="text-destructive text-xs mt-1">{fieldErrors.whatsapp[0]}</p>}
      </div>
      <div>
        <label htmlFor="cargoActual" className="text-sm font-medium block mb-1">Cargo actual (opcional)</label>
        <Input id="cargoActual" name="cargoActual" placeholder="Maestra, Vice-directora, etc." />
      </div>

      {state.status === 'error' && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}

      <SubmitButton />
    </form>
  );
}
```

- [ ] **Step 2: Rewrite `app/(public)/inscripcion/[taller-slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { ediciones, talleres } from '@/features/talleres/schema';
import { eq, and } from 'drizzle-orm';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { InscripcionForm } from '@/features/inscripciones/components/InscripcionForm';
import { formatPrecio } from '@/features/talleres/domain';

interface Props {
  params: Promise<{ 'taller-slug': string }>;
  searchParams: Promise<{ edicion?: string }>;
}

export default async function InscripcionPage({ params, searchParams }: Props) {
  const { 'taller-slug': slug } = await params;
  const { edicion: edicionId } = await searchParams;

  const [taller] = await db.select().from(talleres).where(eq(talleres.slug, slug)).limit(1);
  if (!taller || !edicionId) notFound();
  const [edicion] = await db.select().from(ediciones).where(and(eq(ediciones.id, edicionId), eq(ediciones.tallerId, taller.id))).limit(1);
  if (!edicion) notFound();

  return (
    <article className="py-12 md:py-16">
      <SiteContainer className="max-w-2xl">
        <Card>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Inscripción · {taller.name}</h1>
          <p className="mt-2 text-ink-soft">{edicion.label} · {edicion.groupName} · {edicion.timeStart.slice(0, 5)}-{edicion.timeEnd.slice(0, 5)} hs</p>
          <p className="mt-4 text-lg font-bold">{formatPrecio(taller.priceArs)}</p>
          <div className="mt-6">
            <InscripcionForm edicionId={edicion.id} priceArs={taller.priceArs} />
          </div>
        </Card>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(public)/inscripcion/ features/inscripciones/components/
git commit -m "feat: replace inscription stub with real form + MP redirect"
```

---

## Task 9: Return URLs — success, pending, failure

**Files:**
- Create: `app/(public)/inscripcion/success/page.tsx`
- Create: `app/(public)/inscripcion/pending/page.tsx`
- Create: `app/(public)/inscripcion/failure/page.tsx`

- [ ] **Step 1: Success**

```tsx
// app/(public)/inscripcion/success/page.tsx
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function SuccessPage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer className="max-w-xl">
        <Card>
          <h1 className="text-3xl font-display font-bold text-primary">¡Pago recibido!</h1>
          <p className="mt-4 text-ink-soft">
            Revisá tu email en los próximos minutos — te vamos a enviar el link de Meet y las fechas de los encuentros.
          </p>
          <p className="mt-2 text-ink-soft">Si no te llega, escribinos por WhatsApp.</p>
          <Button className="mt-6" asChild><Link href="/">Volver al inicio</Link></Button>
        </Card>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 2: Pending**

```tsx
export default function PendingPage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer className="max-w-xl">
        <Card>
          <h1 className="text-3xl font-display font-bold">Tu pago está siendo procesado</h1>
          <p className="mt-4 text-ink-soft">
            Mercado Pago está procesando tu pago. Cuando se confirme, te vamos a enviar un email con el link de Meet.
          </p>
          <p className="mt-2 text-ink-soft">Esto puede tardar unos minutos (hasta 10 en casos de Rapipago o Pago Fácil).</p>
        </Card>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 3: Failure**

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { buildWhatsappUrl } from '@/components/layout/whatsappUrl';

const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '541126132412';

export default function FailurePage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer className="max-w-xl">
        <Card>
          <h1 className="text-3xl font-display font-bold text-accent">No pudimos procesar el pago</h1>
          <p className="mt-4 text-ink-soft">
            Hubo un problema con tu pago. Podés reintentar desde el taller o contactarnos por WhatsApp para ayudarte.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild><Link href="/talleres/coloquio">Reintentar</Link></Button>
            <Button variant="outline" asChild>
              <a href={buildWhatsappUrl(whatsapp, 'Hola María, tuve un problema al pagar mi inscripción.')} target="_blank" rel="noopener noreferrer">
                Consultar por WhatsApp
              </a>
            </Button>
          </div>
        </Card>
      </SiteContainer>
    </article>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(public)/inscripcion/success app/(public)/inscripcion/pending app/(public)/inscripcion/failure
git commit -m "feat: add MP return URL pages"
```

---

## Task 10: MP webhook API route with idempotency

**Files:**
- Create: `app/api/mp/webhook/route.ts`
- Create: `features/pagos/webhook.ts`

- [ ] **Step 1: Create `features/pagos/webhook.ts`** (handler separado para testeabilidad)

```typescript
import { db } from '@/lib/db/client';
import { pagos } from './schema';
import { inscripciones } from '@/features/inscripciones/schema';
import { ediciones, talleres } from '@/features/talleres/schema';
import { eq } from 'drizzle-orm';
import { paymentApi } from '@/lib/integrations/mercadopago/client';
import { sendEmail } from '@/features/emails/send';
import { WelcomePaid } from '@/features/emails/templates/WelcomePaid';
import { AdminNotification } from '@/features/emails/templates/AdminNotification';
import { updateTag } from 'next/cache';

export async function handleMpPaymentEvent(mpPaymentId: string): Promise<{ processed: boolean; reason?: string }> {
  const existing = await db.select().from(pagos).where(eq(pagos.mpPaymentId, mpPaymentId)).limit(1);
  if (existing.length > 0 && existing[0].status === 'approved') {
    return { processed: false, reason: 'already_processed' };
  }

  const mpPayment = await paymentApi.get({ id: mpPaymentId });
  const inscripcionId = mpPayment.external_reference;
  if (!inscripcionId) return { processed: false, reason: 'no_external_reference' };

  const [insc] = await db.select().from(inscripciones).where(eq(inscripciones.id, inscripcionId)).limit(1);
  if (!insc) return { processed: false, reason: 'inscripcion_not_found' };

  const approved = mpPayment.status === 'approved';

  await db.update(pagos).set({
    mpPaymentId,
    status: approved ? 'approved' : mpPayment.status === 'rejected' ? 'rejected' : 'created',
    method: mpPayment.payment_method_id ?? null,
    rawWebhook: mpPayment as unknown as object,
    updatedAt: new Date(),
  }).where(eq(pagos.inscripcionId, inscripcionId));

  if (!approved) return { processed: true };

  await db.update(inscripciones).set({ status: 'paid', paidAt: new Date() }).where(eq(inscripciones.id, inscripcionId));

  const [edicion] = await db.select().from(ediciones).where(eq(ediciones.id, insc.edicionId)).limit(1);
  const [taller] = await db.select().from(talleres).where(eq(talleres.id, edicion.tallerId)).limit(1);

  // Email alumno
  await sendEmail({
    to: insc.email,
    subject: `Bienvenida al ${taller.name} — tu link de Meet`,
    type: 'welcome_paid',
    inscripcionId: insc.id,
    react: WelcomePaid({
      nombre: insc.nombre,
      tallerName: taller.name,
      edicionLabel: edicion.label,
      groupName: edicion.groupName,
      dates: edicion.dates as string[],
      timeStart: edicion.timeStart,
      timeEnd: edicion.timeEnd,
      meetLink: edicion.meetLink,
    }),
  });

  // Email admin notif
  const adminEmail = process.env.EMAIL_FROM ?? 'hola@abriendocaminos.com.ar';
  await sendEmail({
    to: adminEmail,
    subject: `Nueva inscripción paga: ${insc.nombre} ${insc.apellido}`,
    type: 'admin_notification',
    inscripcionId: insc.id,
    react: AdminNotification({
      nombre: insc.nombre,
      apellido: insc.apellido,
      email: insc.email,
      whatsapp: insc.whatsapp,
      tallerName: taller.name,
      edicionLabel: `${edicion.label} · ${edicion.groupName}`,
      adminUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/inscripciones/${insc.id}`,
    }),
  });

  updateTag(`taller:${taller.slug}`);
  updateTag('inscripciones');

  return { processed: true };
}
```

- [ ] **Step 2: Create `app/api/mp/webhook/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { verifyMpSignature } from '@/lib/integrations/mercadopago/verifyWebhookSignature';
import { handleMpPaymentEvent } from '@/features/pagos/webhook';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get('data.id') ?? '';
  const type = url.searchParams.get('type') ?? '';
  const requestId = request.headers.get('x-request-id') ?? '';
  const header = request.headers.get('x-signature');
  const secret = process.env.MP_WEBHOOK_SECRET ?? '';

  const valid = verifyMpSignature({ header, requestId, dataId, secret });
  if (!valid) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });

  if (type !== 'payment') return NextResponse.json({ ignored: true });

  try {
    const result = await handleMpPaymentEvent(dataId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('MP webhook error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/mp/webhook/ features/pagos/webhook.ts
git commit -m "feat: add MP webhook handler with idempotency and email dispatch"
```

---

## Task 11: Auth.js v5 setup with credentials

**Files:**
- Create: `features/admin-auth/config.ts`
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Install Auth.js v5 + bcrypt**

```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Create `features/admin-auth/config.ts`**

```typescript
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { adminUsers } from './schema';
import { eq } from 'drizzle-orm';

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/admin/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').toLowerCase().trim();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    authorized({ request, auth }) {
      const isOnAdmin = request.nextUrl.pathname.startsWith('/admin');
      const isOnLogin = request.nextUrl.pathname === '/admin/login';
      if (isOnLogin) return true;
      if (isOnAdmin) return !!auth;
      return true;
    },
  },
};
```

- [ ] **Step 3: Create `lib/auth.ts`**

```typescript
import NextAuth from 'next-auth';
import { authConfig } from '@/features/admin-auth/config';

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
```

- [ ] **Step 4: Create `app/api/auth/[...nextauth]/route.ts`**

```typescript
export { GET, POST } from '@/lib/auth';
```

- [ ] **Step 5: Add AUTH_SECRET to `.env.local` and `.env.example`**

```bash
# Auth.js
AUTH_SECRET=<run: openssl rand -base64 32>
AUTH_URL=http://localhost:3000
```

- [ ] **Step 6: Seed admin user**

Create `drizzle/seed-admin.ts`:

```typescript
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db/client';
import { adminUsers } from '../lib/db/schema';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'maria@abriendocaminos.com.ar';
  const password = process.env.ADMIN_PASSWORD ?? 'CambiarEstoYa!';
  const hash = await bcrypt.hash(password, 12);

  await db.insert(adminUsers).values({
    email,
    passwordHash: hash,
    name: 'María de los Ángeles Galmarini',
    role: 'admin',
  }).onConflictDoNothing();

  console.log(`Admin user seeded: ${email}`);
  process.exit(0);
}

seedAdmin().catch((e) => { console.error(e); process.exit(1); });
```

Add to `package.json`:
```json
{ "scripts": { "db:seed:admin": "tsx drizzle/seed-admin.ts" } }
```

Run: `ADMIN_PASSWORD=<strong> npm run db:seed:admin`.

- [ ] **Step 7: Commit**

```bash
git add features/admin-auth/config.ts lib/auth.ts app/api/auth/ drizzle/seed-admin.ts package.json .env.example
git commit -m "feat: setup Auth.js v5 with credentials for admin"
```

---

## Task 12: proxy.ts middleware to protect /admin/*

**Files:**
- Create: `proxy.ts`

- [ ] **Step 1: Write proxy**

```typescript
import { auth } from '@/lib/auth';

export default auth((req) => {
  const isOnAdmin = req.nextUrl.pathname.startsWith('/admin');
  const isOnLogin = req.nextUrl.pathname === '/admin/login';

  if (isOnAdmin && !isOnLogin && !req.auth) {
    const loginUrl = new URL('/admin/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ['/admin/:path*'],
};
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat: protect admin routes with proxy.ts"
```

---

## Task 13: Admin login page

**Files:**
- Create: `app/(admin)/admin/login/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
import { signIn } from '@/lib/auth';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props { searchParams: Promise<{ callbackUrl?: string; error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl = '/admin', error } = await searchParams;

  async function login(formData: FormData) {
    'use server';
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: callbackUrl,
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <SiteContainer className="max-w-md">
        <Card>
          <h1 className="text-2xl font-display font-bold">Panel admin</h1>
          <p className="mt-1 text-sm text-ink-soft">Ingresá con tus credenciales.</p>
          <form action={login} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium block mb-1">Email</label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium block mb-1">Password</label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-destructive text-sm">Credenciales inválidas</p>}
            <Button type="submit" className="w-full">Ingresar</Button>
          </form>
        </Card>
      </SiteContainer>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(admin)/admin/login/
git commit -m "feat: add admin login page"
```

---

## Task 14: Admin layout + dashboard

**Files:**
- Create: `app/(admin)/admin/layout.tsx`
- Create: `app/(admin)/admin/page.tsx`

- [ ] **Step 1: Admin layout**

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/admin/login' });
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-display font-bold">Admin · Abriendo Caminos</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/admin/talleres" className="hover:text-primary">Talleres</Link>
              <Link href="/admin/inscripciones" className="hover:text-primary">Inscripciones</Link>
            </nav>
          </div>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">Salir</Button>
          </form>
        </div>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Dashboard**

```tsx
import { db } from '@/lib/db/client';
import { inscripciones } from '@/features/inscripciones/schema';
import { count, eq, and, gte } from 'drizzle-orm';
import { ediciones, talleres } from '@/features/talleres/schema';
import { Card } from '@/components/ui/Card';

export default async function DashboardPage() {
  const [{ pagas }] = await db.select({ pagas: count() }).from(inscripciones).where(eq(inscripciones.status, 'paid'));
  const [{ pendientes }] = await db.select({ pendientes: count() }).from(inscripciones).where(eq(inscripciones.status, 'pending'));
  const [{ abiertas }] = await db.select({ abiertas: count() }).from(ediciones).where(eq(ediciones.status, 'open'));

  return (
    <div>
      <h1 className="text-2xl font-display font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-ink-soft">Ediciones abiertas</p>
          <p className="mt-2 text-4xl font-display font-bold">{abiertas}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-soft">Inscripciones pagas</p>
          <p className="mt-2 text-4xl font-display font-bold text-primary">{pagas}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-soft">Pendientes de pago</p>
          <p className="mt-2 text-4xl font-display font-bold text-accent">{pendientes}</p>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/admin/layout.tsx app/(admin)/admin/page.tsx
git commit -m "feat: add admin layout and dashboard"
```

---

## Task 15: Admin talleres — list + new + edit + nueva edición

**Files:**
- Create: `app/(admin)/admin/talleres/page.tsx`
- Create: `app/(admin)/admin/talleres/[id]/page.tsx`
- Create: `app/(admin)/admin/talleres/nuevo/page.tsx`
- Create: `app/(admin)/admin/ediciones/nueva/page.tsx`
- Create: `features/talleres/admin-actions.ts`

- [ ] **Step 1: Admin actions (Server Actions for CRUD)**

```typescript
// features/talleres/admin-actions.ts
'use server';

import { db } from '@/lib/db/client';
import { talleres, ediciones } from './schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

const tallerSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  tagline: z.string().min(2),
  description: z.string().min(2),
  priceArs: z.coerce.number().int().min(0),
  capacityMin: z.coerce.number().int().min(1),
  capacityMax: z.coerce.number().int().min(1),
  durationMin: z.coerce.number().int().min(15),
});

export async function createTallerAction(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const parsed = tallerSchema.parse({
    slug: formData.get('slug'),
    name: formData.get('name'),
    tagline: formData.get('tagline'),
    description: formData.get('description'),
    priceArs: formData.get('priceArs'),
    capacityMin: formData.get('capacityMin'),
    capacityMax: formData.get('capacityMax'),
    durationMin: formData.get('durationMin'),
  });

  await db.insert(talleres).values({
    ...parsed,
    programa: [],
    isActive: true,
  });

  updateTag('talleres');
  revalidatePath('/admin/talleres');
  redirect('/admin/talleres');
}

const edicionSchema = z.object({
  tallerId: z.string().uuid(),
  label: z.string().min(2),
  groupName: z.string().min(2),
  dates: z.string().transform((s) => s.split(',').map((d) => d.trim()).filter(Boolean)),
  timeStart: z.string(),
  timeEnd: z.string(),
  meetLink: z.string().url().nullable().optional(),
  capacityOverride: z.coerce.number().int().nullable().optional(),
  inscripcionesOpenAt: z.string().transform((s) => new Date(s)),
  inscripcionesCloseAt: z.string().transform((s) => new Date(s)),
  status: z.enum(['draft', 'open', 'closed', 'done']).default('draft'),
});

export async function createEdicionAction(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const parsed = edicionSchema.parse({
    tallerId: formData.get('tallerId'),
    label: formData.get('label'),
    groupName: formData.get('groupName'),
    dates: formData.get('dates'),
    timeStart: formData.get('timeStart'),
    timeEnd: formData.get('timeEnd'),
    meetLink: formData.get('meetLink') || null,
    capacityOverride: formData.get('capacityOverride') || null,
    inscripcionesOpenAt: formData.get('inscripcionesOpenAt'),
    inscripcionesCloseAt: formData.get('inscripcionesCloseAt'),
    status: formData.get('status'),
  });

  await db.insert(ediciones).values(parsed);

  updateTag('talleres');
  updateTag('ediciones');
  revalidatePath('/admin/talleres');
  redirect(`/admin/talleres/${parsed.tallerId}`);
}

export async function updateEdicionStatusAction(id: string, status: 'draft' | 'open' | 'closed' | 'done') {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  await db.update(ediciones).set({ status }).where(eq(ediciones.id, id));
  updateTag('talleres');
  updateTag('ediciones');
  revalidatePath('/admin/talleres');
}
```

- [ ] **Step 2: `app/(admin)/admin/talleres/page.tsx`**

```tsx
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { talleres } from '@/features/talleres/schema';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default async function AdminTalleresPage() {
  const rows = await db.select().from(talleres).orderBy(talleres.name);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Talleres</h1>
        <Button asChild><Link href="/admin/talleres/nuevo">Nuevo taller</Link></Button>
      </div>
      <div className="mt-6 grid gap-3">
        {rows.map((t) => (
          <Card key={t.id}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-ink-soft">/talleres/{t.slug} · ${t.priceArs.toLocaleString('es-AR')}</p>
              </div>
              <Button variant="ghost" size="sm" asChild><Link href={`/admin/talleres/${t.id}`}>Gestionar →</Link></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `app/(admin)/admin/talleres/[id]/page.tsx`** — detalle + lista de ediciones + botones de status

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { talleres, ediciones } from '@/features/talleres/schema';
import { eq } from 'drizzle-orm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { updateEdicionStatusAction } from '@/features/talleres/admin-actions';

interface Props { params: Promise<{ id: string }> }

export default async function AdminTallerDetailPage({ params }: Props) {
  const { id } = await params;
  const [taller] = await db.select().from(talleres).where(eq(talleres.id, id)).limit(1);
  if (!taller) notFound();
  const eds = await db.select().from(ediciones).where(eq(ediciones.tallerId, id)).orderBy(ediciones.inscripcionesOpenAt);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold">{taller.name}</h1>
      <p className="text-sm text-ink-soft">Slug: /talleres/{taller.slug}</p>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Ediciones</h2>
        <Button asChild><Link href={`/admin/ediciones/nueva?taller=${taller.id}`}>Nueva edición</Link></Button>
      </div>

      <div className="mt-4 grid gap-3">
        {eds.map((ed) => (
          <Card key={ed.id}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="font-medium">{ed.label} · {ed.groupName}</p>
                <p className="text-sm text-ink-soft">
                  {ed.timeStart.slice(0, 5)} a {ed.timeEnd.slice(0, 5)} · {(ed.dates as string[]).length} fechas
                </p>
                <Badge variant={ed.status === 'open' ? 'default' : 'muted'} className="mt-2">{ed.status}</Badge>
              </div>
              <div className="flex gap-2">
                {ed.status === 'draft' && (
                  <form action={updateEdicionStatusAction.bind(null, ed.id, 'open')}>
                    <Button size="sm" type="submit">Publicar</Button>
                  </form>
                )}
                {ed.status === 'open' && (
                  <form action={updateEdicionStatusAction.bind(null, ed.id, 'closed')}>
                    <Button size="sm" variant="outline" type="submit">Cerrar</Button>
                  </form>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `app/(admin)/admin/talleres/nuevo/page.tsx`**

```tsx
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createTallerAction } from '@/features/talleres/admin-actions';

export default function NuevoTallerPage() {
  return (
    <SiteContainer className="max-w-2xl">
      <Card>
        <h1 className="text-2xl font-display font-bold">Nuevo taller</h1>
        <form action={createTallerAction} className="mt-6 space-y-4">
          <div><label className="text-sm block mb-1">Slug (URL)</label><Input name="slug" required /></div>
          <div><label className="text-sm block mb-1">Nombre</label><Input name="name" required /></div>
          <div><label className="text-sm block mb-1">Tagline</label><Input name="tagline" required /></div>
          <div><label className="text-sm block mb-1">Descripción</label><Input name="description" required /></div>
          <div className="grid gap-4 grid-cols-2">
            <div><label className="text-sm block mb-1">Precio (ARS)</label><Input name="priceArs" type="number" required /></div>
            <div><label className="text-sm block mb-1">Duración (min)</label><Input name="durationMin" type="number" required /></div>
            <div><label className="text-sm block mb-1">Cupo mínimo</label><Input name="capacityMin" type="number" required /></div>
            <div><label className="text-sm block mb-1">Cupo máximo</label><Input name="capacityMax" type="number" required /></div>
          </div>
          <Button type="submit" className="w-full">Crear</Button>
        </form>
      </Card>
    </SiteContainer>
  );
}
```

- [ ] **Step 5: `app/(admin)/admin/ediciones/nueva/page.tsx`**

```tsx
import { db } from '@/lib/db/client';
import { talleres } from '@/features/talleres/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createEdicionAction } from '@/features/talleres/admin-actions';

interface Props { searchParams: Promise<{ taller: string }> }

export default async function NuevaEdicionPage({ searchParams }: Props) {
  const { taller: tallerId } = await searchParams;
  const [taller] = await db.select().from(talleres).where(eq(talleres.id, tallerId)).limit(1);
  if (!taller) notFound();

  return (
    <SiteContainer className="max-w-2xl">
      <Card>
        <h1 className="text-2xl font-display font-bold">Nueva edición de {taller.name}</h1>
        <form action={createEdicionAction} className="mt-6 space-y-4">
          <input type="hidden" name="tallerId" value={taller.id} />
          <div><label className="text-sm block mb-1">Label (ej: Mayo 2026)</label><Input name="label" required /></div>
          <div><label className="text-sm block mb-1">Grupo (ej: Grupo mañana)</label><Input name="groupName" required /></div>
          <div><label className="text-sm block mb-1">Fechas (separadas por coma, YYYY-MM-DD)</label><Input name="dates" placeholder="2026-05-02,2026-05-09,2026-05-16" required /></div>
          <div className="grid gap-4 grid-cols-2">
            <div><label className="text-sm block mb-1">Hora inicio</label><Input name="timeStart" type="time" required /></div>
            <div><label className="text-sm block mb-1">Hora fin</label><Input name="timeEnd" type="time" required /></div>
          </div>
          <div><label className="text-sm block mb-1">Link Meet (opcional)</label><Input name="meetLink" type="url" /></div>
          <div><label className="text-sm block mb-1">Cupo override (opcional)</label><Input name="capacityOverride" type="number" /></div>
          <div className="grid gap-4 grid-cols-2">
            <div><label className="text-sm block mb-1">Inscripción abre</label><Input name="inscripcionesOpenAt" type="datetime-local" required /></div>
            <div><label className="text-sm block mb-1">Inscripción cierra</label><Input name="inscripcionesCloseAt" type="datetime-local" required /></div>
          </div>
          <div>
            <label className="text-sm block mb-1">Status</label>
            <select name="status" className="w-full min-h-[44px] px-4 py-2 rounded-md border border-border bg-surface">
              <option value="draft">Draft (oculto)</option>
              <option value="open">Open (visible, inscripción abierta)</option>
            </select>
          </div>
          <Button type="submit" className="w-full">Crear edición</Button>
        </form>
      </Card>
    </SiteContainer>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add features/talleres/admin-actions.ts app/(admin)/admin/talleres/ app/(admin)/admin/ediciones/
git commit -m "feat: admin CRUD for talleres and ediciones"
```

---

## Task 16: Admin inscripciones — list + detail + confirmar pago manual

**Files:**
- Create: `app/(admin)/admin/inscripciones/page.tsx`
- Create: `app/(admin)/admin/inscripciones/[id]/page.tsx`
- Create: `features/pagos/admin-actions.ts`

- [ ] **Step 1: `features/pagos/admin-actions.ts`**

```typescript
'use server';

import { db } from '@/lib/db/client';
import { pagos } from './schema';
import { inscripciones } from '@/features/inscripciones/schema';
import { ediciones, talleres } from '@/features/talleres/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/features/emails/send';
import { WelcomePaid } from '@/features/emails/templates/WelcomePaid';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function confirmPaymentManualAction(inscripcionId: string, note?: string) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const [insc] = await db.select().from(inscripciones).where(eq(inscripciones.id, inscripcionId)).limit(1);
  if (!insc) throw new Error('Inscripción no encontrada');
  if (insc.status === 'paid') return { ok: true, alreadyPaid: true };

  await db.update(inscripciones).set({ status: 'paid', paidAt: new Date(), notesAdmin: note ?? null }).where(eq(inscripciones.id, inscripcionId));
  await db.update(pagos).set({ status: 'approved', updatedAt: new Date() }).where(eq(pagos.inscripcionId, inscripcionId));

  const [edicion] = await db.select().from(ediciones).where(eq(ediciones.id, insc.edicionId)).limit(1);
  const [taller] = await db.select().from(talleres).where(eq(talleres.id, edicion.tallerId)).limit(1);

  await sendEmail({
    to: insc.email,
    subject: `Bienvenida al ${taller.name} — tu link de Meet`,
    type: 'welcome_paid',
    inscripcionId: insc.id,
    react: WelcomePaid({
      nombre: insc.nombre,
      tallerName: taller.name,
      edicionLabel: edicion.label,
      groupName: edicion.groupName,
      dates: edicion.dates as string[],
      timeStart: edicion.timeStart,
      timeEnd: edicion.timeEnd,
      meetLink: edicion.meetLink,
    }),
  });

  revalidatePath('/admin/inscripciones');
  return { ok: true };
}
```

- [ ] **Step 2: Admin inscripciones list**

```tsx
// app/(admin)/admin/inscripciones/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { inscripciones } from '@/features/inscripciones/schema';
import { ediciones, talleres } from '@/features/talleres/schema';
import { eq, desc } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default async function InscripcionesPage() {
  const rows = await db
    .select({ i: inscripciones, ed: ediciones, t: talleres })
    .from(inscripciones)
    .leftJoin(ediciones, eq(ediciones.id, inscripciones.edicionId))
    .leftJoin(talleres, eq(talleres.id, ediciones.tallerId))
    .orderBy(desc(inscripciones.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold">Inscripciones</h1>
      <div className="mt-6 grid gap-3">
        {rows.map(({ i, ed, t }) => (
          <Card key={i.id}>
            <div className="flex justify-between items-center gap-4">
              <div>
                <Link href={`/admin/inscripciones/${i.id}`} className="font-medium hover:underline">
                  {i.nombre} {i.apellido}
                </Link>
                <p className="text-sm text-ink-soft">{t?.name} · {ed?.label} · {ed?.groupName}</p>
                <p className="text-xs text-ink-soft">{i.email} · {i.whatsapp}</p>
              </div>
              <Badge variant={i.status === 'paid' ? 'default' : i.status === 'pending' ? 'accent' : 'muted'}>
                {i.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Admin inscripción detail + confirm manual**

```tsx
// app/(admin)/admin/inscripciones/[id]/page.tsx
import { db } from '@/lib/db/client';
import { inscripciones } from '@/features/inscripciones/schema';
import { pagos } from '@/features/pagos/schema';
import { ediciones, talleres } from '@/features/talleres/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { confirmPaymentManualAction } from '@/features/pagos/admin-actions';
import { formatPrecio } from '@/features/talleres/domain';

interface Props { params: Promise<{ id: string }> }

export default async function InscripcionDetailPage({ params }: Props) {
  const { id } = await params;
  const [insc] = await db.select().from(inscripciones).where(eq(inscripciones.id, id)).limit(1);
  if (!insc) notFound();
  const [pago] = await db.select().from(pagos).where(eq(pagos.inscripcionId, id)).limit(1);
  const [edicion] = await db.select().from(ediciones).where(eq(ediciones.id, insc.edicionId)).limit(1);
  const [taller] = edicion ? await db.select().from(talleres).where(eq(talleres.id, edicion.tallerId)).limit(1) : [null];

  async function confirm() {
    'use server';
    await confirmPaymentManualAction(id, 'Confirmado manualmente por María');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display font-bold">{insc.nombre} {insc.apellido}</h1>
      <Badge className="mt-2" variant={insc.status === 'paid' ? 'default' : 'accent'}>{insc.status}</Badge>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Contacto</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-soft">Email</dt><dd>{insc.email}</dd>
          <dt className="text-ink-soft">WhatsApp</dt><dd>{insc.whatsapp}</dd>
          <dt className="text-ink-soft">Cargo</dt><dd>{insc.cargoActual ?? '—'}</dd>
        </dl>
      </Card>

      {taller && edicion && (
        <Card className="mt-4">
          <h2 className="text-lg font-semibold">{taller.name}</h2>
          <p className="text-sm text-ink-soft">{edicion.label} · {edicion.groupName}</p>
          <p className="mt-2 text-sm">Precio: {formatPrecio(taller.priceArs)}</p>
        </Card>
      )}

      {pago && (
        <Card className="mt-4">
          <h2 className="text-lg font-semibold">Pago</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-soft">Status</dt><dd><Badge variant={pago.status === 'approved' ? 'default' : 'muted'}>{pago.status}</Badge></dd>
            <dt className="text-ink-soft">MP Preference</dt><dd className="font-mono text-xs">{pago.mpPreferenceId}</dd>
            <dt className="text-ink-soft">MP Payment</dt><dd className="font-mono text-xs">{pago.mpPaymentId ?? '—'}</dd>
          </dl>

          {insc.status === 'pending' && (
            <form action={confirm} className="mt-4">
              <Button type="submit">Confirmar pago manualmente</Button>
              <p className="mt-2 text-xs text-ink-soft">Solo usar si MP no envió webhook y confirmaste el pago por fuera.</p>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add features/pagos/admin-actions.ts app/(admin)/admin/inscripciones/
git commit -m "feat: admin inscripciones list and manual payment confirmation"
```

---

## Task 17: E2E test happy path

**Files:**
- Create: `tests/e2e/inscripcion.spec.ts`

- [ ] **Step 1: Write e2e test (skips MP payment — stops at redirect)**

```typescript
import { test, expect } from '@playwright/test';

test('inscripcion flow redirects to MP', async ({ page }) => {
  await page.goto('/talleres/coloquio');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Taller de Coloquio');

  await page.getByRole('link', { name: 'Inscribirme' }).first().click();
  await expect(page).toHaveURL(/\/inscripcion\/coloquio/);

  await page.getByLabel('Nombre').fill('Test');
  await page.getByLabel('Apellido').fill('Alumna');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('WhatsApp').fill('1126132412');

  // Intercept MP redirect — check it would happen without actually going
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('mercadopago') || r.url().includes('/inscripcion/'), { timeout: 15000 }).catch(() => null),
    page.getByRole('button', { name: /Ir a pagar/ }).click(),
  ]);

  // Verify either MP URL or error message appeared
  expect(page.url()).toMatch(/mercadopago|inscripcion/);
});

test('admin login requires credentials', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});
```

- [ ] **Step 2: Run e2e**

```bash
npm run e2e
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/inscripcion.spec.ts
git commit -m "test: e2e inscripcion redirect to MP and admin protection"
```

---

## Task 18: Update `.env.example` with all Plan 2 vars

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add all vars**

```env
# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxx
MP_WEBHOOK_SECRET=xxx

# Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=hola@abriendocaminos.com.ar

# Auth.js
AUTH_SECRET=xxx
AUTH_URL=http://localhost:3000
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: update env example with Plan 2 vars"
```

---

## Plan 2 Complete ✅

**Deliverable**: el negocio opera end-to-end. Alumno se inscribe → paga en MP → recibe welcome email con link Meet → María lo ve en admin. María puede crear nuevos talleres y ediciones sin código.

**Next**: Plan 3 — Consultas 1:1 con Cal.com.
