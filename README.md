# BookStyles — Barber & Salon ERP

Sistema ERP web **multi-tenant SaaS** para barberías y salones de belleza.  
Construido con Next.js 16, Prisma 7 y PostgreSQL.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| UI | Ant Design v6 + Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts 3 + FullCalendar 6 |
| Backend | Next.js API Routes + Prisma 7 + Neon PostgreSQL |
| Auth | JWT httpOnly cookies + jose + bcryptjs |
| State | TanStack Query 5 + react-hook-form 7 + Zod 4 |
| Deploy | Vercel |

## Módulos incluidos

- **Dashboard** — KPIs en tiempo real: ingresos, citas, clientes
- **Citas** — Calendario y gestión de agendas por barbero
- **Reservas públicas** — Booking sin login por URL del negocio
- **POS / Ventas** — Punto de venta con turnos de caja
- **Facturación DTE** — Factura consumidor final, CCF, Nota de Crédito
- **Inventario** — Productos + Kardex de movimientos
- **Compras** — Órdenes de compra y detalle
- **Proveedores** — CRUD con cuentas por pagar (CxP)
- **Gastos** — Categorías y seguimiento de egresos
- **Planilla** — Nómina con ISSS, AFP, Renta, INSAFORP (El Salvador)
- **Clientes** — CRM con programa de lealtad
- **Barberos** — Perfiles, horarios y comisiones
- **Configuración** — Temas visuales, datos del negocio, precios
- **Monitoreo** — Sentry + PostHog + Vercel Analytics

## Inicio rápido

### 1. Clonar y instalar

```bash
git clone https://github.com/bookstylesv/bookstyles.git
cd bookstyles
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
JWT_SECRET="min-32-chars-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Base de datos

```bash
# Aplicar el schema a tu base de datos
npm run db:push

# Cargar datos de prueba
npm run db:seed
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL (Neon recomendado) |
| `JWT_SECRET` | Clave secreta para tokens JWT (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | Duración del access token (ej: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token (ej: `7d`) |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación |

### Variables opcionales (monitoreo)

| Variable | Descripción |
|----------|-------------|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN de proyecto Sentry |
| `SENTRY_ORG` | Slug de organización en Sentry |
| `SENTRY_PROJECT` | Nombre del proyecto en Sentry |
| `SENTRY_AUTH_TOKEN` | Token para subir source maps |
| `NEXT_PUBLIC_POSTHOG_KEY` | API Key de PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | Host de PostHog (ej: `https://us.i.posthog.com`) |

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:push      # Aplicar schema sin migración (desarrollo)
npm run db:migrate   # Crear migración y aplicar
npm run db:deploy    # Aplicar migraciones en producción
npm run db:studio    # Abrir Prisma Studio (GUI)
npm run db:seed      # Cargar datos demo
```

## Estructura del proyecto

```
src/
  app/
    (auth)/login/         → Login por slug de tenant
    (dashboard)/          → Módulos del ERP (Server Components)
    api/                  → 60+ API Routes REST
    book/[slug]/          → Reservas públicas (sin autenticación)
  components/[modulo]/    → Client Components (UI)
  components/shared/      → Componentes reutilizables
  modules/[modulo]/       → service.ts + repository.ts
  lib/                    → auth, prisma, errors, response helpers
  providers/              → PostHogProvider
prisma/
  schema.prisma           → 25+ modelos, prefijo barber_
```

## Multi-tenant

Cada negocio tiene su propio `slug`. La URL de acceso es:

```
https://tu-dominio.com/login/[slug-del-negocio]
```

El aislamiento de datos se garantiza verificando `tenantId` en cada API route.

## Deploy en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bookstylesv/bookstyles)

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno en el dashboard de Vercel
3. Ejecuta `npm run db:deploy` para aplicar el schema en producción

## Licencia

MIT
