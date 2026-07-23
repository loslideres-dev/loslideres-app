export const ROLES = {
  CLIENTE:   'cliente',
  BODEGUERO: 'bodeguero',
  ADMIN:     'admin',
  CONDUCTOR: 'conductor',
}

export const ROLE_REDIRECT = {
  cliente:   '/cliente/casillero',
  bodeguero: '/bodeguero/recepcion',
  admin:     '/admin/dashboard',
  conductor: '/conductor/entregas',
}

export const ESTADOS_PAQUETE = {
  RECIBIDO:    'RECIBIDO',
  TARIFADO:    'TARIFADO',
  EN_TRANSITO: 'EN_TRANSITO',
  EN_REPARTO:  'EN_REPARTO',
  ENTREGADO:   'ENTREGADO',
}

export const ESTADO_COLORS = {
  RECIBIDO:    { bg: 'bg-sky-100',    text: 'text-sky-700',    label: 'Recibido en bodega' },
  TARIFADO:    { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Tarifado' },
  EN_TRANSITO: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En tránsito' },
  EN_REPARTO:  { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En reparto' },
  ENTREGADO:   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Entregado' },
}

export const TAMANIOS = [
  { value: 'S',  label: 'S — Pequeño',     desc: 'Sobre, celular, caja de zapatos', precio: 20 },
  { value: 'M',  label: 'M — Mediano',     desc: 'Caja hasta ~50 cm por lado',      precio: 30 },
  { value: 'L',  label: 'L — Grande',      desc: 'Caja hasta ~80 cm por lado',      precio: 45 },
  { value: 'XL', label: 'XL — Extra grande', desc: 'Electrodomésticos, bultos',     precio: 60 },
]

export const METODOS_PAGO = ['Efectivo', 'Zelle', 'Transferencia', 'Pago móvil']

export const TIMELINE_ESTADOS = [
  { estado: 'RECIBIDO',    label: 'Recibido en bodega',    field: 'fecha_recepcion' },
  { estado: 'TARIFADO',    label: 'Precio asignado',        field: 'updated_at'      },
  { estado: 'EN_TRANSITO', label: 'En camino a Maracaibo',  field: 'updated_at'      },
  { estado: 'EN_REPARTO',  label: 'En reparto a domicilio', field: 'updated_at'      },
  { estado: 'ENTREGADO',   label: 'Entregado',              field: 'fecha_entrega'   },
]

export const ORDEN_ESTADOS = ['RECIBIDO','TARIFADO','EN_TRANSITO','EN_REPARTO','ENTREGADO']

export const BODEGA_INFO = {
  contacto: 'Jhon Caceres',
  calle:    'Calle 10 #22-46',
  ciudad:   'Maicao, La Guajira, 442001',
  pais:     'Colombia',
  telefono: '+57 300 000 0000',
}
