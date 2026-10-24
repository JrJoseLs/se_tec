import Icon from '../components/Icon.jsx';
import ProjectArt from '../components/ProjectArt.jsx';
import { Reveal } from '../components/Layout.jsx';
import { projectLinks, visibleProjects } from '../lib/content.js';
import { Progress, StatusPill } from '../components/Status.jsx';

const STEPS = [
  ['idea', 'Idea'],
  ['diseno', 'Diseño'],
  ['desarrollo', 'Desarrollo'],
  ['beta', 'Piloto'],
  ['activo', 'Producción'],
];

export default function ProjectPage({ content, slug }) {
  const list = visibleProjects(content);
  const idx = list.findIndex((p) => p.slug === slug);
  const p = list[idx];

  if (!p) {
    return (
      <section className="sec page-empty">
        <div className="wrap">
          <h1>Este registro no existe.</h1>
          <p className="muted">Puede que el proyecto haya cambiado de nombre.</p>
          <a className="btn btn-pri" href="#proyectos">
            <Icon name="arrowLeft" size={18} /> Ver proyectos
          </a>
        </div>
      </section>
    );
  }

  const next = list[(idx + 1) % list.length];
  const step = STEPS.findIndex(([k]) => k === p.status);
  const paragraphs = String(p.description || '')
    .split(/\n\s*\n/)
    .filter(Boolean);

  return (
    <article className="ppage">
      <div className="wrap">
        <a className="back" href="#proyectos">
          <Icon name="arrowLeft" size={16} /> Proyectos
        </a>
        <header className="ppage-head">
          <Reveal>
            <div className="ppage-meta">
              <span className="label">{p.kicker}</span>
              <StatusPill status={p.status} />
            </div>
            <h1>{p.name}</h1>
            <p className="ppage-tag">{p.tagline}</p>
          </Reveal>
          <Reveal className="ppage-art" delay={80}>
            <ProjectArt project={p} />
          </Reveal>
        </header>

        <div className="ppage-grid">
          <Reveal className="ppage-body">
            <p className="lead">{p.summary}</p>
            {paragraphs.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
            {p.highlights?.length > 0 && (
              <>
                <h2 className="h-small">Qué incluye</h2>
                <ul className="checks">
                  {p.highlights.map((h) => (
                    <li key={h}>
                      <Icon name="check" size={16} stroke={2.25} />
                      {h}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Reveal>
          <Reveal as="aside" className="ppage-side" delay={100}>
            <div className="label">Avance</div>
            <Progress value={p.progress} accent={p.accent} />
            <ol className="steps">
              {STEPS.map(([k, label], i) => (
                <li key={k} className={i < step ? 'done' : i === step ? 'now' : ''}>
                  <i />
                  {label}
                </li>
              ))}
            </ol>
            {p.audience && (
              <>
                <div className="label">Para quién</div>
                <p className="muted small" style={{ margin: 0 }}>
                  {p.audience}
                </p>
              </>
            )}
            {projectLinks(p).length > 0 ? (
              <div className="ppage-links">
                {projectLinks(p).map((l, i) => (
                  <a key={l.url} className={`btn ${i === 0 ? 'btn-pri' : 'btn-ghost'}`} href={l.url} target="_blank" rel="noreferrer">
                    {l.label} <Icon name="arrowUpRight" size={16} />
                  </a>
                ))}
              </div>
            ) : (
              <p className="muted small">Todavía no está disponible para el público. Si te interesa, escríbenos.</p>
            )}
          </Reveal>
        </div>

        {next && next !== p && (
          <a className="next" href={`#/p/${next.slug}`}>
            <span className="label">Siguiente proyecto</span>
            <span className="next-name">
              {next.name} <Icon name="arrowRight" size={28} />
            </span>
          </a>
        )}
      </div>
    </article>
  );
}
