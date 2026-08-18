// Where the virtual wall lives relative to the SLAM origin.
//
// After `XR8.XrController.recenter()` the camera sits at CAMERA_HEIGHT above the
// origin looking down -Z (see scene-pipeline.ts). The virtual wall is a box
// standing WALL_DISTANCE metres in front of the user, and the KFC effect is
// attached to its front face at WALL_ANCHOR_HEIGHT above the floor. That
// replaces the Immersal VPS anchor (the real store wall) of the original build.

import { EFFECT_SCALE } from './kfc-config'

/** Camera height above the SLAM origin (≈ phone held at chest/eye level). */
export const CAMERA_HEIGHT = 1.5

/** Distance from the user to the virtual wall, in metres. */
export const WALL_DISTANCE = 2.5

/** Virtual wall dimensions (metres). Wide enough for the box walls on both sides. */
export const WALL_WIDTH = 8
export const WALL_HEIGHT = 4
export const WALL_THICKNESS = 0.1

/** Height of the effect origin (castle base) on the wall, in metres. */
export const WALL_ANCHOR_HEIGHT = 1.0

/**
 * burstFloorY expressed in effect-local units so that the burst bodies land on
 * the real floor (world y = 0) instead of the value tuned for the store install.
 */
export const BURST_FLOOR_Y_LOCAL = -WALL_ANCHOR_HEIGHT / EFFECT_SCALE
