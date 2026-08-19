/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// Tunable parameters of the KFC castle effect. Ported 1:1 from the Mattercraft
// `KfcEffectComponent` (kfctest.ts): every `@zui` Observable became a plain field
// here. The defaults below are NOT the code defaults of the original component
// but the values that were tuned in the Mattercraft scene (Scene.zcomp), so the
// migrated experience looks the same as the Immersal build.
//
// Units: everything is in the effect's local space. The effect group is scaled
// by `EFFECT_SCALE` in MainScene, so 1 local unit ≈ 0.315 m.

export type RGB = [number, number, number]

export interface KfcEffectConfig {
	// ─── Pool sizes (fixed at load time) ────────────────────────────────────
	/** Number of KFC boxes per side along the wall length. */
	wallPerSide: number
	/** Number of brick rows stacked on the wall. */
	wallRows: number
	/** Wall thickness in number of rows along Z. */
	wallDepth: number
	/** Number of KFC box instances launched per burst. */
	burstBoxCount: number
	/** Number of chicken instances launched per burst. */
	burstChickenCount: number
	/** Number of pooled spice powder particles. */
	particleCount: number
	/** Number of pooled rock-dust particles emitted at entrance. */
	entranceDustCount: number

	// ─── Behaviour ──────────────────────────────────────────────────────────
	/** Automatically fire the burst once after the entrance finishes. */
	autoFire: boolean

	// ─── Castle ─────────────────────────────────────────────────────────────
	castleHeight: number
	castlePositionX: number
	castlePositionY: number
	castlePositionZ: number
	castleRotationX: number
	castleRotationY: number
	castleRotationZ: number

	// ─── Rock (parented to the castle) ──────────────────────────────────────
	rockPositionX: number
	rockPositionY: number
	rockPositionZ: number
	rockRotationX: number
	rockRotationY: number
	rockRotationZ: number
	rockScale: number

	// ─── Wall layout ────────────────────────────────────────────────────────
	groundY: number
	wallStartOffset: number
	wallBoxScaleMultiplier: number
	wallSpacingX: number
	wallSpacingY: number
	wallSpacingZ: number
	wallBoxRotationX: number
	wallBoxRotationY: number
	wallBoxRotationZ: number
	layoutRotationZ: number

	// ─── Burst bodies ───────────────────────────────────────────────────────
	burstBoxSize: number
	chickenSize: number
	burstOriginX: number
	burstOriginY: number
	burstOriginZ: number
	burstFloorY: number
	burstFloorZ: number
	showBurstFloorDebug: boolean
	shadowFloorOpacity: number
	shadowFloorSize: number

	// ─── Entrance ───────────────────────────────────────────────────────────
	castleAppearDelay: number
	castleEntranceStartZ: number
	castleEntranceDuration: number
	castleEmergeShakeAmplitude: number
	castleEmergeShakeFrequency: number
	castleEmergeShakeVerticalBias: number
	entranceDustDelay: number
	entranceDustColor: RGB
	entranceDustOpacity: number
	entranceDustSize: number
	entranceDustRadius: number
	entranceDustLifeMultiplier: number
	entranceDustFadeSoftness: number
	entranceDustDrag: number
	entranceDustGravityScale: number
	entranceDustRiseSpeed: number
	entranceDustSwirl: number
	wallSpreadDelay: number
	wallDropHeight: number
	wallDropHeightPerColumn: number
	wallDropDuration: number
	wallStaggerPerColumn: number

	// ─── Physics ────────────────────────────────────────────────────────────
	gravity: number
	bounceDamping: number
	friction: number
	burstForwardDirection: number
	burstForwardVelocity: number
	burstUpwardVelocity: number
	burstSideVelocity: number
	burstSpreadAngleDeg: number
	burstVelocityRandomness: number
	burstSpin: number

	// ─── Spice powder particles ─────────────────────────────────────────────
	spiceColor: RGB
	particleColorVariance: number
	particleGravity: number
	particleForwardDirection: number
	particleForwardVelocity: number
	particleSpreadAngleDeg: number
	particleUpwardBoost: number
	particleLifeMultiplier: number
	particleSizeMultiplier: number
	chunkSpeed: number
	cloudSpeed: number
	dustSpeed: number
}

