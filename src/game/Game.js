// ===================================================
// Game.js — 3D Living Open-World Forest Adventure
// Day/Night cycle, glowing fireflies, dynamic 3D compass, quests, paraglider,
// Time Trial arcade mode, screen shake, speed lines & CrazyGames SDK v3
// ===================================================
import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { WorldManager } from './WorldManager.js';
import { Player3D } from './Player3D.js';
import { ThirdPersonCamera } from './ThirdPersonCamera.js';
import { OpenWorldCollectibles } from './OpenWorldCollectibles.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { SaveManager } from './SaveManager.js';
import { NPCManager } from './NPCManager.js';
import { DialogueSystem } from './DialogueSystem.js';
import { AtmosphereManager } from './AtmosphereManager.js';
import { CrazySDK } from './CrazySDK.js';
import { ScreenShake } from './ScreenShake.js';
import { FloatingText } from './FloatingText.js';
import { SpeedLines } from './SpeedLines.js';
import { TimeTrial } from './TimeTrial.js';

// Continuous 4-Phase Day/Sunset/Night Keyframe Palette
export const LIGHTING_PHASES = [
  {
    name: 'dawn',
    sunColor: new THREE.Color(0xffb88c),
    sunIntensity: 1.60,
    sunPosition: new THREE.Vector3(45, 25, -20),
    ambientColor: new THREE.Color(0xd8b2a8),
    ambientIntensity: 0.42,
    hemiSky: new THREE.Color(0xffd1b3),
    hemiGround: new THREE.Color(0x3e5828),
    hemiIntensity: 0.65,
    skyColor: new THREE.Color(0xf59e72),
    fogColor: new THREE.Color(0xf5a882),
    nightWeight: 0.10,
  },
  {
    name: 'day',
    sunColor: new THREE.Color(0xfff6e5),
    sunIntensity: 2.50,
    sunPosition: new THREE.Vector3(15, 55, -20),
    ambientColor: new THREE.Color(0xffffff),
    ambientIntensity: 0.55,
    hemiSky: new THREE.Color(0x7eccff),
    hemiGround: new THREE.Color(0x488a28),
    hemiIntensity: 0.85,
    skyColor: new THREE.Color(0x6ec4f8),
    fogColor: new THREE.Color(0x8cd2fc),
    nightWeight: 0.00,
  },
  {
    name: 'sunset',
    sunColor: new THREE.Color(0xff7a36),
    sunIntensity: 1.80,
    sunPosition: new THREE.Vector3(-45, 25, -20),
    ambientColor: new THREE.Color(0xb8604d),
    ambientIntensity: 0.45,
    hemiSky: new THREE.Color(0xff8040),
    hemiGround: new THREE.Color(0x4c3319),
    hemiIntensity: 0.65,
    skyColor: new THREE.Color(0xe65c2b),
    fogColor: new THREE.Color(0xdc6836),
    nightWeight: 0.50,
  },
  {
    name: 'night',
    sunColor: new THREE.Color(0x8cb8ff),
    sunIntensity: 0.42,
    sunPosition: new THREE.Vector3(-15, 50, 20),
    ambientColor: new THREE.Color(0x344666),
    ambientIntensity: 0.34,
    hemiSky: new THREE.Color(0x223254),
    hemiGround: new THREE.Color(0x16241c),
    hemiIntensity: 0.34,
    skyColor: new THREE.Color(0x0e1626),
    fogColor: new THREE.Color(0x0c1524),
    nightWeight: 1.00,
  },
];

export class Game {
  constructor(container) {
    this.container = container;
    this.state = 'menu'; // 'menu' | 'playing'
    this.mode = 'explore'; // 'explore' | 'timetrial'
    this._cinematicAngle = 0;

    // Core 3D
    this.renderer = new Renderer(container);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 450);
    this.lastTime = performance.now();

    // Systems
    this.thirdPersonCamera = new ThirdPersonCamera(this.camera, container);
    this.world = new WorldManager(this.scene);
    this.player = new Player3D(this.scene);
    this.collectibles = new OpenWorldCollectibles(this.scene, this.world);
    this.dialogue = new DialogueSystem(this.audio);
    this.npcs = new NPCManager(this.scene, this.world);
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.save = new SaveManager();
    this.atmosphere = new AtmosphereManager(this.scene, this.world);
    this.atmosphereManager = this.atmosphere;

