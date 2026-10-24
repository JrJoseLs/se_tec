import { useSyncExternalStore } from 'react';
import data from '../content/site.json';

let current = data;
const subs = new Set();

const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
const get = () => current;

export function useContent() {
  return useSyncExternalStore(subscribe, get, get);
}

// Al guardar desde el panel, site.json cambia y el sitio se actualiza sin recargar.
if (import.meta.hot) {
  import.meta.hot.accept('../content/site.json', (mod) => {
    if (!mod) return;
    current = mod.default;
    subs.forEach((fn) => fn());
  });
}

export const STATUS = {
  idea: 'Idea',
  diseno: 'En diseño',
  desarrollo: 'En desarrollo',
  beta: 'En piloto',
  activo: 'En producción',
};

export const ACCENTS = ['lapis', 'oro', 'fayenza', 'terracota'];

export function visibleProjects(content) {
  return (content.projects || []).filter((p) => p.visible !== false);
}

// En local se ven también los clientes ocultos (marcados), para poder probar la sección.
export function visibleClients(content) {
  return (content.clients || []).filter((c) => c.visible !== false || import.meta.env.DEV);
}

export function projectLinks(p) {
  return (Array.isArray(p.links) ? p.links : []).filter((l) => l && l.url);
}

export function asset(p) {
  if (!p) return '';
  if (/^(https?:|data:|blob:)/.test(p)) return p;
  return import.meta.env.BASE_URL + p.replace(/^\.?\//, '');
}
