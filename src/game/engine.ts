import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import { createDragonHero, DragonRig } from './models';
import { buildRealm } from './realms';
import { createTextureLibrary, ProceduralTextureLibrary } from './textures';
import {
  ARTIFACT_CATALOG,
  GameMode,
  HudSnapshot,
  PlatformBox,
  PortalEntity,
  REALM_META,
  RealmId,
  RealmInstance,
} from './types';

const SAVE_KEY = 'stjoseph_beacon_save_v1';
const TOTAL_GEMS = 60;

// Module-scope scratch math objects (zero GC allocations in tick loop)
const _moveDir = new THREE.Vector3();
const _camIdeal = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _tmpVec = new THREE.Vector3();
const _tmpVec2 = new THREE.Vector3();

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  active: boolean;
}

interface SaveData {
  artifacts: string[];
  gems: string[];
  braziers: string[];
  crates: string[];
  elapsedSeconds: number;
  realmId: RealmId;
}

export class StJosephGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: ProceduralTextureLibrary;
  private sound = new SoundEngine();

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private dragon: DragonRig;
  private realm: RealmInstance | null = null;
  private realmId: RealmId = 'downtown';

  // Simulation state
  private mode: GameMode = 'title';
  private playerPos = new THREE.Vector3(0, 1.5, 23);
  private playerVel = new THREE.Vector3();
  private playerYaw = Math.PI;
  private lastSafePos = new THREE.Vector3(0, 1.5, 23);
  private grounded = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private isGliding = false;
  private isCharging = false;
  private flameTimer = 0;
  private invulnTimer = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private squashY = 1;
  private standingPlatform: PlatformBox | null = null;

  private health = 3;
  private readonly maxHealth = 3;
  private elapsedSeconds = 0;
  private simTime = 0;
  private titleOrbitAngle = 0;

  // Camera state
  private camYaw = 0;
  private camPitch = 0.34;
  private isPointerDragging = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerDraggedDist = 0;

  // Portal warp transition state
  private warpTimer = 0;
  private warpTargetRealm: RealmId = 'downtown';
  private warpTargetSpawn: [number, number, number] = [0, 1.5, 23];
  private warpSwapped = false;
  private portalCooldown = 0;

  // Persistent progression sets
  private collectedArtifactIds = new Set<string>();
  private collectedGemIds = new Set<string>();
  private litBrazierIds = new Set<string>();
  private brokenCrateIds = new Set<string>();
  private victoryTriggered = false;

  // Input state (continuous held vs edge-triggered)
  private heldKeys = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualGlide = false;
  private virtualCharge = false;

  // Pooled particle system
  private particles: Particle[] = [];
  private particleGroup = new THREE.Group();

  // Toast / HUD bridge
  private bannerToast: { title: string; subtitle: string; accentCss: string } | null = null;
  private bannerTimer = 0;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private hudEmitAccum = 0;

  // Loop management
  private frameId = 0;
  private lastFrameMs = 0;
  private disposed = false;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    // 1. Detect Software WebGL from GPU renderer string (never UA)
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Modern Three.js WebGLRenderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Procedural Studio Environment Reflections (PMREM RoomEnvironment)
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Camera
    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.2, 420);

    // 5. Three-Point Lake Michigan Golden-Hour Lighting Rig (<= 1 shadow caster)
    this.hemiLight = new THREE.HemisphereLight(0x8ecae6, 0x6c584c, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffe1b5, 1.95);
    this.keyLight.position.set(36, 54, 28);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 5;
    this.keyLight.shadow.camera.far = 160;
    const d = 54;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x7cc6fe, 0.55);
    this.rimLight.position.set(-42, 24, -36);
    this.scene.add(this.rimLight);

    // 6. Procedural PBR Textures & Dragon Hero
    this.textures = createTextureLibrary(this.renderer.capabilities.getMaxAnisotropy());
    this.dragon = createDragonHero(this.textures.contactShadow);
    this.scene.add(this.dragon.root);

    // 7. Pre-allocate Pooled Particles
    this.initParticlePool();
    this.scene.add(this.particleGroup);

    // 8. Load saved progress & build Downtown St. Joseph Hub
    this.loadProgress();
    this.loadRealm('downtown');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 9. Attach event listeners
    this.bindEvents();
    this.emitHud();

    // 10. Start simulation loop
    this.lastFrameMs = performance.now();
    this.tick();
  }

  private initParticlePool(): void {
    const geo = new THREE.OctahedronGeometry(0.18, 0);
    for (let i = 0; i < 96; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        gravity: 14,
        active: false,
      });
    }
  }

  private spawnParticles(
    origin: THREE.Vector3,
    colorHex: number,
    count: number,
    speed: number,
    gravity = 14,
    scale = 1
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.38;
      p.gravity = gravity;
      p.mesh.visible = true;
      p.mesh.position.copy(origin);
      p.mesh.scale.setScalar(scale * (0.7 + Math.random() * 0.6));
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(colorHex);
      mat.opacity = 1;
      const theta = Math.random() * Math.PI * 2;
      const up = 0.35 + Math.random() * 0.85;
      p.vel.set(Math.cos(theta) * speed, up * speed, Math.sin(theta) * speed);
      spawned++;
    }
  }

  private loadProgress(): void {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<SaveData>;
      if (Array.isArray(data.artifacts)) {
        data.artifacts.forEach((id) => this.collectedArtifactIds.add(id));
      }
      if (Array.isArray(data.gems)) {
        data.gems.forEach((id) => this.collectedGemIds.add(id));
      }
      if (Array.isArray(data.braziers)) {
        data.braziers.forEach((id) => this.litBrazierIds.add(id));
      }
      if (Array.isArray(data.crates)) {
        data.crates.forEach((id) => this.brokenCrateIds.add(id));
      }
      if (typeof data.elapsedSeconds === 'number') {
        this.elapsedSeconds = data.elapsedSeconds;
      }
      this.victoryTriggered = this.collectedArtifactIds.size >= ARTIFACT_CATALOG.length;
    } catch {
      // ignore storage errors
    }
  }

  private saveProgress(): void {
    try {
      const payload: SaveData = {
        artifacts: Array.from(this.collectedArtifactIds),
        gems: Array.from(this.collectedGemIds),
        braziers: Array.from(this.litBrazierIds),
        crates: Array.from(this.brokenCrateIds),
        elapsedSeconds: this.elapsedSeconds,
        realmId: this.realmId,
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }

  private loadRealm(id: RealmId, customSpawn?: [number, number, number]): void {
    if (this.realm) {
      this.scene.remove(this.realm.root);
      for (const d of this.realm.disposables) {
        d.dispose();
      }
    }

    this.realmId = id;
    const meta = REALM_META[id];
    this.scene.background = new THREE.Color(meta.fogColor);
    this.scene.fog = new THREE.FogExp2(meta.fogColor, meta.fogDensity);

    this.realm = buildRealm(id, {
      textures: this.textures,
      collectedArtifactIds: this.collectedArtifactIds,
      collectedGemIds: this.collectedGemIds,
      litBrazierIds: this.litBrazierIds,
      brokenCrateIds: this.brokenCrateIds,
    });
    this.scene.add(this.realm.root);

    if (customSpawn) {
      this.playerPos.set(customSpawn[0], customSpawn[1], customSpawn[2]);
    } else {
      this.playerPos.copy(this.realm.spawn);
    }
    this.lastSafePos.copy(this.playerPos);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = this.realm.spawnYaw;
    this.camYaw = this.playerYaw + Math.PI;
    this.standingPlatform = null;
    this.grounded = false;
    this.portalCooldown = 1.6;

    this.dragon.root.position.copy(this.playerPos);
    this.dragon.root.rotation.y = this.playerYaw;
    this.updateBeaconVisuals();
    this.emitHud();
  }

  private updateBeaconVisuals(): void {
    if (!this.realm) return;
    const ratio = this.collectedArtifactIds.size / ARTIFACT_CATALOG.length;
    if (this.realm.lanternGlowMesh) {
      const mat = this.realm.lanternGlowMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + ratio * 2.8;
    }
    if (this.realm.beaconSlots) {
      this.realm.beaconSlots.forEach((orb, idx) => {
        const art = ARTIFACT_CATALOG[idx];
        const mat = orb.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = this.collectedArtifactIds.has(art.id) ? 2.1 : 0.08;
      });
    }
  }

  // --- Public UI Controls ---

  public startGame(): void {
    if (this.mode === 'title' || this.mode === 'paused' || this.mode === 'victory') {
      this.mode = 'playing';
      this.heldKeys.clear();
      this.emitHud();
    }
  }

  public pauseGame(): void {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.heldKeys.clear();
      this.emitHud();
    }
  }

  public resumeGame(): void {
    if (this.mode === 'paused') {
      this.mode = 'playing';
      this.heldKeys.clear();
      this.emitHud();
    }
  }

  public warpToDowntown(): void {
    if (this.mode === 'paused' || this.mode === 'victory') {
      this.mode = 'playing';
    }
    if (this.realmId !== 'downtown') {
      this.beginPortalWarp('downtown', [0, 1.5, 22]);
    } else {
      this.playerPos.set(0, 1.5, 22);
      this.playerVel.set(0, 0, 0);
      this.emitHud();
    }
  }

  public resetJourney(): void {
    this.collectedArtifactIds.clear();
    this.collectedGemIds.clear();
    this.litBrazierIds.clear();
    this.brokenCrateIds.clear();
    this.elapsedSeconds = 0;
    this.health = this.maxHealth;
    this.victoryTriggered = false;
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    this.loadRealm('downtown');
    this.mode = 'playing';
    this.showBanner('St. Joseph Harbor', 'Find all 6 lost lighthouse artifacts through the city portals', '#ffd166');
    this.emitHud();
  }

  public toggleMute(): boolean {
    const m = this.sound.toggleMute();
    this.emitHud();
    return m;
  }

  // Touch / virtual controls
  public setVirtualMove(x: number, y: number): void {
    this.virtualMoveX = x;
    this.virtualMoveY = y;
  }

  public triggerJump(): void {
    if (this.mode !== 'playing') return;
    this.jumpBufferTimer = 0.14;
    if (!this.grounded && this.playerVel.y < 2) {
      if (!this.isGliding) {
        this.isGliding = true;
        this.sound.playGlideStart();
      }
    }
  }

  public setVirtualGlide(held: boolean): void {
    this.virtualGlide = held;
  }

  public setVirtualCharge(held: boolean): void {
    if (held && !this.virtualCharge && this.mode === 'playing') {
      this.sound.playChargeDash();
    }
    this.virtualCharge = held;
  }

  public triggerFlame(): void {
    if (this.mode !== 'playing') return;
    if (this.flameTimer <= 0.05) {
      this.flameTimer = 0.34;
      this.sound.playFlame();
    }
  }

  private showBanner(title: string, subtitle: string, accentCss = '#ffd166'): void {
    this.bannerToast = { title, subtitle, accentCss };
    this.bannerTimer = 3.8;
    this.emitHud();
  }

  // --- Event Binding ---

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (this.mode === 'playing') this.pauseGame();
      else if (this.mode === 'paused') this.resumeGame();
      return;
    }

    if (this.mode === 'title' && (code === 'Enter' || code === 'Space')) {
      this.startGame();
      return;
    }

    if (this.mode !== 'playing') return;

    const wasHeld = this.heldKeys.has(code);
    this.heldKeys.add(code);

    if (!wasHeld) {
      if (code === 'Space') {
        this.jumpBufferTimer = 0.14;
        if (!this.grounded && this.playerVel.y < 3.0) {
          this.isGliding = true;
          this.sound.playGlideStart();
        }
      }
      if (code === 'KeyE') {
        this.triggerFlame();
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyF') {
        this.sound.playChargeDash();
      }
      if (code === 'KeyM') {
        this.toggleMute();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
    if (e.code === 'Space') {
      this.isGliding = false;
    }
  };

  private onWindowBlur = (): void => {
    this.heldKeys.clear();
    this.isGliding = false;
    this.isCharging = false;
    this.isPointerDragging = false;
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.mode !== 'playing') return;
    if (e.target !== this.renderer.domElement) return;
    this.isPointerDragging = true;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
    this.pointerDraggedDist = 0;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isPointerDragging || this.mode !== 'playing') return;
    const dx = e.clientX - this.pointerDownX;
    const dy = e.clientY - this.pointerDownY;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
    this.pointerDraggedDist += Math.hypot(dx, dy);
    this.camYaw -= dx * 0.0062;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0042, 0.12, 0.92);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.isPointerDragging && this.pointerDraggedDist < 8 && e.button === 0 && this.mode === 'playing') {
      this.triggerFlame();
    }
    this.isPointerDragging = false;
  };

  private onResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
  }

  // --- Main Render & Simulation Loop ---

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastFrameMs) / 1000;
    this.lastFrameMs = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.simTime += dt;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerToast = null;
        this.emitHud();
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
    } else {
      this.updateScene(dt);
    }

    this.renderer.render(this.scene, this.camera);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.08) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private updateScene(dt: number): void {
    if (!this.realm) return;

    // Always animate water, portals, carousel, lighthouse beams, and particles
    for (const anim of this.realm.animatedProps) {
      anim.update(this.simTime, dt);
    }
    for (const portal of this.realm.portals) {
      portal.vortexMat.uniforms.uTime.value = this.simTime;
      portal.ringMesh.rotation.z = this.simTime * 0.7;
    }
    if (this.realm.beaconBeam) {
      const speed = this.collectedArtifactIds.size >= ARTIFACT_CATALOG.length ? 1.25 : 0.35;
      this.realm.beaconBeam.rotation.y += dt * speed;
      const ratio = this.collectedArtifactIds.size / ARTIFACT_CATALOG.length;
      this.realm.beaconBeam.visible = ratio > 0 || this.realmId === 'north_pier';
      this.realm.beaconBeam.scale.setScalar(0.45 + ratio * 0.9);
    }

    this.updateMovingPlatforms(dt);
    this.updateParticles(dt);

    if (this.mode === 'title') {
      this.updateTitleCamera(dt);
      this.animateDragonIdle(dt);
      return;
    }

    if (this.mode === 'paused') {
      return;
    }

    if (this.mode === 'warping') {
      this.updatePortalWarp(dt);
      return;
    }

    if (this.mode === 'playing' || this.mode === 'victory') {
      if (this.mode === 'playing') {
        this.elapsedSeconds += dt;
      }
      this.updatePlayer(dt);
      this.updateCollectiblesAndInteractions(dt);
      this.updateHazards(dt);
      this.updateChaseCamera(dt);
    }
  }

  private updateTitleCamera(dt: number): void {
    this.titleOrbitAngle += dt * 0.16;
    const radius = 34;
    this.camera.position.set(
      Math.sin(this.titleOrbitAngle) * radius - 4,
      15.5 + Math.sin(this.titleOrbitAngle * 0.7) * 2.2,
      Math.cos(this.titleOrbitAngle) * radius - 6
    );
    this.camera.lookAt(-6, 4.2, -14);
  }

  private animateDragonIdle(dt: number): void {
    this.dragon.root.position.copy(this.playerPos);
    this.dragon.leftWing.rotation.z = 0.25 + Math.sin(this.simTime * 3.2) * 0.14;
    this.dragon.rightWing.rotation.z = -0.25 - Math.sin(this.simTime * 3.2) * 0.14;
    this.dragon.tail.rotation.y = Math.sin(this.simTime * 2.8) * 0.18;
    this.updateFirefly(dt);
  }

  private updateMovingPlatforms(dt: number): void {
    if (!this.realm) return;
    for (const p of this.realm.platforms) {
      if (!p.moving) continue;
      const m = p.moving;
      m.prevX = m.mesh.position.x;
      m.prevY = m.mesh.position.y;
      m.prevZ = m.mesh.position.z;

      let nx = m.baseX;
      let ny = m.baseY;
      let nz = m.baseZ;
      if (m.mode === 'oscillateY') {
        ny = m.baseY + Math.sin(this.simTime * m.speed + m.phase) * m.amp;
      } else if (m.mode === 'oscillateX') {
        nx = m.baseX + Math.sin(this.simTime * m.speed + m.phase) * m.amp;
      } else if (m.mode === 'oscillateZ') {
        nz = m.baseZ + Math.sin(this.simTime * m.speed + m.phase) * m.amp;
      } else if (m.mode === 'orbit' && m.orbitCenterX !== undefined && m.orbitCenterZ !== undefined && m.orbitRadius !== undefined) {
        const a = this.simTime * m.speed + m.phase;
        nx = m.orbitCenterX + Math.cos(a) * m.orbitRadius;
        nz = m.orbitCenterZ + Math.sin(a) * m.orbitRadius;
        ny = m.baseY + Math.sin(a * 2) * 0.4;
      }

      m.mesh.position.set(nx, ny, nz);
      p.minX = nx - m.halfX;
      p.maxX = nx + m.halfX;
      p.minY = ny - m.halfY;
      p.maxY = ny + m.halfY;
      p.minZ = nz - m.halfZ;
      p.maxZ = nz + m.halfZ;

      if (this.standingPlatform === p && this.grounded) {
        this.playerPos.x += nx - m.prevX;
        this.playerPos.y += ny - m.prevY;
        this.playerPos.z += nz - m.prevZ;
      }
    }
    void dt;
  }

  private updatePlayer(dt: number): void {
    if (!this.realm) return;

    if (this.portalCooldown > 0) this.portalCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.flameTimer > 0) this.flameTimer -= dt;
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.6);
    }

    // Keyboard camera yaw rotate (Q / C)
    if (this.heldKeys.has('KeyQ')) this.camYaw += dt * 2.1;
    if (this.heldKeys.has('KeyC')) this.camYaw -= dt * 2.1;

    // Input axes (camera-relative)
    let inputX = this.virtualMoveX;
    let inputZ = this.virtualMoveY;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) inputX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) inputX += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) inputZ += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) inputZ -= 1;

    const inputLen = Math.hypot(inputX, inputZ);
    if (inputLen > 1) {
      inputX /= inputLen;
      inputZ /= inputLen;
    }

    const chargeHeld =
      this.heldKeys.has('ShiftLeft') ||
      this.heldKeys.has('ShiftRight') ||
      this.heldKeys.has('KeyF') ||
      this.virtualCharge;
    this.isCharging = chargeHeld && this.grounded;

    const camForwardX = -Math.sin(this.camYaw);
    const camForwardZ = -Math.cos(this.camYaw);
    const camRightX = Math.cos(this.camYaw);
    const camRightZ = -Math.sin(this.camYaw);

    _moveDir.set(
      camForwardX * inputZ + camRightX * inputX,
      0,
      camForwardZ * inputZ + camRightZ * inputX
    );

    const hasInput = _moveDir.lengthSq() > 0.002;
    if (hasInput) {
      _moveDir.normalize();
      const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, dt * 12.5);
    } else if (this.isCharging) {
      // Horn charge forward even without directional keys held
      _moveDir.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
    }

    const maxSpeed = this.isCharging ? 17.5 : this.isGliding ? 12.2 : 9.6;
    const accel = this.grounded ? 54 : 22;

    if (hasInput || this.isCharging) {
      const targetVx = _moveDir.x * maxSpeed;
      const targetVz = _moveDir.z * maxSpeed;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVx, accel * 0.25, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVz, accel * 0.25, dt);
    } else {
      const drag = this.grounded ? 14 : 3.2;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, drag, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, drag, dt);
    }

    // Coyote time & jump buffer
    if (this.grounded) {
      this.coyoteTimer = 0.13;
      this.isGliding = false;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      if (this.coyoteTimer > 0) {
        this.playerVel.y = 12.6;
        this.grounded = false;
        this.standingPlatform = null;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.squashY = 1.28;
        this.sound.playJump();
        this.spawnParticles(this.playerPos, 0xfef3c7, 6, 3.2, 8, 0.7);
      }
    }

    // Wing Glide maintenance (hold Space while descending)
    const spaceHeld = this.heldKeys.has('Space') || this.virtualGlide;
    if (!this.grounded && spaceHeld && this.playerVel.y < 0.6) {
      if (!this.isGliding) {
        this.isGliding = true;
        this.sound.playGlideStart();
      }
    } else if (!spaceHeld) {
      this.isGliding = false;
    }

    // Gravity (significantly softened during Wing Glide!)
    const gravity = this.isGliding ? 6.5 : 30.0;
    this.playerVel.y -= gravity * dt;
    if (this.isGliding && this.playerVel.y < -2.35) {
      this.playerVel.y = -2.35;
    }

    // Move & resolve AABB platform collisions
    const prevY = this.playerPos.y;
    const prevX = this.playerPos.x;
    const prevZ = this.playerPos.z;
    const r = 0.56;
    const h = 1.35;

    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;
    this.playerPos.y += this.playerVel.y * dt;

    let landed: PlatformBox | null = null;
    for (const p of this.realm.platforms) {
      const overlapX = this.playerPos.x + r > p.minX && this.playerPos.x - r < p.maxX;
      const overlapZ = this.playerPos.z + r > p.minZ && this.playerPos.z - r < p.maxZ;
      if (!overlapX || !overlapZ) continue;

      // Landing from above
      if (this.playerVel.y <= 0 && prevY >= p.maxY - 0.52 && this.playerPos.y <= p.maxY + 0.08) {
        this.playerPos.y = p.maxY;
        if (p.bouncy) {
          this.playerVel.y = p.bouncy;
          this.grounded = false;
          this.isGliding = false;
          this.squashY = 1.35;
          this.sound.playBounce();
          this.spawnParticles(this.playerPos, 0xffd166, 12, 5.2, 12, 0.9);
        } else {
          if (!this.grounded && this.playerVel.y < -6) {
            this.squashY = 0.76;
          }
          this.playerVel.y = 0;
          landed = p;
        }
        continue;
      }

      // Side collision push-out if clearly intersecting body height
      if (this.playerPos.y + h > p.minY + 0.25 && this.playerPos.y < p.maxY - 0.35) {
        const dxMin = Math.abs(prevX - p.minX);
        const dxMax = Math.abs(prevX - p.maxX);
        const dzMin = Math.abs(prevZ - p.minZ);
        const dzMax = Math.abs(prevZ - p.maxZ);
        const m = Math.min(dxMin, dxMax, dzMin, dzMax);
        if (m === dxMin) {
          this.playerPos.x = p.minX - r;
          this.playerVel.x = Math.min(0, this.playerVel.x);
        } else if (m === dxMax) {
          this.playerPos.x = p.maxX + r;
          this.playerVel.x = Math.max(0, this.playerVel.x);
        } else if (m === dzMin) {
          this.playerPos.z = p.minZ - r;
          this.playerVel.z = Math.min(0, this.playerVel.z);
        } else {
          this.playerPos.z = p.maxZ + r;
          this.playerVel.z = Math.max(0, this.playerVel.z);
        }
      }
    }

    this.grounded = landed !== null;
    this.standingPlatform = landed;
    if (this.grounded && landed && !landed.moving && !landed.bouncy) {
      this.lastSafePos.copy(this.playerPos);
      this.lastSafePos.y += 0.3;
    }

    // Water splash & safe respawn if Pip falls into Lake Michigan or St. Joseph River
    const waterY = REALM_META[this.realmId].waterY;
    if (this.playerPos.y < waterY - 0.2) {
      this.sound.playSplash();
      this.spawnParticles(this.playerPos, 0x90e0ef, 18, 6.2, 16, 1.1);
      this.playerPos.copy(this.lastSafePos);
      this.playerVel.set(0, 4.5, 0);
      this.isGliding = false;
      this.shakeIntensity = 0.25;
    }

    // Animate Pip's articulated body, wings, legs, squash-and-stretch, flame & charge aura
    this.squashY = THREE.MathUtils.damp(this.squashY, 1, 14, dt);
    const invSquash = 1 / Math.sqrt(this.squashY);

    this.dragon.root.position.copy(this.playerPos);
    this.dragon.root.rotation.y = this.playerYaw;
    this.dragon.body.scale.set(invSquash, this.squashY, invSquash);

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.isCharging) {
      this.dragon.head.rotation.x = 0.42;
      this.dragon.body.rotation.x = 0.14;
      this.dragon.chargeAura.visible = true;
      this.dragon.chargeAura.rotation.z += dt * 14;
      if (Math.random() < 0.4) {
        this.spawnParticles(this.playerPos, 0xffe8a3, 1, 2.2, 4, 0.55);
      }
    } else {
      this.dragon.head.rotation.x = THREE.MathUtils.damp(this.dragon.head.rotation.x, 0, 10, dt);
      this.dragon.body.rotation.x = THREE.MathUtils.damp(
        this.dragon.body.rotation.x,
        this.isGliding ? 0.2 : 0,
        10,
        dt
      );
      this.dragon.chargeAura.visible = false;
    }

    // Wings flapping / gliding pose
    if (this.isGliding) {
      const glideFlap = Math.sin(this.simTime * 11) * 0.22;
      this.dragon.leftWing.rotation.z = -0.15 + glideFlap;
      this.dragon.rightWing.rotation.z = 0.15 - glideFlap;
    } else if (!this.grounded) {
      const airFlap = Math.sin(this.simTime * 18) * 0.55;
      this.dragon.leftWing.rotation.z = 0.2 + airFlap;
      this.dragon.rightWing.rotation.z = -0.2 - airFlap;
    } else {
      const trotFlap = Math.sin(this.simTime * 8) * (0.08 + horizSpeed * 0.015);
      this.dragon.leftWing.rotation.z = 0.45 + trotFlap;
      this.dragon.rightWing.rotation.z = -0.45 - trotFlap;
    }

    // Leg gallop cycle
    const legSwing = this.grounded ? Math.sin(this.simTime * (horizSpeed * 1.4 + 2)) * Math.min(horizSpeed * 0.075, 0.72) : 0.35;
    this.dragon.legs[0].rotation.x = legSwing;
    this.dragon.legs[1].rotation.x = -legSwing;
    this.dragon.legs[2].rotation.x = -legSwing;
    this.dragon.legs[3].rotation.x = legSwing;
    this.dragon.tail.rotation.y = Math.sin(this.simTime * 6) * 0.22;

    // Flame breath cone visual + particles
    this.dragon.flameCone.visible = this.flameTimer > 0;
    if (this.flameTimer > 0) {
      this.dragon.flameCone.scale.setScalar(0.85 + Math.sin(this.simTime * 50) * 0.2);
      _tmpVec.set(Math.sin(this.playerYaw), 0.15, Math.cos(this.playerYaw)).multiplyScalar(1.8).add(this.playerPos);
      _tmpVec.y += 0.85;
      this.spawnParticles(_tmpVec, 0xff9f1c, 2, 4.5, -2, 0.75);
    }

    // Contact shadow height clamping
    this.dragon.shadowPlane.visible = this.grounded;

    // Invulnerability blink
    this.dragon.body.visible = this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 18) % 2 === 0;

    this.updateFirefly(dt);
  }

  private updateFirefly(dt: number): void {
    const a = this.simTime * 2.8;
    this.dragon.firefly.position.set(
      Math.cos(a) * 0.95,
      1.35 + Math.sin(this.simTime * 5.2) * 0.18,
      Math.sin(a) * 0.95
    );
    // Color signals health (Gold = 3, Sky Blue = 2, Mint Green = 1)
    const hex = this.health >= 3 ? 0xffd166 : this.health === 2 ? 0x38bdf8 : 0x34d399;
    this.dragon.fireflyMat.color.setHex(hex);
    this.dragon.fireflyMat.emissive.setHex(hex);
    this.dragon.fireflyLight.color.setHex(hex);
    void dt;
  }

  private updateCollectiblesAndInteractions(dt: number): void {
    if (!this.realm) return;

    // Flame tip world position for flame hit checks
    const flameActive = this.flameTimer > 0;
    _tmpVec2.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).multiplyScalar(2.4).add(this.playerPos);
    _tmpVec2.y += 0.75;

    // 1. Lake Glass Gems (Spyro magnetic pull!)
    for (const gem of this.realm.gems) {
      if (gem.collected) continue;
      gem.mesh.rotation.y += dt * 2.4;
      const dist = gem.position.distanceTo(this.playerPos);
      if (dist < 4.2) {
        gem.magnetized = true;
      }
      if (gem.magnetized) {
        _tmpVec.copy(this.playerPos);
        _tmpVec.y += 0.75;
        gem.position.lerp(_tmpVec, Math.min(1, dt * 11));
        gem.mesh.position.copy(gem.position);
      } else {
        gem.mesh.position.y = gem.baseY + Math.sin(this.simTime * 3.2 + gem.phase) * 0.22;
      }

      if (gem.position.distanceTo(this.playerPos) < 1.35) {
        gem.collected = true;
        gem.mesh.visible = false;
        this.collectedGemIds.add(gem.id);
        this.sound.playGemCollect();
        this.spawnParticles(gem.position, 0xffe066, 10, 4.6, 10, 0.75);
        this.saveProgress();
      }
    }

    // 2. Breakable Crates & Armored Gem Chests
    for (const crate of this.realm.crates) {
      if (crate.broken) continue;
      const dPlayer = crate.position.distanceTo(this.playerPos);
      const dFlame = flameActive ? crate.position.distanceTo(_tmpVec2) : 999;
      const hitByCharge = this.isCharging && dPlayer < 1.85;
      const hitByFlame = dFlame < 2.25;

      if ((hitByCharge && !crate.armored) || hitByFlame) {
        crate.broken = true;
        crate.mesh.visible = false;
        this.brokenCrateIds.add(crate.id);
        this.hitstopTimer = 0.045;
        this.shakeIntensity = 0.32;
        this.sound.playCrateBreak();
        this.spawnParticles(crate.position, crate.armored ? 0xf59e0b : 0xb07d4f, 16, 6.2, 16, 1.0);
        // Award bonus gem(s) cleanly
        for (let k = 0; k < crate.gemCount; k++) {
          const bonusId = `bonus-${crate.id}-${k}`;
          if (!this.collectedGemIds.has(bonusId)) {
            this.collectedGemIds.add(bonusId);
          }
        }
        this.sound.playGemCollect();
        this.saveProgress();
      } else if (hitByCharge && crate.armored) {
        // Bounce off armored chest with metallic clang hint
        this.playerVel.x *= -0.6;
        this.playerVel.z *= -0.6;
        this.shakeIntensity = 0.18;
        this.showBanner('Iron-Bound Chest', 'Press E or Click to breathe Beacon Flame!', '#f59e0b');
      }
    }

    // 3. Harbor Braziers (Light with Beacon Flame for shield restore!)
    for (const brazier of this.realm.braziers) {
      if (brazier.lit) {
        brazier.flameMesh.scale.y = 0.9 + Math.sin(this.simTime * 16 + brazier.position.x) * 0.16;
        continue;
      }
      if (flameActive && brazier.position.distanceTo(_tmpVec2) < 2.6) {
        brazier.lit = true;
        brazier.flameMesh.visible = true;
        brazier.light.intensity = 4.5;
        this.litBrazierIds.add(brazier.id);
        this.health = this.maxHealth;
        this.sound.playBrazierLight();
        this.spawnParticles(brazier.position, 0xffa62b, 18, 5.4, 6, 0.95);
        this.showBanner('Harbor Brazier Lit', 'Firefly Shield fully restored!', '#ff9f1c');
        this.saveProgress();
      }
    }

    // 4. Lost Lighthouse Artifacts (6 total across the 3 portal realms!)
    for (const art of this.realm.artifacts) {
      if (art.collected) continue;
      art.mesh.rotation.y += dt * 1.4;
      art.mesh.position.y = art.baseY + Math.sin(this.simTime * 2.5) * 0.28;
      if (art.position.distanceTo(this.playerPos) < 2.1) {
        art.collected = true;
        art.mesh.visible = false;
        this.collectedArtifactIds.add(art.def.id);
        this.hitstopTimer = 0.065;
        this.shakeIntensity = 0.4;
        this.health = this.maxHealth;
        this.spawnParticles(art.position, art.def.accentHex, 28, 7.5, 8, 1.25);
        this.updateBeaconVisuals();
        this.saveProgress();

        if (this.collectedArtifactIds.size >= ARTIFACT_CATALOG.length && !this.victoryTriggered) {
          this.victoryTriggered = true;
          this.sound.playBeaconVictory();
          this.mode = 'victory';
          this.showBanner(
            'Harbor Beacon Restored!',
            'All 6 St. Joseph Lighthouse Artifacts recovered!',
            '#ffd166'
          );
        } else {
          this.sound.playArtifactFanfare();
          this.showBanner(
            `Recovered: ${art.def.name}`,
            `${art.def.landmark} · ${this.collectedArtifactIds.size} of ${ARTIFACT_CATALOG.length} artifacts`,
            art.def.accentCss
          );
        }
        this.emitHud();
      }
    }

    // 5. Spyro-Style Portal Gates
    if (this.portalCooldown <= 0) {
      for (const portal of this.realm.portals) {
        const dx = this.playerPos.x - portal.position.x;
        const dz = this.playerPos.z - portal.position.z;
        const dy = Math.abs(this.playerPos.y + 0.8 - portal.position.y);
        if (Math.hypot(dx, dz) < portal.radius && dy < 2.6) {
          this.beginPortalWarp(portal.targetRealm, portal.targetSpawn);
          break;
        }
      }
    }
  }

  private beginPortalWarp(targetRealm: RealmId, targetSpawn: [number, number, number]): void {
    this.mode = 'warping';
    this.warpTimer = 0;
    this.warpSwapped = false;
    this.warpTargetRealm = targetRealm;
    this.warpTargetSpawn = targetSpawn;
    this.sound.playPortalWarp();
    this.spawnParticles(this.playerPos, 0x38bdf8, 22, 6.5, 2, 1.0);
    this.emitHud();
  }

  private updatePortalWarp(dt: number): void {
    this.warpTimer += dt;
    this.dragon.root.rotation.y += dt * 11;
    const scale = this.warpTimer < 0.38 ? Math.max(0.05, 1 - this.warpTimer / 0.38) : Math.min(1, (this.warpTimer - 0.38) / 0.38);
    this.dragon.root.scale.setScalar(scale);

    if (this.warpTimer >= 0.38 && !this.warpSwapped) {
      this.warpSwapped = true;
      this.loadRealm(this.warpTargetRealm, this.warpTargetSpawn);
      const meta = REALM_META[this.warpTargetRealm];
      this.showBanner(meta.title, meta.subtitle, '#38bdf8');
    }

    if (this.warpTimer >= 0.78) {
      this.dragon.root.scale.setScalar(1);
      this.mode = 'playing';
      this.emitHud();
    }
  }

  private updateHazards(dt: number): void {
    if (!this.realm) return;
    const flameActive = this.flameTimer > 0;
    _tmpVec2.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).multiplyScalar(2.4).add(this.playerPos);
    _tmpVec2.y += 0.75;

    for (const hz of this.realm.hazards) {
      if (hz.defeated) {
        hz.respawnTimer -= dt;
        if (hz.respawnTimer <= 0) {
          hz.defeated = false;
          hz.mesh.visible = true;
        }
        continue;
      }

      const angle = this.simTime * hz.speed + hz.phase;
      hz.position.set(
        hz.home.x + Math.cos(angle) * hz.patrolRadius,
        hz.home.y + (hz.kind === 'buoy-drone' ? Math.sin(this.simTime * 3.5) * 0.25 : 0),
        hz.home.z + Math.sin(angle) * hz.patrolRadius
      );
      hz.mesh.position.copy(hz.position);
      hz.mesh.rotation.y = -angle;

      const dPlayer = hz.position.distanceTo(this.playerPos);
      const dFlame = flameActive ? hz.position.distanceTo(_tmpVec2) : 999;

      // Telegraph bob when player approaches
      if (dPlayer < 6.0) {
        hz.telegraphTimer += dt * 14;
        hz.mesh.scale.setScalar(1 + Math.sin(hz.telegraphTimer) * 0.08);
      } else {
        hz.mesh.scale.setScalar(1);
      }

      // Defeat via Horn Charge or Beacon Flame
      if ((this.isCharging && dPlayer < 1.85) || dFlame < 2.2) {
        hz.defeated = true;
        hz.mesh.visible = false;
        hz.respawnTimer = 18;
        this.hitstopTimer = 0.05;
        this.shakeIntensity = 0.34;
        this.sound.playCrateBreak();
        this.spawnParticles(hz.position, 0xff595e, 18, 6.4, 14, 1.0);
        continue;
      }

      // Otherwise bump hurts player shield
      if (dPlayer < 1.35 && this.invulnTimer <= 0) {
        this.invulnTimer = 1.6;
        this.shakeIntensity = 0.42;
        this.sound.playDamage();
        this.playerVel.y = 7.5;
        _tmpVec.subVectors(this.playerPos, hz.position).setY(0).normalize().multiplyScalar(8.5);
        this.playerVel.x = _tmpVec.x;
        this.playerVel.z = _tmpVec.z;

        if (this.health > 1) {
          this.health--;
        } else {
          // Gentle respawn at realm start with restored shield
          this.health = this.maxHealth;
          this.playerPos.copy(this.realm.spawn);
          this.playerVel.set(0, 0, 0);
          this.showBanner('Firefly Shield Recharged', 'Returned to safe harbor ledge', '#38bdf8');
        }
        this.emitHud();
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 7;
      p.mesh.rotation.y += dt * 5;
      const t = 1 - p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t;
      p.mesh.scale.multiplyScalar(0.985);
    }
  }

  private updateChaseCamera(dt: number): void {
    // Dynamic FOV kick during Horn Charge
    const targetFov = this.isCharging ? 68 : this.isGliding ? 63 : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
      this.camera.updateProjectionMatrix();
    }

    const dist = this.isGliding ? 11.2 : 9.8;
    const height = 3.2 + Math.sin(this.camPitch) * dist;
    const horiz = Math.cos(this.camPitch) * dist;

    _camIdeal.set(
      this.playerPos.x + Math.sin(this.camYaw) * horiz,
      Math.max(REALM_META[this.realmId].waterY + 1.6, this.playerPos.y + height),
      this.playerPos.z + Math.cos(this.camYaw) * horiz
    );

    if (this.shakeIntensity > 0) {
      _camIdeal.x += (Math.random() - 0.5) * this.shakeIntensity;
      _camIdeal.y += (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camIdeal.x, 9, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camIdeal.y, 9, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camIdeal.z, 9, dt);

    _camLook.set(this.playerPos.x, this.playerPos.y + 1.55, this.playerPos.z);
    this.camera.lookAt(_camLook);
  }

  // --- HUD Snapshot Computation ---

  private computeCompassAndPrompt(): {
    nearbyPrompt: HudSnapshot['nearbyPrompt'];
    compassAngleDeg: number | null;
    compassLabel: string | null;
  } {
    let nearbyPrompt: HudSnapshot['nearbyPrompt'] = null;
    let targetPos: THREE.Vector3 | null = null;
    let compassLabel: string | null = null;

    if (this.realm) {
      // Check nearby portal for clean preview prompt
      for (const p of this.realm.portals) {
        const d = this.playerPos.distanceTo(p.position);
        if (d < 8.5) {
          nearbyPrompt = {
            title: p.label,
            subtitle: `Walk through portal · ${p.subtitle}`,
            kind: 'portal',
          };
          break;
        }
      }

      // Check Beacon Pedestal in Downtown
      if (!nearbyPrompt && this.realmId === 'downtown') {
        const distBeacon = Math.hypot(this.playerPos.x, this.playerPos.z + 31);
        if (distBeacon < 7.5) {
          const rem = ARTIFACT_CATALOG.length - this.collectedArtifactIds.size;
          nearbyPrompt = {
            title: 'St. Joseph Harbor Beacon Pedestal',
            subtitle:
              rem > 0
                ? `${rem} lost lighthouse ${rem === 1 ? 'artifact' : 'artifacts'} remaining across the city portals`
                : 'Beacon fully restored and shining over Lake Michigan',
            kind: 'beacon',
          };
        }
      }

      // Compass target: nearest uncollected artifact in this realm, OR portal to a realm with missing artifacts
      let bestDist = Infinity;
      for (const art of this.realm.artifacts) {
        if (art.collected) continue;
        const d = art.position.distanceTo(this.playerPos);
        if (d < bestDist) {
          bestDist = d;
          targetPos = art.position;
          compassLabel = art.def.name;
        }
      }

      if (!targetPos) {
        // Point to portal leading to an incomplete realm (or back to Downtown if this realm is complete)
        let candidatePortal: PortalEntity | null = null;
        for (const p of this.realm.portals) {
          if (this.realmId === 'downtown') {
            const hasMissing = ARTIFACT_CATALOG.some(
              (a) => a.realm === p.targetRealm && !this.collectedArtifactIds.has(a.id)
            );
            if (hasMissing) {
              const d = p.position.distanceTo(this.playerPos);
              if (d < bestDist) {
                bestDist = d;
                candidatePortal = p;
              }
            }
          } else {
            candidatePortal = p;
          }
        }
        if (candidatePortal) {
          targetPos = candidatePortal.position;
          compassLabel = candidatePortal.label;
        }
      }
    }

    let compassAngleDeg: number | null = null;
    if (targetPos) {
      const dx = targetPos.x - this.playerPos.x;
      const dz = targetPos.z - this.playerPos.z;
      const worldBearing = Math.atan2(dx, -dz);
      const camForwardBearing = Math.atan2(-Math.sin(this.camYaw), Math.cos(this.camYaw));
      let rel = worldBearing - camForwardBearing;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      compassAngleDeg = THREE.MathUtils.radToDeg(rel);
    }

    return { nearbyPrompt, compassAngleDeg, compassLabel };
  }

  private emitHud(): void {
    const meta = REALM_META[this.realmId];
    const { nearbyPrompt, compassAngleDeg, compassLabel } = this.computeCompassAndPrompt();

    const realmArtifactCounts: Record<RealmId, { collected: number; total: number }> = {
      downtown: { collected: 0, total: 0 },
      north_pier: { collected: 0, total: 0 },
      silver_beach: { collected: 0, total: 0 },
      swing_bridge: { collected: 0, total: 0 },
    };
    for (const art of ARTIFACT_CATALOG) {
      realmArtifactCounts[art.realm].total++;
      if (this.collectedArtifactIds.has(art.id)) {
        realmArtifactCounts[art.realm].collected++;
      }
    }

    this.onHudUpdate({
      mode: this.mode,
      realmId: this.realmId,
      realmTitle: meta.title,
      realmSubtitle: meta.subtitle,
      collectedArtifactIds: Array.from(this.collectedArtifactIds),
      collectedGemCount: Math.min(this.collectedGemIds.size, TOTAL_GEMS),
      totalGemCount: TOTAL_GEMS,
      health: this.health,
      maxHealth: this.maxHealth,
      elapsedSeconds: Math.floor(this.elapsedSeconds),
      isCharging: this.isCharging,
      isGliding: this.isGliding,
      isFlaming: this.flameTimer > 0,
      nearbyPrompt,
      bannerToast: this.bannerToast,
      compassAngleDeg,
      compassLabel,
      muted: this.sound.isMuted(),
      hasSavedProgress: this.collectedArtifactIds.size > 0 || this.collectedGemIds.size > 0,
      realmArtifactCounts,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);

    if (this.realm) {
      for (const d of this.realm.disposables) {
        d.dispose();
      }
    }
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
