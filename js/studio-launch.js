async function playStudioLaunch() {
  const target = document.querySelector('.wordmark-icon');
  const overlay = document.querySelector('#studio-launch');
  if (!target || !overlay || typeof target.animate !== 'function') {
    overlay?.remove();
    return;
  }
  if (overlay.dataset.playing) return;
  overlay.dataset.playing = 'true';

  // /animate skill Emil Kowalski easing tokens
  const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const easeInOut = 'cubic-bezier(0.77, 0, 0.175, 1)';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Four-second branded intro: enough time to read each phase without rushing.
  const timing = { entrance: 650, reveal: 1100, hold: 900, exit: 350, flight: 1000 };

  const backdrop = overlay.querySelector('.studio-launch-backdrop');
  const stage = overlay.querySelector('.studio-launch-stage');
  const mark = overlay.querySelector('.studio-launch-mark');
  const icon = mark?.querySelector('.studio-launch-icon') || mark?.querySelector('img');
  const wordmark = overlay.querySelector('.studio-launch-wordmark');
  const titleWrap = overlay.querySelector('.studio-launch-title-wrap');
  const subWrap = overlay.querySelector('.studio-launch-sub-wrap');

  if (!backdrop || !stage || !mark || !icon || !wordmark || !titleWrap || !subWrap) {
    overlay.remove();
    return;
  }

  const animations = [];
  const controller = new AbortController();
  const originalVisibility = target.style.visibility;
  let cleaned = false;
  let safetyTimer;
  let targetObserver;
  function animate(element, keyframes, timing) {
    const animation = element.animate(keyframes, { fill: 'forwards', ...timing });
    animations.push(animation);
    return animation.finished;
  }

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    controller.abort();
    clearTimeout(safetyTimer);
    targetObserver?.disconnect();
    target.style.visibility = originalVisibility;
    overlay.remove();
    animations.forEach(a => {
      try { a.cancel(); } catch {}
    });
  }

  const options = { once: true, signal: controller.signal };
  window.addEventListener('pointerdown', cleanup, { ...options, capture: true });
  window.addEventListener('keydown', event => {
    // Reload shortcuts can still be held as the new page starts.
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        ['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) return;
    cleanup();
  }, { signal: controller.signal, capture: true });
  motion.addEventListener('change', cleanup, options);
  safetyTimer = setTimeout(cleanup, 8000);

  try {
    // Skip intro if URL specifically targets a deep challenge view
    if (['desk', 'globe'].includes(new URLSearchParams(location.search).get('view'))) {
      cleanup();
      return;
    }

    // Reduced motion: subtle static fadeout without spatial travel or pop
    if (motion.matches) {
      target.style.visibility = 'hidden';
      mark.style.opacity = '1';
      mark.style.transform = 'scale(1)';
      titleWrap.style.clipPath = 'inset(0 0% 0 0)';
      titleWrap.style.opacity = '1';
      subWrap.style.clipPath = 'inset(0 0% 0 0)';
      subWrap.style.opacity = '1';
      await animate(overlay, [
        { opacity: 1 },
        { opacity: 0 }
      ], { delay: 1000, duration: 200, easing: easeOut });
      return;
    }

    // Wait for icon asset decode & fonts so rects and layouts are accurate
    let decodeTimer;
    try {
      await Promise.race([
        Promise.all([
          icon.decode ? icon.decode() : Promise.resolve(),
          document.fonts?.ready || Promise.resolve()
        ]),
        new Promise((_, reject) => { decodeTimer = setTimeout(reject, 1200); })
      ]);
    } catch {
      // Proceed even if decode/fonts timeout
    } finally {
      clearTimeout(decodeTimer);
    }
    if (!overlay.isConnected) return;

    // Hide permanent header icon while our animated icon owns the screen
    target.style.visibility = 'hidden';

    // Calculate stage offset so the icon is centered in Phase 1
    const markRect = mark.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const iconCenterOffset = (stageRect.left + stageRect.width / 2) - (markRect.left + markRect.width / 2);
    stage.style.transform = `translateX(${iconCenterOffset}px)`;

    // ==========================================
    // PHASE 1 - ICON ENTRANCE (0-650ms)
    // Scale: 0.85 → 1.08 → 1.0, Opacity: 0 → 1
    // ==========================================
    await animate(mark, [
      { transform: 'scale(0.85)', opacity: 0, offset: 0, easing: easeOut },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.6, easing: easeOut },
      { transform: 'scale(1.0)', opacity: 1, offset: 1 }
    ], { duration: timing.entrance });

    if (!overlay.isConnected) return;

    // ==========================================
    // PHASE 2 - TEXT REVEAL (650-1750ms)
    // Icon slides slightly left while stage centers;
    // Wordmark emerges from behind icon, moving left to right via clip-path
    // "EarthTune" reveals first, "STUDIO" slightly afterward
    // ==========================================
    await Promise.all([
      animate(stage, [
        { transform: `translateX(${iconCenterOffset}px)` },
        { transform: 'translateX(0px)' }
      ], { duration: timing.reveal, easing: easeInOut }),

      animate(titleWrap, [
        { clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-28px)', opacity: 0 },
        { clipPath: 'inset(0 0% 0 0)', transform: 'translateX(0)', opacity: 1 }
      ], { duration: 900, easing: easeOut }),

      animate(subWrap, [
        { clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-20px)', opacity: 0 },
        { clipPath: 'inset(0 0% 0 0)', transform: 'translateX(0)', opacity: 1 }
      ], { delay: 180, duration: 900, easing: easeOut })
    ]);

    if (!overlay.isConnected) return;

    // ==========================================
    // PHASE 3 - COMPLETE LOGO (1750-2650ms)
    // Hold completed EarthTune Studio logo centered briefly and steady
    // ==========================================
    await new Promise(resolve => setTimeout(resolve, timing.hold));

    if (!overlay.isConnected) return;

    // ==========================================
    // PHASE 4 - TEXT EXIT (2650-3000ms)
    // Wordmark smoothly retracts/fades; stage centers icon back to (50vw, 50vh)
    // ==========================================
    await Promise.all([
      animate(stage, [
        { transform: 'translateX(0px)' },
        { transform: `translateX(${iconCenterOffset}px)` }
      ], { duration: timing.exit, easing: easeInOut }),

      animate(titleWrap, [
        { clipPath: 'inset(0 0% 0 0)', transform: 'translateX(0)', opacity: 1 },
        { clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-16px)', opacity: 0 }
      ], { duration: timing.exit, easing: easeOut }),

      animate(subWrap, [
        { clipPath: 'inset(0 0% 0 0)', transform: 'translateX(0)', opacity: 1 },
        { clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-12px)', opacity: 0 }
      ], { duration: 300, easing: easeOut })
    ]);

    if (!overlay.isConnected) return;

    // ==========================================
    // PHASE 5 - SEAMLESS HEADER TRANSITION (3000-4000ms)
    // Icon glides continuously from screen center to destination in application header
    // PHASE 6 — APPLICATION REVEAL
    // Backdrop fades out, seamlessly revealing the studio interface
    // ==========================================
    const from = mark.getBoundingClientRect();
    animations.filter(animation => animation.effect?.target === stage)
      .forEach(animation => animation.cancel());
    // Freeze the flight's layout once, then animate only transforms. This keeps
    // responsive stage reflow from moving the icon mid-flight.
    Object.assign(stage.style, {
      position: 'fixed', left: '0', top: '0',
      width: `${from.width}px`, height: `${from.height}px`,
      transformOrigin: 'top left',
      transform: `translate(${from.left}px, ${from.top}px)`
    });
    Object.assign(mark.style, { width: `${from.width}px`, height: `${from.height}px` });
    wordmark.style.display = 'none';

    const flightEnd = performance.now() + timing.flight;
    const flight = new Promise((resolve, reject) => {
      let active;
      function retarget() {
        const current = stage.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const start = `translate(${current.left}px, ${current.top}px) scale(${current.width / from.width}, ${current.height / from.height})`;
        const end = `translate(${to.left}px, ${to.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
        stage.style.transform = start;
        if (active) {
          active.oncancel = null;
          active.cancel();
        }
        active = stage.animate([{ transform: start }, { transform: end }], {
          duration: Math.max(0, flightEnd - performance.now()),
          easing: easeInOut, fill: 'forwards'
        });
        animations.push(active);
        active.onfinish = resolve;
        active.oncancel = () => reject(new Error('Launch interrupted'));
      }
      // Observe the real header, including mobile layout changes and scrolling.
      window.addEventListener('resize', retarget, { signal: controller.signal });
      window.addEventListener('scroll', retarget, { signal: controller.signal, capture: true });
      if (typeof ResizeObserver === 'function') {
        targetObserver = new ResizeObserver(retarget);
        targetObserver.observe(target.closest('.studio-header'));
      }
      retarget();
    });

    await Promise.all([
      flight,

      animate(backdrop, [
        { opacity: 1 },
        { opacity: 0 }
      ], { duration: timing.flight - 100, delay: 100, easing: easeOut })
    ]);

  } catch {
    // If interrupted, ensure studio remains usable
  } finally {
    controller.abort();
    cleanup();
  }
}

// Retain automatic playback on load, and expose for testing/replay
window.playStudioLaunch = playStudioLaunch;
playStudioLaunch();
