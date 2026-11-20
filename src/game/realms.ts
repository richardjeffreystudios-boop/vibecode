import * as THREE from 'three';
import {
  ARTIFACT_CATALOG,
  ArtifactEntity,
  BrazierEntity,
  CrateEntity,
  GemEntity,
  HazardEntity,
  PlatformBox,
  PortalEntity,
  REALM_META,
  RealmId,
  RealmInstance,
} from './types';
import { ProceduralTextureLibrary } from './textures';
import {
  createArtifactMesh,
  createBeachUmbrella,
  createBluffBandshell,
  createBrazierMesh,
  createBuoyDrone,
  createCargoBarge,
  createCarouselPavilion,
  createCrateMesh,
  createGemMesh,
  createHarborCrab,
  createLakeTree,
  createLamppost,
  createLighthouseTower,
  createMaidOfMistFountain,
  createPortalGate,
  createSkyDome,
  createStorefrontBuilding,
  createWaterPlane,
} from './models';

const GEM_COLORS = [0xff595e, 0x38bdf8, 0x34d399, 0xfbbf24, 0xc084fc];

export interface RealmBuildContext {
  textures: ProceduralTextureLibrary;
  collectedArtifactIds: Set<string>;
  collectedGemIds: Set<string>;
  litBrazierIds: Set<string>;
  brokenCrateIds: Set<string>;
}

/**
 * Helper builder to ensure every visual platform has a matching solid AABB collider.
 */
class RealmBuilder {
  public root = new THREE.Group();
  public platforms: PlatformBox[] = [];
  public portals: PortalEntity[] = [];
  public gems: GemEntity[] = [];
  public artifacts: ArtifactEntity[] = [];
  public crates: CrateEntity[] = [];
  public braziers: BrazierEntity[] = [];
  public hazards: HazardEntity[] = [];
  public animatedProps: Array<{ update: (elapsed: number, dt: number) => void }> = [];
  public disposables: Array<{ dispose: () => void }> = [];

  private ctx: RealmBuildContext;
  private realmId: RealmId;
  private platformSeq = 0;

  constructor(realmId: RealmId, ctx: RealmBuildContext) {
    this.realmId = realmId;
    this.ctx = ctx;
  }

  public addStaticBox(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    bouncy?: number
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    this.disposables.push(geo);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.root.add(mesh);

    this.platforms.push({
      id: `${this.realmId}-p-${this.platformSeq++}`,
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      bouncy,
    });
    return mesh;
  }

  public addColliderOnly(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    bouncy?: number
  ): void {
    this.platforms.push({
      id: `${this.realmId}-c-${this.platformSeq++}`,
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      bouncy,
    });
  }

  public addMovingBox(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    mode: 'oscillateY' | 'oscillateX' | 'oscillateZ' | 'orbit',
    amp: number,
    speed: number,
    phase = 0,
    orbitCenterX?: number,
    orbitCenterZ?: number,
    orbitRadius?: number,
    customMesh?: THREE.Object3D
  ): THREE.Object3D {
    let mesh: THREE.Object3D;
    if (customMesh) {
      mesh = customMesh;
      mesh.position.set(x, y, z);
    } else {
      const geo = new THREE.BoxGeometry(w, h, d);
      this.disposables.push(geo);
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      mesh = m;
    }
    this.root.add(mesh);

    this.platforms.push({
      id: `${this.realmId}-m-${this.platformSeq++}`,
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      moving: {
        mesh,
        baseX: x,
        baseY: y,
        baseZ: z,
        halfX: w / 2,
        halfY: h / 2,
        halfZ: d / 2,
        mode,
        amp,
        speed,
        phase,
        orbitCenterX,
        orbitCenterZ,
        orbitRadius,
        prevX: x,
        prevY: y,
        prevZ: z,
      },
    });
    return mesh;
  }

  public addPortal(
    id: string,
    label: string,
    subtitle: string,
    targetRealm: RealmId,
    targetSpawn: [number, number, number],
    x: number,
    y: number,
    z: number,
    rotationY: number,
    accentHex: number
  ): void {
    const { group, vortexMat, ringMesh } = createPortalGate(accentHex);
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    this.root.add(group);
    this.portals.push({
      id,
      label,
      subtitle,
      targetRealm,
      targetSpawn,
      position: new THREE.Vector3(x, y + 2.2, z),
      rotationY,
      radius: 2.55,
      accentHex,
      vortexMat,
      ringMesh,
    });
  }

  public addGem(id: string, x: number, y: number, z: number, colorIdx = 0): void {
    const collected = this.ctx.collectedGemIds.has(id);
    const mesh = createGemMesh(GEM_COLORS[colorIdx % GEM_COLORS.length]);
    mesh.position.set(x, y, z);
    mesh.visible = !collected;
    this.root.add(mesh);
    this.gems.push({
      id,
      value: 1,
      position: new THREE.Vector3(x, y, z),
      baseY: y,
      mesh,
      collected,
      magnetized: false,
      phase: (x * 0.7 + z * 0.4) % (Math.PI * 2),
    });
  }

