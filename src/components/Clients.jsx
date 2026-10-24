import { useMemo, useState } from 'react';
import { Reveal, SectionHead } from './Layout.jsx';
import { Symbol } from './Logo.jsx';
import { asset, visibleClients, visibleProjects } from '../lib/content.js';

/*
 * Constelación de clientes: en el centro el sistema (o Seshat si se ven
 * todos) y alrededor los negocios que lo usan. Pasar el cursor por un nodo o
 * por la lista muestra los datos del cliente.
 */

const VB_W = 600;
const VB_H = 460;
const CX = VB_W / 2;
const CY = VB_H / 2;

function initials(name) {
  const words = String(name || '?')
    .split(/\s+/)
    .filter((w) => /[a-záéíóúñ]/i.test(w) && !/^(de|del|la|el|los|las|y)$/i.test(w));
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function place(n) {
  // Uno o dos anillos según la cantidad.
  const inner = n > 9 ? Math.ceil(n * 0.4) : n;
  return Array.from({ length: n }, (_, i) => {
    const ring = i < inner ? 0 : 1;
    const k = ring ? i - inner : i;
    const total = ring ? n - inner : inner;
    const a = (k / total) * Math.PI * 2 - Math.PI / 2 + (ring ? Math.PI / total : 0);
    const r = ring ? 205 : n > 9 ? 125 : Math.min(175, 110 + n * 12);
    return { x: CX + Math.cos(a) * r * 1.15, y: CY + Math.sin(a) * r * 0.82 };
  });
}

export default function Clients({ content }) {
  const projects = visibleProjects(content);
  const clients = visibleClients(content);
  const byId = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const systems = projects.filter((p) => clients.some((c) => c.system === p.id));
  const [sys, setSys] = useState('todos');
  const [hover, setHover] = useState(null);

  if (!clients.length) return null;

  const list = sys === 'todos' ? clients : clients.filter((c) => c.system === sys);
  const pts = place(list.length);
  const current = byId[sys];
  const hovered = list.find((c) => c.id === hover);
  const hp = hovered ? pts[list.indexOf(hovered)] : null;
  const s = content.clientsSection || {};

  return (
    <section className="sec sec-band" id="clientes">
      <div className="wrap">
        <SectionHead num="02" kicker="Clientes" title={s.title} text={s.text} />

        <div className="clients">
          <Reveal className="cl-stage">
            <div className="cl-filter" role="tablist" aria-label="Filtrar por sistema">
              <button role="tab" aria-selected={sys === 'todos'} className={sys === 'todos' ? 'on' : ''} onClick={() => setSys('todos')}>
                Todos <span>{clients.length}</span>
              </button>
              {systems.map((p) => (
                <button key={p.id} role="tab" aria-selected={sys === p.id} className={sys === p.id ? 'on' : ''} onClick={() => setSys(p.id)}>
                  <i className={`bg-${p.accent}`} />
                  {p.name} <span>{clients.filter((c) => c.system === p.id).length}</span>
                </button>
              ))}
            </div>

            <div className="cl-map">
              <svg viewBox={`0 0 ${VB_W} ${VB_H}`} key={sys} role="img" aria-label={`${list.length} clientes${current ? ` de ${current.name}` : ''}`}>
                <ellipse className="cl-orbit" cx={CX} cy={CY} rx={200} ry={150} />
                <ellipse className="cl-orbit" cx={CX} cy={CY} rx={250} ry={190} />
                {list.map((c, i) => (
                  <line
                    key={`l-${c.id}`}
                    className={`cl-line s-${byId[c.system]?.accent || 'lapis'}${hover === c.id ? ' on' : ''}`}
                    x1={CX}
                    y1={CY}
                    x2={pts[i].x}
                    y2={pts[i].y}
                    style={{ '--d': `${i * 60}ms` }}
                  />
                ))}
                <g className="cl-center">
                  <circle cx={CX} cy={CY} r={50} />
                  {current ? (
                    <text x={CX} y={CY + 16} className="cl-center-txt">
                      {current.name.charAt(0)}
                    </text>
                  ) : (
                    <Symbol size={64} x={CX - 32} y={CY - 34} />
                  )}
                </g>
                {list.map((c, i) => {
                  const acc = byId[c.system]?.accent || 'lapis';
                  return (
                    <g
                      key={c.id}
                      className={`cl-node${hover === c.id ? ' on' : ''}${c.visible === false ? ' hidden' : ''}`}
                      transform={`translate(${pts[i].x} ${pts[i].y})`}
                      style={{ '--d': `${200 + i * 60}ms` }}
                      tabIndex={0}
                      onPointerEnter={() => setHover(c.id)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover(c.id)}
                      onBlur={() => setHover(null)}
                    >
                      <g className="cl-node-in">
                        <circle r={28} className={`cl-dot f-${acc}`} />
                        {c.logo ? (
                          <image href={asset(c.logo)} x={-20} y={-20} width={40} height={40} clipPath="circle(20px)" />
                        ) : (
                          <text y={6} className={`cl-ini${acc === 'oro' ? ' ink' : ''}`}>
                            {initials(c.name)}
                          </text>
                        )}
                      </g>
                    </g>
                  );
                })}
              </svg>
              {current && <div className="cl-center-label">{current.name}</div>}
              {hovered && hp && (
                <div
                  className="cl-tip"
                  style={{ left: `${(hp.x / VB_W) * 100}%`, top: `${(hp.y / VB_H) * 100}%` }}
                  data-below={hp.y < CY ? '' : undefined}
                >
                  <b>{hovered.name}</b>
                  <span>
                    {hovered.sector}
                    {hovered.city && ` · ${hovered.city}`}
                  </span>
                  <span className="cl-tip-sys">
                    Usa <strong>{byId[hovered.system]?.name || hovered.system}</strong>
                    {hovered.since && ` desde ${hovered.since}`}
                  </span>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal className="cl-side" delay={80}>
            <div className="cl-stats">
              <div>
                <b className="mono">{String(list.length).padStart(2, '0')}</b>
                <span>{current ? `usan ${current.name}` : 'clientes'}</span>
              </div>
              <div>
                <b className="mono">{String(new Set(list.map((c) => c.sector)).size).padStart(2, '0')}</b>
                <span>sectores</span>
              </div>
            </div>
            <ul className="cl-list">
              {list.map((c) => {
                const p = byId[c.system];
                return (
                  <li
                    key={c.id}
                    className={hover === c.id ? 'on' : ''}
                    onPointerEnter={() => setHover(c.id)}
                    onPointerLeave={() => setHover(null)}
                  >
                    <span className={`cl-mini bg-${p?.accent || 'lapis'}`}>{initials(c.name)}</span>
                    <div>
                      <b>
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noreferrer">
                            {c.name}
                          </a>
                        ) : (
                          c.name
                        )}
                        {c.visible === false && <em className="cl-hidden">oculto · solo local</em>}
                      </b>
                      <span className="muted small">
                        {c.sector}
                        {c.city && ` · ${c.city}`}
                      </span>
                    </div>
                    <span className="cl-sys small">{p?.name}</span>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
