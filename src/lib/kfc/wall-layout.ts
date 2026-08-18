// Where the virtual wall lives relative to the SLAM origin.
//
// After `XR8.XrController.recenter()` the camera sits at CAMERA_HEIGHT above the
// origin looking down -Z (see scene-pipeline.ts). The virtual wall is a box
// standing WALL_DISTANCE metres in front of the user, and the KFC effect is
// attached to its front face at WALL_ANCHOR_HEIGHT above the floor. That
// replaces the Immersal VPS anchor (the real store wall) of the original build.

import { DEFAULT_KFC_CONFIG, EFFECT_SCALE } from './kfc-config'

/** Camera height above the SLAM origin (≈ phone held at chest/eye level). */
export const CAMERA_HEIGHT = 1.5

/** Distance from the user to the virtual wall, in metres. */
export const WALL_DISTANCE = 2.5

/** Virtual wall dimensions (metres). Wide enough for the box walls on both sides. */
export const WALL_WIDTH = 8
export const WALL_HEIGHT = 5
export const WALL_THICKNESS = 0.1

/**
 * Height of the effect origin (castle base) on the wall, in metres.
 *
 * Derived from the tuned `burstFloorY` (-7.5 local) so that the burst bodies
 * land exactly on the real floor (world y = 0), keeping the Scene.zcomp physics
 * values untouched: 7.5 × 0.315 ≈ 2.36 m — the castle sits high on the wall,
 * as on the store installation.
 */
export const WALL_ANCHOR_HEIGHT = -DEFAULT_KFC_CONFIG.burstFloorY * EFFECT_SCALE

/**
 * Original DirectionalLight (Scene.zcomp), expressed relative to the effect
 * anchor on the wall: warm colour, low intensity (the env map does most of the
 * lighting), shadow camera ±10, positioned above/in front of the wall.
 */
export const KEY_LIGHT = {
	color: [0.8962693533719567, 0.7083757798856457, 0.450785782828426] as const,
	intensity: 0.1,
	/** Offset from the wall anchor (x, y, z) in metres; +z = toward the user. */
	offset: [-1.26, 2.6, 5.0] as const,
	shadowExtent: 10
}

/** Opacity of the wall shadow catcher (Scene.zcomp ShadowPlane opacity). */
export const WALL_SHADOW_OPACITY = 0.1
