// Textured block view for design mode, in WebGL with no library. Blocks are boxes with crisp pixel
// textures (from the visitor's own jar) or flat colors, lit like the game: tops brightest, sides darker.
//   const view = DesignView(canvas);
//   view.show({ dims: [X, Y, Z], blocks: [{ x, y, z, boxes, mat, key }] });
// boxes: null for a full cube, or [[x0, x1, y0, y1, z0, z1], ...] in 0..1 (stairs, slabs).
// mat: { top, side, clear } with top and side each an Image (first frame of a strip is used) or a CSS
// color; clear blocks (glass) are drawn see-through after the rest.
// key: what makes a block "the same" between shows (defaults to its place and shape). Only blocks with
// a new key drop in, lowest first; the rest stay put, so editing never rebuilds the whole house.
// The first show (and the first after view.reset()) builds from the ground up; later ones only pop in new blocks.
// Editing by dragging the model: view.grab = hit => handle or null, where hit is { b, n } (the block under
// the pointer and the face's normal) and handle is { axes: [{ dir: [x, y, z], move(d), glow? }], glow }.
// The axis whose on-screen direction best matches the first few pixels of the drag wins; move gets the
// distance dragged along it, in blocks. glow(b) picks the blocks to light up. Dragging empty space turns.
(() => {
  const FACES = [ // normal, corners (0 = low end, 1 = high end per axis), shade, top texture?
    [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], .6], [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], .6],
    [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], 1, 1], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], .5, 1],
    [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], .8], [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], .8],
  ];
  const STRIDE = 10; // floats per vertex: position 3, uv 2, shade, delay (-1: already there), block center 3
  // New blocks either drop in from above (a whole new build) or pop up in place (an edit), with a spring.
  const VS = `attribute vec3 p, mid; attribute vec2 uv; attribute float shade, delay;
    uniform mat4 m; uniform float t, vs, pop; varying vec2 v, g; varying float s, vis;
    void main() {
      float k = delay < 0. ? 1. : clamp((t - delay) / .45, 0., 1.);
      float j = k - 1., ease = 1. + 2.70158 * j * j * j + 1.70158 * j * j; // ease out back: overshoots, then settles
      v = vec2(uv.x, uv.y * vs); g = uv; s = shade; vis = k;
      vec3 q = pop > 0. ? mid + (p - mid) * ease : p + vec3(0., 3. * (1. - ease), 0.);
      gl_Position = m * vec4(q, 1.);
    }`;
  // Flat colors (no jar yet) get a faint outline per block so the build still reads as blocks.
  const FS = `precision mediump float; uniform sampler2D tex; uniform float edge, clear; varying vec2 v, g; varying float s, vis;
    void main() {
      if (vis <= 0.) discard;
      vec4 c = texture2D(tex, v);
      if (clear > 0. && c.a < .05) discard;
      vec2 d = min(g, 1. - g);
      float line = edge * (1. - smoothstep(.02, .05, min(d.x, d.y))) * .12;
      gl_FragColor = vec4(c.rgb * s * (1. - line), clear > 0. ? c.a : 1.);
    }`;

  // 4x4 matrices, column-major as WebGL wants them.
  const mul = (a, b) => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; };
  const perspective = (fov, aspect, near, far) => { const f = 1 / Math.tan(fov / 2), d = near - far;
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / d, -1, 0, 0, 2 * far * near / d, 0]); };
  const lookAt = (e, c) => {
    const sub = (a, b) => a.map((v, i) => v - b[i]), norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const z = norm(sub(e, c)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
  };

  window.DesignView = canvas => {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    const A = ['p', 'uv', 'shade', 'delay', 'mid'].map(n => gl.getAttribLocation(prog, n));
    const U = n => gl.getUniformLocation(prog, n);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Any CSS color (variables, oklch, color-mix) as 4 bytes, by painting one pixel.
    const px = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgba = css => {
      canvas.style.color = css;
      px.clearRect(0, 0, 1, 1); px.fillStyle = getComputedStyle(canvas).color; px.fillRect(0, 0, 1, 1);
      return px.getImageData(0, 0, 1, 1).data;
    };
    // One GL texture per Image or color, made once. A color is a single pixel.
    const texCache = new Map();
    const texture = src => {
      const key = typeof src === 'string' ? src : src.src;
      if (texCache.has(key)) return texCache.get(key);
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      let vs = 1;
      if (typeof src === 'string') {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba(src));
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        vs = src.naturalWidth / src.naturalHeight; // animated strips: first frame only
      }
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
        gl.texParameteri(gl.TEXTURE_2D, k, v);
      const out = { t, vs, edge: typeof src === 'string' ? 1 : 0, id: texCache.size };
      texCache.set(key, out);
      return out;
    };

    let yaw = .6, pitch = .5, zoom = 1, groups = [], grid = null, start = 0, frame = 0, last = 0, spin = false;
    let seen = new Set(), pop = 0, until = 0, fresh0 = true, shown = [], cam = null, glowBuf = null, lit = null, held = null;
    const goal = { c: [0, 0, 0], r: 1 }, cur = { c: null, r: 1 };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');

    // Visible faces, grouped by texture (and clear or not) so each group is one draw call.
    const show = s => {
      const [X, Y, Z] = s.dims, at = (x, y, z) => (y * Z + z) * X + x, cells = new Array(X * Y * Z);
      for (const b of s.blocks) cells[at(b.x, b.y, b.z)] = b;
      // A face is hidden by a full neighbor; glass only hides faces of other glass.
      const hides = (b, x, y, z) => {
        if (x < 0 || y < 0 || z < 0 || x >= X || y >= Y || z >= Z) return false;
        const c = cells[at(x, y, z)];
        return c && !c.boxes && (!c.mat.clear || b.mat.clear);
      };
      const keyOf = b => b.key ?? `${b.x},${b.y},${b.z}`;
      const fresh = s.blocks.filter(b => !seen.has(keyOf(b) + JSON.stringify(b.boxes)));
      const low = Math.min(...fresh.map(b => b.y)), step = fresh0 ? .07 : .015;
      const rise = new Map(fresh.map(b => [b, (b.y - low) * step]));
      pop = fresh0 ? 0 : 1; fresh0 = false;
      seen = new Set(s.blocks.map(b => keyOf(b) + JSON.stringify(b.boxes)));
      until = fresh.length ? (Math.max(...fresh.map(b => b.y)) - low) * step + .5 : 0;

      const byTex = new Map();
      for (const b of s.blocks) for (const [x0, x1, y0, y1, z0, z1] of b.boxes || [[0, 1, 0, 1, 0, 1]])
        for (const [n, corners, shade, top] of FACES) {
          if (!b.boxes && hides(b, b.x + n[0], b.y + n[1], b.z + n[2])) continue;
          const tex = texture(top ? b.mat.top : b.mat.side), id = tex.id + (b.mat.clear ? 'c' : '');
          if (!byTex.has(id)) byTex.set(id, { tex, clear: !!b.mat.clear, data: [] });
          const delay = rise.get(b) ?? -1;
          // UVs follow the block grid like the game does, so a stair's step shows the matching part of the texture.
          const vert = ([i, j, k]) => {
            const x = i ? x1 : x0, y = j ? y1 : y0, z = k ? z1 : z0;
            const [u, v] = n[1] ? [x, z] : n[0] ? [n[0] > 0 ? 1 - z : z, 1 - y] : [n[2] > 0 ? x : 1 - x, 1 - y];
            return [b.x + x, b.y + y, b.z + z, u, v, shade, delay, b.x + .5, b.y + .5, b.z + .5];
          };
          const q = corners.map(vert);
          byTex.get(id).data.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
        }
      for (const g of groups) gl.deleteBuffer(g.buf);
      groups = [...byTex.values()].sort((a, b) => a.clear - b.clear).map(({ tex, clear, data }) => {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        return { tex, clear, buf, n: data.length / STRIDE };
      });
      // Ground grid, two blocks past the build.
      const lines = [], P = 2;
      for (let x = -P; x <= X + P; x++) lines.push(x, 0, -P, 0, 0, 1, -1, 0, 0, 0, x, 0, Z + P, 0, 0, 1, -1, 0, 0, 0);
      for (let z = -P; z <= Z + P; z++) lines.push(-P, 0, z, 0, 0, 1, -1, 0, 0, 0, X + P, 0, z, 0, 0, 1, -1, 0, 0, 0);
      if (grid) gl.deleteBuffer(grid.buf);
      grid = { buf: gl.createBuffer(), n: lines.length / STRIDE, tex: texture('var(--panel-border)') };
      gl.bindBuffer(gl.ARRAY_BUFFER, grid.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
      // The camera frames the build, aimed low so it reaches the top; it holds still while you drag.
      const fit = { c: [X / 2, Y * .4, Z / 2], r: Math.hypot(X / 2, Y * .6, Z / 2) };
      if (edit) held = fit; else Object.assign(goal, fit);
      if (!cur.c) { cur.c = goal.c.slice(); cur.r = goal.r; }
      shown = s.blocks;
      relight();
      start = performance.now();
      tick();
    };

    const draw = () => {
      if (!cur.c) return false; // nothing shown yet
      const now = performance.now(), dt = Math.min(.05, (now - (last || now)) / 1000);
      last = now;
      if (spin) yaw += dt * .35;
      // The camera glides to a new size instead of jumping.
      const f = reduce.matches ? 1 : 1 - Math.exp(-dt * 9);
      cur.c = cur.c.map((v, i) => v + (goal.c[i] - v) * f); cur.r += (goal.r - cur.r) * f;
      const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const fov = .7, half = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * w / h)); // fit the narrower way
      const dist = cur.r / Math.sin(half) * 1.05 / zoom, c = cur.c;
      const eye = [c[0] + dist * Math.cos(pitch) * Math.sin(yaw), c[1] + dist * Math.sin(pitch), c[2] + dist * Math.cos(pitch) * Math.cos(yaw)];
      const m = mul(perspective(fov, w / h, .1, dist * 4), lookAt(eye, c));
      cam = { eye, c: c.slice(), fov, w, h, m };
      gl.uniformMatrix4fv(U('m'), false, m);
      const t = reduce.matches ? 99 : (now - start) / 1000;
      gl.uniform1f(U('t'), t); gl.uniform1f(U('pop'), pop);
      const bind = g => {
        gl.bindBuffer(gl.ARRAY_BUFFER, g.buf);
        [3, 2, 1, 1, 3].reduce((off, size, i) => {
          gl.enableVertexAttribArray(A[i]); gl.vertexAttribPointer(A[i], size, gl.FLOAT, false, STRIDE * 4, off * 4);
          return off + size;
        }, 0);
        gl.bindTexture(gl.TEXTURE_2D, g.tex.t);
        gl.uniform1f(U('vs'), g.tex.vs); gl.uniform1f(U('edge'), g.tex.edge); gl.uniform1f(U('clear'), g.clear ? 1 : 0);
      };
      if (grid) { bind(grid); gl.drawArrays(gl.LINES, 0, grid.n); }
      for (const g of groups) {
        if (g.clear) { gl.enable(gl.BLEND); gl.depthMask(false); }
        bind(g); gl.drawArrays(gl.TRIANGLES, 0, g.n);
      }
      if (glowBuf) { gl.enable(gl.BLEND); gl.depthMask(false); bind(glowBuf); gl.drawArrays(gl.TRIANGLES, 0, glowBuf.n); }
      gl.disable(gl.BLEND); gl.depthMask(true);
      const moving = Math.abs(goal.r - cur.r) > .01 || goal.c.some((v, i) => Math.abs(v - cur.c[i]) > .01);
      return spin || moving || t < until;
    };
    const tick = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (draw()) tick(); else last = 0; }); };

    // The block under the pointer: a ray from the camera through it, tested against every box (slab method).
    const sub = (a, b) => a.map((v, i) => v - b[i]), norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const pick = e => {
      if (!cam) return null;
      const r = canvas.getBoundingClientRect(), f = 1 / Math.tan(cam.fov / 2);
      const nx = 2 * (e.clientX - r.left) / cam.w - 1, ny = 1 - 2 * (e.clientY - r.top) / cam.h;
      const fw = norm(sub(cam.c, cam.eye)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
      const dir = fw.map((v, i) => v + rt[i] * nx * cam.w / cam.h / f + up[i] * ny / f), o = cam.eye;
      let best = null;
      for (const b of shown) for (const [x0, x1, y0, y1, z0, z1] of b.boxes || [[0, 1, 0, 1, 0, 1]]) {
        const lo = [b.x + x0, b.y + y0, b.z + z0], hi = [b.x + x1, b.y + y1, b.z + z1];
        let t0 = 0, t1 = Infinity, ax = -1;
        for (let i = 0; i < 3 && t0 <= t1; i++) {
          if (Math.abs(dir[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) t0 = Infinity; continue; }
          let a = (lo[i] - o[i]) / dir[i], c = (hi[i] - o[i]) / dir[i];
          if (a > c) [a, c] = [c, a];
          if (a > t0) { t0 = a; ax = i; }
          t1 = Math.min(t1, c);
        }
        if (ax >= 0 && t0 <= t1 && (!best || t0 < best.t)) {
          const n = [0, 0, 0]; n[ax] = dir[ax] > 0 ? -1 : 1;
          best = { t: t0, b, n, p: o.map((v, i) => v + dir[i] * t0) };
        }
      }
      return best;
    };
    const screen = p => { // world point -> CSS pixels in the canvas
      const m = cam.m, q = [0, 1, 2, 3].map(i => m[i] * p[0] + m[4 + i] * p[1] + m[8 + i] * p[2] + m[12 + i]);
      return [(q[0] / q[3] + 1) / 2 * cam.w, (1 - q[1] / q[3]) / 2 * cam.h];
    };

    // The lit blocks (what a drag would change): inflated see-through accent boxes drawn over the build.
    const relight = () => {
      if (glowBuf) { gl.deleteBuffer(glowBuf.buf); glowBuf = null; }
      const want = lit && shown.filter(lit);
      if (!want?.length) return tick();
      const data = [], e = .02;
      for (const b of want) for (const [n, corners, shade] of FACES) for (const k of [0, 1, 2, 0, 2, 3]) {
        const [i, j, l] = corners[k];
        const [u, v] = n[1] ? [i, l] : n[0] ? [l, 1 - j] : [i, 1 - j];
        data.push(b.x + (i ? 1 + e : -e), b.y + (j ? 1 + e : -e), b.z + (l ? 1 + e : -e), u, v, shade, -1, b.x + .5, b.y + .5, b.z + .5);
      }
      glowBuf = { buf: gl.createBuffer(), n: data.length / STRIDE, tex: texture('color-mix(in srgb, var(--accent) 38%, transparent)'), clear: true };
      gl.bindBuffer(gl.ARRAY_BUFFER, glowBuf.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      tick();
    };
    const setLit = f => { if (f !== lit) { lit = f; relight(); } };

    // Drag a lit part to edit it, empty space to turn and tilt; wheel or pinch to zoom.
    const pts = new Map();
    let pinch = 0, edit = null;
    const endEdit = () => {
      if (!edit) return;
      edit = null;
      if (held) { Object.assign(goal, held); held = null; } // now frame the new size
      setLit(null); canvas.style.cursor = ''; tick();
    };
    canvas.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, [e.clientX, e.clientY]); canvas.setPointerCapture(e.pointerId);
      if (pts.size > 1) return endEdit(); // a second finger: pinch, not edit
      const hit = api.grab && pick(e), handle = hit && api.grab(hit);
      if (handle) { edit = { handle, x: e.clientX, y: e.clientY, p: hit.p, axis: null }; setLit(handle.glow); canvas.style.cursor = 'grabbing'; }
    });
    canvas.addEventListener('pointermove', e => {
      const prev = pts.get(e.pointerId);
      if (!prev) { // hovering: light up what a drag here would change
        if (e.pointerType !== 'mouse' || !api.grab) return;
        const hit = pick(e), handle = hit && api.grab(hit);
        canvas.style.cursor = handle ? 'move' : '';
        return setLit(handle ? handle.glow : null);
      }
      if (edit) {
        const dx = e.clientX - edit.x, dy = e.clientY - edit.y;
        if (!edit.axis) {
          if (Math.hypot(dx, dy) < 6) return;
          // The axis that points most along the drag on screen. One pointing mostly at the camera looks
          // short on screen; counting a block as at least half its upright size keeps it from racing.
          let best = -1;
          const p0 = screen(edit.p), up = screen([edit.p[0], edit.p[1] + 1, edit.p[2]]), floor = Math.hypot(up[0] - p0[0], up[1] - p0[1]) / 2;
          for (const a of edit.handle.axes) {
            const p1 = screen(edit.p.map((v, i) => v + a.dir[i])), s = [p1[0] - p0[0], p1[1] - p0[1]], l = Math.hypot(...s);
            const cos = l < 1 ? 0 : Math.abs(s[0] * dx + s[1] * dy) / l / Math.hypot(dx, dy);
            if (cos > best) { best = cos; edit.axis = a; edit.s = s.map(v => v / l * Math.max(l, floor)); }
          }
          if (edit.axis.glow) setLit(edit.axis.glow);
        }
        const s = edit.s, l2 = s[0] * s[0] + s[1] * s[1];
        if (l2 >= 1) edit.axis.move((dx * s[0] + dy * s[1]) / l2);
        return;
      }
      if (pts.size === 1) {
        yaw -= (e.clientX - prev[0]) * .01;
        pitch = Math.min(1.45, Math.max(.05, pitch + (e.clientY - prev[1]) * .01));
      }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoom = Math.min(4, Math.max(.4, zoom * d / pinch));
        pinch = d;
      }
      tick();
    });
    const up = e => { pts.delete(e.pointerId); pinch = 0; endEdit(); };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.min(4, Math.max(.4, zoom * Math.exp(-e.deltaY * .0015))); tick(); }, { passive: false });
    new ResizeObserver(tick).observe(canvas);

    canvas.addEventListener('pointerleave', () => { if (!pts.size) setLit(null); });

    const api = {
      show, grab: null,
      reset: () => { seen = new Set(); cur.c = null; fresh0 = true; },
      forget: () => texCache.clear(),
      spin: on => { spin = on; tick(); },
      // The current picture; read right after drawing, while the frame is still there.
      snapshot: () => { start = -1e9; draw(); return canvas; },
    };
    return api;
  };
})();
