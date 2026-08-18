/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// Scene layout constants for the Vertical Wall AR setup (docs/VERTICAL_WALL_AR.md).
//
// After `XR8.XrController.recenter()` the camera sits at CAMERA_HEIGHT above the
// SLAM origin looking down -Z; the floor is y = 0. The wall itself is placed by
// the user at runtime (WallPlacer), so there is no fixed wall distance/height —
// only the camera height and the light/shadow parameters live here.

/** Camera height above the SLAM origin (≈ phone held at chest/eye level). */
export const CAMERA_HEIGHT = 1.5

/** Virtual wall plane size (metres) — generous so the box walls always fit. */
export const WALL_WIDTH = 12
export const WALL_HEIGHT = 6

/**
 * Original DirectionalLight (Scene.zcomp), expressed relative to the castle
 * anchor on the wall: warm colour, low intensity (the env map does most of the
 * lighting), shadow camera ±10, positioned above/in front of the wall.
 */
export const KEY_LIGHT = {
	color: [0.8962693533719567, 0.7083757798856457, 0.450785782828426] as const,
	intensity: 0.1,
	/** Offset from the castle anchor (x, y, z) in metres; +z = toward the user. */
	offset: [-1.26, 2.6, 5.0] as const,
	shadowExtent: 10
}

/** Opacity of the wall shadow catcher (Scene.zcomp ShadowPlane opacity). */
export const WALL_SHADOW_OPACITY = 0.1
