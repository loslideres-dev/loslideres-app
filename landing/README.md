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
│   ├── hero.jpg              hero desktop (1600px, ~145KB)
│   ├── hero-mob.jpg          hero móvil (900px, ~89KB)
│   ├── og-image.jpg          imagen Open Graph 1200×630 px (WhatsApp/Facebook)
│   ├── logo-full.png         logo completo limpio (sin barra de paleta)
│   ├── iconos-mini.png       favicon
│   ├── AMAZON.png
│   ├── SHEIN.png
│   ├── TEMU.png
│   └── MERCADOLIBRE.png
├── src/
│   ├── Landing.jsx           componente principal
│   ├── landing.css           estilos (paleta + tipografías de marca)
│   └── main.jsx              entry point
├── index.html                meta SEO, Open Graph, Twitter Card, Schema.org
├── vite.config.js
├── package.json              serve está en dependencies (lo necesita Railway)
├── nixpacks.toml             Node 20 + npm ci + npm run build
├── railway.json              startCommand: serve -s dist -l $PORT
├── .env.example
└── .gitignore
```

---

## SEO

El `index.html` incluye:

- **Title**: `Los Líderes Encomiendas · Envíos de Colombia a Maracaibo, Venezuela`
- **Meta description**: menciona Amazon, Shein, Temu, MercadoLibre y casillero gratis.
- **`canonical`**: `https://www.loslideresencomiendas.com/`
- **Open Graph completo**: título, descripción, imagen absoluta, locale `es_VE`.
- **Twitter Card**: `summary_large_image`.
- **Schema.org `LocalBusiness`**: dirección Maicao, área de servicio Maracaibo, tarifas S/M/L/XL.

### og-image
La imagen `public/og-image.jpg` (1200×630 px) es lo que aparece al compartir el link en WhatsApp. Generarla desde el hero:
```bash
magick public/hero.jpg -resize 1200x630^ -gravity center -extent 1200x630 public/og-image.jpg
```

### Verificación post-deploy
- Schema.org: https://search.google.com/test/rich-results
- Open Graph: https://developers.facebook.com/tools/debug/

---

## Desarrollo local

```bash
cd landing
npm install
cp .env.example .env
npm run dev               # http://localhost:5173
```

---

## Variables de entorno

| Variable | Valor |
|----------|-------|
| `VITE_APP_URL` | `https://app.loslideresencomiendas.com` |
| `VITE_WHATSAPP` | `584246282123` |
| `VITE_EMAIL` | `info@loslideresencomiendas.com` |
| `VITE_SUPABASE_URL` | `https://kcmasyggaaclpkojohky.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<anon key>` |

---

## Dominio — loslideresencomiendas.com

Registrado en **GoDaddy**. `loslideresencomienda.com` (sin s) redirige al principal.

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

Reenvíos activos en GoDaddy:
- `loslideresencomiendas.com` → `https://www.loslideresencomiendas.com` (301)
- `loslideresencomienda.com` → `https://www.loslideresencomiendas.com` (301)

> ⚠️ Los valores CNAME pueden cambiar si se elimina y re-agrega el dominio en Railway. Verificar en Railway → Settings → Networking antes de editar en GoDaddy.

---

## Correo — ImprovMX

`info@loslideresencomiendas.com` reenvía a `loslideresencomiendas@gmail.com`.
Panel: https://improvmx.com · Los registros MX y SPF ya están en GoDaddy.

---

## Deploy en Railway

- **Root Directory:** `landing`
- **Build:** `nixpacks.toml` (Node 20 + `npm ci` + `npm run build`)
- **Start:** `serve -s dist -l $PORT`
- **Deploy automático:** cada `git push origin main`

### Supabase — URLs de callback

```
https://app.loslideresencomiendas.com/auth/callback
https://loslideres-app-production.up.railway.app/auth/callback
http://localhost:5173/auth/callback
```

---

## Si el dominio necesita reconfigurarse

1. Railway → servicio → Settings → Networking → elimina el custom domain.
2. Agrega de nuevo `www.loslideresencomiendas.com`.
3. Railway muestra nuevos CNAME y TXT → actualiza solo los que cambiaron en GoDaddy.
4. Esperar propagación (5–30 min) → verificar en https://dnschecker.org.

---

## Notas de marca

- CSS plano, sin Tailwind. Prefijo `.ll-*`.
- Paleta: navy `#0D2B5E` · azul `#1565C0` · cielo `#4FC3F7` · blanco · verde `#1B7A3E`.
- Tipografías: Archivo (títulos), IBM Plex Sans (texto), IBM Plex Mono (datos).
- Logos de tiendas en `public/` con nombres en **MAYÚSCULAS** (Linux distingue).

---

## Pendientes

- [ ] Generar `public/og-image.jpg` (1200×630 px) a partir de `hero.jpg`.
- [ ] Actualizar URLs de redes sociales en el `sameAs` del Schema.org.
- [ ] Crear perfil en **Google Business Profile** con ubicación de la bodega en Maicao.
- [ ] Reemplazar testimonios de ejemplo por reseñas reales.
- [ ] (Opcional) Precios en vivo desde `config_negocio` via RPC.
- [ ] PWA instalable.
- [ ] Mover DNS a Cloudflare para resolver el reenvío del raíz sin GoDaddy forwarding.