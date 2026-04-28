'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const COUNT = 110;
const CONNECT_DIST = 0.28;
const ACCENTS = [0x4ade80, 0x60a5fa, 0xf472b6, 0xfacc15, 0xa3e635, 0xfb923c, 0xc084fc, 0x67e8f9];

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 50);
    camera.position.z = 2.2;

    // --- particles ---
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const vx = new Float32Array(COUNT);
    const vy = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 3.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      positions[i * 3 + 2] = 0;
      vx[i] = (Math.random() - 0.5) * 0.00055;
      vy[i] = (Math.random() - 0.5) * 0.00055;

      const isAccent = Math.random() < 0.22;
      const c = new THREE.Color(
        isAccent ? ACCENTS[Math.floor(Math.random() * ACCENTS.length)] : 0x242424
      );
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const ptGeom = new THREE.BufferGeometry();
    ptGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    ptGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const ptMat = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const pts = new THREE.Points(ptGeom, ptMat);
    scene.add(pts);

    // --- connection lines ---
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x1c1c1c,
      transparent: true,
      opacity: 0.7,
    });
    let lines: THREE.LineSegments | null = null;

    const rebuildLines = () => {
      const buf: number[] = [];
      for (let a = 0; a < COUNT; a++) {
        for (let b = a + 1; b < COUNT; b++) {
          const dx = positions[a * 3] - positions[b * 3];
          const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
          if (dx * dx + dy * dy < CONNECT_DIST * CONNECT_DIST) {
            buf.push(
              positions[a * 3], positions[a * 3 + 1], 0,
              positions[b * 3], positions[b * 3 + 1], 0,
            );
          }
        }
      }
      if (lines) { scene.remove(lines); lines.geometry.dispose(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf), 3));
      lines = new THREE.LineSegments(g, lineMat);
      scene.add(lines);
    };

    let raf: number;
    let frame = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3]     += vx[i];
        positions[i * 3 + 1] += vy[i];
        if (Math.abs(positions[i * 3])     > 1.9) vx[i] *= -1;
        if (Math.abs(positions[i * 3 + 1]) > 1.3) vy[i] *= -1;
      }
      ptGeom.attributes.position.needsUpdate = true;
      if (frame % 4 === 0) rebuildLines();
      frame++;
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ptGeom.dispose();
      ptMat.dispose();
      lineMat.dispose();
      if (lines) lines.geometry.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  );
}
