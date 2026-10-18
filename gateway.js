// THE GATEWAY: the game's title screen art, alive, as the title menu draws it (grimhollow-godot
// scripts/ui/title_fx.gd and its shaders, the engraved look): the amber engraving, a warm halo behind
// it, striped fog at the party's feet drifting left, three pixel torches with ringed pixel glows, and
// embers peeling off the knight's torch to the left. Positions and settings are the game's own,
// measured on the picture (TORCHES, EMBER_RECIPES, FOG_*, HALO_*). Reduced motion shows one still frame.
(function () {
  "use strict";
  var box = document.getElementById("gateway");
  if (!box) return;
  var gl_canvas = document.getElementById("gateway-gl");
  var fx_canvas = document.getElementById("gateway-embers");
  var still = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
              /[?&]still\b/.test(location.search);   // ?still shows the reduced-motion frame, for checking it

  var PIC_W = 1448, PIC_H = 1086, WR = PIC_W / PIC_H;     // the engraving's size and aspect
  // The art box around the picture, in picture heights: room for the halo above and the fog below and to the sides.
  var PAD_L = 0.24, PAD_R = 0.24, PAD_T = 0.06, PAD_B = 0.16;
  var BOX_W = WR + PAD_L + PAD_R, BOX_H = 1 + PAD_T + PAD_B;

  // title_fx.gd TORCHES: the cup (u, v) as fractions of the picture, the painted flame's height h in picture heights.
  var TORCHES = [
    { id: "knight", u: 0.564, v: 0.442, h: 0.046, glow: 1.0, phase: 0.0, speed: 0.50, recipe: "across" },
    { id: "left", u: 0.296, v: 0.425, h: 0.046, glow: 0.7, phase: 1.7, speed: 0.41, recipe: "local" },
    { id: "right", u: 0.698, v: 0.422, h: 0.050, glow: 0.7, phase: 3.1, speed: 0.36, recipe: "local" }
  ];
  var FLAME_SCALE = 2.0;

  var VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
  var FS = [
    "precision mediump float;",
    "uniform sampler2D pic; uniform vec2 res; uniform vec2 origin; uniform float H; uniform float t; uniform float flick;",
    "uniform vec4 torch[3]; uniform vec2 tparam[3];",   // torch: cup x, cup y (picture heights), flame h, glow reach; tparam: phase, speed
    "const float WR = " + WR.toFixed(6) + ";",
    "float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }",
    "float vnoise(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }",
    "float fbm(vec2 q){ float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++){ s += a*vnoise(q); q *= 2.03; a *= 0.5; } return s; }",
    // the fog's body: an ellipse round their feet (FOG_BODY_V 0.73, FOG_RX 0.52 W, FOG_RY 0.37 H), fading in from 0.37 H
    // to the waist at 0.48 H, thinner over the torsos, its texture carried left on one wind
    "float fog(vec2 uv){",
    "  float wob = (fbm(vec2(uv.x*3.0 + t*0.035, uv.y*3.0)) - 0.5) * 0.30;",
    "  float e = length(vec2((uv.x-0.5)/0.52, (uv.y-0.73)/0.37)) + wob;",
    "  float env = 1.0 - smoothstep(0.55, 1.05, e);",
    "  float top = smoothstep(0.37, 0.52, uv.y);",
    "  float torso = mix(0.55, 1.0, smoothstep(0.52, 0.70, uv.y));",
    "  float d = fbm(vec2(uv.x*5.0 + t*0.045, uv.y*9.0 + t*0.01));",
    "  return clamp(env * top * torso * smoothstep(0.30, 0.78, d) * 1.15, 0.0, 1.0);",
    "}",
    // a pixel torch (title_flame.gdshader px_style 1): the flame sampled on a 3-pixel grid, stepped at 8 frames a second,
    // coloured in four golds from amber at its edge to a pale yellow heart
    "vec4 flame(vec2 pp, vec4 tc, vec2 tp){",
    "  float fh = tc.z * 2.0, fw = fh * 0.62, cs = 3.0/640.0;",
    "  vec2 tl = vec2(tc.x - fw*0.5, tc.y - fh*0.92);",
    "  vec2 lp = pp - tl; if (lp.x < 0.0 || lp.y < 0.0 || lp.x > fw || lp.y > fh) return vec4(0.0);",
    "  vec2 c = (floor(lp/cs) + 0.5) * cs; vec2 lv = c / vec2(fw, fh);",
    "  float tm = floor(t*8.0)/8.0; float y = 1.0 - lv.y;",
    "  float sway = (0.07*sin(tm*2.3 + tp.x) + 0.05*sin(tm*5.1 + tp.x*1.7)) * y*y;",
    "  float hw = (0.09 + 0.22*sin(clamp(y/0.8, 0.0, 1.0)*3.14159)) * (1.0 - 0.55*y);",
    "  float n = fbm(vec2(lv.x*3.0, y*2.5 - tm*tp.y*4.0) + tp.x);",
    "  float shape = 1.0 - smoothstep(hw*0.55, hw + 0.04, abs(lv.x - 0.5 - sway));",
    "  float v = shape * (1.15 - y*0.95) + (n - 0.5)*0.55*y;",
    "  if (v < 0.18) return vec4(0.0);",
    "  vec3 rgb = v < 0.42 ? vec3(0.55,0.33,0.06) : (v < 0.68 ? vec3(0.84,0.60,0.16) : (v < 0.90 ? vec3(0.96,0.80,0.32) : vec3(1.0,0.96,0.70)));",
    "  return vec4(rgb, 0.95);",
    "}",
    // its ringed pixel glow (title_torch_glow.gdshader style 1): three steps of alpha on a 2-pixel grid, breathing in eighths
    "vec3 glow(vec2 pp, vec4 tc){",
    "  float cs = 2.0/640.0; vec2 cc = (floor(pp/cs) + 0.5) * cs;",
    "  vec2 ctr = vec2(tc.x, tc.y - tc.z*2.0*0.25); float R = 2.4 * tc.z * tc.w;",
    "  float d = length(cc - ctr) / R; float f = floor(clamp(flick, 0.5, 1.4)*8.0 + 0.5)/8.0;",
    "  float g = pow(clamp(1.0 - d, 0.0, 1.0), 1.6) * f * tc.w;",
    "  float a = g > 0.55 ? 0.34 : (g > 0.30 ? 0.22 : (g > 0.12 ? 0.12 : 0.0));",
    "  return vec3(0.96,0.78,0.30) * a;",
    "}",
    "void main(){",
    "  vec2 frag = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);",
    "  vec2 pp = (frag - origin) / H;",              // picture heights from the picture's top-left
    "  vec2 uv = vec2(pp.x / WR, pp.y);",
    "  vec3 col = vec3(0.090, 0.075, 0.063);",        // SMOKE, the title's ground
    // the halo BEHIND the picture: centred on the picture's width at the torch's height, 1.05 H across, 0.40 at its centre
    "  float hd = length(vec2(pp.x - 0.5*WR, pp.y - 0.442)) / 0.525;",
    "  float ha = 0.40 * clamp(0.80 + 0.20*flick, 0.6, 1.0) * pow(clamp(1.0 - hd, 0.0, 1.0), 1.4);",
    "  col = mix(col, vec3(0.784, 0.573, 0.184), ha);",
    "  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0){",
    "    vec4 p = texture2D(pic, uv); col = col * (1.0 - p.a) + p.rgb;",   // premultiplied: no grey fringe from the clear pixels
    "  }",
    // the fog, drawn as the engraving is drawn: lines 10 source pixels apart, thicker where it is thicker, three strengths,
    // in the engraving's own gold, warmed in steps near the knight's torch
    "  float a = fog(uv);",
    "  float ph = abs(fract(pp.y * 1086.0 / 10.0) - 0.5) * 2.0;",
    "  if (ph < a*0.95 && a > 0.06){",
    "    float st = a < 0.30 ? 0.45 : (a < 0.55 ? 0.65 : 0.85);",
    "    float wd = length(vec2(pp.x - torch[0].x, (pp.y - torch[0].y)*0.8)) / 0.30;",
    "    vec3 warm = vec3(0.16, 0.10, 0.0) * floor(clamp(1.0 - wd, 0.0, 1.0)*3.0)/3.0;",
    "    col = mix(col, clamp(vec3(0.784, 0.573, 0.184) + warm, 0.0, 1.0), st);",
    "  }",
    "  for (int i = 0; i < 3; i++){ col += glow(pp, torch[i]); }",
    "  for (int i = 0; i < 3; i++){ vec4 f = flame(pp, torch[i], tparam[i]); col = mix(col, f.rgb, f.a); }",
    "  gl_FragColor = vec4(min(col, 1.0), 1.0);",
    "}"
  ].join("\n");

  var gl = null, prog = null, loc = {}, picReady = false;
  try { gl = gl_canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false }); } catch (e) { gl = null; }
  if (!gl) { box.classList.add("no-gl"); return; }

  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
    return s;
  }
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { box.classList.add("no-gl"); if (window.console) console.warn("gateway:", e.message); return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  var ap = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(ap);
  gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  ["pic", "res", "origin", "H", "t", "flick", "torch", "tparam"].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });

  var tex = gl.createTexture();
  var img = new Image();
  var loaded = false;
  // The picture goes up at its ON-SCREEN size, scaled by the browser's own high-quality resampler and premultiplied,
  // so the fine engraved lines neither shimmer nor pick up the colour hidden in the clear pixels between them.
  function upload() {
    if (!loaded) return;
    var w = Math.max(2, Math.round(WR * H)), h = Math.max(2, Math.round(H));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var cx = c.getContext("2d"); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
    cx.drawImage(img, 0, 0, w, h);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  img.onload = function () {
    loaded = true; upload();
    picReady = true;
    box.classList.add("live");
  };
  img.src = gl_canvas.getAttribute("data-src");

  // ----- sizing: the GL canvas fills the art box; the ember canvas covers the whole hero so embers can drift left past it
  var dpr = 1, H = 1, ox = 0, oy = 0, hero = box.closest(".hero") || box;
  var fxc = fx_canvas.getContext("2d");
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = box.getBoundingClientRect();
    var cw = Math.round(r.width * dpr), ch = Math.round(r.width / BOX_W * BOX_H * dpr);
    gl_canvas.width = cw; gl_canvas.height = ch;
    gl_canvas.style.height = (ch / dpr) + "px";
    H = ch / BOX_H; ox = PAD_L * H; oy = PAD_T * H;
    gl.viewport(0, 0, cw, ch);
    upload();
    var hr = hero.getBoundingClientRect();
    fx_canvas.width = Math.round(hr.width * dpr); fx_canvas.height = Math.round(hr.height * dpr);
    fx_canvas.style.width = hr.width + "px"; fx_canvas.style.height = hr.height + "px";
  }

  // ----- the knight's breath: a flicker that eases toward a new random target, with a gust now and then
  var flick = 1.0, target = 1.0, nextT = 0;
  function breathe(t) {
    if (t > nextT) { target = 0.75 + Math.random() * 0.45; nextT = t + 0.08 + Math.random() * 0.25; }
    flick += (target - flick) * 0.18;
  }

  // ----- embers (title_fx.gd EMBER_RECIPES), in screen pixels scaled from the 640-tall design picture
  var RECIPES = {
    across: { rate: 65 / 16, life: 16, dir: [-1, -0.35], spread: 32, vel: [17.6, 41.6], grav: [-10.4, 2.3], size: [0.30, 0.55], turb: 0.012, born: 0.40, box: 0.12 },
    sparks: { rate: 80 / 5, life: 5, dir: [-0.35, -1], spread: 42, vel: [30, 75], grav: [-9, 6], size: [0.09, 0.17], turb: 0.020, born: 0.55, box: 0.20 },
    local: { rate: 10 / 3.5, life: 3.5, dir: [-0.25, -1], spread: 30, vel: [12, 30], grav: [-5, -8], size: [0.22, 0.40], turb: 0.008, born: 0.55, box: 0.25 }
  };
  var parts = [], acc = {};
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function spawn(torch, rec, s) {
    var heroR = hero.getBoundingClientRect(), boxR = box.getBoundingClientRect();
    var bx = (boxR.left - heroR.left) * dpr + ox + torch.u * WR * H;
    var fh = torch.h * FLAME_SCALE * H;
    var by = (boxR.top - heroR.top) * dpr + oy + torch.v * H - fh * rec.born + rnd(-0.5, 0.5) * fh * rec.box;
    var ang = Math.atan2(rec.dir[1], rec.dir[0]) + rnd(-0.5, 0.5) * rec.spread * Math.PI / 180;
    var sp = rnd(rec.vel[0], rec.vel[1]) * s;
    parts.push({ x: bx + rnd(-0.3, 0.3) * fh * 0.3, y: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      gx: rec.grav[0] * s, gy: rec.grav[1] * s, age: 0, life: rec.life * rnd(0.7, 1.0),
      size: Math.max(1, Math.round(rnd(rec.size[0], rec.size[1]) * 12 * s)), turb: rec.turb, seed: Math.random() * 100 });
  }
  function stepEmbers(dt) {
    var s = H / 640;   // the design picture is 640 tall; speeds and sizes ride the picture's on-screen height
    TORCHES.forEach(function (tc) {
      var names = tc.recipe === "across" ? ["across", "sparks"] : ["local"];
      names.forEach(function (n) {
        var k = tc.id + n; acc[k] = (acc[k] || 0) + RECIPES[n].rate * dt;
        while (acc[k] >= 1) { acc[k] -= 1; spawn(tc, RECIPES[n], s); }
      });
    });
    var W = fx_canvas.width;
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.age += dt;
      if (q.age > q.life || q.x < -20) { parts.splice(i, 1); continue; }
      var wob = Math.sin(q.age * 2.1 + q.seed) * q.turb * H, wob2 = Math.cos(q.age * 1.7 + q.seed * 1.3) * q.turb * H;
      q.vx += (q.gx + wob) * dt; q.vy += (q.gy + wob2) * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
  }
  function drawEmbers() {
    fxc.clearRect(0, 0, fx_canvas.width, fx_canvas.height);
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i], f = q.age / q.life;
      // gold-bright -> torch gold -> ember red -> gone, in steps, with a slow twinkle
      var c = f < 0.30 ? "227,183,95" : (f < 0.65 ? "200,146,47" : "158,31,23");
      var a = (f < 0.08 ? f / 0.08 : (f > 0.85 ? (1 - f) / 0.15 : 1)) * (0.65 + 0.35 * Math.sin(q.age * 6 + q.seed));
      a = Math.round(Math.max(0, a) * 4) / 4;
      if (a <= 0) continue;
      fxc.fillStyle = "rgba(" + c + "," + a + ")";
      var px = Math.round(q.x / q.size) * q.size, py = Math.round(q.y / q.size) * q.size;
      fxc.fillRect(px, py, q.size, q.size);
    }
  }

  function draw(t) {
    if (!picReady) return;
    gl.uniform1i(loc.pic, 0);
    gl.uniform2f(loc.res, gl_canvas.width, gl_canvas.height);
    gl.uniform2f(loc.origin, ox, oy);
    gl.uniform1f(loc.H, H);
    gl.uniform1f(loc.t, t);
    gl.uniform1f(loc.flick, flick);
    var tv = [], tpv = [];
    TORCHES.forEach(function (tc) { tv.push(tc.u * WR, tc.v, tc.h, tc.glow); tpv.push(tc.phase, tc.speed); });
    gl.uniform4fv(loc.torch, new Float32Array(tv));
    gl.uniform2fv(loc.tparam, new Float32Array(tpv));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  var last = 0, t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    breathe(t); draw(t);
    if (!still) { stepEmbers(dt); drawEmbers(); }
    if (!still || !picReady) requestAnimationFrame(frame);
  }
  size();
  window.addEventListener("resize", function () { size(); parts.length = 0; if (still) draw(4.0); });
  if (still) { flick = 1.0; var wait = function () { if (picReady) draw(4.0); else requestAnimationFrame(wait); }; wait(); }
  else {
    // pre-warm the embers so the first frame already has a drift in the air
    var s0 = function () { if (!picReady) return requestAnimationFrame(s0); for (var k = 0; k < 240; k++) stepEmbers(1 / 20); requestAnimationFrame(frame); };
    s0();
  }
})();
