/* ══ HEADER — SHRINK ON SCROLL ══
   rAF-throttle : le scroll fire 60-100 fois/sec, mais une seule classList
   toggle par frame du navigateur suffit. Évite des micro-interruptions
   pendant le scroll → meilleure fluidité ressentie. */
const header = document.querySelector('.header');
let _headerShrinkTicking = false;
window.addEventListener('scroll', () => {
  if (_headerShrinkTicking) return;
  _headerShrinkTicking = true;
  requestAnimationFrame(() => {
    header.classList.toggle('scrolled', window.scrollY > 50);
    _headerShrinkTicking = false;
  });
}, { passive: true });

/* ══ RESPONSIVE BANNER SWAP — PlayStation en position 2 uniquement sur iPhone SE ══
   Desktop : ordre HTML original (Card 02 = Les TikToks annonçant, Card 11 = PlayStation).
   Mobile (≤ 480px) : PS déplacée juste après la 1re bannière, Les TikToks déplacée
   à sa place originale (position 11). DOM réordonné dynamiquement au load + resize.   */
(function () {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;
  const psCard      = grid.querySelector('[data-href="projet-playstation.html"]');
  const tiktoksCard = grid.querySelector('[data-href="projet-netflix-2.html"]');
  if (!psCard || !tiktoksCard) return;

  // Snapshot de l'ordre original (référence desktop)
  const originalOrder = Array.from(grid.children);
  const mq = window.matchMedia('(max-width: 480px)');
  let currentMode = null;  // 'mobile' | 'desktop'

  function applyMobileOrder() {
    // 1) Restaurer d'abord l'ordre original (idempotent)
    originalOrder.forEach((card) => grid.appendChild(card));
    // 2) Déplacer PS juste après la 1re card
    const firstCard = grid.firstElementChild;
    if (firstCard && firstCard !== psCard) {
      grid.insertBefore(psCard, firstCard.nextElementSibling);
    }
  }
  function applyDesktopOrder() {
    originalOrder.forEach((card) => grid.appendChild(card));
  }

  function update() {
    const target = mq.matches ? 'mobile' : 'desktop';
    if (target === currentMode) return;
    currentMode = target;
    if (target === 'mobile') applyMobileOrder();
    else                     applyDesktopOrder();
    // Re-paginer (galleryCards garde les mêmes éléments, mais le DOM est réordonné →
    // applyGalleryState itère le NodeList original ; il faut re-sync)
    if (typeof window._refreshGallery === 'function') window._refreshGallery();
  }
  update();
  mq.addEventListener('change', update);
})();

/* ══ FILTRES GALERIE + EXPAND / COLLAPSE (limite dynamique selon vue) ══
   Limite par vue : 2-col → 8 (4 lignes pleines), 3-col → 9 (3 lignes pleines),
   4-col → 8 (2 lignes pleines). Recalculée à chaque applyGalleryState(). */
const filterBtns   = document.querySelectorAll('.filter-btn');
// galleryCards : query LIVE pour refléter l'ordre DOM courant (après reorder responsive)
let galleryCards = Array.from(document.querySelectorAll('.gallery-card'));
const galleryWrap  = document.querySelector('.gallery-wrap');
const expandBtn    = document.querySelector('.gallery-expand-btn');
const expandLabel  = expandBtn ? expandBtn.querySelector('.gallery-expand-btn__label') : null;

function getGalleryVisibleLimit() {
  const grid = document.querySelector('.gallery-grid');
  if (grid && grid.classList.contains('grid-view-3')) return 9;
  return 8;
}
/* État initial : la galerie démarre dépliée si l'inline head script a posé
   .gallery-start-expanded sur <html> (retour depuis page projet où l'utilisateur
   avait dépliée la galerie avant de cliquer la card). Évite le clic différé sur
   le bouton "Voir mes X projets" qui ralentissait la restauration de scroll. */
let galleryCollapsed = !document.documentElement.classList.contains('gallery-start-expanded');
let galleryFilter = 'all';

