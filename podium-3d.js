    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

    const SCREEN_MATERIAL_NAME = 'xRigXiQTgpqkIah_001';
    const MODEL_URL = 'assets/3d-assets/iphone_16_pro_desert_titanium.draco.glb';
    const SCENE_OFFSET_X = 0.136;

    const TIMING = {
      MOTION: 1800, WOBBLE: 700, LEAVING_DELAY: 0, ARRIVING_DELAY: 80, TRANSIT_DELAY: 160,
    };

    const PHONES = [
      { id: 'minions',     videoId: 'video-minions',     label: 'Universal',   poster: 'assets/hero-section/screen-minions.webp' },
      { id: 'playstation', videoId: 'video-playstation', label: 'PlayStation', poster: 'assets/hero-section/screen-playstation.webp' },
      { id: 'mercredi',    videoId: 'video-mercredi',    label: 'Netflix',     poster: 'assets/hero-section/screen-mercredi.webp' },
    ];

    const SLOTS = {
      LEFT:   { x: -0.301, y: 0, z: -0.20, scale: 0.72, rotY:  0.55 },
      CENTER: { x:  0.00,  y: 0, z:  0.00, scale: 1.00, rotY:  0.00 },
      RIGHT:  { x:  0.213, y: 0, z: -0.20, scale: 0.72, rotY: -0.55 },
    };
    const SLOT_ORDER = ['LEFT', 'CENTER', 'RIGHT'];

    const BREATH = { amplitude: 0.005, period: 4.0 };
    const WOBBLE = { amplitude: 0, frequency: 3.5, decay: 9.0 };
    const IDLE_SWING = { amplitude: 0.10, period: 5.5, tiltX: 0.04, periodX: 7.2 };
    const BANK = { maxX: 0.08, maxZ: 0.18, velocityScale: 0.9, smoothing: 0.08 };

    const canvas = document.getElementById('podium-canvas');
    const loadingEl = document.getElementById('stageLoading');
    const activeLabel = document.getElementById('activeLabel');
    const navDots = document.getElementById('navDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    camera.position.set(0, 0, 1.45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 3, 2.5); scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xfff1e0, 0.8);
    fillLight.position.set(-2.5, 0.5, 1.5); scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xb8d4ff, 0.7);
    rimLight.position.set(0, -1, -2); scene.add(rimLight);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xf0e8dd);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;

    function makeShadowTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0,    'rgba(255,255,255,0.55)');
      g.addColorStop(0.4,  'rgba(255,255,255,0.30)');
      g.addColorStop(0.75, 'rgba(255,255,255,0.08)');
      g.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }
    const shadowTex = makeShadowTexture();
    const SHADOW_GROUND_Y = -0.32;

    const BRAND_SHADOW_COLORS = {
      'PlayStation': new THREE.Color(0x0070D1),
      'Netflix':     new THREE.Color(0xE50914),
      'Universal':   new THREE.Color(0x1B2A6B),
    };
    const SHADOW_BLACK = new THREE.Color(0x000000);
    const SHADOW_COLOR_LERP = 0.04;

    function cubicBezierEasing(p1x, p1y, p2x, p2y) {
      const NEWTON_ITERATIONS = 4;
      const A = (a1, a2) => 1 - 3 * a2 + 3 * a1;
      const B = (a1, a2) => 3 * a2 - 6 * a1;
      const C = (a1) => 3 * a1;
      const calc = (t, a1, a2) => ((A(a1,a2)*t + B(a1,a2))*t + C(a1)) * t;
      const slope = (t, a1, a2) => 3*A(a1,a2)*t*t + 2*B(a1,a2)*t + C(a1);
      function getTForX(x) {
        let t = x;
        for (let i = 0; i < NEWTON_ITERATIONS; i++) {
          const s = slope(t, p1x, p2x);
          if (s === 0) break;
          t -= (calc(t, p1x, p2x) - x) / s;
        }
        return t;
      }
      return (x) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        return calc(getTForX(x), p1y, p2y);
      };
    }
    const easeInOutSine = cubicBezierEasing(0.5, 0, 0.2, 1);
    const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

    function bezier3D(t, P0, P1, P2, P3) {
      const u = 1 - t, tt = t*t, uu = u*u, uuu = uu*u, ttt = tt*t;
      return {
        x: uuu*P0.x + 3*uu*t*P1.x + 3*u*tt*P2.x + ttt*P3.x,
        y: uuu*P0.y + 3*uu*t*P1.y + 3*u*tt*P2.y + ttt*P3.y,
        z: uuu*P0.z + 3*uu*t*P1.z + 3*u*tt*P2.z + ttt*P3.z,
      };
    }

    function buildBezier(fromPos, toPos, role) {
      const mid = { x: (fromPos.x+toPos.x)/2, y: (fromPos.y+toPos.y)/2, z: (fromPos.z+toPos.z)/2 };
      let liftY = 0, pushZ = 0;
      if (role === 'leaving-center' || role === 'arriving-center') { liftY = 0.085; pushZ = 0.06; }
      else { liftY = -0.025; pushZ = -0.10; }
      const P1 = { x: fromPos.x+(mid.x-fromPos.x)*0.45, y: mid.y+liftY, z: mid.z+pushZ };
      const P2 = { x: toPos.x+(mid.x-toPos.x)*0.45,   y: mid.y+liftY, z: mid.z+pushZ };
      return { P0: fromPos, P1, P2, P3: toPos };
    }

    function generatePlanarUVs(mesh) {
      const geom = mesh.geometry, pos = geom.attributes.position, count = pos.count;
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
      for (let i=0;i<count;i++) {
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
        if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;
      }
      const ranges={x:maxX-minX,y:maxY-minY,z:maxZ-minZ};
      const sortedAxes=Object.entries(ranges).sort((a,b)=>a[1]-b[1]);
      const uAxis=sortedAxes[1][0],vAxis=sortedAxes[2][0];
      const uMin=uAxis==='x'?minX:uAxis==='y'?minY:minZ,uMax=uAxis==='x'?maxX:uAxis==='y'?maxY:maxZ;
      const vMin=vAxis==='x'?minX:vAxis==='y'?minY:minZ,vMax=vAxis==='x'?maxX:vAxis==='y'?maxY:maxZ;
      const get={x:'getX',y:'getY',z:'getZ'};
      const uvs=new Float32Array(count*2);
      for(let i=0;i<count;i++){uvs[i*2]=(pos[get[uAxis]](i)-uMin)/(uMax-uMin);uvs[i*2+1]=1-(pos[get[vAxis]](i)-vMin)/(vMax-vMin);}
      geom.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
    }

    const dracoLoader = new DRACOLoader();
    /* Décodeur Draco hébergé EN LOCAL (RGPD). Avant : chargé depuis
       www.gstatic.com (Google) → transmettait l'IP du visiteur à Google. */
    dracoLoader.setDecoderPath('assets/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const phoneInstances = [];
    let scaleBase = 1;

    // Ratio écran iPhone tel que rendu via les UVs planaires
    const SCREEN_RATIO = 0.460;
    // Résolution du canvas composite (hauteur fixe, largeur dérivée du ratio)
    const SCREEN_TEX_H = 1024;
    const SCREEN_TEX_W = Math.round(SCREEN_TEX_H * SCREEN_RATIO);

    /**
     * Crée une CanvasTexture qui composite la vidéo (en cover) + glyph play
     * dessiné par-dessus quand `phoneRef.showPlay === true`.
     */
    function createScreenTexture(videoEl, phoneRef, posterUrl) {
      const c = document.createElement('canvas');
      c.width = SCREEN_TEX_W;
      c.height = SCREEN_TEX_H;
      const ctx = c.getContext('2d');
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;

      // Poster image: drawn as fallback while the video has no decoded frame.
      // Safari ne décode AUCUNE frame d'une vidéo en pause → sans ce poster
      // l'écran central reste noir. On garantit son affichage.
      const posterImg = new Image();
      posterImg.crossOrigin = 'anonymous';
      posterImg.decoding = 'async';
      let posterReady = false;
      // Dessine le poster dans le canvas-texture et pousse-le au GPU. Répété
      // plusieurs fois au boot car Safari peut ignorer le 1er needsUpdate si
      // la texture n'est pas encore liée au matériau au moment du dessin.
      const paintPoster = () => {
        if (!posterReady) return;
        const hasFrame = videoEl.videoWidth && videoEl.videoHeight && videoEl.readyState >= 2;
        if (hasFrame) return; // la vidéo joue : on la laisse (Chrome)
        ctx.clearRect(0, 0, SCREEN_TEX_W, SCREEN_TEX_H);
        ctx.drawImage(posterImg, 0, 0, SCREEN_TEX_W, SCREEN_TEX_H);
        tex.needsUpdate = true;
      };
      tex._paintPoster = paintPoster;
      tex._posterIsReady = () => posterReady;
      posterImg.onload = () => {
        posterReady = true;
        paintPoster();
        // Re-paint forcé à plusieurs reprises pour contourner le timing Safari
        // (la texture peut ne pas encore être attachée au mesh au 1er paint).
        [50, 150, 350, 700, 1200].forEach((d) => setTimeout(paintPoster, d));
      };
      if (posterUrl) posterImg.src = posterUrl;

      // Bouton play/pause : cercle gris foncé translucide + triangle blanc
      // (style natif YouTube / lecteur iOS — identique au screenshot de réf).
      function drawCircleBg(R, cx, cy, opacity) {
        const S = R / 26;
        // Halo doux pour décoller du fond
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${0.35 * opacity})`;
        ctx.shadowBlur = 18 * S;
        ctx.shadowOffsetY = 2 * S;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30,30,35,${0.55 * opacity})`;
        ctx.fill();
        ctx.restore();
        // Liseré blanc fin pour l'arête
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.lineWidth = 1.5 * S;
        ctx.strokeStyle = `rgba(255,255,255,${0.55 * opacity})`;
        ctx.stroke();
        ctx.restore();
      }

      function drawPlayGlyph(opacity) {
        const cx = SCREEN_TEX_W / 2;
        const cy = SCREEN_TEX_H / 2;
        const R  = SCREEN_TEX_W * 0.13;
        drawCircleBg(R, cx, cy, opacity);
        // Triangle plein NOIR, centré optiquement (offset X pour compenser
        // l'asymétrie visuelle d'un triangle pointant à droite).
        const tr = R * 0.331; // cumulé ≈ -39.8% vs original
        const offsetX = R * 0.08;
        const tri = new Path2D();
        tri.moveTo(cx - tr * 0.55 + offsetX, cy - tr * 0.9);
        tri.lineTo(cx + tr * 0.95 + offsetX, cy);
        tri.lineTo(cx - tr * 0.55 + offsetX, cy + tr * 0.9);
        tri.closePath();
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${0.96 * opacity})`;
        ctx.fill(tri);
        ctx.restore();
      }

      function drawPauseGlyph(opacity) {
        const cx = SCREEN_TEX_W / 2;
        const cy = SCREEN_TEX_H / 2;
        const R  = SCREEN_TEX_W * 0.13;
        drawCircleBg(R, cx, cy, opacity);
        const barW = R * 0.22, barH = R * 0.95, gap = R * 0.16;
        const bars = new Path2D();
        bars.rect(cx - gap - barW, cy - barH/2, barW, barH);
        bars.rect(cx + gap,        cy - barH/2, barW, barH);
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${0.96 * opacity})`;
        ctx.fill(bars);
        ctx.restore();
      }

      function renderGlassShape(path, opacity) {
        ctx.save();
        // Blur des pixels vidéo derrière la forme (effet givré)
        ctx.save();
        ctx.clip(path);
        ctx.filter = 'blur(8px)';
        // Re-dessine la zone vidéo floutée (déjà présente dans le canvas)
        ctx.drawImage(c, 0, 0);
        ctx.restore();
        // Fill blanc semi-transparent par-dessus le blur
        ctx.fillStyle = `rgba(255,255,255,${0.45 * opacity})`;
        ctx.fill(path);
        // Liseré fin
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(255,255,255,${0.55 * opacity})`;
        ctx.stroke(path);
        ctx.restore();
      }

      tex._render = function () {
        const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
        const hasFrame = vw && vh && videoEl.readyState >= 2;
        if (hasFrame) {
          // Stretch : la vidéo remplit toute la surface de l'écran (peut étirer légèrement)
          ctx.drawImage(videoEl, 0, 0, SCREEN_TEX_W, SCREEN_TEX_H);
        } else if (posterReady) {
          ctx.drawImage(posterImg, 0, 0, SCREEN_TEX_W, SCREEN_TEX_H);
        } else {
          return;
        }

        // Glyph play/pause (uniquement sur le téléphone central)
        if (phoneRef.showPlay) {
          if (phoneRef.glyphMode === 'pause') drawPauseGlyph(phoneRef.glyphOpacity);
          else                                 drawPlayGlyph(phoneRef.glyphOpacity);
        }
        tex.needsUpdate = true;
      };
      return tex;
    }

    loader.load(MODEL_URL, (gltf) => {
      const template = gltf.scene;
      const box = new THREE.Box3().setFromObject(template);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      template.position.sub(center);
      template.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((mat) => { if (mat.name === SCREEN_MATERIAL_NAME) generatePlanarUVs(obj); });
        }
      });
      const maxDim = Math.max(size.x, size.y, size.z);
      scaleBase = 0.55 / maxDim;

      PHONES.forEach((phone, idx) => {
        const clone = template.clone(true);
        clone.traverse((obj) => { if (obj.isMesh && obj.material) obj.material = obj.material.clone(); });
        const videoEl = document.getElementById(phone.videoId);
        // Slot et state initiaux nécessaires à la texture composite
        const slot = SLOT_ORDER[idx];
        const cfg = SLOTS[slot];
        const inst = {
          wrapper: null, clone, videoEl, brand: phone.label, slotIndex: idx,
          curX: cfg.x, curY: cfg.y, curZ: cfg.z, curScale: cfg.scale, curRotY: cfg.rotY,
          hoverScale: 1.0, isHovered: false, pressScale: 1.0,
          hoverTiltX: 0, hoverTiltY: 0, targetTiltX: 0, targetTiltY: 0,
          swingFade: 1, residualLeanY: 0, breathPhase: idx * 1.3,
          anim: null, wobble: null, velX: 0, velY: 0, prevX: cfg.x, prevY: cfg.y, prevZ: cfg.z, curBankX: 0, curBankZ: 0,
          // Glyph play/pause dessiné dans la texture (centre uniquement)
          showPlay: false, glyphMode: 'play', glyphOpacity: 0, targetGlyphOpacity: 0,
        };
        // Crée la texture composite (vidéo + glyph) liée à cette instance
        const screenTex = createScreenTexture(videoEl, inst, phone.poster);
        inst.screenTex = screenTex;
        inst.useVideoTex = false;
        clone.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((mat) => {
              if (mat.name === SCREEN_MATERIAL_NAME) {
                const m = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
                inst.screenMat = m;
                obj.material = m;
              }
            });
          }
        });

        /* SOLUTION GARANTIE Safari — texture-IMAGE poster séparée.
           Le canvas-texture ne s'uploade pas de façon fiable sur Safari (écran
           noir). Une texture-image, elle, s'affiche toujours. On charge donc le
           poster comme texture Three.js dédiée et on l'utilise comme map de
           l'écran TANT QUE la vidéo n'a pas de frame. Au clic (vidéo joue), la
           bascule vers la texture vidéo (canvas) se fait dans tick(). */
        new THREE.TextureLoader().load(phone.poster, (ptex) => {
          ptex.colorSpace = THREE.SRGBColorSpace;
          ptex.flipY = false;
          ptex.wrapS = ptex.wrapT = THREE.ClampToEdgeWrapping;
          ptex.minFilter = ptex.magFilter = THREE.LinearFilter;
          ptex.generateMipmaps = false;
          inst.posterTex = ptex;
          if (!inst.useVideoTex && inst.screenMat && inst.screenMat.map !== ptex) {
            inst.screenMat.map = ptex;
            inst.screenMat.needsUpdate = true;
          }
        });
        const wrapper = new THREE.Group();
        wrapper.add(clone);
        clone.rotation.y = Math.PI;
        inst.wrapper = wrapper;
        wrapper.position.set(cfg.x, cfg.y, cfg.z);
        wrapper.scale.setScalar(scaleBase * cfg.scale);
        wrapper.rotation.y = cfg.rotY;
        const shadowGeo = new THREE.PlaneGeometry(0.42, 0.18);
        const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85, color: SHADOW_BLACK.clone() });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(cfg.x, SHADOW_GROUND_Y, cfg.z + 0.01);
        scene.add(shadow);
        inst.shadow = shadow;
        if (idx === 1) { const initBrand = BRAND_SHADOW_COLORS[phone.label]; if (initBrand) shadowMat.color.copy(initBrand); }
        scene.add(wrapper);
        phoneInstances.push(inst);
      });

      initVideoStates();
      buildDots();
      // Différer l'init UI (updateUI + is-ready) jusqu'à AU MOINS 2.6s après
      // le démarrage de la page, pour que la capsule "Top créa" (qui slide L→R
      // via .is-revealing → trophy-slide-in) apparaisse JUSTE APRÈS l'arrivée
      // du podium (slide 1.9s → 2.6s). Desktop only — mobile : aucun delay.
      const _isDesktop = window.matchMedia('(min-width: 769px)').matches;
      const _skipIntro = document.documentElement.classList.contains('no-hero-intro');
      const _revealAt = (_isDesktop && !_skipIntro) ? 2600 : 0;
      const _now = performance.now();
      const _wait = Math.max(0, _revealAt - _now);
      setTimeout(() => {
        updateUI(true);
        loadingEl.classList.add('is-hidden');
        document.querySelector('.podium-stage').classList.add('is-ready');
        document.documentElement.classList.add('hero-ready');
      }, _wait);
    }, (xhr) => {
      if (xhr.lengthComputable) loadingEl.textContent = `Chargement… ${Math.round((xhr.loaded/xhr.total)*100)}%`;
    }, (err) => { console.error(err); loadingEl.textContent = 'Erreur de chargement'; });

    // ─── État global des contrôles ───
    // paused:true au boot → PlayStation figée sur poster, attend un clic explicite.
    const userControls = { muted: true, paused: true, hoveringCenter: false };
    /* Grand écran (>1800px) : le glyph play/pause du téléphone central ne se
       montre QU'À l'arrêt. En lecture, il reste visible 2s après le démarrage
       puis disparaît, et ne réapparaît PAS au survol — il ne revient qu'à la
       mise en pause. matchMedia est "live" → bascule seule au redimensionnement.
       Sous 1800px : comportement d'origine (visible au survol). */
    const bigScreenGlyphMQ = window.matchMedia('(min-width: 1800px)');
    let glyphPlayStartedAt = 0;
    const phoneControlsEl = document.getElementById('phoneControls');
    const phoneCtrlSound  = document.getElementById('phoneCtrlSound');
    const podiumStageEl   = document.querySelector('.podium-stage');

    function syncControlsUI() {
      phoneControlsEl.classList.toggle('is-muted',  userControls.muted);
      phoneControlsEl.classList.toggle('is-paused', userControls.paused);
    }
    syncControlsUI();

    function applyAudioStateToCenter() {
      const c = getCenterPhone();
      if (!c) return;
      phoneInstances.forEach((p) => {
        // Toujours muet sauf le centre, et si l'utilisateur a activé le son
        p.videoEl.muted = (p === c) ? userControls.muted : true;
      });
    }

    function initVideoStates() {
      phoneInstances.forEach((p) => {
        try { p.videoEl.currentTime = 0; } catch(e) {}
        p.videoEl.muted = true;
        p.videoEl.pause();

        /* SAFARI — force le décodage d'une 1ère VRAIE frame sur une vidéo en
           pause. Safari ne décode rien tant qu'on n'a pas lu → écran noir du
           téléphone central. Un micro-seek (currentTime ~0.04s) force le
           décodeur à produire une frame ; à 'seeked', videoWidth>0 et
           readyState>=2 → _render() peint enfin la vidéo. On pousse aussi la
           texture (needsUpdate). Sur Chrome la frame existe déjà → inoffensif. */
        var _frameKick = function () {
          try {
            if (!p.videoEl.videoWidth || p.videoEl.readyState < 2) {
              p.videoEl.currentTime = 0.04;
            }
          } catch(e) {}
        };
        var _onSeeked = function () {
          if (p.screenTex) p.screenTex.needsUpdate = true;
          if (p.screenTex && p.screenTex._render) p.screenTex._render();
        };
        p.videoEl.addEventListener('seeked', _onSeeked);
        if (p.videoEl.readyState >= 1) _frameKick();
        else p.videoEl.addEventListener('loadedmetadata', _frameKick, { once: true });
        // Filet de sécurité : si rien n'a décodé après 600ms, on retente.
        setTimeout(_frameKick, 600);

        // Auto-advance : à la fin de la vidéo du centre, on cycle vers le prochain
        p.videoEl.addEventListener('ended', () => {
          if (p.slotIndex !== 1) return;
          if (isAnimating) return;
          if (userControls.paused) return;
          cycle('next');
        });
      });
      const c = getCenterPhone();
      if (c) {
        c.videoEl.muted = userControls.muted;
        if (!userControls.paused) {
          const pl = c.videoEl.play(); if (pl && pl.catch) pl.catch(() => {});
        }
      }
    }
    function getCenterPhone() { return phoneInstances.find(p => p.slotIndex === 1); }

    // Toggle play/pause via clic sur le téléphone central (pas de bouton overlay)
    // Clic play → on active aussi le son (user gesture autorise l'audio).
    function toggleCenterPlayPause() {
      const c = getCenterPhone();
      if (!c) return;
      userControls.paused = !userControls.paused;
      if (userControls.paused) {
        c.videoEl.pause();
      } else {
        glyphPlayStartedAt = performance.now(); /* démarre le compte des 2s (grand écran) */
        userControls.muted = false;
        applyAudioStateToCenter();
        const pl = c.videoEl.play(); if (pl && pl.catch) pl.catch(() => {});
      }
      syncControlsUI();
    }

    // Bouton son : toggle mute global, appliqué au centre
    phoneCtrlSound.addEventListener('click', (e) => {
      e.stopPropagation();
      userControls.muted = !userControls.muted;
      applyAudioStateToCenter();
      // Re-déclenche play() : un click utilisateur permet l'audio même si autoplay bloqué
      const c = getCenterPhone();
      if (c && !userControls.paused) {
        const pl = c.videoEl.play(); if (pl && pl.catch) pl.catch(() => {});
      }
      syncControlsUI();
    });

    function buildDots() {
      navDots.innerHTML = '';
      PHONES.forEach((phone, i) => {
        const d = document.createElement('button');
        d.className = 'podium-nav__dot';
        d.setAttribute('aria-label', phone.label);
        d.dataset.brand = phone.label;
        d.addEventListener('click', () => {
          if (isAnimating) return;
          const targetInstance = phoneInstances[i];
          if (!targetInstance || targetInstance.slotIndex === 1) return;
          if (targetInstance.slotIndex === 0) cycle('prev');
          else if (targetInstance.slotIndex === 2) cycle('next');
        });
        navDots.appendChild(d);
      });
    }

    const BADGE_CONFIG = {
      'PlayStation': { text: 'Top créa du compte en 2022', chipClass: 'is-ps', chipLogo: 'assets/brand-projects/playstation/Logo-plays.svg', bgSymbols: true },
      'Netflix':     { text: 'Top créa du compte en 2023', chipClass: 'is-netflix', chipWordmark: 'NETFLIX', bgSymbols: false },
      'Universal':   { text: 'Top créa du compte en 2022', chipClass: 'is-universal', chipWordmark: 'UNIVERSAL', bgSymbols: false },
    };

    function buildTrophyHTML(cfg) {
      const chars = [...cfg.text].map((c, i) => c === ' ' ? '<span class="char" style="--i:'+i+'">&nbsp;</span>' : '<span class="char" style="--i:'+i+'">'+c+'</span>').join('');
      const sparkles = Array.from({ length: 8 }).map((_, i) => {
        const angle = (i/8)*Math.PI*2+(Math.random()*0.4-0.2);
        const dist = 18+Math.random()*10;
        const dx = Math.cos(angle)*dist, dy = Math.sin(angle)*dist;
        return '<span class="sparkle" style="--dx:'+dx.toFixed(1)+'px;--dy:'+dy.toFixed(1)+'px;animation-delay:'+(280+Math.random()*120)+'ms;"></span>';
      }).join('');
      const psBg = cfg.bgSymbols
        ? '<span class="ps-symbols" aria-hidden="true"><span class="ps-symbol ps-symbol--triangle" style="font-size:9px;top:3px;left:38px;transform:rotate(-14deg);">▲</span><span class="ps-symbol ps-symbol--circle" style="font-size:8px;bottom:3px;left:46px;transform:rotate(10deg);">●</span><span class="ps-symbol ps-symbol--cross" style="font-size:10px;top:2px;right:8px;transform:rotate(-6deg);">✕</span><span class="ps-symbol ps-symbol--square" style="font-size:8px;bottom:3px;right:14px;transform:rotate(15deg);">■</span></span>'
        : '';
      const chipInner = cfg.chipLogo ? '<img class="brand-logo" src="'+cfg.chipLogo+'" alt="">' : '<span class="brand-wordmark">'+cfg.chipWordmark+'</span>';
      const chip = '<span class="brand-chip '+cfg.chipClass+'" aria-hidden="true">'+chipInner+'</span>';
      return chip + psBg + '<span class="trophy-circle">🏆'+sparkles+'</span><span class="trophy-text">'+chars+'</span>';
    }

    function setLabelContent(brand) {
      activeLabel.classList.remove('is-revealing','is-entering','is-leaving','is-badge','is-netflix','is-universal');
      const cfg = BADGE_CONFIG[brand];
      if (cfg) {
        activeLabel.classList.add('is-badge');
        if (brand === 'Netflix')   activeLabel.classList.add('is-netflix');
        if (brand === 'Universal') activeLabel.classList.add('is-universal');
        activeLabel.innerHTML = buildTrophyHTML(cfg);
        void activeLabel.offsetWidth;
        activeLabel.classList.add('is-revealing');
      } else {
        activeLabel.textContent = brand;
        void activeLabel.offsetWidth;
        activeLabel.classList.add('is-entering');
      }
    }

    function updateUI(initial = false) {
      const c = getCenterPhone();
      if (!c) return;
      const centerIdx = phoneInstances.indexOf(c);
      Array.from(navDots.children).forEach((dot, i) => dot.classList.toggle('is-active', i === centerIdx));
      if (initial) { setLabelContent(c.brand); return; }
      activeLabel.classList.remove('is-revealing','is-entering');
      activeLabel.classList.add('is-leaving');
      setTimeout(() => { activeLabel.classList.remove('is-leaving'); setLabelContent(c.brand); }, Math.round(TIMING.MOTION * 0.78));
    }

    let isAnimating = false;
    function cycle(direction) {
      if (isAnimating || phoneInstances.length < 3) return;
      isAnimating = true;
      podiumStageEl.classList.add('is-cycling');
      const now = performance.now();
      const slotShift = (direction === 'next') ? 1 : -1;
      activeLabel.style.setProperty('--dir', direction === 'next' ? -1 : 1);
      phoneInstances.forEach((p) => {
        const oldSlot = p.slotIndex;
        const newSlot = ((p.slotIndex - slotShift) + 3) % 3;
        p.slotIndex = newSlot;
        const cfg = SLOTS[SLOT_ORDER[newSlot]];
        let role, baseDelay;
        if (oldSlot === 1) { role = 'leaving-center'; baseDelay = TIMING.LEAVING_DELAY; }
        else if (newSlot === 1) { role = 'arriving-center'; baseDelay = TIMING.ARRIVING_DELAY; }
        else { role = 'transit'; baseDelay = TIMING.TRANSIT_DELAY; }
        const fromPos = { x: p.curX, y: p.curY, z: p.curZ };
        const toPos   = { x: cfg.x, y: cfg.y, z: cfg.z };
        p.anim = { startTime: now+baseDelay, duration: TIMING.MOTION, bezier: buildBezier(fromPos, toPos, role), fromRotY: p.curRotY, toRotY: cfg.rotY, fromScale: p.curScale, toScale: cfg.scale, role, arrived: false };
        p.swingFade = 0;
        p.isHovered = false;
        p.hoverScale = 1.0;
        p.targetTiltX = 0; p.targetTiltY = 0;
        p.hoverTiltX = 0; p.hoverTiltY = 0;
        if (newSlot === 1) {
          // Démarrage immédiat : la vidéo joue dès le clic, pendant la transition
          try { p.videoEl.currentTime=0; } catch(e){}
          p.videoEl.muted = userControls.muted;
          if (!userControls.paused) {
            const pl = p.videoEl.play(); if (pl && pl.catch) pl.catch(() => {});
          }
        }
        // Snap du glyph play/pause à 0 sur le téléphone qui QUITTE le centre,
        // pour éviter qu'il "traîne" en fondu (effet double bouton perçu).
        if (oldSlot === 1) {
          p.glyphOpacity = 0;
          p.targetGlyphOpacity = 0;
          p.showPlay = false;
        }
        if (oldSlot === 1) setTimeout(() => {
          p.videoEl.pause();
          p.videoEl.muted = true;
          try { p.videoEl.currentTime=0; } catch(e){}
        }, baseDelay+200);
      });
      updateUI();
      const totalDur = TIMING.ARRIVING_DELAY + TIMING.MOTION + TIMING.WOBBLE;
      setTimeout(() => {
        isAnimating = false;
        podiumStageEl.classList.remove('is-cycling');
      }, totalDur);
    }

    prevBtn.addEventListener('click', () => cycle('next'));
    nextBtn.addEventListener('click', () => cycle('prev'));

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function pickPhoneAtEvent(e) {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX-rect.left)/rect.width)*2-1;
      ndc.y = -(((e.clientY-rect.top)/rect.height)*2-1);
      raycaster.setFromCamera(ndc, camera);
      for (const p of phoneInstances) { const hits = raycaster.intersectObject(p.wrapper, true); if (hits.length > 0) return p; }
      return null;
    }

    const HOVER_TILT = { maxX: 0.28, maxY: 0.32, reach: 0.18 };
    canvas.addEventListener('mousemove', (e) => {
      if (isAnimating) { phoneInstances.forEach((p) => { p.isHovered=false; p.targetTiltX=0; p.targetTiltY=0; }); return; }
      const hit = pickPhoneAtEvent(e);
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX-rect.left)/rect.width)*2-1;
      const ndcY = -(((e.clientY-rect.top)/rect.height)*2-1);
      phoneInstances.forEach((p) => {
        const isBg = (p.slotIndex !== 1);
        p.isHovered = (p === hit && isBg);
        if (p.isHovered) {
          const v = new THREE.Vector3(p.curX+SCENE_OFFSET_X, p.curY, p.curZ);
          v.project(camera);
          p.targetTiltY =  clamp((ndcX-v.x)/HOVER_TILT.reach,-1,1)*HOVER_TILT.maxY;
          p.targetTiltX = -clamp((ndcY-v.y)/HOVER_TILT.reach,-1,1)*HOVER_TILT.maxX;
        } else { p.targetTiltX=0; p.targetTiltY=0; }
      });
      userControls.hoveringCenter = !!(hit && hit.slotIndex === 1);
      canvas.style.cursor = hit ? 'pointer' : 'default';
    });
    canvas.addEventListener('mouseleave', () => {
      phoneInstances.forEach((p) => { p.isHovered=false; p.targetTiltX=0; p.targetTiltY=0; });
      userControls.hoveringCenter = false;
      canvas.style.cursor = 'default';
    });
    canvas.addEventListener('click', (e) => {
      if (isAnimating) return;
      const hit = pickPhoneAtEvent(e);
      if (!hit) return;
      if (hit.slotIndex === 1) {
        // Toggle play/pause : aucun feedback de scale, le téléphone reste immobile
        toggleCenterPlayPause();
        return;
      }
      // Téléphones latéraux : on garde le press feedback + cycle
      hit.pressScale = 0.96;
      setTimeout(() => { hit.pressScale = 1.0; }, 130);
      if (hit.slotIndex === 0) cycle('prev');
      else if (hit.slotIndex === 2) cycle('next');
    });

    const tryPlayAll = () => {
      if (userControls.paused) return;
      const c=getCenterPhone();
      if(c){const p=c.videoEl.play();if(p&&p.catch)p.catch(()=>{});}
    };
    document.addEventListener('click', tryPlayAll, { once: true });
    document.addEventListener('touchstart', tryPlayAll, { once: true, passive: true });

    const lerp = (a, b, t) => a + (b-a)*t;
    const startTime = performance.now();
    let prevTime = startTime;

    /* Limite le rendu WebGL à ~30 fps (au lieu de 60). Les animations du
       podium sont volontairement lentes (wobble 700ms, slide 1800ms) et
       restent visuellement fluides à 30 fps. Économise ~50% du travail GPU
       constant tant que le hero est visible — gros gain sur la fluidité du
       scroll de la page (le compositor a plus de marge pour repeindre le
       reste). Le delta-time (dt) reste correct car basé sur performance.now(). */
    const TARGET_FRAME_INTERVAL = 1000 / 30;
    let lastRenderTime = 0;

    function tick() {
      const now = performance.now();
      if (now - lastRenderTime < TARGET_FRAME_INTERVAL - 0.5) {
        if (_rafRunning) requestAnimationFrame(tick);
        return;
      }
      lastRenderTime = now;
      const elapsed = (now - startTime) / 1000;
      const dt = Math.max(0.001, (now - prevTime) / 1000);
      prevTime = now;

      phoneInstances.forEach((p) => {
        if (p.anim) {
          const a = p.anim;
          if (now >= a.startTime) {
            const t = clamp((now-a.startTime)/a.duration, 0, 1);
            const k = easeInOutSine(t);
            const pos = bezier3D(k, a.bezier.P0, a.bezier.P1, a.bezier.P2, a.bezier.P3);
            p.curX=pos.x; p.curY=pos.y; p.curZ=pos.z;
            const kScale = 1 - Math.pow(1-t, 3);
            p.curScale = a.fromScale + (a.toScale-a.fromScale)*kScale;
            p.curRotY  = a.fromRotY + (a.toRotY-a.fromRotY)*k;
            if (t >= 1 && !a.arrived) { a.arrived=true; if(a.role==='arriving-center')p.wobble={startTime:now}; p.anim=null; }
          }
        }
        const newVelX=(p.curX-p.prevX)/dt, newVelY=(p.curY-p.prevY)/dt;
        p.velX=lerp(p.velX,newVelX,BANK.smoothing); p.velY=lerp(p.velY,newVelY,BANK.smoothing);
        p.prevX=p.curX; p.prevY=p.curY; p.prevZ=p.curZ;
        const isAnim=!!p.anim;
        const targetBankX=isAnim?clamp(-p.velY*BANK.velocityScale,-BANK.maxX,BANK.maxX):0;
        const targetBankZ=isAnim?clamp(-p.velX*BANK.velocityScale,-BANK.maxZ,BANK.maxZ):0;
        const bankLerp=isAnim?0.15:0.06;
        p.curBankX=lerp(p.curBankX,targetBankX,bankLerp); p.curBankZ=lerp(p.curBankZ,targetBankZ,bankLerp);
        let wobbleY=0;
        if(p.wobble){const wt=(now-p.wobble.startTime)/1000;if(wt<TIMING.WOBBLE/1000){wobbleY=WOBBLE.amplitude*Math.sin(wt*WOBBLE.frequency*Math.PI*2)*Math.exp(-wt*WOBBLE.decay);}else{p.wobble=null;}}
        const breathPeriod=(p.slotIndex!==1)?BREATH.period*2:BREATH.period;
        const breathY=BREATH.amplitude*Math.sin((elapsed+p.breathPhase)*(Math.PI*2/breathPeriod));
        const targetHover=(p.anim||p.isHovered===false)?1.0:(p.isHovered?1.06:1.0);
        p.hoverScale=lerp(p.hoverScale,targetHover,0.18);
        p.pressScale=lerp(p.pressScale,p.pressScale<1?p.pressScale:1.0,0.25);
        let transitionLeanY=0;
        if(p.anim){const a=p.anim,t=clamp((now-a.startTime)/a.duration,0,1),peak=0.35;const skew=t<peak?Math.sin((t/peak)*Math.PI*0.5):Math.cos(((t-peak)/(1-peak))*Math.PI*0.5);transitionLeanY=Math.sign(a.bezier.P3.x-a.bezier.P0.x)*0.22*skew;p.residualLeanY=transitionLeanY;}
        else{p.residualLeanY=lerp(p.residualLeanY,0,0.08);transitionLeanY=p.residualLeanY;}
        let swingRotY=0,swingRotX=0;
        const isBackground=!p.anim&&p.slotIndex!==1;
        if(isBackground){p.swingFade=lerp(p.swingFade,1,0.025);}
        const tiltLerp=0.08,tiltGate=isBackground?p.swingFade:0;
        p.hoverTiltX=lerp(p.hoverTiltX,p.targetTiltX*tiltGate,tiltLerp);
        p.hoverTiltY=lerp(p.hoverTiltY,p.targetTiltY*tiltGate,tiltLerp);
        const tiltMag=Math.min(1,Math.hypot(p.hoverTiltX,p.hoverTiltY)/0.3);
        swingRotX*=(1-tiltMag*0.8); swingRotY*=(1-tiltMag*0.8);
        const finalY=p.curY+wobbleY+breathY;
        p.wrapper.position.set(p.curX+SCENE_OFFSET_X, finalY, p.curZ);
        p.wrapper.scale.setScalar(scaleBase*p.curScale*p.hoverScale*p.pressScale);
        p.wrapper.rotation.set(p.curBankX+swingRotX+p.hoverTiltX, p.curRotY+swingRotY+transitionLeanY+p.hoverTiltY, p.curBankZ);
        if(p.shadow){
          const elev=Math.max(0,finalY-SHADOW_GROUND_Y),elevNorm=clamp(elev/0.5,0,1);
          const shadowScale=(0.85+elevNorm*0.35)*p.curScale,shadowOpacity=(0.55-elevNorm*0.30)*p.curScale;
          p.shadow.position.set(p.curX+SCENE_OFFSET_X-0.131, SHADOW_GROUND_Y, p.curZ+0.01);
          p.shadow.scale.set(shadowScale,shadowScale,1);
          p.shadow.material.opacity=Math.max(0,shadowOpacity);
          const targetCol=(p.slotIndex===1)?(BRAND_SHADOW_COLORS[p.brand]||SHADOW_BLACK):SHADOW_BLACK;
          p.shadow.material.color.lerp(targetCol,SHADOW_COLOR_LERP);
        }

        // ─── Glyph play/pause dans la texture (centre uniquement) ───
        const isCenter = (p.slotIndex === 1) && !p.anim;
        if (isCenter) {
          // mode = pause si l'user a mis pause OU vidéo en pause, sinon play
          p.glyphMode = userControls.paused ? 'play' : 'pause';
          let visible;
          if (bigScreenGlyphMQ.matches) {
            // >1800px : visible à l'arrêt ; en lecture, encore 2s après le
            // démarrage puis caché — aucun reveal au survol.
            visible = userControls.paused ||
                      (performance.now() - glyphPlayStartedAt < 2000);
          } else {
            // ≤1800px : visible à l'arrêt, ou au survol du téléphone central.
            visible = userControls.paused || userControls.hoveringCenter;
          }
          p.targetGlyphOpacity = visible ? 0.95 : 0;
        } else {
          p.targetGlyphOpacity = 0;
        }
        p.glyphOpacity = lerp(p.glyphOpacity, p.targetGlyphOpacity, 0.18);
        p.showPlay = p.glyphOpacity > 0.01;

        /* Bascule poster-image ↔ canvas-vidéo selon que la vidéo a une frame.
           Tant qu'aucune frame (Safari, vidéo en pause) → on garde la texture
           poster-image (fiable). Dès qu'une frame existe → canvas vidéo+glyph. */
        if (p.screenMat) {
          const vEl = p.videoEl;
          const videoHasFrame = !!(vEl && vEl.videoWidth && vEl.videoHeight && vEl.readyState >= 2);
          if (videoHasFrame) {
            if (!p.useVideoTex) { p.useVideoTex = true; }
            if (p.screenMat.map !== p.screenTex) { p.screenMat.map = p.screenTex; p.screenMat.needsUpdate = true; }
          } else {
            p.useVideoTex = false;
            if (p.posterTex && p.screenMat.map !== p.posterTex) { p.screenMat.map = p.posterTex; p.screenMat.needsUpdate = true; }
          }
        }

        // Le canvas (vidéo + glyph ▶) n'est rendu que lorsqu'on l'affiche.
        if (p.useVideoTex && p.screenTex && p.screenTex._render) p.screenTex._render();
      });

      renderer.render(scene, camera);
      if (!_canvasReady) { _canvasReady = true; canvas.classList.add('is-canvas-ready'); }
      if (_rafRunning) requestAnimationFrame(tick);
    }
    let _canvasReady = false;
    let _rafRunning = true;
    tick();

    /* Pause de la boucle WebGL + des 3 vidéos textures quand le hero sort du
       viewport. Reprise instantanée dès qu'il redevient visible. Aucun impact
       visuel (loop muet) ; économise GPU/CPU pendant le scroll du reste de la
       page sur tous formats (desktop + mobile + tablette).
       Sur retour : on ne reprend que la vidéo du téléphone CENTER (les LEFT/
       RIGHT restent en pause, conforme à initVideoStates), et uniquement si
       l'utilisateur n'a pas mis pause manuellement (userControls.paused). */
    (function () {
      const stage = document.querySelector('.podium-stage');
      if (!stage || !('IntersectionObserver' in window)) return;
      const texVids = [
        document.getElementById('video-minions'),
        document.getElementById('video-playstation'),
        document.getElementById('video-mercredi'),
      ].filter(Boolean);
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!_rafRunning) { _rafRunning = true; tick(); }
            const c = (typeof getCenterPhone === 'function') ? getCenterPhone() : null;
            if (c && c.videoEl && !userControls.paused) {
              const pl = c.videoEl.play(); if (pl && pl.catch) pl.catch(() => {});
            }
          } else {
            _rafRunning = false;
            texVids.forEach((v) => { try { v.pause(); } catch(e){} });
          }
        });
      }, { threshold: 0, rootMargin: '200px 0px 200px 0px' });
      io.observe(stage);
    })();
