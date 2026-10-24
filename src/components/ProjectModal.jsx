import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import ProjectArt from './ProjectArt.jsx';
import { Symbol } from './Logo.jsx';
import { STATUS, projectLinks } from '../lib/content.js';

/*
 * Ventana emergente de un proyecto: resumen y vista en vivo de sus páginas
 * públicas. La vista es de solo lectura (iframe en sandbox); para usar el
 * sistema se abre en una pestaña nueva.
 */

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === '/' ? '' : u.pathname.length > 18 ? u.pathname.slice(0, 16) + '…' : u.pathname);
  } catch {
    return url;
  }
}

function LiveView({ links }) {
  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(true);
  const link = links[Math.min(i, links.length - 1)];
  useEffect(() => setLoading(true), [link.url]);
  return (
    <div className="live">
      {links.length > 1 && (
        <div className="seg" role="tablist" aria-label="Páginas públicas">
          {links.map((l, k) => (
            <button key={l.url} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)}>
              {l.label}
            </button>
          ))}
        </div>
      )}
      <div className="browser">
        <div className="browser-bar">
          <span className="dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="browser-url mono">{hostOf(link.url)}</span>
          <a className="browser-open" href={link.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${link.label} en una pestaña nueva`}>
            <Icon name="arrowUpRight" size={16} />
          </a>
        </div>
        <div className="browser-view">
          {loading && (
            <div className="browser-loading">
              <Symbol className="spin-sym" />
              <span className="small muted">Cargando {link.label}…</span>
            </div>
          )}
          <iframe
            key={link.url}
            src={link.url}
            title={link.label}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
      <p className="small muted live-note">Vista pública de solo lectura. Para usarlo, ábrelo en una pestaña nueva.</p>
    </div>
  );
}

export default function ProjectModal({ project: p, onClose }) {
  const links = projectLinks(p);
  const [tab, setTab] = useState('resumen');
  const panel = useRef();
  const paragraphs = String(p.description || '').split(/\n\s*\n/).filter(Boolean);

  useEffect(() => {
    const prev = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll('a[href],button:not([disabled]),iframe,[tabindex="0"]');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${tab === 'vivo' ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={panel} tabIndex={-1}>
        <header className="modal-head">
          <div className="modal-meta">
            <span className="label">{p.kicker}</span>
            <span className={`pill pill-${p.status}`}>
              <i />
              {STATUS[p.status] || p.status}
            </span>
          </div>
          {links.length > 0 && (
            <div className="seg" role="tablist" aria-label="Secciones del proyecto">
              <button role="tab" aria-selected={tab === 'resumen'} className={tab === 'resumen' ? 'on' : ''} onClick={() => setTab('resumen')}>
                Resumen
              </button>
              <button role="tab" aria-selected={tab === 'vivo'} className={tab === 'vivo' ? 'on' : ''} onClick={() => setTab('vivo')}>
                <span className="live-dot" /> Vista en vivo
              </button>
            </div>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="modal-body">
          {tab === 'resumen' ? (
            <div className="modal-sum">
              <div>
                <h2 id="modal-title">{p.name}</h2>
                <p className="modal-tag">{p.tagline}</p>
                <p className="lead">{p.summary}</p>
                {paragraphs.map((t, k) => (
                  <p key={k}>{t}</p>
                ))}
              </div>
              <aside className="modal-side">
                <ProjectArt project={p} />
                {p.highlights?.length > 0 && (
                  <ul className="checks">
                    {p.highlights.map((h) => (
                      <li key={h}>
                        <Icon name="check" size={16} stroke={2.25} />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
                {p.audience && (
                  <div>
                    <div className="label">Para quién</div>
                    <p className="muted small" style={{ margin: '6px 0 0' }}>
                      {p.audience}
                    </p>
                  </div>
                )}
                <div className="modal-actions">
                  {links.length > 0 && (
                    <button className="btn btn-pri" onClick={() => setTab('vivo')}>
                      Vista en vivo <Icon name="eye" size={16} />
                    </button>
                  )}
                  <a className="btn btn-ghost" href={`#/p/${p.slug}`} onClick={onClose}>
                    Página completa
                  </a>
                </div>
              </aside>
            </div>
          ) : (
            <>
              <h2 id="modal-title" className="sr-only">
                {p.name}
              </h2>
              <LiveView links={links} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
