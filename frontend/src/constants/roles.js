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
  RECIBIDO:   'RECIBIDO',
  TARIFADO:   'TARIFADO',
  EN_TRANSITO:'EN_TRANSITO',
  EN_REPARTO: 'EN_REPARTO',
  ENTREGADO:  'ENTREGADO',
}

export const ESTADO_COLORS = {
  RECIBIDO:    { bg: 'bg-sky-100',    text: 'text-sky-700',    label: 'Recibido en bodega' },
  TARIFADO:    { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Tarifado' },
  EN_TRANSITO: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En tránsito' },
  EN_REPARTO:  { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En reparto' },
  ENTREGADO:   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Entregado' },
}

export const TAMANIOS = ['S', 'M', 'L', 'XL']

export const METODOS_PAGO = ['Efectivo', 'Zelle', 'Transferencia', 'Pago móvil']