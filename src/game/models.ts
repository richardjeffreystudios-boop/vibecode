import * as THREE from 'three';
import { ArtifactDefinition } from './types';

export interface DragonRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Mesh[];
  flameCone: THREE.Mesh;
  chargeAura: THREE.Mesh;
  firefly: THREE.Group;
  fireflyLight: THREE.PointLight;
  fireflyMat: THREE.MeshStandardMaterial;
  shadowPlane: THREE.Mesh;
}

/**
 * Pip — The St. Joseph Harbor Dragonet (Spyro-inspired composite 12+ part model)
 * Cobalt-indigo scales, golden belly plates, brass harbor collar, articulated flapping wings.
 */
export function createDragonHero(shadowTex: THREE.CanvasTexture): DragonRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.62;
  root.add(body);

  const scaleMat = new THREE.MeshStandardMaterial({
    color: 0x3b4fd8,
    roughness: 0.36,
    metalness: 0.14,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xf4b942,
    roughness: 0.48,
    metalness: 0.12,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xf6d365,
    roughness: 0.25,
    metalness: 0.55,
  });
  const wingMembraneMat = new THREE.MeshStandardMaterial({
    color: 0xe6843c,
    roughness: 0.52,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd9a13b,
    roughness: 0.22,
    metalness: 0.85,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x0e1726,
    roughness: 0.12,
  });

  // Primary torso (sculpted tapered capsule-like form)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.58, 8, 14), scaleMat);
  torso.rotation.x = Math.PI / 2;
  torso.castShadow = true;
  body.add(torso);

  // Golden belly breastplate
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), bellyMat);
  belly.scale.set(0.9, 0.72, 1.38);
  belly.position.set(0, -0.11, 0.05);
  body.add(belly);

  // Brass harbor collar + lighthouse charm
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 18), brassMat);
  collar.position.set(0, 0.1, 0.36);
  collar.rotation.x = Math.PI / 2.4;
  body.add(collar);

  // Dorsal crest spines along back
  for (let i = 0; i < 4; i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 5), hornMat);
    spine.position.set(0, 0.34 - i * 0.02, 0.18 - i * 0.22);
    spine.rotation.x = -0.35;
    body.add(spine);
  }

  // Articulated head group
  const head = new THREE.Group();
  head.position.set(0, 0.32, 0.48);
  body.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12), scaleMat);
  cranium.scale.set(0.95, 0.92, 1.05);
  cranium.castShadow = true;
  head.add(cranium);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.38), scaleMat);
  snout.position.set(0, -0.05, 0.27);
  snout.castShadow = true;
  head.add(snout);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.32), bellyMat);
  jaw.position.set(0, -0.14, 0.24);
  head.add(jaw);

  // Twin swept golden horns
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.44, 7), hornMat);
    horn.position.set(side * 0.15, 0.24, -0.08);
    horn.rotation.set(-0.62, 0, -side * 0.24);
    horn.castShadow = true;
    head.add(horn);

    // Expressive eyes
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 10), eyeWhiteMat);
    eye.position.set(side * 0.17, 0.07, 0.17);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 8), pupilMat);
    pupil.position.set(side * 0.19, 0.07, 0.23);
    head.add(pupil);
  }

  // Head crest fin
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 4), hornMat);
  crest.position.set(0, 0.26, 0.02);
  crest.rotation.x = -0.35;
  head.add(crest);

  // Flame breath volumetric cone (toggled during flame breath)
  const flameGeo = new THREE.ConeGeometry(0.68, 2.8, 12, 1, true);
  flameGeo.translate(0, 1.4, 0);
  flameGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xffa62b,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const flameCone = new THREE.Mesh(flameGeo, flameMat);
  flameCone.position.set(0, -0.04, 0.46);
  flameCone.visible = false;
  head.add(flameCone);

  // Horn-charge forward wind aura
  const auraGeo = new THREE.ConeGeometry(0.76, 1.85, 14, 1, true);
  auraGeo.rotateX(-Math.PI / 2);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffe082,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const chargeAura = new THREE.Mesh(auraGeo, auraMat);
  chargeAura.position.set(0, 0.1, 0.6);
  chargeAura.visible = false;
  body.add(chargeAura);

  // Articulated flapping wings (Extrude/Shape membrane + leading spar)
  const makeWing = (side: number) => {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(side * 0.26, 0.2, 0.05);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(side * 0.92, 0.28);
    shape.lineTo(side * 0.74, -0.36);
    shape.quadraticCurveTo(side * 0.42, -0.22, side * 0.36, -0.44);
    shape.quadraticCurveTo(side * 0.14, -0.25, 0, -0.32);
    shape.closePath();

    const membrane = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMembraneMat);
    membrane.rotation.x = Math.PI / 2.2;
    wingGroup.add(membrane);

    const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.048, 0.96, 6), scaleMat);
    spar.rotation.z = -side * (Math.PI / 2 - 0.28);
    spar.position.set(side * 0.46, 0.14, 0);
    wingGroup.add(spar);

    return wingGroup;
  };
  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  body.add(leftWing);
  body.add(rightWing);

  // 4 animated legs
  const legs: THREE.Mesh[] = [];
  const legPositions: [number, number, number][] = [
    [-0.22, -0.34, 0.26],
    [0.22, -0.34, 0.26],
    [-0.24, -0.34, -0.28],
    [0.24, -0.34, -0.28],
  ];
  for (const [lx, ly, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.46, 7), scaleMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    body.add(leg);
    legs.push(leg);
  }

  // Segmented tail with golden spade tip
  const tail = new THREE.Group();
  tail.position.set(0, -0.02, -0.46);
  body.add(tail);
  const tailSeg = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.95, 8), scaleMat);
  tailSeg.rotation.x = -Math.PI / 2 + 0.16;
  tailSeg.position.set(0, 0.06, -0.44);
  tail.add(tailSeg);
  const tailSpade = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), hornMat);
  tailSpade.scale.set(1.15, 0.42, 1.4);
  tailSpade.position.set(0, 0.14, -0.94);
  tail.add(tailSpade);

  // Orbiting Beacon Firefly companion (Sparx-style health indicator)
  const firefly = new THREE.Group();
  const fireflyMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xffc300,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const flyCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), fireflyMat);
  firefly.add(flyCore);
  const flyWingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  for (const s of [-1, 1]) {
    const fw = new THREE.Mesh(new THREE.CircleGeometry(0.1, 6), flyWingMat);
    fw.position.set(s * 0.12, 0.06, 0);
    fw.rotation.y = s * 0.5;
    firefly.add(fw);
  }
  const fireflyLight = new THREE.PointLight(0xffd166, 2.2, 6.5, 2);
  firefly.add(fireflyLight);
  firefly.position.set(0.85, 1.35, -0.35);
  root.add(firefly);

  // Ground contact shadow plane directly beneath Pip
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.03;
  root.add(shadowPlane);

  return {
    root,
    body,
    head,
    leftWing,
    rightWing,
    tail,
    legs,
    flameCone,
    chargeAura,
    firefly,
    fireflyLight,
    fireflyMat,
    shadowPlane,
  };
}

