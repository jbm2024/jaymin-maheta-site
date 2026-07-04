import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getCSSVar } from "../main.js";

gsap.registerPlugin(ScrollTrigger);

const PARTICLE_COUNT = 1800;
const MAX_PIXEL_RATIO = 2;

function hexColor(cssVarName, fallback) {
  const val = getCSSVar(cssVarName) || fallback;
  return new THREE.Color(val);
}

export function initHomeScene(canvas, techStack = []) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight);

  let accentColor = hexColor("--color-accent-end", "#4f46e5");
  let bgColor = hexColor("--color-bg", "#07070c");

  scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.06);

  // ---- Beat 1/2: ambient particle field -------------------------------
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = 6 + Math.random() * 8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const particleMaterial = new THREE.PointsMaterial({
    color: accentColor,
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // ---- Beat 3: tech-stack orbit ----------------------------------------
  const orbitGroup = new THREE.Group();
  orbitGroup.visible = true;
  const orbitRadius = 3.2;
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true });
  const iconCount = Math.max(techStack.length, 6);
  for (let i = 0; i < iconCount; i++) {
    const angle = (i / iconCount) * Math.PI * 2;
    const geometry = new THREE.IcosahedronGeometry(0.22, 0);
    const mesh = new THREE.Mesh(geometry, orbitMaterial);
    mesh.position.set(Math.cos(angle) * orbitRadius, Math.sin(angle * 1.3) * 1.2, Math.sin(angle) * orbitRadius - 4);
    orbitGroup.add(mesh);
  }
  orbitGroup.traverse((obj) => {
    if (obj.isMesh) obj.material.transparent = true;
    if (obj.isMesh) obj.material.opacity = 0;
  });
  scene.add(orbitGroup);

  // ---- Beat 4: featured project depth cards -----------------------------
  const projectGroup = new THREE.Group();
  const projectMaterial = new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true });
  const projectMeshes = [-2.5, 0, 2.5].map((x, i) => {
    const geometry = new THREE.TorusGeometry(0.6, 0.16, 8, 24);
    const mesh = new THREE.Mesh(geometry, projectMaterial.clone());
    mesh.position.set(x, 0, -8 - i * 0.5);
    mesh.scale.setScalar(0.001);
    mesh.material.opacity = 0;
    mesh.material.transparent = true;
    projectGroup.add(mesh);
    return mesh;
  });
  scene.add(projectGroup);

  // ---- Scroll-driven camera + group states ------------------------------
  const beats = gsap.utils.toArray("[data-scene-beat]");

  beats.forEach((section) => {
    const beat = Number(section.dataset.sceneBeat);

    if (beat === 1) {
      gsap.fromTo(
        camera.position,
        { z: 8 },
        {
          z: 9.5,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    }

    if (beat === 2) {
      gsap.to(camera.position, {
        z: 11,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.to(particleMaterial, {
        size: 0.05,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
      });
    }

    if (beat === 3) {
      gsap.to(camera.position, {
        z: 13,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
      });
      orbitGroup.children.forEach((mesh) => {
        gsap.to(mesh.material, {
          opacity: 0.9,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top bottom", end: "bottom center", scrub: true },
        });
      });
    }

    if (beat === 4) {
      gsap.to(camera.position, {
        z: 15,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
      });
      projectMeshes.forEach((mesh, i) => {
        gsap.to(mesh.scale, {
          x: 1,
          y: 1,
          z: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: `top ${80 - i * 10}%`,
            end: `center ${20 - i * 5}%`,
            scrub: true,
          },
        });
        gsap.to(mesh.material, {
          opacity: 0.8,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: `top ${80 - i * 10}%`,
            end: `center ${20 - i * 5}%`,
            scrub: true,
          },
        });
      });
      orbitGroup.children.forEach((mesh) => {
        gsap.to(mesh.material, {
          opacity: 0,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top bottom", end: "top top", scrub: true },
        });
      });
    }

    if (beat === 5) {
      gsap.to(camera.position, {
        z: 16,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom bottom", scrub: true },
      });
    }
  });

  // ---- Cursor parallax ---------------------------------------------------
  const parallax = { targetX: 0, targetY: 0, x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    parallax.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    parallax.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ---- Theme re-tint -----------------------------------------------------
  window.addEventListener("themechange", () => {
    accentColor = hexColor("--color-accent-end", "#4f46e5");
    bgColor = hexColor("--color-bg", "#07070c");
    particleMaterial.color = accentColor;
    orbitMaterial.color = accentColor;
    projectMeshes.forEach((mesh) => mesh.material.color.copy(accentColor));
    scene.fog.color = bgColor;
  });

  // ---- Resize --------------------------------------------------------------
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Render loop with visibility-based pausing --------------------------
  let running = true;
  let rafId = null;
  const clock = new THREE.Clock();

  function renderFrame() {
    if (!running) return;
    const delta = clock.getDelta();
    particles.rotation.y += delta * 0.02;
    orbitGroup.rotation.y += delta * 0.15;

    parallax.x += (parallax.targetX - parallax.x) * 0.05;
    parallax.y += (parallax.targetY - parallax.y) * 0.05;
    camera.position.x = parallax.x * 0.5;
    camera.position.y = -parallax.y * 0.35;
    camera.lookAt(0, 0, -5);

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
    (entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
    },
    { threshold: 0 }
  );
  io.observe(canvas);

  start();
}
