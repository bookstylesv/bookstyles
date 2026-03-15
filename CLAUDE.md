# Speeddan Barbería ERP — Contexto para Claude

## ¿Qué es este proyecto?
ERP web multi-tenant para gestión de barberías.
Módulos: Citas, Clientes, Servicios, Barberos, Caja, Dashboard con gráficas.

## Acceso rápido

### ERP (producción)
- URL login: `https://speeddan-barberia.vercel.app/login`
- Tenant demo slug: `speeddan-demo`
- Admin: `admin@speeddan.com` | Contraseña: `Admin@2026!`
- Barbero: `barber@speeddan.com` | Contraseña: `Barber@2026!`
- Cliente: `client@speeddan.com` | Contraseña: `Client@2026!`

### Panel que valida suscripciones
- URL: `https://admin-licencias.vercel.app`
- Usuario: `admin` | Contraseña: `admin123`

## Stack técnico
- **Framework**: Next.js 16 App Router + TypeScript
- **UI**: Ant Design v5 (tema claro) + `@ant-design/icons` + `@ant-design/nextjs-registry`
- **Charts**: recharts (dashboard — BarChart últimos 7 días)
- **ORM**: Prisma + Neon PostgreSQL (serverless)
- **Auth**: JWT en cookie `barber_token` (httpOnly)
- **Forms**: react-hook-form + sonner (toasts)
- **Calendario**: FullCalendar (módulo de citas)
- **Color primario**: `#0d9488` (teal)

## Infraestructura
- **Deploy**: Vercel — `speeddan-barberia.vercel.app`
- **GitHub**: `https://github.com/Developer545/Speeddan_Barber.git`
- **BD**: Neon PostgreSQL — `ep-odd-shadow-a4dy2id5-pooler.us-east-1.aws.neon.tech/neondb`
- Ruta local: `C:\ProjectosDev\Speeddan_Barbería\`

## Comandos frecuentes
```bash
npm run dev        # desarrollo (puerto 3000)
npm run build      # build producción
npm run db:seed    # seed datos demo (crea tenant speeddan-demo)
git push origin master  # deploy a Vercel (auto-deploy)
```

## Estructura del proyecto
```
src/
  app/
    (auth)/login/           # login por slug de tenant
    (dashboard)/
      dashboard/            # KPIs + recharts BarChart 7 días
      appointments/         # FullCalendar + antd Table lista
      clients/              # antd Table + KPIs
      services/             # antd Table + filtro categoría
      barbers/              # antd Table + Avatar + Tags especialidades
      billing/              # antd Table + KPIs ingresos + Modal pago
      settings/             # antd Cards + formulario + color HSL
    api/                    # Next.js API Routes
  components/
    shared/
      AntdProvider.tsx      # ConfigProvider teal + AntdRegistry (en dashboard layout)
      SpeedDanTable.tsx     # tabla genérica (legacy, no usar en módulos nuevos)
    dashboard/DashboardClient.tsx   # client component con recharts
    billing/BillingClient.tsx
    clients/ClientsClient.tsx
    services/ServicesClient.tsx
    barbers/BarbersClient.tsx
    appointments/AppointmentForm.tsx  # antd Select con showSearch
  modules/
    appointments/
      appointments.service.ts    # getStats() incluye citasSemana[]
      appointments.repository.ts # countAppointmentsLast7Days()
  lib/
    auth.ts     # getCurrentUser(), verifyToken()
    prisma.ts   # singleton PrismaClient
```

## Modelos Prisma (clave)
- `BarberTenant` — multi-tenant por `slug`
- `BarberUser` — roles: `OWNER`, `BARBER`, `CLIENT`
- `Barber` — perfil + `BarberSchedule` (horarios por día)
- `BarberService` — precio, duración, categoría (cabello/barba/combo/tratamiento)
- `BarberClient` — clientes de la barbería
- `BarberAppointment` — status: `PENDING/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW`
- `BarberPayment` — method: `CASH/CARD/TRANSFER/QR`, status: `PAID/PENDING/REFUNDED`

## API Routes principales
```
GET/POST   /api/appointments          GET/POST   /api/clients
GET/PUT    /api/appointments/[id]     GET/PUT    /api/clients/[id]
POST       /api/appointments/[id]/cancel
GET/POST   /api/barbers               GET/POST   /api/services
GET/POST   /api/billing               GET/PATCH  /api/settings
POST       /api/auth/login            POST       /api/auth/logout
GET        /api/billing/stats         GET        /api/appointments/stats
```

## Convenciones de código (IMPORTANTE)
- Todas las páginas del dashboard son **Server Components** que pasan datos a Client Components
- Los Client Components llevan el sufijo `Client.tsx` (ej. `BillingClient.tsx`)
- Los formularios usan `react-hook-form` + antd `Select` (con `onChange` y `setValue`)
- KPIs siempre con `Row/Col/Card/Statistic` de antd
- `AntdProvider` ya está en el layout — NO volver a envolver con ConfigProvider
- `transpilePackages` en `next.config.ts` incluye antd y todos los `rc-*`

## Patrón para añadir un módulo nuevo
1. Crear `src/app/(dashboard)/nombre/page.tsx` (Server Component — obtiene datos con Prisma)
2. Crear `src/components/nombre/NombreClient.tsx` (Client Component — antd Table + Statistic)
3. Crear `src/app/api/nombre/route.ts` (GET + POST)
4. Añadir link en sidebar (`src/components/shared/Sidebar.tsx` o equivalente)

## Otros proyectos del mismo usuario (Daniel)
- **Speeddansys ERP**: `C:\ProjectosDev\Speeddansys\` → `https://speeddansys.vercel.app`
- **DTE Online ERP**: `C:\ProjectosDev\Facturacion DTE online\` → `https://dte-speeddan.vercel.app`
- El panel `admin-licencias.vercel.app` valida suscripciones de esta app