/**
 * Spyro-style ornate St. Joseph stone-and-brass Portal Archway with swirling GLSL vortex shader.
 */
export function createPortalGate(
  accentHex: number
): { group: THREE.Group; vortexMat: THREE.ShaderMaterial; ringMesh: THREE.Mesh } {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xd9cfc1,
    roughness: 0.78,
    metalness: 0.06,
  });
  const trimBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd49b38,
    roughness: 0.24,
    metalness: 0.85,
  });
  const stepMat = new THREE.MeshStandardMaterial({
    color: 0x8e867a,
    roughness: 0.85,
  });

  // Base stone plinth (bottom-center pivot)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.55, 2.4), stepMat);
  plinth.position.y = 0.275;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);

  // Twin carved stone pillars with brass capitals
  for (const s of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 5.2, 1.35), stoneMat);
    pillar.position.set(s * 2.55, 3.1, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.38, 1.55), trimBrassMat);
    cap.position.set(s * 2.55, 5.8, 0);
    cap.castShadow = true;
    group.add(cap);

    // Harbor lantern sconce atop each pillar
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.56, 6),
      new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 1.6,
        roughness: 0.2,
      })
    );
    lantern.position.set(s * 2.55, 6.26, 0);
    group.add(lantern);
  }

  // Semicircular limestone arch crown
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.52, 10, 24, Math.PI), stoneMat);
  arch.position.set(0, 5.55, 0);
  arch.castShadow = true;
  group.add(arch);

  // Rotating outer brass rune ring
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.14, 8, 32), trimBrassMat);
  ringMesh.position.set(0, 3.35, 0);
  group.add(ringMesh);

  // Keystone emblem at apex
  const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), trimBrassMat);
  keystone.position.set(0, 8.15, 0.18);
  group.add(keystone);

  // Animated swirling GLSL portal vortex disc
  const accentColor = new THREE.Color(accentHex);
  const vortexMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: accentColor },
      uColorB: { value: new THREE.Color(0x0b2540) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float swirl = sin(a * 5.0 - r * 11.0 + uTime * 3.4) * 0.5 + 0.5;
        float rings = sin(r * 16.0 - uTime * 4.5) * 0.5 + 0.5;
        float core = smoothstep(0.55, 0.0, r);
        vec3 col = mix(uColorB, uColorA, swirl * 0.65 + rings * 0.35);
        col += vec3(1.0, 0.94, 0.78) * core * 0.65;
        float edgeAlpha = smoothstep(1.0, 0.82, r) * 0.92;
        gl_FragColor = vec4(col, edgeAlpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const vortexDisc = new THREE.Mesh(new THREE.CircleGeometry(2.18, 28), vortexMat);
  vortexDisc.position.set(0, 3.35, 0);
  group.add(vortexDisc);

  return { group, vortexMat, ringMesh };
}

/**
 * Iconic St. Joseph North Pier Inner / Outer Lighthouse (composite 9-part red-roofed white tower).
 */
export function createLighthouseTower(
  scale = 1,
  isOuter = false,
  includeBeam = true
): { group: THREE.Group; lanternGlow: THREE.Mesh; beamPivot?: THREE.Group } {
  const group = new THREE.Group();

  const whiteSteel = new THREE.MeshStandardMaterial({
    color: 0xf4f0e8,
    roughness: 0.42,
    metalness: 0.15,
  });
  const crimsonMat = new THREE.MeshStandardMaterial({
    color: 0xc23628,
    roughness: 0.36,
    metalness: 0.25,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x8a8c8b,
    roughness: 0.85,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x26313c,
    roughness: 0.35,
    metalness: 0.8,
  });

  // Foundation pier crib
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 2.2, 8), concreteMat);
  base.position.y = 1.1;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Main tower shaft (Inner is taller octagonal; Outer is stout cylindrical)
  const shaftHeight = isOuter ? 8.2 : 12.6;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 2.25, shaftHeight, isOuter ? 14 : 8),
    whiteSteel
  );
  shaft.position.y = 2.2 + shaftHeight * 0.5;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  // Iconic crimson entry doorway & tower windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.85, 0.35), crimsonMat);
  door.position.set(0, 3.15, 2.15);
  group.add(door);

  const winMat = new THREE.MeshStandardMaterial({
    color: 0x1b374f,
    roughness: 0.15,
    metalness: 0.4,
  });
  for (let i = 0; i < 2; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.25), winMat);
    win.position.set(0, 6.2 + i * 3.0, 1.85 - i * 0.18);
    group.add(win);
  }

  // Crimson gallery deck
  const deckY = 2.2 + shaftHeight;
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.05, 0.48, 12), crimsonMat);
  gallery.position.y = deckY + 0.24;
  gallery.castShadow = true;
  group.add(gallery);

  // Iron railing posts around gallery
  const railRing = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.055, 6, 18), ironMat);
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = deckY + 1.05;
  group.add(railRing);

  // Lantern room glowing Fresnel housing
  const lanternGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 1.22, 2.1, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xffc857,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.1,
    })
  );
  lanternGlow.position.y = deckY + 1.5;
  group.add(lanternGlow);

  // Lantern mullions
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const mullion = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.15, 5), crimsonMat);
    mullion.position.set(Math.cos(a) * 1.26, deckY + 1.5, Math.sin(a) * 1.26);
    group.add(mullion);
  }

  // Crimson conical roof + brass lightning finial
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.88, 2.35, 12), crimsonMat);
  roof.position.y = deckY + 3.68;
  roof.castShadow = true;
  group.add(roof);

  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf4be4a, roughness: 0.2, metalness: 0.9 })
  );
  finial.position.y = deckY + 4.95;
  group.add(finial);

  let beamPivot: THREE.Group | undefined;
  if (includeBeam) {
    beamPivot = new THREE.Group();
    beamPivot.position.y = deckY + 1.5;
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffe89e,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const dir of [-1, 1]) {
      const coneGeo = new THREE.ConeGeometry(5.5, 42, 16, 1, true);
      coneGeo.translate(0, -21, 0);
      coneGeo.rotateZ(dir * (Math.PI / 2));
      const cone = new THREE.Mesh(coneGeo, beamMat);
      beamPivot.add(cone);
    }
    group.add(beamPivot);
  }

  group.scale.setScalar(scale);
  return { group, lanternGlow, beamPivot };
}

