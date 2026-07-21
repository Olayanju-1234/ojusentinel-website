/*
  The signature 3D moment — the eye as a real dimensional object, built from the
  vesica. One scene, a handful of meshes, no post-processing (glow is a cheap
  additive sprite, not a bloom pass), pixel-ratio capped, and the render loop is
  paused whenever the eye is offscreen or the tab is hidden. Only capable devices
  ever load this (see capability.ts); everyone else keeps the static SVG.

  Colours are read from the live CSS tokens, so the eye re-inks with the theme.
  The iris core is the one status-true element and is driven by eye.ts.
*/
import {
  AdditiveBlending,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Sprite,
  SpriteMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { IrisMode } from '../eye';

const MAX_DPR = 1.75;

/** Points around a horizontal vesica outline (two circle arcs), for the rim. */
function vesicaCurve(R: number, k: number, seg = 48): CatmullRomCurve3 {
  const a = Math.asin(k / R);
  const pts: Vector3[] = [];
  // top arc — circle centred (0,-k), from (-w,0) over the top to (w,0)
  for (let i = 0; i <= seg; i++) {
    const th = Math.PI - a - (i / seg) * (Math.PI - 2 * a);
    pts.push(new Vector3(R * Math.cos(th), -k + R * Math.sin(th), 0));
  }
  // bottom arc — circle centred (0,+k), from (w,0) under the bottom to (-w,0)
  for (let i = 1; i < seg; i++) {
    const ph = -a - (i / seg) * (Math.PI - 2 * a);
    pts.push(new Vector3(R * Math.cos(ph), k + R * Math.sin(ph), 0));
  }
  return new CatmullRomCurve3(pts, true, 'catmullrom', 0.0);
}

function radialSprite(color: string): CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new CanvasTexture(c);
}

