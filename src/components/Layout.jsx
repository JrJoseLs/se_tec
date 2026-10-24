import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Symbol, Wordmark } from './Logo.jsx';

const NAV = [
  ['proyectos', 'Proyectos'],
  ['clientes', 'Clientes'],
  ['servicios', 'Servicios'],
  ['origen', 'Origen'],
  ['contacto', 'Contacto'],
];

export function Header({ theme, onToggleTheme, active }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const dark = theme === 'oscuro';
  return (
    <header className={`top${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap top-in">
        <a className="brandlink" href="#/" aria-label="Seshat Technologies, inicio" onClick={() => setOpen(false)}>
          <Wordmark />
        </a>
        <nav className={`nav${open ? ' open' : ''}`} aria-label="Secciones">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-btn" onClick={onToggleTheme} aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
          </button>
          <button className="icon-btn menu-btn" aria-expanded={open} aria-label="Menú" onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'x' : 'menu'} size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer({ content }) {
  const { site } = content;
  const social = (site.social || []).filter((s) => s.url);
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div>
          <div className="foot-name">
            {site.short}
            <br />
            Technologies
          </div>
          <p className="muted">{site.tagline}</p>
        </div>
        <div className="foot-cols">
          <div>
            <div className="label">Contacto</div>
            {site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}
            <span className="muted">{site.location}</span>
          </div>
          {social.length > 0 && (
            <div>
              <div className="label">Redes</div>
              {social.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="wrap foot-base">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <Symbol className="foot-sym" />
      </div>
    </footer>
  );
}

// Aparición suave al entrar en pantalla.
export function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useRef();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal${seen ? ' in' : ''} ${className}`} style={{ '--d': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHead({ num, kicker, title, text }) {
  return (
    <Reveal className="sec-head">
      <div className="sec-num">
        {num} — {kicker}
      </div>
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
    </Reveal>
  );
}