/**
 * Historic 19th-century State Street brick storefront with stepped cornice & striped awning.
 */
export function createStorefrontBuilding(
  width: number,
  height: number,
  depth: number,
  facadeTex: THREE.CanvasTexture,
  awningTex: THREE.CanvasTexture,
  hasAwning = true
): THREE.Group {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    roughness: 0.78,
    metalness: 0.04,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x454a52,
    roughness: 0.88,
  });
  const corniceMat = new THREE.MeshStandardMaterial({
    color: 0xe3d6c1,
    roughness: 0.62,
  });

  // Main brick mass
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  body.position.y = height * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Flat rooftop deck + parapet cornice
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.45, 0.55, depth + 0.45),
    corniceMat
  );
  cornice.position.y = height + 0.22;
  cornice.castShadow = true;
  cornice.receiveShadow = true;
  group.add(cornice);

  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.5, 0.16, depth - 0.5),
    roofMat
  );
  roofCap.position.y = height + 0.48;
  roofCap.receiveShadow = true;
  group.add(roofCap);

  // Decorative rooftop chimney / skylight detail
  const skylight = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.34, 0.7, depth * 0.32),
    corniceMat
  );
  skylight.position.set(0, height + 0.85, 0);
  group.add(skylight);

  // Striped bouncy shopfront awning
  if (hasAwning) {
    const awningMat = new THREE.MeshStandardMaterial({
      map: awningTex,
      roughness: 0.55,
      metalness: 0.05,
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.36, 2.5), awningMat);
    awning.position.set(0, 3.15, depth * 0.5 + 1.25);
    awning.rotation.x = 0.18;
    awning.castShadow = true;
    awning.receiveShadow = true;
    group.add(awning);
  }

  return group;
}

