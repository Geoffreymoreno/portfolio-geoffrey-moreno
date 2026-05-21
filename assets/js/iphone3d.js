/* ════════════════════════════════════════════════════════════════════
   iphone3d.js — Composant réutilisable iPhone 16 Pro 3D + vidéo écran

   USAGE (HTML) :
   ─────────────
     <div class="iphone3d"
          data-iphone3d
          data-video="assets/hero-section/playstation.mp4"
          data-model="assets/3d-assets/iphone_16_pro_desert_titanium.draco.glb">
     </div>

   Le script génère automatiquement le canvas + la vidéo cachée à
   l'intérieur de chaque div ayant l'attribut [data-iphone3d].

   COMPORTEMENT :
   ──────────────
   • Lazy load via IntersectionObserver : Three.js et le .glb ne se
     téléchargent QUE quand le composant entre dans le viewport.
   • Render pause auto : quand le composant sort du viewport OU que
     l'onglet passe en arrière-plan, la boucle de rendu s'arrête.
   • Fallback mobile : sous 768 px ou pointer:coarse, le composant ne
     s'initialise pas (le contenu fallback du div reste visible).

   DÉPENDANCES (chargées dynamiquement depuis CDN, à l'init seulement) :
     three.js@0.160 (module ESM)
     GLTFLoader, DRACOLoader (addons three.js)
   ════════════════════════════════════════════════════════════════════ */

