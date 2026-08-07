# Los Líderes Encomiendas · Changelog


## [1.2.0] — 2026-08-06

### ✨ Teléfonos normalizados

Los teléfonos venían guardados en cinco formatos distintos: `04149600944`, `+5804126467959`, `584146124240`, `4146728600` y el correcto. Los botones de WhatsApp arman el enlace con los dígitos crudos, así que **seis clientes abrían un chat vacío** — fallaba en silencio y nadie se enteraba de que el mensaje nunca salía.

* **Selector de país** en el registro y en el perfil del cliente. El prefijo queda fijo a la izquierda y el usuario solo escribe su número local; la ambigüedad desaparece de raíz en vez de adivinar el país después. Ocho países disponibles, Venezuela por defecto.
* Debajo del campo se muestra en gris cómo va a quedar guardado, y avisa —sin bloquear— si el largo no cuadra con el país o si un móvil venezolano no empieza por 412, 414, 416, 424 o 426.
* Todo se guarda en formato internacional **E.164** (`+58XXXXXXXXXX`).
* **Función `normalizar_telefono()` y backfill**: corrigió 7 registros y dejó intactos los 3 de clientes en el exterior (EE.UU., Chile, Perú), que tienen formato válido de su país.
* **Trigger en `perfiles`**: la validación del formulario guía, pero el trigger garantiza el formato aunque el dato entre por el panel de Supabase o por un script.
* No se agregó `CHECK constraint` a propósito: perder un cliente con un número de un país cuyas reglas no están programadas pesa más que un formato inconsistente.

### 🎨 Legibilidad en móvil

* El texto gris de la app usaba `slate-400`, que da **2.56 de contraste sobre blanco** cuando el mínimo accesible es 4.5. Corregido en todo el módulo del cliente y en la calculadora, subiendo a `slate-500` y `slate-600` según el caso.
* Los textos que van sobre el azul marino se **aclararon** en lugar de oscurecerse: un reemplazo uniforme los habría vuelto ilegibles.
* Los micro-textos de 10px subieron a 11 y 12. Los campos de entrada pasaron a 16px, con lo que Safari en iOS deja de hacer zoom automático al enfocarlos.
* **Login sin scroll**: el bloque medía ~894px y en pantallas de ~780px útiles (Samsung A55) el enlace de "Regístrate" quedaba fuera de vista. Ahora mide 774px. El espacio salió de los márgenes, del relleno de la tarjeta y del pie — el logotipo conserva su tamaño.

### 🗄️ Base de datos (SQL ejecutados)

* `15_normalizar_telefonos.sql` — función de normalización, backfill y trigger.


## [1.1.0] — 2026-08-06

### ✨ Avisados visibles para administración

* **Nuevo tab "Avisados"** en `/admin/paquetes`, junto a Todos. Lista solo los avisos pendientes: el admin ve qué está por llegar sin salir de su pantalla de trabajo.
* Cada aviso es **una línea de resumen** —cliente, casillero, tienda, descripción, estado y número de guías— y el detalle completo se abre en un modal. Con ocho guías por aviso la tarjeta ocupaba media pantalla y volvía imposible escanear la lista, que es justo para lo que sirve.
* Estado explícito **"Pendiente por llegar a bodega"**, en ámbar, o rojo pasados los 30 días.
* Paginado de 15 en 15 con botón "Ver más". El buscador de la pantalla también filtra los avisos, incluido por número de guía.
* Botón para escribirle al cliente por WhatsApp desde el modal.

### ✨ Contacto directo desde la ficha de usuario

* La fila del teléfono en el detalle de usuario ahora lleva un botón de WhatsApp justificado a la derecha. El número sigue sirviendo para llamar.

### 🎨 Paquetes avisados (Gerencia) rediseñado

* La tabla pasó a ancho fijo por columna: **ningún contenido puede desbordarla**, pegue el cliente lo que pegue. Antes una lista de ocho guías separadas por coma rompía la vista.
* Las guías se normalizan y se cuentan; en la tabla se muestra "N guías" y en el modal van **una por línea, numeradas**, en monoespaciada con espaciado entre caracteres para cotejarlas contra las cajas.
* Filas tocables que abren un modal con el detalle completo y las acciones de contactar o descartar, que antes competían por espacio en la tabla.
* Columnas nuevas de **fecha de aviso** y **llegada**: la real para las recibidas, una estimación para las pendientes.
* Se quitó el tab "Sin llegar": se confundía con "Pendientes". Los atrasados siguen distinguiéndose por color y por su métrica propia.

