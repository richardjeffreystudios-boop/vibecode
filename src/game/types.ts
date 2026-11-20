import * as THREE from 'three';

export type RealmId = 'downtown' | 'north_pier' | 'silver_beach' | 'swing_bridge';

export type GameMode = 'title' | 'playing' | 'paused' | 'warping' | 'victory';

export interface ArtifactDefinition {
  id: string;
  name: string;
  landmark: string;
  realm: RealmId;
  description: string;
  accentHex: number;
  accentCss: string;
}

export const ARTIFACT_CATALOG: ArtifactDefinition[] = [
  {
    id: 'fresnel-prism',
    name: 'Fresnel Prism Core',
    landmark: 'North Pier Inner Light',
    realm: 'north_pier',
    description: 'Cut flint-glass lens heart that focuses the harbor beam miles across Lake Michigan.',
    accentHex: 0xffd166,
    accentCss: '#ffd166',
  },
  {
    id: 'foghorn-reed',
    name: 'Brass Foghorn Reed',
    landmark: 'North Pier Outer Light',
    realm: 'north_pier',
    description: 'Resonant diaphone reed from the 1906 steel outer tower at the end of the catwalk.',
    accentHex: 0xf4a261,
    accentCss: '#f4a261',
  },
  {
    id: 'carousel-gear',
    name: 'Clockwork Gearwheel',
    landmark: 'Silver Beach Carousel',
    realm: 'silver_beach',
    description: 'Hand-milled brass drive gear salvaged from the pavilion canopy above the carousel.',
    accentHex: 0x38bdf8,
    accentCss: '#38bdf8',
  },
  {
    id: 'amber-ring',
    name: 'Amber Lens Ring',
    landmark: 'Shadowland Sand Rampart',
    realm: 'silver_beach',
    description: 'Warm amber storm filter hidden atop the sunlit dunes beside Silver Beach.',
    accentHex: 0xf59e0b,
    accentCss: '#f59e0b',
  },
  {
    id: 'magneto-coil',
    name: 'Copper Magneto Coil',
    landmark: 'St. Joseph Swing Bridge',
    realm: 'swing_bridge',
    description: 'Wound maritime copper coil powering the rotating lighthouse lantern carriage.',
    accentHex: 0x34d399,
    accentCss: '#34d399',
  },
  {
    id: 'star-compass',
    name: 'Harbor Star Compass',
    landmark: 'River Silo Overlook',
    realm: 'swing_bridge',
    description: 'Gilded Great Lakes navigational astrolabe overlooking the St. Joseph River channel.',
    accentHex: 0xfb7185,
    accentCss: '#fb7185',
  },
];

export const REALM_META: Record<
  RealmId,
  {
    title: string;
    subtitle: string;
    skyTop: number;
    skyBottom: number;
    fogColor: number;
    fogDensity: number;
    waterY: number;
    waterColor: number;
  }
> = {
  downtown: {
    title: 'State Street & Bluff Park',
    subtitle: 'Downtown St. Joseph Hub',
    skyTop: 0x1a4d7c,
    skyBottom: 0xf3b884,
    fogColor: 0xe6c3a1,
    fogDensity: 0.0046,
    waterY: -4.2,
    waterColor: 0x125b82,
  },
  north_pier: {
    title: 'North Pier & Twin Lighthouses',
    subtitle: 'Lake Michigan Breakwater Realm',
    skyTop: 0x15416e,
    skyBottom: 0xf6a96c,
    fogColor: 0xe5b28b,
    fogDensity: 0.0042,
    waterY: -0.6,
    waterColor: 0x0d547c,
  },
  silver_beach: {
    title: 'Silver Beach & Carousel',
    subtitle: 'Lakefront Dunes Realm',
    skyTop: 0x2675b5,
    skyBottom: 0xfbe0a8,
    fogColor: 0xeed9b7,
    fogDensity: 0.0044,
    waterY: -0.8,
    waterColor: 0x177c9d,
  },
  swing_bridge: {
    title: 'St. Joseph River & Swing Bridge',
    subtitle: 'Harbor Channel Realm',
    skyTop: 0x1d3c63,
    skyBottom: 0xe7986a,
    fogColor: 0xd9a180,
    fogDensity: 0.0045,
    waterY: -1.0,
    waterColor: 0x144864,
  },
};

