import { Suspense, lazy, useEffect, useState } from 'react';
import { Footer, Header } from './components/Layout.jsx';
import { useContent } from './lib/content.js';
import { useRoute } from './lib/router.js';
import { useTheme } from './lib/theme.js';
import Home from './pages/Home.jsx';
import ProjectPage from './pages/ProjectPage.jsx';

// El panel solo existe en desarrollo local. En el build de producción esta
// rama se elimina por completo: el código del panel no llega a GitHub Pages.
const Admin = import.meta.env.DEV ? lazy(() => import('./admin/Admin.jsx')) : null;

const SECTIONS = ['proyectos', 'clientes', 'servicios', 'origen', 'contacto'];

function useActiveSection(enabled) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!enabled || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [enabled]);
  return enabled ? active : null;
}

export default function App() {
  const content = useContent();
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [page, param] = route.path;
  const isHome = !page;
  const active = useActiveSection(isHome);

  useEffect(() => {
    if (route.section) {
      requestAnimationFrame(() => document.getElementById(route.section)?.scrollIntoView({ behavior: 'smooth' }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [route.path.join('/'), route.section]);

  useEffect(() => {
    const p = page === 'p' && content.projects.find((x) => x.slug === param);
    document.title = p ? `${p.name} · ${content.site.name}` : `${content.site.name} · ${content.site.tagline}`;
  }, [page, param, content]);

  if (page === 'escriba' && Admin) {
    return (
      <Suspense fallback={<div className="admin-loading">Abriendo la escriba…</div>}>
        <Admin />
      </Suspense>
    );
  }

  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <Header theme={theme} onToggleTheme={toggleTheme} active={active} />
      <main id="contenido">
        {page === 'p' ? <ProjectPage content={content} slug={param} /> : <Home content={content} theme={theme} />}
      </main>
      <Footer content={content} />
    </>
  );
}
