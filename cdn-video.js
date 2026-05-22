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

/* Applique cdnVideo() à toutes les <video data-src> de la page. */
(function () {
  var vids = document.querySelectorAll('video[data-src]');
  for (var i = 0; i < vids.length; i++) {
    var v = vids[i];
    /* crossorigin (présent en dur dans le HTML sur les vidéos servant
       de texture WebGL) est déjà posé : on peut fixer src sans risque
       de "tainting" dès lors que le CDN renvoie les en-têtes CORS. */
    v.setAttribute('src', window.cdnVideo(v.getAttribute('data-src')));
  }
})();