export interface PlatformBox {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  bouncy?: number; // upward launch velocity if bouncy awning/umbrella/buoy
  moving?: {
    mesh: THREE.Object3D;
    baseX: number;
    baseY: number;
    baseZ: number;
    halfX: number;
    halfY: number;
    halfZ: number;
    mode: 'oscillateY' | 'oscillateX' | 'oscillateZ' | 'orbit';
    amp: number;
    speed: number;
    phase: number;
    orbitCenterX?: number;
    orbitCenterZ?: number;
    orbitRadius?: number;
    prevX: number;
    prevY: number;
    prevZ: number;
  };
}

export interface PortalEntity {
  id: string;
  label: string;
  subtitle: string;
  targetRealm: RealmId;
  targetSpawn: [number, number, number];
  position: THREE.Vector3;
  rotationY: number;
  radius: number;
  accentHex: number;
  vortexMat: THREE.ShaderMaterial;
  ringMesh: THREE.Object3D;
}

export interface GemEntity {
  id: string;
  value: number;
  position: THREE.Vector3;
  baseY: number;
  mesh: THREE.Object3D;
  collected: boolean;
  magnetized: boolean;
  phase: number;
}

export interface ArtifactEntity {
  def: ArtifactDefinition;
  position: THREE.Vector3;
  baseY: number;
  mesh: THREE.Object3D;
  beamMesh: THREE.Mesh;
  collected: boolean;
}

export interface CrateEntity {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Object3D;
  broken: boolean;
  armored: boolean; // true requires flame breath, false broken by charge or flame
  gemCount: number;
}

export interface BrazierEntity {
  id: string;
  position: THREE.Vector3;
  flameMesh: THREE.Object3D;
  light: THREE.PointLight;
  lit: boolean;
}

export interface HazardEntity {
  id: string;
  kind: 'crab' | 'buoy-drone';
  home: THREE.Vector3;
  position: THREE.Vector3;
  patrolRadius: number;
  speed: number;
  phase: number;
  mesh: THREE.Object3D;
  defeated: boolean;
  respawnTimer: number;
  telegraphTimer: number;
}

export interface RealmInstance {
  id: RealmId;
  root: THREE.Group;
  spawn: THREE.Vector3;
  spawnYaw: number;
  platforms: PlatformBox[];
  portals: PortalEntity[];
  gems: GemEntity[];
  artifacts: ArtifactEntity[];
  crates: CrateEntity[];
  braziers: BrazierEntity[];
  hazards: HazardEntity[];
  waterMesh: THREE.Mesh;
  carouselDeck?: THREE.Object3D;
  swingBridgeSpan?: {
    mesh: THREE.Object3D;
    pivotX: number;
    pivotZ: number;
    halfLength: number;
    halfWidth: number;
    topY: number;
    angle: number;
  };
  beaconBeam?: THREE.Object3D;
  beaconSlots?: THREE.Mesh[];
  lanternGlowMesh?: THREE.Mesh;
  animatedProps: Array<{
    update: (elapsed: number, dt: number) => void;
  }>;
  disposables: Array<{ dispose: () => void }>;
}

export interface HudSnapshot {
  mode: GameMode;
  realmId: RealmId;
  realmTitle: string;
  realmSubtitle: string;
  collectedArtifactIds: string[];
  collectedGemCount: number;
  totalGemCount: number;
  health: number; // 1..3 firefly shield
  maxHealth: number;
  elapsedSeconds: number;
  isCharging: boolean;
  isGliding: boolean;
  isFlaming: boolean;
  nearbyPrompt: {
    title: string;
    subtitle: string;
    kind: 'portal' | 'beacon' | 'hint';
  } | null;
  bannerToast: {
    title: string;
    subtitle: string;
    accentCss: string;
  } | null;
  compassAngleDeg: number | null; // relative to camera facing
  compassLabel: string | null;
  muted: boolean;
  hasSavedProgress: boolean;
  realmArtifactCounts: Record<RealmId, { collected: number; total: number }>;
}
