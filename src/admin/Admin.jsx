import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon, { ICON_NAMES } from '../components/Icon.jsx';
import { Symbol } from '../components/Logo.jsx';
import ProjectArt from '../components/ProjectArt.jsx';
import { ACCENTS, STATUS, asset } from '../lib/content.js';
import { LOCAL_KEY, supabaseReady } from '../lib/contact.js';
import './admin.css';

/*
 * La escriba: panel local para editar el contenido del sitio.
 * Lee y escribe src/content/site.json a través del servidor de desarrollo
 * (plugin en vite.config.js) y publica con git commit + git push.
 */

const API = '/__admin';
const H = { 'x-seshat-admin': '1' };

async function api(path, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `item-${Date.now().toString(36)}`;

const PROJECT_FIELDS = [
  { key: 'name', label: 'Nombre', type: 'text', half: true },
  { key: 'slug', label: 'Slug (URL)', type: 'slug', half: true, help: 'Aparece en #/p/slug. Solo minúsculas y guiones.' },
  { key: 'kicker', label: 'Etiqueta superior', type: 'text', half: true },
  { key: 'tagline', label: 'Frase corta', type: 'text', half: true },
  { key: 'summary', label: 'Resumen (tarjeta)', type: 'textarea', rows: 2 },
  { key: 'description', label: 'Descripción (página)', type: 'textarea', rows: 5, help: 'Separa párrafos con una línea en blanco.' },
  { key: 'highlights', label: 'Qué incluye', type: 'lines', help: 'Uno por línea.' },
  { key: 'audience', label: 'Para quién', type: 'text', placeholder: 'Colmados, ferreterías, restaurantes…' },
  { key: 'status', label: 'Estado', type: 'select', options: Object.entries(STATUS), half: true },
  { key: 'accent', label: 'Color', type: 'accent', half: true },
  { key: 'progress', label: 'Avance', type: 'range', half: true },
  { key: 'image', label: 'Imagen de portada', type: 'image', half: true, help: 'Opcional. Sin imagen se genera una portada con la paleta.' },
  { key: 'links', label: 'Enlaces públicos', type: 'links', help: 'Solo páginas que puede ver cualquiera. El primero se usa para el botón principal y la vista en vivo.' },
  { key: 'featured', label: 'Destacado (tarjeta grande)', type: 'bool', half: true },
  { key: 'visible', label: 'Visible en el sitio', type: 'bool', half: true },
];

const SERVICE_FIELDS = [
  { key: 'title', label: 'Título', type: 'text', half: true },
  { key: 'icon', label: 'Ícono', type: 'icon', half: true },
  { key: 'text', label: 'Texto', type: 'textarea', rows: 3 },
];
const clientFields = (projects) => [
  { key: 'name', label: 'Nombre del cliente', type: 'text', half: true },
  { key: 'system', label: 'Sistema que usa', type: 'select', half: true, options: projects.map((p) => [p.id, p.name]) },
  { key: 'sector', label: 'Sector', type: 'text', half: true, placeholder: 'Colmado, ferretería…' },
  { key: 'city', label: 'Ciudad', type: 'text', half: true },
  { key: 'since', label: 'Cliente desde', type: 'text', half: true, placeholder: '2026' },
  { key: 'url', label: 'Sitio web (opcional)', type: 'text', half: true, placeholder: 'https://…' },
  { key: 'logo', label: 'Logo (opcional)', type: 'image', half: true },
  { key: 'visible', label: 'Visible en el sitio', type: 'bool', half: true, help: 'Publica un cliente solo con su permiso.' },
];

const NEW = {
  projects: () => ({
    id: `p-${Date.now().toString(36)}`,
    slug: '',
    name: 'Nuevo proyecto',
    kicker: 'Proyecto en desarrollo',
    tagline: 'Pronto más detalles.',
    summary: '',
    description: '',
    highlights: [],
    tags: [],
    status: 'idea',
    progress: 5,
    accent: 'lapis',
    image: '',
    featured: false,
    visible: false,
    audience: '',
    links: [],
  }),
  services: () => ({ id: `s-${Date.now().toString(36)}`, icon: 'code', title: 'Nuevo servicio', text: '' }),
  pillars: () => ({ id: `pl-${Date.now().toString(36)}`, icon: 'pen', title: 'Nuevo pilar', text: '' }),
  clients: () => ({ id: `c-${Date.now().toString(36)}`, name: 'Nuevo cliente', system: 'myneg', sector: '', city: '', since: String(new Date().getFullYear()), url: '', logo: '', visible: false }),
};

const getIn = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
const setIn = (o, k, v) => {
  const parts = k.split('.');
  const last = parts.pop();
  const target = parts.reduce((a, p) => (a[p] ??= {}), o);
  target[last] = v;
};

function useSession(key, initial) {
  const [v, setV] = useState(() => {
    try {
      return sessionStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, v);
    } catch {}
  }, [key, v]);
  return [v, setV];
}