  public addArtifact(artifactId: string, x: number, y: number, z: number): void {
    const def = ARTIFACT_CATALOG.find((a) => a.id === artifactId);
    if (!def) return;
    const collected = this.ctx.collectedArtifactIds.has(artifactId);
    const { group, beamMesh } = createArtifactMesh(def);
    group.position.set(x, y, z);
    group.visible = !collected;
    this.root.add(group);
    this.artifacts.push({
      def,
      position: new THREE.Vector3(x, y, z),
      baseY: y,
      mesh: group,
      beamMesh,
      collected,
    });
  }

  public addCrate(id: string, x: number, y: number, z: number, armored = false): void {
    const broken = this.ctx.brokenCrateIds.has(id);
    const mesh = createCrateMesh(armored);
    mesh.position.set(x, y, z);
    mesh.visible = !broken;
    this.root.add(mesh);
    this.crates.push({
      id,
      position: new THREE.Vector3(x, y + 0.65, z),
      mesh,
      broken,
      armored,
      gemCount: armored ? 2 : 1,
    });
  }

  public addBrazier(id: string, x: number, y: number, z: number): void {
    const lit = this.ctx.litBrazierIds.has(id);
    const { group, flameMesh, light } = createBrazierMesh();
    group.position.set(x, y, z);
    flameMesh.visible = lit;
    light.intensity = lit ? 4.5 : 0;
    this.root.add(group);
    this.braziers.push({
      id,
      position: new THREE.Vector3(x, y + 1.2, z),
      flameMesh,
      light,
      lit,
    });
  }

  public addHazard(
    id: string,
    kind: 'crab' | 'buoy-drone',
    x: number,
    y: number,
    z: number,
    patrolRadius: number,
    speed: number
  ): void {
    const mesh = kind === 'crab' ? createHarborCrab() : createBuoyDrone();
    mesh.position.set(x, y, z);
    this.root.add(mesh);
    this.hazards.push({
      id,
      kind,
      home: new THREE.Vector3(x, y, z),
      position: new THREE.Vector3(x, y, z),
      patrolRadius,
      speed,
      phase: x * 0.3 + z * 0.2,
      mesh,
      defeated: false,
      respawnTimer: 0,
      telegraphTimer: 0,
    });
  }
}

export function buildRealm(realmId: RealmId, ctx: RealmBuildContext): RealmInstance {
  const meta = REALM_META[realmId];
  const b = new RealmBuilder(realmId, ctx);

  // Sky dome & sunlit Lake Michigan / St. Joseph River water plane
  const sky = createSkyDome(meta.skyTop, meta.skyBottom);
  b.root.add(sky);

  const water = createWaterPlane(meta.waterColor, 460);
  water.mesh.position.y = meta.waterY;
  b.root.add(water.mesh);
  b.animatedProps.push({ update: (elapsed) => water.update(elapsed) });

  if (realmId === 'downtown') {
    return buildDowntownHub(b, ctx, water.mesh);
  }
  if (realmId === 'north_pier') {
    return buildNorthPierRealm(b, ctx, water.mesh);
  }
  if (realmId === 'silver_beach') {
    return buildSilverBeachRealm(b, ctx, water.mesh);
  }
  return buildSwingBridgeRealm(b, ctx, water.mesh);
}

/**
 * HUB WORLD — State Street & Lake Bluff Park, Downtown St. Joseph, Michigan.
 */
