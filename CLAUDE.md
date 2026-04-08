# CLAUDE.md — Speeddan Barbería ERP

> **DIRECTIVAS DE SESIÓN** (seguir siempre):
> 1. **CONFIANZA 90%**: Antes de modificar cualquier archivo, si no tengo 90% de certeza de lo que debo hacer, hacer las preguntas necesarias al usuario primero.
> 2. **AGENTES Y SKILLS**: NO usar agentes ni skills automáticamente. Esperar instrucción explícita del usuario.
> 3. **TOKENS**: Leer solo los archivos que la tarea requiera. NO explorar el proyecto al inicio. NO re-leer archivos ya leídos en la sesión.

## Proyecto
ERP web **multi-tenant SaaS** para barberías en El Salvador. Cada barbería = un `BarberTenant` por `slug`.

## URLs y Credenciales
| Servicio | URL | Credenciales |
|----------|-----|-------------|
| ERP Producción | `speeddan-barberia.vercel.app/login` | slug: `speeddan-demo` |
| Demo Admin | — | `admin@speeddan.com` / `Admin@2026!` |
| Demo Barbero | — | `barber@speeddan.com` / `Barber@2026!` |
| Demo Cliente | — | `client@speeddan.com` / `Client@2026!` |
| GitHub | `github.com/Developer545/Speeddan_Barber.git` | — |

## Stack
| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| UI | Ant Design v6 + Tailwind CSS v4 + shadcn/ui |
| Charts | recharts 3 + FullCalendar 6 (citas) |
| Backend | Next.js API Routes + Prisma 7 + Neon PostgreSQL |
| Auth | JWT httpOnly cookies (`barber_token`) + jose + bcryptjs |
| State | @tanstack/react-query 5 + react-hook-form 7 + Zod 4 |
| Color primario | `#0d9488` (teal) |
| Deploy | Vercel auto-deploy desde `master` |

## Estructura
```
src/
  app/
    (auth)/login/               → Login por slug de tenant
    (dashboard)/                → Páginas protegidas (Server Components)
      dashboard/ appointments/ clients/ services/ barbers/
      billing/ pos/ pos-documentos/ pos-turnos/
      inventario/ compras/ proveedores/ cxp/ gastos/ planilla/ settings/
    api/                        → 60+ Route Handlers REST
    book/[slug]/                → Reservas públicas (sin auth)
  components/[modulo]/          → Client Components (*Client.tsx)
  components/shared/            → AntdProvider, KpiCards, PageHeader, ActionButtons
  modules/[modulo]/             → service.ts + repository.ts
  lib/                          → auth.ts, prisma.ts, errors.ts, response.ts
prisma/schema.prisma            → 771 líneas, 25+ modelos, prefijo barber_
```

## Modelos Prisma clave
| Modelo | Propósito |
|--------|-----------|
| `BarberTenant` | Multi-tenant, planes (TRIAL/BASIC/PRO/ENTERPRISE) |
| `BarberUser` | Roles: OWNER/BARBER/CLIENT |
| `Barber` + `BarberSchedule` | Perfiles + horarios |
| `BarberService` | Servicios (precio, duración, categoría) |
| `BarberAppointment` | Citas (6 estados) |
| `BarberTurno` | Turnos caja (ABIERTO/CERRADO) |
| `BarberVenta` + `BarberDetalleVenta` | Ventas POS + líneas |
| `BarberProducto` + `BarberKardex` | Inventario + movimientos |
| `BarberCompra` + `BarberDetalleCompra` | Compras + detalle |
| `BarberPlanilla` + `BarberDetallePlanilla` | Nómina mensual |
| `BarberGasto` + `BarberCategoriaGasto` | Gastos |

## Convenciones (IMPORTANTE)
- Páginas dashboard = **Server Components** que pasan datos a `*Client.tsx`
- `AntdProvider` ya en layout — **NO** envolver con ConfigProvider de nuevo
- KPIs: `Row/Col/Card/Statistic` de antd
- Formularios: `react-hook-form` + antd `Select` con `showSearch`
- NO usar `SpeedDanTable.tsx` (legacy) — usar antd `Table` directo
- Tablas BD prefijadas `barber_` para aislamiento multi-tenant
- **Patrón de módulo completo**: ver `src/modules/gastos/` como referencia

## API — Respuestas estandarizadas
`src/lib/response.ts`: `{ success, data?, error?, pagination? }`
```ts
return ok(data);           // 200
return created(data);      // 201
return apiError(err);      // convierte AppError → respuesta
const { page, limit, skip } = parsePagination(searchParams);
```

## Auth
- `barber_access_token`: JWT HS256, 15 min — `{ sub, tenantId, role, slug, name }`
- `barber_refresh_token`: JWT HS256, 7 días
- Server Components: `getCurrentUser()` → `JwtPayload | null`
- API routes: verificar `tenantId` para aislar datos por tenant

## Comandos
```bash
npm run dev            # desarrollo (puerto 3000)
npm run build          # prisma generate + next build
npm run db:seed        # seed demo (tenant speeddan-demo)
npm run db:studio      # Prisma Studio GUI
npm run db:migrate     # migrate dev
npm run db:deploy      # migrate deploy (producción)
```

## Clases de error (`src/lib/errors.ts`)
| Clase | Status | Uso |
|-------|--------|-----|
| `NotFoundError('Recurso')` | 404 | `findById` retorna null |
| `UnauthorizedError()` | 401 | `getCurrentUser()` retorna null |
| `ForbiddenError()` | 403 | Role sin permiso |
| `ValidationError('msg')` | 422 | Validaciones de negocio |
| `ConflictError('msg')` | 409 | Duplicados, estado inválido |

## DTE (Facturación El Salvador)
- Tipos: Factura (01), CCF (03), Nota Crédito (05)
- Guardados como JSON en `BarberVenta.dteJson`
- Numeración: `BarberCorrelativo` por tipo + año
- Visor: `lib/dte-viewer.ts` + API `/api/pos/venta/[id]/dte`

## Planilla
- Deducciones: ISSS, AFP, Renta, INSAFORP
- Tipos pago: FIJO/POR_DIA/POR_SEMANA/POR_HORA/POR_SERVICIO
- Estados: BORRADOR → APROBADA → PAGADA