> La estimación de llegada usa una constante de 15 días desde el aviso. Es un
> supuesto, no un dato medido: hacen falta pre-alertas cerradas para calcular
> una mediana real. Está en `DIAS_ESTIMADOS_LLEGADA`.


## [1.0.0] — 2026-08-06

**Primera versión estable.** El negocio opera completo sobre el sistema: desde que
el cliente avisa una compra hasta que se reparte la utilidad entre los socios.

### Qué es el sistema a partir de esta versión

Una aplicación web multi-rol que digitaliza el corredor Maicao → Maracaibo. Cinco
roles con su propia experiencia —cliente, bodeguero, conductor, administración y
gerencia— sobre una sola base de datos con seguridad a nivel de fila.

| Dominio | Qué resuelve |
|---|---|
| **Casillero** | Cada cliente tiene un código LID y una dirección lista para pegar al comprar |
| **Pre-alerta** | El cliente avisa qué viene; la bodega identifica la caja aunque llegue sin código |
| **Recepción** | Registro con foto, medidas, peso y guía del courier; talla sugerida automáticamente |
| **Tarifación** | Precio por tabla editable, con conductor y traslado asignados en una pantalla |
| **Reparto** | Estados rastreables por el cliente, con foto de entrega como comprobante |
| **Cobro a destino** | Fletes que el bodeguero adelanta, reembolsados en su liquidación |
| **Liquidaciones** | Cierres atómicos por persona, marcados por clave foránea y no por fechas |
| **Contabilidad** | Estado de resultados mensual que se congela al cerrar; nunca se recalcula |
| **Socios** | Participación con vigencia histórica y distribuciones por cierre |
| **Cartera** | Quién compra, cuánto, cada cuánto, y quién se enfrió |

### Principios que quedan fijados en 1.0.0

* **Las cifras cerradas no se recalculan.** Un mes cerrado conserva su tasa de cambio y sus montos, pase lo que pase después.
* **Una sola fuente de verdad por concepto.** `lib/tallas.js` para el tamaño, `gastos` para el dinero que sale, `lib/fechas.js` para el formato de fechas.
* **La seguridad vive en la base de datos, no en la interfaz.** Lo que un rol no puede hacer, lo impide una política de RLS.
* **Lo que es una expectativa no cuenta como operación.** Las pre-alertas viven aparte de `paquetes` para no ensuciar SLA, panel ni reportes.

### ✨ Cambios de esta versión

* **Búsqueda por número de guía en Recepción** — llega una caja con la guía impresa y sin código de casillero: el bodeguero pega la guía y aparece el dueño. Los resultados por guía se muestran sobre los de cliente porque identifican un paquete concreto, no solo una persona. Al elegirlos se salta el modal: la guía ya resolvió cliente y paquete.

### 🔧 Correcciones

* **`Recepcion.jsx` usaba su propia copia de la sugerencia de talla**, ciega al peso. Una caja de 25 cm con 35 kg salía **S ($20)** al recibirla y **XL ($60)** en la calculadora de cotización: se cotizaba un precio y se cobraba otro. Ahora importa de `lib/tallas.js`, la misma fuente que el admin.
* El campo de peso no disparaba el recálculo de talla porque no pasaba por `setMedida`. Sin esto, la corrección anterior habría quedado a medias.


## [0.9.0] — 2026-08-06

### ✨ Ciclo completo de pre-alertas

La v0.8.0 dejó al cliente avisando y a la bodega enterándose por notificación, pero el aviso nunca se cerraba. Esta versión cierra el ciclo.