(() => {
  const SCREEN_MATERIAL_NAME = 'xRigXiQTgpqkIah_001'; // identifié dans le GLB Polyman
  const THREE_VERSION = '0.160.0';
  const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

  // Détection mobile / pointer coarse → on n'initialise pas le 3D
  const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  if (isMobile) return;

  const containers = document.querySelectorAll('[data-iphone3d]');
  if (!containers.length) return;

  // Charge Three.js une seule fois et partage entre instances
  let threePromise = null;
  function loadThree() {
    if (threePromise) return threePromise;
    threePromise = (async () => {
      const base = `https://unpkg.com/three@${THREE_VERSION}`;
      const [THREE, GLTFLoaderMod, DRACOLoaderMod] = await Promise.all([
        import(`${base}/build/three.module.js`),
        import(`${base}/examples/jsm/loaders/GLTFLoader.js`),
        import(`${base}/examples/jsm/loaders/DRACOLoader.js`),
      ]);
      return {
        THREE,
        GLTFLoader: GLTFLoaderMod.GLTFLoader,
        DRACOLoader: DRACOLoaderMod.DRACOLoader,
      };
    })();
    return threePromise;
  }

  // Initialise une instance pour un container donné
  async function initInstance(container) {
    if (container.dataset.iphone3dReady === '1') return;
    container.dataset.iphone3dReady = '1';

    const modelUrl = container.dataset.model
      || 'assets/3d-assets/iphone_16_pro_desert_titanium.draco.glb';
    const videoUrl = container.dataset.video
      || 'assets/hero-section/playstation.mp4';

    // Crée canvas + video si pas déjà présents
    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:100%;display:block;';
      container.appendChild(canvas);
    }

    let videoEl = container.querySelector('video');
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.src = videoUrl;
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
      container.appendChild(videoEl);
    }

    const { THREE, GLTFLoader, DRACOLoader } = await loadThree();

    // ── Scene ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    camera.position.set(0, 0, 1.4);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
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

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 3, 2.5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xfff1e0, 0.8);
    fillLight.position.set(-2.5, 0.5, 1.5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xb8d4ff, 0.7);
    rimLight.position.set(0, -1, -2);
    scene.add(rimLight);

    // Reflets titane via PMREM léger
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xf0e8dd);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;

    const phoneGroup = new THREE.Group();
    scene.add(phoneGroup);

    // ── Video texture ──
    const videoTexture = new THREE.VideoTexture(videoEl);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.flipY = false;
    videoTexture.wrapS = THREE.ClampToEdgeWrapping;
    videoTexture.wrapT = THREE.ClampToEdgeWrapping;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;

    // Autoplay : tente immédiatement, retente sur première interaction
    const tryPlayVideo = () => {
      const p = videoEl.play();
      if (p && p.catch) p.catch(() => {});
    };
    tryPlayVideo();
    document.addEventListener('click', tryPlayVideo, { once: true });
    document.addEventListener('touchstart', tryPlayVideo, { once: true, passive: true });

    // ── Loader GLB + Draco ──
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Génère des UVs par projection planaire (le GLB Polyman a des UVs invalides)
    function generatePlanarUVs(mesh) {
      const geom = mesh.geometry;
      const pos = geom.attributes.position;
      const count = pos.count;
      let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity, minZ=Infinity, maxZ=-Infinity;
      for (let i = 0; i < count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (x<minX)minX=x; if (x>maxX)maxX=x;
        if (y<minY)minY=y; if (y>maxY)maxY=y;
        if (z<minZ)minZ=z; if (z>maxZ)maxZ=z;
      }
      const ranges = { x: maxX-minX, y: maxY-minY, z: maxZ-minZ };
      const sortedAxes = Object.entries(ranges).sort((a,b) => a[1]-b[1]);
      const uAxis = sortedAxes[1][0];
      const vAxis = sortedAxes[2][0];
      const uMin = uAxis === 'x' ? minX : uAxis === 'y' ? minY : minZ;
      const uMax = uAxis === 'x' ? maxX : uAxis === 'y' ? maxY : maxZ;
      const vMin = vAxis === 'x' ? minX : vAxis === 'y' ? minY : minZ;
      const vMax = vAxis === 'x' ? maxX : vAxis === 'y' ? maxY : maxZ;
      const get = { x: 'getX', y: 'getY', z: 'getZ' };
      const uvs = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        uvs[i*2]   = (pos[get[uAxis]](i) - uMin) / (uMax - uMin);
        uvs[i*2+1] = 1 - (pos[get[vAxis]](i) - vMin) / (vMax - vMin);
      }
      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }

    loader.load(modelUrl, (gltf) => {
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(root);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 0.55 / maxDim;
      wrapper.scale.setScalar(scale);
      wrapper.rotation.y = Math.PI;

      root.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((mat) => {
            if (mat.name === SCREEN_MATERIAL_NAME) {
              generatePlanarUVs(obj);
              obj.material = new THREE.MeshBasicMaterial({
                map: videoTexture,
                toneMapped: false,
              });
            }
          });
        }
      });

      phoneGroup.add(wrapper);
      container.classList.add('is-loaded');
    }, undefined, (err) => {
      console.error('[iphone3d] model load error', err);
      container.classList.add('is-error');
    });

    // ── Tilt souris (limité au container) ──
    let targetRy = 0, targetRx = 0;
    let curRy = 0, curRx = 0;
    let hasInteracted = false;
    let idleTime = 0;
    const lerp = (a, b, t) => a + (b - a) * t;

    container.addEventListener('mousemove', (e) => {
      hasInteracted = true;
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const maxDist = Math.min(window.innerWidth, window.innerHeight) * 0.45;
      const maxTilt = 0.45;
      targetRy = THREE.MathUtils.clamp((dx / maxDist) * maxTilt, -maxTilt, maxTilt);
      targetRx = THREE.MathUtils.clamp(-(dy / maxDist) * maxTilt, -maxTilt, maxTilt);
    });
    container.addEventListener('mouseleave', () => {
      targetRx = 0;
      targetRy = 0;
    });

    // ── Render loop avec pause hors viewport / onglet caché ──
    let isVisible = true;
    let isTabVisible = !document.hidden;
    let rafId = null;

    const clock = new THREE.Clock();
    function tick() {
      const dt = clock.getDelta();
      if (!hasInteracted) {
        idleTime += dt;
        targetRy = Math.sin(idleTime * 0.6) * 0.25;
        targetRx = Math.cos(idleTime * 0.5) * 0.12;
      }
      curRy = lerp(curRy, targetRy, 0.08);
      curRx = lerp(curRx, targetRx, 0.08);
      phoneGroup.rotation.y = curRy;
      phoneGroup.rotation.x = curRx;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }
    function startLoop() {
      if (rafId === null && isVisible && isTabVisible) {
        clock.getDelta(); // reset delta
        tick();
      }
    }
    function stopLoop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    // Pause si le composant sort du viewport
    const visObs = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible) startLoop(); else stopLoop();
    }, { threshold: 0.05 });
    visObs.observe(container);

    // Pause si l'onglet passe en arrière-plan
    document.addEventListener('visibilitychange', () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) startLoop(); else stopLoop();
    });

    startLoop();
  }

  // Lazy init via IntersectionObserver — on ne charge Three.js et le .glb
  // qu'au moment où le composant arrive dans le viewport.
  const lazyObs = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        obs.unobserve(entry.target);
        initInstance(entry.target);
      }
    });
  }, { rootMargin: '200px' }); // pré-charge 200px avant d'arriver à l'écran

  containers.forEach((c) => lazyObs.observe(c));
})();
