import React, { useEffect, useState } from 'react';
import { openChat } from './chat.js';

const NAV = ['Menú', 'Rewards', 'Café', 'GIFT', 'Ayuda'];

// Temas de ayuda: cada tarjeta abre el asistente con una pregunta sugerida.
const TOPICS = [
  { icon: '🧾', title: 'Mi pedido', text: 'Pedido incompleto, demora o error en tu bebida.', hint: 'Mi pedido llegó incompleto' },
  { icon: '⭐', title: 'Starbucks Rewards', text: 'Estrellas, beneficios y tu café gratis de cumpleaños.', hint: '¿Cómo canjeo mis estrellas?' },
  { icon: '💳', title: 'Tarjeta y GIFT', text: 'Recargas, saldo y tarjetas de regalo.', hint: '¿Cómo reviso el saldo de mi tarjeta?' },
  { icon: '🛵', title: 'Delivery', text: 'Seguimiento y problemas con pedidos a domicilio.', hint: 'Mi delivery no ha llegado' },
  { icon: '📍', title: 'Tiendas y horarios', text: 'Encuentra la tienda más cercana y su horario.', hint: '¿Qué horario tiene la tienda de Providencia?' },
  { icon: '💬', title: 'Reclamos y sugerencias', text: 'Cuéntanos tu experiencia y abrimos un caso.', hint: 'Quiero dejar un reclamo' },
];

const FAQS = [
  { q: '¿Cómo me uno a Starbucks Rewards?', a: 'Descarga la app o regístrate en el sitio con tu correo. Desde tu primera compra registrada empiezas a sumar estrellas.' },
  { q: '¿Cuántas estrellas necesito para un café gratis?', a: 'Depende de la bebida que elijas. Puedes revisar los niveles de canje en la sección Rewards de tu cuenta.' },
  { q: '¿Puedo recargar mi tarjeta Starbucks en línea?', a: 'Sí. Desde la app o tu cuenta puedes recargar con tarjeta de crédito o débito y el saldo queda disponible al instante.' },
  { q: '¿Qué hago si mi pedido de delivery llegó incompleto?', a: 'Escríbele a nuestro asistente con el detalle de tu pedido. Si corresponde, registra un caso para que nuestro equipo te contacte.' },
  { q: '¿Tienen opciones de leche vegetal?', a: 'Sí, contamos con bebida de avena, almendra y soya en la mayoría de nuestras tiendas.' },
  { q: '¿Cómo reservo un espacio en el Smart Lounge?', a: 'Puedes reservar tu espacio de trabajo en la tienda Bandera desde el enlace de reservas. Recuerda revisar las condiciones de uso.' },
];

const PRODUCTS = [
  { name: 'Pumpkin Spice Latte', note: 'De temporada', cup: '#c8743a', foam: '#f3d9b8' },
  { name: 'Caramel Macchiato', note: 'Clásico', cup: '#a8693f', foam: '#f6e7cf' },
  { name: 'Mocha Frappuccino®', note: 'Frío', cup: '#6b4128', foam: '#fbf4ea' },
  { name: 'Matcha Latte', note: 'Sin café', cup: '#7fa65a', foam: '#eef3e3' },
];

function Logo() {
  return (
    <a className="logo" href="#" aria-label="Inicio">
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <circle cx="24" cy="24" r="23" fill="#006241" />
        <circle cx="24" cy="24" r="18" fill="none" stroke="#fff" strokeWidth="1.6" />
        <path d="M15 19h16l-1.6 14a3 3 0 0 1-3 2.6h-6.8a3 3 0 0 1-3-2.6L15 19Z" fill="#fff" />
        <path d="M31 22h2a3 3 0 0 1 0 6h-2.4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <path d="M20 12c1.5 1.5-1.5 3 0 4.5M24 11c1.5 1.5-1.5 3 0 4.5M28 12c1.5 1.5-1.5 3 0 4.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </a>
  );
}

function Cup({ cup, foam, size = 120 }) {
  return (
    <svg viewBox="0 0 120 150" width={size} height={size * 1.25} aria-hidden="true">
      <ellipse cx="60" cy="142" rx="34" ry="5" fill="rgba(0,0,0,.12)" />
      <path d="M26 34h68l-8 100a8 8 0 0 1-8 7H42a8 8 0 0 1-8-7L26 34Z" fill={cup} />
      <path d="M30 70h60l-1.8 26H31.8L30 70Z" fill="#fff" opacity=".92" />
      <circle cx="60" cy="83" r="9" fill="#006241" />
      <rect x="20" y="22" width="80" height="14" rx="5" fill={foam} />
      <rect x="30" y="14" width="60" height="10" rx="4" fill="#fff" />
    </svg>
  );
}