* **Modal en Recepción** — al seleccionar el casillero, si ese cliente avisó algo, se abre un panel preguntando si el paquete que el bodeguero tiene en la mano es alguno de los avisados. Tomar uno rellena tienda, descripción y guía.
* **La guía va primero y en grande** dentro de cada tarjeta del modal: es el único dato que se puede cotejar contra la etiqueta física de la caja. Con espaciado entre caracteres para comparar sin saltarse ninguno. Si el aviso no trae guía, se dice explícitamente para que el bodeguero sepa con qué otro criterio decidir.
* **Enlace al guardar** — la pre-alerta pasa a `RECIBIDA` con su `paquete_id`. Corre después del registro y en su propio `try`: un fallo aquí nunca puede tumbar el guardado del paquete.
* Banda verde visible durante todo el registro cuando hay un aviso enlazado, con opción de soltarlo sin perder lo ya escrito.
* **"Ninguno, es un paquete nuevo"** es deliberadamente un botón secundario: con el mismo peso visual que las tarjetas se volvería el reflejo automático y la función dejaría de servir.

### ✨ Paquetes avisados (Gerencia)

* **Nueva pantalla `/gerencia/avisados`** con los avisos de todos los clientes.
* Métricas: esperando, con más de 30 días sin llegar, recibidos y **tasa de llegada** — qué proporción de lo avisado termina en bodega.
* Los avisos con más de 30 días muestran botones para **contactar al cliente por WhatsApp** (con un mensaje que ya menciona los días transcurridos y qué avisó) o **descartar**. Los recientes no muestran acciones: todavía pueden llegar solos.
* **Estado `DESCARTADA`**, separado de `CANCELADA`. Si la bodega descartara con el mismo estado que usa el cliente, este vería "Cancelada" en su app y creería que él la canceló. Ahora ve "No llegó".

### ✨ Casillero del cliente

* **"Ver mis paquetes" sube** junto a la tarjeta de avisar, con un badge que cuenta todo lo que no está `ENTREGADO`. Juntas responden las dos preguntas con las que el cliente abre la app: qué viene y dónde está lo suyo.
* **"Cómo comprar" pasa a un modal**, accesible desde una ilustración tocable en la tarjeta de dirección. La explicación queda en el momento de la duda —cuando el cliente mira una dirección ajena y no sabe qué hacer con ella— y la pantalla deja de ser larga.
* La ilustración se sirve desde `public/` y no se importa desde `assets/`: si el archivo faltara, un import rompería el build, mientras que así solo falla la carga y entra un respaldo de texto.

### 🗄️ Base de datos (SQL ejecutados)

* `14_prealertas_descartada.sql` — estado `DESCARTADA` y política de RLS reescrita para dejar explícito que el cliente solo puede cancelar.


## [0.8.0] — 2026-08-06

### ✨ Pre-alertas (cliente avisa qué viene)

* **Nueva pestaña "Avisar"** en la app del cliente: informa tienda, descripción y número de guía de un paquete antes de que llegue a Maicao. La bodega recibe una notificación con el nombre y el casillero de quien avisó.
* Tabla `prealertas` **separada de `paquetes`** a propósito: una pre-alerta es una expectativa y muchas nunca llegan; si vivieran en `paquetes` ensuciarían el corredor del panel, las métricas de SLA y los reportes de gerencia.
* El cliente puede cancelar una pre-alerta pendiente, pero **no marcarla como recibida** — la política de RLS lo impide a nivel de base de datos, no solo en la interfaz.
* Vista `prealertas_con_cliente` e índice por `tracking`, para que la bodega pueda identificar una caja a partir de la guía impresa.
* Tarjeta de acceso en Casillero que cambia según el estado: invita a avisar si no hay nada pendiente, o informa cuántos paquetes se están esperando.
* Paso nuevo en la sección "Cómo comprar" del Casillero, con enlace directo a la pestaña.

### ✨ Header unificado del cliente

* Componente `ClienteHeader` único para las cuatro pantallas. Antes cada una armaba el suyo: en Paquetes no había forma de cerrar sesión y en Perfil no se veían las notificaciones.
* Campana, avatar y salir siempre en la misma posición. El avatar es tocable y lleva al perfil.
* Cuarta pestaña en la barra inferior.
* Tour de bienvenida ampliado a cinco pasos, con la explicación de la pre-alerta.

### ✨ Cartera de clientes (Gerencia)

