import { useEffect, useState } from 'react';

// Rutas con hash (#/p/myneg) para que funcione en GitHub Pages sin servidor.
// Un hash sin barra (#proyectos) es un ancla dentro de la página de inicio.
function parse() {
  const h = window.location.hash || '';
  if (h.startsWith('#/')) {
    return { path: h.slice(2).split('/').filter(Boolean).map(decodeURIComponent), section: null };
  }
  return { path: [], section: h.length > 1 ? decodeURIComponent(h.slice(1)) : null };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