export class HeroEyeScene {
  private container: HTMLElement;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private eye = new Group();
  private brass: MeshStandardMaterial;
  private core!: Mesh;
  private coreMat: MeshStandardMaterial;
  private glow!: Sprite;
  private glowMat: SpriteMaterial;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private raf = 0;
  private visible = true;
  private running = false;
  private reduced: boolean;
  private pointer = { x: 0, y: 0 };
  private target = { x: 0, y: 0 };
  private t0 = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_DPR));
    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    this.camera = new PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 0, 4.2);

    // A tiny generated environment so the brass reads as metal (no HDR/jsm).
    const pmrem = new PMREMGenerator(this.renderer);
    const envTex = this.gradientEnv();
    const env = pmrem.fromEquirectangular(envTex).texture;
    this.scene.environment = env;
    envTex.dispose();
    pmrem.dispose();

    const brassHex = this.token('--brass');
    this.brass = new MeshStandardMaterial({
      color: new Color(brassHex),
      metalness: 0.85,
      roughness: 0.32,
    });

    // aperture rim (vesica) + inner echo
    const rim = new Mesh(
      new TubeGeometry(vesicaCurve(1.18, 0.56), 220, 0.03, 14, true),
      this.brass,
    );
    const echo = new Mesh(
      new TubeGeometry(vesicaCurve(1.06, 0.5), 200, 0.012, 12, true),
      this.brass.clone(),
    );
    (echo.material as MeshStandardMaterial).transparent = true;
    (echo.material as MeshStandardMaterial).opacity = 0.5;

    // iris ring
    const ring = new Mesh(new TorusGeometry(0.44, 0.05, 18, 60), this.brass);

    // core (status-true) + additive glow
    const watch = this.token('--watch');
    this.coreMat = new MeshStandardMaterial({
      color: new Color(watch),
      emissive: new Color(watch),
      emissiveIntensity: 1.15,
      metalness: 0,
      roughness: 0.4,
    });
    this.core = new Mesh(new SphereGeometry(0.17, 32, 24), this.coreMat);
    this.glowMat = new SpriteMaterial({
      map: radialSprite(watch),
      color: new Color(watch),
      blending: AdditiveBlending,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.glow = new Sprite(this.glowMat);
    this.glow.scale.setScalar(1.1);
    this.glow.position.z = -0.05;

    this.eye.add(rim, echo, ring, this.glow, this.core);
    this.eye.scale.setScalar(1.08);
    this.scene.add(this.eye);

    // Lights guarantee the brass reads dimensional even where the env map is
    // subtle: a warm key highlight, a cool rim, and a soft sky/ground fill.
    const key = new DirectionalLight(0xfff2e0, 2.2);
    key.position.set(2.5, 3, 4);
    const rimLight = new DirectionalLight(0x8fb4ff, 0.8);
    rimLight.position.set(-3, -1.5, 2);
    this.scene.add(key, rimLight, new HemisphereLight(0xcfd8e3, 0x0a0d11, 0.5));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();

    this.io = new IntersectionObserver((e) => this.onVisibility(e), { threshold: 0.01 });
    this.io.observe(container);

    if (!this.reduced) {
      container.addEventListener('pointermove', this.onPointer, { passive: true });
      container.addEventListener('pointerleave', this.onLeave, { passive: true });
    }
    document.addEventListener('visibilitychange', this.onDocVisibility);
    this.start();
  }

  private gradientEnv(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#4a463f');
    g.addColorStop(0.5, '#23252b');
    g.addColorStop(1, '#080a0e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 256);
    const tex = new CanvasTexture(c);
    tex.mapping = EquirectangularReflectionMapping;
    return tex;
  }

  private token(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#c39b62';
  }

  private onPointer = (e: PointerEvent) => {
    const r = this.container.getBoundingClientRect();
    this.target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    this.target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  private onLeave = () => {
    this.target.x = 0;
    this.target.y = 0;
  };
  private onDocVisibility = () => {
    if (document.hidden) this.stop();
    else if (this.visible) this.start();
  };

  private onVisibility(entries: IntersectionObserverEntry[]) {
    this.visible = entries[0]?.isIntersecting ?? false;
    if (this.visible && !document.hidden) this.start();
    else this.stop();
  }

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderOnce();
  }

  /** Retint the iris core (called by eye.ts at checkpoints / theme changes). */
  setIris(_mode: IrisMode, cssColor: string) {
    const col = new Color(cssColor || this.token('--watch'));
    this.coreMat.color.copy(col);
    this.coreMat.emissive.copy(col);
    this.glowMat.color.copy(col);
    if (!this.running) this.renderOnce();
  }

  /** Re-read structural tokens after a theme change. */
  refreshTheme() {
    this.brass.color.set(this.token('--brass'));
    if (!this.running) this.renderOnce();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    this.loop();
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const t = (performance.now() - this.t0) / 1000;

    if (this.reduced) {
      this.eye.rotation.set(0, 0, 0);
    } else {
      // ease toward pointer, with a gentle idle drift
      this.pointer.x += (this.target.x - this.pointer.x) * 0.06;
      this.pointer.y += (this.target.y - this.pointer.y) * 0.06;
      this.eye.rotation.y = this.pointer.x * 0.5 + Math.sin(t * 0.4) * 0.05;
      this.eye.rotation.x = this.pointer.y * 0.35 + Math.cos(t * 0.33) * 0.04;

      // breathing core (mirrors os-breathe: ~1 → ~1.16, 4.4s)
      const b = 0.5 + 0.5 * Math.sin((t / 4.4) * Math.PI * 2 - Math.PI / 2);
      const s = 1 + b * 0.16;
      this.core.scale.setScalar(s);
      this.coreMat.emissiveIntensity = 0.95 + b * 0.5;
      this.glow.scale.setScalar(1.0 + b * 0.35);
      this.glowMat.opacity = 0.6 + b * 0.3;
    }
    this.renderer.render(this.scene, this.camera);
  };

  private renderOnce() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.io.disconnect();
    this.container.removeEventListener('pointermove', this.onPointer);
    this.container.removeEventListener('pointerleave', this.onLeave);
    document.removeEventListener('visibilitychange', this.onDocVisibility);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
