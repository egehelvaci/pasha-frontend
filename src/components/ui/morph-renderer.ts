import { VERT, FRAG } from "./morph-shaders";

export const wrapIndex = (index: number, count: number, loop = true) => {
  if (count <= 0) return 0;
  return loop ? ((index % count) + count) % count : Math.max(0, Math.min(index, count - 1));
};

export const easeInOutQuint = (value: number) => {
  const t = Math.max(0, Math.min(value, 1));
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
};

export interface MorphRenderer {
  show: (index: number) => void;
  dispose: () => void;
}

interface RendererOptions {
  initialIndex: number;
  duration: number;
  noiseScale: number;
  edge: number;
  drift: number;
  loop: boolean;
  onVisibility: (visible: boolean) => void;
  onRestore: () => void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader oluşturulamadı");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error("Shader derlenemedi");
  }
  return shader;
}

export function createMorphRenderer(canvas: HTMLCanvasElement, sources: string[], options: RendererOptions): MorphRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
  if (!gl || !sources.length) return null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let vertex: WebGLShader | null = null;
  let fragment: WebGLShader | null = null;
  let frame = 0;
  let disposed = false;
  let lost = false;
  let shown = false;
  let from = wrapIndex(options.initialIndex, sources.length, options.loop);
  let to = from;
  let startedAt = 0;
  let animating = false;
  let direction = 1;
  let observer: ResizeObserver | null = null;
  const textures: (WebGLTexture | null)[] = sources.map(() => null);
  const aspects = sources.map(() => 1);
  const images: HTMLImageElement[] = [];
  const uniforms: Record<string, WebGLUniformLocation | null> = {};

  function visibility(visible: boolean) {
    if (shown === visible) return;
    shown = visible;
    options.onVisibility(visible);
  }

  function paint(now: number) {
    frame = 0;
    if (disposed || lost || !gl) return;
    // Never substitute a different slide when a texture is missing. The DOM
    // image underneath always matches the selected banner and its link.
    if (!textures[to] || !textures[from]) { visibility(false); return; }
    const progress = animating ? easeInOutQuint((now - startedAt) / Math.max(1, options.duration)) : 1;
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[from]);
    gl.uniform1i(uniforms.from, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[to]);
    gl.uniform1i(uniforms.to, 1);
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.fromAspect, aspects[from]);
    gl.uniform1f(uniforms.toAspect, aspects[to]);
    gl.uniform1f(uniforms.scale, options.noiseScale);
    gl.uniform1f(uniforms.direction, direction);
    gl.uniform1f(uniforms.edge, Math.max(0.001, options.edge));
    gl.uniform1f(uniforms.drift, options.drift);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    visibility(true);
    if (progress < 1) frame = requestAnimationFrame(paint);
    else { animating = false; from = to; }
  }

  function redraw() {
    if (!disposed && !lost && !frame) frame = requestAnimationFrame(paint);
  }

  function resize() {
    if (!gl || disposed || lost) return;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5, 2048 / Math.max(canvas.clientWidth, canvas.clientHeight, 1));
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    redraw();
  }

  function onLost(event: Event) {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    visibility(false);
  }
  function onRestored() { if (!disposed) options.onRestore(); }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    for (const image of images) { image.onload = null; image.onerror = null; image.src = ""; }
    for (const texture of textures) if (texture) gl?.deleteTexture(texture);
    if (buffer) gl?.deleteBuffer(buffer);
    if (program) gl?.deleteProgram(program);
    if (vertex) gl?.deleteShader(vertex);
    if (fragment) gl?.deleteShader(fragment);
  }

  try {
    vertex = compile(gl, gl.VERTEX_SHADER, VERT);
    fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    if (!program) throw new Error("WebGL programı oluşturulamadı");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("WebGL programı bağlanamadı");
    gl.deleteShader(vertex); vertex = null;
    gl.deleteShader(fragment); fragment = null;
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error("WebGL belleği oluşturulamadı");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const name of ["from", "to", "progress", "resolution", "fromAspect", "toAspect", "scale", "direction", "edge", "drift"]) {
      uniforms[name] = gl.getUniformLocation(program, `u_${name}`);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    sources.forEach((source, index) => {
      const image = new Image();
      images.push(image);
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => {
        if (disposed || lost) return;
        const texture = gl.createTexture();
        if (!texture) return;
        try {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          if (gl.getError() !== gl.NO_ERROR) throw new Error("Görsel dokuya yüklenemedi");
          textures[index] = texture;
          aspects[index] = image.naturalWidth / Math.max(1, image.naturalHeight);
          if (index === to) { from = to; animating = false; redraw(); }
        } catch {
          gl.deleteTexture(texture);
          if (index === to) visibility(false);
        }
      };
      // The ordinary image remains visible when a host rejects CORS.
      image.onerror = () => { if (!disposed && index === to) visibility(false); };
      image.src = source;
    });
  } catch {
    dispose();
    return null;
  }

  return {
    show(index) {
      if (disposed || lost) return;
      const next = wrapIndex(index, sources.length, options.loop);
      if (next === to) return;
      from = to;
      to = next;
      direction = options.loop ? (((to - from + sources.length) % sources.length) * 2 <= sources.length ? 1 : -1) : to > from ? 1 : -1;
      animating = Boolean(textures[from] && textures[to]);
      startedAt = performance.now();
      if (!animating) { from = to; visibility(false); }
      redraw();
    },
    dispose,
  };
}
