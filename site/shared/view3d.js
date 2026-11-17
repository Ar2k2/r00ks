// A small 3D block view on a canvas, shared by the build tools. No library: blocks are drawn as
// shaded boxes, far faces first, seen from above at an angle. Drag sideways to turn it.
//   const view = View3D(canvas, fitWidth);
//   view.show({ dims: [X, Y, Z], tone, shape, floor });
// tone: Uint8Array X*Y*Z indexed (y * Z + z) * X + x; 0 empty, 1 accent, 2 muted.
// shape(x, y, z): optional, returns boxes [x0, x1, y0, y1, z0, z1] in 0..1 for a cell that isn't a
// full cube (stairs, slabs). floor: optional [[x, z], ...] cells tinted on the ground.
(() => {
  const FACES = [ // normal, then the face's corners on the unit box (0 = low end, 1 = high end per axis)
    [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]],
    [[0, 1, 0], [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
    [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]],
  ];
  const PITCH = [.1, 1.45]; // how far the view can tilt: nearly side-on to nearly straight down

  window.View3D = (canvas, fitWidth) => {
    const ctx = canvas.getContext('2d');
    let yaw = .4, pitch = .6, scene = null, faces = [], frame = 0;

    // Exposed faces only, worked out once per shape so turning stays quick.
    const show = s => {
      scene = s; faces = [];
      const [X, Y, Z] = s.dims, at = (x, y, z) => (y * Z + z) * X + x;
      const full = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < X && y < Y && z < Z && s.tone[at(x, y, z)] && !(s.shape && s.shape(x, y, z));
      for (let y = 0; y < Y; y++) for (let z = 0; z < Z; z++) for (let x = 0; x < X; x++) {
        const tone = s.tone[at(x, y, z)];
        if (!tone) continue;
        const boxes = s.shape && s.shape(x, y, z);
        for (const [x0, x1, y0, y1, z0, z1] of boxes || [[0, 1, 0, 1, 0, 1]])
          for (const [n, corners] of FACES) {
            if (!boxes && full(x + n[0], y + n[1], z + n[2])) continue;
            faces.push({ n, tone, p: corners.map(([i, j, k]) => [x + (i ? x1 : x0), y + (j ? y1 : y0), z + (k ? z1 : z0)]) });
          }
      }
      draw();
    };

    const draw = () => {
      if (!scene) return;
      const color = v => { canvas.style.color = v; return getComputedStyle(canvas).color; };
      const [X, Y, Z] = scene.dims, mx = X / 2, my = Y / 2, mz = Z / 2;
      let cs, sn, cp, sp;
      // Camera space: right, up, distance from the eye. Right is -x when looking toward +z, as in the game.
      const D = 2.5 * Math.max(X, Y, Z);
      const cam = (x, y, z, o = 1) => {
        const a = (x - mx * o) * cs - (z - mz * o) * sn, b = (x - mx * o) * sn + (z - mz * o) * cs, h = y - my * o;
        return [-a, h * cp + b * sp, b * cp - h * sp + D * o];
      };
      const proj = (x, y, z) => { // screen x, screen y (down), depth (far is bigger)
        const [r, u, w] = cam(x, y, z), f = D / w;
        return [r * f, -u * f, w];
      };
      // Fit to the outline over every turn and tilt, so the canvas keeps its size while it moves.
      const pts = [];
      for (let t = 0; t <= 4; t++) {
        const pt = PITCH[0] + (PITCH[1] - PITCH[0]) * t / 4;
        cp = Math.cos(pt); sp = Math.sin(pt);
        for (let k = 0; k < 32; k++) {
          cs = Math.cos(k * Math.PI / 16); sn = Math.sin(k * Math.PI / 16);
          for (const x of [0, X]) for (const z of [0, Z]) pts.push(proj(x, 0, z), proj(x, Y, z));
        }
      }
      cs = Math.cos(yaw); sn = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const pw = fitWidth(), s = Math.min((pw - 24) / (x1 - x0), 460 / (y1 - y0), 40);
      const ph = Math.ceil((y1 - y0) * s + 24), dpr = devicePixelRatio || 1;
      canvas.width = pw * dpr; canvas.height = ph * dpr;
      canvas.style.width = pw + 'px'; canvas.style.height = ph + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, pw, ph);
      const at = p => [(p[0] - (x0 + x1) / 2) * s + pw / 2, (p[1] - y0) * s + 12];
      const poly = ps => { ctx.beginPath(); ps.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](...at(p))); ctx.closePath(); };
      const line = (a, b) => { ctx.beginPath(); ctx.moveTo(...at(proj(...a))); ctx.lineTo(...at(proj(...b))); ctx.stroke(); };

      // Ground: tinted cells, then a grid with a stronger line every 5 blocks.
      const accent = color('var(--accent)');
      ctx.fillStyle = accent; ctx.globalAlpha = .22;
      for (const [x, z] of scene.floor || []) { poly([[x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1]].map(q => proj(...q))); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
      const thin = color('var(--panel-border)'), strong = color('var(--faint)'), dense = s >= 5;
      for (let i = 0; i <= X; i++) if (dense || !(i % 5) || i === X) { ctx.strokeStyle = i % 5 && i !== X ? thin : strong; line([i, 0, 0], [i, 0, Z]); }
      for (let i = 0; i <= Z; i++) if (dense || !(i % 5) || i === Z) { ctx.strokeStyle = i % 5 && i !== Z ? thin : strong; line([0, 0, i], [X, 0, i]); }

      // Blocks: faces turned toward the viewer, far ones first. Tops are lightest, sides shaded by angle.
      const fills = [null, accent, color('color-mix(in srgb, var(--accent) 30%, var(--panel))')];
      const list = [];
      for (const f of faces) {
        const n = cam(...f.n, 0), q = cam(...f.p[0]);
        if (n[0] * q[0] + n[1] * q[1] + n[2] * q[2] >= 0) continue; // faces away from the eye
        const [nx, ny, nz] = f.n;
        const p = f.p.map(q => proj(...q));
        list.push({ p, d: (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4, tone: f.tone, shade: ny ? 0 : .14 + .2 * (1 - Math.abs(nx * cs - nz * sn)) });
      }
      list.sort((a, b) => b.d - a.d);
      const edge = color('var(--panel)'), edges = s >= 8;
      ctx.strokeStyle = edge;
      for (const f of list) {
        ctx.beginPath(); f.p.forEach((q, i) => ctx[i ? 'lineTo' : 'moveTo'](...at(q))); ctx.closePath();
        ctx.fillStyle = fills[f.tone]; ctx.fill();
        if (f.shade) { ctx.fillStyle = `rgba(0,0,0,${f.shade})`; ctx.fill(); }
        if (edges) { ctx.globalAlpha = .5; ctx.stroke(); ctx.globalAlpha = 1; }
      }
    };

    // Drag sideways to turn and up or down to tilt: the near side follows the pointer.
    let dragX = null, dragY = 0;
    canvas.addEventListener('pointerdown', e => { if (scene && canvas.classList.contains('turn')) { dragX = e.clientX; dragY = e.clientY; canvas.setPointerCapture(e.pointerId); } });
    canvas.addEventListener('pointermove', e => {
      if (dragX === null) return;
      yaw -= (e.clientX - dragX) * .012; dragX = e.clientX;
      pitch = Math.min(PITCH[1], Math.max(PITCH[0], pitch + (e.clientY - dragY) * .012)); dragY = e.clientY;
      cancelAnimationFrame(frame); frame = requestAnimationFrame(draw);
    });
    const end = () => { dragX = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    return { show, draw };
  };
})();
