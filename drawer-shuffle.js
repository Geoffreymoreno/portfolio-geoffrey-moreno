// ════════════════════════════════════════════════════════════════════
//  Drawer "Projets phares" — tirage au sort dynamique
//  À chaque ouverture du drawer (.hms-drawer.is-open), on remplace le
//  contenu de .hms-drawer__ticker par 4 cartes aléatoires choisies
//  dans POOL, en excluant le projet courant (data-current-project).
// ════════════════════════════════════════════════════════════════════
(function () {
  const POOL = [
    { id: 'netflix',         href: 'projet-netflix.html',         webp: 'assets/brand-projects/netflix/lancement-netflix.webp',    fallback: 'assets/brand-projects/netflix/lancement-netflix.webp' },
    { id: 'lupin',           href: 'projet-lupin.html',           webp: 'assets/brand-projects/netflix/lupin.webp',                 fallback: 'assets/brand-projects/netflix/lupin.webp' },
    { id: 'mercredi',        href: 'projet-mercredi.html',        webp: 'assets/brand-projects/netflix/mercredi.webp',              fallback: 'assets/brand-projects/netflix/mercredi.webp' },
    { id: 'banlieusards',    href: 'projet-banlieusards.html',    webp: 'assets/brand-projects/netflix/banlieusards.webp',          fallback: 'assets/brand-projects/netflix/banlieusards.webp' },
    { id: 'netflix-2',       href: 'projet-netflix-2.html',       webp: 'assets/brand-projects/netflix/annonces-netflix.webp',      fallback: 'assets/brand-projects/netflix/annonces-netflix.webp' },
    { id: 'netflix-events',  href: 'projet-netflix-events.html',  webp: 'assets/brand-projects/netflix/evenement-netflix.webp',     fallback: 'assets/brand-projects/netflix/evenement-netflix.webp' },
    { id: 'netflix-stranger',href: 'projet-netflix-stranger.html',webp: 'assets/brand-projects/netflix/stranger-things-affiche.webp',fallback:'assets/brand-projects/netflix/stranger-things-affiche.webp' },
    { id: 'playstation',     href: 'projet-playstation.html',     webp: 'assets/brand-projects/other-banners/banniere-playstation.webp', fallback: 'assets/brand-projects/other-banners/banniere-playstation.webp' },
    { id: 'yop',             href: 'projet-yop.html',             webp: 'assets/brand-projects/other-banners/banniere-yop.webp',    fallback: 'assets/brand-projects/other-banners/banniere-yop.webp' },
    { id: 'armee-de-lair',   href: 'projet-armee-de-lair.html',   webp: 'assets/brand-projects/other-banners/banniere-armee-lair.webp', fallback: 'assets/brand-projects/other-banners/banniere-armee-lair.webp' },
    { id: 'emmaus',          href: 'projet-emmaus.html',          webp: 'assets/brand-projects/other-banners/banniere-emmaus-connect.webp', fallback: 'assets/brand-projects/other-banners/banniere-emmaus-connect.webp' },
    { id: 'mannequinat',     href: 'projet-mannequinat.html',     webp: 'assets/mannequinat/Banniere-manequinat.webp',              fallback: 'assets/mannequinat/Banniere-manequinat.jpg' }
  ];

  const PICK_COUNT = 4;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderCard(p) {
    const a = document.createElement('a');
    a.href = p.href;
    a.className = 'hms-drawer__card';
    a.setAttribute('data-project', p.id);
    a.innerHTML =
      '<picture>' +
        '<source srcset="' + p.webp + '" type="image/webp">' +
        '<img src="' + p.fallback + '" alt="" loading="lazy" decoding="async">' +
      '</picture>';
    return a;
  }

  function repopulateTicker() {
    const ticker = document.querySelector('.hms-drawer__ticker');
    if (!ticker) return;
    const current = ticker.getAttribute('data-current-project') || '';
    const candidates = POOL.filter(p => p.id !== current);
    const picks = shuffle(candidates).slice(0, PICK_COUNT);
    ticker.innerHTML = '';
    picks.forEach(p => ticker.appendChild(renderCard(p)));
    // Pas besoin de recâbler closeHms : un clic sur un <a> du ticker
    // navigue vers la nouvelle page, le drawer disparaît avec le DOM.
  }

  function init() {
    const drawer = document.getElementById('hmsDrawer');
    if (!drawer || !drawer.classList.contains('hms-drawer--portfolio')) return;

    // Observe l'ajout/retrait de la classe is-open pour redessiner à chaque ouverture
    const observer = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.attributeName === 'class' && drawer.classList.contains('is-open')) {
          repopulateTicker();
        }
      }
    });
    observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