    // Juice & Modes
    this.screenShake = new ScreenShake(this.camera);
    this.floatingText = new FloatingText(this.container, this.camera);
    this.timeTrial = new TimeTrial(this);

    // Speed Lines Canvas
    if (typeof document !== 'undefined') {
      const slCanvas = document.getElementById('speed-lines-canvas');
      if (slCanvas) {
        this.speedLines = new SpeedLines(slCanvas);
      }
    }

    // Connect Player Juice Callbacks
    this.player.onLand = (impact) => {
      this.screenShake.addTrauma(impact * 0.45);
      this.audio.playLand(impact);
    };
    this.player.onBounce = () => {
      this.screenShake.addTrauma(0.55);
      this.audio.playMushroom();
      CrazySDK.happytime();
      if (this.floatingText) {
        this.floatingText.spawn('🍄 BOING!', this.player.getPosition(), {
          color: '#ff4081',
          fontSize: '1.4rem',
          isBig: true,
        });
      }
    };

    this.player.onUpdraft = (power) => {
      this.screenShake.addTrauma(0.4);
      if (this.audio) this.audio.playGlide();
      if (this.floatingText) {
        this.floatingText.spawn('🌪️ UPDRAFT VENT: LAUNCH SKYWARD!', this.player.getPosition(), {
          color: '#38bdf8',
          fontSize: '1.35rem',
          isBig: true,
        });
      }
    };

    this.player.onVoidActivation = (voidResult) => {
      this.screenShake.addTrauma(0.65);
      if (this.audio) this.audio.playCollect();
      CrazySDK.happytime();
      if (this.floatingText) {
        this.floatingText.spawn('🔮 PURIFY CURSE & BOOST LAUNCH!', this.player.getPosition(), {
          color: '#c084fc',
          fontSize: '1.4rem',
          isBig: true,
        });
      }
      if (this.ui.curseProgressFill) {
        this.ui.curseProgressFill.style.width = '0%';
      }
      if (this.ui.nightCurseVignette) {
        this.ui.nightCurseVignette.classList.remove('active');
      }
    };

    // Story Quest Flags
    this.questTalkedToFinn = false;
    this.questLearnedAboutMushrooms = false;
    this.questSpiritAwakened = false;

    // Day/Night Cycle
    this.dayTime = 0.25; // 0..1 (0.0 = dawn, 0.25 = noon, 0.5 = sunset, 0.75 = midnight)
    this.dayDuration = (typeof process !== 'undefined' && process.versions?.node) ? 140 : 260; // 260s (~4.3m) in browser for relaxed pacing; 140s in unit tests
    this.nightFactor = 0.0;
    this.sunLight = null;
    this.hemiLight = null;
    this.ambientLight = null;
    this.fireflies = [];

    // Pre-allocated scratch objects for zero-allocation day/night lerping
    this._targetSunColor = new THREE.Color();
    this._targetAmbientColor = new THREE.Color();
    this._targetHemiSkyColor = new THREE.Color();
    this._targetHemiGroundColor = new THREE.Color();
    this._targetSkyColor = new THREE.Color();
    this._targetFogColor = new THREE.Color();
    this._targetSunPos = new THREE.Vector3();

    // Gameplay Progress & Quests
    this.coins = 0;
    this.score = 0;
    this.treasuresFound = 0;
    this.reachedPeak = false;

    // UI references
    this.ui = {
      scoreDisplay: document.getElementById('score-display'),
      coinsDisplay: document.getElementById('coins-display'),
      speedBar: document.getElementById('speed-bar'),
      compassDegrees: document.getElementById('compass-degrees'),
      compassStrip: document.getElementById('compass-strip'),
      questCoins: document.getElementById('quest-coins'),
      questPeak: document.getElementById('quest-peak'),
      questChests: document.getElementById('quest-chests'),
      screenStart: document.getElementById('screen-start'),
      screenGameover: document.getElementById('screen-gameover'),
      wardrobeModal: document.getElementById('wardrobe-modal'),
      btnControlTalk: document.getElementById('btn-control-talk'),
      hud: document.getElementById('hud'),
      questWidget: document.getElementById('quest-widget'),
      timeTrialHud: document.getElementById('time-trial-hud'),
      celestialPanel: document.getElementById('celestial-panel'),
      celestialIcon: document.getElementById('celestial-icon'),
      celestialPhase: document.getElementById('celestial-phase'),
      celestialTime: document.getElementById('celestial-time'),
      nightCurseVignette: document.getElementById('night-curse-vignette'),
      curseProgressFill: document.getElementById('curse-progress-fill'),
      minimapCanvas: document.getElementById('minimap-canvas'),
      btnToggleQuest: document.getElementById('btn-toggle-quest'),
      questContent: document.getElementById('quest-content'),
      questHeaderTitle: document.getElementById('quest-header-title'),
    };