function buildDowntownHub(
  b: RealmBuilder,
  ctx: RealmBuildContext,
  waterMesh: THREE.Mesh
): RealmInstance {
  const tex = ctx.textures;

  const brickMat = new THREE.MeshStandardMaterial({ map: tex.brickRoad, roughness: 0.82 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: tex.sidewalkStone, roughness: 0.78 });
  const grassMat = new THREE.MeshStandardMaterial({ map: tex.parkGrass, roughness: 0.88 });
  const bluffCliffMat = new THREE.MeshStandardMaterial({ color: 0x7c6854, roughness: 0.92 });
  const timberMat = new THREE.MeshStandardMaterial({ map: tex.timberPier, roughness: 0.8 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a13b, roughness: 0.24, metalness: 0.84 });

  // 1. State Street Brick Boulevard (North-South spine, X in [-10..10], Z in [-34..34])
  b.addStaticBox(0, -1.0, 0, 20, 2.0, 74, brickMat);

  // Sidewalks flanking State Street (raised slightly by 0.22 to prevent Z-fighting)
  b.addStaticBox(-13.5, -0.82, 0, 7.5, 2.0, 74, stoneMat);
  b.addStaticBox(13.5, -0.82, 0, 7.5, 2.0, 74, stoneMat);

  // 2. Lake Bluff Park (West terrace overlooking Lake Michigan, X in [-42..-17])
  b.addStaticBox(-30, -0.78, 0, 26, 2.0, 72, grassMat);
  // Natural bluff cliff wall dropping down to Lake Michigan
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(28, 7.0, 74), bluffCliffMat);
  cliff.position.set(-31, -5.2, 0);
  b.root.add(cliff);

  // Bluff Park timber promenade overlook railing on western edge
  for (let z = -32; z <= 32; z += 4) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, 0.28), timberMat);
    post.position.set(-42.5, 0.78, z);
    post.castShadow = true;
    b.root.add(post);
  }
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 65), timberMat);
  topRail.position.set(-42.5, 1.32, 0);
  b.root.add(topRail);

  // 3. East Plaza & Harbor Beacon Overlook (X in [17..42])
  b.addStaticBox(29, -0.78, 0, 25, 2.0, 70, stoneMat);

  // 4. Historic State Street Brick Storefronts (East & North-East side) with Bouncy Striped Awnings!
  const storefrontSpecs = [
    { x: 23, z: -22, w: 10, h: 8.5, d: 9, f: tex.storefrontRed, a: tex.awningStripeRed },
    { x: 23, z: -8, w: 10, h: 10.2, d: 9, f: tex.storefrontCream, a: tex.awningStripeTeal },
    { x: 23, z: 8, w: 10, h: 8.8, d: 9, f: tex.storefrontSlate, a: tex.awningStripeGold },
    { x: 23, z: 22, w: 10, h: 9.4, d: 9, f: tex.storefrontRed, a: tex.awningStripeRed },
  ];
  for (const s of storefrontSpecs) {
    const bldg = createStorefrontBuilding(s.w, s.h, s.d, s.f, s.a, true);
    bldg.position.set(s.x, 0.22, s.z);
    bldg.rotation.y = -Math.PI / 2; // face State Street (-X)
    b.root.add(bldg);

    // Building rooftop solid collider
    b.addColliderOnly(s.x, 0.22 + s.h * 0.5, s.z, s.d, s.h + 0.5, s.w);
    // Bouncy awning platform collider facing State Street!
    b.addColliderOnly(s.x - s.d * 0.5 - 1.25, 3.35, s.z, 2.6, 0.55, s.w * 0.84, 18.8);
  }

  // Connecting timber sky-bridges between State Street rooftops so players can platform across buildings!
  b.addStaticBox(23, 8.9, -15, 3.2, 0.45, 5.2, timberMat);
  b.addStaticBox(23, 9.2, 0, 3.2, 0.45, 6.2, timberMat);
  b.addStaticBox(23, 9.2, 15, 3.2, 0.45, 5.2, timberMat);

  // 5. Maid of the Mist Fountain (center of Lake Bluff Park)
  const fountain = createMaidOfMistFountain();
  fountain.group.position.set(-28, 0.22, -4);
  b.root.add(fountain.group);
  b.addColliderOnly(-28, 0.65, -4, 8.4, 0.9, 8.4);
  b.addColliderOnly(-28, 2.75, -4, 4.4, 0.5, 4.4, 14.5);
  b.animatedProps.push({
    update: (elapsed) => {
      fountain.waterRing.scale.setScalar(1 + Math.sin(elapsed * 4.5) * 0.08);
    },
  });

  // 6. John E.N. Howard Bluff Park Bandshell (South-West Bluff Park)
  const bandshell = createBluffBandshell();
  bandshell.position.set(-29, 0.22, 20);
  bandshell.rotation.y = Math.PI * 0.25;
  b.root.add(bandshell);
  b.addColliderOnly(-29, 0.82, 20, 10.5, 1.25, 8.5);

  // 7. Harbor Beacon Restoration Plaza (North end of State Street, Z = -28)
  const beaconDeck = b.addStaticBox(0, 0.4, -31, 14, 0.9, 12, stoneMat);
  beaconDeck.receiveShadow = true;

  // 6 Artifact Socket Pillars arrayed in a semicircle around the Beacon Pedestal
  const beaconSlots: THREE.Mesh[] = [];
  ARTIFACT_CATALOG.forEach((art, idx) => {
    const angle = Math.PI * 0.15 + (idx / 5) * Math.PI * 0.7;
    const px = Math.cos(angle) * 4.8;
    const pz = -31 - Math.sin(angle) * 3.6;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.4, 8), stoneMat);
    pillar.position.set(px, 1.55, pz);
    pillar.castShadow = true;
    b.root.add(pillar);

    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.38, 1),
      new THREE.MeshStandardMaterial({
        color: art.accentHex,
        emissive: art.accentHex,
        emissiveIntensity: ctx.collectedArtifactIds.has(art.id) ? 1.8 : 0.08,
        roughness: 0.2,
        metalness: 0.3,
      })
    );
    orb.position.set(px, 2.7, pz);
    b.root.add(orb);
    beaconSlots.push(orb);
  });

  // Distant Skyline St. Joseph North Pier Twin Lighthouses standing out in Lake Michigan (West-North-West!)
  // Their Fresnel lantern glows brighter with each artifact recovered and sweeps dramatically at 6/6!
  const skyLightInner = createLighthouseTower(1.35, false, true);
  skyLightInner.group.position.set(-68, -4.4, -42);
  b.root.add(skyLightInner.group);

  const skyLightOuter = createLighthouseTower(1.15, true, false);
  skyLightOuter.group.position.set(-86, -4.4, -42);
  b.root.add(skyLightOuter.group);

  // Catwalk connecting the skyline twin lighthouses
  const skyPier = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 5.2), timberMat);
  skyPier.position.set(-72, -3.5, -42);
  b.root.add(skyPier);

  // 8. THREE SPYRO-STYLE LANDMARK PORTALS placed in specific St. Joseph city areas!
  // Portal 1: Bluff Park Overlook -> North Pier & Twin Lighthouses
  b.addPortal(
    'portal-north-pier',
    'North Pier & Twin Lighthouses',
    'Lake Michigan Breakwater Realm',
    'north_pier',
    [0, 1.6, 44],
    -35,
    0.22,
    -24,
    Math.PI * 0.28,
    0x38bdf8
  );

  // Portal 2: Broad Street Bluff Descent -> Silver Beach & Carousel
  b.addPortal(
    'portal-silver-beach',
    'Silver Beach & Carousel',
    'Lakefront Dunes Realm',
    'silver_beach',
    [0, 1.6, 36],
    -18,
    0.22,
    30,
    Math.PI * 0.88,
    0xf59e0b
  );

  // Portal 3: Ship Street Harbor Viaduct -> St. Joseph River & Swing Bridge
  b.addPortal(
    'portal-swing-bridge',
    'St. Joseph River & Swing Bridge',
    'Harbor Channel Realm',
    'swing_bridge',
    [0, 1.6, 42],
    12,
    0.22,
    -33,
    -Math.PI * 0.14,
    0x34d399
  );

  // 9. State Street vintage lampposts & Lake Bluff Park trees
  for (let z = -22; z <= 24; z += 14) {
    const l1 = createLamppost();
    l1.position.set(-10.2, 0.18, z);
    b.root.add(l1);
    const l2 = createLamppost();
    l2.position.set(10.2, 0.18, z);
    b.root.add(l2);
  }

  const treeCoords: Array<[number, number, 'pine' | 'maple']> = [
    [-39, -15, 'pine'],
    [-39, 8, 'maple'],
    [-38, 28, 'pine'],
    [-21, -18, 'maple'],
    [-19, 12, 'maple'],
    [35, -16, 'pine'],
    [36, 14, 'maple'],
  ];
  for (const [tx, tz, kind] of treeCoords) {
    const t = createLakeTree(kind);
    t.position.set(tx, 0.22, tz);
    t.rotation.y = tx * 0.5;
    b.root.add(t);
  }

  // Harbor plaque pedestal at center of State Street
  const clockBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 0.7, 8), stoneMat);
  clockBase.position.set(0, 0.35, 16);
  b.root.add(clockBase);
  const clockPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 4.4, 8), brassMat);
  clockPillar.position.set(0, 2.6, 16);
  clockPillar.castShadow = true;
  b.root.add(clockPillar);
  const clockHead = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.35, 16), brassMat);
  clockHead.rotation.x = Math.PI / 2;
  clockHead.position.set(0, 4.9, 16);
  b.root.add(clockHead);

  // 10. Collectibles, Crates, Braziers & Hazards in Downtown Hub (15 Gems)
  const hubGems: Array<[number, number, number]> = [
    // State Street leading north toward the Beacon Plaza
    [0, 1.0, 8],
    [0, 1.0, 2],
    [0, 1.0, -4],
    [0, 1.0, -10],
    [0, 1.0, -16],
    // Rooftop trail above State Street storefronts (reach via bouncy awnings!)
    [23, 10.1, -22],
    [23, 11.8, -8],
    [23, 10.5, 8],
    [23, 11.0, 22],
    // Lake Bluff Park & Maid of the Mist Fountain
    [-28, 4.4, -4],
    [-28, 1.2, 6],
    [-29, 2.2, 20],
    // Near the three portal gates
    [-30, 1.2, -20],
    [-16, 1.2, 24],
    [10, 1.2, -26],
  ];
  hubGems.forEach(([gx, gy, gz], i) => {
    b.addGem(`dt-gem-${i}`, gx, gy, gz, i);
  });

  b.addCrate('dt-crate-1', -12, 0.22, -6, false);
  b.addCrate('dt-crate-2', -12, 0.22, -9, false);
  b.addCrate('dt-crate-3', 12, 0.22, 12, true);
  b.addBrazier('dt-brazier-1', -6, 0.22, -25);
  b.addBrazier('dt-brazier-2', 6, 0.22, -25);
  b.addHazard('dt-crab-1', 'crab', -24, 0.22, 7, 5.5, 1.4);

  return {
    id: 'downtown',
    root: b.root,
    spawn: new THREE.Vector3(0, 1.5, 23),
    spawnYaw: Math.PI, // face north down State Street toward Beacon Plaza
    platforms: b.platforms,
    portals: b.portals,
    gems: b.gems,
    artifacts: b.artifacts,
    crates: b.crates,
    braziers: b.braziers,
    hazards: b.hazards,
    waterMesh,
    beaconBeam: skyLightInner.beamPivot,
    beaconSlots,
    lanternGlowMesh: skyLightInner.lanternGlow,
    animatedProps: b.animatedProps,
    disposables: b.disposables,
  };
}

