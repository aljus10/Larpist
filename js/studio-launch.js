async function playStudioLaunch() {
  const target = document.querySelector('.wordmark-icon');
  const overlay = document.querySelector('#studio-launch');
  if (!target || !overlay || typeof target.animate !== 'function') {
    overlay?.remove();
    return;
  }

  const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const easeInOut = 'cubic-bezier(0.77, 0, 0.175, 1)';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const backdrop = overlay.querySelector('.studio-launch-backdrop');
  const mark = overlay.querySelector('.studio-launch-mark');
  const icon = mark?.querySelector('img:not(.studio-launch-glow)');
  const glow = mark?.querySelector('.studio-launch-glow');
  const caption = overlay.querySelector('.studio-launch-caption');
  if (!backdrop || !mark || !icon || !glow || !caption) {
    overlay.remove();
    return;
  }

  const animations = [];
  const launchPlaybackRate = 0.5;
  function animate(element, keyframes, timing, playbackRate = launchPlaybackRate) {
    const animation = element.animate(keyframes, { fill: 'forwards', ...timing });
    animation.playbackRate = playbackRate;
    animations.push(animation);
    return animation.finished;
  }

  function cleanup() {
    target.style.removeProperty('visibility');
    overlay.remove();
    animations.forEach(animation => animation.cancel());
  }

  const controller = new AbortController();
  const options = { once: true, signal: controller.signal };
  window.addEventListener('pointerdown', cleanup, { ...options, capture: true });
  window.addEventListener('keydown', cleanup, { ...options, capture: true });
  window.addEventListener('resize', cleanup, options);
  motion.addEventListener('change', cleanup, options);

  try {
    if (motion.matches || ['desk', 'globe'].includes(new URLSearchParams(location.search).get('view'))) {
      // Preview surfaces commonly request reduced motion. Keep the branded
      // opening visible there, but use a calm hold-and-fade with no travel.
      mark.style.opacity = '1';
      caption.style.opacity = '1';
      await new Promise(resolve => setTimeout(resolve, 900));
      await animate(overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: easeOut }, 1);
      return;
    }

    // Give the preloaded icon a short window to decode before starting the intro.
    await Promise.race([
      icon.decode().catch(() => undefined),
      new Promise(resolve => setTimeout(resolve, 150))
    ]);
    if (!overlay.isConnected) return;
    target.style.visibility = 'hidden';
    await Promise.all([
      animate(mark, [
        { transform: 'scale(0.65)', opacity: 0, offset: 0, easing: easeOut },
        { transform: 'scale(1.10)', opacity: 1, offset: 0.44, easing: easeOut },
        { transform: 'scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1)', opacity: 1, offset: 1 }
      ], { duration: 700 }),
      animate(glow, [
        { opacity: 0, offset: 0 },
        { opacity: 0.8, offset: 0.44 },
        { opacity: 0, offset: 1 }
      ], { duration: 700, easing: easeOut }),
      animate(caption, [
        { transform: 'translateY(8px) scale(0.95)', opacity: 0 },
        { transform: 'translateY(0) scale(1)', opacity: 1 }
      ], { delay: 80, duration: 300, easing: easeOut })
    ]);

    const from = mark.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const x = to.left + to.width / 2 - from.left - from.width / 2;
    const y = to.top + to.height / 2 - from.top - from.height / 2;
    const scale = to.width / from.width;
    await Promise.all([
      animate(mark, [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 1 }
      ], { duration: 500, easing: easeInOut }),
      animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: easeOut }),
      animate(caption, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: easeOut })
    ]);
  } catch {
    // If loading fails or the intro is interrupted, leave the studio usable.
  } finally {
    controller.abort();
    cleanup();
  }
}

playStudioLaunch();