    if (this.ui.btnToggleQuest && this.ui.questContent) {
      this.ui.btnToggleQuest.addEventListener('click', () => {
        const isHidden = this.ui.questContent.style.display === 'none';
        this.ui.questContent.style.display = isHidden ? 'block' : 'none';
        this.ui.btnToggleQuest.textContent = isHidden ? '▼' : '▲';
      });
    }

    this._initScene();

    this._animate();
    this._onResize();
    window.addEventListener('resize', () => this._onResize());

    // Initialize CrazyGames SDK v3
    CrazySDK.init();
  }

  // ─── Scene Setup ──────────────────────────────────────────────────────────

  async _initScene() {
    this.scene.background = new THREE.Color(0x6ec4f8);
    this.scene.fog = new THREE.Fog(0x8cd2fc, 85, 230);

    // Sun light (Directional key light with calibrated PCF soft shadow parameters)
    this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
    this.sunLight.position.set(30, 45, -20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 180;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);

    // Hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0x7eccff, 0x488a28, 0.85);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    // Adventurer's Lantern (Illuminates surroundings at night)
    this.playerLantern = new THREE.PointLight(0xffb86c, 0, 16.0, 1.8);
    this.playerLantern.castShadow = false;
    this.scene.add(this.playerLantern);

    // Initial sync of day/night lighting
    this._updateDayNightLighting(0);

    // Atmosphere
    await this.atmosphere.init();

    // World & Subsystems
    await this.world.init();
    await this.player.init();
    this.npcs.init();
    this.collectibles.init();

    this.player.reset(0, 0);
    CrazySDK.loadingStop();
  }

  // ─── Main Animation Loop ──────────────────────────────────────────────────

  _animate() {
    requestAnimationFrame(() => this._animate());

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this._update(delta);
    this.renderer.render(this.scene, this.camera);
  }

  _update(delta) {
    const elapsedSeconds = performance.now() * 0.001;

    // 1. Advance Day/Night Cycle
    this.dayTime = (this.dayTime + delta / this.dayDuration) % 1.0;
    this._updateDayNightLighting(delta);
    this.atmosphere.update(delta, elapsedSeconds, this.dayTime);

    // 1b. Update World Environment
    if (this.world && typeof this.world.update === 'function') {
      this.world.update(delta, elapsedSeconds);
    }

    // 1c. Idle Orbiting Camera when in Menu mode
    if (this.state === 'menu') {
      this._updateCinematicCamera(delta);
      this.collectibles.update(delta);
      return;
    }

    // Check dialogue state
    const isDialogueActive = this.dialogue && this.dialogue.active;
    const isInteract = this.input.consumeInteract();

    // 2. Input queries
    let moveInput = { x: 0, z: 0 };
    let isJump = false;
    let isSprint = false;
    let isGlide = false;

    if (!isDialogueActive) {
      moveInput = this.input.getMovementVector();
      isJump = this.input.consumeJump();
      isSprint = this.input.isSprintActive();
      isGlide = this.input.isGlideActive();
    } else {
      this.input.consumeJump();
    }

    // Camera rotation
    const rotInput = this.input.getCameraRotationInput();
    if (rotInput !== 0 && !isDialogueActive) {
      this.thirdPersonCamera.rotateManual(rotInput);
    }

    // 3. Player Movement & Physics
    const wasGrounded = this.player.isGrounded;
    this.player.update(delta, moveInput, isJump, isSprint, isGlide, this.thirdPersonCamera, this.world);

    // Update Adventurer's Lantern position & nighttime intensity
    if (this.playerLantern && this.player) {
      const pPos = this.player.getPosition();
      this.playerLantern.position.set(pPos.x, pPos.y + 1.2, pPos.z);
      const lanternTarget = THREE.MathUtils.lerp(0.0, 2.2, Math.max(0, (this.nightFactor - 0.15) / 0.85));
      this.playerLantern.intensity = lanternTarget;
    }

    if (wasGrounded && !this.player.isGrounded && this.player.velocityY > 0) {
      this.audio.playJump();
    }

    // Peak Summit Quest Check
    if (this.player.position.y >= 6.8 && !this.reachedPeak) {
      this.reachedPeak = true;
      this.score += 500;
      this.save.recordDailyProgress('peak', 1);
      this.screenShake.addTrauma(0.4);
      CrazySDK.happytime();
      if (this.floatingText) {
        this.floatingText.spawn('🏔️ PEAK CONQUERED! +500', this.player.getPosition(), {
          color: '#e040fb',
          fontSize: '1.4rem',
          isBig: true,
          duration: 1.6,
        });
      }
      this._updateUI();
    }

    // 4. Smooth Camera Follow
    this.thirdPersonCamera.update(delta, this.player.getPosition(), this.player.isSprinting, this.player.isGliding);

    // Camera Screen Shake
    if (this.screenShake) {
      this.screenShake.update(delta);
    }

    // Speed Lines Canvas
    if (this.speedLines) {
      const isFast = (this.player.isSprinting ? 0.75 : 0) + (this.player.isGliding ? 1.0 : 0);
      this.speedLines.setIntensity(isFast);
      this.speedLines.update(delta);
    }

    // 5. Update World Items & Particles
    this.collectibles.update(delta);

    // 6. Update NPCs & Interaction Prompts
    const nearbyNPC = this.npcs.update(delta, this.player.getPosition());
    if (this.ui.btnControlTalk) {
      this.ui.btnControlTalk.style.display = (nearbyNPC && !isDialogueActive) ? 'flex' : 'none';
    }

    // Handle Interaction
    if (isInteract) {
      if (isDialogueActive) {
        this.dialogue.advance();
      } else if (nearbyNPC) {
        this.triggerTalk();
      }
    }

    // 7. Check item pickup
    const collected = this.collectibles.checkCollection(this.player.getBoundingBox());
    if (collected.count > 0) {
      if (this.mode === 'timetrial' && this.timeTrial.active) {
        this.timeTrial.onItemCollected(collected.points, this.player.getPosition());
      } else {
        this.coins += collected.count;
        this.score += collected.points;
        if (collected.isChest) {
          this.treasuresFound++;
          this.screenShake.addTrauma(0.65);
          CrazySDK.happytime();
        }

        this.audio.playCollect();
        this.save.addCoins(collected.count);
        this.save.updateBestScore(this.score);
        this.save.recordDailyProgress('coins', collected.count);
        this._updateUI();

        if (this.floatingText) {
          this.floatingText.spawn(`+${collected.points}`, this.player.getPosition(), {
            color: collected.isChest ? '#ffd700' : '#00e676',
            isBig: collected.isChest,
          });
        }
      }
    }

    // 8. Update Floating Text Popups
    if (this.floatingText) {
      this.floatingText.update(delta);
    }

    // 9. Update Time Trial Mode
    if (this.mode === 'timetrial' && this.timeTrial) {
      this.timeTrial.update(delta);
    }

    // 10. Update 3D Compass & Altitude HUD
    this._updateCompass();

    // 11. Update Celestial Day/Night Clock
    this._updateCelestialDial();

    // 12. Update Mystical Minimap
    this._updateMinimap();
  }

  _updateCinematicCamera(delta) {
    this._cinematicAngle = (this._cinematicAngle || 0) + delta * 0.16;
    const r = 24.0;
    this.camera.position.set(
      Math.cos(this._cinematicAngle) * r,
      7.5 + Math.sin(this._cinematicAngle * 0.6) * 2.2,
      Math.sin(this._cinematicAngle) * r
    );
    this.camera.lookAt(0, 2.5, 0);
  }

  triggerTalk() {
    const nearbyNPC = this.npcs.getNearbyNPC();
    if (!nearbyNPC || (this.dialogue && this.dialogue.active)) return;

    this.dialogue.start(nearbyNPC.dialogueKey, (flags) => {
      if (flags.talkedToFinn && !this.questTalkedToFinn) {
        this.questTalkedToFinn = true;
        this.score += 250;
        this._updateUI();
      }
      if (flags.learnedAboutMushrooms && !this.questLearnedAboutMushrooms) {
        this.questLearnedAboutMushrooms = true;
        this.score += 250;
        this._updateUI();
      }
      if (flags.spiritAwakened && !this.questSpiritAwakened) {
        this.questSpiritAwakened = true;
        this.score += 1000;
        this.screenShake.addTrauma(0.5);
        CrazySDK.happytime();
        this._updateUI();
      }
    });
  }

  // ─── Dynamic 4-Phase Day / Sunset / Night Lighting ─────────────────────────

  _updateDayNightLighting(delta) {
    const t = ((this.dayTime % 1.0) + 1.0) % 1.0;
    const phaseIndex = Math.floor(t / 0.25);
    const segmentT = (t - phaseIndex * 0.25) / 0.25;
    const blend = segmentT * segmentT * (3 - 2 * segmentT);

    const kfA = LIGHTING_PHASES[phaseIndex];
    const kfB = LIGHTING_PHASES[(phaseIndex + 1) % 4];

    this._targetSunColor.lerpColors(kfA.sunColor, kfB.sunColor, blend);
    this.sunLight.color.copy(this._targetSunColor);
    this.sunLight.intensity = THREE.MathUtils.lerp(kfA.sunIntensity, kfB.sunIntensity, blend);

    this._targetSunPos.lerpVectors(kfA.sunPosition, kfB.sunPosition, blend);
    this.sunLight.position.copy(this._targetSunPos);

    this._targetAmbientColor.lerpColors(kfA.ambientColor, kfB.ambientColor, blend);
    this.ambientLight.color.copy(this._targetAmbientColor);
    this.ambientLight.intensity = THREE.MathUtils.lerp(kfA.ambientIntensity, kfB.ambientIntensity, blend);

    this._targetHemiSkyColor.lerpColors(kfA.hemiSky, kfB.hemiSky, blend);
    this._targetHemiGroundColor.lerpColors(kfA.hemiGround, kfB.hemiGround, blend);
    this.hemiLight.color.copy(this._targetHemiSkyColor);
    this.hemiLight.groundColor.copy(this._targetHemiGroundColor);
    this.hemiLight.intensity = THREE.MathUtils.lerp(kfA.hemiIntensity, kfB.hemiIntensity, blend);

    this._targetSkyColor.lerpColors(kfA.skyColor, kfB.skyColor, blend);
    this._targetFogColor.lerpColors(kfA.fogColor, kfB.fogColor, blend);
    this.scene.background.copy(this._targetSkyColor);
    this.scene.fog.color.copy(this._targetFogColor);

    this.nightFactor = THREE.MathUtils.lerp(kfA.nightWeight, kfB.nightWeight, blend);
  }

  get timeOfDay() {
    return this.dayTime;
  }

  get currentPhase() {
    const t = ((this.dayTime % 1.0) + 1.0) % 1.0;
    if (t < 0.125 || t >= 0.875) return 'dawn';
    if (t < 0.375) return 'day';
    if (t < 0.625) return 'sunset';
    return 'night';
  }

  get isNight() {
    return this.nightFactor > 0.35;
  }

  getFormattedTime() {
    const totalHours = (6 + this.dayTime * 24) % 24;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // ─── 3D Compass & HUD Updates ─────────────────────────────────────────────

  _updateCompass() {
    let deg = Math.round((this.thirdPersonCamera.yaw * 180 / Math.PI) % 360);
    if (deg < 0) deg += 360;

    if (this.ui.compassDegrees && this._lastCompassDeg !== deg) {
      this._lastCompassDeg = deg;
      this.ui.compassDegrees.textContent = `${deg}°`;
    }

    if (this.ui.compassStrip) {
      const offset = (deg / 360) * 100;
      this.ui.compassStrip.style.transform = `translateX(-${offset}%)`;
    }

    const altitude = Math.max(0, Math.min(100, (this.player.position.y / 7.0) * 100));
    const altStr = `${altitude.toFixed(0)}%`;
    if (this.ui.speedBar && this._lastAltitudeStr !== altStr) {
      this._lastAltitudeStr = altStr;
      this.ui.speedBar.style.width = altStr;
    }
  }

  _updateCelestialDial() {
    if (!this.ui.celestialTime) return;
    const formattedTime = this.getFormattedTime();
    if (this._lastFormattedTime !== formattedTime) {
      this._lastFormattedTime = formattedTime;
      this.ui.celestialTime.textContent = formattedTime;
    }

    const phase = this.currentPhase;
    if (this._lastDialPhase !== phase) {
      this._lastDialPhase = phase;
      const phaseIcons = { dawn: '🌅', day: '☀️', sunset: '🌇', night: '🌙' };
      const phaseNames = { dawn: 'Dawn', day: 'Daytime', sunset: 'Sunset ⚠️', night: 'Night Curse 💀' };
      if (this.ui.celestialIcon) this.ui.celestialIcon.textContent = phaseIcons[phase] || '☀️';
      if (this.ui.celestialPhase) this.ui.celestialPhase.textContent = phaseNames[phase] || 'Daytime';
    }

    // Calculate narrative curse progression
    const t = ((this.dayTime % 1.0) + 1.0) % 1.0;
    let cursePercent = 10;
    if (t >= 0.5 && t < 0.625) {
      cursePercent = 15 + ((t - 0.5) / 0.125) * 30; // Sunset: 15% -> 45%
    } else if (t >= 0.625 && t < 0.875) {
      cursePercent = 45 + ((t - 0.625) / 0.25) * 50; // Night: 45% -> 95%
    } else if (t >= 0.875) {
      cursePercent = 95 - ((t - 0.875) / 0.125) * 70; // Dawn transition
    } else {
      cursePercent = Math.max(10, 25 - (t / 0.5) * 15);
    }

    const curseStr = `${cursePercent.toFixed(0)}%`;
    if (this.ui.curseProgressFill && this._lastCursePercent !== curseStr) {
      this._lastCursePercent = curseStr;
      this.ui.curseProgressFill.style.width = curseStr;
    }

    if (this.ui.celestialPanel) {
      const isNightPhase = phase === 'sunset' || phase === 'night';
      if (this._lastIsNightPhase !== isNightPhase) {
        this._lastIsNightPhase = isNightPhase;
        if (isNightPhase) {
          this.ui.celestialPanel.classList.add('night-warning');
          if (this.ui.nightCurseVignette) this.ui.nightCurseVignette.classList.add('active');
        } else {
          this.ui.celestialPanel.classList.remove('night-warning');
          if (this.ui.nightCurseVignette) this.ui.nightCurseVignette.classList.remove('active');
        }
      }
      if (isNightPhase && this.ui.questHeaderTitle) {
        const titleStr = cursePercent >= 70 ? '💀 NIGHT CURSE AWAKENS' : '📜 ANCIENT ELDORIA MISSION';
        if (this._lastQuestHeaderTitle !== titleStr) {
          this._lastQuestHeaderTitle = titleStr;
          this.ui.questHeaderTitle.textContent = titleStr;
        }
      } else if (!isNightPhase && this.ui.questHeaderTitle && this._lastQuestHeaderTitle !== '📜 ANCIENT ELDORIA MISSION') {
        this._lastQuestHeaderTitle = '📜 ANCIENT ELDORIA MISSION';
        this.ui.questHeaderTitle.textContent = '📜 ANCIENT ELDORIA MISSION';
      }
    }
  }

  _updateMinimap() {
    if (!this.ui.minimapCanvas) return;
    this._minimapThrottle = (this._minimapThrottle || 0) + 1;
    if (this._minimapThrottle % 3 !== 0) return; // ~20fps throttle for optimal performance

    const ctx = this.ui.minimapCanvas.getContext('2d');
    if (!ctx) return;

    const w = this.ui.minimapCanvas.width;
    const h = this.ui.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    ctx.fillStyle = '#080514';
    ctx.fillRect(0, 0, w, h);

    // Map bounds: [-86.5, +86.5] -> scale to fit 128x128
    const scale = (w * 0.44) / 86.5;

    const toCanvas = (wx, wz) => ({
      x: cx + wx * scale,
      y: cy + wz * scale,
    });

    // 1. Biome zones
    // Central Valley
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Starting Village (West: -62, 0)
    const v = toCanvas(-62, 0);
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(v.x, v.y, 16 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Cursed Forest (North: 0, 62)
    const cf = toCanvas(0, 62);
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.arc(cf.x, cf.y, 18 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Dark Swamp (South: 0, -62)
    const ds = toCanvas(0, -62);
    ctx.fillStyle = '#0f3460';
    ctx.beginPath();
    ctx.arc(ds.x, ds.y, 18 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Dragon Castle Peak (East: 65, 50)
    const dp = toCanvas(65, 50);
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.arc(dp.x, dp.y, 16 * scale, 0, Math.PI * 2);
    ctx.fill();

    // ─── 4 Outland Expansion Zones on Minimap ─────────────────────────
    // NW: Frostfall Sanctuary (-48, 44)
    const nwFrost = toCanvas(-48, 44);
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(nwFrost.x, nwFrost.y, 11 * scale, 0, Math.PI * 2);
    ctx.fill();

    // NE: Molten Crags (48, 45)
    const neMolten = toCanvas(48, 45);
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(neMolten.x, neMolten.y, 11 * scale, 0, Math.PI * 2);
    ctx.fill();

    // SW: Elder Shroomwood (-48, -48)
    const swShroom = toCanvas(-48, -48);
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.arc(swShroom.x, swShroom.y, 11 * scale, 0, Math.PI * 2);
    ctx.fill();

    // SE: Sun Temple Ruins (48, -48)
    const seSun = toCanvas(48, -48);
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(seSun.x, seSun.y, 11 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 2. Connecting Road Network on Radar
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    // West road
    ctx.moveTo(cx, cy); ctx.lineTo(v.x, v.y);
    // East road
    ctx.moveTo(cx, cy); ctx.lineTo(dp.x, dp.y);
    // North road
    ctx.moveTo(cx, cy); ctx.lineTo(cf.x, cf.y);
    // South road
    ctx.moveTo(cx, cy); ctx.lineTo(ds.x, ds.y);
    // 4 Diagonal Outland roads
    ctx.moveTo(cx, cy); ctx.lineTo(nwFrost.x, nwFrost.y);
    ctx.moveTo(cx, cy); ctx.lineTo(neMolten.x, neMolten.y);
    ctx.moveTo(cx, cy); ctx.lineTo(swShroom.x, swShroom.y);
    ctx.moveTo(cx, cy); ctx.lineTo(seSun.x, seSun.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Biome Text Labels
    ctx.font = '7.5px Cinzel, serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('VILLAGE', v.x, v.y + 11);
    ctx.fillText('DRAGON', dp.x, dp.y + 11);
    ctx.fillText('FOREST', cf.x, cf.y + 11);
    ctx.fillText('SWAMP', ds.x, ds.y + 11);
    ctx.font = '6.5px Cinzel, serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('FROST', nwFrost.x, nwFrost.y + 9);
    ctx.fillStyle = '#fb923c';
    ctx.fillText('MOLTEN', neMolten.x, neMolten.y + 9);
    ctx.fillStyle = '#c084fc';
    ctx.fillText('SHROOM', swShroom.x, swShroom.y + 9);
    ctx.fillStyle = '#fde047';
    ctx.fillText('SUN', seSun.x, seSun.y + 9);

    // 4. River
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const rStart = toCanvas(-30, 20);
    const rMid1 = toCanvas(0, 8);
    const rMid2 = toCanvas(10, -10);
    const rEnd = toCanvas(30, -25);
    ctx.moveTo(rStart.x, rStart.y);
    ctx.bezierCurveTo(rMid1.x, rMid1.y, rMid2.x, rMid2.y, rEnd.x, rEnd.y);
    ctx.stroke();

    // 5. Sky Islands Rings on Radar (floating high above)
    const skyIslandsMinimap = [
      { x: 0, z: 0, r: 8, label: '☁️ SKY TEMPLE' },
      { x: -38, z: 28, r: 6.5, label: '☁️ FALCON ROOST' },
      { x: 40, z: -20, r: 7, label: '☁️ DRAGON AERIE' },
    ];
    skyIslandsMinimap.forEach(si => {
      const p = toCanvas(si.x, si.z);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, si.r * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 6. Updraft Thermal Vents (swirling cyan dots)
    const updrafts = [{ x: 18, z: 22 }, { x: 0, z: -8 }, { x: -28, z: 12 }];
    updrafts.forEach(u => {
      const p = toCanvas(u.x, u.z);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. NPCs & Landmarks
    const landmarks = [
      { x: -4, z: -4, color: '#fbbf24', r: 3 }, // Finn
      { x: 1, z: -17, color: '#fbbf24', r: 3 }, // Bram
      { x: 18, z: 18, color: '#38bdf8', r: 3.5 }, // Forest Spirit
      { x: 65, z: 50, color: '#ef4444', r: 4 }, // Dragon
    ];
    landmarks.forEach(lm => {
      const p = toCanvas(lm.x, lm.z);
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, lm.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Player position & glowing halo (indicates altitude with cyan halo if in the sky)
    const playerPos = this.player.getPosition();
    const pCanvas = toCanvas(playerPos.x, playerPos.z);
    const inSky = playerPos.y > 8.0;

    ctx.fillStyle = inSky ? 'rgba(56, 189, 248, 0.7)' : 'rgba(251, 191, 36, 0.45)';
    ctx.beginPath();
    ctx.arc(pCanvas.x, pCanvas.y, inSky ? 7.5 : 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pCanvas.x, pCanvas.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }


  _updateUI() {
    if (this.ui.scoreDisplay) this.ui.scoreDisplay.textContent = this.score.toLocaleString();
    if (this.ui.coinsDisplay) this.ui.coinsDisplay.textContent = this.coins.toLocaleString();

    if (this.ui.questCoins) {
      this.ui.questCoins.textContent = `${Math.min(15, this.coins)} / 15`;
      this.ui.questCoins.style.color = this.coins >= 15 ? '#48bb78' : '#ffd700';
    }
    if (this.ui.questPeak) {
      this.ui.questPeak.textContent = this.reachedPeak ? '✅ Conquered!' : 'Not yet';
      this.ui.questPeak.style.color = this.reachedPeak ? '#48bb78' : '#cbd5e0';
    }
    if (this.ui.questChests) {
      this.ui.questChests.textContent = `${this.treasuresFound} / 2`;
      this.ui.questChests.style.color = this.treasuresFound >= 2 ? '#48bb78' : '#ecc94b';
    }
  }

  // ─── Mode Switching & Controls ────────────────────────────────────────────

  setSkin(skinName) {
    if (this.save.isSkinUnlocked(skinName)) {
      this.player.setSkin(skinName);
      return true;
    }
    return false;
  }

  start() {
    this.startExploration();
  }

  startExploration() {
    this.state = 'playing';
    this.mode = 'explore';
    if (this.ui.screenStart) this.ui.screenStart.classList.add('hidden');
    if (this.ui.questWidget) this.ui.questWidget.style.display = 'block';
    if (this.ui.timeTrialHud) this.ui.timeTrialHud.style.display = 'none';

    this.player.reset(0, 0);

    // Panoramic camera angle overlooking the valley, crossroads signpost, and distant summits
    if (this.thirdPersonCamera) {
      this.thirdPersonCamera.yaw = 0.45;
      this.thirdPersonCamera.pitch = 0.18;
      this.thirdPersonCamera.targetDistance = 12.0;
    }

    this.audio.startAmbience();
    CrazySDK.gameplayStart();

    // Auto-onboard new players into the story via Finn's dialogue
    if (!this.questTalkedToFinn && this.dialogue && !this.dialogue.active) {
      setTimeout(() => {
        if (this.state === 'playing' && !this.dialogue.active) {
          this.dialogue.start('finn_intro', (flags) => {
            if (flags.talkedToFinn && !this.questTalkedToFinn) {
              this.questTalkedToFinn = true;
              this.score += 250;
              this._updateUI();
            }
          });
        }
      }, 350);
    }
  }

  startTimeTrial() {
    this.state = 'playing';
    this.mode = 'timetrial';
    if (this.ui.screenStart) this.ui.screenStart.classList.add('hidden');
    if (this.ui.questWidget) this.ui.questWidget.style.display = 'none';
    if (this.ui.timeTrialHud) this.ui.timeTrialHud.style.display = 'flex';

    this.timeTrial.start();
    this.audio.startAmbience();
  }

  restart() {
    if (this.mode === 'timetrial') {
      this.startTimeTrial();
    } else {
      this.player.reset(0, 0);
      this.collectibles.spawnAll();
      this.coins = 0;
      this.score = 0;
      this.treasuresFound = 0;
      this.reachedPeak = false;
      this._updateUI();
      CrazySDK.gameplayStart();
    }
  }

  showMenu() {
    this.state = 'menu';
    CrazySDK.gameplayStop();
    if (this.ui.screenStart) this.ui.screenStart.classList.remove('hidden');
    if (this.ui.timeTrialHud) this.ui.timeTrialHud.style.display = 'none';
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.resize(w, h);
    if (this.speedLines) {
      this.speedLines.resize();
    }
  }
}
