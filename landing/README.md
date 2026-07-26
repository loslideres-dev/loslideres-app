# Los Líderes Encomiendas — Landing comercial

Página web pública (vitrina) de Los Líderes Encomiendas. Proyecto **Vite + React independiente**, listo para desplegar en Railway como un **segundo servicio**, separado de la PWA operativa.

- **Web comercial** (este proyecto): atrae y convence → enlaza a la app.
- **App / PWA** (tu proyecto actual `frontend/`): login, roles, rastreo, operación.

Build verificado con Vite ✅ · Sirve con `serve -s dist` ✅ · Responsive desktop + móvil ✅

---

## Estructura

```
landing/
├── public/
│   ├── hero.jpg          hero desktop (1600px, ~145KB)
│   ├── hero-mob.jpg      hero móvil (900px, ~89KB)
│   ├── logo-full.png     logo completo limpio (sin barra de paleta)
│   └── iconos-mini.png   favicon
├── src/
│   ├── Landing.jsx       componente principal
│   ├── landing.css       estilos (paleta + tipografías de marca)
│   └── main.jsx          entry point
├── index.html            fuentes, favicon, meta SEO/OpenGraph
├── vite.config.js
├── package.json          serve está en dependencies (lo necesita Railway)
├── nixpacks.toml         Node 20 + npm ci + npm run build
├── railway.json          startCommand: serve -s dist -l $PORT
├── .env.example
└── .gitignore
```

Mismo patrón de build/deploy que tu `frontend/`, para que no aprendas nada nuevo.

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

## Despliegue en Railway (piloto)

La landing es un **servicio nuevo** dentro del mismo repo. No toca tu app.

1. Copia esta carpeta `landing/` a la raíz de tu repo `loslideres-app/`, junto a `frontend/`.
2. `git add . && git commit -m "feat: landing comercial" && git push origin main`
3. En Railway, dentro del **mismo proyecto**: **New → GitHub Repo** (el mismo repo).
4. En el nuevo servicio → **Settings**:
   - **Root Directory**: `landing`
   - **Service Name**: `loslideres-landing` (define la URL)
5. **Settings → Networking → Generate Domain**. Queda algo como:
   `https://loslideres-landing-production.up.railway.app`
6. **Variables** (Settings → Variables) — pega las de `.env.example`:

| Variable | Valor piloto |
|----------|--------------|
| `VITE_APP_URL` | `https://loslideres-app-production.up.railway.app` |
| `VITE_TRACK_PATH` | `/rastreo` *(ajusta a tu ruta real)* |
| `VITE_LOGIN_PATH` | `/login` |
| `VITE_REGISTER_PATH` | `/registro` |
| `VITE_WHATSAPP` | tu número (código país + número, sin `+`) |
| `VITE_EMAIL` | tu correo de contacto |

> Las `VITE_*` se compilan en el build, así que si las cambias, Railway redespliega solo (o usa **Redeploy**).

### Las 2 URLs del piloto

| | URL |
|-|-----|
| **Web comercial** | `https://loslideres-landing-production.up.railway.app` |
| **App / PWA** | `https://loslideres-app-production.up.railway.app` |

---

## Cuando compres el dominio

No cambia la arquitectura. En Railway → cada servicio → **Settings → Domains → Custom Domain**:

- `loslideresencomiendas.com` → servicio **landing**
- `app.loslideresencomiendas.com` → servicio **app**

Y en las variables de la landing, cambia:
`VITE_APP_URL = https://app.loslideresencomiendas.com`

Eso es todo.

---

## Pendiente de tu lado (antes de publicar)

- [ ] Poner el **número de WhatsApp real** en `VITE_WHATSAPP`.
- [ ] Confirmar la **ruta de rastreo** de tu PWA y cómo espera la guía (query `?guia=`), y ajustar `VITE_TRACK_PATH`.
- [ ] Reemplazar los **testimonios de ejemplo** por reseñas reales.
- [ ] (Opcional) Mostrar precios reales en Tarifas desde `config_negocio`.

## Notas de marca

- La landing usa **CSS plano, sin Tailwind** — más liviana y no depende de tu config de Tailwind 4.
- El logo del header es una versión limpia de `full_iconos_.png` (sin la barra de colores del brand board). Tu archivo original queda intacto.
- Paleta: navy `#0D2B5E` · azul `#1565C0` · cielo `#4FC3F7` · blanco. Tipos: Archivo, IBM Plex Sans, IBM Plex Mono.
