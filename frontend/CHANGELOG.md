# Los Líderes Encomiendas · Changelog


## [0.4.0](https://github.com/loslideres-dev/loslideres-app/compare/v0.3.10...v0.4.0) (2026-07-28)


### ✨ Nuevas funcionalidades

* rastreo público de paquetes con Supabase (RPC segura + timeline) ([0d4b03a](https://github.com/loslideres-dev/loslideres-app/commit/0d4b03ab0defaed78f2fbc248d39c9a6bd397532))

## [0.4.0] — 2026-07-27

### ✨ Nuevas funcionalidades

* **Tracking del courier** — el bodeguero registra el código externo (Amazon, Servientrega, etc.) al recibir el paquete. Se muestra como código principal en todas las vistas del cliente y conductor; el admin también ve ambos. Búsqueda por ENC o tracking en el panel del admin. Hook `useBuscarPaquete` listo para la página de rastreo público.
* **Flujo de estados rediseñado** — el paso a EN_TRANSITO lo hace el **conductor** (botón "Poner en tránsito" al salir de Maicao). Se eliminó la pantalla de despachar del admin. El conductor ve tres botones según el estado: Poner en tránsito / Iniciar reparto / Marcar entregado.
* **Método de pago al tarifar** — el admin define el método de pago del cliente al momento de tarifar (obligatorio). El conductor al entregar solo registra quién recibió; método y monto ya vienen definidos.
* **Monto de traslado condicional** — al tarifar, el admin ve el campo de monto de traslado solo si asigna un conductor diferente a él mismo; si se asigna a sí mismo, no se pide monto.
* **Mapa desde la asignación** — el conductor ve el mapa y la dirección desde que el paquete le es asignado (estado TARIFADO), no solo en reparto. Facilita la planificación de ruta.
* **Reporte del negocio (admin)** — nueva pantalla de reportes con selector Hoy/Semana/Mes/Todo. Incluye: resumen financiero (ingresos, ganancia neta, pagos en USD separados de COP), operativo (estados, tamaños con gráfico), tendencia (paquetes por día, métodos de pago) y rankings (top conductores, bodegueros y clientes). Usa Recharts para los gráficos.
* **Función RPC de rastreo público** — `rastrear_paquete(codigo)` en Supabase: devuelve solo estado y fechas, sin datos privados. Lista para la landing pública. Accesible sin login vía rol `anon`.
* **Editar / eliminar registros del bodeguero** — en "Mis registros", las tarjetas son clickeables. Si el paquete está en RECIBIDO, el bodeguero puede editar todos los datos (incluida la foto) o eliminar con confirmación. Si ya avanzó de estado, solo puede ver.

### 🔧 Mejoras

* **Navbar del admin reorganizado** — se quitó Tarifas del navbar (ahora es un ícono de engranaje ⚙️ en el header, como "Configuración") y se agregó Reportes al final.
* **Scroll fijo en todos los listados** — header y filtros quedan fijos en pantalla; solo la lista de paquetes/registros hace scroll. Aplicado a cliente, bodeguero, conductor y admin.
* **Campanita de notificaciones en cliente** — NotifBell agregado al header de Casillero y Mis Paquetes.
* **Navbar completo al admin en vista conductor** — cuando el admin entra a /conductor/entregas, el navbar muestra todas sus pestañas de admin (no desaparece el nav).
* **Formulario de creación de usuario simplificado** — se quitaron teléfono y dirección del form (el cliente los completa en el onboarding). El form solo pide nombre, correo, contraseña y rol.
* **Imágenes completas en las cards** — todas las miniaturas de las listas usan `object-contain` (la foto se ve completa de arriba a abajo, sin recorte).
* **Notificaciones usan tracking** — cuando el cliente o conductor reciben una notificación, el mensaje muestra el tracking del courier si existe; si no, el código ENC. Las notificaciones a admins siempre usan el ENC interno.
* **Modal no corta contenido** — z-index subido a `z-[60]` para quedar sobre el navbar; padding inferior con safe-area para que el contenido al final no quede tapado.
* **Prefill en modal del admin** — al abrir el modal de un paquete ya tarifado, los campos de método de pago y monto del conductor se precargan con los valores existentes.

### 🐛 Correcciones

* Import duplicado de `BarChart3` en `ConductorLayout` que rompía el build de Railway.
* El conductor ya no ve el selector de método de pago al entregar (era redundante, el admin lo define al tarifar).
* Total cobrado a clientes eliminado del reporte del conductor (información confidencial del admin).
* Trigger `handle_new_user` corregido: solo genera código de casillero (LID) para clientes; conductores, bodegueros y admins no reciben casillero. Limpieza de casilleros mal asignados a usuarios existentes.

### 🗄️ Base de datos (SQL ejecutados)

* `02_fix_trigger_roles.sql` — trigger corregido + limpieza de casilleros en no-clientes
* `03_rls_bodeguero_editar.sql` — políticas RLS para UPDATE/DELETE del bodeguero en RECIBIDO
* `05_tracking_externo.sql` — columna `tracking_externo` en `paquetes`, índice de búsqueda, vista `paquetes_con_cliente` recreada con el nuevo campo
* `rastrear_paquete(TEXT)` — función RPC pública (GRANT EXECUTE TO anon)
