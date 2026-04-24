# Abriendo Caminos — Plataforma Completa · Design Document

> **Status**: Approved (brainstorm phase). Ready for implementation planning.
> **Date**: 2026-04-24
> **Owner**: Matias Sartori
> **Team (Linear)**: [MAR · maria-de-los-angeles-app](https://linear.app/maria-de-los-angeles-app/team/MAR/active)
> **Duration estimate**: 4-6 semanas

---

## 1. Context

**María de los Ángeles Galmarini** es Profesora de Nivel Inicial con 19 años como directora y certificaciones como Coach Ontológico y Coach Educativo. Hoy ofrece servicios formativos a docentes que buscan ascender a cargos directivos, bajo la marca **Abriendo Caminos**.

Este documento describe una **plataforma web completa** (no solo landing) que soporta:

- Promoción de servicios (contenido marketing + trust story).
- Inscripción y pago de **talleres grupales** (hoy: Taller de Coloquio; mañana: Taller de Planificación Áulica y otros).
- Reserva y pago de **consultas individuales 1:1** (Coach Ontológico y Coach Educativo).
- **Panel administrativo** para que María gestione talleres, inscripciones y pagos sin depender de un dev.
- Arquitectura extensible para agregar **futuros servicios** sin rediseño.

El stack elegido es **Next.js 16 + React 19.2 + Tailwind v4** desplegado en Vercel, con persistencia en Supabase Postgres.

---

## 2. Brand & Identity

| Elemento | Valor |
|----------|-------|
| **Marca principal** | Abriendo Caminos |
| **Figura** | María de los Ángeles Galmarini (cara, trust, 19 años de trayectoria) |
| **Identidad secundaria** | G.E.P · Gestión Educativa Práctica (footer / "about") |
| **Servicio actual** | Taller de Coloquio (único taller hoy; arquitectura soporta múltiples) |
| **Tagline** | "Gestioná tus miedos, estudiá desde la posibilidad, caminá hacia el éxito" |
| **Dirección visual** | Moderno y vibrante |
| **Paleta** | Verde principal `#0d6e5f` · Coral `#f07b4a` · Crema `#fef9f0` · Menta `#b8e6d1` · Negro profundo `#0d1f1a` |
| **Tipografías** | Cabinet Grotesk (headlines) + Instrument Sans (body), self-hosted vía `next/font` |
| **Tono** | Profesional + cercano + moderno. Diferenciador vs. coaches tradicionales. |

**Público objetivo**: docentes argentinas (mayoría mujeres) entre 30-55 años, preparándose para ascender a direcciones. Emociones típicas: ansiedad, inseguridad, ganas de crecer. Valores que resuenan: respeto, trayectoria, calidez, acompañamiento.

---

## 3. Scope

### In scope (V1)

- Sitio público (landing + detalle talleres + consultas + about).
- Flujo completo de **inscripción con pago MP** (webhook automático).
- Flujo completo de **reserva de consultas 1:1 vía Cal.com** (pago integrado en Cal.com).
- **Admin panel custom** para gestión de talleres, ediciones, inscripciones, consultas, emails y settings.
- **Auth.js v5** para admin (solo María por ahora).
- **Emails transaccionales** (Resend + React Email) con audit trail.
- **Crons de recordatorios** (Vercel Cron).
- **Botón flotante WhatsApp** context-aware.
- **Mobile-first** + **a11y AA** + **SEO completo**.

### Out of scope (V1 — queda para V2 o futuro)

- Cuentas de usuario para alumnos (no signup/login de alumnos).
- Chat en la página real (usamos deep link a WhatsApp).
- Bricks / Checkout embebido de MP (usamos Checkout Pro redirect).
- CMS headless tipo Sanity/Payload (admin custom cubre la necesidad).
- Multi-idioma.
- Blog / sección de contenidos.
- Sistema de certificados descargables.
- Materiales/PDFs subidos por María (se envían por email por ahora).
- App mobile nativa.

### Future extensibility (explícitamente soportada por el modelo)

- Agregar nuevos **tipos de taller** (Planificación Áulica) sin migraciones estructurales.
- Agregar **talleres grabados / asíncronos**.
- Agregar **talleres gratis / con beca** (feature flag por taller, mismo modelo).
- Agregar **tabla de certificados** con FK a inscripciones sin tocar el resto.
- Escalar a **magic link para alumnos** si se suma membresía mensual.

---

## 4. Actors

| Actor | Autenticación | Capacidades |
|-------|---------------|-------------|
| 👤 **Visitante anónimo** | Ninguna | Navegar sitio, leer, clickear WhatsApp, iniciar inscripción / reserva. |
| 🎓 **Alumno** | Identidad = email (sin login) | Inscribirse a taller, pagar, recibir emails, reservar consulta. |
| 👩‍🏫 **María (admin)** | Credentials (email + password, Auth.js) | Gestionar todo el panel admin. Único usuario autenticado. |

---

## 5. Information Architecture

### Rutas públicas

```
/                              # Landing completa (hero + talleres + consultas + about + CTA)
/talleres/[slug]               # Detalle por taller
  /talleres/coloquio
  /talleres/planificacion-aulica   # "próximamente" en V1
/consultas                     # Info + embed Cal.com
/sobre-maria                   # Bio completa + trust story

# Flows
/inscripcion/[taller-slug]     # Form de inscripción → MP Checkout
/inscripcion/success           # Return URL: pago aprobado
/inscripcion/pending           # Return URL: pago en proceso
/inscripcion/failure           # Return URL: pago rechazado
```

### Rutas admin (protegidas por `proxy.ts`)

```
/admin                         # Login
/admin/dashboard               # KPIs: inscriptos, ingresos, próxima clase
/admin/talleres                # CRUD de talleres y ediciones
/admin/inscripciones           # Lista + filtros + confirmar pago manual
/admin/consultas               # Mirror de bookings Cal.com + re-sync
/admin/settings                # site_settings editables
/admin/email-log               # Audit trail de emails
```

### API Routes

```
POST /api/mp/webhook           # Webhook Mercado Pago (validación HMAC)
POST /api/calcom/webhook       # Webhook Cal.com (booking events)
POST /api/cron/recordatorios   # Vercel Cron 48h + 2h antes
POST /api/cron/retry-emails    # Vercel Cron cada 15min
```

---

## 6. System Architecture

### 6.1 Subsistemas

1. **Sitio público** — Next.js App Router, Server Components por default, `'use cache'` + `cacheTag` para caché agresiva.
2. **Capa de dominio** — `features/*/domain.ts` con lógica pura testeable (sin HTTP ni DB).
3. **Panel Admin** — Rutas protegidas bajo `(admin)/admin/*`, Auth.js v5 credentials, mismo stack UI.
4. **API Routes** — Webhooks entrantes (MP, Cal.com) + Cron jobs.
5. **Persistencia** — Supabase Postgres + Drizzle ORM + migraciones versionadas en `/drizzle`.
6. **Integraciones externas** — Mercado Pago, Cal.com, Resend, WhatsApp — cada una encapsulada en `lib/integrations/{vendor}`.

### 6.2 Principios arquitectónicos

- **Server-first (RSC por default)** — `'use client'` solo en: forms, Cal.com embed, admin interactivo, WhatsApp button. Se aplica el árbol de decisión RSC.
- **Screaming Architecture** — organización por feature (`features/talleres`, `features/inscripciones`, `features/pagos`, `features/consultas`, `features/admin-auth`, `features/emails`). No por layer técnico.
- **Integraciones encapsuladas** — `lib/integrations/{vendor}/` con API tipada hacia el resto de la app. Vendor lock-in queda en una carpeta; nadie más importa el SDK.
- **Caché agresiva (Next 16)** — `cacheComponents: true`, `'use cache'` con `cacheLife('max')` en queries de talleres, `cacheTag('talleres')` para invalidación dirigida, `updateTag()` al editar desde admin.
- **Testeable** — lógica de dominio separada de HTTP/DB. **Strict TDD Mode** está activado en el repo.
- **Extensible** — modelo de datos `taller` + `edicion` + `inscripcion` soporta múltiples servicios sin cambios estructurales.
- **Idempotencia** — webhooks MP usan unique constraint en `pagos.mp_payment_id` para absorber duplicados.

---

## 7. Data Model

Supabase Postgres + Drizzle ORM.

### 7.1 Entidades

#### `talleres`
El producto educativo estable (ej: "Taller de Coloquio").

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `slug` | text unique | "coloquio", "planificacion-aulica" |
| `name` | text | "Taller de Coloquio" |
| `tagline` | text | |
| `description` | text (markdown) | |
| `programa` | jsonb | Array de encuentros con título + bullets |
| `price_ars` | integer | 30000 |
| `capacity_min` | integer | 3 |
| `capacity_max` | integer | 12 |
| `duration_min` | integer | 90 |
| `is_active` | boolean | Ocultar de la web si false |
| `hero_image_url` | text | |
| `created_at` | timestamptz | |

#### `ediciones`
Instancia concreta de un taller (ej: "Mayo 2026 · Grupo mañana").

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `taller_id` | uuid FK → talleres.id | |
| `label` | text | "Mayo 2026" |
| `group_name` | text | "Grupo mañana" |
| `dates` | jsonb | Array de fechas ISO |
| `time_start` | time | 08:30 |
| `time_end` | time | 10:00 |
| `meet_link` | text (solo visible en admin) | |
| `capacity_override` | integer nullable | Override del cupo del taller |
| `inscripciones_open_at` | timestamptz | |
| `inscripciones_close_at` | timestamptz | |
| `status` | enum | `draft` / `open` / `closed` / `done` |
| `created_at` | timestamptz | |

#### `inscripciones`
Una persona inscripta a una edición.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `edicion_id` | uuid FK → ediciones.id | |
| `nombre` | text | |
| `apellido` | text | |
| `email` | text | Identidad del alumno |
| `whatsapp` | text | |
| `cargo_actual` | text nullable | "Maestra", "Vice-directora" |
| `status` | enum | `pending` / `paid` / `cancelled` / `refunded` |
| `source` | enum | `web` / `admin_manual` |
| `notes_admin` | text nullable | Nota privada de María |
| `created_at` | timestamptz | |
| `paid_at` | timestamptz nullable | |

#### `pagos`
Registro de pagos MP (1:1 con inscripción).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `inscripcion_id` | uuid FK → inscripciones.id | |
| `mp_preference_id` | text | |
| `mp_payment_id` | text nullable **unique** | Idempotencia del webhook |
| `amount_ars` | integer | |
| `status` | enum | `created` / `approved` / `rejected` / `refunded` |
| `method` | text | `account_money` / `credit_card` / `cuenta_dni` / etc. |
| `raw_webhook` | jsonb | Último payload del webhook |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `consultas`
Cache de reservas Cal.com (mirror read-only sync vía webhook).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `calcom_booking_id` | text unique | |
| `tipo` | enum | `ontologico` / `educativo` |
| `nombre` | text | |
| `email` | text | |
| `scheduled_at` | timestamptz | |
| `duration_min` | integer | |
| `status` | enum | `booked` / `done` / `cancelled` |
| `meet_link` | text | |
| `created_at` | timestamptz | |

#### `admin_users`
Auth.js adapter. Solo María por ahora.

| Columna | Tipo |
|---------|------|
| `id` | uuid PK |
| `email` | text unique |
| `password_hash` | text (bcrypt) |
| `name` | text |
| `role` | enum `admin` |
| `last_login_at` | timestamptz |
| `created_at` | timestamptz |

#### `email_log`
Audit trail de emails (debugging + retries).

| Columna | Tipo |
|---------|------|
| `id` | uuid PK |
| `inscripcion_id` | uuid FK → inscripciones.id nullable |
| `to_email` | text |
| `type` | enum `welcome_paid` / `meet_link` / `reminder_48h` / `reminder_2h` / `cancelled` / `admin_notification` |
| `subject` | text |
| `resend_message_id` | text nullable |
| `sent_at` | timestamptz |
| `status` | enum `sent` / `failed` / `bounced` |

#### `site_settings`
Key-value editable desde admin.

| Columna | Tipo |
|---------|------|
| `key` | text PK |
| `value` | jsonb |
| `updated_at` | timestamptz |
| `updated_by` | uuid FK → admin_users.id |

### 7.2 Relaciones

- `talleres` **1-N** `ediciones`
- `ediciones` **1-N** `inscripciones`
- `inscripciones` **1-1** `pagos`
- `inscripciones` **1-N** `email_log`
- `consultas` independiente (fuente = Cal.com)

### 7.3 Strategy de extensibilidad

- **Agregar nuevo taller** (Planificación Áulica, Liderazgo Pedagógico, etc.): INSERT en `talleres` + `ediciones` desde admin. Cero código.
- **Talleres grabados** (futuro): agregar `modality` enum (`live` / `recorded`) sin romper schema.
- **Talleres gratis**: `price_ars = 0` → flow de pago se saltea (feature flag por taller).
- **Certificados** (futuro): nueva tabla `certificados` con FK a `inscripciones`.

---

## 8. User Journeys

### 8.1 Journey A — Alumno se inscribe al Taller de Coloquio

1. Entra a `/`, ve el hero, scrollea hasta "Taller de Coloquio", clickea **"Ver detalle"** → `/talleres/coloquio`.
2. Lee programa, fechas, precio. Ve las **ediciones abiertas** (ej: "Mayo 2026 · Grupo mañana 08:30"). Clickea **"Inscribirme"**.
3. Llega a `/inscripcion/coloquio?edicion=xxx`. Completa form: nombre, apellido, email, WhatsApp, cargo. Ve resumen: taller + edición + precio.
4. **Server Action `createInscripcion()`**: valida con Zod → verifica cupo en la edición → inserta en `inscripciones` (`status: pending`) → llama a MP API para crear `Preference` → guarda en `pagos` → devuelve URL de checkout.
5. **Redirige a Mercado Pago** (Checkout Pro hosted). Paga con MP / Cuenta DNI / tarjeta / Rapipago.
6. MP procesa y envía **webhook a `POST /api/mp/webhook`** (approved/rejected).
7. Webhook handler: **valida firma HMAC SHA256** → recupera preferencia → actualiza `pagos.status = approved` + `inscripciones.status = paid` + `paid_at`.
8. Dispara email (React Email): **"Bienvenida al Taller — tu link de Meet"** con fechas + link Meet + recordatorio. Log en `email_log`.
9. MP redirige al alumno a `/inscripcion/success`. Ve confirmación + recordatorio de revisar mail.
10. **48h y 2h antes de cada clase**: cron job busca inscripciones pagadas con clase próxima, envía recordatorios.

**Edge cases**:
- Webhook duplicado (MP lo manda 2 veces): unique constraint en `pagos.mp_payment_id` absorbe.
- Webhook perdido: María confirma manualmente desde admin; sistema igual dispara email.
- Pago rechazado: link de retry en el email.

### 8.2 Journey B — Alumno reserva consulta 1:1

1. Entra a `/`, sección "Consultas 1:1". Elige tipo (Coach Ontológico / Coach Educativo). Clickea **"Reservar"** → `/consultas`.
2. Ve copy detallado + **embed de Cal.com** con los tipos de sesión.
3. **Dentro del embed de Cal.com**: elige tipo → elige fecha/hora → completa datos → paga con MP (Cal.com integrado).
4. Cal.com confirma + envía email de confirmación al alumno + a María con link Meet.
5. Cal.com envía webhook a `POST /api/calcom/webhook`. Nosotros espejamos en tabla `consultas` (mirror read-only).
6. Alumno ve confirmación. Recibe recordatorios (los maneja Cal.com, no duplicamos).

### 8.3 Journey C — María abre inscripciones para nuevo taller

1. Ingresa a `/admin`, loguea con email + password (Auth.js).
2. Va a `/admin/talleres`, selecciona "Taller de Coloquio", clickea **"Nueva edición"**.
3. Completa form: label, grupo, fechas (picker), horario, link Meet, cupo, ventana de inscripciones.
4. Guarda con `status: draft` → preview sin exposición pública.
5. **Server Action `createEdicion()`**: valida + inserta + llama a `updateTag('talleres')` para invalidar caché de la landing en-request.
6. María clickea **"Publicar"** → `status: open`.
7. La edición aparece en `/talleres/coloquio` del sitio público.
8. A medida que llegan inscripciones, María las ve en `/admin/inscripciones`. Si un pago quedó pendiente (webhook falló), puede **confirmar manual** — sistema dispara igual el email.
9. El día del taller, clickea **"Enviar recordatorio al grupo"** → mail masivo a los inscriptos pagados.

---

## 9. Tech Stack

### 9.1 Next.js 16 patterns

| Área | Decisión |
|------|----------|
| **Rendering** | Server Components por default. `'use client'` solo en forms, Cal.com embed, admin interactivo, WhatsApp button. |
| **Cache** | `cacheComponents: true`. `'use cache'` con `cacheLife('max')` en queries de talleres. `cacheTag('talleres', 'ediciones', 'consultas')` para invalidación dirigida. |
| **Mutations** | Server Actions + React 19 `useActionState`. Validación con Zod. `updateTag()` para revalidación en-request. |
| **Forms** | Progressive enhancement. `useFormStatus` para pending state. `useOptimistic` en admin. |
| **Async APIs** | TODOS los `params`, `searchParams`, `cookies()`, `headers()` con `await` (breaking change de v16). `npx next typegen` para tipos `PageProps<'/talleres/[slug]'>`. |
| **Middleware** | `proxy.ts` (ex-middleware) protege `/admin/*`. Node runtime (Edge removed en 16). |
| **Cron** | Vercel Cron → `/api/cron/*` protegido con `CRON_SECRET` header. |
| **Compilador** | `reactCompiler: true`. Memo automática. |
| **Metadata** | `generateMetadata` dinámica por ruta. OG images por taller. `sitemap.ts` con ediciones. |

### 9.2 Styling — Tailwind v4

- **Tokens** en CSS variables vía `@theme`: `--color-primary` (verde), `--color-accent` (coral), `--color-surface` (crema). Cero hex hardcodeados en componentes.
- **Variants** con `class-variance-authority` (cva) para `Button`, `Card`, `Input`, `Badge`, `Dialog`.
- **Fuentes** self-hosted con `next/font` (Cabinet Grotesk + Instrument Sans).
- **Responsive** mobile-first, min-width breakpoints, `clamp()` para fluid typography, `dvh`/`svh` en vez de `vh` (bug iOS).
- **A11y AA** mínimo: `focus-visible`, semantic HTML, touch targets ≥ 44×44px, `aria-label` en iconos.

### 9.3 Testing — Strict TDD

- **Unit / dominio**: Vitest. Testea `features/*/domain.ts` (cupo, estados, validaciones). Sin DB ni HTTP.
- **Integration**: Vitest + **Testcontainers Postgres**. Server Actions contra DB real. **Nunca mockeamos la DB** (evita gap prod-test).
- **E2E**: Playwright. 4-5 journeys: inscripción completa (mock MP), reserva consulta (mock Cal.com), admin CRUD taller, login admin, home pública.
- **React Email**: snapshot tests + Resend DevStudio para preview.
- **Disciplina**: skill `superpowers:test-driven-development` activa. Test falla primero → mínimo código para que pase → refactor.

### 9.4 Dev tooling

- **Lint**: ESLint Flat Config + reglas a11y.
- **Format**: Prettier (o Biome — preferencia del usuario).
- **Types**: TS strict. `next typegen`. Zod schemas → TS types con `z.infer`.
- **Pre-commit**: Husky + lint-staged (lint + format + typecheck staged).
- **Commits**: Conventional commits. **NO co-author AI** (regla usuario en CLAUDE.md).
- **CI**: GitHub Actions (typecheck + lint + test + build en PR). Vercel preview deploys.

### 9.5 Component architecture

- **Atomic**: atoms (`components/ui`) → molecules (`components/sections`) → organisms (`components/layout`) → features (`features/*/components`).
- **Container / Presentational**: Server = container (fetch), Client = presentational + interactivo. Composición: server importa client, nunca al revés.
- **Compound components** donde aplique (Dialog.Root / Trigger / Content).
- **Skills activas** que se invocan automáticamente: `design-tokens-tailwind-system`, `component-architecture-atomic`, `mobile-first-responsive`, `a11y-first-frontend`, `visual-hierarchy-typography`, `react-19-actions-hooks`, `react-rsc-decision-tree`, `landing-conversion-anatomy`.

---

## 10. Integrations

### 10.1 Mercado Pago — Checkout Pro

- **SDK**: `mercadopago` npm v2 (oficial).
- **Flow**: crear Preference en `createInscripcion()` → redirect a `init_point` → webhook `/api/mp/webhook` → return a `/inscripcion/success|pending|failure`.
- **Webhook**: valida firma HMAC SHA256 con `x-signature`. Idempotente (unique `pagos.mp_payment_id`).
- **Métodos**: MP money, tarjetas, Cuenta DNI, Rapipago, Pago Fácil (MP decide según usuario).
- **Encapsulación**: `lib/integrations/mercadopago/` — `client.ts`, `createPreference.ts`, `verifyWebhookSignature.ts`, `parseWebhookEvent.ts`. Cero llamadas al SDK fuera de esta carpeta.
- **Failure modes**: webhook delay hasta 10min → polling suave en `/pending`. Webhook perdido → fallback manual desde admin. Pago rechazado → link retry en email.

### 10.2 Cal.com — Consultas 1:1

- **Setup** (María): cuenta Cal.com free tier → 2 event types: "Coach Ontológico · 60min" y "Coach Educativo · 60min".
- **Pagos**: Cal.com → Apps → Mercado Pago integrado. Cobra al reservar sin salir del embed.
- **Embed**: `@calcom/embed-react` en `/consultas`. Theme custom con tokens Abriendo Caminos.
- **Webhook**: `/api/calcom/webhook`. Suscribimos a `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`, `BOOKING_PAID`. Espejamos en `consultas`.
- **Emails**: confirmación + recordatorios los maneja Cal.com. NO duplicamos desde Resend.
- **Meet link**: Cal.com genera Google Meet automático si María conecta su Google Calendar.
- **Failure modes**: Cal.com caído → reservas futuras caen (asumible). DB mirror desync → endpoint re-sync manual en admin.

### 10.3 Resend + React Email — Transaccionales

- **SDK**: `resend` + `@react-email/components`. Templates JSX como componentes React.
- **Templates**: `WelcomePaid`, `ReminderPreClass` (48h + 2h), `InscripcionCancelled`, `AdminNotification`, `PagoPendiente`.
- **Dominio**: verificación con el dominio final (SPF + DKIM + DMARC). Sender: `hola@abriendocaminos.com.ar`.
- **Audit trail**: cada send loggea en `email_log` con `resend_message_id`. Permite re-envío desde admin.
- **Dev preview**: `npm run email:preview` abre Resend DevStudio en localhost:3001.
- **Límites**: free tier 3.000/mes · 100/día. Margen sobrado.
- **Failure modes**: Resend caído → log con `status: failed` → cron cada 15min re-intenta.

### 10.4 WhatsApp — Botón flotante (deep link)

- **Mecanismo**: `https://wa.me/541126132412?text={mensaje_urlencoded}`. NO API.
- **Context-aware**: mensaje cambia según la página (home, taller específico, inscripción fallida, consultas).
- **UX**: botón flotante bottom-right en todas las páginas públicas. Oculto en `/admin/*`. A11y `aria-label`.
- **Horarios**: tooltip/chip "L-J de 10 a 15h" para gestionar expectativas.
- **Failure modes**: ninguno (es link HTML).

---

## 11. Folder Structure (Screaming Architecture)

```
app/
  (public)/
    page.tsx                  # landing
    talleres/[slug]/page.tsx
    consultas/page.tsx
    sobre-maria/page.tsx
    inscripcion/[taller-slug]/page.tsx
  (admin)/admin/
    layout.tsx                # auth check + shell
    page.tsx                  # dashboard
    talleres/                 # CRUD
    inscripciones/
    consultas/
    email-log/
    settings/
  api/
    mp/webhook/route.ts
    calcom/webhook/route.ts
    cron/recordatorios/route.ts
    cron/retry-emails/route.ts
  layout.tsx                  # root
  proxy.ts                    # ex-middleware

features/
  talleres/
    schema.ts                 # Zod + Drizzle
    actions.ts                # Server Actions
    queries.ts                # con 'use cache'
    domain.ts                 # lógica pura
    components/
    __tests__/
  inscripciones/
  pagos/                      # MP handler + webhook logic
  consultas/
  admin-auth/
  emails/                     # React Email templates + sender

lib/
  db/                         # Drizzle client + schema index
  integrations/
    mercadopago/
    calcom/
    resend/
  validation/                 # Zod shared
  auth.ts                     # Auth.js config

components/
  ui/                         # atoms (cva)
  sections/                   # molecules
  layout/                     # organisms

drizzle/                      # migraciones
tests/e2e/                    # Playwright
docs/superpowers/specs/
```

---

## 12. Environment Variables

```env
# Database (Supabase Postgres)
DATABASE_URL=postgres://...supabase.co:6543/postgres

# Supabase (solo si usamos Storage en V2)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Auth.js
AUTH_SECRET=xxx                 # openssl rand -base64 32
AUTH_URL=https://abriendocaminos.com.ar

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxx
MP_WEBHOOK_SECRET=xxx

# Cal.com
CALCOM_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_CALCOM_USERNAME=mariangeles-galmarini

# Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=hola@abriendocaminos.com.ar

# Cron (Vercel)
CRON_SECRET=xxx                 # Bearer header en /api/cron/*

# Public
NEXT_PUBLIC_WHATSAPP_NUMBER=541126132412
NEXT_PUBLIC_SITE_URL=https://abriendocaminos.com.ar
```

---

## 13. Build Phases

| Fase | Duración | Deliverable |
|------|----------|-------------|
| **0 · Foundation** | 2-3 días | Repo, DB, tokens, UI primitives, CI verde |
| **1 · Sitio público** | 5-7 días | Landing + detalle talleres + bio. María comparte link. |
| **2 · Inscripciones + Pagos + Admin + Emails** | 8-10 días | Flujo end-to-end. El negocio opera. |
| **3 · Consultas Cal.com** | 3-4 días | Reservas 1:1 con pago integrado. |
| **4 · Automation** | 3-4 días | Crons, retries, emails grupales, settings. |
| **5 · Polish & Launch** | 3-5 días | SEO, perf, a11y, dominio, LIVE. |

**Timeline total**: 4-5 semanas efectivas + ~1 semana buffer = **5-6 semanas**.

### Fase 0 — Foundation
- Setup Supabase + Drizzle + connection.
- Estructura de carpetas (screaming arch).
- Design tokens Tailwind v4 + cva primitives (Button, Input, Card, Badge, Dialog).
- Root layout + fuentes self-hosted.
- Vitest + Playwright + Testcontainers configurados.
- GitHub Actions CI + Vercel project + `.env.example`.
- Husky + lint-staged + conventional commits.
- **Bloqueadores**: dominio elegido, acceso Supabase, repo GitHub.

### Fase 1 — Sitio público
- Landing completa (`/`): hero + taller + consultas + trust + testimonios + CTA.
- Página taller (`/talleres/coloquio`): programa, fechas, precio, FAQ.
- Página consultas (`/consultas`): copy + CTA WhatsApp (embed Cal.com viene en Fase 3).
- Página sobre María (`/sobre-maria`): bio + trayectoria + foto.
- Componentes recurrentes: Navbar, Footer, WhatsappButton.
- Metadata dinámica + OG images + sitemap.
- Mobile-first + a11y AA audit.
- Content semilla en DB con lectura `'use cache'`.
- **Bloqueadores**: bio + foto María, testimonios, copy final del Taller.

### Fase 2 — Inscripciones + Pagos + Admin + Emails
- Auth.js v5 credentials + proxy.ts.
- Admin layout + dashboard con KPIs.
- Admin CRUD talleres + ediciones con `updateTag('talleres')`.
- Flow inscripción público con Zod.
- MP Checkout Pro integration + webhook con firma HMAC + idempotencia.
- Admin inscripciones (lista + filtros + confirmar pago manual).
- Resend + React Email: template `WelcomePaid` con link Meet.
- Email admin notif al entrar inscripción paga.
- E2E test happy path con MP mockeado.
- **Bloqueadores**: MP access token producción, dominio verificado Resend (SPF/DKIM), link Meet inicial.

### Fase 3 — Consultas Cal.com
- Setup Cal.com (María): event types + MP conectado.
- Embed `@calcom/embed-react` en `/consultas` con theme custom.
- Webhook Cal.com (BOOKING_CREATED / CANCELLED / RESCHEDULED / PAID).
- Mirror en `consultas`.
- Admin consultas + botón re-sync manual.
- E2E test con Cal.com mockeado.
- **Bloqueadores**: cuenta Cal.com activa, MP conectado en Cal.com, precios + duración consultas.

### Fase 4 — Automation
- Vercel Cron recordatorios 48h + 2h antes.
- Retry cron cada 15min para emails fallidos.
- Admin enviar mail grupal (rich text editor).
- Admin cancelar inscripción (libera cupo + email).
- Admin config global (`site_settings`).
- Admin audit `email_log` + re-envío.
- **Bloqueadores**: horarios finales, copy de recordatorios.

### Fase 5 — Polish & Launch
- SEO full: OG dinámicas, sitemap, robots, JSON-LD.
- Performance audit Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms).
- A11y full audit (axe-core + keyboard + screen reader).
- Error boundaries + `not-found.tsx` + `error.tsx`.
- Monitoring (Sentry free tier o Vercel Observability).
- DNS + dominio → Vercel + SSL automático.
- Backup strategy Supabase.
- Manual de usuario para María.
- Smoke test producción (inscripción real con $1).
- **GO LIVE** 🚀.
- **Bloqueadores**: dominio contratado, aprobación del sitio.

