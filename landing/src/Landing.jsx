import { useState, useEffect, useRef } from 'react';
import './landing.css';
import { rastrearPaquete } from './lib/rastreo';

/* ---------- estados del paquete para el timeline ---------- */
const ESTADOS = [
  { key: 'RECIBIDO',    label: 'Recibido en bodega', desc: 'Tu paquete llegó a Maicao' },
  { key: 'TARIFADO',    label: 'Precio asignado',    desc: 'Listo para despacho' },
  { key: 'EN_TRANSITO', label: 'En tránsito',        desc: 'En camino a Venezuela' },
  { key: 'EN_REPARTO',  label: 'En reparto',         desc: 'Saliendo a tu dirección' },
  { key: 'ENTREGADO',   label: 'Entregado',          desc: '¡Entregado con éxito!' },
];
const labelEstado = (k) => (ESTADOS.find((e) => e.key === k)?.label || k);
const fmtFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};

/* ============================================================
   CONFIGURACIÓN
   Se leen desde variables de entorno VITE_* (Railway / .env),
   con valores por defecto para desarrollo.
   ============================================================ */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const APP_URL  = env.VITE_APP_URL  || 'https://loslideres-app-production.up.railway.app';
const WHATSAPP = env.VITE_WHATSAPP || '584246282123'; // código país + número, sin +
const EMAIL    = env.VITE_EMAIL    || 'soporte@loslideresencomiendas.com';
// Ruta de registro dentro de la app. Ajustable por env si la ruta real cambia.
const REGISTER_URL = `${APP_URL}${env.VITE_REGISTER_PATH || '/registro'}`;

const waLink = (msg) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

