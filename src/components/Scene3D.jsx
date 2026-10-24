import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';

/*
 * El emblema de Seshat en 3D: la estrella de siete rayos se "escribe" rayo a
 * rayo, el arco la corona y alrededor orbitan registros (fichas) como un
 * archivo vivo. Proporciones tomadas del símbolo del manual (1 u = 7.5 px).
 */

const PAL = {
  claro: { ray: '#1e3a6e', gold: '#c8962e', rec: '#1e3a6e', recGold: '#c8962e', ring: '#1e3a6e' },
  oscuro: { ray: '#8fb0e8', gold: '#e0b456', rec: '#8fb0e8', recGold: '#e0b456', ring: '#8fb0e8' },
};

const R = 0.27; // grosor del trazo
const RAY_IN = 0.8;
const RAY_OUT = 2.0;
const ARC = { cy: 0.3145, r: 2.6155, half: 0.8715 };
const TAU = Math.PI * 2;

const ease = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return 1 - Math.pow(1 - t, 3);
};

// Puntero global (toda la ventana), no solo sobre el canvas.
function usePointer() {
  const p = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const on = (e) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, []);
  return p;
}

function Emblem({ pal, still, pointer }) {
  const group = useRef();
  const rays = useRef([]);
  const arc = useRef();
  const pen = useRef();
  const core = useRef();
  const { viewport } = useThree();

  const geo = useMemo(
    () => ({
      ray: new THREE.CapsuleGeometry(R, RAY_OUT - RAY_IN, 10, 20),
      pen: new THREE.CapsuleGeometry(R, 1.07, 10, 20),
      arc: new THREE.TorusGeometry(ARC.r, R, 20, 96, ARC.half * 2),
      cap: new THREE.SphereGeometry(R, 20, 16),
      core: new THREE.SphereGeometry(0.4, 32, 24),
    }),
    []
  );
  const mat = useMemo(
    () => ({
      ray: new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.12 }),
      gold: new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.65 }),
    }),
    []
  );
  useEffect(() => {
    mat.ray.color.set(pal.ray);
    mat.gold.color.set(pal.gold);
    mat.gold.emissive.set(pal.gold).multiplyScalar(0.08);
  }, [pal, mat]);
  useEffect(() => () => {
    Object.values(geo).forEach((g) => g.dispose());
    Object.values(mat).forEach((m) => m.dispose());
  }, [geo, mat]);

  const angles = useMemo(() => Array.from({ length: 7 }, (_, i) => Math.PI / 2 - (i * TAU) / 7), []);
  const arcEnds = [ARC.half, -ARC.half].map((a) => [Math.sin(a) * ARC.r, ARC.cy + Math.cos(a) * ARC.r]);

  useFrame((state, dt) => {
    const t = still ? 10 : state.clock.elapsedTime;
    rays.current.forEach((m, i) => {
      if (!m) return;
      const s = ease((t - 0.3 - i * 0.13) / 0.55);
      m.scale.set(s, s, s);
    });
    const a = ease((t - 1.25) / 0.7);
    if (arc.current) arc.current.scale.setScalar(0.6 + 0.4 * a), (arc.current.visible = a > 0.01);
    if (pen.current) pen.current.scale.set(1, ease((t - 1.6) / 0.5), 1);
    if (core.current) core.current.scale.setScalar(ease((t - 0.1) / 0.4) * (1 + Math.sin(t * 2.2) * 0.04));

    const g = group.current;
    if (!g) return;
    const fit = Math.min(1, viewport.height / 8.4, viewport.width / 6.6);
    g.scale.setScalar(fit);
    if (still) return;
    g.position.y = Math.sin(t * 0.7) * 0.08;
    const ty = pointer.current.x * 0.45 + Math.sin(t * 0.3) * 0.18;
    const tx = -pointer.current.y * 0.22;
    const k = 1 - Math.pow(0.04, dt);
    g.rotation.y += (ty - g.rotation.y) * k;
    g.rotation.x += (tx - g.rotation.x) * k;
  });

  return (
    <group ref={group}>
      <mesh ref={core} geometry={geo.core} material={mat.ray} />
      {angles.map((ang, i) => {
        const mid = (RAY_IN + RAY_OUT) / 2;
        return (
          <group key={i} position={[Math.cos(ang) * RAY_IN, Math.sin(ang) * RAY_IN, 0]} rotation={[0, 0, ang - Math.PI / 2]}>
            <mesh
              ref={(el) => (rays.current[i] = el)}
              geometry={geo.ray}
              material={mat.ray}
              position={[0, mid - RAY_IN, 0]}
            />
          </group>
        );
      })}
      <group ref={arc} position={[0, ARC.cy, 0]}>
        <mesh geometry={geo.arc} material={mat.gold} rotation={[0, 0, Math.PI / 2 - ARC.half]} />
        {arcEnds.map(([x, y], i) => (
          <mesh key={i} geometry={geo.cap} material={mat.gold} position={[x, y - ARC.cy, 0]} />
        ))}
      </group>
      <group position={[0, -2.53, 0]}>
        <mesh ref={pen} geometry={geo.pen} material={mat.ray} position={[0, -0.53, 0]} />
      </group>
    </group>
  );
}