/**
 * REALM 1 — St. Joseph North Pier & Twin Lighthouses (Breakwater Catwalk Platforming)
 */
function buildNorthPierRealm(
  b: RealmBuilder,
  ctx: RealmBuildContext,
  waterMesh: THREE.Mesh
): RealmInstance {
  const tex = ctx.textures;
  const timberMat = new THREE.MeshStandardMaterial({ map: tex.timberPier, roughness: 0.8 });
  const concreteMat = new THREE.MeshStandardMaterial({ map: tex.sidewalkStone, roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ map: tex.rivetedSteel, roughness: 0.42, metalness: 0.65 });
  const redBuoyMat = new THREE.MeshStandardMaterial({ color: 0xd1382c, roughness: 0.32, metalness: 0.3 });

  // Starting shore dock with Return Portal to Downtown St. Joseph
  b.addStaticBox(0, 0, 44, 15, 2.0, 14, concreteMat);
  b.addPortal(
    'return-downtown-pier',
    'State Street & Bluff Park',
    'Return to Downtown St. Joseph',
    'downtown',
    [-31, 1.5, -20],
    0,
    1.0,
    49,
    0,
    0xffd166
  );

  // Breakwater Pier Section 1
  b.addStaticBox(0, 0.1, 29, 8.5, 2.0, 14, timberMat);
  // Storm-damaged gap bridged by rising/bobbing harbor pontoons
  b.addMovingBox(-2.2, 0.4, 17, 4.6, 1.0, 4.6, timberMat, 'oscillateY', 1.1, 1.8, 0);
  b.addMovingBox(2.4, 1.1, 10, 4.6, 1.0, 4.6, timberMat, 'oscillateY', 1.1, 1.8, Math.PI * 0.7);

  // Pier Mid-Deck + Inner Lighthouse Plaza
  b.addStaticBox(0, 0.3, -2, 13, 2.2, 16, concreteMat);

  // Iconic North Pier Inner Lighthouse (standing on the mid-plaza)
  const innerLight = createLighthouseTower(0.95, false, true);
  innerLight.group.position.set(-10, -0.5, -2);
  b.root.add(innerLight.group);

  // Bouncy channel buoy launching Pip onto the Inner Lighthouse overlook platform!
  b.addStaticBox(-6.2, 1.8, 2.5, 2.8, 1.2, 2.8, redBuoyMat, 19.5);
  b.addStaticBox(-10, 8.6, -2, 6.2, 0.7, 6.2, steelMat);
  // ARTIFACT 1: Fresnel Prism Core atop the Inner Lighthouse deck
  b.addArtifact('fresnel-prism', -10, 10.6, -2);

  // Elevated iconic steel Catwalk stretching from Inner to Outer Lighthouse!
  b.addStaticBox(0, 4.8, -16, 4.0, 0.55, 14, steelMat);
  // Catwalk support arches
  for (let z = -22; z <= -10; z += 4) {
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 5.2, 0.32), steelMat);
    legL.position.set(-1.8, 2.4, z);
    b.root.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 5.2, 0.32), steelMat);
    legR.position.set(1.8, 2.4, z);
    b.root.add(legR);
  }
  // Stepping stone piers leading up onto the catwalk
  b.addStaticBox(3.5, 2.8, -9, 3.6, 0.7, 3.6, timberMat);

  // Moving lateral catwalk trolley
  b.addMovingBox(0, 5.2, -28, 4.8, 0.65, 5.4, steelMat, 'oscillateX', 4.5, 1.5, 0.4);

  // Outer Pier Head & 1906 Outer Lighthouse
  b.addStaticBox(0, 0.6, -42, 15, 2.4, 15, concreteMat);
  const outerLight = createLighthouseTower(0.95, true, false);
  outerLight.group.position.set(0, 1.7, -45);
  b.root.add(outerLight.group);

  // Bouncy buoy + high scaffold to reach the Outer Lighthouse summit
  b.addStaticBox(5.5, 2.2, -39, 2.8, 1.2, 2.8, redBuoyMat, 20.5);
  b.addStaticBox(0, 11.4, -45, 5.6, 0.6, 5.6, steelMat);
  // ARTIFACT 2: Brass Foghorn Reed atop the Outer Lighthouse
  b.addArtifact('foghorn-reed', 0, 13.4, -45);

  // 15 Gems across pier, pontoons, catwalk, and outer head
  const pierGems: Array<[number, number, number]> = [
    [0, 2.0, 34],
    [0, 2.0, 29],
    [0, 2.0, 24],
    [-2.2, 3.0, 17],
    [2.4, 3.4, 10],
    [-3.5, 2.2, 0],
    [3.5, 2.2, 0],
    [3.5, 4.1, -9],
    [0, 6.2, -13],
    [0, 6.2, -17],
    [0, 6.2, -21],
    [0, 7.2, -28],
    [-4.5, 2.8, -39],
    [4.5, 2.8, -39],
    [0, 2.8, -37],
  ];
  pierGems.forEach(([x, y, z], i) => b.addGem(`np-gem-${i}`, x, y, z, i + 1));

  b.addCrate('np-crate-1', -2.8, 1.1, 28, false);
  b.addCrate('np-crate-2', 3.2, 1.4, -3, true);
  b.addBrazier('np-brazier-1', -4.5, 1.4, -5);
  b.addBrazier('np-brazier-2', -5, 1.8, -42);

  b.addHazard('np-drone-1', 'buoy-drone', 0, 1.4, -1, 4.2, 1.6);
  b.addHazard('np-drone-2', 'buoy-drone', 0, 1.8, -39, 4.5, 1.8);

  return {
    id: 'north_pier',
    root: b.root,
    spawn: new THREE.Vector3(0, 2.2, 43),
    spawnYaw: Math.PI,
    platforms: b.platforms,
    portals: b.portals,
    gems: b.gems,
    artifacts: b.artifacts,
    crates: b.crates,
    braziers: b.braziers,
    hazards: b.hazards,
    waterMesh,
    beaconBeam: innerLight.beamPivot,
    animatedProps: b.animatedProps,
    disposables: b.disposables,
  };
}

