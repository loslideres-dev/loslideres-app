# Los Líderes Encomiendas 📦
> App multi-rol para gestión de encomiendas puerta a puerta, de Maicao (Colombia) a Maracaibo (Venezuela)

![Status](https://img.shields.io/badge/status-beta-blue)
![Version](https://img.shields.io/badge/version-v0.4.0-green)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Supabase%20%7C%20Railway-orange)

## Descripción

Los Líderes Encomiendas digitaliza el negocio de encomiendas de Los Líderes: los paquetes que los clientes compran en tiendas online (Amazon, Shein, Temu) llegan a una bodega en Maicao, se registran con foto, medidas y su tracking del courier, se les asigna un precio, y se entregan a domicilio en Maracaibo.

Es una aplicación web con **cuatro experiencias según el rol** del usuario (cliente, bodeguero, administración y conductor), pensada mobile-first para usarse con una sola mano desde el celular. Existe además una **landing pública** (repo/carpeta hermana) con rastreo de paquetes sin login.

## App en producción

**https://loslideres-app-production.up.railway.app**

## Stack tecnológico

- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 — desplegado en Railway
- **Backend (BaaS)**: Supabase — PostgreSQL + Auth + Storage + Row Level Security
- **Estado**: Zustand (sesión) + TanStack Query (datos del servidor)
- **Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts (reportes del admin)
- **Auth**: Supabase Auth (Email/Password + Google OAuth)
- **Storage**: Supabase Storage (fotos de paquetes, comprimidas a ≤300 KB)
- **Mapas**: Google Maps (iframe embed + navegación)
- **Iconos**: Lucide React
- **CI/CD**: GitHub + Railway (deploy automático en cada push a main)
- **Versionado**: standard-version + Conventional Commits + build number automático

## Roles y flujo

| Rol | Qué hace |
|-----|----------|
| **Cliente** | Ve su código de casillero (LID-XXXX), la dirección de la bodega, y el estado + precio de cada paquete. Recibe notificaciones en cada cambio. |
| **Bodeguero** | Registra los paquetes que llegan a Maicao: foto (cámara o galería), tracking del courier, medidas, peso, y los asigna a un casillero. Puede editar/eliminar registros en estado RECIBIDO. Ve su reporte de recepciones y comisión. |
| **Administración** | Asigna precio, método de pago del cliente, conductor y monto de traslado (todo al tarifar). Gestiona usuarios, tarifas (⚙️) y ve reportes del negocio. Puede marcar entregas. |
| **Conductor** | Ve los paquetes asignados con mapa y navegación desde que se le asignan. Marca "en tránsito" (al viajar) y "en reparto" (al llegar), y registra la entrega. Ve su reporte de entregas. |

Un mismo usuario puede tener varios roles (por ejemplo, un administrador también puede actuar como conductor).

### Estados de un paquete

```
RECIBIDO → TARIFADO → EN_TRANSITO → EN_REPARTO → ENTREGADO
```

1. **RECIBIDO** — el bodeguero lo registra en Maicao (con tracking del courier opcional)
2. **TARIFADO** — administración asigna precio, método de pago, conductor y monto de traslado
3. **EN_TRANSITO** — el conductor lo marca al viajar de Maicao a Maracaibo
4. **EN_REPARTO** — el conductor lo marca al llegar y salir a repartir
5. **ENTREGADO** — el conductor (o admin) registra quién recibió; la fecha es automática

> **Nota de flujo**: el paso a EN_TRANSITO lo hace el **conductor** (no el admin). Al tarifar, el paquete queda asignado y el conductor lo ve de inmediato con su notificación.

## Códigos de paquete

Cada paquete tiene dos códigos:
- **`codigo`** (ENC-XXXX): código interno del sistema, siempre presente.
- **`tracking_externo`**: el código del courier (Amazon, Servientrega, etc.), opcional. Es el que maneja el cliente, así que se muestra como principal en las vistas del cliente/conductor y en sus notificaciones. El rastreo público y el buscador del admin funcionan con cualquiera de los dos.

## Estructura del repositorio

```
loslideres-app/
├── frontend/                    # App multi-rol (React + Vite)
│   ├── public/                  # version.json (generado), logo-full.png
│   ├── src/
│   │   ├── assets/              # logo.png, logo-mini.png, logo-full.png
│   │   ├── components/
│   │   │   ├── layout/         # AdminLayout, BodegueroLayout, ConductorLayout, ClienteLayout
│   │   │   └── ui/             # Modal, Toast, EstadoBadge, NotifBell, Tour
│   │   ├── constants/          # roles, estados, tamaños, métodos de pago
│   │   ├── hooks/              # usePaquetes, usePerfiles, useTarifas, useConfig,
│   │   │                       #   useNotificaciones, useReportes, useReporteAdmin, useVersion
│   │   ├── lib/                # supabase.js, notificar.js, imageUtils.js
│   │   ├── pages/
│   │   │   ├── auth/           # Login, AuthCallback, Onboarding, ForgotPassword, ConfirmarCorreo
│   │   │   ├── cliente/        # Casillero, PaquetesCliente, DetallePaquete, Perfil
│   │   │   ├── bodeguero/      # Recepcion, Registros, ReporteBodeguero
│   │   │   ├── conductor/      # Entregas, ReporteConductor
│   │   │   └── admin/          # Dashboard, PaquetesAdmin, Tarifas, Usuarios, ReporteAdmin
│   │   ├── store/             # authStore (Zustand)
│   │   ├── App.jsx            # Rutas y guards por rol
│   │   └── main.jsx           # Entry point + splash
│   ├── gen-version.js         # Genera version.json (versión + build + commit)
│   ├── nixpacks.toml          # Config de build de Railway
│   ├── railway.json           # Config de deploy de Railway
│   └── package.json
├── landing/                     # Landing pública con rastreo de paquetes (mismo stack)
├── CHANGELOG.md
└── README.md
```

## Funcionalidades

| Módulo | Feature | Versión |
|--------|---------|---------|
| Auth | Login Email/Password y Google OAuth con redirección por rol | v0.0.1 |
| Auth | Registro de cliente + onboarding (tour + perfil + código LID) | v0.0.1 |
| Cliente | Casillero, mis paquetes con filtros, timeline de seguimiento | v0.0.1 |
| Bodeguero | Recepción con foto (cámara/galería), compresión ≤300 KB, sugerencia de tamaño | v0.0.1 |
| Admin | Dashboard, tarifación, gestión de usuarios | v0.0.1 |
| Infra | Deploy en Railway + dominio HTTPS + versionado automático | v0.2.1 |
| Branding | Logo completo en login y splash con animación | v0.2.1 |
| Admin | Tarifas por tamaño en lote + pago configurable al bodeguero | v0.2.1 |
| UX | Modo claro forzado (Samsung Internet) | v0.2.1 |
| Conductor | Módulo de entregas con mapa y navegación a Google Maps | v0.3.0 |
| Notificaciones | Campanita in-app por rol y evento | v0.3.0 |
| Reportes | Reporte de conductor y bodeguero con filtro de fechas | v0.3.0 |
| Admin | Modal de detalle de usuario | v0.3.0 |
| Infra | Build number automático visible en el login | v0.3.1 |
| UX | Scroll fijo (header/filtros), campanita en cliente | v0.3.x |
| Bodeguero | Editar/eliminar registros en estado RECIBIDO | v0.3.x |
| Flujo | Estados por conductor (en tránsito / reparto), método de pago al tarifar | v0.4.0 |
| Admin | Reporte del negocio: financiero, operativo, tendencias, rankings (con gráficos) | v0.4.0 |
| Paquetes | Tracking del courier en toda la app + búsqueda por ENC o tracking | v0.4.0 |
| Conductor | Mapa visible desde que el paquete se asigna | v0.4.0 |

## Notificaciones in-app

Campanita con contador de no leídas en el header, panel deslizable, refresco cada 20 s. Eventos automáticos:

| Evento | Se notifica a |
|--------|---------------|
| Paquete recibido en bodega | Cliente + administradores |
| Paquete tarifado | Cliente + conductor asignado |
| Paquete en tránsito / en reparto | Cliente |
| Paquete entregado | Cliente + administradores |
| Nuevo usuario registrado | Administradores |

> Las notificaciones al cliente y conductor muestran el tracking del courier cuando existe; a los admins se les muestra el código interno ENC. Son notificaciones dentro de la app (no push al teléfono con la app cerrada); el push real requiere PWA instalable + service worker (roadmap).

## Reportes del negocio (admin)

Con selector rápido de periodo (Hoy / Semana / Mes / Todo):
- **Financiero**: ingresos (USD), ganancia neta (ingresos − traslados), pagado a conductores (USD), pagado a bodegueros (COP, separado), ticket promedio.
- **Operativo**: total, entregados, pendientes, tiempo promedio de entrega; dona por estado y barras por tamaño.
- **Tendencia**: paquetes por día y desglose de método de pago.
- **Rankings**: top conductores, bodegueros y clientes.

> USD y COP se mantienen separados (no se mezclan monedas).

## Modelo de precios

- **Tarifa al cliente por tamaño** (USD), editable desde la config de tarifas (⚙️): S, M, L, XL.
- **Pago al bodeguero** (COP), configurable: monto fijo por paquete registrado. Vive en `config_negocio`.

## Setup local

```bash
git clone https://github.com/loslideres-dev/loslideres-app
cd loslideres-app/frontend
npm install
cp .env.example .env   # completa con credenciales de Supabase
npm run dev            # genera version.json automáticamente
```

### Variables de entorno

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_APP_VERSION=0.4.0
VITE_APP_NAME=Los Líderes Encomiendas
```

## Versionado

Conventional Commits + standard-version. El build number se genera en cada `dev`/`build` a partir de la cantidad de commits, y se muestra en el login: `v0.4.0 (build N)`.

```bash
npm run release          # sube versión según commits + regenera version.json
npm run release:minor    # fuerza minor
npm run release:major    # fuerza major
```

Tipos: `feat`, `fix`, `perf`, `refactor`, `chore`, `docs`, `style`, `test`.

## Deploy

Deploy automático en Railway: cada `git push origin main` dispara build y despliegue.

- **Root Directory**: `frontend`
- **Build**: `nixpacks.toml` (Node 20 + `npm ci` + `npm run build`)
- **Start**: `serve -s dist -l $PORT` (`serve` debe estar en `dependencies`)
- Variables `VITE_*` configuradas en el panel de Railway (se compilan en el build).

> **Tip**: corre `npm run build` local antes de cada release para atrapar errores de compilación antes de que Railway falle.

## Base de datos (tablas principales)

- `paquetes` — el corazón del sistema (codigo, tracking_externo, estado, precio, conductor, etc.)
- `perfiles` — usuarios con roles (TEXT[]), código de casillero (solo clientes)
- `tarifas` — precios por tamaño S/M/L/XL
- `notificaciones` — campanita in-app (RLS: cada quien ve las suyas)
- `config_negocio` — configuración editable (tarifa del bodeguero)
- `auditoria` — registro append-only de acciones
- Vista `paquetes_con_cliente` — join de paquetes con datos del cliente (uso interno autenticado)
- Función `rastrear_paquete(codigo)` — RPC pública para la landing (solo datos no sensibles)

## Seguridad

- Auth con JWT vía Supabase. RLS en todas las tablas.
- Cada cliente ve solo sus paquetes; cada conductor solo sus entregas; cada usuario solo sus notificaciones.
- El bodeguero solo edita/elimina paquetes suyos en estado RECIBIDO.
- El rastreo público usa una función RPC que expone solo estado y fechas, nunca datos del cliente ni precios.
- Fotos comprimidas a ≤300 KB en el navegador antes de subir.

## Diseño

Paleta: Blanco `#FFFFFF` · Azul cielo `#4FC3F7` · Azul medio `#1565C0` · Azul marino `#0D2B5E` · Verde entregado `#1B7A3E`. Mobile-first, español, pensada para una sola mano.

## Roadmap

- Página de rastreo público en la landing (en curso).
- MVP2: contabilidad y liquidaciones (cierres por conductor y bodeguero).
- MVP3: notificaciones por WhatsApp automáticas.
- PWA instalable (resuelve dark mode de Samsung + habilita push real).
- Dominio propio.

## Pendientes conocidos

- Bug menor: en `PaquetesAdmin`, al cambiar de filtro con `?tarificar=` en la URL, el modal puede auto-abrirse (fix propuesto: bandera `modalAbiertoAuto`, no aplicado).
- Módulo de Auditoría oculto del navbar (el fix del join está aplicado en el hook, pero se dejó oculto por decisión de producto).
- El paso a EN_TRANSITO por el conductor aplica a paquetes tarifados con el flujo nuevo (v0.4.0+).

## Autor

| Rol | Responsable |
|-----|-------------|
| Producto + Frontend + Backend + Infraestructura | José Francisco Urdaneta |

---

Los Líderes Encomiendas © 2026 — Software privado. Todos los derechos reservados.
