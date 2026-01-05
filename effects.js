// effects.js

(function () {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const supportsWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  })();

  const lerp = (a, b, n) => a + (b - a) * n;

  const onReady = (cb) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      cb();
    } else {
      document.addEventListener('DOMContentLoaded', cb);
    }
  };

  // Hide native cursor everywhere, including links/buttons
  function hideSystemCursor() {
    const style = document.createElement('style');
    style.textContent = `
      html, body, a, button, [role="button"], input, textarea, select {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ===== Soft, responsive WebGL liquid background =====
  function initLiquidBackground() {
    if (!supportsWebGL) {
      console.warn('WebGL not supported, liquid background disabled.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'liquid-bg-canvas';
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '-1',
      pointerEvents: 'none',
      display: 'block',
    });
    document.body.prepend(canvas);

    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) {
      console.warn('WebGL context failed, liquid background disabled.');
      return;
    }

    let width, height;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1.5, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    const vertexSrc = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSrc = `
      precision highp float;
      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) +
               (c - a) * u.y * (1.0 - u.x) +
               (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = v_uv;

        vec2 m = u_mouse / u_resolution;
        m.y = 1.0 - m.y;

        float dist = distance(uv, m);
        float mouseInfluence = smoothstep(0.7, 0.0, dist);

        vec2 offset = (uv - m) * (0.08 + 0.25 * mouseInfluence);
        float t = u_time * 0.05;

        float n1 = fbm(uv * 2.0 + t);
        float n2 = fbm((uv + offset) * (2.6 + mouseInfluence) - t * (1.0 + 0.5 * mouseInfluence));
        float n3 = fbm(uv * 3.4 + t * 0.4);

        float liquid = smoothstep(0.25, 0.75, n1 * 0.45 + n2 * 0.35 + n3 * 0.2);

        vec3 colA = vec3(0.02, 0.01, 0.06);
        vec3 colB = vec3(0.26, 0.07, 0.25);
        vec3 colC = vec3(0.09, 0.25, 0.55);
        vec3 colD = vec3(0.85, 0.42, 0.32);

        float mixAB = smoothstep(0.3, 0.7, n2);
        float mixBC = smoothstep(0.3, 0.7, n3);

        vec3 base = mix(colA, colB, mixAB);
        base = mix(base, colC, mixBC * 0.6);
        base = mix(base, colD, liquid * 0.35);

        float vignette = smoothstep(1.25, 0.65, length(uv - 0.5));

        vec2 grad = vec2(
          fbm(uv * 4.0 + t * 0.8) - fbm(uv * 4.0 - t * 0.8),
          fbm(uv.yx * 4.0 - t * 0.7) - fbm(uv.yx * 4.0 + t * 0.7)
        );
        float spec = pow(max(dot(normalize(grad), normalize(m - uv)), 0.0), 5.0);
        vec3 highlight = vec3(1.0, 0.98, 0.95) * spec * (0.9 + 0.6 * mouseInfluence);

        vec3 color = base * vignette + highlight;
        color *= 0.97 + 0.03 * sin(t * 1.0);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function createShader(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertShader = createShader(gl.VERTEX_SHADER, vertexSrc);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.bindAttribLocation(program, 0, 'a_position');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionLocation = 0;
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const verts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let smoothedMouse = { x: mouse.x, y: mouse.y };

    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    let start = performance.now();
    function render() {
      const now = performance.now();
      const t = (now - start) / 1000;

      smoothedMouse.x = lerp(smoothedMouse.x, mouse.x, 0.08);
      smoothedMouse.y = lerp(smoothedMouse.y, mouse.y, 0.08);

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, smoothedMouse.x, canvas.height - smoothedMouse.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    }
    render();
  }

  // ===== Soft custom cursor, system cursor hidden =====
  function initCustomCursor() {
    if (isTouch) return;

    // Hide default cursor globally (style tag handles links/buttons too)
    document.documentElement.style.cursor = 'none';
    document.body.style.cursor = 'none';

    const cursor = document.createElement('div');
    cursor.id = 'magnetic-cursor';
    Object.assign(cursor.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '20px',
      height: '20px',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.55)',
      boxSizing: 'border-box',
      pointerEvents: 'none',
      zIndex: '9999',
      transform: 'translate3d(-50%, -50%, 0)',
      transition: 'background 260ms ease-out, border-color 260ms ease-out, width 260ms ease-out, height 260ms ease-out',
      mixBlendMode: 'screen',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
    });

    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '4px',
      height: '4px',
      borderRadius: '999px',
      background: 'rgba(255,255,255,0.95)',
      transform: 'translate(-50%, -50%)',
    });
    cursor.appendChild(dot);

    document.body.appendChild(cursor);

    let cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let cursorTarget = { x: cursorPos.x, y: cursorPos.y };

    window.addEventListener('pointermove', (e) => {
      cursorTarget.x = e.clientX;
      cursorTarget.y = e.clientY;
    });

    const interactiveSelectors = 'a, button, [role="button"], input, textarea, select';
    const interactives = Array.from(document.querySelectorAll(interactiveSelectors));

    interactives.forEach((el) => {
      el.addEventListener('pointerenter', () => {
        Object.assign(cursor.style, {
          width: '30px',
          height: '30px',
          borderColor: 'rgba(255,255,255,0.9)',
          background: 'rgba(255,255,255,0.06)',
        });
      });
      el.addEventListener('pointerleave', () => {
        Object.assign(cursor.style, {
          width: '20px',
          height: '20px',
          borderColor: 'rgba(255,255,255,0.55)',
          background: 'transparent',
        });
      });
    });

    function animateCursor() {
      cursorPos.x = lerp(cursorPos.x, cursorTarget.x, 0.14);
      cursorPos.y = lerp(cursorPos.y, cursorTarget.y, 0.14);
      cursor.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0) translate3d(-50%, -50%, 0)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  onReady(() => {
    hideSystemCursor();
    initLiquidBackground();
    initCustomCursor();
  });
})();
