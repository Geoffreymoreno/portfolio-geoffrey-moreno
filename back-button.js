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

  /* ─── Liens "Accueil"/logo vers la home SANS hash : on efface homeScrollY
     au clic ─── Toutes pages. La home restaure le scroll sur une bannière dès
     que homeScrollY existe (cf index.html script inline) — sans tester le
     type de navigation, peu fiable sur iOS. Pour qu'un clic EXPLICITE sur
     "Accueil"/logo ouvre quand même la home sur la hero (et non sur une
     bannière), ces liens effacent homeScrollY avant de naviguer. Un retour
     via la flèche du navigateur, lui, ne passe pas par un clic <a> → ne
     l'efface pas → la bannière est bien restaurée. */
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = (a.getAttribute('href') || '').trim();
    /* home "nue", sans hash : index.html | / | ./ | . */
    if (/^(index\.html|\.?\/?)$/.test(href)) {
      try {
        sessionStorage.removeItem('homeScrollY');
        sessionStorage.removeItem('homeGalleryExpanded');
      } catch (err) {}
    }
  }, true);

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
    /* Navigation classique via href avec hash #card-{slug} : la home reçoit
       le hash, son <script> inline déclenche IMMÉDIATEMENT l'overlay paint-level
       (pseudo-élément ::before sur <html>) qui masque tout le viewport. La
       restauration de scroll a lieu sous le masque ; quand back-button.js
       termine doScroll, il retire la classe et l'overlay disparaît, révélant
       la home pile sur la card cliquée — aucun scroll visible.
       Note : on n'utilise PAS history.back() car il ramène vers l'URL home
       précédente SANS hash, donc l'overlay inline ne se déclenche pas et si
       bfcache échoue (très fréquent sur iOS Safari quand des <video> tournent),
       la home recharge au scroll 0 sans aucune restauration. La nav href est
       toujours fiable. */

    /* Au clic : on injecte un overlay paint-level FULLSCREEN identique à
       celui de la home (mêmes pastel #dfd0e6 → #e3ccd2) AVANT que la nav ne
       parte. Le user voit donc : page projet → overlay pastel (instantané) →
       overlay pastel sur la home (continuité visuelle) → home révélée pile sur
       la card. Aucun flash blanc entre les deux pages (le browser garde le
       projet visible jusqu'à ce que la home soit prête à peindre, et notre
       overlay couvre le projet pendant cet intervalle). */
    back.addEventListener('click', () => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:linear-gradient(180deg,#dfd0e6 0%,#e3ccd2 100%);z-index:2147483647;pointer-events:none;';
      document.documentElement.appendChild(ov);
    });

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

  /* ─── HOME PAGE : restauration de scroll au retour depuis page projet ───
     Approche directe via sessionStorage : la position scrollY exacte a été
     sauvegardée juste avant la navigation vers la page projet (cf. script.js
     gallery-grid click handler). Ici on la restaure tel quel, sans calcul
     ni scrollIntoView qui pourraient déclencher un scroll smooth visible. */
  if (isHomePage) {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#card-')) return;

      /* Si l'inline head script a déjà fini la restauration (classe retirée
         + savedY clean), on ne re-scrolle PAS : l'utilisateur voit déjà la
         page à la bonne position, un scrollTo ici provoquerait un saut. */
      if (!document.documentElement.classList.contains('is-restoring-scroll')) return;

      const slug = hash.replace('#card-', '');
      const targetCard = document.querySelector(
        '.gallery-card[data-href="projet-' + slug + '.html"]'
      );

      const savedY = parseInt(sessionStorage.getItem('homeScrollY') || '0', 10);
      const wasExpanded = sessionStorage.getItem('homeGalleryExpanded') === '1';

      /* Reset filtre à "all" (la galerie filtrée pourrait cacher la card). */
      const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
      if (allBtn && !allBtn.classList.contains('is-active')) {
        allBtn.click();
      }

      /* Déplier la galerie si l'utilisateur l'avait dépliée (sessionStorage)
         OU si la card est cachée par le collapse. */
      const expandBtn = document.querySelector('.gallery-expand-btn');
      const needExpand = wasExpanded || (targetCard && targetCard.classList.contains('is-collapsed-hidden'));
      if (needExpand && expandBtn && expandBtn.dataset.expanded !== 'true') {
        expandBtn.click();
      }

      const doScroll = () => {
        /* Désactive le scroll-behavior smooth pendant la restauration
           (style.css force scroll-behavior:smooth sur html — bug iOS Safari
           qui l'applique malgré 'behavior:instant'). */
        const prevScrollBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';

        if (savedY > 0) {
          /* Position EXACTE sauvegardée → restauration au pixel près. */
          window.scrollTo(0, savedY);
          document.documentElement.scrollTop = savedY;
          document.body.scrollTop = savedY;
        } else if (targetCard) {
          /* Fallback : centrer la card si pas de position sauvegardée
             (ex : visiteur arrivant via lien externe avec #card-X). */
          const rect = targetCard.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - (window.innerHeight / 2) + (rect.height / 2);
          window.scrollTo(0, targetY);
          document.documentElement.scrollTop = targetY;
          document.body.scrollTop = targetY;
        }

        document.documentElement.style.scrollBehavior = prevScrollBehavior;
        document.documentElement.classList.remove('is-restoring-scroll');

        /* Nettoyage sessionStorage pour éviter restauration sur navigations
           ultérieures non-back (ex : clic sur lien #projets). */
        try {
          sessionStorage.removeItem('homeScrollY');
          sessionStorage.removeItem('homeGalleryExpanded');
        } catch (e) {}
      };

      /* Double rAF pour laisser filtre + expand recalculer la mise en page
         AVANT de scroller (1 frame ne suffit pas quand display:none repasse
         à display:flex pour les cards dépliées). */
      requestAnimationFrame(() => {
        requestAnimationFrame(doScroll);
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
