import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { STATUS } from '../lib/content.js';

/*
 * Galería 3D de proyectos: cada proyecto es una lámina (como una tablilla de
 * registro) en un carrusel tipo coverflow. Se arrastra, se hace clic en una
 * lámina lateral para traerla al frente y en la del frente para abrir el detalle.
 */

const PAL = {
  claro: { lapis: '#1e3a6e', oro: '#c8962e', fayenza: '#1f6f67', terracota: '#b3412e', arena: '#e6dac0', bg: '#fffdf8', art: '#efe6d2', ink: '#1a1814', soft: '#5e5648', line: '#e2d8c3', onOro: '#1a1814' },
  oscuro: { lapis: '#2d5299', oro: '#e0b456', fayenza: '#5fc4b6', terracota: '#e7826e', arena: '#2b3243', bg: '#1b2130', art: '#171c28', ink: '#f3ece3', soft: '#b5ac9a', line: '#2c3445', onOro: '#1a1814' },
};
const SECOND = { lapis: 'oro', oro: 'lapis', fayenza: 'oro', terracota: 'lapis' };
const W = 3.2;
const H = 2.0;
const TEX_W = 1024;
const TEX_H = 640;

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Dibuja la cara de la lámina: composición de bloques arriba y datos abajo.
function drawCard(p, pal) {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext('2d');
  const accent = p.accent || 'lapis';
  const h = hash(p.slug || p.name || 'x');
  const r = (n, a, b) => a + (((h >>> n) % 1000) / 1000) * (b - a);

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // franja de arte
  const artH = 360;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, TEX_W, artH);
  ctx.clip();
  ctx.fillStyle = pal.art;
  ctx.fillRect(0, 0, TEX_W, artH);
  const x1 = r(1, 330, 450);
  const w1 = r(3, 190, 250);
  const y2 = r(5, 120, 170);
  ctx.fillStyle = pal.arena;
  rr(ctx, -20, y2 + 60, x1 - 30, 300, 28);
  ctx.fill();
  ctx.fillStyle = pal[accent];
  rr(ctx, x1, -40, w1, artH - 10, 28);
  ctx.fill();
  ctx.fillStyle = pal[SECOND[accent]];
  rr(ctx, x1 + w1 + 28, y2, 260, 400, 28);
  ctx.fill();
  ctx.fillStyle = pal.fayenza;
  rr(ctx, x1 + w1 + 28, y2 - 120, 92, 92, 20);
  ctx.fill();
  ctx.strokeStyle = accent === 'oro' ? pal.onOro : pal.oro;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const cy = 90 + i * 80;
    ctx.beginPath();
    ctx.moveTo(x1 + 50, cy);
    ctx.quadraticCurveTo(x1 + w1 / 2, cy - 56, x1 + w1 - 50, cy);
    ctx.stroke();
  }
  ctx.fillStyle = pal.ink;
  ctx.font = '600 210px Fraunces, Georgia, serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText((p.name || '?').charAt(0).toUpperCase(), 60, y2 + 70);
  ctx.restore();

  // datos
  ctx.fillStyle = pal.line;
  ctx.fillRect(0, artH, TEX_W, 2);
  ctx.fillStyle = pal.soft;
  ctx.font = '500 26px "IBM Plex Sans", system-ui, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.fillText(String(p.kicker || '').toUpperCase(), 60, artH + 70);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = pal.ink;
  ctx.font = '600 96px Fraunces, Georgia, serif';
  ctx.fillText(p.name || '', 56, artH + 180);
  ctx.fillStyle = pal.soft;
  ctx.font = '400 34px Fraunces, Georgia, serif';
  ctx.fillText(p.tagline || '', 60, artH + 238);

  // estado
  const label = STATUS[p.status] || p.status || '';
  ctx.font = '500 26px "IBM Plex Sans", system-ui, sans-serif';
  const tw = ctx.measureText(label).width;
  const live = p.status === 'activo';
  ctx.fillStyle = live ? pal.fayenza : pal.arena;
  rr(ctx, TEX_W - tw - 120, artH + 40, tw + 70, 50, 10);
  ctx.fill();
  ctx.fillStyle = live ? pal.bg : pal.oro;
  ctx.beginPath();
  ctx.arc(TEX_W - tw - 92, artH + 65, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = live ? pal.bg : pal.ink;
  ctx.fillText(label, TEX_W - tw - 74, artH + 75);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function cardGeometry() {
  const s = new THREE.Shape();
  const r = 0.14;
  const x = -W / 2;
  const y = -H / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + W - r, y);
  s.quadraticCurveTo(x + W, y, x + W, y + r);
  s.lineTo(x + W, y + H - r);
  s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
  s.lineTo(x + r, y + H);
  s.quadraticCurveTo(x, y + H, x, y + H - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false, curveSegments: 8 });
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
  g.translate(0, 0, -0.03);
  return g;
}

// Posición en el coverflow según la distancia al centro (o puede ser decimal).
function layout(o) {
  const a = Math.abs(o);
  const near = Math.min(a, 1);
  return {
    x: o * 1.45 + Math.sign(o) * near * 1.05,
    z: -near * 1.3 - a * 0.35,
    ry: -Math.max(-1, Math.min(1, o)) * 0.72,
    s: 1 - near * 0.16,
    dim: Math.min(1, a * 0.55),
  };
}