/**
 * REALM 2 — Silver Beach & Carousel Pavilion (Sunlit Dunes, Rotating Carousel & Bouncy Umbrellas)
 */
function buildSilverBeachRealm(
  b: RealmBuilder,
  ctx: RealmBuildContext,
  waterMesh: THREE.Mesh
): RealmInstance {
  const tex = ctx.textures;
  const sandMat = new THREE.MeshStandardMaterial({ map: tex.beachSand, roughness: 0.92 });
  const boardMat = new THREE.MeshStandardMaterial({ map: tex.timberPier, roughness: 0.78 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: tex.sidewalkStone, roughness: 0.76 });
  const castleMat = new THREE.MeshStandardMaterial({ color: 0xdcb884, roughness: 0.88 });

  // Broad Silver Beach shore & boardwalk entry
  b.addStaticBox(0, 0, 34, 24, 2.0, 16, sandMat);
  b.addStaticBox(0, 0.2, 22, 12, 2.0, 16, boardMat);

  // Return Portal to Downtown St. Joseph
  b.addPortal(
    'return-downtown-beach',
    'State Street & Bluff Park',
    'Return to Downtown St. Joseph',
    'downtown',
    [-15, 1.5, 25],
    0,
    1.0,
    40,
    0,
    0xffd166
  );

  // Main Silver Beach Peninsula
  b.addStaticBox(0, 0, 0, 42, 2.0, 32, sandMat);

  // Iconic Silver Beach Carousel Pavilion (West side of beach)
  const carousel = createCarouselPavilion(tex.awningStripeRed);
  carousel.group.position.set(-11, 1.0, -2);
  b.root.add(carousel.group);
  // Base deck & pavilion roof platforms
  b.addColliderOnly(-11, 1.4, -2, 16.5, 1.2, 16.5);
  b.addColliderOnly(-11, 11.4, -2, 6.4, 1.1, 6.4); // Roof cupola platform

  // Orbiting platform pads synced to the carousel horses!
  b.addMovingBox(-11, 4.8, -2, 3.2, 0.55, 3.2, boardMat, 'orbit', 0, 0.95, 0, -11, -2, 6.8);
  b.addMovingBox(-11, 7.6, -2, 3.2, 0.55, 3.2, boardMat, 'orbit', 0, 0.95, Math.PI, -11, -2, 6.8);

  // Bouncy striped beach umbrellas leading up to the Carousel Pavilion cupola!
  const umb1 = createBeachUmbrella(tex.awningStripeTeal);
  umb1.position.set(-1.5, 1.0, 5.5);
  b.root.add(umb1);
  b.addColliderOnly(-1.5, 3.85, 5.5, 4.4, 0.65, 4.4, 19.5);

  const umb2 = createBeachUmbrella(tex.awningStripeGold);
  umb2.position.set(-1.5, 1.0, -5.5);
  b.root.add(umb2);
  b.addColliderOnly(-1.5, 3.85, -5.5, 4.4, 0.65, 4.4, 21.5);

  // ARTIFACT 3: Clockwork Gearwheel atop the Silver Beach Carousel Cupola!
  b.addArtifact('carousel-gear', -11, 13.4, -2);

  // Giant Sandcastle Ramparts & Shadowland Arches (East side of Silver Beach)
  b.addStaticBox(14, 2.5, -5, 10, 3.2, 10, castleMat);
  b.addStaticBox(14, 5.6, -5, 6.4, 3.2, 6.4, castleMat);
  // Sandcastle corner turrets
  for (const sx of [-4.2, 4.2]) {
    for (const sz of [-4.2, 4.2]) {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 5.4, 10), castleMat);
      turret.position.set(14 + sx, 3.2, -5 + sz);
      turret.castShadow = true;
      b.root.add(turret);
    }
  }
  const umb3 = createBeachUmbrella(tex.awningStripeRed);
  umb3.position.set(14, 1.0, 5.5);
  b.root.add(umb3);
  b.addColliderOnly(14, 3.85, 5.5, 4.4, 0.65, 4.4, 18.5);

  // Floating dune island north of Silver Beach (reach via Wing Glide from Sandcastle!)
  b.addStaticBox(14, 4.6, -26, 11, 2.4, 11, sandMat);
  // Shadowland decorative stone arch over the dune island
  const shadowArch = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.55, 8, 20, Math.PI), stoneMat);
  shadowArch.position.set(14, 5.8, -26);
  shadowArch.castShadow = true;
  b.root.add(shadowArch);

  // ARTIFACT 4: Amber Lens Ring beneath the Shadowland Arch on the far dune island!
  b.addArtifact('amber-ring', 14, 7.6, -26);

  // Pine grove flanking beach shore
  for (const [tx, tz] of [[-19, 12], [18, 12], [-20, -14]]) {
    const tree = createLakeTree('pine');
    tree.position.set(tx, 1.0, tz);
    b.root.add(tree);
  }

  // 15 Gems across Silver Beach boardwalk, umbrellas, sandcastle & dune island
  const beachGems: Array<[number, number, number]> = [
    [0, 2.0, 27],
    [0, 2.0, 21],
    [0, 2.0, 15],
    [-1.5, 5.6, 5.5],
    [-1.5, 6.2, -5.5],
    [-11, 3.2, 5.5],
    [-11, 3.2, -9.5],
    [6, 2.0, 4],
    [14, 5.8, 5.5],
    [14, 5.2, -0.5],
    [14, 8.2, -5],
    [14, 7.2, -13],
    [14, 6.8, -18],
    [10.5, 6.8, -26],
    [17.5, 6.8, -26],
  ];
  beachGems.forEach(([x, y, z], i) => b.addGem(`sb-gem-${i}`, x, y, z, i + 2));

  b.addCrate('sb-crate-1', -6, 1.0, 11, false);
  b.addCrate('sb-crate-2', 9, 1.0, 8, true);
  b.addBrazier('sb-brazier-1', 5, 1.0, 12);
  b.addBrazier('sb-brazier-2', 14, 5.8, -21.5);

  b.addHazard('sb-crab-1', 'crab', 4, 1.0, -3, 5.5, 1.5);
  b.addHazard('sb-crab-2', 'crab', -4, 1.0, 12, 4.5, 1.3);

  b.animatedProps.push({
    update: (_elapsed, dt) => {
      carousel.rotatingDeck.rotation.y += dt * 0.65;
    },
  });

  return {
    id: 'silver_beach',
    root: b.root,
    spawn: new THREE.Vector3(0, 2.2, 33),
    spawnYaw: Math.PI,
    platforms: b.platforms,
    portals: b.portals,
    gems: b.gems,
    artifacts: b.artifacts,
    crates: b.crates,
    braziers: b.braziers,
    hazards: b.hazards,
    waterMesh,
    carouselDeck: carousel.rotatingDeck,
    animatedProps: b.animatedProps,
    disposables: b.disposables,
  };
}

