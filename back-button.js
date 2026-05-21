/* ──────────────────────────────────────────────────────────────
   Back-button mobile pour les pages projet.
     • Sur projet-X.html : injecte une flèche de retour en haut à
       gauche (visible uniquement ≤480px via CSS). La flèche pointe
       vers `index.html#card-{slug}` où {slug} = basename de la page
       projet sans le préfixe "projet-" ni l'extension ".html".
     • Sur index.html : si l'URL contient un hash `#card-{slug}`,
       trouve la card `.gallery-card[data-href="projet-{slug}.html"]`
       et scrolle dessus (reset du filtre à "all" si besoin pour que
       la card soit visible).
   ────────────────────────────────────────────────────────────── */
(function () {
  const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  const isProjetPage = filename.startsWith('projet-') && filename.endsWith('.html');
  const isHomePage   = filename === '' || filename === 'index.html' || filename === '/';

  /* ─── PROJET PAGE : injection de la flèche de retour ─── */
  if (isProjetPage) {
    /* slug = nom de fichier sans préfixe "projet-" et sans ".html"
       ex : projet-netflix-events.html → netflix-events */
    const slug = filename.replace(/^projet-/, '').replace(/\.html$/, '');
    const targetUrl = 'index.html#card-' + slug;

    /* Création de l'élément */
    const back = document.createElement('a');
    back.className = 'projet-back-arrow';
    back.href = targetUrl;
    back.setAttribute('aria-label', 'Retour à la page principale');
    /* SVG : flèche horizontale vers la gauche, trait sombre #1a1230 pour
       matcher la couleur des barres du burger button (.hms-burger__bar). */
    back.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a1230" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    `;

    /* Insertion : dès que body est dispo */
    if (document.body) {
      document.body.appendChild(back);
      document.body.classList.add('has-back-arrow');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(back);
        document.body.classList.add('has-back-arrow');
      });
    }
    return;
  }

  /* ─── HOME PAGE : scroll vers la card si hash #card-X ─── */
  if (isHomePage) {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#card-')) return;
      const slug = hash.replace('#card-', '');
      const targetCard = document.querySelector(
        '.gallery-card[data-href="projet-' + slug + '.html"]'
      );
      if (!targetCard) return;

      /* Reset filtre à "all" pour s'assurer que la card cible est visible
         (sinon le scroll ne peut pas la trouver en viewport). */
      const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
      if (allBtn && !allBtn.classList.contains('is-active')) {
        allBtn.click();
      }

      /* Déplier la galerie si la card cible est masquée par le collapse
         (cards en position 9+ ont .is-collapsed-hidden → display:none, donc
         scrollIntoView échoue silencieusement). */
      if (targetCard.classList.contains('is-collapsed-hidden')) {
        const expandBtn = document.querySelector('.gallery-expand-btn');
        if (expandBtn) expandBtn.click();
      }

      /* Double rAF pour laisser le filtre + l'expand recalculer la mise en
         page avant de scroller (1 frame ne suffit pas quand display:none
         repasse à display:flex). */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleHashScroll);
    } else {
      handleHashScroll();
    }
    window.addEventListener('hashchange', handleHashScroll);
  }
})();