function Card({ project, index, ctrl, pal, geo, onPick, still, fontsReady }) {
  const ref = useRef();
  const tex = useMemo(() => drawCard(project, pal), [project, pal, fontsReady]);
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: tex }), [tex]);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ color: pal[project.accent || 'lapis'], roughness: 0.5 }), [pal, project.accent]);
  useEffect(() => () => (tex.dispose(), face.dispose(), side.dispose()), [tex, face, side]);
  const white = useMemo(() => new THREE.Color('#ffffff'), []);
  const dimColor = useMemo(() => new THREE.Color(pal.bg === '#1b2130' ? '#5a6070' : '#b9b2a4'), [pal]);

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const o = index - ctrl.float;
    const L = layout(o);
    const t = still ? 0 : state.clock.elapsedTime;
    const hover = ctrl.hover === index ? 1 : 0;
    m.position.set(L.x, Math.sin(t * 0.8 + index) * 0.05 * (1 - L.dim) + hover * 0.06, L.z + hover * 0.1);
    m.rotation.y = L.ry + (Math.abs(o) < 0.5 ? ctrl.px * 0.12 : 0);
    m.rotation.x = Math.abs(o) < 0.5 ? -ctrl.py * 0.06 : 0;
    m.scale.setScalar(L.s * (1 + hover * 0.02));
    face.color.copy(white).lerp(dimColor, L.dim);
    m.renderOrder = 10 - Math.round(Math.abs(o));
  });

  return (
    <mesh
      ref={ref}
      geometry={geo}
      material={[face, side]}
      onPointerOver={(e) => {
        e.stopPropagation();
        ctrl.hover = index;
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (ctrl.hover === index) ctrl.hover = -1;
        document.body.style.cursor = '';
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (ctrl.moved > 6) return;
        onPick(index);
      }}
    />
  );
}

function Halo({ ctrl, pal, still }) {
  const arc = useRef();
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }), []);
  useEffect(() => void mat.color.set(pal.oro), [pal, mat]);
  const geo = useMemo(() => new THREE.TorusGeometry(0.9, 0.05, 12, 64, Math.PI * 0.6), []);
  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    if (!arc.current) return;
    const settle = 1 - Math.min(1, Math.abs(ctrl.float - Math.round(ctrl.float)) * 3);
    arc.current.position.set(0, H / 2 - 0.48 + Math.sin(t * 1.2) * 0.03, 0.06);
    arc.current.scale.setScalar(0.4 + 0.6 * settle);
    arc.current.visible = settle > 0.05;
  });
  return <mesh ref={arc} geometry={geo} material={mat} rotation={[0, 0, Math.PI * 0.2]} />;
}

function Scene({ projects, active, ctrl, pal, onPick, still, fontsReady }) {
  const geo = useMemo(cardGeometry, []);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, dt) => {
    if (ctrl.dragging) return;
    const k = still ? 1 : 1 - Math.pow(0.002, dt);
    ctrl.float += (active - ctrl.float) * k;
  });
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <Halo ctrl={ctrl} pal={pal} still={still} />
      {projects.map((p, i) => (
        <Card key={p.id} project={p} index={i} ctrl={ctrl} pal={pal} geo={geo} onPick={onPick} still={still} fontsReady={fontsReady} />
      ))}
    </>
  );
}

export default function ProjectOrbit3D({ projects, active, onSelect, onOpen, theme }) {
  const pal = PAL[theme] || PAL.claro;
  const still = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const [fontsReady, setFontsReady] = useState(false);
  const ctrl = useRef({ float: active, dragging: false, moved: 0, startX: 0, startFloat: 0, hover: -1, px: 0, py: 0, fontsReady: false }).current;
  const wrap = useRef();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      document.fonts?.load('600 96px Fraunces'),
      document.fonts?.load('400 34px Fraunces'),
      document.fonts?.load('500 26px "IBM Plex Sans"'),
    ])
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        ctrl.fontsReady = true;
        setFontsReady(true);
      });
    return () => {
      alive = false;
    };
  }, [ctrl]);

  useEffect(() => {
    if (!('IntersectionObserver' in window) || !wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const pick = (i) => (i === active ? onOpen(i) : onSelect(i));

  const onDown = (e) => {
    ctrl.dragging = true;
    ctrl.moved = 0;
    ctrl.startX = e.clientX;
    ctrl.startFloat = ctrl.float;
  };
  const onMove = (e) => {
    const r = wrap.current.getBoundingClientRect();
    ctrl.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    ctrl.py = -(((e.clientY - r.top) / r.height) * 2 - 1);
    if (!ctrl.dragging) return;
    const dx = e.clientX - ctrl.startX;
    ctrl.moved = Math.max(ctrl.moved, Math.abs(dx));
    const max = projects.length - 1;
    ctrl.float = Math.max(-0.4, Math.min(max + 0.4, ctrl.startFloat - dx / 220));
  };
  const onUp = () => {
    if (!ctrl.dragging) return;
    ctrl.dragging = false;
    if (ctrl.moved > 6) onSelect(Math.max(0, Math.min(projects.length - 1, Math.round(ctrl.float))));
  };

  return (
    <div
      ref={wrap}
      className="orbit3d"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={() => {
        onUp();
        ctrl.px = 0;
        ctrl.py = 0;
      }}
      data-fonts={fontsReady}
    >
      <Canvas dpr={[1, 2]} frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 0.1, 5.6], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <Scene projects={projects} active={active} ctrl={ctrl} pal={pal} onPick={pick} still={still} fontsReady={fontsReady} />
      </Canvas>
    </div>
  );
}