/**
 * Maid of the Mist Fountain — iconic Lake Bluff Park tiered landmark.
 */
export function createMaidOfMistFountain(): { group: THREE.Group; waterRing: THREE.Mesh } {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xd7cfc2,
    roughness: 0.72,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x3b6b64,
    roughness: 0.36,
    metalness: 0.72,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x4cc9f0,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
  });

  // Outer basin rim
  const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.65, 0.9, 20), stoneMat);
  outerWall.position.y = 0.45;
  outerWall.receiveShadow = true;
  outerWall.castShadow = true;
  group.add(outerWall);

  const basinWater = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.25, 20), waterMat);
  basinWater.position.y = 0.82;
  group.add(basinWater);

  // Mid pedestal & upper bowl (platformable tiers!)
  const midPillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 1.8, 12), stoneMat);
  midPillar.position.y = 1.6;
  midPillar.castShadow = true;
  group.add(midPillar);

  const midBowl = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 1.4, 0.55, 16), stoneMat);
  midBowl.position.y = 2.65;
  midBowl.castShadow = true;
  midBowl.receiveShadow = true;
  group.add(midBowl);

  // Patinated bronze statue silhouette
  const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 2.2, 10), bronzeMat);
  statue.position.y = 3.95;
  statue.castShadow = true;
  group.add(statue);

  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), bronzeMat);
  crown.position.y = 5.25;
  group.add(crown);

  // Animated splash ring
  const waterRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.25, 0.14, 8, 24),
    new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.72,
    })
  );
  waterRing.rotation.x = Math.PI / 2;
  waterRing.position.y = 2.95;
  group.add(waterRing);

  return { group, waterRing };
}