export default function App() {
  const [open, setOpen] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const ask = (hint) => {
    openChat()
      .then(() => hint && setToast(`Prueba escribir o decir: “${hint}”`))
      .catch(() => setToast('El asistente se está cargando. Inténtalo en unos segundos.'));
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Logo />
          <nav className="nav-main">
            {NAV.map((n) => (
              <a key={n} href={n === 'Ayuda' ? '#ayuda' : '#'}>{n}</a>
            ))}
          </nav>
          <div className="nav-right">
            <a href="#" className="store">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" fill="currentColor" /></svg>
              Localizar tienda
            </a>
            <a href="#" className="btn btn-outline-dark">Iniciar sesión</a>
            <a href="#" className="btn btn-dark">Únete</a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <span className="eyebrow">Es época</span>
            <h1>Vuelve el sabor del otoño</h1>
            <p>Pumpkin Spice Latte con espresso, especias de calabaza y crema batida. Disponible por tiempo limitado.</p>
            <div className="hero-actions">
              <a href="#menu" className="btn btn-light">Ver menú</a>
              <button className="btn btn-outline-light" onClick={() => ask('¿Qué bebidas de temporada tienen?')}>Pregúntale al asistente</button>
            </div>
          </div>
          <div className="hero-art">
            <Cup cup="#c8743a" foam="#f3d9b8" size={220} />
          </div>
        </section>

        <section className="band band-cream">
          <div className="band-art">
            <div className="stars">★ ★ ★</div>
          </div>
          <div className="band-text">
            <h2>¡Hola café gratis!</h2>
            <p>Regístrate en Starbucks Rewards, suma estrellas y obtén beneficios.</p>
            <a href="#" className="btn btn-green">Únete aquí</a>
          </div>
        </section>

        <section id="ayuda" className="help">
          <div className="section-head">
            <span className="eyebrow eyebrow-green">Atención al cliente</span>
            <h2>¿En qué te podemos ayudar?</h2>
            <p>Nuestro asistente virtual responde tus dudas al instante, por chat o por voz, y si lo necesitas registra tu caso o te conecta con una persona del equipo.</p>
          </div>
          <div className="topics">
            {TOPICS.map((t) => (
              <button key={t.title} className="topic" onClick={() => ask(t.hint)}>
                <span className="topic-icon" aria-hidden="true">{t.icon}</span>
                <strong>{t.title}</strong>
                <span>{t.text}</span>
                <em>Consultar al asistente →</em>
              </button>
            ))}
          </div>
        </section>

        <section className="assistant">
          <div className="assistant-text">
            <h2>Habla con nosotros, como prefieras</h2>
            <ul>
              <li><b>Escribe</b> tu consulta en el chat.</li>
              <li><b>Activa la voz</b> y conversa con el asistente en español.</li>
              <li><b>Pide hablar con una persona</b> y te transferimos con el equipo de atención.</li>
            </ul>
            <button className="btn btn-light" onClick={() => ask('')}>Iniciar conversación</button>
          </div>
          <div className="assistant-art" aria-hidden="true">
            <div className="bubble bubble-in">Hola, mi pedido llegó sin el Frappuccino 😕</div>
            <div className="bubble bubble-out">Lo siento mucho. ¿Me indicas tu número de pedido para revisarlo?</div>
            <div className="bubble bubble-in">🎙️ Sí, es el 4 5 2 1</div>
          </div>
        </section>

        <section id="menu" className="products">
          <div className="section-head">
            <h2>Favoritos de la temporada</h2>
          </div>
          <div className="product-grid">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="product">
                <div className="product-art"><Cup cup={p.cup} foam={p.foam} /></div>
                <span className="product-note">{p.note}</span>
                <strong>{p.name}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="faq">
          <div className="section-head">
            <h2>Preguntas frecuentes</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`faq-item ${open === i ? 'open' : ''}`}>
                <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                  <span>{f.q}</span>
                  <span className="chev" aria-hidden="true">⌄</span>
                </button>
                {open === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
          <p className="faq-more">
            ¿No encontraste lo que buscabas? <button className="link" onClick={() => ask('')}>Habla con nuestro asistente</button>
          </p>
        </section>

        <section className="band band-green">
          <div className="band-text">
            <h2>¡La Experiencia Starbucks llega a donde tú quieras!</h2>
            <p>Revisa nuestras opciones de delivery.</p>
            <a href="#" className="btn btn-light">Pide aquí</a>
          </div>
          <div className="band-text">
            <h2>Únete a algo más grande</h2>
            <p>Revisa las oportunidades que tenemos para ti.</p>
            <a href="#" className="btn btn-outline-light">Postula aquí</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-cols">
          <div>
            <h4>Sobre nosotros</h4>
            <a href="#">Nuestra historia</a><a href="#">Nuestra misión</a><a href="#">Nuestro café</a><a href="#">Trabaja con nosotros</a>
          </div>
          <div>
            <h4>Impacto social</h4>
            <a href="#">Abastecimiento ético</a><a href="#">Sustentabilidad</a><a href="#">Inclusión, diversidad y equidad</a>
          </div>
          <div>
            <h4>Atención al cliente</h4>
            <a href="#ayuda">Centro de ayuda</a><button className="link" onClick={() => ask('')}>Chatea con nosotros</button>
          </div>
          <div>
            <h4>Experiencia Starbucks</h4>
            <a href="#">Formas de comprar</a><a href="#">Delivery</a>
          </div>
        </div>
        <div className="footer-legal">
          <span>Sitio de demostración de Salesforce Agentforce. No es un sitio oficial ni está afiliado a Starbucks Coffee Company.</span>
        </div>
      </footer>

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
