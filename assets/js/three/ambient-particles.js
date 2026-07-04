import * as THREE from "three";
import { getCSSVar } from "../main.js";

const PARTICLE_COUNT = 700;
const MAX_PIXEL_RATIO = 2;

function hexColor(cssVarName, fallback) {
  const val = getCSSVar(cssVarName) || fallback;
  return new THREE.Color(val);
}

/**
 * Cheap, non-scroll-choreographed particle background shared by About,
 * Projects, and Contact — same visual language as the Home 3D scene, but
 * intentionally light: no ScrollTrigger wiring, half the particle count.
 */
export function initAmbientParticles(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight);

  let accentColor = hexColor("--color-accent-end", "#4f46e5");

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = 5 + Math.random() * 7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: accentColor,
    size: 0.03,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
  });
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  window.addEventListener("themechange", () => {
    accentColor = hexColor("--color-accent-end", "#4f46e5");
    material.color = accentColor;
  });

  const parallax = { targetX: 0, targetY: 0, x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    parallax.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    parallax.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let running = true;
  let rafId = null;
  const clock = new THREE.Clock();

  function renderFrame() {
    if (!running) return;
    const delta = clock.getDelta();
    particles.rotation.y += delta * 0.015;
    particles.rotation.x += delta * 0.005;

    parallax.x += (parallax.targetX - parallax.x) * 0.05;
    parallax.y += (parallax.targetY - parallax.y) * 0.05;
    camera.position.x = parallax.x * 0.4;
    camera.position.y = -parallax.y * 0.3;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(renderFrame);
  }

  function start() {
    if (rafId !== null) return;
    running = true;
    renderFrame();
  }

  function stop() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => (entry.isIntersecting ? start() : stop())),
    { threshold: 0 }
  );
  io.observe(canvas);

  start();
}