/**
 * John E.N. Howard Bandshell in Lake Bluff Park.
 */
export function createBluffBandshell(): THREE.Group {
  const group = new THREE.Group();

  const plasterMat = new THREE.MeshStandardMaterial({
    color: 0xf0eadf,
    roughness: 0.65,
  });
  const stageWood = new THREE.MeshStandardMaterial({
    color: 0x855e3c,
    roughness: 0.72,
  });
  const accentBlue = new THREE.MeshStandardMaterial({
    color: 0x1d4f78,
    roughness: 0.45,
  });

  // Elevated semicircular stage
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.9, 1.2, 18, 1, false, 0, Math.PI), stageWood);
  stage.position.y = 0.6;
  stage.rotation.y = -Math.PI / 2;
  stage.castShadow = true;
  stage.receiveShadow = true;
  group.add(stage);

  // Stepped acoustic shell ribs
  for (let i = 0; i < 3; i++) {
    const r = 5.2 - i * 1.1;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.42, 10, 24, Math.PI),
      i === 0 ? accentBlue : plasterMat
    );
    arch.position.set(0, 1.2, -0.5 - i * 1.35);
    arch.castShadow = true;
    group.add(arch);
  }

  // Back dome enclosure
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(4.8, 16, 12, 0, Math.PI, 0, Math.PI * 0.5),
    plasterMat
  );
  dome.position.set(0, 1.2, -0.4);
  dome.rotation.y = Math.PI;
  dome.castShadow = true;
  group.add(dome);

  return group;
}

/**
 * Silver Beach Carousel Pavilion — iconic octagonal cupola + rotating carousel deck with painted horses!
 */
