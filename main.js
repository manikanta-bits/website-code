(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  // Preloader
  window.addEventListener('load', () => {
    setTimeout(() => $('#preloader').classList.add('hide'), 400);
  });

  // Year
  $('#year').textContent = new Date().getFullYear();

  // Navbar scroll state, progress bar, back-to-top, active link
  const navbar = $('#navbar');
  const progress = $('#scrollProgress');
  const backToTop = $('#backToTop');
  const navLinks = $$('.nav-link');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    navbar.classList.toggle('scrolled', y > 40);
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    backToTop.classList.toggle('show', y > 600);

    let current = '';
    sections.forEach(sec => {
      if (sec.offsetTop - 140 <= y) current = '#' + sec.id;
    });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === current));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Mobile menu
  const menuToggle = $('#menuToggle');
  const navMenu = $('#navLinks');
  function closeMenu() {
    navMenu.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  menuToggle.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    menuToggle.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  navLinks.forEach(a => a.addEventListener('click', closeMenu));

  // Scroll reveal
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => revealObserver.observe(el));

  // Animated counters
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.target;
      const duration = 1600;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target) + (p === 1 ? '+' : '');
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('.counter').forEach(el => counterObserver.observe(el));

  // 3D tilt on cards
  $$('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  // Spotlight follows cursor on service cards
  $$('.service-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Project filter
  const filterBtns = $$('.filter-btn');
  const projectCards = $$('.project-card');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.toggle('active', b === btn));
      const f = btn.dataset.filter;
      projectCards.forEach(card => {
        const show = f === 'all' || card.dataset.category === f;
        card.classList.toggle('hide', !show);
      });
    });
  });

  // Contact form: validation + backend submission
  const form = $('#contactForm');
  const status = $('#formStatus');
  const submitBtn = $('#submitBtn');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(name, msg) {
    const field = form.elements[name].closest('.field');
    const err = form.querySelector(`[data-for="${name}"]`);
    if (field) field.classList.toggle('invalid', !!msg);
    if (err) err.textContent = msg || '';
  }

  function validate() {
    const d = Object.fromEntries(new FormData(form).entries());
    let ok = true;
    const rules = {
      name: [d.name.trim().length >= 2, 'Please enter your name.'],
      email: [EMAIL_RE.test(d.email.trim()), 'Please enter a valid email.'],
      service: [!!d.service, 'Please choose a service.'],
      message: [d.message.trim().length >= 10, 'Please describe your project (min 10 characters).']
    };
    Object.entries(rules).forEach(([name, [valid, msg]]) => {
      setError(name, valid ? '' : msg);
      if (!valid) ok = false;
    });
    return ok;
  }

  ['name', 'email', 'service', 'message'].forEach(n => {
    form.elements[n].addEventListener('blur', validate);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';
    if (!validate()) return;

    const payload = Object.fromEntries(new FormData(form).entries());
    submitBtn.classList.add('submitting');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      status.textContent = 'Thank you! We will get back to you within one business day.';
      status.classList.add('ok');
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Network error. Please try again later.';
      status.classList.add('err');
    } finally {
      submitBtn.classList.remove('submitting');
      submitBtn.disabled = false;
    }
  });
})();
