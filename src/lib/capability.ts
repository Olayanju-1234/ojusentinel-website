/*
  Capability-aware degradation for the hero eye. This is SEPARATE from
  reduced-motion: a fast phone with motion on still has to download and run
  WebGL, so device + connection capability also decide the path. If any signal
  says "weak", we never load Three.js and the static SVG eye stays.
*/

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}
interface NavigatorLike extends Navigator {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
}

export interface Capability {
  reducedMotion: boolean;
  saveData: boolean;
  slowConnection: boolean;
  lowMemory: boolean;
  lowCores: boolean;
  webgl: boolean;
}

let cachedWebGL: boolean | null = null;

/** Cheap one-shot probe for a usable WebGL context. */
function probeWebGL(): boolean {
  if (cachedWebGL !== null) return cachedWebGL;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cachedWebGL = !!gl;
    // Release the probe context promptly.
    const lose = gl && (gl as WebGLRenderingContext).getExtension?.('WEBGL_lose_context');
    lose?.loseContext?.();
  } catch {
    cachedWebGL = false;
  }
  return cachedWebGL;
}

export function detectCapability(): Capability {
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as NavigatorLike;
  const conn = nav.connection ?? {};
  const et = conn.effectiveType ?? '';
  const reducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    reducedMotion,
    saveData: conn.saveData === true,
    slowConnection: et === 'slow-2g' || et === '2g' || et === '3g',
    lowMemory: typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4,
    lowCores: typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2,
    webgl: probeWebGL(),
  };
}

/** True only when the device/connection can comfortably afford the WebGL eye. */
export function shouldRunHeavyEye(cap: Capability = detectCapability()): boolean {
  return (
    cap.webgl &&
    !cap.reducedMotion &&
    !cap.saveData &&
    !cap.slowConnection &&
    !cap.lowMemory &&
    !cap.lowCores
  );
}