export function createCarouselPavilion(
  stripeTex: THREE.CanvasTexture
): { group: THREE.Group; rotatingDeck: THREE.Group } {
  const group = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({ color: 0xb08a62, roughness: 0.68 });
  const roofMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.52 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xe6b44c, roughness: 0.22, metalness: 0.85 });
  const whiteTrim = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.48 });

  // Outer pavilion base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.2, 0.8, 16), whiteTrim);
  base.position.y = 0.4;
  base.receiveShadow = true;
  group.add(base);

  // 8 perimeter columns
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 6.2, 8), whiteTrim);
    col.position.set(Math.cos(a) * 8.1, 3.9, Math.sin(a) * 8.1);
    col.castShadow = true;
    group.add(col);
  }

  // Striped conical pavilion roof (platformable rooftop!)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.6, 3.8, 16), roofMat);
  roof.position.y = 8.9;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Golden cupola finial platform
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 1.1, 12), brassMat);
  cupola.position.y = 10.6;
  cupola.castShadow = true;
  cupola.receiveShadow = true;
  group.add(cupola);

  // Rotating inner carousel platform with stylized carousel horses
  const rotatingDeck = new THREE.Group();
  rotatingDeck.position.y = 1.05;
  group.add(rotatingDeck);

  const deckMesh = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.45, 24), floorMat);
  deckMesh.receiveShadow = true;
  rotatingDeck.add(deckMesh);

  const centerDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 5.8, 12), brassMat);
  centerDrum.position.y = 2.9;
  rotatingDeck.add(centerDrum);

  const horseColors = [0xd9483b, 0x2b7a9b, 0xf2b73b, 0x7c4dff, 0x2e9e6f, 0xe86d8a];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 4.9;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.4, 6), brassMat);
    pole.position.set(Math.cos(a) * r, 2.7, Math.sin(a) * r);
    rotatingDeck.add(pole);

    const horse = new THREE.Group();
    const hMat = new THREE.MeshStandardMaterial({ color: horseColors[i], roughness: 0.35, metalness: 0.12 });
    const hBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 1.35), hMat);
    horse.add(hBody);
    const hNeck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.68, 0.38), hMat);
    hNeck.position.set(0, 0.45, 0.46);
    hNeck.rotation.x = 0.28;
    horse.add(hNeck);
    horse.position.set(Math.cos(a) * r, 1.5 + (i % 2) * 0.45, Math.sin(a) * r);
    horse.rotation.y = -a;
    rotatingDeck.add(horse);
  }

  return { group, rotatingDeck };
}

/**
 * Multi-tier Lake Michigan pine / autumn maple tree (bottom-center pivot).
 */
export function createLakeTree(variant: 'pine' | 'maple'): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3e2b, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 2.6, 7), trunkMat);
  trunk.position.y = 1.3;
  trunk.castShadow = true;
  group.add(trunk);

  if (variant === 'pine') {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x285c42, roughness: 0.78 });
    for (let i = 0; i < 3; i++) {
      const tier = new THREE.Mesh(new THREE.ConeGeometry(1.9 - i * 0.4, 2.4 - i * 0.25, 8), leafMat);
      tier.position.y = 2.7 + i * 1.45;
      tier.castShadow = true;
      group.add(tier);
    }
  } else {
    const autumnMat = new THREE.MeshStandardMaterial({ color: 0xc96c32, roughness: 0.72 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xe39e38, roughness: 0.72 });
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55, 0), autumnMat);
    c1.position.set(0, 3.6, 0);
    c1.castShadow = true;
    group.add(c1);
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), goldMat);
    c2.position.set(0.85, 3.1, 0.55);
    c2.castShadow = true;
    group.add(c2);
    const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), autumnMat);
    c3.position.set(-0.75, 3.2, -0.45);
    c3.castShadow = true;
    group.add(c3);
  }
  return group;
}

/**
 * Vintage State Street wrought-iron harbor lamppost.
 */
export function createLamppost(): THREE.Group {
  const group = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.38, metalness: 0.75 });
  const bulb = new THREE.MeshStandardMaterial({
    color: 0xfff0c2,
    emissive: 0xffc663,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.7, 8), iron);
  base.position.y = 0.35;
  group.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.1, 8), iron);
  pole.position.y = 2.55;
  pole.castShadow = true;
  group.add(pole);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), bulb);
  globe.position.y = 4.78;
  group.add(globe);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.3, 8), iron);
  cap.position.y = 5.15;
  group.add(cap);

  return group;
}

/**
 * Lost Lighthouse Artifact (distinct multi-part rotating golden/crystal relic + vertical locator shimmer).
 */
