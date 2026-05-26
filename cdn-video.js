/* ════════════════════════════════════════════════════════════════════
   cdn-video.js — bascule des vidéos vers un CDN (Cloudflare R2)
   ────────────────────────────────────────────────────────────────────
   PRINCIPE
   Les balises <video> du site portent leur chemin local dans data-src
   (ex. data-src="assets/hero-section/minions.mp4"). Ce script résout ce
   chemin au chargement de la page et pose l'attribut src réel :

     • CDN_BASE vide ('')   → src = chemin local  → vidéos servies par
                              Vercel, exactement comme avant. RÉVERSIBLE.
     • CDN_BASE renseigné   → src = CDN_BASE + '/' + chemin → vidéos
                              servies par le CDN R2.

   ACTIVER LE CDN : renseigner CDN_BASE ci-dessous avec l'URL du CDN
   (sans slash final), p.ex. 'https://cdn.mondomaine.com'.
   REVENIR EN LOCAL : remettre CDN_BASE = ''.

   Ce script est chargé en fin de <body> (classique, non différé) : il
   s'exécute donc une fois toutes les <video> présentes dans le DOM, et
   AVANT le module différé du podium 3D — qui a besoin des <video> du
   hero déjà pourvues de leur src pour les utiliser en texture WebGL.

   GATING PAR DEVICE (depuis 2026-05-26) — perf critique
   ────────────────────────────────────────────────────────────────────
   Auparavant ce script chargeait TOUTES les <video data-src> sans
   distinction de device. Or la home contient deux pools de 3 vidéos :
     • .hmc-video    → carousel mobile (visible ≤768px uniquement)
     • #video-minions/-playstation/-mercredi → textures WebGL podium 3D
                       (visible >768px uniquement)
   Conséquence : sur desktop, 3 vidéos du carousel mobile étaient
   téléchargées pour rien (et inversement sur mobile). Soit ~12 MB de
   bande passante gaspillée au premier chargement, qui saturait le CDN
   pendant que le user attendait les vraies vidéos visibles.

   Solution : on regarde matchMedia('(min-width: 769px)') et on ne
   charge que les vidéos pertinentes pour le viewport actif. Si l'user
   redimensionne après coup (rare : DevTools, rotation), on charge les
   vidéos manquantes à la volée.
   ════════════════════════════════════════════════════════════════════ */

/* ▼▼▼  SEUL RÉGLAGE À MODIFIER POUR (DÉS)ACTIVER LE CDN  ▼▼▼ */
window.CDN_BASE = 'https://cdn.geoffrey-moreno.com';
/* ▲▲▲                                                    ▲▲▲ */

/* Résout un chemin de vidéo : renvoie l'URL CDN si CDN_BASE est défini,
   sinon le chemin local inchangé. */
window.cdnVideo = function (path) {
  var local = String(path || '').replace(/^\/+/, '');
  if (!window.CDN_BASE) return local;
  return window.CDN_BASE.replace(/\/+$/, '') + '/' + local;
};

/* Applique cdnVideo() uniquement aux <video data-src> du device actif. */
(function () {
  var DESKTOP_MQ = window.matchMedia('(min-width: 769px)');

  function loadVideo(v) {
    if (v.dataset.cdnLoaded === '1') return;
    var ds = v.getAttribute('data-src');
    if (!ds) return;
    /* crossorigin (présent en dur dans le HTML sur les vidéos servant
       de texture WebGL) est déjà posé : on peut fixer src sans risque
       de "tainting" dès lors que le CDN renvoie les en-têtes CORS. */
    v.setAttribute('src', window.cdnVideo(ds));
    v.dataset.cdnLoaded = '1';
  }

  function applyForViewport(isDesktop) {
    var vids = document.querySelectorAll('video[data-src]');
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      /* .hmc-video = pool mobile carousel.
         Tout le reste avec data-src = pool podium 3D desktop. */
      var isMobileVideo = v.classList.contains('hmc-video');
      var shouldLoad = isMobileVideo ? !isDesktop : isDesktop;
      if (shouldLoad) loadVideo(v);
    }
  }

  applyForViewport(DESKTOP_MQ.matches);

  /* Redimensionnement franchissant le breakpoint (DevTools, rotation
     tablette) : on charge à la volée les vidéos désormais nécessaires.
     On ne décharge JAMAIS — un setAttribute('src','') déclencherait
     un nouveau fetch sur certains navigateurs. */
  if (DESKTOP_MQ.addEventListener) {
    DESKTOP_MQ.addEventListener('change', function (e) {
      applyForViewport(e.matches);
    });
  } else if (DESKTOP_MQ.addListener) {
    /* Safari < 14 */
    DESKTOP_MQ.addListener(function (e) {
      applyForViewport(e.matches);
    });
  }
})();
