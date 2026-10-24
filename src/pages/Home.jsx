import { Component, Suspense, lazy, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Symbol } from '../components/Logo.jsx';
import { Reveal, SectionHead } from '../components/Layout.jsx';
import Clients from '../components/Clients.jsx';
import ProjectsShowcase from '../components/ProjectsShowcase.jsx';
import { visibleClients, visibleProjects } from '../lib/content.js';
import { sendContact, supabaseReady } from '../lib/contact.js';

const Scene3D = lazy(() => import('../components/Scene3D.jsx'));

// Si WebGL no está disponible, se queda el símbolo plano.
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function Hero({ content, theme }) {
  const { hero, site } = content;
  const [gl] = useState(webglOk);
  const fallback = (
    <div className="scene3d scene-fallback">
      <Symbol />
    </div>
  );
  const projects = visibleProjects(content);
  const live = projects.filter((p) => p.status === 'activo').length;
  const clients = visibleClients(content).filter((c) => c.visible !== false).length;
  return (
    <section className="hero" id="inicio">
      <div className="hero-art" aria-hidden="true">
        {gl ? (
          <SceneBoundary fallback={fallback}>
            <Suspense fallback={fallback}>
              <Scene3D theme={theme} />
            </Suspense>
          </SceneBoundary>
        ) : (
          fallback
        )}
      </div>
      <div className="wrap hero-in">
        <div className="hero-txt">
          <div className="label hero-kicker">{hero.kicker}</div>
          <h1>{hero.title}</h1>
          <p className="hero-sub">{hero.subtitle}</p>
          <div className="hero-cta">
            <a className="btn btn-pri" href="#proyectos">
              {hero.ctaPrimary} <Icon name="arrowRight" size={18} />
            </a>
            <a className="btn btn-ghost" href="#contacto">
              {hero.ctaSecondary}
            </a>
          </div>
          <dl className="hero-facts">
            <div>
              <dt>{String(projects.length).padStart(2, '0')}</dt>
              <dd>Sistemas propios</dd>
            </div>
            <div>
              <dt>{String(live).padStart(2, '0')}</dt>
              <dd>En producción</dd>
            </div>
            <div>
              <dt>{clients > 0 ? String(clients).padStart(2, '0') : 'RD'}</dt>
              <dd>{clients > 0 ? 'Clientes' : site.location}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="hero-scroll" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}

function Services({ content }) {
  return (
    <section className="sec sec-band" id="servicios">
      <div className="wrap">
        <SectionHead
          num="03"
          kicker="Servicios"
          title="Orden, de punta a punta."
          text="Desde la primera factura hasta el reporte que mandas a la DGII."
        />
        <div className="sgrid">
          {(content.services || []).map((s, i) => (
            <Reveal key={s.id} className="scard" delay={(i % 3) * 70}>
              <span className="scard-ico">
                <Icon name={s.icon} size={22} />
              </span>
              <h3>{s.title}</h3>
              <p className="muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function About({ content }) {
  const a = content.about;
  return (
    <section className="sec" id="origen">
      <div className="wrap">
        <SectionHead num="04" kicker={a.kicker} title={a.title} />
        <div className="about">
          <Reveal className="about-quote">
            <p>{a.text}</p>
          </Reveal>
          <ol className="pillars">
            {(a.pillars || []).map((p, i) => (
              <Reveal as="li" key={p.id} delay={i * 90}>
                <span className="pillar-n">0{i + 1}</span>
                <span className="pillar-ico">
                  <Icon name={p.icon} size={22} />
                </span>
                <div>
                  <h3>{p.title}</h3>
                  <p className="muted">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Contact({ content }) {
  const { contact, site } = content;
  const [state, setState] = useState({ status: 'idle', msg: '' });
  const options = [...visibleProjects(content).map((p) => p.name), ...(content.services || []).map((s) => s.title), 'Otro'];

  async function onSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('sitio')) return; // trampa para bots
    const msg = {
      nombre: String(f.get('nombre')).trim(),
      email: String(f.get('email')).trim(),
      empresa: String(f.get('empresa') || '').trim() || null,
      interes: String(f.get('interes') || '') || null,
      mensaje: String(f.get('mensaje')).trim(),
    };
    setState({ status: 'sending', msg: '' });
    try {
      const mode = await sendContact(msg);
      e.target.reset();
      setState({
        status: 'ok',
        msg:
          mode === 'local'
            ? 'Mensaje guardado en modo local (Supabase aún no está configurado).'
            : 'Mensaje recibido. Te escribimos pronto.',
      });
    } catch (err) {
      setState({ status: 'error', msg: `No se pudo enviar: ${err.message}. Escríbenos a ${site.email}.` });
    }
  }

  return (
    <section className="sec" id="contacto">
      <div className="wrap contact">
        <Reveal className="contact-txt">
          <div className="sec-num">05 — Contacto</div>
          <h2>{contact.title}</h2>
          <p className="muted">{contact.text}</p>
          <ul className="contact-list">
            {site.email && (
              <li>
                <Icon name="mail" size={18} />
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
            )}
            <li>
              <Icon name="pin" size={18} />
              {site.location}
            </li>
            {(site.social || [])
              .filter((s) => s.url)
              .map((s) => (
                <li key={s.label}>
                  <Icon name="arrowUpRight" size={18} />
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                    {/instagram\.com\/([^/?#]+)/.test(s.url) && ` · @${s.url.match(/instagram\.com\/([^/?#]+)/)[1]}`}
                  </a>
                </li>
              ))}
          </ul>
        </Reveal>
        <Reveal as="form" className="form" onSubmit={onSubmit} delay={80}>
          <div className="form-row">
            <label>
              Nombre
              <input name="nombre" required maxLength={120} autoComplete="name" />
            </label>
            <label>
              Correo
              <input name="email" type="email" required maxLength={200} autoComplete="email" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Empresa <span className="muted">(opcional)</span>
              <input name="empresa" maxLength={160} autoComplete="organization" />
            </label>
            <label>
              Te interesa
              <select name="interes" defaultValue="">
                <option value="">Elige una opción</option>
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Mensaje
            <textarea name="mensaje" required maxLength={4000} rows={5} placeholder="Qué quieres ordenar, automatizar o construir." />
          </label>
          <input className="hp" name="sitio" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div className="form-foot">
            <button className="btn btn-pri" disabled={state.status === 'sending'}>
              {state.status === 'sending' ? 'Enviando…' : 'Enviar mensaje'} <Icon name="send" size={16} />
            </button>
            {!supabaseReady && state.status === 'idle' && <span className="muted small">Modo local</span>}
          </div>
          {state.msg && (
            <p className={`form-msg ${state.status}`} role="status">
              <Icon name={state.status === 'ok' ? 'check' : 'x'} size={16} /> {state.msg}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export default function Home({ content, theme }) {
  return (
    <>
      <Hero content={content} theme={theme} />
      <ProjectsShowcase content={content} theme={theme} />
      <Clients content={content} />
      <Services content={content} />
      <About content={content} />
      <Contact content={content} />
    </>
  );
}