export function createArtifactMesh(def: ArtifactDefinition): { group: THREE.Group; beamMesh: THREE.Mesh } {
  const group = new THREE.Group();

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4c44e,
    emissive: 0x8a5a00,
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.9,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: def.accentHex,
    emissive: def.accentHex,
    emissiveIntensity: 0.9,
    roughness: 0.12,
    metalness: 0.2,
  });

  // Ornate core shape
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), crystalMat);
  group.add(core);

  // Twin interlocking gyroscopic brass rings
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.08, 8, 24), goldMat);
  group.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.06, 8, 24), goldMat);
  ring2.rotation.x = Math.PI / 2;
  group.add(ring2);

  // Subtle vertical sky beacon shimmer so players spot artifacts across landmarks
  const beamGeo = new THREE.CylinderGeometry(0.18, 0.85, 16, 12, 1, true);
  beamGeo.translate(0, 8, 0);
  const beamMesh = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: def.accentHex,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  group.add(beamMesh);

  return { group, beamMesh };
}

/**
 * Faceted Lake Glass Gem collectible (Spyro-style shimmering crystal).
 */
export function createGemMesh(colorHex: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.42,
    roughness: 0.14,
    metalness: 0.3,
    flatShading: true,
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), mat);
  gem.scale.set(0.82, 1.32, 0.82);
  gem.castShadow = true;
  group.add(gem);
  return group;
}

/**
 * Breakable harbor crate (wood = horn-charge or flame; iron-bound chest = flame breath!).
 */
export function createCrateMesh(armored: boolean): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: armored ? 0x3b4d5e : 0x9c6b3f,
    roughness: armored ? 0.35 : 0.78,
    metalness: armored ? 0.72 : 0.06,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: armored ? 0xe6b44c : 0x5c3c22,
    roughness: armored ? 0.25 : 0.75,
    metalness: armored ? 0.85 : 0.15,
  });

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), bodyMat);
  box.position.y = 0.625;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  const band1 = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 1.32), trimMat);
  band1.position.y = 0.22;
  group.add(band1);
  const band2 = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 1.32), trimMat);
  band2.position.y = 1.02;
  group.add(band2);

  if (armored) {
    // Glowing keyhole hint showing flame can melt/open it
    const emblem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: 0xff9f1c,
        emissive: 0xff7b00,
        emissiveIntensity: 1.4,
      })
    );
    emblem.position.set(0, 0.65, 0.66);
    group.add(emblem);
  }
  return group;
}

/**
 * Harbor Lighthouse Brazier — light with Beacon Flame (`E`) for bonus gems & shield heal.
 */
export function createBrazierMesh(): { group: THREE.Group; flameMesh: THREE.Group; light: THREE.PointLight } {
  const group = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x26313a, roughness: 0.4, metalness: 0.78 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd69f3b, roughness: 0.28, metalness: 0.85 });

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.56, 1.1, 8), iron);
  stand.position.y = 0.55;
  stand.castShadow = true;
  group.add(stand);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.42, 0.48, 10), brass);
  bowl.position.y = 1.28;
  bowl.castShadow = true;
  group.add(bowl);

  const flameMesh = new THREE.Group();
  flameMesh.position.y = 1.62;
  const fOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 1.25, 8),
    new THREE.MeshBasicMaterial({ color: 0xff8811, transparent: true, opacity: 0.9 })
  );
  fOuter.position.y = 0.55;
  flameMesh.add(fOuter);
  const fInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.82, 7),
    new THREE.MeshBasicMaterial({ color: 0xfff3a3 })
  );
  fInner.position.y = 0.42;
  flameMesh.add(fInner);
  flameMesh.visible = false;
  group.add(flameMesh);

  const light = new THREE.PointLight(0xffa93a, 0, 12, 2);
  light.position.y = 2.2;
  group.add(light);

  return { group, flameMesh, light };
}

/**
 * Patrolling Harbor Pincher Crab hazard (knock out with Horn Charge or Flame).
 */
