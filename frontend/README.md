# Los Líderes Encomiendas 📦
> App multi-rol para gestión de encomiendas puerta a puerta, de Maicao (Colombia) a Maracaibo (Venezuela)

![Status](https://img.shields.io/badge/status-beta-blue)
![Version](https://img.shields.io/badge/version-v0.5.1-green)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Supabase%20%7C%20Railway-orange)

## Descripción

Los Líderes Encomiendas digitaliza el negocio de encomiendas de Los Líderes: los paquetes que los clientes compran en tiendas online (Amazon, Shein, Temu) llegan a una bodega en Maicao, se registran con foto, medidas y tracking del courier, se les asigna un precio, y se entregan a domicilio en Maracaibo.

Cuatro experiencias según el rol (cliente, bodeguero, administración y conductor), mobile-first. Landing pública con rastreo sin login en `www.loslideresencomiendas.com`.

## URLs en producción

| Servicio | URL |
|---|---|
| **App** | https://app.loslideresencomiendas.com |
| **Landing** | https://www.loslideresencomiendas.com |
| **Respaldo app** | https://loslideres-app-production.up.railway.app |

## Stack

- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 — Railway
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Estado**: Zustand + TanStack Query
- **Auth**: Email/Password + Google OAuth
- **Gráficos**: Recharts
- **Mapas**: Google Maps (iframe + navegación)
- **CI/CD**: GitHub + Railway (deploy automático en push a main)

## Navbar del admin

```
Dashboard | Paquetes | Entregas | Cierres | Reportes
```

## Roles y flujo

| Rol | Qué hace |
|---|---|
| **Cliente** | Casillero LID-XXXX, dirección de bodega, estado de paquetes, notificaciones, contacto WhatsApp. |
| **Bodeguero** | Recepción con foto + tracking, editar/eliminar en RECIBIDO, reporte de periodo pendiente e historial de liquidaciones. |
| **Administración** | Tarifar, liquidar, gestionar usuarios (desde Dashboard), tarifas y métodos de pago (⚙️), reportes financieros y operativos. |
| **Conductor** | Entregas con mapa desde la asignación, foto de entrega como comprobante, reporte de periodo pendiente e historial de liquidaciones. |

## Estados de un paquete

```
RECIBIDO → TARIFADO → EN_TRANSITO → EN_REPARTO → ENTREGADO
```

El paso a EN_TRANSITO lo hace el **conductor**. La dirección se congela al tarifar.

## Multi-moneda

El negocio opera en USD. La infraestructura soporta COP y VES:

- Tabla `monedas` con toggle de activación.
- Tabla `metodos_pago` atada a una moneda — habilitar/crear desde ⚙️ Tarifas sin redespliegue.
- Tabla `tasas_cambio` con histórico por fecha.
- Al cobrar en otra moneda: tasa congelada en el paquete (`tasa_aplicada`, `monto_cobrado_usd`). Los reportes nunca se recalculan con tasas nuevas.

## Sistema de liquidaciones

Cada paquete se marca con `liquidacion_conductor_id` / `liquidacion_bodeguero_id` al ser liquidado. Lo pendiente = marca `NULL`. Cálculo atómico en Postgres via `SECURITY DEFINER`.

## Funcionalidades

| Módulo | Feature | Versión |
|---|---|---|
| Auth | Login Email/Password + Google OAuth | v0.0.1 |
| Auth | Onboarding cliente (tour + perfil + LID) | v0.0.1 |
| Cliente | Casillero, paquetes con filtros, timeline | v0.0.1 |
| Bodeguero | Recepción foto+tracking, editar/eliminar | v0.0.1 |
| Admin | Dashboard, tarifación, usuarios | v0.0.1 |
| Conductor | Entregas con mapa desde asignación | v0.3.0 |
| Notificaciones | Campanita in-app por rol y evento | v0.3.0 |
| Reportes | Conductor y bodeguero con filtro de fechas | v0.3.0 |
| Paquetes | Tracking del courier + búsqueda doble | v0.4.0 |
| Admin | Reporte del negocio con gráficos Recharts | v0.4.0 |
| UX | Visor de imagen a pantalla completa | v0.4.2 |
| Cliente | Botón WhatsApp de contacto en Casillero | v0.4.2 |
| Liquidaciones | Cierres de pago conductores (USD) y bodegueros (COP) | v0.5.0 |
| Reportes | Tabs Operativo/Financiero, estado de cuenta, por persona | v0.5.0 |
| Conductor | Foto de entrega como comprobante | v0.5.1 |
| Multi-moneda | Monedas, tasas y métodos configurables desde la UI | v0.5.1 |
| Admin | Dirección congelada al tarifar | v0.5.1 |
| UX | Header Entregas unificado para admin | v0.5.1 |
| Cliente | Nombre en header del Casillero, navbar fijo en Perfil | v0.5.1 |

## Base de datos (tablas principales)

| Tabla / Vista | Descripción |
|---|---|
| `paquetes` | Núcleo. Incluye tracking, foto entrega, dirección congelada, marcas de liquidación, cobro multi-moneda. |
| `perfiles` | Usuarios con roles `TEXT[]`, código LID (solo clientes). |
| `monedas` | USD (base), COP, VES. Toggle de activación. |
| `metodos_pago` | Métodos atados a moneda. Habilitar sin redespliegue. |
| `tasas_cambio` | Histórico por moneda y fecha. |
| `liquidaciones` | Cierres de pago con snapshot congelado. |
| `tarifas` | S/M/L/XL en USD. |
| `config_negocio` | Tarifa bodeguero COP, configurable sin redespliegue. |
| `notificaciones` | Campanita in-app (RLS: cada quien ve las suyas). |
| `auditoria` | Append-only. |
| `paquetes_con_cliente` | Vista con join a perfiles, métodos y monedas. |
| `pendientes_liquidacion` | Vista: lo que se le debe a cada persona ahora. |
| `rastrear_paquete()` | RPC pública para la landing (sin datos sensibles). |
| `liquidar_conductor()` | Cierre atómico USD. SECURITY DEFINER. |
| `liquidar_bodeguero()` | Cierre atómico COP. SECURITY DEFINER. |
| `tasa_vigente()` | Tasa más reciente de una moneda. |

## Seguridad

- JWT via Supabase Auth. RLS en todas las tablas.
- Rastreo público solo expone estado y fechas, nunca precio ni datos del cliente.
- Fotos comprimidas a ≤300 KB en el navegador antes de subir.
- Liquidaciones y conversiones de moneda corren en Postgres, nunca en el cliente.

## Setup local

```bash
git clone https://github.com/loslideres-dev/loslideres-app
cd loslideres-app/frontend
npm install
cp .env.example .env
npm run dev
```

## Deploy

```bash
npm run build          # verificar local primero
git add -A
git commit -m "feat: ..."
git tag vX.Y.Z
git push origin main --tags
```

Railway despliega automáticamente al detectar el push a main.

## Roadmap

- **Gerencia**: módulo desktop con contabilidad, distribución a socios, auditoría e inteligencia de negocio. Rol `gerente`. Fases G1–G5.
- **MVP3**: notificaciones automáticas por WhatsApp.
- **PWA**: instalable, dark mode Samsung, push reales.
- **Code splitting**: `React.lazy` antes de Gerencia.

## Pendientes conocidos

- Módulo de Auditoría oculto del navbar (fix del join aplicado en el hook, se dejó oculto por decisión de producto).
- Campo `email` en el detalle de usuario requiere que `useUsuarios` lo incluya desde `perfiles` o via `auth.users`.
- Dark mode Samsung Internet via WhatsApp (solución definitiva requiere PWA).

## Autor

| Rol | Responsable |
|---|---|
| Producto + Frontend + Backend + Infraestructura | José Francisco Urdaneta |

---

Los Líderes Encomiendas © 2026 — Software privado. Todos los derechos reservados.
