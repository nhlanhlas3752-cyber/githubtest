/* =====================================================
   BHEKISIZWE HIGH SCHOOL — MAIN JS
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Navbar scroll effect ---- */
  const navbar = document.querySelector('.navbar');

  /* ---- Video hero parallax ---- */
  const vidVideo = document.querySelector('.vid-hero-video');
  const scrollHandler = () => {
    navbar && navbar.classList.toggle('scrolled', window.scrollY > 40);
    // Parallax: shift video upward slightly as user scrolls
    if (vidVideo && window.scrollY < window.innerHeight) {
      vidVideo.style.transform = `scale(1.04) translateY(${window.scrollY * 0.25}px)`;
    }
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });

  /* ---- Mobile nav toggle ---- */
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      navMobile.classList.toggle('open');
      const spans = navToggle.querySelectorAll('span');
      if (navMobile.classList.contains('open')) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity  = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!navToggle.contains(e.target) && !navMobile.contains(e.target)) {
        navMobile.classList.remove('open');
        navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
  }

  /* ---- Active nav link ---- */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  /* ---- Back to top ---- */
  const btt = document.getElementById('backToTop');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---- Typewriter effect ---- */
  const typeEl = document.getElementById('typewriter');
  if (typeEl) {
    const phrases = [
      'Where Excellence Meets Opportunity.',
      'Shaping Leaders of Tomorrow.',
      'Knowledge. Character. Achievement.',
      'Your Future Starts Here.'
    ];
    let phraseIdx = 0, charIdx = 0, deleting = false;

    const type = () => {
      const current = phrases[phraseIdx];
      if (!deleting) {
        typeEl.textContent = current.slice(0, ++charIdx);
        if (charIdx === current.length) {
          deleting = true;
          return setTimeout(type, 2400);
        }
      } else {
        typeEl.textContent = current.slice(0, --charIdx);
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          return setTimeout(type, 400);
        }
      }
      setTimeout(type, deleting ? 40 : 80);
    };
    setTimeout(type, 800);
  }

  /* ---- Counter animation ---- */
  const counters = document.querySelectorAll('[data-count], .vid-stat-value[data-count]');
  if (counters.length) {
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const animateCounter = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const start = performance.now();
      const update = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const value = target * easeOut(progress);
        el.textContent = (Number.isInteger(target) ? Math.floor(value) : value.toFixed(1)) + suffix;
        if (progress < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ---- Gallery filter (.filter-btn and .gallery-filter-btn) ---- */
  const filterBtns = document.querySelectorAll('.filter-btn, .gallery-filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Only deactivate buttons in the same group (same class)
      const cls = btn.classList.contains('gallery-filter-btn') ? '.gallery-filter-btn' : '.filter-btn';
      document.querySelectorAll(cls).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      galleryItems.forEach(item => {
        const show = filter === '*' || item.dataset.category === filter;
        item.style.opacity   = show ? '1' : '0';
        item.style.transform = show ? 'scale(1)' : 'scale(0.95)';
        item.style.pointerEvents = show ? '' : 'none';
        item.style.position  = show ? '' : 'absolute';
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      });
    });
  });

  /* ---- Subjects tab filter (academics) — supports .tab-btn and .subjects-tab ---- */
  const tabBtns = document.querySelectorAll('.tab-btn, .subjects-tab');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const grade = btn.dataset.grade;
      document.querySelectorAll('.subject-card').forEach(card => {
        // data-grade may be a space-separated list e.g. "all 8 9 10 11 12"
        const cardGrades = (card.dataset.grade || '').split(/\s+/);
        const show = grade === 'all' || cardGrades.includes(grade);
        card.style.display = show ? '' : 'none';
      });
    });
  });

  /* ---- Results year filter ---- */
  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ---- Charts (results page) ---- */
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#A0A0A0';
    Chart.defaults.borderColor = '#242424';

    // Pass rate bar chart
    const passCtx = document.getElementById('passRateChart');
    if (passCtx) {
      new Chart(passCtx, {
        type: 'bar',
        data: {
          labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
          datasets: [{
            label: 'Pass Rate %',
            data: [89, 91, 88, 93, 96, 97, 98],
            backgroundColor: 'rgba(212,175,55,0.2)',
            borderColor: '#D4AF37',
            borderWidth: 2,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 80, max: 100, grid: { color: '#1E1E1E' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Subject performance radar chart
    const subjectCtx = document.getElementById('subjectChart');
    if (subjectCtx) {
      new Chart(subjectCtx, {
        type: 'radar',
        data: {
          labels: ['Mathematics', 'English', 'Physical Science', 'History', 'Life Sciences', 'Accounting'],
          datasets: [{
            label: 'Average %',
            data: [72, 84, 68, 79, 81, 76],
            backgroundColor: 'rgba(212,175,55,0.15)',
            borderColor: '#D4AF37',
            borderWidth: 2,
            pointBackgroundColor: '#D4AF37',
          }]
        },
        options: {
          responsive: true,
          scales: {
            r: {
              min: 50, max: 100,
              grid: { color: '#1E1E1E' },
              pointLabels: { color: '#A0A0A0', font: { size: 11 } },
              ticks: { display: false }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    // Trend line chart
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
      new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
          datasets: [
            {
              label: 'School %',
              data: [89, 91, 88, 93, 96, 97, 98],
              borderColor: '#D4AF37',
              backgroundColor: 'rgba(212,175,55,0.05)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#D4AF37',
            },
            {
              label: 'National Avg',
              data: [76, 74, 77, 80, 80, 82, 83],
              borderColor: '#555',
              borderWidth: 2,
              borderDash: [6,4],
              tension: 0.4,
              pointBackgroundColor: '#555',
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { min: 60, max: 100, grid: { color: '#1E1E1E' } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }

  /* ---- AOS init ---- */
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 80 });
  }

  /* ---- Smooth marquee pause on hover ---- */
  const stripItems = document.querySelector('.strip-items');
  if (stripItems) {
    stripItems.addEventListener('mouseenter', () => stripItems.style.animationPlayState = 'paused');
    stripItems.addEventListener('mouseleave', () => stripItems.style.animationPlayState = 'running');
  }

});
