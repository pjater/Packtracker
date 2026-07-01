(() => {
  const observe = () => {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  };

  const initNav = () => {
    const nav = document.getElementById('landing-nav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 32);
    }, { passive: true });
  };

  const initCounter = () => {
    const stats = document.querySelectorAll('[data-count]');
    if (!stats.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        let start = 0;
        const step = Math.ceil(target / 40);
        const tick = () => {
          start = Math.min(start + step, target);
          el.textContent = start.toLocaleString() + suffix;
          if (start < target) requestAnimationFrame(tick);
        };
        tick();
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    stats.forEach(el => io.observe(el));
  };

  document.addEventListener('DOMContentLoaded', () => {
    observe();
    initNav();
    initCounter();
  });
})();
