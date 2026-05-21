/* ──────────────────────────────────────────────────────────────
   Lecteur vidéo des "contenu-card" — version unifiée
   Fonctionnalités :
     • Play/Pause (clic sur bouton OU sur la vidéo)
     • Le son s'active automatiquement au lancement de la lecture
     • Bouton mute/unmute manuel
     • Barre de progression (clic pour seek + flèches clavier ←/→)
     • Image de couverture personnalisée (data-poster-time sur la vidéo)
     • Bouton plein écran (.contenu-card__fullscreen) si présent
     • Accessibilité : aria-label dynamiques
   Utilisé par toutes les pages projet contenant .contenu-card__frame--player
   ────────────────────────────────────────────────────────────── */
(function () {
  const SVG_MUTED = `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
  const SVG_SOUND = `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

  document.querySelectorAll('.contenu-card__frame--player').forEach(frame => {
    const video    = frame.querySelector('video');
    const toggle   = frame.querySelector('.contenu-card__play--toggle');
    const progress = frame.querySelector('.contenu-card__progress');
    const fill     = frame.querySelector('.contenu-card__progress-fill');
    const sound    = frame.querySelector('.contenu-card__sound');
    if (!video || !toggle) return;

    /* Poster frame : seek to data-poster-time before first play */
    const posterTime = parseFloat(video.dataset.posterTime);
    if (!isNaN(posterTime)) {
      video.addEventListener('loadedmetadata', () => {
        if (video.currentTime === 0) video.currentTime = posterTime;
      }, { once: true });
    }

    /* Play / Pause */
    const setSoundIcon = () => {
      if (sound) sound.innerHTML = video.muted ? SVG_MUTED : SVG_SOUND;
    };
    const setPlaying = (playing) => {
      frame.classList.toggle('is-playing', playing);
      toggle.setAttribute('aria-label', playing ? 'Mettre en pause' : 'Lire la vidéo');
    };
    const togglePlay = () => {
      if (video.paused) {
        video.muted = false;
        setSoundIcon();
        video.play();
      } else {
        video.pause();
      }
    };

    /* Auto-hide du bouton play en mode zoom : 1.5 s après le lancement de la
       lecture, le bouton disparaît. Un clic sur la vidéo le fait réapparaître
       sans déclencher pause (le clic suivant met en pause normalement). */
    let hideTimer = null;
    const scheduleHide = () => {
      clearTimeout(hideTimer);
      if (!frame.classList.contains('is-zoomed') || video.paused) return;
      hideTimer = setTimeout(() => {
        if (frame.classList.contains('is-zoomed') && !video.paused) {
          frame.classList.add('zoom-controls-hidden');
        }
      }, 1500);
    };
    const revealControls = () => {
      clearTimeout(hideTimer);
      frame.classList.remove('zoom-controls-hidden');
    };

    toggle.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
    video.addEventListener('click', () => {
      if (frame.classList.contains('is-zoomed') && frame.classList.contains('zoom-controls-hidden')) {
        revealControls();
        scheduleHide();
        return;
      }
      togglePlay();
    });
    video.addEventListener('play',  () => { setPlaying(true); if (frame.classList.contains('is-zoomed')) scheduleHide(); });
    video.addEventListener('pause', () => { setPlaying(false); revealControls(); });
    video.addEventListener('ended', () => { setPlaying(false); video.muted = true; setSoundIcon(); revealControls(); });

    /* Progress bar — click + drag (pointer events) */
    if (progress && fill) {
      video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        fill.style.width = pct + '%';
        progress.setAttribute('aria-valuenow', Math.round(pct));
      });

      const seekFromPointer = (clientX) => {
        if (!video.duration) return;
        const rect = progress.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        video.currentTime = ratio * video.duration;
      };

      let scrubbing = false;
      progress.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        scrubbing = true;
        progress.classList.add('is-scrubbing');
        try { progress.setPointerCapture(e.pointerId); } catch (_) {}
        seekFromPointer(e.clientX);
      });
      progress.addEventListener('pointermove', (e) => {
        if (!scrubbing) return;
        seekFromPointer(e.clientX);
      });
      const stopScrub = (e) => {
        if (!scrubbing) return;
        scrubbing = false;
        progress.classList.remove('is-scrubbing');
        if (e && progress.hasPointerCapture && progress.hasPointerCapture(e.pointerId)) {
          progress.releasePointerCapture(e.pointerId);
        }
      };
      progress.addEventListener('pointerup', stopScrub);
      progress.addEventListener('pointercancel', stopScrub);

      progress.addEventListener('keydown', (e) => {
        if (!video.duration) return;
        if (e.key === 'ArrowRight') video.currentTime = Math.min(video.duration, video.currentTime + 2);
        if (e.key === 'ArrowLeft')  video.currentTime = Math.max(0, video.currentTime - 2);
      });
    }

    /* Sound toggle */
    if (sound) {
      sound.innerHTML = SVG_MUTED;
      sound.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        setSoundIcon();
        sound.setAttribute('aria-label', video.muted ? 'Activer le son' : 'Couper le son');
      });
    }

    /* Zoom modal — la frame est physiquement déplacée au niveau <body> pour
       échapper au stacking context local de .contenu-card (z-index:0) qui sinon
       laisse les cartes sœurs et le header passer par-dessus la modale.
       L'ouverture pousse un état dans l'historique → le bouton "précédent"
       du navigateur ferme la modale au lieu de quitter la page. */
    const fsBtn = frame.querySelector('.contenu-card__fullscreen');
    if (fsBtn) {
      let placeholder = null;
      let originalParent = null;

      const onPopState = () => closeZoomInternal();

      const openZoom = () => {
        if (frame.classList.contains('is-zoomed')) return;
        if (document.querySelector('.contenu-card__frame.is-zoomed')) return;
        originalParent = frame.parentNode;
        placeholder = document.createElement('div');
        placeholder.className = 'contenu-card__frame-placeholder';
        placeholder.style.cssText = 'width:100%;aspect-ratio:9/16;visibility:hidden;';
        originalParent.insertBefore(placeholder, frame);
        document.body.appendChild(frame);
        frame.classList.add('is-zoomed');
        document.body.classList.add('has-video-zoom');
        history.pushState({ videoZoom: true }, '');
        window.addEventListener('popstate', onPopState);
        if (!video.paused) scheduleHide();
      };

      /* Ferme la modale sans toucher à l'historique — appelée par popstate. */
      const closeZoomInternal = () => {
        if (!frame.classList.contains('is-zoomed')) return;
        window.removeEventListener('popstate', onPopState);
        revealControls();
        frame.classList.remove('is-zoomed');
        document.body.classList.remove('has-video-zoom');
        if (placeholder && originalParent) {
          originalParent.insertBefore(frame, placeholder);
          placeholder.remove();
        }
        placeholder = null;
        originalParent = null;
      };

      /* Ferme la modale via l'historique — déclenche popstate qui appelle closeZoomInternal. */
      const closeZoom = () => {
        if (!frame.classList.contains('is-zoomed')) return;
        if (history.state && history.state.videoZoom) history.back();
        else closeZoomInternal();
      };

      fsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (frame.classList.contains('is-zoomed')) closeZoom();
        else openZoom();
      });
      /* Clic sur le fond sombre (en dehors du rectangle vidéo) ferme le zoom */
      frame.addEventListener('click', (e) => {
        if (frame.classList.contains('is-zoomed') && e.target === frame) closeZoom();
      });
      /* Expose le close pour le handler Escape global */
      frame._closeZoom = closeZoom;
    }
  });

  /* Échap ferme n'importe quel zoom ouvert */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const zoomed = document.querySelector('.contenu-card__frame.is-zoomed');
    if (zoomed && typeof zoomed._closeZoom === 'function') zoomed._closeZoom();
  });
})();
