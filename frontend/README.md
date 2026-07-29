# Los Líderes Encomiendas 📦
> App multi-rol para gestión de encomiendas puerta a puerta, de Maicao (Colombia) a Maracaibo (Venezuela)

![Status](https://img.shields.io/badge/status-beta-blue)
![Version](https://img.shields.io/badge/version-v0.5.0-green)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Supabase%20%7C%20Railway-orange)

## Descripción

Los Líderes Encomiendas digitaliza el negocio de encomiendas de Los Líderes: los paquetes que los clientes compran en tiendas online (Amazon, Shein, Temu) llegan a una bodega en Maicao, se registran con foto, medidas y su tracking del courier, se les asigna un precio, y se entregan a domicilio en Maracaibo.

Es una aplicación web con **cuatro experiencias según el rol** del usuario (cliente, bodeguero, administración y conductor), pensada mobile-first para usarse con una sola mano desde el celular. Existe además una **landing pública** con rastreo de paquetes sin login.

## App en producción

**https://app.loslideresencomiendas.com**

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
| **Cliente** | Ve su código de casillero (LID-XXXX), la dirección de la bodega, y el estado + precio de cada paquete. Recibe notificaciones en cada cambio. Puede contactar a Los Líderes por WhatsApp desde el casillero. |
| **Bodeguero** | Registra los paquetes que llegan a Maicao: foto (cámara o galería), tracking del courier, medidas, peso, y los asigna a un casillero. Puede editar/eliminar registros en estado RECIBIDO. Ve su periodo pendiente y el historial de liquidaciones. |
| **Administración** | Asigna precio, método de pago, conductor y monto de traslado. Gestiona usuarios (desde el Dashboard), tarifas (⚙️), reportes del negocio y liquidaciones de conductores y bodegueros. |
| **Conductor** | Ve los paquetes asignados con mapa y navegación. Marca tránsito, reparto y entrega. Ve su periodo pendiente y el historial de liquidaciones. |

### Estados de un paquete

```
RECIBIDO → TARIFADO → EN_TRANSITO → EN_REPARTO → ENTREGADO
```

## Navbar del admin

```
Dashboard | Paquetes | Entregas | Cierres | Reportes
```

- **Dashboard**: KPIs + cola de tarifación + accesos rápidos a Usuarios y Tarifas
- **Cierres**: liquidaciones a bodegueros y conductores (reemplaza Usuarios en el navbar)

## Sistema de liquidaciones

Cada paquete queda marcado con la liquidación a la que pertenece (`liquidacion_conductor_id` / `liquidacion_bodeguero_id`). Lo pendiente es simplemente lo que tiene marca `NULL`. Esto hace el cálculo atómico y elimina ambigüedades de bordes de fecha.

- Los administradores se excluyen de la lista de conductores (traslado $0).
- La lógica corre en Supabase via `SECURITY DEFINER` — cálculo y marcado son atómicos.
- Bodegueros cobran en COP, conductores en USD. Las monedas nunca se mezclan.

## Estructura del repositorio

```
loslideres-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # AdminLayout, BodegueroLayout, ConductorLayout, ClienteLayout
│   │   │   └── ui/         # Modal, Toast, EstadoBadge, NotifBell, Tour, ImageViewer
│   │   ├── hooks/          # usePaquetes, usePerfiles, useTarifas, useConfig,
│   │   │                   #   useNotificaciones, useReportes, useReporteAdmin,
│   │   │                   #   useLiquidaciones, useVersion
│   │   ├── lib/            # supabase.js, notificar.js, imageUtils.js
│   │   ├── pages/
│   │   │   ├── auth/       # Login, AuthCallback, Onboarding, ForgotPassword, ConfirmarCorreo
│   │   │   ├── cliente/    # Casillero, PaquetesCliente, DetallePaquete, Perfil
│   │   │   ├── bodeguero/  # Recepcion, Registros, ReporteBodeguero
│   │   │   ├── conductor/  # Entregas, ReporteConductor
│   │   │   └── admin/      # Dashboard, PaquetesAdmin, Tarifas, Usuarios,
│   │   │                   #   Liquidaciones, ReporteAdmin
│   │   ├── store/          # authStore (Zustand)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── gen-version.js
│   ├── nixpacks.toml
│   ├── railway.json
│   └── package.json
├── landing/
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
| Bodeguero | Editar/eliminar registros en estado RECIBIDO | v0.3.x |
| Flujo | Estados por conductor (en tránsito / reparto), método de pago al tarifar | v0.4.0 |
| Admin | Reporte del negocio con gráficos: financiero, operativo, tendencias, rankings | v0.4.0 |
| Paquetes | Tracking del courier en toda la app + búsqueda por ENC o tracking | v0.4.0 |
| UX | Visor de imagen a pantalla completa (paquetes en admin, bodeguero y cliente) | v0.4.2 |
| Cliente | Botón WhatsApp de contacto directo desde el casillero | v0.4.2 |
| Auth | Registro simplificado: solo nombre, correo y contraseña | v0.4.2 |
| Liquidaciones | Cierres de pago a conductores (USD) y bodegueros (COP) con historial | v0.5.0 |
| Liquidaciones | Paquetes marcados atómicamente en Supabase — sin ambigüedad de fechas | v0.5.0 |
| Bodeguero/Conductor | Reporte rediseñado: periodo pendiente + historial de liquidaciones | v0.5.0 |
| Admin | Estado de cuenta: ingresos, utilidad, deuda viva, ya pagado | v0.5.0 |
| Admin | Reporte por persona: entregas e ingresos por conductor y bodeguero | v0.5.0 |
| Admin | Reportes en tabs Operativo / Financiero | v0.5.0 |
| Admin | Dashboard con accesos rápidos a Usuarios y Tarifas | v0.5.0 |

## Base de datos (tablas principales)

- `paquetes` — incluye `liquidacion_conductor_id` y `liquidacion_bodeguero_id`
- `liquidaciones` — cierres de pago con tipo, usuario, totales, cantidad y notas
- `perfiles` — usuarios con roles (TEXT[]), código de casillero (solo clientes)
- `tarifas` — precios por tamaño S/M/L/XL
- `notificaciones` — campanita in-app (RLS: cada quien ve las suyas)
- `config_negocio` — tarifa bodeguero por paquete (editable sin redesplegar)
- `auditoria` — registro append-only de acciones
- Vista `paquetes_con_cliente` — join de paquetes con datos del cliente
- Vista `pendientes_liquidacion` — una fila por persona con lo que se le debe ahora
- Función `rastrear_paquete(codigo)` — RPC pública para la landing
- Función `liquidar_conductor(uuid, text)` — cierre atómico para conductores
- Función `liquidar_bodeguero(uuid, text)` — cierre atómico para bodegueros

## Setup local

```bash
git clone https://github.com/loslideres-dev/loslideres-app
cd loslideres-app/frontend
npm install
cp .env.example .env
npm run dev
```

### Variables de entorno

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_APP_VERSION=0.5.0
VITE_APP_NAME=Los Líderes Encomiendas
```

## Deploy

```bash
git add -A
git commit -m "feat: sistema de liquidaciones y reportes financieros"
git tag v0.5.0
git push origin main --tags
```

Deploy automático en Railway al detectar el push a main.

## Roadmap

- MVP3: notificaciones por WhatsApp automáticas.
- PWA instalable (resuelve dark mode de Samsung + habilita push real).
- Protocolos de liquidación cada 15 días (scheduler automático).

## Pendientes conocidos

- Bug menor: en `PaquetesAdmin`, al cambiar de filtro con `?tarificar=` en la URL, el modal puede auto-abrirse (fix propuesto: bandera `modalAbiertoAuto`).
- Módulo de Auditoría oculto del navbar.
- El campo `email` en el detalle de usuario requiere que `useUsuarios` lo incluya desde `perfiles` o via vista de `auth.users`.

## Autor

| Rol | Responsable |
|-----|-------------|
| Producto + Frontend + Backend + Infraestructura | José Francisco Urdaneta |

---

Los Líderes Encomiendas © 2026 — Software privado. Todos los derechos reservados.