/* ---------------- campos ---------------- */

function ImageField({ value, onChange, notify }) {
  const [busy, setBusy] = useState(false);
  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const r = await api(`/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file });
      onChange(r.path);
      notify('Imagen subida a public/uploads');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }
  return (
    <div className="img-field">
      {value ? <img src={asset(value)} alt="" /> : <div className="img-empty">Sin imagen</div>}
      <div className="img-actions">
        <label className="a-btn">
          <Icon name="upload" size={15} /> {busy ? 'Subiendo…' : 'Subir'}
          <input type="file" accept="image/*" hidden onChange={onFile} />
        </label>
        {value && (
          <button type="button" className="a-btn a-ghost" onClick={() => onChange('')}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ f, value, onChange, notify }) {
  const id = `f-${f.key}`;
  let input;
  switch (f.type) {
    case 'textarea':
      input = <textarea id={id} rows={f.rows || 3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'lines':
      input = (
        <textarea
          id={id}
          rows={4}
          value={(value || []).join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trimStart()))}
          onBlur={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
        />
      );
      break;
    case 'tags':
      input = (
        <input
          id={id}
          defaultValue={(value || []).join(', ')}
          key={(value || []).join('|')}
          onBlur={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        />
      );
      break;
    case 'select':
      input = (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {f.options.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      );
      break;
    case 'range':
      input = (
        <div className="range">
          <input id={id} type="range" min="0" max="100" step="5" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
          <span className="mono">{value ?? 0}%</span>
        </div>
      );
      break;
    case 'bool':
      input = (
        <label className="switch">
          <input id={id} type="checkbox" checked={value !== false && !!value} onChange={(e) => onChange(e.target.checked)} />
          <span />
          {value ? 'Sí' : 'No'}
        </label>
      );
      break;
    case 'accent':
      input = (
        <div className="swatch-pick" role="radiogroup">
          {ACCENTS.map((a) => (
            <button
              type="button"
              key={a}
              role="radio"
              aria-checked={value === a}
              aria-label={a}
              className={`bg-${a}${value === a ? ' on' : ''}`}
              onClick={() => onChange(a)}
            />
          ))}
        </div>
      );
      break;
    case 'icon':
      input = (
        <div className="icon-pick">
          {ICON_NAMES.filter((n) => !['arrowRight', 'arrowLeft', 'arrowUpRight', 'up', 'down', 'x', 'menu'].includes(n)).map((n) => (
            <button type="button" key={n} title={n} className={value === n ? 'on' : ''} onClick={() => onChange(n)}>
              <Icon name={n} size={18} />
            </button>
          ))}
        </div>
      );
      break;
    case 'links': {
      const list = Array.isArray(value) ? value : [];
      const set = (k, key, v) => onChange(list.map((l, j) => (j === k ? { ...l, [key]: v } : l)));
      input = (
        <div className="links-edit">
          {list.map((l, k) => (
            <div key={k} className="links-row">
              <input aria-label="Texto del enlace" placeholder="Texto" value={l.label || ''} onChange={(e) => set(k, 'label', e.target.value)} />
              <input aria-label="URL" className="mono" placeholder="https://…" value={l.url || ''} onChange={(e) => set(k, 'url', e.target.value.trim())} />
              <button type="button" className="a-icon danger" title="Quitar" onClick={() => onChange(list.filter((_, j) => j !== k))}>
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
          <button type="button" className="a-btn a-ghost" onClick={() => onChange([...list, { label: '', url: '' }])}>
            <Icon name="plus" size={15} /> Agregar enlace
          </button>
        </div>
      );
      break;
    }
    case 'image':
      input = <ImageField value={value} onChange={onChange} notify={notify} />;
      break;
    case 'slug':
      input = <input id={id} className="mono" value={value ?? ''} onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />;
      break;
    default:
      input = <input id={id} value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div className={`a-field${f.half ? ' half' : ''}`}>
      <label htmlFor={id}>{f.label}</label>
      {input}
      {f.help && <small>{f.help}</small>}
    </div>
  );
}

/* ---------------- colecciones ---------------- */

function Collection({ items, onChange, fields, titleKey, make, notify, renderPreview, listMeta }) {
  const [sel, setSel] = useState(0);
  const i = Math.min(sel, Math.max(0, items.length - 1));
  const item = items[i];

  const update = (k, v) => {
    const next = structuredClone(items);
    setIn(next[i], k, v);
    if (k === 'name' && make === NEW.projects && !items[i].slug) next[i].slug = slugify(v);
    onChange(next);
  };
  const move = (dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setSel(j);
  };
  const add = () => {
    const n = make();
    if (make === NEW.projects) n.slug = slugify(n.name) + '-' + Date.now().toString(36).slice(-3);
    onChange([...items, n]);
    setSel(items.length);
  };
  const remove = () => {
    if (!item || !confirm(`¿Eliminar "${item[titleKey]}"? Podrás recuperarlo de .admin-backups si ya habías guardado.`)) return;
    onChange(items.filter((_, k) => k !== i));
    setSel(Math.max(0, i - 1));
  };

  return (
    <div className="coll">
      <aside className="coll-list">
        {items.map((it, k) => (
          <button key={it.id || k} className={k === i ? 'on' : ''} onClick={() => setSel(k)}>
            <span>{it[titleKey] || '(sin nombre)'}</span>
            {listMeta && <small>{listMeta(it)}</small>}
          </button>
        ))}
        <button className="coll-add" onClick={add}>
          <Icon name="plus" size={16} /> Agregar
        </button>
      </aside>
      {item ? (
        <div className="coll-edit">
          <div className="coll-tools">
            <h3>{item[titleKey] || '(sin nombre)'}</h3>
            <div>
              <button className="a-icon" onClick={() => move(-1)} disabled={i === 0} title="Subir">
                <Icon name="up" size={16} />
              </button>
              <button className="a-icon" onClick={() => move(1)} disabled={i === items.length - 1} title="Bajar">
                <Icon name="down" size={16} />
              </button>
              <button className="a-icon danger" onClick={remove} title="Eliminar">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
          {renderPreview && renderPreview(item)}
          <div className="a-form">
            {fields.map((f) => (
              <Field key={f.key} f={f} value={getIn(item, f.key)} onChange={(v) => update(f.key, v)} notify={notify} />
            ))}
          </div>
        </div>
      ) : (
        <div className="coll-edit empty">No hay elementos. Agrega el primero.</div>
      )}
    </div>
  );
}

/* ---------------- pestañas ---------------- */

function SiteTab({ data, edit, notify }) {
  const groups = [
    ['Empresa', [
      ['site.name', 'Nombre', 'text', true],
      ['site.short', 'Nombre corto', 'text', true],
      ['site.tagline', 'Eslogan', 'text', true],
      ['site.location', 'Ubicación', 'text', true],
      ['site.email', 'Correo de contacto', 'text', true],
      ['site.description', 'Descripción', 'textarea'],
    ]],
    ['Portada', [
      ['hero.kicker', 'Etiqueta', 'text', true],
      ['hero.title', 'Título', 'text', true],
      ['hero.subtitle', 'Subtítulo', 'textarea'],
      ['hero.ctaPrimary', 'Botón principal', 'text', true],
      ['hero.ctaSecondary', 'Botón secundario', 'text', true],
    ]],
    ['Origen', [
      ['about.kicker', 'Etiqueta', 'text', true],
      ['about.title', 'Título', 'text', true],
      ['about.text', 'Texto', 'textarea'],
    ]],
    ['Contacto', [
      ['contact.title', 'Título', 'text', true],
      ['contact.text', 'Texto', 'textarea'],
    ]],
  ];
  return (
    <div className="tab-pad">
      {groups.map(([title, fields]) => (
        <section key={title} className="a-card">
          <h3>{title}</h3>
          <div className="a-form">
            {fields.map(([key, label, type, half]) => (
              <Field key={key} f={{ key, label, type, half }} value={getIn(data, key)} onChange={(v) => edit((d) => setIn(d, key, v))} notify={notify} />
            ))}
          </div>
        </section>
      ))}
      <section className="a-card">
        <h3>Redes sociales</h3>
        <p className="a-note">Las que no tengan enlace no se muestran.</p>
        <div className="a-form">
          {(data.site.social || []).map((s, k) => (
            <Field
              key={k}
              f={{ key: `social-${k}`, label: s.label, type: 'text', half: true, placeholder: 'https://…' }}
              value={s.url}
              onChange={(v) => edit((d) => (d.site.social[k].url = v))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function MessagesTab() {
  const [list, setList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]').reverse();
    } catch {
      return [];
    }
  });
  const clear = () => {
    if (!confirm('¿Borrar los mensajes guardados en este navegador?')) return;
    localStorage.removeItem(LOCAL_KEY);
    setList([]);
  };
  return (
    <div className="tab-pad">
      <section className="a-card">
        <h3>Mensajes del formulario</h3>
        <p className="a-note">
          {supabaseReady
            ? 'Supabase está configurado: los mensajes reales llegan a la tabla "contactos". Léelos en Supabase › Table Editor. Abajo solo aparecen pruebas hechas antes de configurarlo.'
            : 'Supabase no está configurado (falta .env.local). Los envíos se guardan en este navegador y aparecen aquí.'}
        </p>
        {list.length === 0 && <p className="a-note">No hay mensajes locales.</p>}
        {list.map((m, k) => (
          <div key={k} className="msg">
            <div>
              <b>{m.nombre}</b> · <a href={`mailto:${m.email}`}>{m.email}</a>
              {m.empresa && <> · {m.empresa}</>}
              <span className="mono">{new Date(m.created_at).toLocaleString('es-DO')}</span>
            </div>
            {m.interes && <span className="a-chip">{m.interes}</span>}
            <p>{m.mensaje}</p>
          </div>
        ))}
        {list.length > 0 && (
          <button className="a-btn a-ghost" onClick={clear}>
            Borrar mensajes locales
          </button>
        )}
      </section>
    </div>
  );
}

function PublishTab({ dirty, save, notify }) {
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('Actualiza contenido del sitio');
  const [log, setLog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/git').then(setInfo).catch((e) => setInfo({ repo: false, out: e.message })), []);
  useEffect(() => void load(), [load]);

  async function publish() {
    setBusy(true);
    setLog(null);
    try {
      if (dirty) await save();
      const r = await api('/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: msg }) });
      setLog(r.steps);
      notify(r.ok ? 'Publicado. GitHub Actions desplegará el sitio en 1–2 minutos.' : 'La publicación falló. Revisa el registro.', !r.ok);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
      load();
    }
  }

  return (
    <div className="tab-pad">
      <section className="a-card">
        <h3>Publicar en GitHub Pages</h3>
        <p className="a-note">
          Guarda el contenido, hace <code>git commit</code> de <code>src/content</code> y <code>public/uploads</code>, y hace <code>git push</code>.
          El workflow de GitHub Actions construye y publica el sitio.
        </p>
        {!info && <p className="a-note">Leyendo el repositorio…</p>}
        {info && !info.repo && <pre className="a-pre">{info.out}</pre>}
        {info?.repo && (
          <dl className="git-info">
            <dt>Rama</dt>
            <dd className="mono">{info.branch}</dd>
            <dt>Remoto</dt>
            <dd className="mono">{info.remote?.split('\n')[0] || 'Sin remoto configurado'}</dd>
            <dt>Cambios</dt>
            <dd>
              <pre className="a-pre">{info.status || 'Sin cambios pendientes.'}</pre>
            </dd>
            <dt>Historial</dt>
            <dd>
              <pre className="a-pre">{info.log || '—'}</pre>
            </dd>
          </dl>
        )}
        <div className="a-field">
          <label htmlFor="commit-msg">Mensaje del commit</label>
          <input id="commit-msg" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={200} />
        </div>
        <div className="row-gap">
          <button className="a-btn a-pri" disabled={busy || !info?.repo} onClick={publish}>
            <Icon name="git" size={16} /> {busy ? 'Publicando…' : dirty ? 'Guardar y publicar' : 'Publicar'}
          </button>
          <button className="a-btn a-ghost" onClick={load}>
            <Icon name="refresh" size={16} /> Actualizar
          </button>
        </div>
        {log &&
          log.map(([cmd, r]) => (
            <div key={cmd} className="log-step">
              <b className={r.ok ? 'ok' : 'bad'}>
                {r.ok ? '✓' : '✕'} {cmd}
              </b>
              {r.out && <pre className="a-pre">{r.out}</pre>}
            </div>
          ))}
      </section>
    </div>
  );
}

/* ---------------- panel ---------------- */

const TABS = [
  ['proyectos', 'Proyectos'],
  ['servicios', 'Servicios'],
  ['origen', 'Pilares'],
  ['clientes', 'Clientes'],
  ['sitio', 'Textos del sitio'],
  ['mensajes', 'Mensajes'],
  ['publicar', 'Publicar'],
];

export default function Admin() {
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useSession('escriba-tab', 'proyectos');
  const [toast, setToast] = useState(null);

  const notify = useCallback((text, bad) => {
    setToast({ text, bad, at: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.title = 'La escriba · Seshat';
    api('/content')
      .then((d) => {
        setData(d);
        setSaved(JSON.stringify(d));
      })
      .catch((e) => setError(e.message));
  }, []);

  const dirty = useMemo(() => data && JSON.stringify(data) !== saved, [data, saved]);
  const edit = useCallback((fn) => setData((d) => {
    const n = structuredClone(d);
    fn(n);
    return n;
  }), []);

  const save = useCallback(async () => {
    const slugs = data.projects.map((p) => p.slug);
    const dup = slugs.find((s, k) => !s || slugs.indexOf(s) !== k);
    if (dup !== undefined) {
      notify(dup ? `El slug "${dup}" está repetido.` : 'Hay un proyecto sin slug.', true);
      throw new Error('Slugs inválidos');
    }
    await api('/content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    setSaved(JSON.stringify(data));
    notify('Guardado en src/content/site.json');
  }, [data, notify]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) save().catch(() => {});
      }
    };
    const onLeave = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [dirty, save]);

  if (error) {
    return (
      <div className="admin admin-center">
        <Symbol className="admin-sym" />
        <h1>La escriba no responde</h1>
        <p>{error}</p>
        <p className="a-note">El panel solo funciona con <code>npm run dev</code> en esta máquina.</p>
      </div>
    );
  }
  if (!data) return <div className="admin-loading">Abriendo la escriba…</div>;

  const discard = () => {
    if (confirm('¿Descartar los cambios sin guardar?')) setData(JSON.parse(saved));
  };

  return (
    <div className="admin">
      <header className="a-top">
        <div className="a-brand">
          <Symbol className="admin-sym" />
          <div>
            <b>La escriba</b>
            <small>Panel local · Seshat</small>
          </div>
        </div>
        <nav className="a-tabs">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </nav>
        <div className="a-actions">
          <a className="a-btn a-ghost" href="#/" target="_blank" rel="noreferrer">
            <Icon name="eye" size={15} /> Ver sitio
          </a>
          {dirty && (
            <button className="a-btn a-ghost" onClick={discard}>
              Descartar
            </button>
          )}
          <button className="a-btn a-pri" disabled={!dirty} onClick={() => save().catch(() => {})}>
            <Icon name="save" size={15} /> {dirty ? 'Guardar' : 'Guardado'}
          </button>
        </div>
      </header>

      <main className="a-main">
        {tab === 'proyectos' && (
          <Collection
            items={data.projects}
            onChange={(v) => edit((d) => (d.projects = v))}
            fields={PROJECT_FIELDS}
            titleKey="name"
            make={NEW.projects}
            notify={notify}
            listMeta={(p) => `${STATUS[p.status] || p.status}${p.visible === false ? ' · oculto' : ''}${p.featured ? ' · destacado' : ''}`}
            renderPreview={(p) => (
              <div className="a-preview">
                <ProjectArt project={p} />
                <a className="a-btn a-ghost" href={`#/p/${p.slug}`} target="_blank" rel="noreferrer">
                  <Icon name="arrowUpRight" size={15} /> Ver página
                </a>
              </div>
            )}
          />
        )}
        {tab === 'servicios' && (
          <Collection
            items={data.services}
            onChange={(v) => edit((d) => (d.services = v))}
            fields={SERVICE_FIELDS}
            titleKey="title"
            make={NEW.services}
            notify={notify}
          />
        )}
        {tab === 'origen' && (
          <Collection
            items={data.about.pillars}
            onChange={(v) => edit((d) => (d.about.pillars = v))}
            fields={SERVICE_FIELDS}
            titleKey="title"
            make={NEW.pillars}
            notify={notify}
          />
        )}
        {tab === 'clientes' && (
          <>
            <p className="a-note">Los clientes ocultos se ven en local (marcados) para probar la sección, pero no se publican. Muestra un cliente solo con su permiso.</p>
            <section className="a-card" style={{ marginBottom: 16 }}>
              <h3>Textos de la sección</h3>
              <div className="a-form">
                <Field f={{ key: 'cs-title', label: 'Título', type: 'text' }} value={data.clientsSection?.title} onChange={(v) => edit((d) => setIn(d, 'clientsSection.title', v))} />
                <Field f={{ key: 'cs-text', label: 'Texto', type: 'textarea', rows: 2 }} value={data.clientsSection?.text} onChange={(v) => edit((d) => setIn(d, 'clientsSection.text', v))} />
              </div>
            </section>
            <Collection
              items={data.clients || []}
              onChange={(v) => edit((d) => (d.clients = v))}
              fields={clientFields(data.projects)}
              titleKey="name"
              make={NEW.clients}
              notify={notify}
              listMeta={(c) => `${data.projects.find((p) => p.id === c.system)?.name || c.system}${c.visible === false ? ' · oculto' : ''}`}
            />
          </>
        )}
        {tab === 'sitio' && <SiteTab data={data} edit={edit} notify={notify} />}
        {tab === 'mensajes' && <MessagesTab />}
        {tab === 'publicar' && <PublishTab dirty={dirty} save={save} notify={notify} />}
      </main>

      {toast && (
        <div className={`a-toast${toast.bad ? ' bad' : ''}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
