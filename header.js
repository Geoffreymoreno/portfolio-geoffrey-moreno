// Header — highlight nav-link + animation scroll subtile sur pages V1 (index, parcours, contact)
(function () {
  // 1. Highlight du nav-link selon la page courante
  const path = location.pathname.split('/').pop() || 'index.html';
  const isIndex = path === 'index.html' || path === '';
  const isProjectDetail = path.startsWith('projet-');
  const map = {
    projets: false, // index : géré par scroll-spy ci-dessous ; pages projet-* : on n'allume plus le lien
    parcours: path === 'mon-parcours.html',
    contact: path === 'me-contacter.html',
  };
  const navLinks = {};
  document.querySelectorAll('.nav-link[data-nav]').forEach(link => {
    const key = link.dataset.nav;
    navLinks[key] = link;
    link.classList.toggle('is-active', !!map[key]);
  });

  // 2. Animation scroll : SEULEMENT sur les pages V1 (pas de classe header-dark/light)
  const usesV2 = document.body.classList.contains('header-dark') ||
                 document.body.classList.contains('header-light');

  const pill = document.querySelector('.header-pill');
  const headerEl = document.querySelector('.header');

  // 3. Scroll-spy multi-sections sur index.html (desktop > 768px uniquement)
  //    Chaque lien du header s'allume quand sa section correspondante traverse
  //    la ligne de référence sous le header. Sections mutuellement exclusives.
  const filtersSection = isIndex ? document.querySelector('.filters-section') : null;
  const parcoursBlock  = isIndex ? document.querySelector('.parcours-block')  : null;
  const contactSection = isIndex ? document.querySelector('#me-contacter')    : null;
  const projetsLink  = navLinks.projets;
  const parcoursLink = navLinks.parcours;
  const contactLink  = navLinks.contact;

  const RANGE = 320;
  const ease = x => 1 - Math.pow(1 - x, 2.2);
  let ticking = false;

  /* PERF — Cache des positions absolues des sections (document-relative).
     Auparavant : update() faisait 4-5 getBoundingClientRect() à chaque
     scroll tick → 1 forced reflow par frame, à ~60 Hz.
     Maintenant : positions stockées en absolu (top + scrollY), comparaison
     en pure arithmétique pendant le scroll. Rafraîchi sur resize/load et
     à chaque changement de mise en page via ResizeObserver(body). */
  const navCache = {
    headerH: 80,
    vh: window.innerHeight,
    docHeight: 0,
    filtersTop: 0,
    parcoursTop: 0,
    parcoursBottom: 0,
    contactTop: 0,
    contactBottom: 0,
  };
  function refreshNavCache() {
    if (headerEl) navCache.headerH = headerEl.offsetHeight;
    navCache.vh = window.innerHeight;
    navCache.docHeight = document.documentElement.scrollHeight;
    const sy = window.scrollY;
    if (filtersSection) {
      navCache.filtersTop = filtersSection.getBoundingClientRect().top + sy;
    }
    if (parcoursBlock) {
      const r = parcoursBlock.getBoundingClientRect();
      navCache.parcoursTop = r.top + sy;
      navCache.parcoursBottom = r.bottom + sy;
    }
    if (contactSection) {
      const r = contactSection.getBoundingClientRect();
      navCache.contactTop = r.top + sy;
      navCache.contactBottom = r.bottom + sy;
    }
  }

  const update = () => {
    if (pill && !usesV2) {
      const raw = Math.min(1, Math.max(0, window.scrollY / RANGE));
      pill.style.setProperty('--t', ease(raw).toFixed(3));
    }

    if (isIndex && window.innerWidth > 768) {
      const scrollY = window.scrollY;
      const lineY = scrollY + navCache.headerH + 40;

      let projetsActive = false;
      let parcoursActive = false;
      let contactActive = false;

      if (filtersSection && parcoursBlock) {
        projetsActive = navCache.filtersTop <= lineY && navCache.parcoursTop > lineY;
      }
      if (parcoursBlock) {
        parcoursActive = navCache.parcoursTop <= lineY && navCache.parcoursBottom > lineY;
      }
      if (contactSection) {
        const EARLY = 240;
        const atBottom = (navCache.vh + Math.ceil(scrollY)) >= (navCache.docHeight - 2);
        contactActive = (navCache.contactTop <= lineY + EARLY && navCache.contactBottom > lineY) ||
                        (atBottom && navCache.contactTop < scrollY + navCache.vh && navCache.contactBottom > scrollY);
        // Mutuellement exclusif avec parcours : contact prioritaire dès qu'il s'allume
        if (contactActive) parcoursActive = false;
      }

      if (projetsLink)  projetsLink.classList.toggle('is-active', projetsActive);
      if (parcoursLink) parcoursLink.classList.toggle('is-active', parcoursActive);
      if (contactLink && contactSection) contactLink.classList.toggle('is-active', contactActive);
    }
    ticking = false;
  };

  if (!pill && !projetsLink && !parcoursLink && !contactLink) return;
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', () => { refreshNavCache(); update(); });
  window.addEventListener('load', () => { refreshNavCache(); update(); });
  window.addEventListener('hashchange', () => { refreshNavCache(); update(); });
  /* Refresh du cache quand la mise en page bouge (chargement d'images, fonts,
     ouverture/fermeture de drawer, etc.). ResizeObserver ne fire PAS sur le
     scroll, uniquement sur de vrais changements de taille → safe. */
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(refreshNavCache);
    ro.observe(document.body);
  }
  refreshNavCache();
  update();

  // ══ HEADER MOBILE SPLIT — capsule GM (gauche) + burger rond (droite) ══
  // Injection unifiée sur toutes les pages ≤768px (la home porte déjà son
  // markup hardcodé ; on ne réinjecte pas si présent).
  if (!document.querySelector('.header-mobile-split')) {
    const socialsHTML = (document.querySelector('.header-socials') || {}).innerHTML || '';

    const split = document.createElement('div');
    split.className = 'header-mobile-split';
    split.setAttribute('role', 'banner');
    split.innerHTML =
      '<a href="index.html" class="hms-logo" aria-label="Accueil — Geoffrey Moreno">GM</a>' +
      '<button class="hms-burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" id="hmsBurger">' +
        '<span class="hms-burger__bar"></span>' +
        '<span class="hms-burger__bar"></span>' +
        '<span class="hms-burger__bar"></span>' +
      '</button>';

    const backdrop = document.createElement('div');
    backdrop.className = 'hms-backdrop';
    backdrop.id = 'hmsBackdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const drawer = document.createElement('aside');
    drawer.className = 'hms-drawer';
    drawer.id = 'hmsDrawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('aria-label', 'Menu principal');
    drawer.innerHTML =
      '<a href="index.html" class="hms-drawer__link">Accueil</a>' +
      '<a href="index.html#projets" class="hms-drawer__link">Mes projets</a>' +
      '<a href="index.html#parcours" class="hms-drawer__link">Mon parcours</a>' +
      '<a href="index.html#me-contacter" class="hms-drawer__link">Me contacter</a>' +
      '<div class="hms-drawer__socials">' + socialsHTML + '</div>';

    document.body.insertBefore(split, document.body.firstChild);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
  }

  // ══ Burger toggle — handler unifié (marche pour le markup hardcodé d'index.html
  //    et pour celui injecté ci-dessus sur les autres pages). ══
  const hmsBurger   = document.getElementById('hmsBurger');
  const hmsDrawer   = document.getElementById('hmsDrawer');
  const hmsBackdrop = document.getElementById('hmsBackdrop');
  if (hmsBurger && hmsDrawer && hmsBackdrop) {
    const openHms = () => {
      hmsDrawer.classList.add('is-open');
      hmsBackdrop.classList.add('is-open');
      hmsBurger.classList.add('is-open');
      hmsBurger.setAttribute('aria-expanded', 'true');
      hmsDrawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    const closeHms = () => {
      hmsDrawer.classList.remove('is-open');
      hmsBackdrop.classList.remove('is-open');
      hmsBurger.classList.remove('is-open');
      hmsBurger.setAttribute('aria-expanded', 'false');
      hmsDrawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    hmsBurger.addEventListener('click', () => {
      if (hmsDrawer.classList.contains('is-open')) closeHms();
      else openHms();
    });
    hmsBackdrop.addEventListener('click', closeHms);
    document.getElementById('hmsClose')?.addEventListener('click', closeHms);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && hmsDrawer.classList.contains('is-open')) closeHms();
    });
    // Tout lien interne au drawer (nav cap, projet phare, logo GM) ferme le drawer.
    hmsDrawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeHms));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && hmsDrawer.classList.contains('is-open')) closeHms();
    });
  }
})();