// Registros que orbitan: fichas planas en anillos inclinados.
function Records({ pal, still, count = 46 }) {
  const blue = useRef();
  const gold = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => new THREE.BoxGeometry(0.46, 0.3, 0.03), []);
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.85, roughness: 0.3, metalness: 0.5 }),
    ],
    []
  );
  useEffect(() => {
    mats[0].color.set(pal.rec);
    mats[1].color.set(pal.recGold);
  }, [pal, mats]);
  useEffect(() => () => (geo.dispose(), mats.forEach((m) => m.dispose())), [geo, mats]);

  const items = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, (_, i) => ({
      ring: i % 3,
      r: 3.1 + (i % 3) * 0.75 + rnd() * 0.35,
      a: rnd() * TAU,
      speed: (0.05 + rnd() * 0.05) * (i % 3 === 1 ? -1 : 1),
      y: (rnd() - 0.5) * 0.9,
      spin: rnd() * TAU,
      gold: i % 8 === 0,
    }));
  }, [count]);
  const tilts = [0.42, -0.3, 0.16];

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    const intro = ease((t - 0.6) / 1.4);
    let bi = 0;
    let gi = 0;
    items.forEach((it) => {
      const a = it.a + t * it.speed;
      const tilt = tilts[it.ring];
      const r = it.r * (still ? 1 : 0.7 + 0.3 * intro);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      dummy.position.set(x, it.y * 0.6 + z * Math.sin(tilt), z * Math.cos(tilt) - 1.2);
      dummy.rotation.set(0.2, -a + Math.PI / 2, Math.sin(t * 0.5 + it.spin) * 0.25);
      dummy.scale.setScalar(still ? 1 : intro);
      dummy.updateMatrix();
      if (it.gold) gold.current?.setMatrixAt(gi++, dummy.matrix);
      else blue.current?.setMatrixAt(bi++, dummy.matrix);
    });
    if (blue.current) blue.current.instanceMatrix.needsUpdate = true;
    if (gold.current) gold.current.instanceMatrix.needsUpdate = true;
  });

  const goldCount = items.filter((i) => i.gold).length;
  return (
    <group>
      <instancedMesh ref={blue} args={[geo, mats[0], count - goldCount]} />
      <instancedMesh ref={gold} args={[geo, mats[1], goldCount]} />
    </group>
  );
}

function Orbits({ pal }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12 }), []);
  useEffect(() => void mat.color.set(pal.ring), [pal, mat]);
  return [3.4, 4.15].map((r, i) => (
    <mesh key={r} material={mat} rotation={[Math.PI / 2 - [0.42, -0.3][i], 0, 0]} position={[0, 0, -1.2]}>
      <torusGeometry args={[r, 0.008, 6, 160]} />
    </mesh>
  ));
}

export default function Scene3D({ theme }) {
  const wrap = useRef();
  const pointer = usePointer();
  const [active, setActive] = useState(true);
  const still = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const pal = PAL[theme] || PAL.claro;

  // No dibujar cuando el hero no se ve.
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !wrap.current) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="scene3d">
      <Canvas
        dpr={[1, 1.75]}
        frameloop={active && !still ? 'always' : 'demand'}
        camera={{ position: [0, 0, 12], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={theme === 'oscuro' ? 0.55 : 0.85} />
        <hemisphereLight args={['#fff6e6', '#1e3a6e', 0.5]} />
        <directionalLight position={[4, 6, 6]} intensity={theme === 'oscuro' ? 1.6 : 1.3} />
        <directionalLight position={[-5, -2, 3]} intensity={0.35} color="#c8962e" />
        <Orbits pal={pal} />
        <Records pal={pal} still={still} />
        <Emblem pal={pal} still={still} pointer={pointer} />
      </Canvas>
    </div>
  );
}