export function createHarborCrab(): THREE.Group {
  const group = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xc93b2b, roughness: 0.35, metalness: 0.25 });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0xe86a33, roughness: 0.42, metalness: 0.18 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffe45e, emissive: 0xffb703, emissiveIntensity: 0.8 });

  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), shellMat);
  shell.scale.set(1.2, 0.62, 0.92);
  shell.position.y = 0.56;
  shell.castShadow = true;
  group.add(shell);

  for (const s of [-1, 1]) {
    const claw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.58), clawMat);
    claw.position.set(s * 0.68, 0.55, 0.52);
    claw.rotation.y = -s * 0.35;
    group.add(claw);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeMat);
    eye.position.set(s * 0.26, 0.95, 0.32);
    group.add(eye);
  }
  return group;
}

/**
 * Patrolling Buoy Drone hazard for piers and bridges.
 */
export function createBuoyDrone(): THREE.Group {
  const group = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd1382c, roughness: 0.34, metalness: 0.48 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3a4a58, roughness: 0.32, metalness: 0.78 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff595e,
    emissive: 0xff3b30,
    emissiveIntensity: 1.5,
  });

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.66, 0.9, 10), redMat);
  hull.position.y = 0.65;
  hull.castShadow = true;
  group.add(hull);
  const cage = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.75, 6), steelMat);
  cage.position.y = 1.45;
  group.add(cage);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), beaconMat);
  lamp.position.y = 1.92;
  group.add(lamp);
  return group;
}

/**
 * Bouncy Silver Beach Striped Umbrella (launches Pip onto high dunes & pavilion roof).
 */
export function createBeachUmbrella(stripeTex: THREE.CanvasTexture): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8),
    new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.5 })
  );
  pole.position.y = 1.4;
  group.add(pole);

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.35, 0.85, 14),
    new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.48 })
  );
  canopy.position.y = 2.85;
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(canopy);

  return group;
}

/**
 * Great Lakes Cargo Barge for the St. Joseph River Swing Bridge realm.
 */
export function createCargoBarge(steelTex: THREE.CanvasTexture): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x7c2d25, roughness: 0.62, metalness: 0.35 });
  const deckMat = new THREE.MeshStandardMaterial({ map: steelTex, roughness: 0.55, metalness: 0.45 });
  const cargoMat = new THREE.MeshStandardMaterial({ color: 0x2b6a84, roughness: 0.52, metalness: 0.3 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.5, 11.4), hullMat);
  hull.position.y = 0.75;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.24, 10.8), deckMat);
  deck.position.y = 1.56;
  deck.receiveShadow = true;
  group.add(deck);

  const container = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 4.6), cargoMat);
  container.position.set(0, 2.45, -2.0);
  container.castShadow = true;
  container.receiveShadow = true;
  group.add(container);

  return group;
}

/**
 * Smooth golden-hour Lake Michigan gradient sky dome.
 */
export function createSkyDome(topHex: number, bottomHex: number): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(topHex) },
      uBottom: { value: new THREE.Color(bottomHex) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 uTop;
      uniform vec3 uBottom;
      void main() {
        float h = normalize(vWorldPos).y;
        float t = clamp(pow(max(h, 0.0), 0.58), 0.0, 1.0);
        vec3 col = mix(uBottom, uTop, t);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(260, 24, 16), mat);
}

/**
 * Animated sunlit Lake Michigan water plane using PBR MeshStandardMaterial + onBeforeCompile wave vertex displacement.
 */
export function createWaterPlane(
  colorHex: number,
  size = 420
): { mesh: THREE.Mesh; update: (elapsed: number) => void } {
  const uniforms = { uTime: { value: 0 } };
  const geo = new THREE.PlaneGeometry(size, size, 48, 48);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.16,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.y += sin(transformed.x * 0.14 + uTime * 1.4) * 0.24
                        + cos(transformed.z * 0.18 + uTime * 1.1) * 0.18;`
      );
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return {
    mesh,
    update: (elapsed: number) => {
      uniforms.uTime.value = elapsed;
    },
  };
}