/* ---------- iconos (inline, sin dependencias) ---------- */
const Icon = ({ d, size = 20, ...p }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
const IcWarehouse = <Icon d={<><path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8"/><path d="M9 21v-4h6v4"/></>} />;
const IcTruck = <Icon d={<><path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></>} />;
const IcPin = <Icon d={<><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"/><path d="m9.5 11.5 1.8 1.8 3.2-3.4"/></>} />;
const IcBox = <Icon d={<><path d="m12 3 8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/></>} />;
const IcDoc = <Icon d={<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></>} />;
const IcCart = <Icon d={<><path d="M3 4h2l2 12h11"/><path d="M7 16h11l2-8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></>} />;
const IcTruckSm = <Icon d={<><path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></>} />;
const IcSearch = <Icon d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />;
const IcMail = <Icon d={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>} />;
const IcClock = <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />;
const IcCheck = <Icon d={<path d="M5 12.5l4.5 4.5L19 7.5"/>} />;
const IcStoreBox = <Icon size={16} d={<><path d="m12 3 8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/></>} />;
const IcStoreShirt = <Icon size={16} d={<><path d="M6 4l3-1 3 2 3-2 3 1 2 4-3 2v9H7v-9L4 8z"/></>} />;
const IcStoreBag = <Icon size={16} d={<><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>} />;
const IcStoreCart = <Icon size={16} d={<><path d="M3 4h2l2 12h11"/><path d="M7 16h11l2-8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></>} />;

/* ---------- pasos de "Cómo funciona" ---------- */
const STEPS = [
  { ic: IcCart,      n: 'Paso 01', t: 'Compras',            d: 'Compras en Amazon, Shein, Temu o MercadoLibre y las envías a nuestra bodega en Maicao.' },
  { ic: IcWarehouse, n: 'Paso 02', t: 'Recibimos en Maicao', d: 'Recibimos tu paquete, lo registramos y lo fotografiamos al llegar.' },
  { ic: IcTruck,     n: 'Paso 03', t: 'Transportamos',       d: 'Viaja en nuestra ruta segura, con seguimiento en tiempo real desde tu celular.' },
  { ic: IcPin,       n: 'Paso 04', t: 'Entregamos',          d: 'Lo llevamos a tu puerta en Venezuela y confirmamos con foto y hora exacta.' },
];

/* ---------- reveal on scroll ---------- */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal');
    if (!els?.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const rootRef = useReveal();
  const [guia, setGuia] = useState('');

  // Animación de "Cómo funciona": recorre los pasos y los marca en verde en bucle
  const [active, setActive] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setActive(STEPS.length); return; }
    const id = setInterval(() => setActive((a) => (a >= STEPS.length ? 0 : a + 1)), 1200);
    return () => clearInterval(id);
  }, []);

  // Estado del rastreo
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultado, setResultado] = useState(null);

  const rastrear = async () => {
    const code = guia.trim();
    if (!code) { setErrorMsg('Ingresa tu código de rastreo.'); setResultado(null); return; }
    setCargando(true);
    setErrorMsg('');
    setResultado(null);
    const { paquete, error } = await rastrearPaquete(code);
    setCargando(false);
    if (error) { setErrorMsg(error); return; }
    setResultado(paquete);
  };

  return (
    <div className="ll" ref={rootRef}>

      {/* ---------------- HEADER ---------------- */}
      <header className="ll-header">
        <div className="ll-wrap ll-header__inner">
          <a className="ll-brand" href="#inicio" aria-label="Los Líderes Encomiendas — inicio">
            <img className="ll-brand__mark" src="/logo-full.png" alt="Los Líderes Encomiendas" />
            <span className="ll-brand__text">
              <span className="ll-brand__name">Los Líderes</span>
              <span className="ll-brand__slogan">De Colombia a tu puerta</span>
            </span>
          </a>
          <nav className="ll-nav">
            <a href="#inicio">Inicio</a>
            <a href="#servicios">Servicios</a>
            <a href="#tarifas">Tarifas</a>
            <a href="#rastreo">Rastrear</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <div className="ll-header__cta">
            <a className="ll-login" href={APP_URL}>Ingresar</a>
            <a className="ll-btn ll-btn--primary" href={waLink('Hola, quiero cotizar un envío a Venezuela.')}>Cotizar</a>
          </div>
        </div>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="ll-hero" id="inicio">
        <div className="ll-wrap ll-hero__inner">
          <div className="ll-hero__content hero-anim">
            <span className="ll-eyebrow" style={{ color: 'var(--sky)' }}>De Colombia a cualquier lugar de Venezuela</span>
            <h1>Compra afuera,<br /><span className="accent">recibe en Venezuela</span></h1>
            <p className="lead">
              Envía tus compras a nuestra bodega en Maicao y te las llevamos a
              cualquier parte de Venezuela, con rastreo y foto de entrega.
            </p>
            <div className="ll-hero__stores">
              <span className="ll-hero__stores-label">Compra en:</span>
              <span className="ll-chip">{IcStoreBox}Amazon</span>
              <span className="ll-chip">{IcStoreShirt}Shein</span>
              <span className="ll-chip">{IcStoreBag}Temu</span>
              <span className="ll-chip">{IcStoreCart}MercadoLibre</span>
            </div>
            <div className="ll-hero__actions">
              <a className="ll-btn ll-btn--sky" href={waLink('Hola, quiero cotizar un envío a Venezuela.')}>Cotizar envío</a>
              <a className="ll-btn ll-btn--sky" href={REGISTER_URL}>Registrarse</a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- BARRA DE RASTREO (overlap) ---------------- */}
      <div className="ll-wrap ll-trackbar-wrap" id="rastreo">
        <div className="ll-trackbar">
          <span className="ll-trackbar__label">{IcSearch}<span>Rastrea tu paquete:</span></span>
          <input
            value={guia}
            onChange={(e) => setGuia(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && rastrear()}
            placeholder="Tu código de Amazon, courier o ENC-XXXX"
            aria-label="Código de rastreo"
          />
          <button className="ll-btn ll-btn--primary" onClick={rastrear} disabled={cargando}>
            {cargando ? 'Buscando…' : 'Rastrear'}
          </button>
        </div>

        {/* Resultado */}
        {(cargando || errorMsg || resultado) && (
          <div className="ll-tr">
            {cargando && (
              <div className="ll-tr__msg">Buscando tu paquete…</div>
            )}

            {!cargando && errorMsg && (
              <div className="ll-tr__msg ll-tr__msg--error">{errorMsg}</div>
            )}

            {!cargando && resultado && (() => {
              const idx = ESTADOS.findIndex((e) => e.key === resultado.estado);
              const entregado = resultado.estado === 'ENTREGADO';
              return (
                <div className="ll-tr__card">
                  <div className="ll-tr__head">
                    <div>
                      <div className="ll-tr__code-label">Código de rastreo</div>
                      <div className="ll-tr__code">{resultado.tracking_externo || resultado.codigo}</div>
                      {resultado.tamanio && <div className="ll-tr__size">Tamaño {resultado.tamanio}</div>}
                    </div>
                    <span className={`ll-tr__badge${entregado ? ' is-delivered' : ''}`}>{labelEstado(resultado.estado)}</span>
                  </div>

                  <ol className="ll-tr__timeline">
                    {ESTADOS.map((e, i) => {
                      const done = i <= idx;
                      const current = i === idx;
                      return (
                        <li key={e.key} className={`ll-tr__step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}>
                          <span className="ll-tr__dot">{done ? '✓' : i + 1}</span>
                          <span className="ll-tr__step-body">
                            <span className="ll-tr__step-label">{e.label}</span>
                            <span className="ll-tr__step-desc">{e.desc}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  {(resultado.fecha_recepcion || resultado.fecha_estimada || resultado.fecha_entrega) && (
                    <div className="ll-tr__dates">
                      {resultado.fecha_recepcion && (
                        <div><span>Recibido</span><b>{fmtFecha(resultado.fecha_recepcion)}</b></div>
                      )}
                      {resultado.fecha_estimada && !entregado && (
                        <div><span>Entrega estimada</span><b>{fmtFecha(resultado.fecha_estimada)}</b></div>
                      )}
                      {resultado.fecha_entrega && (
                        <div><span>Entregado</span><b>{fmtFecha(resultado.fecha_entrega)}</b></div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ---------------- LOGO DE MARCA (sobre fondo blanco) ---------------- */}
      <div className="ll-wrap" style={{ display: 'flex', justifyContent: 'center', padding: '30px 22px 2px' }}>
        <img src="/logo-full.png" alt="Los Líderes Encomiendas" style={{ height: '192px', width: 'auto' }} />
      </div>

      {/* ---------------- CÓMO FUNCIONA ---------------- */}
      <section className="ll-section" id="como">
        <div className="ll-wrap">
          <div className="ll-section__head reveal">
            <span className="ll-eyebrow">El proceso</span>
            <h2>Cómo funciona</h2>
            <p>Cuatro pasos, sin trámites complicados. Tú compras, nosotros nos encargamos del resto.</p>
          </div>
          <div className="ll-steps ll-steps--4">
            <div className="ll-steps__track"><div className="ll-steps__fill" style={{ width: `${Math.min(active, STEPS.length - 1) / (STEPS.length - 1) * 100}%` }} /></div>
            {STEPS.map((s, i) => {
              const done = i <= active;
              return (
                <div key={i} className={`ll-step${done ? ' is-done' : ''}`}>
                  <div className="ll-step__badge">{done ? IcCheck : s.ic}</div>
                  <span className="ll-step__n">{s.n}</span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- TIENDAS (barra de logos) ---------------- */}
      <section className="ll-brands" aria-label="Tiendas que puedes usar">
        <div className="ll-wrap">
          <ul className="ll-brands__row">
            <li className="ll-brand">
              <img src="/AMAZON.png" alt="Amazon" loading="lazy" />
            </li>
            <li className="ll-brand">
              <img src="/SHEIN.png" alt="Shein" className="ll-brand__tall" loading="lazy" />
            </li>
             <li className="ll-brand">
              <img src="/TEMU.png" alt="Temu" className="ll-brand__tall" loading="lazy" />
            </li>
            <li className="ll-brand">
              <img src="/MERCADOLIBRE.png" alt="MercadoLibre" className="ll-brand__tall" loading="lazy" />
            </li>
          </ul>
        </div>
      </section>

      {/* ---------------- SERVICIOS ---------------- */}
      <section className="ll-section ll-section--soft" id="servicios">
        <div className="ll-wrap">
          <div className="ll-section__head reveal">
            <span className="ll-eyebrow">Qué enviamos</span>
            <h2>Todo lo que necesitas mover</h2>
            <p>De un paquete pequeño a mercancía completa. Empacamos con cuidado y entregamos a tiempo.</p>
          </div>
          <div className="ll-services">
            <div className="ll-svc reveal"><div className="ll-svc__ic">{IcBox}</div><h3>Paquetes y cajas</h3><p>Encomiendas selladas de cualquier tamaño, de S a XL.</p></div>
            <div className="ll-svc reveal"><div className="ll-svc__ic">{IcDoc}</div><h3>Documentos</h3><p>Trámites, contratos y sobres con entrega confirmada.</p></div>
            <div className="ll-svc reveal"><div className="ll-svc__ic">{IcCart}</div><h3>Mercancía</h3><p>Ropa, repuestos, electrodomésticos y más, bien protegidos.</p></div>
            <div className="ll-svc reveal"><div className="ll-svc__ic">{IcTruckSm}</div><h3>Compras</h3><p>¿Compraste en Colombia? Lo recibimos y te lo llevamos.</p></div>
          </div>
        </div>
      </section>

      {/* ---------------- TARIFAS ---------------- */}
      <section className="ll-section" id="tarifas">
        <div className="ll-wrap">
          <div className="ll-section__head reveal">
            <span className="ll-eyebrow">Precios claros</span>
            <h2>Tarifas por tamaño</h2>
            <p>Pagas según el tamaño de tu paquete. Sin costos ocultos — cotiza el tuyo en segundos.</p>
          </div>
          <div className="ll-tarifas">
            <div className="ll-tar reveal">
              <div className="ll-tar__size">S</div><div className="ll-tar__name">Pequeño</div>
              <div className="ll-tar__dim">hasta 30 cm</div>
              <a className="ll-tar__cta" href={waLink('Hola, quiero cotizar un envío tamaño S (pequeño).')}>Cotizar {IcSearch}</a>
            </div>
            <div className="ll-tar reveal">
              <div className="ll-tar__size">M</div><div className="ll-tar__name">Mediano</div>
              <div className="ll-tar__dim">30–50 cm</div>
              <a className="ll-tar__cta" href={waLink('Hola, quiero cotizar un envío tamaño M (mediano).')}>Cotizar {IcSearch}</a>
            </div>
            <div className="ll-tar ll-tar--featured reveal">
              <div className="ll-tar__tag">Más popular</div>
              <div className="ll-tar__size">L</div><div className="ll-tar__name">Grande</div>
              <div className="ll-tar__dim">50–70 cm</div>
              <a className="ll-tar__cta" href={waLink('Hola, quiero cotizar un envío tamaño L (grande).')}>Cotizar {IcSearch}</a>
            </div>
            <div className="ll-tar ll-tar--xl reveal">
              <div className="ll-tar__size">XL</div><div className="ll-tar__name">Extra grande</div>
              <div className="ll-tar__dim">más de 70 cm</div>
              <a className="ll-tar__cta" href={waLink('Hola, quiero cotizar un envío tamaño XL (extra grande).')}>Cotizar {IcSearch}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- TESTIMONIOS ---------------- */}
      <section className="ll-section ll-section--soft">
        <div className="ll-wrap">
          <div className="ll-section__head reveal">
            <span className="ll-eyebrow">Clientes</span>
            <h2>Confían en nosotros</h2>
            <p>Familias y negocios que envían a Venezuela con tranquilidad.</p>
          </div>
          <div className="ll-quotes">
            <div className="ll-quote reveal">
              <div className="ll-quote__stars">★★★★★</div>
              <p>"Llegó rápido y en perfecto estado. Pude seguir todo el trayecto desde el celular."</p>
              <div className="ll-quote__who"><div className="ll-quote__av">MG</div><div><b>María G.</b><span>Maracaibo</span></div></div>
            </div>
            <div className="ll-quote reveal">
              <div className="ll-quote__stars">★★★★★</div>
              <p>"Confiables. Envío seguido a mi familia y siempre llega completo y a tiempo."</p>
              <div className="ll-quote__who"><div className="ll-quote__av">JR</div><div><b>José R.</b><span>Maicao</span></div></div>
            </div>
            <div className="ll-quote reveal">
              <div className="ll-quote__stars">★★★★★</div>
              <p>"Precio claro desde el inicio, sin costos ocultos. La foto de entrega me dio mucha paz."</p>
              <div className="ll-quote__who"><div className="ll-quote__av">AL</div><div><b>Ana L.</b><span>Maracaibo</span></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CTA FINAL ---------------- */}
      <section className="ll-section ll-cta">
        <div className="ll-wrap">
          <h2>¿Listo para enviar a Venezuela?</h2>
          <p>Crea tu cuenta y controla todos tus envíos desde un solo lugar.</p>
          <div className="ll-cta__actions">
            <a className="ll-btn ll-btn--sky" href={APP_URL}>Crear cuenta</a>
            <a className="ll-btn ll-btn--ghost" href={waLink('Hola, quiero información sobre los envíos a Venezuela.')}>Escríbenos por WhatsApp</a>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="ll-footer" id="contacto">
        <div className="ll-wrap">
          <div className="ll-footer__grid">
            <div className="ll-footer__brand">
              <div className="name">Los Líderes <span>Encomiendas</span></div>
              <p>Envíos de Colombia a Venezuela, de Maicao a Maracaibo, con seguimiento en tiempo real.</p>
              <div className="ll-footer__social">
                <a href={waLink('Hola, quiero información sobre los envíos a Venezuela.')} aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12a8 8 0 0 1-11.7 7l-4.3 1 1-4A8 8 0 1 1 20 12z"/><path d="M9 9c0 3 3 6 6 6M9 9c0-.5.5-1 1-1s1.5 2 1.5 2-1 1-.5 1.5 1.5 1.5 1.5 1.5 1.5-1 1.5-1 2 1 2 1"/></svg>
                </a>
                <a href="https://www.instagram.com/loslideresencomiendas" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1"/></svg>
                </a>
                <a href={`mailto:${EMAIL}`} aria-label="Correo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4>Servicios</h4>
              <ul>
                <li><a href="#servicios">Paquetes y cajas</a></li>
                <li><a href="#servicios">Documentos</a></li>
                <li><a href="#servicios">Mercancía</a></li>
                <li><a href="#tarifas">Tarifas</a></li>
              </ul>
            </div>

            <div>
              <h4>Empresa</h4>
              <ul>
                <li><a href="#como">Cómo funciona</a></li>
                <li><a href="#rastreo">Rastrear envío</a></li>
                <li><a href={APP_URL}>Ingresar</a></li>
                <li><a href={APP_URL}>Crear cuenta</a></li>
              </ul>
            </div>

            <div>
              <h4>Contacto</h4>
              <ul className="ll-footer__contact">
                <li>{IcPin}<span>Bodega Maicao, La Guajira, Colombia</span></li>
                <li>{IcPin}<span>Entregas en Maracaibo, Zulia, Venezuela</span></li>
                <li>{IcMail}<span>{EMAIL}</span></li>
                <li>{IcClock}<span>Lun a sáb, 8:00 a.m. – 6:00 p.m.</span></li>
              </ul>
            </div>
          </div>

          <div className="ll-footer__bottom">
            <span>© {new Date().getFullYear()} Los Líderes Encomiendas. Todos los derechos reservados.</span>
            <span>Hecho con cuidado para conectar a Colombia y Venezuela.</span>
          </div>
        </div>
      </footer>

      {/* ---------------- INSTAGRAM FLOTANTE ---------------- */}
      {/* bottom: 92 = 24 del borde + 52 del WA + 16 de gap */}
      <a
        href="https://www.instagram.com/loslideresencomiendas"
        target="_blank"
        rel="noreferrer"
        aria-label="Síguenos en Instagram"
        title="Síguenos en Instagram"
        style={{
          position: 'fixed',
          bottom: 92,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          zIndex: 999,
          transition: 'transform .2s, box-shadow .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.30)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';   e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.22)'; }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none"/>
        </svg>
      </a>

      {/* ---------------- WHATSAPP FLOAT ---------------- */}
      <a className="ll-wa" href={waLink('Hola, quiero información sobre los envíos a Venezuela.')} aria-label="Escríbenos por WhatsApp" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 32 32"><path d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.6 1.9 6.5L4 29l7.2-1.9c1.8 1 3.9 1.6 6 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22.7c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.3 1.1 1.1-4.2-.3-.4a10 10 0 0 1-1.6-5.5C5 9.9 9.9 5 16 5s11 4.9 11 10.5S22.1 25.7 16 25.7zm5.7-7.8c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.3-.7.1a8.3 8.3 0 0 1-2.5-1.5 9.2 9.2 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6s.1-.4 0-.6-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5c.2.3 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z"/></svg>
      </a>
    </div>
  );
}
