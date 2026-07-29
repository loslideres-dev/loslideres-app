# Los Líderes Encomiendas — Landing comercial

Página web pública (vitrina) de Los Líderes Encomiendas. Proyecto **Vite + React independiente**, desplegado en Railway como un segundo servicio separado de la app operativa.

- **Web comercial** (este proyecto): atrae y convence → enlaza a la app.
- **App / PWA** (`frontend/`): login, roles, rastreo, operación.

Build verificado con Vite ✅ · Sirve con `serve -s dist` ✅ · Responsive desktop + móvil ✅

---

## URLs en producción

| Servicio | URL |
|----------|-----|
| **Landing** | https://www.loslideresencomiendas.com |
| **App** | https://app.loslideresencomiendas.com |
| **Respaldo landing** | https://loslideres-landing-production.up.railway.app |
| **Respaldo app** | https://loslideres-app-production.up.railway.app |

---

## Estructura

```
landing/
├── public/
│   ├── hero.jpg           hero desktop (1600px, ~145KB)
│   ├── hero-mob.jpg       hero móvil (900px, ~89KB)
│   ├── logo-full.png      logo completo limpio (sin barra de paleta)
│   ├── iconos-mini.png    favicon
│   ├── AMAZON.png         logo Amazon (barra de tiendas)
│   ├── SHEIN.png          logo Shein (barra de tiendas)
│   ├── TEMU.png           logo Temu (barra de tiendas)
│   └── MERCADOLIBRE.png   logo MercadoLibre (barra de tiendas)
├── src/
│   ├── Landing.jsx        componente principal
│   ├── landing.css        estilos (paleta + tipografías de marca)
│   └── main.jsx           entry point
├── index.html             fuentes, favicon, meta SEO/OpenGraph
├── vite.config.js
├── package.json           serve está en dependencies (lo necesita Railway)
├── nixpacks.toml          Node 20 + npm ci + npm run build
├── railway.json           startCommand: serve -s dist -l $PORT
├── .env.example
└── .gitignore
```

---

## Desarrollo local

```bash
cd landing
npm install
cp .env.example .env      # ajusta si quieres
npm run dev               # http://localhost:5173
```

Para probar el build de producción localmente:

```bash
npm run build && npm run preview
```

---

## Variables de entorno

Configuradas en Railway → servicio `loslideres-landing` → Variables. Las `VITE_*` se compilan en el build — si las cambias, hay que redesplegar.

| Variable | Valor actual |
|----------|-------------|
| `VITE_APP_URL` | `https://app.loslideresencomiendas.com` |
| `VITE_WHATSAPP` | `584246282123` (código país + número, sin `+`) |
| `VITE_EMAIL` | `soporte@loslideresencomiendas.com` |
| `VITE_SUPABASE_URL` | `https://kcmasyggaaclpkojohky.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<anon key>` |

---

## Dominio — loslideresencomiendas.com

Dominio registrado en **GoDaddy**. También se posee `loslideresencomienda.com` (sin s) que redirige al principal.

### Registros DNS en GoDaddy

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| CNAME | `www` | `lx5hlmpw.up.railway.app` | 1/2 hora |
| CNAME | `app` | `k1c5bz8k.up.railway.app` | 1/2 hora |
| TXT | `_railway-verify.www` | `railway-verify=bcd28fd46e5863183e48bdd4766511a676d14ac67276d9de152f2d34bd90733f` | 1 hora |
| TXT | `_railway-verify.app` | `railway-verify=a4ffb641be2a02f8bfb72bac753a784cb8bbe4380a47a54a04d80d98094df220` | 1 hora |
| MX | `@` | `mx1.improvmx.com` (prioridad 10) | 1 hora |
| MX | `@` | `mx2.improvmx.com` (prioridad 20) | 1 hora |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | 1 hora |

> ⚠️ Los valores CNAME de Railway pueden cambiar si se elimina y re-agrega el dominio en Railway. Si hay que reconfigurar, verificar los valores actuales en Railway → Settings → Networking → Custom Domain → DNS records.

### Reenvío del raíz

En GoDaddy → DNS → Reenvío → Dominio:
- `loslideresencomiendas.com` → `https://www.loslideresencomiendas.com` (301 Permanente)

### Dominio sin s (`loslideresencomienda.com`)

Solo tiene reenvío configurado:
- `loslideresencomienda.com` → `https://www.loslideresencomiendas.com` (301 Permanente)
- No tiene registros de Railway propios.

---

## Correo — ImprovMX

Correo `info@loslideresencomiendas.com` configurado con **ImprovMX** (plan gratuito). Reenvía a `loslideresencomiendas@gmail.com`.

- Panel: https://improvmx.com
- Los registros MX y SPF ya están en GoDaddy (ver tabla arriba).
- Para agregar más alias: ImprovMX → Aliases → Add alias.

---

## Deploy en Railway

La landing corre como servicio `loslideres-landing` en el mismo proyecto Railway que la app.

- **Plan:** Hobby ($5 USD/mes) — necesario para custom domains sin límite.
- **Root Directory:** `landing`
- **Build:** `nixpacks.toml` (Node 20 + `npm ci` + `npm run build`)
- **Start:** `serve -s dist -l $PORT` (definido en `railway.json`)
- **Deploy automático:** cada `git push origin main` dispara build y despliegue.

### Supabase — URLs de callback

En Supabase → Authentication → URL Configuration → Redirect URLs deben estar:
```
https://app.loslideresencomiendas.com/auth/callback
https://loslideres-app-production.up.railway.app/auth/callback
http://localhost:5173/auth/callback
```

---

## Si el dominio necesita reconfigurarse

Si por alguna razón hay que volver a configurar el dominio en Railway desde cero:

1. Railway → servicio → Settings → Networking → elimina el custom domain.
2. Agrega de nuevo con **+ Custom Domain** → escribe `www.loslideresencomiendas.com`.
3. Railway mostrará nuevos valores CNAME y TXT.
4. Actualiza **solo los registros que cambiaron** en GoDaddy (normalmente solo el CNAME `www`).
5. El TXT `_railway-verify.www` generalmente no cambia — verificar antes de editar.
6. Esperar propagación (5–30 min). Verificar en https://dnschecker.org.

> No borrar y re-agregar el dominio innecesariamente — cada vez Railway puede generar un nuevo CNAME.

---

## Notas de marca

- La landing usa **CSS plano, sin Tailwind** — más liviana y no depende de la config de Tailwind 4 del frontend.
- Paleta: navy `#0D2B5E` · azul `#1565C0` · cielo `#4FC3F7` · blanco · verde entregado `#1B7A3E`.
- Tipografías: Archivo (títulos), IBM Plex Sans (texto), IBM Plex Mono (datos/códigos).
- Los logos de tiendas (`AMAZON.png`, `SHEIN.png`, `TEMU.png`, `MERCADOLIBRE.png`) van en `public/` — nombres en mayúsculas, Linux distingue mayúsculas/minúsculas en producción.

---

## Pendientes

- [ ] Reemplazar testimonios de ejemplo por reseñas reales.
- [ ] (Opcional) Mostrar precios reales en Tarifas desde `config_negocio` via RPC.
- [ ] PWA instalable (resuelve dark mode Samsung + habilita push real).
- [ ] Dominio propio con SSL en el raíz sin GoDaddy forwarding (requiere mover DNS a Cloudflare).