* **Nueva pantalla `/gerencia/clientes`**: ranking por facturación, ticket promedio, frecuencia de envío y días desde el último paquete.
* Clasificación por actividad — activo (≤45 días), en riesgo (≤90), dormido (>90) y registrados que nunca enviaron.
* Métrica de **concentración top 5**: qué porcentaje de la facturación depende de cinco clientes. Se marca en rojo pasando el 50 %.
* Botón de WhatsApp para reactivar, visible solo en clientes en riesgo o dormidos.
* Exportación a CSV.

### ✨ Usuarios con correo y último acceso

* RPC `usuarios_admin()` que hace el join con `auth.users` validando rol admin o gerente antes de devolver datos. `email` y `last_sign_in_at` no son legibles desde `perfiles` con la anon key.
* Admin: listado paginado en tandas de 15 con botón "Ver más"; el buscador cubre también el correo.
* Gerencia: columna "Último acceso" con semáforo por antigüedad — verde activo, gris tibio, tenue frío.
* Aviso cuando el correo está sin confirmar, que suele ser la causa real de que alguien reporte que no puede entrar.

### 🔧 Correcciones

* **Casillero**: la dirección de envío mostraba el nombre del contacto de bodega en lugar del nombre del cliente, tanto en pantalla como al copiar. Al copiar faltaba además la línea del barrio.
* Tarjeta de dirección resaltada en verde para que se distinga como el dato a copiar.

### 🎨 Landing

* Botón flotante de Instagram junto al de WhatsApp, en SVG inline sin depender de archivos externos.
* Enlace de Instagram del footer apuntando a la cuenta real.

### 🏗️ Técnico

* `lib/fechas.js` — formato de fechas y tiempo relativo compartido entre admin y gerencia.

### 🗄️ Base de datos (SQL ejecutados)

* `12_usuarios_email_login.sql` — función `usuarios_admin()` con validación de rol.
* `13_prealertas.sql` — tabla `prealertas`, vista `prealertas_con_cliente`, RLS por rol e índices.


## [0.7.0] — 2026-07-30

### ✨ Calculadora de cotización

* **Nueva pantalla `/admin/calculadora`** — herramienta de cotización para el admin. Agrega líneas con medidas (largo × ancho × alto) y peso; el sistema sugiere la talla y calcula el subtotal por línea y el total.
* **Regla de talla por volumen y peso** — la talla definitiva es la mayor entre la que sale por el lado más largo y la que sale por el peso. Cortes: S ≤ 30 cm / 5 kg · M ≤ 50 cm / 15 kg · L ≤ 80 cm / 30 kg · XL en adelante. Calibrados contra pedidos reales.
* **Descuento por volumen automático** — 10 % desde 10 cajas en un mismo envío. Se activa solo con un interruptor, y se puede desactivar manualmente si al cliente le corresponde otra condición. Las XL cuentan para llegar al mínimo pero no entran en la base del descuento (su precio es un piso, no un precio cerrado).
* **Lista de precios estándar** — botón verde al inicio de la pantalla que manda la tabla completa S/M/L/XL a WhatsApp, para quien pregunta sin tener medidas todavía. Los precios y los rangos se leen de la tabla `tarifas` en vivo: si subes un precio en Ajustes, el mensaje cambia solo.
* **Mensaje sin emojis fuera del BMP** — los emojis con codepoint > U+FFFF llegan como `\xFFFD` en WhatsApp Desktop (par subrogado roto). El mensaje usa solo caracteres del plano básico; los emojis que escriba el operador en el campo de nombre se limpian antes de enviar.
* **`lib/tallas.js`** — fuente única de verdad para la lógica de tallas. Exporta `sugerirTalla()`, `tallaPorMedidas()`, `tallaPorPeso()` y las constantes de descuento. `Recepcion.jsx` puede importar de aquí en lugar de mantener su propia copia.
* **Dashboard rediseñado** — los 4 contadores de estado pasaron de tarjetas apiladas a una grilla compacta de 4 columnas; libera espacio para los accesos de gestión. La calculadora aparece primero en la sección GESTIÓN.

### 🔧 Sin SQL

Esta versión no toca la base de datos.


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
