async function playStudioLaunch() {
  const target = document.querySelector('.wordmark-icon');
  const header = document.querySelector('.studio-header');
  if (!target || typeof target.animate !== 'function') return;

  const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const easeInOut = 'cubic-bezier(0.65, 0, 0.35, 1)';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = document.createElement('div');
  overlay.className = 'studio-launch';
  overlay.setAttribute('aria-hidden', 'true');
  const backdrop = document.createElement('div');
  backdrop.className = 'studio-launch-backdrop';
  overlay.append(backdrop);
  document.body.append(overlay);

  if (header) {
    header.style.opacity = '0';
  }

  const animations = [];
  const launchPlaybackRate = 1.0;
  function animate(element, keyframes, timing, playbackRate = launchPlaybackRate) {
    const animation = element.animate(keyframes, { fill: 'forwards', ...timing });
    animation.playbackRate = playbackRate;
    animations.push(animation);
    return animation.finished;
  }

  function cleanup() {
    target.style.removeProperty('visibility');
    if (header) {
      header.style.removeProperty('opacity');
      header.style.removeProperty('transition');
    }
    overlay.remove();
    animations.forEach(animation => animation.cancel());
  }

  const controller = new AbortController();
  const options = { once: true, signal: controller.signal };
  window.addEventListener('pointerdown', cleanup, { ...options, capture: true });
  window.addEventListener('keydown', cleanup, { ...options, capture: true });
  motion.addEventListener('change', cleanup, options);

  try {
    if (motion.matches || ['desk', 'globe'].includes(new URLSearchParams(location.search).get('view'))) {
      const title = document.createElement('div');
      title.className = 'studio-launch-caption';
      title.style.top = '50%';
      title.style.transform = 'translateY(-50%)';
      title.style.opacity = '1';
      const name = document.createElement('strong');
      name.textContent = 'EarthTune Studio';
      title.append(name);
      backdrop.append(title);
      await animate(backdrop, [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.6, easing: easeOut },
        { opacity: 0, offset: 1 }
      ], { duration: 500 }, 1);
      return;
    }

    // Ensure icon source is loaded before decoding
    if (!target.complete || target.naturalWidth === 0) {
      await new Promise((resolve, reject) => {
        target.addEventListener('load', resolve, { once: true });
        target.addEventListener('error', reject, { once: true });
        setTimeout(reject, 3000);
      }).catch(() => {});
    }

    const mark = document.createElement('div');
    mark.className = 'studio-launch-mark';
    const icon = new Image();
    icon.src = target.src;
    icon.alt = '';
    const glow = icon.cloneNode();
    glow.className = 'studio-launch-glow';
    mark.append(glow, icon);
    const caption = document.createElement('div');
    caption.className = 'studio-launch-caption';
    const title = document.createElement('strong');
    title.textContent = 'EarthTune Studio';
    const subtitle = document.createElement('span');
    subtitle.textContent = 'NASA Space Apps Challenge';
    caption.append(title, subtitle);
    overlay.append(mark, caption);

    // Let icon decode
    let decodeTimer;
    try {
      await Promise.race([
        icon.decode(),
        new Promise((_, reject) => { decodeTimer = setTimeout(reject, 600); })
      ]);
    } finally {
      clearTimeout(decodeTimer);
    }
    if (!overlay.isConnected) return;
    target.style.visibility = 'hidden';

    // Phase 1: Center Pop & Glow
    await Promise.all([
      animate(mark, [
        { transform: 'scale(0.7)', opacity: 0, offset: 0, easing: easeOut },
        { transform: 'scale(1.08)', opacity: 1, offset: 0.5, easing: easeOut },
        { transform: 'scale(1)', opacity: 1, offset: 0.8 },
        { transform: 'scale(1)', opacity: 1, offset: 1 }
      ], { duration: 600 }),
      animate(glow, [
        { opacity: 0, offset: 0 },
        { opacity: 0.85, offset: 0.5 },
        { opacity: 0.2, offset: 1 }
      ], { duration: 600, easing: easeOut }),
      animate(caption, [
        { transform: 'translateY(12px) scale(0.95)', opacity: 0 },
        { transform: 'translateY(0) scale(1)', opacity: 1 }
      ], { delay: 100, duration: 350, easing: easeOut })
    ]);

    // Short pause to admire the splash logo
    await new Promise(r => setTimeout(r, 350));
    if (!overlay.isConnected) return;

    // Phase 2: Glide to Header Destination
    const from = mark.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const x = to.left + to.width / 2 - from.left - from.width / 2;
    const y = to.top + to.height / 2 - from.top - from.height / 2;
    const scale = to.width / from.width;

    window.addEventListener('resize', cleanup, options);

    if (header) {
      header.style.transition = 'opacity 0.4s ease';
      header.style.opacity = '1';
    }

    await Promise.all([
      animate(mark, [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 1 }
      ], { duration: 520, easing: easeInOut }),
      animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: easeOut }),
      animate(caption, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.92)' }], { duration: 250, easing: easeOut })
    ]);
  } catch {
    // If loading fails or the intro is interrupted, leave the studio usable.
  } finally {
    controller.abort();
    cleanup();
  }
}

playStudioLaunch();