/**
 * Values tuned in the original Mattercraft scene (Scene.zcomp →
 * entityConstructorProps / entityProps of the KfcEffectComponent node).
 * Anything not overridden there keeps the component's own `@zdefault`.
 */
export const DEFAULT_KFC_CONFIG: KfcEffectConfig = {
	wallPerSide: 6,
	wallRows: 4,
	wallDepth: 1,
	burstBoxCount: 22,
	burstChickenCount: 14,
	particleCount: 500,
	entranceDustCount: 300,

	autoFire: false,

	castleHeight: 2,
	castlePositionX: 0,
	castlePositionY: 0,
	castlePositionZ: 0.7,
	castleRotationX: 40,
	castleRotationY: -40,
	castleRotationZ: -20,

	rockPositionX: 0,
	rockPositionY: 0,
	rockPositionZ: 0,
	rockRotationX: 0,
	rockRotationY: 10,
	rockRotationZ: 0,
	rockScale: 1,

	groundY: 0,
	wallStartOffset: 1.54,
	wallBoxScaleMultiplier: 2.5,
	wallSpacingX: 1,
	wallSpacingY: 0.8,
	wallSpacingZ: 1.02,
	wallBoxRotationX: 0,
	wallBoxRotationY: 90,
	wallBoxRotationZ: 10,
	layoutRotationZ: -18,

	burstBoxSize: 1,
	chickenSize: 1,
	burstOriginX: 0,
	burstOriginY: -0.4,
	burstOriginZ: 0.7,
	burstFloorY: -7.5,
	burstFloorZ: 4,
	showBurstFloorDebug: false,
	shadowFloorOpacity: 0.0712788259958071,
	shadowFloorSize: 10,

	castleAppearDelay: 0,
	castleEntranceStartZ: -3,
	castleEntranceDuration: 6,
	castleEmergeShakeAmplitude: 0.08,
	castleEmergeShakeFrequency: 4,
	castleEmergeShakeVerticalBias: 0.65,
	entranceDustDelay: 7.7,
	entranceDustColor: [0.9803921568627451, 0.611764705882353, 0.21568627450980393],
	entranceDustOpacity: 0.7,
	entranceDustSize: 0.8,
	entranceDustRadius: 4.5,
	entranceDustLifeMultiplier: 4,
	entranceDustFadeSoftness: 3,
	entranceDustDrag: 0.3,
	entranceDustGravityScale: 0.015,
	entranceDustRiseSpeed: 0.389937106918239,
	entranceDustSwirl: 3,
	wallSpreadDelay: 3.5,
	wallDropHeight: 0,
	wallDropHeightPerColumn: 1,
	wallDropDuration: 2,
	wallStaggerPerColumn: 0.4,

	gravity: -1,
	bounceDamping: 0.25,
	friction: 0.92,
	burstForwardDirection: 1,
	burstForwardVelocity: 0.4,
	burstUpwardVelocity: 2.3,
	burstSideVelocity: 0.8,
	burstSpreadAngleDeg: 10,
	burstVelocityRandomness: 0.4,
	burstSpin: 8,

	spiceColor: [1.0, 0.2, 0.0],
	particleColorVariance: 0.55,
	particleGravity: 0.3,
	particleForwardDirection: 1,
	particleForwardVelocity: 2,
	particleSpreadAngleDeg: 90,
	particleUpwardBoost: 2,
	particleLifeMultiplier: 6,
	particleSizeMultiplier: 1,
	chunkSpeed: 10,
	cloudSpeed: 10,
	dustSpeed: 10
}

/**
 * Global playback speed multiplier for the effect (KfcEffect.timeScale). The
 * Scene.zcomp timings/physics are kept as-is; this just plays them faster.
 */
export const EFFECT_TIME_SCALE = 2.2

/** Uniform scale of the effect group in the Mattercraft scene (world m per local unit). */
export const EFFECT_SCALE = 0.31505093908441123

/** GLB locations (served from /static). */
export const KFC_MODEL_URLS = {
	castle: '/models/castle_white.glb',
	rock: '/models/rock.glb',
	wallBox: '/models/kfcbox_source.glb',
	burstBox: '/models/kfcbox.glb',
	chicken: '/models/chicken.glb'
} as const