function applyGalleryState({ animateReveal = false } = {}) {
  const limit = getGalleryVisibleLimit();
  let matchingCount = 0;
  let hiddenByCollapse = 0;

  galleryCards.forEach((card) => {
    const categories = card.dataset.category ? card.dataset.category.split(' ') : [];
    const filterMatch = galleryFilter === 'all' || categories.includes(galleryFilter);

    card.classList.remove('is-revealing');
    card.style.removeProperty('animation-delay');

    if (!filterMatch) {
      card.classList.add('is-hidden');
      card.classList.remove('is-collapsed-hidden');
      return;
    }
    card.classList.remove('is-hidden');

    if (galleryCollapsed && matchingCount >= limit) {
      card.classList.add('is-collapsed-hidden');
      hiddenByCollapse++;
    } else {
      const wasCollapsed = card.classList.contains('is-collapsed-hidden');
      card.classList.remove('is-collapsed-hidden');
      if (animateReveal && wasCollapsed) {
        const delay = (matchingCount - limit) * 60;
        card.style.animationDelay = `${Math.max(0, delay)}ms`;
        card.classList.add('is-revealing');
      }
    }
    matchingCount++;
  });

  const overflow = Math.max(0, matchingCount - limit);

  if (expandBtn && expandLabel) {
    const showBtn = overflow > 0;
    expandBtn.hidden = !showBtn;
    if (showBtn) {
      expandBtn.dataset.expanded = galleryCollapsed ? 'false' : 'true';
      expandBtn.setAttribute('aria-expanded', galleryCollapsed ? 'false' : 'true');
      if (galleryCollapsed) {
        const word = hiddenByCollapse === 1 ? 'autre projet' : 'autres projets';
        expandLabel.innerHTML = `Voir mes <span class="gallery-expand-btn__num">${hiddenByCollapse}</span> ${word}`;
      } else {
        expandLabel.textContent = 'Réduire';
      }
    }
  }

  if (galleryWrap) {
    galleryWrap.classList.toggle('is-collapsed', galleryCollapsed && overflow > 0);
  }
}

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    galleryFilter = btn.dataset.filter;
    galleryCollapsed = true;
    applyGalleryState();
  });
});

