# Los Líderes Encomiendas · Changelog


## [0.6.0] — 2026-07-29

### ✨ Módulo de Gerencia (consola desktop)

* **Panel ejecutivo** — corredor Maicao → Maracaibo como línea de estaciones, cifras del mes, detección de atascos y deuda viva pendiente de liquidar.
* **Paquetes** — tabla completa con filtros por etapa, tiempo en etapa con semáforo de colores, buscador y exportación a CSV.
* **SLA y atascos** — cumplimiento por etapa con barras, ciclo completo promedio y tabla de paquetes detenidos ordenada por exceso.
* **Resultados** — estado de resultados mensual, cierre que congela cifras, fondo de reserva configurable y navegación mes a mes.
* **Gastos** — registro de egresos con categoría, monto, moneda, foto del comprobante y marca de gasto informativo (no afecta el reparto).
* **Cierres** — liquidaciones a bodegueros y conductores en formato desktop con desglose comisión vs devolución de fletes.
* **Reparto** — participación de socios con histórico de vigencia, distribuciones por cierre y registro de retiros.
* **Usuarios** — gestión completa con rol Gerente disponible en el selector, sin tocar SQL.
* **Ajustes** — tarifas, pago al bodeguero, fondo de reserva, monedas, tasas de cambio, métodos de pago y categorías de gasto en una sola pantalla.
* **Auditoría** — trazabilidad con ícono por tipo de evento, filtro de solo-dinero y modal con antes/después en JSON.
* **Rol `gerente`** — nuevo rol con acceso exclusivo al módulo. Un admin no puede ver la contabilidad ni el reparto entre socios.

### ✨ Cobro a destino

* El bodeguero puede marcar un paquete como "cobro a destino" al registrarlo, indicando el monto del flete y adjuntando foto de la guía.
* El monto se suma automáticamente a su liquidación como devolución, separado de la comisión.
* El admin ve el aviso y la guía al tarifar, con recordatorio para ajustar el precio.
* El cliente ve una tarjeta ámbar en el detalle de su paquete explicando el cargo.
* El bodeguero ve el desglose en su reporte: comisión de trabajo vs fletes devueltos.

### 🔧 Correcciones

* `DetallePaquete` del cliente ahora scrollea correctamente — el contenido ya no queda cortado por el navbar.
* Botón de volver en `DetallePaquete` con fondo más oscuro, visible sobre cualquier foto.
* Query de `DetallePaquete` cambiada a `paquetes_con_cliente` para exponer los campos de cobro a destino y foto de entrega.

### 🗄️ Base de datos (SQL ejecutados)

* `09_rol_gerente.sql` — funciones `es_admin_o_gerente()` y `es_gerente()`, políticas RLS ampliadas.
* `10_contabilidad.sql` — tablas `categorias_gasto`, `gastos`, `cierres_mensuales`, `socios`, `distribuciones`; funciones `calcular_resultado_mes()` y `cerrar_mes()`; parámetro `fondo_reserva_pct`.
* `11_cobro_destino.sql` — columnas `cobro_destino`, `monto_cobro_destino`, `comprobante_cobro_url` en `paquetes`; desglose en `liquidaciones`; vista y funciones actualizadas.


## [0.5.1] — 2026-07-29

### ✨ Nuevas funcionalidades

* Foto de entrega como comprobante (conductor).
* Infraestructura multi-moneda: monedas, tasas históricas y métodos de pago configurables desde la UI.
* Dirección de entrega congelada al tarifar.

### 🔧 Correcciones

* Header de Entregas unificado para admin.
* Nombre del cliente en el header del Casillero.
* Navbar fijo en la pantalla de Perfil del cliente.
* Bug #48: modal de PaquetesAdmin ya no reabre al cambiar filtro con `?tarificar=`.

### 🗄️ Base de datos

* `07_foto_entrega_y_direccion.sql`, `08_multimoneda.sql`


## [0.5.0] — 2026-07-28

### ✨ Sistema de liquidaciones

* Cierres de pago a conductores (USD) y bodegueros (COP).
* Historial por persona con detalle de paquetes plegable.
* Paquetes marcados atómicamente en Postgres — sin ambigüedad de fechas.
* Reportes de bodeguero y conductor rediseñados: periodo pendiente + historial.
* Reportes del admin en tabs Operativo / Financiero con estado de cuenta.

### 🗄️ Base de datos

* `06_liquidaciones.sql`


## [0.4.2] — 2026-07-28

* Visor de imagen a pantalla completa, botón WhatsApp en Casillero, registro simplificado.


## [0.4.0] — 2026-07-27

* Tracking del courier, flujo de estados por conductor, reporte del negocio con gráficos, editar/eliminar registros del bodeguero.
