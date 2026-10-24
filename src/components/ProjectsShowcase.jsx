import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import Dropdown from './Dropdown.jsx';
import Icon from './Icon.jsx';
import ProjectArt from './ProjectArt.jsx';
import ProjectModal from './ProjectModal.jsx';
import { Reveal, SectionHead } from './Layout.jsx';
import { Progress, StatusPill } from './Status.jsx';
import { projectLinks, visibleClients, visibleProjects } from '../lib/content.js';

const Orbit = lazy(() => import('./ProjectOrbit3D.jsx'));

const FILTERS = [
  { value: 'todos', label: 'Todos', test: () => true },
  { value: 'produccion', label: 'En producción', dot: 'fayenza', test: (p) => p.status === 'activo' },
  { value: 'construccion', label: 'En construcción', dot: 'oro', test: (p) => p.status !== 'activo' },
];

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webgl() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// Respaldo sin WebGL: tarjetas planas.
function CardGrid({ list, onOpen }) {
  return (
    <div className="pgrid">
      {list.map((p, i) => (
        <button key={p.id} className="pcard" onClick={() => onOpen(i)}>
          <ProjectArt project={p} />
          <div className="pcard-body">
            <div className="pcard-top">
              <span className="label">{p.kicker}</span>
              <StatusPill status={p.status} />
            </div>
            <h3 className="pcard-name">{p.name}</h3>
            <p className="pcard-tag">{p.tagline}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function ProjectsShowcase({ content, theme }) {
  const all = visibleProjects(content);
  const clients = visibleClients(content);
  const [filter, setFilter] = useState('todos');
  const list = useMemo(() => all.filter(FILTERS.find((f) => f.value === filter).test), [all, filter]);
  const [active, setActive] = useState(() => Math.max(0, list.findIndex((p) => p.featured)));
  const [open, setOpen] = useState(null);
  const [gl] = useState(webgl);

  useEffect(() => setActive((a) => Math.min(a, Math.max(0, list.length - 1))), [list.length]);

  const p = list[active];
  const go = useCallback((d) => setActive((a) => (a + d + list.length) % list.length), [list.length]);
  const close = useCallback(() => setOpen(null), []);
  const used = p ? clients.filter((c) => c.system === p.id).length : 0;

  const onKey = (e) => {
    if (e.key === 'ArrowRight') (e.preventDefault(), go(1));
    if (e.key === 'ArrowLeft') (e.preventDefault(), go(-1));
  };

  const options = FILTERS.map((f) => ({ ...f, count: all.filter(f.test).length }));

  return (
    <section className="sec" id="proyectos">
      <div className="wrap">
        <SectionHead
          num="01"
          kicker="Proyectos"
          title="Lo que estamos escribiendo."
          text="Sistemas propios: uno ya trabaja todos los días en negocios reales y otros se están trazando. Arrastra, elige uno y ábrelo."
        />

        <Reveal className="show-bar">
          <div className="show-tabs" role="tablist" aria-label="Proyectos" onKeyDown={onKey}>
            {list.map((x, i) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={i === active}
                tabIndex={i === active ? 0 : -1}
                className={i === active ? 'on' : ''}
                onClick={() => setActive(i)}
              >
                <i className={`bg-${x.accent || 'lapis'}`} />
                {x.name}
              </button>
            ))}
          </div>
          <Dropdown label="Mostrar" value={filter} options={options} onChange={setFilter} />
        </Reveal>

        {list.length === 0 ? (
          <p className="muted">No hay proyectos en este filtro.</p>
        ) : gl ? (
          <Reveal className="stage">
            <Boundary fallback={<CardGrid list={list} onOpen={setOpen} />}>
              <Suspense fallback={<div className="orbit3d orbit-loading" />}>
                <Orbit projects={list} active={active} onSelect={setActive} onOpen={setOpen} theme={theme} />
              </Suspense>
            </Boundary>
            <div className="stage-hint small muted" aria-hidden="true">
              <Icon name="arrowLeft" size={14} /> Arrastra · clic para abrir <Icon name="arrowRight" size={14} />
            </div>
          </Reveal>
        ) : (
          <CardGrid list={list} onOpen={setOpen} />
        )}

        {p && (
          <div className="show-info" key={p.id} aria-live="polite">
            <div className="show-count mono">
              {String(active + 1).padStart(2, '0')} <span>/ {String(list.length).padStart(2, '0')}</span>
            </div>
            <div className="show-main">
              <div className="show-meta">
                <span className="label">{p.kicker}</span>
                <StatusPill status={p.status} />
                {used > 0 && (
                  <a className="show-clients" href="#clientes">
                    {used} {used === 1 ? 'cliente' : 'clientes'}
                  </a>
                )}
              </div>
              <h3 className="show-name">{p.name}</h3>
              <p className="muted show-sum">{p.summary}</p>
              {p.status !== 'activo' && <Progress value={p.progress} accent={p.accent} />}
            </div>
            <div className="show-actions">
              <button className="btn btn-pri" onClick={() => setOpen(active)}>
                Ver detalles <Icon name="arrowUpRight" size={16} />
              </button>
              {projectLinks(p)[0] && (
                <a className="btn btn-ghost" href={projectLinks(p)[0].url} target="_blank" rel="noreferrer">
                  {projectLinks(p)[0].label}
                </a>
              )}
              <div className="show-arrows">
                <button className="icon-btn" onClick={() => go(-1)} aria-label="Proyecto anterior">
                  <Icon name="arrowLeft" size={18} />
                </button>
                <button className="icon-btn" onClick={() => go(1)} aria-label="Proyecto siguiente">
                  <Icon name="arrowRight" size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {open != null && list[open] && <ProjectModal project={list[open]} onClose={close} />}
    </section>
  );
}