if (expandBtn) {
  expandBtn.addEventListener('click', () => {
    const wasCollapsed = galleryCollapsed;
    galleryCollapsed = !galleryCollapsed;
    applyGalleryState({ animateReveal: wasCollapsed });

    if (!wasCollapsed) {
      const projets = document.getElementById('projets');
      if (projets) projets.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

applyGalleryState();

// Expose un hook pour le re-render après reorder DOM (responsive banner swap).
window._refreshGallery = function () {
  galleryCards = Array.from(document.querySelectorAll('.gallery-card'));
  applyGalleryState();
};


/* ══ HERO STATS — alignement sur la ligne de référence ══ */
const statsSubBloc = document.querySelector('.stats-sub-bloc');
const statsReferenceRow = statsSubBloc ? statsSubBloc.querySelector('.stats-row:not(.stats-row--logos)') : null;

function syncHeroStatsAlignment() {
  if (!statsSubBloc || !statsReferenceRow) return;

  if (window.innerWidth <= 900) {
    document.documentElement.style.removeProperty('--stats-sub-bloc-width');
    return;
  }

  const referenceWidth = Math.ceil(statsReferenceRow.getBoundingClientRect().width);
  document.documentElement.style.setProperty('--stats-sub-bloc-width', `${referenceWidth}px`);
}

syncHeroStatsAlignment();
window.addEventListener('resize', syncHeroStatsAlignment);

if (document.fonts && typeof document.fonts.ready?.then === 'function') {
  document.fonts.ready.then(syncHeroStatsAlignment);
}

/* ══ 3D CIRCULAR CAROUSEL ══ */
const cardWraps     = Array.from(document.querySelectorAll('.phone-card-wrap'));
const heroCards     = document.querySelector('.hero-cards');
const dotsContainer = document.querySelector('.cards-nav__dots');
const prevBtn       = document.querySelector('.cards-nav__arrow--prev');
const nextBtn       = document.querySelector('.cards-nav__arrow--next');

const CARD_COUNT   = cardWraps.length;            // 3
const ANGLE_STEP   = 360 / CARD_COUNT;            // 120°
const RADIUS       = 240;                          // px — depth of the ring

let activeIndex    = 1;  // Netflix (front-facing) by default
let currentAngle   = 0;  // cumulative rotation applied to the stage

/* Assign a fixed angular slot to each card via CSS custom property */
cardWraps.forEach((wrap, i) => {
  const slotAngle = i * ANGLE_STEP;  // 0°, 120°, 240°
  wrap.style.setProperty('--card-angle', `${slotAngle}deg`);
});

/* Generate dots */
if (dotsContainer) {
  dotsContainer.innerHTML = '';
  cardWraps.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'cards-nav__dot' + (i === activeIndex ? ' is-active' : '');
    dotsContainer.appendChild(dot);
  });
}

/* Rotate the stage so that card[activeIndex] faces front (rotateY = 0) */
function applyRotation() {
  /* The front-face is at slot 0° of the stage. Card i is at slot i*ANGLE_STEP.
     To bring card i to the front we rotate the STAGE by -(i * ANGLE_STEP). */
  const targetAngle = -(activeIndex * ANGLE_STEP);
  /* Accumulate full turns to avoid snapping when looping */
  const delta = ((targetAngle - currentAngle % 360) + 540) % 360 - 180;
  currentAngle += delta;
  if (heroCards) heroCards.style.transform = `rotateY(${currentAngle}deg)`;
}

function setActive(index, autoPlay = true) {
  activeIndex = (index + CARD_COUNT) % CARD_COUNT;

  cardWraps.forEach((wrap, i) => {
    wrap.classList.toggle('is-active',   i === activeIndex);
    wrap.classList.toggle('is-inactive', i !== activeIndex);

    const video = wrap.querySelector('.phone-card__video');
    if (video) {
      if (i === activeIndex && autoPlay) video.play();
      else if (i !== activeIndex) video.pause();
    }
  });

  if (dotsContainer) dotsContainer.querySelectorAll('.cards-nav__dot').forEach((dot, i) => {
    dot.classList.toggle('is-active', i === activeIndex);
  });

  applyRotation();
}

/* Initial placement */
applyRotation();
setActive(activeIndex, false);

/* Auto-rotate: advance every 3.5s, pause on hover */
let autoRotateTimer = null;
const scene = document.querySelector('.hero-cards-scene');

function startAutoRotate() {
  stopAutoRotate();
  autoRotateTimer = setInterval(() => {
    setActive(activeIndex + 1, false);
  }, 3500);
}

function stopAutoRotate() {
  if (autoRotateTimer) { clearInterval(autoRotateTimer); autoRotateTimer = null; }
}

startAutoRotate();
if (scene) {
  scene.addEventListener('mouseenter', stopAutoRotate);
  scene.addEventListener('mouseleave', startAutoRotate);
  scene.addEventListener('touchstart',  stopAutoRotate, { passive: true });
}

if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoRotate(); setActive(activeIndex - 1); startAutoRotate(); });
if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoRotate(); setActive(activeIndex + 1); startAutoRotate(); });

/* ══ VIDEO CARDS — exclusivité de lecture ══ */
const allVideoEls = document.querySelectorAll('.phone-card__video');

/* Quand une vidéo démarre, stopper toutes les autres */
allVideoEls.forEach((video) => {
  video.addEventListener('play', () => {
    allVideoEls.forEach((other) => {
      if (other !== video && !other.paused) other.pause();
    });
  });
});

/* ══ VIDEO CARDS — clic carte + bouton play/pause ══ */
cardWraps.forEach((wrap, i) => {
  const video = wrap.querySelector('.phone-card__video');
  const card  = wrap.querySelector('.phone-card');
  const btn   = wrap.querySelector('.video-toggle');
  if (!video || !card || !btn) return;

  /* Icône initiale : les vidéos sans autoplay démarrent en pause */
  if (!video.autoplay) btn.classList.add('is-paused');

  /* Clic sur la carte (hors boutons) → play/pause toggle */
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.video-toggle') && !e.target.closest('.sound-toggle')) {
      if (activeIndex === i) {
        if (video.paused) video.play();
        else video.pause();
      } else {
        setActive(i, true);
      }
    }
  });

  /* Bouton play/pause */
  btn.addEventListener('click', () => {
    if (activeIndex !== i) {
      setActive(i, true);
    } else {
      if (video.paused) video.play();
      else video.pause();
    }
  });

  video.addEventListener('play',  () => btn.classList.remove('is-paused'));
  video.addEventListener('pause', () => btn.classList.add('is-paused'));
});


