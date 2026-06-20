document.addEventListener('DOMContentLoaded', () => {
  initCanvasReveal();
});

// Canvas Reveal Effect (translates the React CanvasRevealEffect WebGL shader logic to a high-perf 2D Canvas)
function initCanvasReveal() {
  const canvas = document.getElementById('reveal-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let dots = [];
  const totalSize = 20; // grid cell size
  const dotSize = 6;    // 6x6 square dots
  let cols = 0;
  let rows = 0;

  // React component opacities list
  const opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0];
  const startTime = Date.now();

  // Mouse tracking
  let mouse = { x: -9999, y: -9999 };
  let isMouseOver = false;

  // Pseudo-random generator matching GLSL fract(tan(distance...))
  function random(x, y) {
    const PHI = 1.61803398874989484820459;
    // Simple deterministic hash
    const dotProduct = x * PHI + y * 12.9898;
    const sinVal = Math.sin(dotProduct) * 43758.5453;
    return sinVal - Math.floor(sinVal);
  }

  // Double resolution resizing for crisp high-DPI displays
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    cols = Math.ceil(rect.width / totalSize);
    rows = Math.ceil(rect.height / totalSize);

    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Precompute stable random values for each cell coordinates
        const showOffset = random(c, r);
        dots.push({
          x: c * totalSize + totalSize / 2,
          y: r * totalSize + totalSize / 2,
          col: c,
          row: r,
          showOffset: showOffset
        });
      }
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // Mouse event listeners
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    isMouseOver = true;
  });

  window.addEventListener('mouseleave', () => {
    isMouseOver = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const elapsedMs = Date.now() - startTime;
    const elapsedSec = elapsedMs / 1000;

    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;

    // Grid center dimensions
    const centerCol = centerX / totalSize;
    const centerRow = centerY / totalSize;

    // Time-based sweeping factor for the expanding reveal wave
    // Sweeps out at speed factor 0.5
    const timeVal = elapsedSec * 1.8; 

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];

      // Calculate distance in grid columns/rows from the center
      const dx = dot.col - centerCol;
      const dy = dot.row - centerRow;
      const gridDist = Math.sqrt(dx * dx + dy * dy);

      // Intro reveal timing offset matching the shader formula:
      // timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15)
      const timingOffset = gridDist * 0.1 + dot.showOffset * 0.8;

      if (timeVal >= timingOffset) {
        // Shimmer frequency calculation:
        // float rand = random(st2 * floor((u_time / frequency) + showOffset + frequency))
        const frequency = 2.5; // faster twinkle for extra premium vibe
        const timeStep = Math.floor(elapsedSec / frequency + dot.showOffset + frequency);
        const randSeed = random(dot.col * 2 + timeStep, dot.row * 3 - timeStep);
        
        // Pick base opacity
        const opacityIndex = Math.floor(randSeed * opacities.length);
        let baseOpacity = opacities[opacityIndex] * 0.08; // scale down to be a subtle background

        // Apply a brightness boost (flash) when a dot is first revealed
        if (timeVal < timingOffset + 0.35) {
          const progress = (timeVal - timingOffset) / 0.35;
          const flashMultiplier = 1.0 + (1.0 - progress) * 1.5; // up to 2.5x flash
          baseOpacity *= flashMultiplier;
        }

        // Mouse proximity glow calculation
        if (isMouseOver) {
          const mdx = dot.x - mouse.x;
          const mdy = dot.y - mouse.y;
          const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);
          const maxGlowDistance = 140; // area of hover influence

          if (mouseDist < maxGlowDistance) {
            const glowRatio = 1.0 - (mouseDist / maxGlowDistance);
            // Smoothly cubic-ease the glow ratio for nicer falloff
            const glowFactor = glowRatio * glowRatio * glowRatio;
            // Boost dot visibility by up to 0.4 opacity when hovered
            baseOpacity = baseOpacity * (1.0 - glowFactor) + (glowFactor * 0.32);
          }
        }

        // Draw the square dot
        ctx.fillStyle = `rgba(255, 255, 255, ${baseOpacity.toFixed(4)})`;
        ctx.fillRect(dot.x - dotSize / 2, dot.y - dotSize / 2, dotSize, dotSize);
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}
