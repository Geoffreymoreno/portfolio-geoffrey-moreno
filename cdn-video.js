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
   La home contient deux pools de 3 vidéos :
     • .hmc-video    → carousel mobile (visible ≤768px uniquement)
     • #video-minions/-playstation/-mercredi → textures WebGL podium 3D
                       (visible >768px uniquement)
   On ne charge que les vidéos pertinentes pour le viewport actif.

   LAZY LOADING PRIORITÉ CENTRE (depuis 2026-05-26) — perf critique
   ────────────────────────────────────────────────────────────────────
   Avant : les 3 vidéos du device actif étaient toutes téléchargées en
   parallèle au boot (≈ 10 MB simultanés sur desktop), saturant la
   connexion 3-5 s avant que la vidéo centrale ne joue.

   Maintenant : on ne charge IMMÉDIATEMENT que la vidéo CENTRE :
     • mobile  : .hmc-video[data-slot="0"] (playstation, .is-active)
     • desktop : #video-playstation (téléphone central du podium)
   Les 2 autres sont mises en attente et chargées plus tard via :
     1. Clic utilisateur sur une commande de nav (.hmc-arrow, .hmc-dot,
        .podium-nav__arrow, .podium-stage) → charge immédiate.
     2. Fallback 1500 ms après window 'load' → charge en arrière-plan,
        une fois que la page est interactive et la vidéo centre joue.

   Sans risque visuel : les téléphones latéraux 3D affichent leur poster
   webp (premier frame de chaque vidéo) tant que la vidéo n'est pas
   décodée — fallback géré dans podium-3d.js (_render() → poster).
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

/* Applique cdnVideo() aux <video data-src> avec priorité centre. */
(function () {
  var DESKTOP_MQ = window.matchMedia('(min-width: 769px)');
  var deferredQueue = [];
  var deferredFlushed = false;

  function loadVideo(v) {
    if (v.dataset.cdnLoaded === '1') return;
    var ds = v.getAttribute('data-src');
    if (!ds) return;
    v.setAttribute('src', window.cdnVideo(ds));
    v.dataset.cdnLoaded = '1';
  }

  /* La vidéo centre se distingue par : sur desktop l'ID #video-playstation
     (téléphone central du podium 3D), sur mobile la classe .hmc-video
     avec data-slot="0" (premier slot du carousel, .is-active au boot). */
  function isPriorityVideo(v, isDesktop) {
    if (isDesktop) return v.id === 'video-playstation';
    return v.classList.contains('hmc-video') && v.getAttribute('data-slot') === '0';
  }

  function isRelevantForViewport(v, isDesktop) {
    var isMobileVideo = v.classList.contains('hmc-video');
    return isMobileVideo ? !isDesktop : isDesktop;
  }

  function flushDeferred() {
    if (deferredFlushed) return;
    deferredFlushed = true;
    for (var i = 0; i < deferredQueue.length; i++) loadVideo(deferredQueue[i]);
    deferredQueue.length = 0;
  }

  function applyForViewport(isDesktop) {
    var vids = document.querySelectorAll('video[data-src]');
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      if (v.dataset.cdnLoaded === '1') continue;
      if (!isRelevantForViewport(v, isDesktop)) continue;
      if (isPriorityVideo(v, isDesktop)) {
        loadVideo(v);
      } else if (deferredFlushed) {
        loadVideo(v);
      } else {
        deferredQueue.push(v);
      }
    }
  }

  applyForViewport(DESKTOP_MQ.matches);

  /* Trigger 1 — interaction utilisateur sur la nav du carousel/podium :
     l'user veut voir une autre vidéo, on flush tout le pool. */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('.hmc-arrow, .hmc-dot, .podium-nav__arrow, .podium-stage')) {
      flushDeferred();
    }
  }, { capture: true, passive: true });

  /* Trigger 2 — fallback temporel : 1.5 s après window 'load' (page
     totalement interactive, vidéo centre déjà en lecture), on charge
     les latérales en arrière-plan sans déranger le ressenti. */
  function scheduleFallback() { setTimeout(flushDeferred, 1500); }
  if (document.readyState === 'complete') {
    scheduleFallback();
  } else {
    window.addEventListener('load', scheduleFallback, { once: true });
  }

  /* Redimensionnement franchissant le breakpoint (DevTools, rotation
     tablette) : on charge à la volée les vidéos désormais nécessaires.
     On ne décharge JAMAIS — un setAttribute('src','') déclencherait
     un nouveau fetch sur certains navigateurs. */
  function onMqChange(e) { applyForViewport(e.matches); }
  if (DESKTOP_MQ.addEventListener) {
    DESKTOP_MQ.addEventListener('change', onMqChange);
  } else if (DESKTOP_MQ.addListener) {
    DESKTOP_MQ.addListener(onMqChange); /* Safari < 14 */
  }
})();
