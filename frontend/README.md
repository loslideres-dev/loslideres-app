# Los Líderes Encomiendas 📦
> App multi-rol para gestión de encomiendas puerta a puerta, de Maicao (Colombia) a Maracaibo (Venezuela)

![Status](https://img.shields.io/badge/status-estable-brightgreen)
![Version](https://img.shields.io/badge/version-v1.1.0-brightgreen)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Supabase%20%7C%20Railway-orange)

## URLs en producción

| Servicio | URL |
|---|---|
| **App** | https://app.loslideresencomiendas.com |
| **Landing** | https://www.loslideresencomiendas.com |
| **Gerencia** | https://app.loslideresencomiendas.com/gerencia |

## Stack

- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 — Railway
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Estado**: Zustand + TanStack Query
- **Auth**: Email/Password + Google OAuth
- **Gráficos**: Recharts
- **Mapas**: Google Maps (iframe + navegación)
- **CI/CD**: GitHub + Railway (deploy automático en push a main)

## Roles

| Rol | Acceso |
|---|---|
| **cliente** | Casillero, paquetes, perfil |
| **bodeguero** | Recepción, registros, reporte |
| **conductor** | Entregas, reporte |
| **admin** | Dashboard, paquetes, entregas, cierres, reportes |
| **gerente** | Todo lo anterior + módulo de gerencia desktop |

Un usuario puede tener varios roles simultáneamente.

## Navbar del admin (móvil)

```
Dashboard | Paquetes | Entregas | Cierres | Reportes
```

## Módulo de Gerencia (desktop ≥1024px)

```
Panel | Paquetes | SLA y atascos
      | Resultados | Gastos | Cierres
      | Reparto
      | Usuarios | Ajustes | Auditoría
```

Accesible desde `/gerencia`. Requiere rol `gerente`. En pantallas menores a 1024px muestra un aviso para abrir desde un computador.

## Estados de un paquete

```
RECIBIDO → TARIFADO → EN_TRANSITO → EN_REPARTO → ENTREGADO
```

- **RECIBIDO**: bodeguero lo registra en Maicao con foto, medidas y tracking del courier. Puede tener cobro a destino.
- **TARIFADO**: admin asigna precio, método de pago, conductor y monto de traslado. La dirección se congela aquí.
- **EN_TRANSITO**: conductor lo marca al salir de Maicao.
- **EN_REPARTO**: conductor lo marca al llegar a Maracaibo.
- **ENTREGADO**: conductor registra quién recibió y puede subir foto de entrega.

## Cobro a destino

Cuando un paquete llega con flete por cobrar (Servientrega cobro a destino):

1. El bodeguero marca "cobro a destino", ingresa el monto en COP y toma foto de la guía.
2. El admin ve el aviso al tarifar y ajusta el precio si corresponde.
3. El monto se suma como devolución en la liquidación del bodeguero, separado de su comisión.
4. El cliente ve una tarjeta ámbar en el detalle de su paquete explicando el cargo.

## Pre-alertas

El cliente avisa desde la app que viene un paquete, antes de que llegue a Maicao:
tienda, descripción y número de guía. La bodega recibe una notificación y sabe
qué esperar, lo que permite identificar cajas que lleguen sin el código de casillero.

Viven en la tabla `prealertas`, **separadas de `paquetes`**: una pre-alerta es una
expectativa y muchas nunca llegan. Si vivieran en `paquetes` con un estado propio,
cada aviso fallido ensuciaría el corredor del panel, las métricas de SLA y los
reportes de gerencia.

| Estado | Significado |
|---|---|
| `PENDIENTE` | El cliente avisó y todavía no llega |
| `RECIBIDA` | Llegó y se enlazó con un paquete real (`paquete_id`) |
| `CANCELADA` | El cliente la retiró |

| `DESCARTADA` | Pasaron los días y nunca llegó; la bodega la cerró |

El cliente solo puede cancelar; marcarla como recibida o descartada es potestad
de la bodega y lo impide la política de RLS, no solo la interfaz. `CANCELADA` y
`DESCARTADA` están separadas a propósito: si la bodega usara el mismo estado que
el cliente, este vería "Cancelada" y creería que él la canceló.

**Cierre del ciclo.** Al seleccionar el casillero en `Recepcion.jsx`, si el cliente
tiene avisos pendientes se abre un modal preguntando si el paquete en mano es
alguno de ellos. La guía se muestra primero y en grande porque es el único dato
cotejable contra la etiqueta física. Al guardar, la pre-alerta pasa a `RECIBIDA`
con su `paquete_id`; el enlace corre en su propio `try` para que un fallo nunca
tumbe el registro del paquete.

**Dónde se consultan.** Administración ve las pendientes en el tab *Avisados* de
`/admin/paquetes`, en formato resumen con detalle en modal. Gerencia las ve todas
en `/gerencia/avisados`, con métricas y tasa de llegada. Pasados 30 días se marcan
como atrasadas y ofrecen contactar al cliente por WhatsApp o descartar.

> Las guías se normalizan al mostrarlas: el cliente las pega separadas por coma,
> espacio o salto de línea, y se listan una por línea para poder cotejarlas contra
> las cajas. La fecha estimada de llegada usa una constante de 15 días
> (`DIAS_ESTIMADOS_LLEGADA`) y debe recalcularse desde el historial cuando haya
> suficientes pre-alertas cerradas.

## Cartera de clientes (Gerencia)

Pantalla `/gerencia/clientes`. Facturación, ticket promedio y frecuencia por
cliente, con clasificación por actividad:

| Estado | Días desde el último envío |
|---|---|
| Activo | ≤ 45 |
| En riesgo | 46 – 90 |
| Dormido | > 90 |
| Sin envíos | Registrado, nunca envió |

Incluye concentración top 5 (qué parte del ingreso depende de cinco clientes) y
botón de WhatsApp para reactivar a los que se enfriaron. La agregación corre en
el navegador; superadas unas pocas miles de filas en `paquetes` debe mudarse a
un RPC en Postgres.

## Multi-moneda

El negocio tarifa en USD. La infraestructura soporta COP y VES:

- Métodos de pago atados a una moneda, habilitables desde Ajustes sin redespliegue.
- Tasas de cambio históricas: se congelan al cobrar, los reportes nunca se recalculan.
- `monto_cobrado_usd` en cada paquete es el equivalente en dólares congelado.

## Sistema de liquidaciones

Cada paquete se marca con `liquidacion_conductor_id` / `liquidacion_bodeguero_id` al liquidarse. Lo pendiente = marca `NULL`. Todo calculado en Postgres via `SECURITY DEFINER` — atómico e inalterable desde el cliente.

Bodegueros cobran: comisión (tarifa × paquetes) + reembolso de fletes de cobro a destino.

## Contabilidad (Gerencia G2)

- Registro de gastos con categoría, moneda y foto del comprobante.
- Gasto informativo: se registra pero no reduce la utilidad distribuible.
- Cierre mensual que congela todas las cifras. Un mes cerrado no cambia.
- Fondo de reserva configurable (% de la utilidad antes de repartir).
- Tasa de cambio registrada al cierre — los meses anteriores no se recalculan.

## Reparto entre socios (Gerencia G3)

- Participación con vigencia histórica: si se renegocia, los meses anteriores conservan el % con que se calcularon.
- Las distribuciones se calculan al cerrar cada mes.
- Registro de retiros por socio.

## Base de datos (tablas principales)

| Tabla / Vista | Descripción |
|---|---|
| `paquetes` | Núcleo. Incluye tracking, foto, dirección congelada, cobro a destino, multi-moneda, marcas de liquidación y cierre. |
| `perfiles` | Usuarios con `roles TEXT[]`, código LID (solo clientes). |
| `monedas` | USD (base activa), COP, VES (inactivas hasta que se necesiten). |
| `metodos_pago` | Atados a moneda. Habilitar sin redespliegue. |
| `tasas_cambio` | Histórico por moneda y fecha. |
| `liquidaciones` | Cierres de pago. Incluye desglose comisión/reembolso para bodegueros. |
| `categorias_gasto` | Categorías editables. "Gastos extras" como comodín. |
| `gastos` | Egresos del negocio con foto de comprobante. |
| `cierres_mensuales` | Snapshot congelado del P&L de cada mes. |
| `socios` | Participación con vigencia histórica. |
| `distribuciones` | Reparto por socio por cierre. |
| `config_negocio` | Parámetros editables sin redespliegue. |
| `notificaciones` | Campanita in-app (RLS: cada quien ve las suyas). |
| `auditoria` | Append-only. Registra quién cambió qué y cuándo. |
| `paquetes_con_cliente` | Vista con join a perfiles, métodos, monedas y todos los campos. |
| `pendientes_liquidacion` | Vista: lo que se le debe a cada persona ahora mismo. |
| `rastrear_paquete()` | RPC pública para la landing (sin datos sensibles). |
| `liquidar_conductor()` | Cierre atómico USD. |
| `liquidar_bodeguero()` | Cierre atómico COP + reembolso de fletes. |
| `calcular_resultado_mes()` | P&L del mes sin guardar (vista previa del cierre). |
| `cerrar_mes()` | Congela cifras, aparta reserva, calcula distribuciones. |
| `es_admin_o_gerente()` | Función de permisos de operación. |
| `es_gerente()` | Función de permisos de gobierno. |
| `tasa_vigente()` | Tasa más reciente de una moneda. |

## Funcionalidades por versión

| Feature | Versión |
|---|---|
| Auth Email/Password + Google OAuth | v0.0.1 |
| Onboarding cliente (tour + perfil + LID) | v0.0.1 |
| Recepción con foto, tracking y medidas | v0.0.1 |
| Entregas con mapa desde la asignación | v0.3.0 |
| Notificaciones in-app por rol y evento | v0.3.0 |
| Tracking del courier + búsqueda doble | v0.4.0 |
| Reporte del negocio con gráficos | v0.4.0 |
| Sistema de liquidaciones | v0.5.0 |
| Reportes Operativo/Financiero, estado de cuenta | v0.5.0 |
| Foto de entrega como comprobante | v0.5.1 |
| Multi-moneda configurable desde la UI | v0.5.1 |
| Módulo de Gerencia desktop (G1–G5) | v0.6.0 |
| Cobro a destino | v0.6.0 |
| Calculadora de cotización con WhatsApp | v0.7.0 |
| Lista de precios estándar por WhatsApp | v0.7.0 |
| Dashboard con stats compactos en grilla | v0.7.0 |
| Pre-alertas: el cliente avisa qué viene | v0.8.0 |
| Header unificado en las 4 pantallas del cliente | v0.8.0 |
| Cartera de clientes en Gerencia | v0.8.0 |
| Correo y último acceso en gestión de usuarios | v0.8.0 |
| Enlace pre-alerta ↔ paquete desde Recepción | v0.9.0 |
| Paquetes avisados en Gerencia | v0.9.0 |
| Búsqueda por número de guía en Recepción | v1.0.0 |
| Tab de Avisados en Paquetes del admin | v1.1.0 |
| Botón de WhatsApp en la ficha de usuario | v1.1.0 |

## Setup local

```bash
git clone https://github.com/loslideres-dev/loslideres-app
cd loslideres-app/frontend
npm install
cp .env.example .env   # completar con credenciales de Supabase
npm run dev
```

### Variables de entorno

```env
VITE_SUPABASE_URL=https://kcmasyggaaclpkojohky.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_APP_VERSION=1.1.0
VITE_APP_NAME=Los Líderes Encomiendas
```

## Deploy

```bash
npm run build          # verificar local primero
git add -A
git commit -m "feat: ..."
git tag vX.Y.Z
git push origin main --tags
```

Railway despliega automáticamente. El build number se genera con `gen-version.js`.

## Migraciones SQL ejecutadas en producción

```
01_inicial.sql              Estructura base
02_fix_trigger_roles.sql    Trigger corregido + limpieza de LIDs
03_rls_bodeguero_editar.sql RLS para editar/eliminar en RECIBIDO
05_tracking_externo.sql     Columna tracking + vista + RPC pública
06_liquidaciones.sql        Sistema de liquidaciones
07_foto_entrega.sql         Foto de entrega + dirección congelada
08_multimoneda.sql          Monedas, tasas, métodos de pago
09_rol_gerente.sql          Rol gerente + funciones de permisos
10_contabilidad.sql         Gastos, cierres, socios, distribuciones
11_cobro_destino.sql        Cobro a destino en bodega
12_usuarios_email_login.sql Función usuarios_admin() con email y último acceso
13_prealertas.sql           Pre-alertas del cliente + vista y RLS
14_prealertas_descartada.sql Estado DESCARTADA para avisos que no llegaron
```

## Roadmap

- **MVP3**: notificaciones automáticas por WhatsApp.
- **PWA**: app instalable, dark mode Samsung, push reales.
- **Gerencia G2+**: tasa de cambio automática, exportaciones PDF.
- **Módulo de taller**: vehículos, mantenimiento, combustible (cuando aplique).

## Lógica de tallas (`lib/tallas.js`)

Fuente única de verdad para la clasificación de paquetes. La talla definitiva es la mayor entre la que sale por el lado más largo y la que sale por el peso (regla de peso facturable):

| Talla | Lado más largo | Peso |
|---|---|---|
| S | ≤ 30 cm | ≤ 5 kg |
| M | ≤ 50 cm | ≤ 15 kg |
| L | ≤ 80 cm | ≤ 30 kg |
| XL | > 80 cm | > 30 kg |

Descuento por volumen: **10 % desde 10 cajas** en un mismo envío. Las XL no entran en la base del descuento (precio a cotizar, no precio cerrado).

Tanto `Recepcion.jsx` (al registrar el paquete) como la calculadora de cotización
del admin importan `sugerirTalla()` de aquí. Es deliberado: si divergieran, se
cotizaría un precio y se cobraría otro.

## Pendientes conocidos

- Dark mode Samsung Internet via WhatsApp (requiere PWA).
- Campo `email` en detalle de usuario del admin (requiere join con `auth.users`).
- Auditoría: los triggers de BD que registran cambios automáticamente están pendientes para G4.


## Autor

| Rol | Responsable |
|---|---|
| Producto + Frontend + Backend + Infraestructura + Procesos | José Francisco Urdaneta |

---

Los Líderes Encomiendas © 2026 — Software privado. Todos los derechos reservados.
