import { asset } from '../lib/content.js';

// Portada generada para proyectos sin imagen: bloques planos y arcos, como el
// hero del manual. La composición depende del nombre, así cada proyecto es único.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SECOND = { lapis: 'oro', oro: 'lapis', fayenza: 'oro', terracota: 'lapis' };

export default function ProjectArt({ project, className = '' }) {
  if (project.image) {
    return (
      <div className={`art art-img ${className}`}>
        <img src={asset(project.image)} alt="" loading="lazy" />
      </div>
    );
  }
  const accent = project.accent || 'lapis';
  const h = hash(project.slug || project.name || 'x');
  const r = (n, min, max) => min + ((h >>> n) % 1000) / 1000 * (max - min);
  const x1 = r(1, 150, 220);
  const w1 = r(3, 120, 170);
  const y2 = r(5, 120, 170);
  const arcs = 2 + (h % 3);
  const initial = (project.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={`art ${className}`} aria-hidden="true">
      <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice">
        <rect width="480" height="300" className="f-art-bg" />
        <rect className={`f-${accent}`} x={x1} y="-20" width={w1} height="290" rx="16" />
        <rect className="f-arena" x="-10" y={y2 + 40} width={x1 - 26} height="200" rx="16" />
        <rect className={`f-${SECOND[accent]}`} x={x1 + w1 + 16} y={y2} width="140" height="220" rx="16" />
        <rect className="f-fayenza art-dot" x={x1 + w1 + 16} y={y2 - 80} width="56" height="56" rx="12" />
        {Array.from({ length: arcs }, (_, i) => {
          const cy = 70 + i * 52;
          return <path key={i} className={accent === 'oro' ? 's-arco s-arco-ink' : 's-arco'} d={`M${x1 + 34} ${cy} Q${x1 + w1 / 2} ${cy - 36} ${x1 + w1 - 34} ${cy}`} />;
        })}
        <text x="34" y={y2 + 10} className="art-letter">
          {initial}
        </text>
      </svg>
    </div>
  );
}