/* ══ VIDEO CARDS — son on / off ══ */
document.querySelectorAll('.sound-toggle').forEach((btn) => {
  const card  = btn.closest('.phone-card');
  const video = card.querySelector('.phone-card__video');
  const label = btn.querySelector('.sound-label');

  btn.addEventListener('click', () => {
    if (video.muted) {
      /* Couper toutes les autres cartes */
      allVideoEls.forEach((v) => {
        v.muted = true;
        const ob = v.closest('.phone-card').querySelector('.sound-toggle');
        const ol = ob && ob.querySelector('.sound-label');
        if (ob) ob.classList.remove('is-unmuted');
        if (ol) ol.textContent = 'Son off';
      });
      /* Activer cette carte */
      video.muted = false;
      btn.classList.add('is-unmuted');
      if (label) label.textContent = 'Son on';
    } else {
      video.muted = true;
      btn.classList.remove('is-unmuted');
      if (label) label.textContent = 'Son off';
    }
  });
});

/* ══ NAVIGATION GALERIE — clic / tap sur carte ══
   Desktop : 1 clic = navigation directe (l'overlay est révélé au survol).
   Tactile : 1er tap = révèle l'overlay, 2e tap = navigation. */
document.querySelector('.gallery-grid')?.addEventListener('click', (e) => {
  const card = e.target.closest('[data-href]');
  if (!card) return;

  const isTouch = window.matchMedia('(hover: none)').matches;
  if (isTouch && !card.classList.contains('is-tap-active')) {
    e.preventDefault();
    document.querySelectorAll('.gallery-card.is-tap-active').forEach((c) => {
      if (c !== card) c.classList.remove('is-tap-active');
    });
    card.classList.add('is-tap-active');
    return;
  }

  // Sauve la position de scroll + état de la gallery juste avant de naviguer
  // vers la page projet → permet au retour de restaurer EXACTEMENT cette
  // position (via back-button.js sur index.html?#card-X). Plus de scroll
  // visible : on revient pile au pixel près sur la card cliquée.
  try {
    sessionStorage.setItem('homeScrollY', String(window.scrollY));
    sessionStorage.setItem('homeGalleryExpanded', galleryCollapsed ? '0' : '1');
  } catch (e) {}
  /* Réécrit l'URL de l'entrée d'historique "home" en index.html#card-X AVANT
     de naviguer vers le projet. Conséquence : la flèche RETOUR du navigateur
     (Chrome/Safari) — qui revient sur CETTE entrée d'historique — recharge
     index.html#card-X et déclenche EXACTEMENT le même chemin de restauration
     que la flèche retour on-page (script inline index.html, branche
     origHash '#card-' : scrollIntoView centré sous overlay paint-level, déjà
     fiable). Les deux flèches deviennent identiques → retour garanti sur la
     bannière du projet, qu'iOS recharge la page ou la sorte du bfcache.
     replaceState ne déclenche ni navigation ni scroll : aucun saut visible. */
  if (card.id) {
    try {
      history.replaceState(null, '', location.pathname + location.search + '#' + card.id);
    } catch (e) {}
  }
  window.location.href = card.dataset.href;
});

/* ══ CONTRÔLE DE VUE — densité grille ══ */
const galleryGrid     = document.querySelector('.gallery-grid');
const galleryViewBtns = document.querySelectorAll('.gallery-view-btn');

if (galleryGrid && galleryViewBtns.length) {
  function setGridView(cols) {
    galleryGrid.classList.remove('grid-view-2', 'grid-view-3', 'grid-view-4');
    galleryGrid.classList.add('grid-view-' + cols);
    galleryViewBtns.forEach((b) => {
      const active = b.dataset.cols === String(cols);
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    if (typeof applyGalleryState === 'function') applyGalleryState();
  }

  /* Défaut 2 colonnes sur tous les MacBook Pro (13/14" → 1440px, 16" → 1728px).
     Au-dessus de 1728px (écran externe) et en dessous de 1101px, défaut 3 cols.
     L'utilisateur peut toujours changer via les boutons de la galerie. */
  const isMacBookPro = window.matchMedia('(min-width: 1101px) and (max-width: 1728px)').matches;
  setGridView(isMacBookPro ? 2 : 3);

  galleryViewBtns.forEach((btn) => {
    btn.addEventListener('click', () => setGridView(btn.dataset.cols));
  });
}