---

## 14. Risks & Open Questions

### Riesgos conocidos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| MP cambia API de webhooks / firma | Baja | Alto | SDK oficial, validamos firma estándar HMAC, monitoring de `email_log` + `pagos.status`. |
| Cal.com integración MP tiene quirks en AR | Media | Medio | Smoke test temprano en Fase 3. Si falla, fallback = pago externo + reserva manual. |
| Resend bloqueado por reputación inicial | Baja | Medio | Domain verification completo (SPF+DKIM+DMARC) desde día 1. |
| Vercel cold starts afectan webhooks | Baja | Bajo | Webhooks son idempotentes, reintentos de MP absorben delay. |
| María no puede aprender el panel | Media | Medio | UX admin simple + manual de usuario + screencast en Fase 5. |
| Breaking changes de Next 16 en patches | Baja | Medio | Lock version + CI verde antes de mergear bumps. |

### Preguntas abiertas (deferred)

- **Dominio final**: pendiente de confirmación por María (¿abriendocaminos.com.ar u otra variante?).
- **Testimonios**: ¿María tiene reviews de alumnas de ediciones pasadas? Si sí, los incorporamos. Si no, placeholder + iteramos post-launch.
- **Hero image**: foto profesional de María u ilustración de marca. Requiere decisión visual.
- **Formulario de contacto**: ¿además de WhatsApp, sumamos un form de consulta libre? Probablemente no en V1.
- **Google Analytics / Plausible**: tracking de conversión — queda para Fase 5 si hay apetito.

---

## 15. Next Steps

1. **Usuario revisa este spec** (vos, Mati). Si aprueba o pide cambios, iteramos.
2. **Invocar skill `writing-plans`** (superpowers) → crea el plan de implementación detallado con steps chequeables por fase.
3. **Reiniciar Claude Code** → autenticar Linear MCP con `/mcp` + cuenta `maria-de-los-angeles-app`.
4. **Generar todas las issues en Linear** (team `MAR`) desde el plan — una issue por cada step/tarea, agrupadas por fase (cycle Linear si tiene sentido).
5. **Arrancar FASE 0** — setup del proyecto siguiendo strict TDD.
6. Iterar fases, cada una con review antes de pasar a la siguiente.