/**
 * REALM 3 — St. Joseph River & Swing Bridge (Maritime Channel, Cargo Barges, Steel Truss & Silos)
 */
function buildSwingBridgeRealm(
  b: RealmBuilder,
  ctx: RealmBuildContext,
  waterMesh: THREE.Mesh
): RealmInstance {
  const tex = ctx.textures;
  const stoneMat = new THREE.MeshStandardMaterial({ map: tex.sidewalkStone, roughness: 0.8 });
  const steelMat = new THREE.MeshStandardMaterial({ map: tex.rivetedSteel, roughness: 0.42, metalness: 0.68 });
  const timberMat = new THREE.MeshStandardMaterial({ map: tex.timberPier, roughness: 0.82 });
  const siloMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.72 });
  const redSteel = new THREE.MeshStandardMaterial({ color: 0xb8382c, roughness: 0.4, metalness: 0.55 });

  // South River Wharf (Spawn + Return Portal)
  b.addStaticBox(0, 0, 42, 18, 2.4, 14, stoneMat);
  b.addPortal(
    'return-downtown-bridge',
    'State Street & Bluff Park',
    'Return to Downtown St. Joseph',
    'downtown',
    [8, 1.5, -26],
    0,
    1.2,
    47,
    0,
    0xffd166
  );

  // Bobbing Great Lakes Cargo Barge 1 (South channel crossing)
  const barge1 = createCargoBarge(tex.rivetedSteel);
  b.addMovingBox(-4, -0.4, 26, 6.6, 1.8, 11.2, steelMat, 'oscillateY', 0.65, 1.5, 0, undefined, undefined, undefined, barge1);

  const barge2 = createCargoBarge(tex.rivetedSteel);
  b.addMovingBox(6, 0.2, 16, 6.6, 1.8, 11.2, steelMat, 'oscillateX', 3.4, 1.1, 1.2, undefined, undefined, undefined, barge2);

  // Central Concrete Swing-Bridge Pier Island (Z = 0)
  b.addStaticBox(0, 0.4, 0, 12, 3.0, 12, stoneMat);

  // Iconic Riveted Steel Pratt-Truss Swing Bridge Span!
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 2.2, 0);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.6, 26), steelMat);
  deck.castShadow = true;
  deck.receiveShadow = true;
  bridgeGroup.add(deck);

  // Overhead steel truss beams
  for (const sx of [-3.0, 3.0]) {
    const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 22), redSteel);
    topChord.position.set(sx, 5.2, 0);
    bridgeGroup.add(topChord);
    for (let z = -10; z <= 10; z += 5) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.2, 0.36), redSteel);
      post.position.set(sx, 2.6, z);
      bridgeGroup.add(post);
    }
  }
  // Upper truss walkway platform (climbable!)
  const trussWalk = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 10), steelMat);
  trussWalk.position.set(0, 5.4, 0);
  trussWalk.castShadow = true;
  trussWalk.receiveShadow = true;
  bridgeGroup.add(trussWalk);
  b.root.add(bridgeGroup);

  // Static deck + bouncy harbor crate/bumper to leap onto the upper truss
  b.addColliderOnly(0, 2.2, 0, 6.4, 0.7, 25.5);
  b.addStaticBox(4.4, 3.2, 3.8, 2.8, 1.0, 2.8, redSteel, 18.0);
  b.addColliderOnly(0, 7.6, 0, 5.8, 0.6, 10.2);

  // ARTIFACT 5: Copper Magneto Coil atop the Steel Swing Bridge Truss!
  b.addArtifact('magneto-coil', 0, 9.6, 0);

  // North Harbor Wharf & Grain Silo Overlook (Z = -26..-44)
  b.addStaticBox(0, 0.5, -27, 20, 2.6, 18, stoneMat);

  // Twin St. Joseph Harbor Silos + Catwalk
  for (const sx of [-5.5, 5.5]) {
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 9.5, 14), siloMat);
    silo.position.set(sx, 6.4, -33);
    silo.castShadow = true;
    silo.receiveShadow = true;
    b.root.add(silo);
    b.addColliderOnly(sx, 6.4, -33, 6.6, 9.5, 6.6);
  }
  // Timber ramp & moving crane platform up to the Silo Overlook Catwalk
  b.addMovingBox(-10.5, 5.2, -26, 4.4, 0.65, 4.4, timberMat, 'oscillateY', 3.4, 1.35, 0);
  b.addStaticBox(0, 11.2, -33, 14.5, 0.6, 5.2, steelMat);

  // ARTIFACT 6: Harbor Star Compass atop the Harbor Silo Catwalk!
  b.addArtifact('star-compass', 0, 13.2, -33);

  // 15 Gems across river barges, swing bridge, wharf, and silo overlook
  const bridgeGems: Array<[number, number, number]> = [
    [0, 2.3, 36],
    [-4, 3.2, 29],
    [-4, 3.2, 23],
    [6, 3.4, 16],
    [0, 3.6, 9],
    [0, 3.6, 3],
    [0, 3.6, -4],
    [0, 3.6, -10],
    [0, 9.1, -3],
    [0, 9.1, 3],
    [-6, 2.8, -22],
    [6, 2.8, -22],
    [-10.5, 8.8, -26],
    [-5.5, 12.6, -33],
    [5.5, 12.6, -33],
  ];
  bridgeGems.forEach(([x, y, z], i) => b.addGem(`br-gem-${i}`, x, y, z, i + 3));

  b.addCrate('br-crate-1', -4.5, 1.2, 38, false);
  b.addCrate('br-crate-2', 5.5, 1.8, -24, true);
  b.addBrazier('br-brazier-1', -5.5, 1.2, 38);
  b.addBrazier('br-brazier-2', 0, 1.8, -22);

  b.addHazard('br-drone-1', 'buoy-drone', 0, 2.6, -6, 3.2, 1.5);
  b.addHazard('br-crab-1', 'crab', 0, 1.8, -25, 5.8, 1.6);

  return {
    id: 'swing_bridge',
    root: b.root,
    spawn: new THREE.Vector3(0, 2.5, 41),
    spawnYaw: Math.PI,
    platforms: b.platforms,
    portals: b.portals,
    gems: b.gems,
    artifacts: b.artifacts,
    crates: b.crates,
    braziers: b.braziers,
    hazards: b.hazards,
    waterMesh,
    animatedProps: b.animatedProps,
    disposables: b.disposables,
  };
}
