/* ──────────────────────────────────────────────────────────────
   Carousel "Autres contenus / Autres projets"
   Desktop : flèches prev/next + dots (transform JS).
   Mobile (≤480px) : swipe natif scroll-snap + counter "X / N" +
                     mini-label par bannière (depuis img.alt).
   Mélange aléatoire des cards : opt-in via data-shuffle="true" sur #autresTrack
   Utilisé par toutes les pages projet contenant #autresTrack
   ────────────────────────────────────────────────────────────── */
(function () {
  const track    = document.getElementById('autresTrack');
  const dotsWrap = document.getElementById('autresDots');
  const prevBtn  = document.querySelector('.autres-arrow--prev');
  const nextBtn  = document.querySelector('.autres-arrow--next');
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.autres-card'));

  /* Mélange aléatoire (Fisher-Yates) — opt-in via data-shuffle="true" */
  if (track.dataset.shuffle === 'true') {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      track.appendChild(cards[j]);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }

  const total = cards.length;
  const isMobile = () => window.matchMedia('(max-width: 480px)').matches;

  /* ──────────────────────────────────────────────────────────────
     MOBILE MODE — scroll-snap natif + counter + tap-to-reveal overlay
     ────────────────────────────────────────────────────────────── */
  function initMobile() {
    /* Tap-to-reveal — réplique le pattern de la home page (.gallery-grid) :
       1er tap = révèle l'overlay (titre + année) en ajoutant is-tap-active.
       2e tap = navigation vers la page du projet.

       Les cards d'origine ont un onclick="window.location.href='...'" inline.
       On extrait l'URL en data-href, on retire l'inline, et on délègue
       l'événement sur le track pour gérer le 2-step tap. */
    cards.forEach(card => {
      const inlineHandler = card.getAttribute('onclick');
      if (inlineHandler) {
        const match = inlineHandler.match(/['"]([^'"]+)['"]/);
        if (match) card.setAttribute('data-href', match[1]);
        card.removeAttribute('onclick');
        card.style.cursor = 'pointer';
      }
      /* Cleanup d'éventuels mini-labels résiduels d'une ancienne version. */
      const oldLabel = card.querySelector('.autres-card__label-mobile');
      if (oldLabel) oldLabel.remove();
    });

    if (track && !track.dataset.tapBound) {
      track.dataset.tapBound = '1';
      track.addEventListener('click', (e) => {
        const card = e.target.closest('.autres-card');
        if (!card || !card.dataset.href) return;
        if (!card.classList.contains('is-tap-active')) {
          /* 1er tap : reveal overlay. Désactive l'active des autres cards. */
          e.preventDefault();
          cards.forEach(c => {
            if (c !== card) c.classList.remove('is-tap-active');
          });
          card.classList.add('is-tap-active');
          return;
        }
        /* 2e tap : navigation. */
        window.location.href = card.dataset.href;
      });
    }

    /* Counter "1 / N" injecté après .autres-carousel-wrapper.
       Remplace les dots côté UI mobile. */
    const wrapper = document.querySelector('.autres-carousel-wrapper');
    if (!wrapper) return;
    let counter = wrapper.parentElement.querySelector('.autres-counter');
    if (!counter) {
      counter = document.createElement('div');
      counter.className = 'autres-counter';
      counter.innerHTML =
        '<span class="autres-counter__current">1</span>' +
        '<span class="autres-counter__separator">/</span>' +
        '<span class="autres-counter__total">' + total + '</span>';
      wrapper.parentElement.insertBefore(counter, wrapper.nextSibling);
    }
    const currentSpan = counter.querySelector('.autres-counter__current');

    /* Update counter en suivant le scroll horizontal du track-clip.
       Déclenche aussi l'animation "is-flipping" à chaque changement
       réel (fade-up de 350ms) pour rendre le compteur vivant lors
       du swipe — détail soigné. */
    const trackClip = document.querySelector('.autres-track-clip');
    if (!trackClip) return;
    let rafId = null;
    let lastIdx = -1;
    const updateCounter = () => {
      const cardW = cards[0].getBoundingClientRect().width + 12 /* gap */;
      const idx = Math.round(trackClip.scrollLeft / cardW);
      const clamped = Math.max(0, Math.min(idx, total - 1));
      if (clamped !== lastIdx) {
        lastIdx = clamped;
        currentSpan.textContent = String(clamped + 1);
        /* Re-trigger CSS animation : retire la classe → force un reflow → re-ajoute */
        currentSpan.classList.remove('is-flipping');
        void currentSpan.offsetWidth;
        currentSpan.classList.add('is-flipping');
      }
    };
    trackClip.addEventListener('scroll', () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateCounter);
    }, { passive: true });
    updateCounter();
  }

  /* ──────────────────────────────────────────────────────────────
     DESKTOP MODE — comportement original (flèches + dots, transform JS)
     ────────────────────────────────────────────────────────────── */
  function initDesktop() {
    const VISIBLE  = 2;
    const GAP      = 20;
    const maxIndex = total - VISIBLE;
    let current    = 0;

    const dots = [];
    for (let i = 0; i <= maxIndex; i++) {
      const d = document.createElement('button');
      d.className = 'autres-dot' + (i === 0 ? ' is-active' : '');
      d.setAttribute('aria-label', 'Slide ' + (i + 1));
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
      dots.push(d);
    }

    function getStep() {
      /* offsetWidth retourne la largeur LAYOUT (avant transforms ancêtres).
         getBoundingClientRect.width retourne la largeur VISUELLE (après).
         Sur monitor ≥1800px : .projet-main scale(1.35) × .autres-contenus-
         section scale(0.86) = 1.161× ancêtres. Avec getBoundingClientRect,
         le JS multipliait le pas par 1.161, puis le translateX local était
         ENCORE scalé par 1.161 au rendu → surplus composé qui faisait
         dépasser la dernière carte (espace vide à droite à maxIndex).
         offsetWidth est immune à ce double scaling. */
      return cards[0].offsetWidth + GAP;
    }

    function goTo(idx) {
      current = Math.max(0, Math.min(idx, maxIndex));
      track.style.transform = 'translateX(-' + (current * getStep()) + 'px)';
      dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === maxIndex;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
    window.addEventListener('resize', () => goTo(current));
    goTo(0);
  }

  /* Init selon mode au chargement. Pas de switching dynamique au resize
     (rare cas d'usage ; refresh nécessaire si on traverse le breakpoint). */
  if (isMobile()) {
    initMobile();
  } else {
    initDesktop();
  }
})();
