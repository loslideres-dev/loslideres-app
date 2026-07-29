# Los Líderes Encomiendas · Changelog


## [0.5.1] — 2026-07-29

### ✨ Nuevas funcionalidades

* **Foto de entrega** — el conductor puede tomar o subir una foto al marcar un paquete como entregado. Queda como comprobante visible para el cliente en el detalle del paquete y para el admin en el modal. La foto es opcional: si la subida falla por mala señal, la entrega se registra igual.

* **Infraestructura multi-moneda** — el sistema queda preparado para cobrar en COP y VES sin redeplegar. Desde ⚙️ Tarifas el admin puede habilitar monedas, registrar tasas de cambio y crear métodos de pago atados a cada moneda. Hoy solo USD está activo; las demás monedas se activan cuando se necesiten.

* **Métodos de pago configurables desde la BD** — los cuatro métodos anteriores (Efectivo, Zelle, Transferencia, Pago móvil) migran a la tabla `metodos_pago`. Crear, renombrar o deshabilitar un método ya no requiere código ni redespliegue.

* **Tasas de cambio históricas** — cada tasa queda registrada con fecha. Al cobrar en otra moneda la tasa se congela en el paquete (`tasa_aplicada`, `monto_cobrado_usd`), así los reportes históricos no cambian si la tasa cambia después.

* **Reporte financiero con multi-moneda** — el desglose de métodos de pago ahora muestra el monto cobrado en cada moneda y su equivalente en USD, con total consolidado. Nuevo hook `usePagos.js` con helpers de conversión.

### 🔧 Mejoras

* **Dirección congelada al tarifar** — la dirección de entrega se copia al paquete cuando el admin tarifa. Si el cliente cambia su dirección después, el conductor no ve la dirección nueva a mitad de camino. Los paquetes existentes se migraron con la dirección actual de cada cliente.

* **Header de Entregas unificado para admin** — cuando el admin entra a la pantalla de Entregas, el header ahora es idéntico al del resto de pantallas de administración: "ADMINISTRACIÓN", título, engranaje de tarifas, campanita y avatar.

* **Nombre del cliente en header del Casillero** — el título "Mi casillero" reemplazado por el nombre real del cliente.

* **Navbar fijo en la pantalla de Perfil del cliente** — el área del formulario ahora scrollea independientemente, el navbar queda anclado abajo.

* **Bug #48 corregido** — el modal de PaquetesAdmin ya no se vuelve a abrir solo al cambiar de filtro cuando hay `?tarificar=` en la URL. Se aplica la bandera `modalAbiertoAuto` propuesta en el backlog.

### 🗄️ Base de datos (SQL ejecutados)

* `07_foto_entrega_y_direccion.sql` — columnas `foto_entrega_url` y `direccion_entrega` en `paquetes`; backfill de dirección para paquetes existentes; vista `paquetes_con_cliente` recreada.
* `08_multimoneda.sql` — tablas `monedas`, `tasas_cambio`, `metodos_pago`; columnas `metodo_pago_id`, `moneda_cobro`, `tasa_aplicada`, `monto_cobrado_usd` en `paquetes`; función `tasa_vigente()`; migración de datos históricos a USD; vista recreada con joins a las tablas nuevas.


## [0.5.0] — 2026-07-28

### ✨ Nuevas funcionalidades

* **Sistema de liquidaciones (cierres de pago)** — módulo completo para pagar a conductores y bodegueros. Pantalla "Cierres" en el navbar. Tabs Bodegueros / Conductores con total pendiente, lista de personas con saldo, buscador e historial. Modal de liquidación con monto, periodo, notas, paquetes incluidos (plegable) y confirmación en dos pasos. El contador vuelve a cero tras cada cierre; el historial se conserva. Los admins se excluyen de conductores a pagar. Toda la lógica corre en Supabase via funciones `SECURITY DEFINER`.
* **ReporteBodeguero rediseñado** — periodo actual pendiente + historial de liquidaciones con detalle desplegable.
* **ReporteConductor rediseñado** — mismo patrón.
* **ReporteAdmin — Estado de cuenta** — ingresos vs egresos, utilidad y margen, comisiones COP separadas, deuda viva y lo ya pagado.
* **ReporteAdmin — Por persona** — entregas e ingresos por conductor; recepciones y comisión por bodeguero.
* **ReporteAdmin — Tabs Operativo / Financiero** — selector de periodo compartido.
* **Dashboard — sección Gestión** — accesos rápidos a Usuarios y Tarifas.

### 🗄️ Base de datos (SQL ejecutados)

* `06_liquidaciones.sql` — tabla `liquidaciones`, marcas en `paquetes`, índices parciales, RLS, funciones `liquidar_conductor` y `liquidar_bodeguero`, vista `pendientes_liquidacion`.


## [0.4.2] — 2026-07-28

### ✨ Nuevas funcionalidades

* **Visor de imagen a pantalla completa** — componente reutilizable `ImageViewer.jsx`.
* **Botón WhatsApp en Casillero** — contacto directo con mensaje pre-armado.

### 🔧 Mejoras

* Correo y dirección (→ Google Maps) visibles en el detalle de usuario del admin.
* Registro simplificado: solo nombre, correo y contraseña. Teléfono y dirección van al onboarding.


## [0.4.0] — 2026-07-27

### ✨ Nuevas funcionalidades

* Tracking del courier en toda la app + búsqueda por ENC o tracking.
* Flujo de estados rediseñado: EN_TRANSITO lo pone el conductor.
* Método de pago y monto de traslado al tarifar.
* Mapa visible desde la asignación (estado TARIFADO).
* Reporte del negocio con gráficos (Recharts).
* Función RPC de rastreo público para la landing.
* Editar/eliminar registros del bodeguero en estado RECIBIDO.

### 🗄️ Base de datos (SQL ejecutados)

* `05_tracking_externo.sql`, `rastrear_paquete()`, `02_fix_trigger_roles.sql`, `03_rls_bodeguero_editar.sql`.